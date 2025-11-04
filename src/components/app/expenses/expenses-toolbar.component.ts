import {
  ChangeDetectionStrategy,
  Component,
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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import type {
  CategoryOptionViewModel,
  DatePreset,
  DatePresetOption,
  ExpensesFilterState,
  StatusFilterOption,
} from '../../../lib/models/expenses';
import type { ClassificationStatus } from '../../../types';
import { DateQuickFilterComponent } from './date-quick-filter.component.ts';
import { ClassificationStatusChipsComponent } from './classification-status-chips.component.ts';
import { CategoryAutocompleteComponent } from './category-autocomplete.component.ts';

const DEFAULT_PRESET: DatePreset = 'month';

@Component({
  selector: 'app-expenses-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    DateQuickFilterComponent,
    ClassificationStatusChipsComponent,
    CategoryAutocompleteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-4" [formGroup]="form">
      <div class="flex flex-wrap items-start gap-4">
        <app-date-quick-filter
          [presets]="datePresets"
          [selectedPreset]="selectedPreset()"
          [disabled]="loading()"
          (presetChange)="onPresetChange($event)"
        />

        <mat-form-field appearance="outline" class="min-w-[260px] flex-1">
          <mat-label>Zakres dat</mat-label>
          <mat-date-range-input [rangePicker]="picker" [formGroup]="form" (dateChange)="onDateRangeChange()">
            <input matStartDate formControlName="date_from" placeholder="Od" />
            <input matEndDate formControlName="date_to" placeholder="Do" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>

        <button
          mat-button
          type="button"
          class="self-center"
          (click)="onResetFilters()"
          [disabled]="loading()"
        >
          Resetuj filtry
        </button>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto]">
        <section class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-gray-700">Status klasyfikacji</h3>
          <app-classification-status-chips
            [options]="statusOptions"
            [selectedStatus]="form.controls.status.value"
            [disabled]="loading()"
            (statusChange)="onStatusChange($event)"
          />
        </section>

        <section class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-gray-700">Kategoria</h3>
          <app-category-autocomplete
            [options]="categories()"
            [value]="form.controls.category_id.value"
            [disabled]="loading()"
            (valueChange)="onCategorySelected($event)"
            (queryChange)="categorySearch.emit($event)"
          />
        </section>

        <section class="flex items-end justify-end">
          <button
            mat-raised-button
            color="primary"
            type="button"
            (click)="addExpenseClick.emit()"
            [disabled]="loading()"
            class="flex items-center gap-2"
          >
            <mat-icon>add</mat-icon>
            Dodaj wydatek
          </button>
        </section>
      </div>
    </form>
  `,
})
export class ExpensesToolbarComponent {
  private readonly fb = inject(FormBuilder);

  readonly value = input.required<ExpensesFilterState>();
  readonly loading = input<boolean>(false);
  readonly categories = input.required<CategoryOptionViewModel[]>();

  readonly filterChange = output<Partial<ExpensesFilterState>>();
  readonly addExpenseClick = output<void>();
  readonly categorySearch = output<string>();

  readonly form = this.fb.group({
    date_from: this.fb.control<Date | null>(null),
    date_to: this.fb.control<Date | null>(null),
    status: this.fb.control<ClassificationStatus | undefined>(undefined),
    category_id: this.fb.control<string | null>(null),
  });

  readonly selectedPreset = signal<DatePreset>('custom');

  readonly statusOptions: StatusFilterOption[] = [
    { value: undefined, label: 'Wszystkie' },
    { value: 'pending', label: 'Oczekujące' },
    { value: 'predicted', label: 'Automatyczne' },
    { value: 'corrected', label: 'Skorygowane' },
    { value: 'failed', label: 'Nieudane' },
  ];

  readonly datePresets: DatePresetOption[] = this.buildPresets();

  private syncingInput = false;

  constructor() {
    effect(() => {
      const incoming = this.value();
      this.syncingInput = true;
      this.selectedPreset.set(incoming.preset ?? 'custom');
      this.form.patchValue(
        {
          date_from: this.parseDate(incoming.date_from),
          date_to: this.parseDate(incoming.date_to),
          status: incoming.status,
          category_id: incoming.category_id ?? null,
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
      this.emitFilterPatch({ preset, page: 1 });
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

    this.emitFilterPatch({
      preset,
      date_from: range.from,
      date_to: range.to,
      page: 1,
    });
  }

  onDateRangeChange(): void {
    if (this.syncingInput) {
      return;
    }

    const { date_from: begin, date_to: end } = this.form.getRawValue();

    this.selectedPreset.set('custom');

    this.emitFilterPatch({
      preset: 'custom',
      date_from: begin ? this.toIsoDate(begin) : undefined,
      date_to: end ? this.toIsoDate(end) : undefined,
      page: 1,
    });
  }

  onStatusChange(status: ClassificationStatus | undefined): void {
    this.form.controls.status.setValue(status, { emitEvent: false });
    this.emitFilterPatch({ status, page: 1 });
  }

  onCategorySelected(categoryId: string | null): void {
    this.form.controls.category_id.setValue(categoryId, { emitEvent: false });
    this.emitFilterPatch({ category_id: categoryId, page: 1 });
  }

  onResetFilters(): void {
    const range = this.resolvePresetRange(DEFAULT_PRESET);

    this.selectedPreset.set(DEFAULT_PRESET);
    this.form.patchValue(
      {
        date_from: this.parseDate(range.from),
        date_to: this.parseDate(range.to),
        status: undefined,
        category_id: null,
      },
      { emitEvent: false },
    );

    this.emitFilterPatch({
      preset: DEFAULT_PRESET,
      date_from: range.from,
      date_to: range.to,
      status: undefined,
      category_id: null,
      page: 1,
    });
  }

  private emitFilterPatch(patch: Partial<ExpensesFilterState>): void {
    if (this.syncingInput) {
      return;
    }

    this.filterChange.emit(patch);
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
    const match = this.datePresets.find((option) => option.id === preset)?.range;
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

