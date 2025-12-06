import { Injectable, signal, computed } from '@angular/core';
import type { CategoryListViewModel } from '../../../models/categories';
import type { CategoryTreeNode, CategoryTreeState } from './categories-table.model';
import {
  buildCategoryTree,
  flattenVisibleRows,
  toggleExpandedState,
} from './categories-table.utils';

/**
 * Service for managing categories table state and tree operations.
 * Handles tree building, expansion state, and provides computed views.
 */
@Injectable()
export class CategoriesTableService {
  // Internal state management
  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  /**
   * Current tree state for external access.
   */
  readonly treeState = computed<CategoryTreeState>(() => ({
    expandedIds: this.expandedIds(),
  }));

  /**
   * Builds the category tree structure from flat data.
   * Memoized computation that rebuilds when data or expanded state changes.
   */
  private readonly treeData = computed(() => buildCategoryTree(this.data(), this.expandedIds()));

  /**
   * Flat list of visible rows based on current expansion state.
   * Memoized computation that flattens the tree structure.
   */
  readonly visibleRows = computed(() => flattenVisibleRows(this.treeData()));

  // Input data signal - will be set by the component
  private readonly data = signal<readonly CategoryListViewModel[]>([]);

  /**
   * Updates the source data for the tree.
   */
  setData(categories: readonly CategoryListViewModel[]): void {
    this.data.set(categories);
  }

  /**
   * Toggles the expanded state of a category.
   */
  toggleExpand(categoryId: string): void {
    this.expandedIds.set(toggleExpandedState(this.expandedIds(), categoryId));
  }

  /**
   * Resets all expanded states.
   */
  collapseAll(): void {
    this.expandedIds.set(new Set());
  }

  /**
   * Expands all categories that have children.
   */
  expandAll(): void {
    const treeData = this.treeData();
    const expandableIds = new Set<string>();

    const collectExpandable = (nodes: readonly CategoryTreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          expandableIds.add(node.id);
          collectExpandable(node.children);
        }
      }
    };

    collectExpandable(treeData.roots);
    this.expandedIds.set(expandableIds);
  }

  /**
   * Checks if a specific category is expanded.
   */
  isExpanded(categoryId: string): boolean {
    return this.expandedIds().has(categoryId);
  }
}
