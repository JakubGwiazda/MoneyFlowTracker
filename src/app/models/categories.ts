import type { CategoryDto } from '../../types';

/**
 * View model for category list items with display-friendly fields.
 */
export type CategoryListViewModel = CategoryDto & {
  parentName?: string;
  usageCount?: number;
  hasChildren: boolean;
  statusLabel: string;
  statusTone: 'success' | 'error' | 'warning' | 'info';
  isSystem: boolean;
};

/**
 * Filter state for categories list.
 */
export type CategoriesFilterState = {
  search?: string;
  active?: boolean;
  parent_id?: string | null;
  page: number;
  per_page: number;
};

/**
 * Pagination link for navigation.
 */
export type PaginationLink = {
  rel: 'next' | 'prev' | 'first' | 'last';
  page: number;
  perPage: number;
  href: string;
};

/**
 * Pagination state for categories list.
 */
export type PaginationState = {
  page: number;
  perPage: number;
  total?: number;
  links: PaginationLink[];
  hasNext: boolean;
  hasPrev: boolean;
};

/**
 * Category option for dropdowns/autocomplete.
 */
export type CategoryOptionViewModel = {
  id: string;
  label: string;
  parentId?: string | null;
  isActive: boolean;
  isSystem?: boolean;
};

/**
 * Result type for category operations.
 */
export type CategoryOperationResult = 'created' | 'updated' | 'deleted';
