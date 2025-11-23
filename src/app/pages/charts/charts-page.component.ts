import { Component, input, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarChartModule, PieChartModule } from '@swimlane/ngx-charts';
import { ChartDataItem, ChartType, ChartViewMode } from '../../../lib/models/charts';
import { MatExpansionModule } from '@angular/material/expansion';
import { DateFilterComponent, type DateFilterValue, type DateFilterChange } from '../../components/common/date-filter/date-filter.component';

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
export class ChartsPageComponent {
  // Chart type enum for template usage
  protected readonly ChartType = ChartType;

  // Input signals using the new input() function
  readonly data = input<ChartDataItem[]>([]);
  readonly noDataMessage = input<string>('W wybranym zakresie nie znaleziono żadnych wpisów');
  readonly xAxisLabel = input<string>('Kategorie');
  readonly yAxisLabel = input<string>('Kwota (PLN)');
  readonly showLegend = input<boolean>(true);
  readonly showLabels = input<boolean>(true);
  readonly gradient = input<boolean>(false);
  readonly animations = input<boolean>(true);
  readonly colorScheme = input<any>({
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#7aa3e5', '#a27ea8', '#f47560', '#e8c1a0']
  });
  readonly dateFilterValue = input<DateFilterValue>({ preset: 'today' });

  // Output signals
  readonly dateFilterChange = output<DateFilterChange>();

  // View state
  private readonly _selectedChartType = signal<ChartType>(ChartType.BAR);
  private readonly _chartViewModes = signal<ChartViewMode[]>([
    { type: ChartType.BAR, label: 'Wykres słupkowy', icon: 'bar_chart' },
    { type: ChartType.PIE, label: 'Wykres kołowy', icon: 'pie_chart' }
  ]);

  // Computed signals
  protected readonly hasData = computed(() => this.data().length > 0);
  protected readonly selectedChartType = computed(() => this._selectedChartType());
  protected readonly chartViewModes = computed(() => this._chartViewModes());

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
    this.dateFilterChange.emit(change);
  }
}
