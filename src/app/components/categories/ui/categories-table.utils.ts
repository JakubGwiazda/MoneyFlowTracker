import type { CategoryListViewModel } from '../../../models/categories';
import type { CategoryTreeNode, CategoryTreeData } from './categories-table.model';

/**
 * Builds a hierarchical tree structure from a flat list of categories.
 * Pure function that creates nodes with proper parent-child relationships.
 */
export function buildCategoryTree(
  categories: readonly CategoryListViewModel[],
  expandedIds: ReadonlySet<string>
): CategoryTreeData {
  const categoryMap = new Map<string, CategoryTreeNode>();
  const rootNodes: CategoryTreeNode[] = [];

  // First pass: create all nodes
  for (const category of categories) {
    const node: CategoryTreeNode = {
      ...category,
      level: 0,
      isExpanded: expandedIds.has(category.id),
      children: [],
    };
    categoryMap.set(category.id, node);
  }

  // Second pass: build tree structure
  for (const category of categories) {
    const node = categoryMap.get(category.id)!;

    if (category.parent_id) {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        node.level = parent.level + 1;
        // Create a new array with the added child (immutable update)
        (parent.children as CategoryTreeNode[]).push(node);
      } else {
        // Parent not found in current list, treat as root
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  }

  return { roots: rootNodes, map: categoryMap };
}

/**
 * Flattens a category tree into visible rows based on expanded state.
 * Pure function that recursively processes the tree structure.
 * Note: Categories are already sorted hierarchically from the backend
 * (parent_id nulls first, then by name), so no additional sorting is needed.
 */
export function flattenVisibleRows(treeData: CategoryTreeData): readonly CategoryTreeNode[] {
  const visible: CategoryTreeNode[] = [];

  const addNode = (node: CategoryTreeNode) => {
    visible.push(node);
    if (node.isExpanded && node.children.length > 0) {
      // Children are already in correct order from tree building
      for (const child of node.children) {
        addNode(child);
      }
    }
  };

  // Root nodes are already sorted from tree building
  for (const root of treeData.roots) {
    addNode(root);
  }

  return visible;
}

/**
 * Toggles the expanded state of a category node.
 * Pure function that creates a new set with the updated state.
 */
export function toggleExpandedState(
  currentExpanded: ReadonlySet<string>,
  categoryId: string
): ReadonlySet<string> {
  const newExpanded = new Set(currentExpanded);

  if (newExpanded.has(categoryId)) {
    newExpanded.delete(categoryId);
  } else {
    newExpanded.add(categoryId);
  }

  return newExpanded;
}
