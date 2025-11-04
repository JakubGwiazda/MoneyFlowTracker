import { Injectable, computed, effect, signal } from '@angular/core';

import type {
  CreateExpenseCommand,
  ExpenseDto,
  ExpenseListQueryDto,
  ExpenseSortParam,
  UpdateExpenseCommand,
} from '../../../types';
import {
  type CategoryOptionViewModel,
  type ExpensesFilterState,
  type ExpensesListViewModel,
  type PaginationLink,
  type PaginationState,
  type SortState,
  type ExpenseDialogResult,
  type DatePreset,
} from '../../../lib/models/expenses';

type RefreshTrigger = 'initial' | 'filters' | 'sort' | 'page' | 'manual';

type FetchError = Error & { status?: number };

const DEFAULT_PER_PAGE = 25;
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

function startOfCurrentMonth(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function endOfCurrentMonth(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function createDefaultFilters(): ExpensesFilterState {
  return {
    preset: 'month',
    date_from: startOfCurrentMonth(),
    date_to: endOfCurrentMonth(),
    page: 1,
    per_page: DEFAULT_PER_PAGE,
  } satisfies ExpensesFilterState;
}

const EMPTY_PAGINATION: PaginationState = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  links: [],
  hasNext: false,
  hasPrev: false,
};

@Injectable({ providedIn: 'root' })
export class ExpensesFacadeService {
  private currentRequest: AbortController | null = null;
  private readonly categoryLabelMap = new Map<string, string>();

  private readonly filtersSignal = signal<ExpensesFilterState>(createDefaultFilters());
  private readonly expensesSignal = signal<ExpensesListViewModel[]>([]);
  private readonly paginationSignal = signal<PaginationState>(EMPTY_PAGINATION);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly categoryOptionsSignal = signal<CategoryOptionViewModel[]>([]);

  readonly filters = this.filtersSignal.asReadonly();
  readonly expenses = this.expensesSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly categoryOptions = this.categoryOptionsSignal.asReadonly();

  readonly sortState = computed<SortState | null>(() => {
    const { sort } = this.filtersSignal();
    if (!sort) {
      return null;
    }

    if (sort.endsWith(':desc')) {
      return { active: sort.replace(':desc', '') as SortState['active'], direction: 'desc' };
    }

    return { active: sort as SortState['active'], direction: 'asc' };
  });

  readonly viewModel = computed(() => ({
    filters: this.filtersSignal(),
    expenses: this.expensesSignal(),
    pagination: this.paginationSignal(),
    loading: this.loadingSignal(),
    error: this.errorSignal(),
    sort: this.sortState(),
  }));

  constructor() {
    effect(() => {
      // Auto-refresh when filters change.
      const filters = this.filtersSignal();
      void this.refresh('filters', filters);
    }, { allowSignalWrites: true });
  }

  setFilters(update: Partial<ExpensesFilterState>): void {
    this.filtersSignal.update((current) => this.normalizeFilters({ ...current, ...update }));
  }

  resetFilters(preset?: DatePreset): void {
    const nextDefault = createDefaultFilters();
    if (preset) {
      nextDefault.preset = preset;
    }

    this.filtersSignal.set(nextDefault);
  }

  setSort(sort: SortState | null): void {
    this.filtersSignal.update((current) => ({
      ...current,
      sort: sort ? this.composeSortParam(sort) : undefined,
      page: 1,
    }));
  }

  setPage(page: number): void {
    if (page < 1) {
      return;
    }

    this.filtersSignal.update((current) => ({ ...current, page }));
  }

  setPerPage(perPage: number): void {
    if (!PER_PAGE_OPTIONS.includes(perPage as (typeof PER_PAGE_OPTIONS)[number])) {
      return;
    }

    this.filtersSignal.update((current) => ({ ...current, per_page: perPage, page: 1 }));
  }

  async refresh(trigger: RefreshTrigger = 'manual', filtersOverride?: ExpensesFilterState): Promise<void> {
    const filters = filtersOverride ?? this.filtersSignal();

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      this.errorSignal.set('Zakres dat jest nieprawidłowy.');
      return;
    }

    this.abortActiveRequest();
    const controller = new AbortController();
    this.currentRequest = controller;

    this.loadingSignal.set(true);

    this.errorSignal.set(null);

    try {
      const query = this.composeQuery(filters);
      const response = await fetch(`/api/v1/expenses${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const error: FetchError = new Error('Nie udało się pobrać listy wydatków.');
        error.status = response.status;
        throw error;
      }

      const payload = (await response.json()) as ExpenseDto[];
      this.expensesSignal.set(payload.map((expense) => this.mapExpenseToViewModel(expense)));

      this.paginationSignal.set(this.parsePagination(response, filters));
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      this.errorSignal.set(this.resolveErrorMessage(error));
    } finally {
      if (this.currentRequest === controller) {
        this.loadingSignal.set(false);
        this.currentRequest = null;
      }
    }
  }

  async createExpense(command: CreateExpenseCommand): Promise<ExpenseDialogResult> {
    return this.submitExpenseMutation('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  async updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseDialogResult> {
    return this.submitExpenseMutation(`/api/v1/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(command),
    });
  }

  async deleteExpense(expenseId: string): Promise<ExpenseDialogResult> {
    return this.submitExpenseMutation(`/api/v1/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  async reclassifyExpense(expenseId: string): Promise<ExpenseDialogResult> {
    return this.submitExpenseMutation(`/api/v1/expenses/${expenseId}/classify`, {
      method: 'POST',
    });
  }

  async loadCategories(query: string): Promise<void> {
    const search = query.trim();
    const url = new URL('/api/v1/categories', this.getOrigin());
    url.searchParams.set('active', 'true');
    if (search.length > 0) {
      url.searchParams.set('search', search);
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      const categories = (await response.json()) as Array<{ id: string; name: string; is_active: boolean }>;
      const options = categories.map((category) => ({
        id: category.id,
        label: category.name,
        isActive: category.is_active,
      } satisfies CategoryOptionViewModel));

      for (const option of options) {
        this.categoryLabelMap.set(option.id, option.label);
      }

      this.categoryOptionsSignal.set(options);
    } catch (error) {
      this.errorSignal.set(this.resolveErrorMessage(error));
    }
  }

  private abortActiveRequest(): void {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
  }

  private composeQuery(filters: ExpensesFilterState): string {
    const params: ExpenseListQueryDto = {
      page: filters.page,
      per_page: filters.per_page,
    };

    if (filters.date_from) {
      params.date_from = filters.date_from;
    }

    if (filters.date_to) {
      params.date_to = filters.date_to;
    }

    if (filters.status) {
      params.classification_status = filters.status;
    }

    if (filters.category_id) {
      params.category_id = filters.category_id;
    }

    if (filters.sort) {
      params.sort = filters.sort;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      searchParams.set(key, String(value));
    });

    const queryString = searchParams.toString();
    return queryString.length > 0 ? `?${queryString}` : '';
  }

  private composeSortParam(sort: SortState): ExpenseSortParam {
    return sort.direction === 'desc' ? `${sort.active}:desc` : sort.active;
  }

  private normalizeFilters(filters: ExpensesFilterState): ExpensesFilterState {
    const next = { ...filters };

    if (next.page < 1 || Number.isNaN(next.page)) {
      next.page = 1;
    }

    if (!PER_PAGE_OPTIONS.includes(next.per_page as (typeof PER_PAGE_OPTIONS)[number])) {
      next.per_page = DEFAULT_PER_PAGE;
    }

    if (next.date_from && next.date_to && next.date_from > next.date_to) {
      const [from, to] = [next.date_from, next.date_to].sort();
      next.date_from = from;
      next.date_to = to;
    }

    return next;
  }

  private parsePagination(response: Response, filters: ExpensesFilterState): PaginationState {
    const linkHeader = response.headers.get('Link');
    const totalHeader = response.headers.get('X-Total-Count');

    const links = linkHeader ? this.parseLinkHeader(linkHeader) : [];
    const page = filters.page;
    const perPage = filters.per_page;
    const total = totalHeader ? Number.parseInt(totalHeader, 10) : undefined;

    return {
      page,
      perPage,
      total: Number.isNaN(total) ? undefined : total,
      links,
      hasNext: links.some((link) => link.rel === 'next'),
      hasPrev: links.some((link) => link.rel === 'prev'),
    } satisfies PaginationState;
  }

  private parseLinkHeader(headerValue: string): PaginationLink[] {
    return headerValue
      .split(',')
      .map((link) => link.trim())
      .map((link) => {
        const match = /<([^>]+)>;\s*rel="([^"]+)"/.exec(link);
        if (!match) {
          return null;
        }

        const [, href, rel] = match;
        const url = new URL(href, this.getOrigin());
        const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
        const perPage = Number.parseInt(url.searchParams.get('per_page') ?? `${DEFAULT_PER_PAGE}`, 10);

        return {
          href,
          rel: rel as PaginationLink['rel'],
          page: Number.isNaN(page) ? 1 : page,
          perPage: Number.isNaN(perPage) ? DEFAULT_PER_PAGE : perPage,
        } satisfies PaginationLink;
      })
      .filter((link): link is PaginationLink => Boolean(link));
  }

  private mapExpenseToViewModel(expense: ExpenseDto): ExpensesListViewModel {
    const statusLabel = this.resolveStatusLabel(expense.classification_status);
    const statusTone = this.resolveStatusTone(expense.classification_status);
    const confidenceDisplay =
      typeof expense.prediction_confidence === 'number'
        ? `${Math.round(expense.prediction_confidence * 100)}%`
        : '—';

    const categoryName = expense.category_id
      ? this.categoryLabelMap.get(expense.category_id) ?? `ID ${expense.category_id.slice(0, 8)}…`
      : 'Brak kategorii';

    const predictedCategoryName = expense.predicted_category_id
      ? this.categoryLabelMap.get(expense.predicted_category_id) ?? `ID ${expense.predicted_category_id.slice(0, 8)}…`
      : undefined;

    return {
      ...expense,
      categoryName,
      predictedCategoryName,
      statusLabel,
      statusTone,
      confidenceDisplay,
    } satisfies ExpensesListViewModel;
  }

  private resolveStatusLabel(status: ExpenseDto['classification_status']): string {
    switch (status) {
      case 'pending':
        return 'Oczekuje na klasyfikację';
      case 'predicted':
        return 'Zaklasyfikowano automatycznie';
      case 'corrected':
        return 'Skorygowano ręcznie';
      case 'failed':
        return 'Klasyfikacja nie powiodła się';
      default:
        return 'Nieznany status';
    }
  }

  private resolveStatusTone(status: ExpenseDto['classification_status']): ExpensesListViewModel['statusTone'] {
    switch (status) {
      case 'pending':
        return 'info';
      case 'predicted':
        return 'success';
      case 'corrected':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'info';
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Żądanie zostało przerwane.';
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: string }).message ?? 'Wystąpił błąd.');
    }

    return 'Wystąpił nieoczekiwany błąd.';
  }

  private async submitExpenseMutation(url: string, init: RequestInit): Promise<ExpenseDialogResult> {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...init,
    });

    if (!response.ok) {
      throw new Error('Operacja nie powiodła się.');
    }

    await this.refresh('manual');

    if (init.method === 'DELETE') {
      return 'deleted';
    }

    if (url.endsWith('/classify')) {
      return 'reclassified';
    }

    return init.method === 'POST' ? 'created' : 'updated';
  }

  private getOrigin(): string {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return 'http://localhost';
    }

    return window.location.origin;
  }
}

