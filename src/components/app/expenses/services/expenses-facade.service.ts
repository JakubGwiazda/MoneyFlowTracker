import { Injectable, computed, effect, signal } from '@angular/core';
import { supabaseClient } from '../../../../db/supabase.client';
import type { Database } from '../../../../db/database.types';

import type {
  CreateExpenseCommand,
  ExpenseDto,
  ExpenseSortParam,
  UpdateExpenseCommand,
} from '../../../../types';
import {
  type CategoryOptionViewModel,
  type ExpensesFilterState,
  type ExpensesListViewModel,
  type PaginationLink,
  type PaginationState,
  type SortState,
  type ExpenseDialogResult,
  type DatePreset,
} from '../../../../lib/models/expenses';

type RefreshTrigger = 'initial' | 'filters' | 'sort' | 'page' | 'manual';

const DEFAULT_PER_PAGE = 25;
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

function createDefaultFilters(): ExpensesFilterState {
  const today = new Date().toISOString().slice(0, 10);

  return {
    preset: 'today',
    date_from: today,
    date_to: today,
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

  /**
   * Aggregated expenses by category for chart visualization
   */
  readonly expensesByCategory = computed(() => {
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
      // Get current user
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Build Supabase query
      let query = supabaseClient
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply filters
      if (filters.date_from) {
        query = query.gte('expense_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('expense_date', filters.date_to);
      }

      if (filters.status) {
        query = query.eq('classification_status', filters.status);
      }

      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      // Apply sorting
      if (filters.sort) {
        const [field, direction] = this.parseSortParam(filters.sort);
        query = query.order(field, { ascending: direction === 'asc' });
      } else {
        // Default sort by expense_date descending
        query = query.order('expense_date', { ascending: false });
      }

      // Apply pagination
      const from = (filters.page - 1) * filters.per_page;
      const to = from + filters.per_page - 1;
      query = query.range(from, to);

      // Execute query
      const { data, error, count } = await query;

      if (controller.signal.aborted) {
        return;
      }

      if (error) {
        throw new Error('Nie udało się pobrać listy wydatków.');
      }

      // Map to ExpenseDto format
      const expenses: ExpenseDto[] = (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        amount: row.amount,
        expense_date: row.expense_date,
        category_id: row.category_id,
        predicted_category_id: row.predicted_category_id,
        prediction_confidence: row.prediction_confidence,
        classification_status: row.classification_status,
        corrected_category_id: row.corrected_category_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      this.expensesSignal.set(expenses.map((expense) => this.mapExpenseToViewModel(expense)));
      this.paginationSignal.set(this.buildPaginationState(filters, count || 0));
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
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Validate category if provided
      if (command.category_id) {
        const { data: category, error: categoryError } = await supabaseClient
          .from('categories')
          .select('id, is_active')
          .eq('id', command.category_id)
          .eq('is_active', true)
          .single();

        if (categoryError || !category) {
          throw new Error('Kategoria nie została znaleziona.');
        }

        if (!category.is_active) {
          throw new Error('Kategoria jest nieaktywna.');
        }
      }

      // Insert expense
      const { data: expense, error: insertError } = await supabaseClient
        .from('expenses')
        .insert({
          user_id: user.id,
          name: command.name,
          amount: command.amount,
          expense_date: command.expense_date,
          category_id: command.category_id || null,
          classification_status: 'pending',
        })
        .select()
        .single();

      if (insertError || !expense) {
        throw new Error('Nie udało się utworzyć wydatku.');
      }

      await this.refresh('manual');
      return 'created';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseDialogResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Validate category if provided
      if (command.category_id) {
        const { data: category, error: categoryError } = await supabaseClient
          .from('categories')
          .select('id, is_active')
          .eq('id', command.category_id)
          .eq('is_active', true)
          .single();

        if (categoryError || !category) {
          throw new Error('Kategoria nie została znaleziona.');
        }

        if (!category.is_active) {
          throw new Error('Kategoria jest nieaktywna.');
        }
      }

      // Update expense
      const updateData: Database['public']['Tables']['expenses']['Update'] = {
        updated_at: new Date().toISOString(),
      };

      if (command.name !== undefined) {
        updateData.name = command.name;
      }

      if (command.amount !== undefined) {
        updateData.amount = command.amount;
      }

      if (command.expense_date !== undefined) {
        updateData.expense_date = command.expense_date;
      }

      if (command.category_id !== undefined) {
        updateData.category_id = command.category_id;
        updateData.classification_status = 'corrected';
        updateData.corrected_category_id = command.category_id;
      }

      const { error: updateError } = await supabaseClient
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Nie udało się zaktualizować wydatku.');
      }

      await this.refresh('manual');
      return 'updated';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async deleteExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      const { error: deleteError } = await supabaseClient
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Nie udało się usunąć wydatku.');
      }

      await this.refresh('manual');
      return 'deleted';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async reclassifyExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Reset classification status to pending to trigger re-classification
      const { error: updateError } = await supabaseClient
        .from('expenses')
        .update({
          classification_status: 'pending',
          predicted_category_id: null,
          prediction_confidence: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Nie udało się zainicjować ponownej klasyfikacji.');
      }

      // Here you would typically trigger the classification service
      // For now, we'll just refresh the list
      await this.refresh('manual');
      return 'reclassified';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async loadCategories(query?: string): Promise<void> {
    const search = query?.trim() ?? '';

    try {
      let categoriesQuery = supabaseClient
        .from('categories')
        .select('id, name, is_active')
        .eq('is_active', true);

      if (search.length > 0) {
        categoriesQuery = categoriesQuery.ilike('name', `%${search}%`);
      }

      const { data: categories, error } = await categoriesQuery.order('name');

      if (error) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      const options = (categories || []).map((category) => ({
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

  private parseSortParam(sort: ExpenseSortParam): [string, 'asc' | 'desc'] {
    if (sort.endsWith(':desc')) {
      return [sort.replace(':desc', ''), 'desc'];
    }
    return [sort, 'asc'];
  }

  private buildPaginationState(filters: ExpensesFilterState, total: number): PaginationState {
    const page = filters.page;
    const perPage = filters.per_page;
    const totalPages = Math.ceil(total / perPage);

    const links: PaginationLink[] = [];

    // Add first page link
    if (page > 1) {
      links.push({
        href: `?page=1&per_page=${perPage}`,
        rel: 'first',
        page: 1,
        perPage,
      });
    }

    // Add previous page link
    if (page > 1) {
      links.push({
        href: `?page=${page - 1}&per_page=${perPage}`,
        rel: 'prev',
        page: page - 1,
        perPage,
      });
    }

    // Add next page link
    if (page < totalPages) {
      links.push({
        href: `?page=${page + 1}&per_page=${perPage}`,
        rel: 'next',
        page: page + 1,
        perPage,
      });
    }

    // Add last page link
    if (page < totalPages) {
      links.push({
        href: `?page=${totalPages}&per_page=${perPage}`,
        rel: 'last',
        page: totalPages,
        perPage,
      });
    }

    return {
      page,
      perPage,
      total,
      links,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    } satisfies PaginationState;
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

}

