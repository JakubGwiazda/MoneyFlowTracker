import { Injectable, computed, effect, inject } from '@angular/core';
import { ClassificationResult } from '../../../models/openrouter';
import type { CreateExpenseCommand, UpdateExpenseCommand } from '../../../../types';
import type {
  ExpensesFilterState,
  SortState,
  DatePreset,
  ExpensesListViewModel,
  CategoryOptionViewModel,
} from '../expenses.models';

// State services
import { ExpensesStateService } from './state/expenses-state.service';
import { ChartsStateService, type ChartsFilterState } from './state/charts-state.service';

// Main management service
import { ExpenseManagementService } from '../../../services/expenses/expense-management.service';

// Aggregation
import { ExpenseAggregatorService } from './aggregation/expense-aggregator.service';

// Utils
import {
  resolveErrorMessage,
  mapExpenseToViewModel,
  buildPaginationState,
} from '../expenses.utils';

export type RefreshTrigger = 'manual' | 'filters' | 'init';

/**
 * Unified store for expense management.
 * Combines state management with business operations.
 * This is the main service that components should inject.
 */
@Injectable({ providedIn: 'root' })
export class ExpensesStoreService {
  // Injected services
  private readonly expensesState = inject(ExpensesStateService);
  private readonly chartsState = inject(ChartsStateService);
  private readonly expenseManagement = inject(ExpenseManagementService);
  private readonly aggregator = inject(ExpenseAggregatorService);

  // Category label cache for view models
  private readonly categoryLabelMap = new Map<string, string>();

  // ===== Expose state signals =====
  readonly filters = this.expensesState.filters;
  readonly expenses = this.expensesState.expenses;
  readonly pagination = this.expensesState.pagination;
  readonly loading = this.expensesState.loading;
  readonly error = this.expensesState.error;
  readonly categoryOptions = this.expensesState.categoryOptions;
  readonly sortState = this.expensesState.sortState;
  readonly viewModel = this.expensesState.viewModel;
  readonly summaryAmount = this.expensesState.summaryAmount;

  // Charts state
  readonly chartFilters = this.chartsState.chartFilters;
  readonly chartExpenses = this.chartsState.chartExpenses;
  readonly chartLoading = this.chartsState.chartLoading;
  readonly chartError = this.chartsState.chartError;
  readonly chartSummaryAmount = this.chartsState.chartSummaryAmount;

  // Aggregated data
  readonly expensesByCategory = this.aggregator.createCategoryAggregation(() => this.expenses());
  readonly chartExpensesByCategory = this.aggregator.createCategoryAggregation(() =>
    this.chartExpenses()
  );

  constructor() {
    // Auto-refresh when filters change
    effect(
      () => {
        const filters = this.expensesState.filters();
        void this.refresh('filters', filters);
      },
      { allowSignalWrites: true }
    );

    // Auto-refresh chart data when chart filters change
    effect(
      () => {
        const chartFilters = this.chartsState.chartFilters();
        void this.refreshForCharts('filters', chartFilters);
      },
      { allowSignalWrites: true }
    );
  }

  // ===== Filter management =====

  setFilters(update: Partial<ExpensesFilterState>): void {
    this.expensesState.setFilters(update);
  }

  resetFilters(preset?: DatePreset): void {
    this.expensesState.resetFilters(preset);
  }

  setSort(sort: SortState | null): void {
    this.expensesState.setSort(sort);
  }

  setPage(page: number): void {
    this.expensesState.setPage(page);
  }

  setPerPage(perPage: number): void {
    this.expensesState.setPerPage(perPage);
  }

  // Chart filters
  setChartFilters(update: Partial<ChartsFilterState>): void {
    this.chartsState.setChartFilters(update);
  }

  resetChartFilters(preset?: DatePreset): void {
    this.chartsState.resetChartFilters(preset);
  }

  // ===== Data loading =====

