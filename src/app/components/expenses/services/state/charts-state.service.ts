import { Injectable, signal } from '@angular/core';
import type { ExpensesListViewModel, DatePreset } from '../../expenses.models';

export type ChartsFilterState = {
  preset?: DatePreset;
  date_from?: string;
  date_to?: string;
};

/**
 * Service for managing charts-specific state.
 * Separated from main expenses state for better organization.
 */
@Injectable({ providedIn: 'root' })
export class ChartsStateService {
  // Internal state signals
  private readonly chartFiltersSignal = signal<ChartsFilterState>({ preset: 'today' });
  private readonly chartExpensesSignal = signal<ExpensesListViewModel[]>([]);
  private readonly chartLoadingSignal = signal<boolean>(false);
  private readonly chartErrorSignal = signal<string | null>(null);

  // Public read-only signals
  readonly chartFilters = this.chartFiltersSignal.asReadonly();
  readonly chartExpenses = this.chartExpensesSignal.asReadonly();
  readonly chartLoading = this.chartLoadingSignal.asReadonly();
  readonly chartError = this.chartErrorSignal.asReadonly();

  // State update methods
  setChartFilters(update: Partial<ChartsFilterState>): void {
    this.chartFiltersSignal.update(current => ({ ...current, ...update }));
  }

  resetChartFilters(preset?: DatePreset): void {
    const nextDefault: ChartsFilterState = { preset: preset || 'today' };
    this.chartFiltersSignal.set(nextDefault);
  }

  setChartExpenses(expenses: ExpensesListViewModel[]): void {
    this.chartExpensesSignal.set(expenses);
  }

  setChartLoading(loading: boolean): void {
    this.chartLoadingSignal.set(loading);
  }

  setChartError(error: string | null): void {
    this.chartErrorSignal.set(error);
  }
}
