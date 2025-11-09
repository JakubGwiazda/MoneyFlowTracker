import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import type {
  DatePreset,
  DatePresetOption,
} from '../../../lib/models/expenses';
import { ChipsComponent, type ChipOption, type ChipSelectionChange } from './chips.component';

export interface DateFilterValue {
  preset: DatePreset;
  date_from?: string;
  date_to?: string;
}

export interface DateFilterChange {
  preset: DatePreset;
  date_from?: string;
  date_to?: string;
}

const DEFAULT_PRESET: DatePreset = 'today';

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ChipsComponent,
  ],
  template: `
    <div>
      <p class="label_text">{{ label() }}</p>
      <app-chips
        [options]="dateChipOptions"
        [selectedValue]="selectedPreset()"
        [disabled]="disabled()"
        (selectionChange)="onDateSelectionChange($event)"
      />
      @if (selectedPreset() === 'custom') {
        <mat-form-field appearance="outline" class="mt-4 w-100">
          <mat-label>Zakres dat</mat-label>
          <mat-date-range-input [rangePicker]="picker" [formGroup]="form">
            <input matStartDate formControlName="date_from" placeholder="Od" (dateChange)="onDateRangeChange()"/>
            <input matEndDate formControlName="date_to" placeholder="Do" (dateChange)="onDateRangeChange()"/>
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>
      }
    </div>
  `,
  styles: [
    `
      .label_text {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
      }
      
      .w-100 {
        width: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateFilterComponent {
  private readonly fb = inject(FormBuilder);

  readonly value = input<DateFilterValue>({ preset: 'today' });
  readonly disabled = input<boolean>(false);
  readonly label = input<string>('Data');
  readonly dateChange = output<DateFilterChange>();

  readonly form = this.fb.group({
    date_from: this.fb.control<Date | null>(null),
    date_to: this.fb.control<Date | null>(null),
  });

  readonly selectedPreset = signal<DatePreset>('today');

  readonly dateChipOptions: ChipOption<DatePreset>[] = this.buildPresets().map((preset) => ({
    id: preset.id,
    value: preset.id,
    label: preset.label,
    range: preset.range,
  }));

  private syncingInput = false;

  constructor() {
    effect(() => {
      const incoming = this.value();
      this.syncingInput = true;
      this.selectedPreset.set(incoming.preset ?? 'today');
      this.form.patchValue(
        {
          date_from: this.parseDate(incoming.date_from),
          date_to: this.parseDate(incoming.date_to),
        },
        {
          emitEvent: false,
        },
      );
      this.syncingInput = false;
    });
  }

  onPresetChange(preset: DatePreset): void {
    this.selectedPreset.set(preset);

    if (preset === 'custom') {
      this.form.patchValue(
        {
          date_from: null,
          date_to: null,
        },
        { emitEvent: false },
      );

      this.emitDateChange({
        preset,
        date_from: undefined,
        date_to: undefined,
      });
      return;
    }

    const range = this.resolvePresetRange(preset);
    this.form.patchValue(
      {
        date_from: this.parseDate(range.from),
        date_to: this.parseDate(range.to),
      },
      { emitEvent: false },
    );

    this.emitDateChange({
      preset,
      date_from: range.from,
      date_to: range.to,
    });
  }

  onDateRangeChange(): void {
    const { date_from: begin, date_to: end } = this.form.getRawValue();

    if (!begin || !end) {
      return;
    }

    this.selectedPreset.set('custom');

    this.emitDateChange({
      preset: 'custom',
      date_from: begin ? this.toIsoDate(begin) : undefined,
      date_to: end ? this.toIsoDate(end) : undefined,
    });
  }

  onDateSelectionChange(event: ChipSelectionChange<DatePreset | undefined | null>): void {
    const selectedPreset = event.selected === null || event.selected === undefined ? 'today' : event.selected;

    if (selectedPreset) {
      this.onPresetChange(selectedPreset);
    }
  }

  reset(): void {
    const range = this.resolvePresetRange(DEFAULT_PRESET);

    this.selectedPreset.set(DEFAULT_PRESET);
    this.form.patchValue(
      {
        date_from: this.parseDate(range.from),
        date_to: this.parseDate(range.to),
      },
      { emitEvent: false },
    );

    this.emitDateChange({
      preset: DEFAULT_PRESET,
      date_from: range.from,
      date_to: range.to,
    });
  }

  private emitDateChange(change: DateFilterChange): void {
    if (this.syncingInput) {
      return;
    }

    this.dateChange.emit(change);
  }

  private buildPresets(): DatePresetOption[] {
    const today = new Date();
    const todayIso = this.toIsoDate(today);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const weekStart = this.startOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);

    return [
      {
        id: 'today',
        label: 'Dziś',
        range: { from: todayIso, to: todayIso },
      },
      {
        id: 'week',
        label: 'Bieżący tydzień',
        range: { from: this.toIsoDate(weekStart), to: this.toIsoDate(weekEnd) },
      },
      {
        id: 'month',
        label: 'Bieżący miesiąc',
        range: { from: this.toIsoDate(currentMonthStart), to: this.toIsoDate(currentMonthEnd) },
      },
      {
        id: 'year',
        label: 'Bieżący rok',
        range: { from: this.toIsoDate(yearStart), to: this.toIsoDate(yearEnd) },
      },
      {
        id: 'custom',
        label: 'Własny zakres',
      },
    ];
  }

  private resolvePresetRange(preset: DatePreset): { from: string; to: string } {
    const match = this.dateChipOptions.find((option) => option.id === preset)?.range;
    if (match) {
      return match;
    }

    const current = this.form.getRawValue();
    return {
      from: current.date_from ? this.toIsoDate(current.date_from) : this.toIsoDate(new Date()),
      to: current.date_to ? this.toIsoDate(current.date_to) : this.toIsoDate(new Date()),
    };
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toIsoDate(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  private startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}
