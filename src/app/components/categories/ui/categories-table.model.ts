import type { CategoryListViewModel } from '../../../models/categories';

/**
 * Tree node representation for hierarchical category display.
 * Extends the base category view model with tree-specific properties.
 */
export type CategoryTreeNode = CategoryListViewModel & {
  level: number;
  isExpanded: boolean;
  children: readonly CategoryTreeNode[];
};

/**
 * Internal tree structure returned by tree building operations.
 */
export type CategoryTreeData = {
  roots: readonly CategoryTreeNode[];
  map: ReadonlyMap<string, CategoryTreeNode>;
};

/**
 * State for managing expanded categories in the tree view.
 */
export type CategoryTreeState = {
  expandedIds: ReadonlySet<string>;
};
