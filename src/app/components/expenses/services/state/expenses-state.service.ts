import { Injectable, computed, signal } from '@angular/core';
import type {
  ExpensesFilterState,
  ExpensesListViewModel,
  PaginationState,
  SortState,
  CategoryOptionViewModel,
  DatePreset,
} from '../../expenses.models';
import { createDefaultFilters, normalizeFilters, composeSortParam } from '../../expenses.utils';
import { PER_PAGE_OPTIONS } from '../../expenses.models';

/**
 * Service for managing expenses list state.
 * Handles filters, pagination, sorting, and data storage using Angular signals.
 */
@Injectable({ providedIn: 'root' })
export class ExpensesStateService {
  // Internal state signals
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
  private readonly summaryAmountSignal = signal<number>(0);
  // Public read-only signals
  readonly filters = this.filtersSignal.asReadonly();
  readonly expenses = this.expensesSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly categoryOptions = this.categoryOptionsSignal.asReadonly();
  readonly summaryAmount = this.summaryAmountSignal.asReadonly();

  // Computed sort state
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

  // Computed view model for easy component consumption
  readonly viewModel = computed(() => ({
    filters: this.filtersSignal(),
    expenses: this.expensesSignal(),
    pagination: this.paginationSignal(),
    loading: this.loadingSignal(),
    error: this.errorSignal(),
    sort: this.sortState(),
  }));

  // State update methods
  setFilters(update: Partial<ExpensesFilterState>): void {
    this.filtersSignal.update(current => normalizeFilters({ ...current, ...update }));
  }

  resetFilters(preset?: DatePreset): void {
    const nextDefault = createDefaultFilters();
    if (preset) {
      nextDefault.preset = preset;
    }
    this.filtersSignal.set(nextDefault);
  }

  setSort(sort: SortState | null): void {
    this.filtersSignal.update(current => ({
      ...current,
      sort: sort ? composeSortParam(sort) : undefined,
      page: 1,
    }));
  }

  setPage(page: number): void {
    if (page < 1) {
      return;
    }
    this.filtersSignal.update(current => ({ ...current, page }));
  }

  setPerPage(perPage: number): void {
    if (!PER_PAGE_OPTIONS.includes(perPage as (typeof PER_PAGE_OPTIONS)[number])) {
      return;
    }
    this.filtersSignal.update(current => ({ ...current, per_page: perPage, page: 1 }));
  }

  setExpenses(expenses: ExpensesListViewModel[]): void {
    this.expensesSignal.set(expenses);
    this.summaryAmountSignal.set(
      Number(expenses.reduce((acc, expense) => acc + expense.amount, 0).toFixed(2))
    );
  }

  setPagination(pagination: PaginationState): void {
    this.paginationSignal.set(pagination);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  setError(error: string | null): void {
    this.errorSignal.set(error);
  }

  setCategoryOptions(options: CategoryOptionViewModel[]): void {
    this.categoryOptionsSignal.set(options);
  }
}
