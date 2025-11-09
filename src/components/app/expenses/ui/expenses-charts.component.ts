import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarChartModule, PieChartModule } from '@swimlane/ngx-charts';
import { ChartDataItem, ChartType, ChartViewMode } from '../../../../lib/models/charts';

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
  selector: 'app-expenses-charts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    BarChartModule,
    PieChartModule
  ],
  template: `
    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>{{ title() }}</mat-card-title>
        <div class="chart-controls">
          <mat-button-toggle-group 
            [value]="selectedChartType()" 
            (change)="onChartTypeChange($event.value)"
            aria-label="Chart type">
            @for (mode of chartViewModes(); track mode.type) {
              <mat-button-toggle 
                [value]="mode.type"
                [matTooltip]="mode.label">
                <mat-icon>{{ mode.icon }}</mat-icon>
              </mat-button-toggle>
            }
          </mat-button-toggle-group>
        </div>
      </mat-card-header>
      
      <mat-card-content>
        @if (hasData()) {
          <div class="chart-container">
            @switch (selectedChartType()) {
              @case (ChartType.BAR) {
                <ngx-charts-bar-vertical
                  [results]="data()"
                  [xAxis]="true"
                  [yAxis]="true"
                  [showXAxisLabel]="true"
                  [showYAxisLabel]="true"
                  [xAxisLabel]="xAxisLabel()"
                  [yAxisLabel]="yAxisLabel()"
                  [showGridLines]="true"
                  [gradient]="gradient()"
                  [scheme]="colorScheme()"
                  [animations]="animations()"
                  [legend]="showLegend()"
                  [legendTitle]="'Categories'"
                  (select)="onSelect($event)"
                  (activate)="onActivate($event)"
                  (deactivate)="onDeactivate($event)">
                </ngx-charts-bar-vertical>
              }
              @case (ChartType.PIE) {
                <ngx-charts-pie-chart
                  [results]="data()"
                  [labels]="showLabels()"
                  [legend]="showLegend()"
                  [legendTitle]="'Categories'"
                  [gradient]="gradient()"
                  [scheme]="colorScheme()"
                  [animations]="animations()"
                  [doughnut]="false"
                  [arcWidth]="0.25"
                  [tooltipDisabled]="false"
                  (select)="onSelect($event)"
                  (activate)="onActivate($event)"
                  (deactivate)="onDeactivate($event)">
                </ngx-charts-pie-chart>
              }
            }
          </div>
        } @else {
          <div class="no-data-message">
            <mat-icon>info</mat-icon>
            <p>{{ noDataMessage() }}</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .chart-card {
      margin: 1rem 0;
      height: 100%;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .chart-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .chart-container {
      width: 100%;
      height: 400px;
      min-height: 300px;
    }

    .no-data-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: rgba(0, 0, 0, 0.6);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 1rem;
        opacity: 0.5;
      }
      
      p {
        margin: 0;
        font-size: 1rem;
      }
    }

    mat-button-toggle-group {
      border-radius: 4px;
    }

    mat-button-toggle {
      border: none;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 300px;
      }
      
      mat-card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class ExpensesChartsComponent {
  // Chart type enum for template usage
  protected readonly ChartType = ChartType;

  // Input signals using the new input() function
  readonly data = input<ChartDataItem[]>([]);
  readonly title = input<string>('Expenses Chart');
  readonly noDataMessage = input<string>('No data available for the selected period');
  readonly xAxisLabel = input<string>('Categories');
  readonly yAxisLabel = input<string>('Amount (PLN)');
  readonly showLegend = input<boolean>(true);
  readonly showLabels = input<boolean>(true);
  readonly gradient = input<boolean>(false);
  readonly animations = input<boolean>(true);
  readonly colorScheme = input<any>({
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#7aa3e5', '#a27ea8', '#f47560', '#e8c1a0']
  });

  // View state
  private readonly _selectedChartType = signal<ChartType>(ChartType.BAR);
  private readonly _chartViewModes = signal<ChartViewMode[]>([
    { type: ChartType.BAR, label: 'Bar Chart', icon: 'bar_chart' },
    { type: ChartType.PIE, label: 'Pie Chart', icon: 'pie_chart' }
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
}