  async refresh(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ExpensesFilterState
  ): Promise<void> {
    const filters = filtersOverride ?? this.expensesState.filters();

    this.expensesState.setLoading(true);
    this.expensesState.setError(null);

    try {
      const { data, count } = await this.expenseManagement.queryExpenses(filters);

      // Map to view models using cached category labels
      const viewModels: ExpensesListViewModel[] = data.map(expense =>
        mapExpenseToViewModel(expense, this.categoryLabelMap)
      );

      // Update state
      this.expensesState.setExpenses(viewModels);

      // Update pagination using utility function
      this.expensesState.setPagination(buildPaginationState(filters, count));
    } catch (error) {
      const errorMessage = resolveErrorMessage(error);
      this.expensesState.setError(errorMessage);
      console.error('[ExpensesStore] Failed to refresh expenses:', error);
    } finally {
      this.expensesState.setLoading(false);
    }
  }

  async refreshForCharts(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ChartsFilterState
  ): Promise<void> {
    const chartFilters = filtersOverride ?? this.chartsState.chartFilters();

    this.chartsState.setChartLoading(true);
    this.chartsState.setChartError(null);

    try {
      // Convert chart filters to expenses filters
      const expensesFilters: ExpensesFilterState = {
        preset: chartFilters.preset,
        date_from: chartFilters.date_from,
        date_to: chartFilters.date_to,
        page: 1,
        per_page: 10000, // Get all for charts
      };

      const { data } = await this.expenseManagement.queryExpenses(expensesFilters);

      // Map to view models using cached category labels
      const viewModels: ExpensesListViewModel[] = data.map(expense =>
        mapExpenseToViewModel(expense, this.categoryLabelMap)
      );

      // Update chart state
      this.chartsState.setChartExpenses(viewModels);
    } catch (error) {
      const errorMessage = resolveErrorMessage(error);
      this.chartsState.setChartError(errorMessage);
      console.error('[ExpensesStore] Failed to refresh chart data:', error);
    } finally {
      this.chartsState.setChartLoading(false);
    }
  }

  async loadCategories(query?: string): Promise<void> {
    try {
      const categories = await this.expenseManagement.loadCategories(query);

      // Update category label cache
      for (const category of categories) {
        this.categoryLabelMap.set(category.id, category.label);
      }

      this.expensesState.setCategoryOptions(categories);
    } catch (error) {
      console.error('[ExpensesStore] Failed to load categories:', error);
    }
  }

  // ===== CRUD operations =====

  async createExpense(command: CreateExpenseCommand): Promise<'created'> {
    try {
      await this.expenseManagement.createExpense(command);
      await this.refresh('manual');
      return 'created';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<'updated'> {
    try {
      await this.expenseManagement.updateExpense(expenseId, command);
      await this.refresh('manual');
      return 'updated';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async deleteExpense(expenseId: string): Promise<'deleted'> {
    try {
      await this.expenseManagement.deleteExpense(expenseId);
      await this.refresh('manual');
      return 'deleted';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async reclassifyExpense(expenseId: string): Promise<'reclassified'> {
    try {
      await this.expenseManagement.reclassifyExpense(expenseId);
      await this.refresh('manual');
      return 'reclassified';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async massUpdateCategory(expenseIds: string[], categoryId: string): Promise<void> {
    try {
      await this.expenseManagement.massUpdateCategory(expenseIds, categoryId);
      await this.refresh('manual');
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  // ===== AI operations =====

  async suggestCategory(description: string, amount: number): Promise<ClassificationResult> {
    return await this.expenseManagement.suggestCategory(description, amount);
  }

  async batchClassifyAndCreateExpenses(
    expenses: Array<{ name: string; amount: number; expense_date: string }>
  ): Promise<void> {
    try {
      await this.expenseManagement.batchClassifyAndCreateExpenses(
        expenses.map(exp => ({
          description: exp.name,
          amount: exp.amount,
          date: exp.expense_date,
        }))
      );
      
      // Reload categories as batch import may create new ones
      await this.loadCategories();
      
      // Refresh expenses list
      await this.refresh('manual');
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

}
