/**
 * Generic interface for chart data that can be mapped from various sources
 */
export interface ChartDataItem {
  name: string;
  value: number;
  extra?: {
    code?: string;
    [key: string]: any;
  };
}

/**
 * Chart configuration options
 */
export interface ChartConfig {
  showLegend?: boolean;
  showLabels?: boolean;
  showXAxisLabel?: boolean;
  showYAxisLabel?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorScheme?: string | { domain: string[] };
  gradient?: boolean;
  animations?: boolean;
}

/**
 * Chart type enumeration
 */
export enum ChartType {
  BAR = 'bar',
  PIE = 'pie',
  LINE = 'line'
}

/**
 * Interface for chart view modes
 */
export interface ChartViewMode {
  type: ChartType;
  label: string;
  icon: string;
}

