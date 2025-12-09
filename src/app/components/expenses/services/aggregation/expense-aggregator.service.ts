import { Injectable, computed } from '@angular/core';
import type { ExpensesListViewModel, ExpensesByCategoryData } from '../../expenses.models';

/**
 * Service for aggregating expense data.
 * Uses Strategy pattern for different aggregation types.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseAggregatorService {
  /**
   * Aggregates expenses by category
   */
  aggregateByCategory(expenses: ExpensesListViewModel[]): ExpensesByCategoryData[] {
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

    return Array.from(aggregationMap.values()).map(item => ({
      name: item.name,
      value: item.total,
    }));
  }

  /**
   * Creates a computed signal for category aggregation
   */
  createCategoryAggregation(
    expensesSignal: () => ExpensesListViewModel[]
  ): () => ExpensesByCategoryData[] {
    return computed(() => this.aggregateByCategory(expensesSignal()));
  }
}
