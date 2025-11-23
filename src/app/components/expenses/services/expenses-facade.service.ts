import { Injectable, computed, effect, signal, inject } from '@angular/core';
import { tap, catchError, throwError, firstValueFrom } from 'rxjs';

import { ClassificationResult } from '../../../../lib/models/openrouter';
import type {
  CreateExpenseCommand,
  UpdateExpenseCommand,
} from '../../../../types';

import { CategoriesFacadeService } from '../../categories/services/categories-facade.service';
import { ExpensesApiService } from './expenses-api.service';

import type {
  ExpensesFilterState,
  ExpensesListViewModel,
  PaginationState,
  SortState,
  ExpenseDialogResult,
  RefreshTrigger,
  ExpensesByCategoryData,
  BatchClassifyExpenseInput,
  CategoryOptionViewModel,
  DatePreset,
} from '../expenses.models';
import { PER_PAGE_OPTIONS } from '../expenses.models';
import {
  createDefaultFilters,
  normalizeFilters,
  buildPaginationState,
  resolveErrorMessage,
  mapExpenseToViewModel,
  composeSortParam,
} from '../expenses.utils';

@Injectable({ providedIn: 'root' })
export class ExpensesFacadeService {
  private currentRequest: AbortController | null = null;
  private readonly categoryLabelMap = new Map<string, string>();
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly categoriesFacade = inject(CategoriesFacadeService);

  private readonly filtersSignal = signal<ExpensesFilterState>(createDefaultFilters());
  private readonly expensesSignal = signal<ExpensesListViewModel[]>([]);
  private readonly paginationSignal = signal<PaginationState>({
    page: 1,
    perPage: 25,
    links: [],
    hasNext: false,
    hasPrev: false,
  });
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

  /**
   * Aggregated expenses by category for chart visualization
   */
  readonly expensesByCategory = computed<ExpensesByCategoryData[]>(() => {
    const expenses = this.expensesSignal();
    const aggregationMap = new Map<string, { name: string; total: number }>();

    for (const expense of expenses) {
      const categoryId = expense.category_id || 'uncategorized';
      const categoryName = expense.categoryName || 'Bez kategorii';

      const existing = aggregationMap.get(categoryId);
      if (existing) {
        existing.total += expense.amount;
      } else {
        aggregationMap.set(categoryId, {
          name: categoryName,
          total: expense.amount,
        });
      }
    }

    return Array.from(aggregationMap.values()).map((item) => ({
      name: item.name,
      value: item.total,
    }));
  });

  constructor() {
    effect(() => {
      // Auto-refresh when filters change.
      const filters = this.filtersSignal();
      void this.refresh('filters', filters);
    }, { allowSignalWrites: true });
  }

  setFilters(update: Partial<ExpensesFilterState>): void {
    this.filtersSignal.update((current) => normalizeFilters({ ...current, ...update }));
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
      sort: sort ? composeSortParam(sort) : undefined,
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
      const { data: expenses, count } = await firstValueFrom(this.expensesApi.queryExpenses(filters)) || { data: [], count: 0 };

      if (controller.signal.aborted) {
        return;
      }

      this.expensesSignal.set(expenses.map((expense) => mapExpenseToViewModel(expense, this.categoryLabelMap)));
      this.paginationSignal.set(buildPaginationState(filters, count));
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      this.errorSignal.set(resolveErrorMessage(error));
    } finally {
      if (this.currentRequest === controller) {
        this.loadingSignal.set(false);
        this.currentRequest = null;
      }
    }
  }

  async createExpense(command: CreateExpenseCommand): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.createExpense(command));
      await this.refresh('manual');
      return 'created';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.updateExpense(expenseId, command));
      await this.refresh('manual');
      return 'updated';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async deleteExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.deleteExpense(expenseId));
      await this.refresh('manual');
      return 'deleted';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async reclassifyExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.reclassifyExpense(expenseId));
      await this.refresh('manual');
      return 'reclassified';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async loadCategories(query?: string): Promise<void> {
    try {
      const options = await firstValueFrom(this.expensesApi.loadCategories(query)) || [];

      for (const option of options) {
        this.categoryLabelMap.set(option.id, option.label);
      }

      this.categoryOptionsSignal.set(options);
    } catch (error) {
      this.errorSignal.set(resolveErrorMessage(error));
    }
  }

  /**
   * Sugeruje kategorię dla wydatku używając AI
   */
  async suggestCategory(description: string, amount: number): Promise<ClassificationResult> {
    try {
      const result = await firstValueFrom(this.expensesApi.suggestCategory(description));
      if (!result) {
        throw new Error('Nie udało się zasugerować kategorii.');
      }
      return result;
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  /**
   * Klasyfikuje i tworzy wiele wydatków jednocześnie
   */
  async batchClassifyAndCreateExpenses(expenses: Array<{ name: string; amount: number; expense_date: string }>): Promise<void> {
    try {
      // Convert dialog format to API format
      const apiExpenses: BatchClassifyExpenseInput[] = expenses.map(expense => ({
        description: expense.name,
        amount: expense.amount,
        date: expense.expense_date
      }));

      await firstValueFrom(this.expensesApi.batchClassifyAndCreateExpenses(apiExpenses));
      await this.refresh('manual');
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  private abortActiveRequest(): void {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
  }










}

