import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  ExpensesFilterState,
  CategoryOptionViewModel,
  BatchClassifyExpenseInput,
  RefreshTrigger,
} from '../../expenses.models';
import { ExpensesApiService } from '../expenses-api.service';
import { ExpensesStateService } from '../state/expenses-state.service';
import { ChartsStateService, type ChartsFilterState } from '../state/charts-state.service';
import { RequestManagerService } from '../requests/request-manager.service';
import { ClassificationResult } from '../../../../models/openrouter';
import {
  resolveErrorMessage,
  mapExpenseToViewModel,
  buildPaginationState,
} from '../../expenses.utils';

/**
 * Service for loading expense data from API.
 * Handles data fetching, transformation, and state updates.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseLoaderService {
  private readonly expensesApi = inject(ExpensesApiService);
  private readonly expensesState = inject(ExpensesStateService);
  private readonly chartsState = inject(ChartsStateService);
  private readonly requestManager = inject(RequestManagerService);
  private readonly categoryLabelMap = new Map<string, string>();

  private readonly MAIN_REQUEST_KEY = 'expenses-main';
  private readonly CHARTS_REQUEST_KEY = 'expenses-charts';

  /**
   * Refreshes main expenses list
   */
  async refresh(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ExpensesFilterState
  ): Promise<void> {
    const filters = filtersOverride ?? this.expensesState.filters();

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      this.expensesState.setError('Zakres dat jest nieprawidłowy.');
      return;
    }

    const controller = this.requestManager.createRequest(this.MAIN_REQUEST_KEY);
    this.expensesState.setLoading(true);
    this.expensesState.setError(null);

    try {
      const { data: expenses, count } = (await firstValueFrom(
        this.expensesApi.queryExpenses(filters)
      )) || { data: [], count: 0 };

      if (controller.signal.aborted) {
        return;
      }

      this.expensesState.setExpenses(
        expenses.map(expense => mapExpenseToViewModel(expense, this.categoryLabelMap))
      );
      this.expensesState.setPagination(buildPaginationState(filters, count));
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this.expensesState.setError(resolveErrorMessage(error));
    } finally {
      if (!this.requestManager.isAborted(this.MAIN_REQUEST_KEY)) {
        this.expensesState.setLoading(false);
        this.requestManager.cleanupRequest(this.MAIN_REQUEST_KEY);
      }
    }
  }

  /**
   * Refreshes chart data
   */
  async refreshForCharts(
    trigger: RefreshTrigger = 'manual',
    filtersOverride?: ChartsFilterState
  ): Promise<void> {
    const filters = filtersOverride ?? this.chartsState.chartFilters();

    if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
      this.chartsState.setChartError('Zakres dat jest nieprawidłowy.');
      return;
    }

    const controller = this.requestManager.createRequest(this.CHARTS_REQUEST_KEY);
    this.chartsState.setChartLoading(true);
    this.chartsState.setChartError(null);

    try {
      const apiFilters = {
        ...filters,
        page: 1,
        per_page: 1000, // Large number to get all data for charts
        sort: undefined,
        status: undefined,
        category_id: undefined,
      };

      const { data: expenses } = (await firstValueFrom(
        this.expensesApi.queryExpenses(apiFilters)
      )) || { data: [] };

      if (controller.signal.aborted) {
        return;
      }

      this.chartsState.setChartExpenses(
        expenses.map(expense => mapExpenseToViewModel(expense, this.categoryLabelMap))
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      this.chartsState.setChartError(resolveErrorMessage(error));
    } finally {
      if (!this.requestManager.isAborted(this.CHARTS_REQUEST_KEY)) {
        this.chartsState.setChartLoading(false);
        this.requestManager.cleanupRequest(this.CHARTS_REQUEST_KEY);
      }
    }
  }

  /**
   * Loads categories for autocomplete
   */
  async loadCategories(query?: string): Promise<void> {
    try {
      const options = (await firstValueFrom(this.expensesApi.loadCategories(query))) || [];

      for (const option of options) {
        this.categoryLabelMap.set(option.id, option.label);
      }

      this.expensesState.setCategoryOptions(options);
    } catch (error) {
      this.expensesState.setError(resolveErrorMessage(error));
    }
  }

  /**
   * Suggests category using AI
   */
  async suggestCategory(description: string, amount: number): Promise<ClassificationResult> {
    try {
      const result = await firstValueFrom(this.expensesApi.suggestCategory(description));
      if (!result) {
        throw new Error('Nie udało się zasugerować kategorii.');
      }
      return result;
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  /**
   * Batch classifies and creates expenses
   */
  async batchClassifyAndCreateExpenses(
    expenses: Array<{ name: string; amount: number; expense_date: string }>
  ): Promise<void> {
    try {
      const apiExpenses: BatchClassifyExpenseInput[] = expenses.map(expense => ({
        description: expense.name,
        amount: expense.amount,
        date: expense.expense_date,
      }));

      await firstValueFrom(this.expensesApi.batchClassifyAndCreateExpenses(apiExpenses));
      await this.loadCategories();
      await this.refresh('manual');
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }
}
