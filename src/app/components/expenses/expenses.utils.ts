import type {
  ExpenseDto,
  ExpenseSortParam,
} from '../../../types';
import type {
  ExpensesFilterState,
  ExpensesListViewModel,
  PaginationState,
  PaginationLink,
  SortState,
} from './expenses.models';
import { DEFAULT_PER_PAGE, PER_PAGE_OPTIONS } from './expenses.models';

/**
 * Creates default filter state with today's date
 */
export function createDefaultFilters(): ExpensesFilterState {
  const today = new Date().toISOString().slice(0, 10);

  return {
    preset: 'today',
    date_from: today,
    date_to: today,
    page: 1,
    per_page: DEFAULT_PER_PAGE,
  } satisfies ExpensesFilterState;
}

/**
 * Parses sort parameter string into field and direction
 */
export function parseSortParam(sort: ExpenseSortParam): [string, 'asc' | 'desc'] {
  if (sort.endsWith(':desc')) {
    return [sort.replace(':desc', ''), 'desc'];
  }
  return [sort, 'asc'];
}

/**
 * Composes sort parameter from sort state
 */
export function composeSortParam(sort: SortState): ExpenseSortParam {
  return sort.direction === 'desc' ? `${sort.active}:desc` : sort.active;
}

/**
 * Normalizes filter values to valid state
 */
export function normalizeFilters(filters: ExpensesFilterState): ExpensesFilterState {
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

/**
 * Builds pagination state from filters and total count
 */
export function buildPaginationState(filters: ExpensesFilterState, total: number): PaginationState {
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

/**
 * Resolves classification status to display label
 */
export function resolveStatusLabel(status: ExpenseDto['classification_status']): string {
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

/**
 * Resolves classification status to display tone
 */
export function resolveStatusTone(status: ExpenseDto['classification_status']): ExpensesListViewModel['statusTone'] {
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

/**
 * Resolves error to user-friendly message
 */
export function resolveErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Żądanie zostało przerwane.';
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message ?? 'Wystąpił błąd.');
  }

  return 'Wystąpił nieoczekiwany błąd.';
}

/**
 * Maps expense DTO to view model with display properties
 */
export function mapExpenseToViewModel(
  expense: ExpenseDto,
  categoryLabelMap: Map<string, string>
): ExpensesListViewModel {
  const statusLabel = resolveStatusLabel(expense.classification_status);
  const statusTone = resolveStatusTone(expense.classification_status);
  const confidenceDisplay =
    typeof expense.prediction_confidence === 'number'
      ? `${Math.round(expense.prediction_confidence * 100)}%`
      : '—';

  const categoryName = expense.category_id
    ? categoryLabelMap.get(expense.category_id) ?? `ID ${expense.category_id.slice(0, 8)}…`
    : 'Brak kategorii';

  const predictedCategoryName = expense.predicted_category_id
    ? categoryLabelMap.get(expense.predicted_category_id) ?? `ID ${expense.predicted_category_id.slice(0, 8)}…`
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
