import { Injectable, computed, effect, inject } from '@angular/core';
import { ClassificationResult } from '../../../models/openrouter';
import type { CreateExpenseCommand, UpdateExpenseCommand } from '../../../../types';
import type {
  ExpensesFilterState,
  SortState,
  ExpenseDialogResult,
  RefreshTrigger,
  DatePreset,
} from '../expenses.models';

// State services
import { ExpensesStateService } from './state/expenses-state.service';
import { ChartsStateService, type ChartsFilterState } from './state/charts-state.service';

// Operation services
import { ExpenseOperationsService } from './operations/expense-operations.service';
import { ExpenseLoaderService } from './loaders/expense-loader.service';
import { ExpenseAggregatorService } from './aggregation/expense-aggregator.service';

@Injectable({ providedIn: 'root' })
export class ExpensesFacadeService {
  // Injected services
  private readonly expensesState = inject(ExpensesStateService);
  private readonly chartsState = inject(ChartsStateService);
  private readonly operations = inject(ExpenseOperationsService);
  private readonly loader = inject(ExpenseLoaderService);
  private readonly aggregator = inject(ExpenseAggregatorService);

  // Expose state signals
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

  // Filter management
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

  // Data loading
  async refresh(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ExpensesFilterState
  ): Promise<void> {
    await this.loader.refresh(trigger, filtersOverride);
  }

  async refreshForCharts(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ChartsFilterState
  ): Promise<void> {
    await this.loader.refreshForCharts(trigger, filtersOverride);
  }

  async loadCategories(query?: string): Promise<void> {
    await this.loader.loadCategories(query);
  }

  // CRUD operations
  async createExpense(command: CreateExpenseCommand): Promise<ExpenseDialogResult> {
    const result = await this.operations.createExpense(command);
    await this.refresh('manual');
    return result;
  }

  async updateExpense(
    expenseId: string,
    command: UpdateExpenseCommand
  ): Promise<ExpenseDialogResult> {
    const result = await this.operations.updateExpense(expenseId, command);
    await this.refresh('manual');
    return result;
  }

  async deleteExpense(expenseId: string): Promise<ExpenseDialogResult> {
    const result = await this.operations.deleteExpense(expenseId);
    await this.refresh('manual');
    return result;
  }

  async reclassifyExpense(expenseId: string): Promise<ExpenseDialogResult> {
    const result = await this.operations.reclassifyExpense(expenseId);
    await this.refresh('manual');
    return result;
  }

  // AI operations
  async suggestCategory(description: string, amount: number): Promise<ClassificationResult> {
    return await this.loader.suggestCategory(description, amount);
  }

  async batchClassifyAndCreateExpenses(
    expenses: Array<{ name: string; amount: number; expense_date: string }>
  ): Promise<void> {
    await this.loader.batchClassifyAndCreateExpenses(expenses);
  }
}
