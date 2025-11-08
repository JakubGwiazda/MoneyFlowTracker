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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import type {
  CategoryOptionViewModel,
  DatePreset,
  DatePresetOption,
  ExpensesFilterState,
} from '../../../../lib/models/expenses';
import type { ClassificationStatus } from '../../../../types';
import { ChipsComponent, type ChipOption, type ChipSelectionChange } from '../../common/chips.component';
import { SelectAutocompleteComponent, type SelectAutocompleteOption } from '../../common/select-autocomplete.component';

const DEFAULT_PRESET: DatePreset = 'today';

@Component({
  selector: 'app-expenses-filters',
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
    ChipsComponent,
    SelectAutocompleteComponent,
  ],
  templateUrl: './expenses-filters.component.html',
  styles: [
    `
      .label_text {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
      }
    `
  ]
})
export class ExpensesFilterComponent {
  private readonly fb = inject(FormBuilder);

  readonly value = input.required<ExpensesFilterState>();
  readonly loading = input<boolean>(false);
  readonly categories = input.required<CategoryOptionViewModel[]>();
  readonly filterChange = output<Partial<ExpensesFilterState>>();
  readonly addExpenseClick = output<void>();
  readonly categorySearch = output<string>();

  readonly form = this.fb.group({
    date: this.fb.group({
      date_from: this.fb.control<Date | null>(null),
      date_to: this.fb.control<Date | null>(null),
    }),
    status: this.fb.control<ClassificationStatus | undefined | null>(undefined),
    category_id: this.fb.control<string | null>(null),
  });


  readonly categoryOptions = computed((): SelectAutocompleteOption[] =>
    this.categories().map((category) => ({
      id: category.id,
      label: category.label,
    }))
  );

  readonly selectedPreset = signal<DatePreset>('today');

  readonly dateChipOptions: ChipOption<DatePreset>[] = this.buildPresets().map((preset) => ({
    id: preset.id,
    value: preset.id,
    label: preset.label,
    range: preset.range,
  }));

  readonly statusChipOptions: ChipOption<ClassificationStatus | undefined>[] = [
    { id: 'all', value: undefined, label: 'Wszystkie' },
    { id: 'pending', value: 'pending', label: 'Oczekujące' },
    { id: 'predicted', value: 'predicted', label: 'Automatyczne' },
    { id: 'corrected', value: 'corrected', label: 'Skorygowane' },
    { id: 'failed', value: 'failed', label: 'Nieudane' },
  ];

  private syncingInput = false;

  constructor() {
    effect(() => {
      const incoming = this.value();
      this.syncingInput = true;
      this.selectedPreset.set(incoming.preset ?? 'today');
      this.form.patchValue(
        {
          date: {
            date_from: this.parseDate(incoming.date_from),
            date_to: this.parseDate(incoming.date_to),
          },
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
      this.form.patchValue(
        {
          date: {
            date_from: null,
            date_to: null,
          },
        },
        { emitEvent: false },
      );

      this.emitFilterPatch({
        preset,
        date_from: undefined,
        date_to: undefined,
        page: 1
      });
      return;
    }

    const range = this.resolvePresetRange(preset);
    this.form.patchValue(
      {
        date: {
          date_from: this.parseDate(range.from),
          date_to: this.parseDate(range.to),
        },
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
    const { date: { date_from: begin, date_to: end } } = this.form.getRawValue();

    if (!begin || !end) {
      return;
    }

    this.selectedPreset.set('custom');

    this.emitFilterPatch({
      preset: 'custom',
      date_from: begin ? this.toIsoDate(begin) : undefined,
      date_to: end ? this.toIsoDate(end) : undefined,
      page: 1,
    });
  }

  onStatusSelectionChange(event: ChipSelectionChange<ClassificationStatus | undefined | null>): void {
    const status = event.selected === null ? undefined : event.selected;
    this.form.controls.status.setValue(status, { emitEvent: false });
    this.emitFilterPatch({ status, page: 1 });
  }

  onDateSelectionChange(event: ChipSelectionChange<DatePreset | undefined | null>): void {
    const selectedPreset = event.selected === null || event.selected === undefined ? 'today' : event.selected;

    if (selectedPreset) {
      this.onPresetChange(selectedPreset);
    }
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
        date: {
          date_from: this.parseDate(range.from),
          date_to: this.parseDate(range.to),
        },
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
    const match = this.dateChipOptions.find((option) => option.id === preset)?.range;
    if (match) {
      return match;
    }

    const current = this.form.getRawValue();
    return {
      from: current.date.date_from ? this.toIsoDate(current.date.date_from) : this.toIsoDate(new Date()),
      to: current.date.date_to ? this.toIsoDate(current.date.date_to) : this.toIsoDate(new Date()),
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

