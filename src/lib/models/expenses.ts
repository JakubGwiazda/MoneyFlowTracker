import type {
  ClassificationStatus,
  ExpenseDto,
  ExpenseSortParam,
  ExpenseSortableField,
} from '../../types';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom';

export type DatePresetOption = {
  id: DatePreset;
  label: string;
  range?: {
    from: string;
    to: string;
  };
};

export type ExpensesFilterState = {
  preset?: DatePreset;
  date_from?: string;
  date_to?: string;
  status?: ClassificationStatus;
  category_id?: string | null;
  sort?: ExpenseSortParam;
  page: number;
  per_page: number;
};

export type ExpensesFilterFormValue = Pick<
  ExpensesFilterState,
  'date_from' | 'date_to' | 'status' | 'category_id'
> & {
  preset: DatePreset;
};

export type CategoryOptionViewModel = {
  id: string;
  label: string;
  isActive: boolean;
};

export type StatusFilterOption = {
  value?: ClassificationStatus;
  label: string;
};

export type ClassificationBadgeConfig = {
  status: ClassificationStatus | 'failed';
  tone: 'info' | 'success' | 'warning' | 'error';
  label: string;
  icon?: string;
};

export type ExpenseActionType = 'edit' | 'delete';

export type SortState = {
  active: ExpenseSortableField;
  direction: 'asc' | 'desc';
};

export type PaginationLink = {
  rel: 'next' | 'prev' | 'first' | 'last';
  page: number;
  perPage: number;
  href: string;
};

export type PaginationState = {
  page: number;
  perPage: number;
  total?: number;
  links: PaginationLink[];
  hasNext: boolean;
  hasPrev: boolean;
};

export type ExpensesListViewModel = ExpenseDto & {
  categoryName: string;
  predictedCategoryName?: string;
  statusLabel: string;
  statusTone: 'info' | 'success' | 'warning' | 'error';
  confidenceDisplay: string;
};

export type ExpenseDialogResult = 'created' | 'deleted' | 'updated' | 'reclassified';

