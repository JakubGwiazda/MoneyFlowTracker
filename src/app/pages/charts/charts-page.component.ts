import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarChartModule, PieChartModule } from '@swimlane/ngx-charts';
import { ChartType, ChartViewMode } from '../../../lib/models/charts';
import { MatExpansionModule } from '@angular/material/expansion';
import { DateFilterComponent, type DateFilterValue, type DateFilterChange } from '../../components/common/date-filter/date-filter.component';
import { ExpensesFacadeService } from '../../components/expenses/services/expenses-facade.service';

/**
 * Component for displaying expense data in various chart formats
 * Supports bar charts (US-008) and pie charts (US-009)
 * 
 * @example
 * ```html
 * <app-expenses-charts 
 *   [data]="chartData()" 
 *   [title]="'Expenses by Category'"
 * />
 * ```
 */
@Component({
  selector: 'app-charts-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    BarChartModule,
    PieChartModule,
    DateFilterComponent,
  ],
  templateUrl: './charts-page.component.html',
  styleUrl: './charts.scss',
})
export class ChartsPageComponent implements OnInit {
  private readonly expensesFacade = inject(ExpensesFacadeService);
  // Chart type enum for template usage
  protected readonly ChartType = ChartType;

  // Default configuration values as signals for consistency
  protected readonly noDataMessage = signal('W wybranym zakresie nie znaleziono żadnych wpisów');
  protected readonly xAxisLabel = signal('Kategorie');
  protected readonly yAxisLabel = signal('Kwota (PLN)');
  protected readonly showLegend = signal(true);
  protected readonly showLabels = signal(true);
  protected readonly gradient = signal(false);
  protected readonly animations = signal(true);
  protected readonly colorScheme = signal('cool');

  // View state
  private readonly _selectedChartType = signal<ChartType>(ChartType.BAR);
  private readonly _chartViewModes = signal<ChartViewMode[]>([
    { type: ChartType.BAR, label: 'Wykres słupkowy', icon: 'bar_chart' },
    { type: ChartType.PIE, label: 'Wykres kołowy', icon: 'pie_chart' }
  ]);

  // Internal date filter state
  private readonly _dateFilterValue = signal<DateFilterValue>({ preset: 'today' });

  // Computed signals
  protected readonly data = computed(() => this.expensesFacade.chartExpensesByCategory());
  protected readonly hasData = computed(() => this.data().length > 0);
  protected readonly selectedChartType = computed(() => this._selectedChartType());
  protected readonly chartViewModes = computed(() => this._chartViewModes());
  protected readonly dateFilterValue = computed(() => this._dateFilterValue());

  ngOnInit(): void {
    // Load initial data for charts
    void this.loadChartData();
  }

  /**
   * Load chart data by refreshing expenses
   */
  private async loadChartData(): Promise<void> {
    try {
      await this.expensesFacade.refreshForCharts('initial');
    } catch (error) {
      console.error('Failed to load chart data:', error);
    }
  }

  /**
   * Handle chart type change
   */
  protected onChartTypeChange(type: ChartType): void {
    this._selectedChartType.set(type);
  }

  /**
   * Handle chart item selection
   */
  protected onSelect(event: any): void {
    console.log('Chart item selected:', event);
  }

  /**
   * Handle chart item activation (hover)
   */
  protected onActivate(event: any): void {
    // Can be used for hover effects or tooltips
  }

  /**
   * Handle chart item deactivation (hover out)
   */
  protected onDeactivate(event: any): void {
    // Can be used to clean up hover effects
  }

  /**
   * Handle date filter change
   */
  protected onDateFilterChange(change: DateFilterChange): void {
    // Update internal filter state
    this._dateFilterValue.set(change);

    // Apply filters to expenses facade which will trigger data reload
    this.expensesFacade.setChartFilters({
      preset: change.preset as any,
      date_from: change.date_from,
      date_to: change.date_to,
    });
  }
}
