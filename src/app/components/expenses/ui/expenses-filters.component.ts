import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import type {
  CategoryOptionViewModel,
  DatePreset,
  ExpensesFilterState,
} from '../../../models/expenses';
import type { ClassificationStatus } from '../../../../types';
import {
  ChipsComponent,
  type ChipOption,
  type ChipSelectionChange,
} from '../../common/chips/chips.component';
import {
  SelectAutocompleteComponent,
  type SelectAutocompleteOption,
} from '../../common/select-autocomplete/select-autocomplete.component';
import {
  DateFilterComponent,
  type DateFilterValue,
  type DateFilterChange,
} from '../../common/date-filter/date-filter.component';

const DEFAULT_PRESET: DatePreset = 'today';

@Component({
  selector: 'app-expenses-filters',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    ChipsComponent,
    SelectAutocompleteComponent,
    DateFilterComponent,
  ],
  templateUrl: './expenses-filters.component.html',
  styles: [
    `
      .label_text {
        font-size: 20px;
        font-weight: 500;
        margin: 0;
      }
      
      .filters-container {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      
      .filter-item {
        flex: 1;
        min-width: 200px;
      }
      
      @media (max-width: 450px) {
        .label_text {
          font-size: 16px;
          margin-bottom: 8px;
        }
        
        .filters-container {
          flex-direction: column;
          gap: 1rem;
        }
        
        .filter-item {
          width: 100%;
          min-width: 0;
        }
      }
    `,
  ],
})
export class ExpensesFilterComponent {
  private readonly fb = inject(FormBuilder);

  readonly value = input.required<ExpensesFilterState>();
  readonly loading = input<boolean>(false);
  readonly categories = input.required<CategoryOptionViewModel[]>();
  readonly filterChange = output<Partial<ExpensesFilterState>>();
  readonly categorySearch = output<string>();

  readonly form = this.fb.group({
    status: this.fb.control<ClassificationStatus | undefined | null>(undefined),
    category_id: this.fb.control<string | null>(null),
  });

  readonly categoryOptions = computed((): SelectAutocompleteOption[] =>
    this.categories().map(category => ({
      id: category.id,
      label: category.label,
    }))
  );

  readonly dateFilterValue = signal<DateFilterValue>({ preset: 'today' });

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
      this.dateFilterValue.set({
        preset: incoming.preset ?? 'today',
        date_from: incoming.date_from,
        date_to: incoming.date_to,
      });
      this.form.patchValue(
        {
          status: incoming.status,
          category_id: incoming.category_id ?? null,
        },
        {
          emitEvent: false,
        }
      );
      this.syncingInput = false;
    });
  }

  onDateFilterChange(change: DateFilterChange): void {
    this.dateFilterValue.set({
      preset: change.preset,
      date_from: change.date_from,
      date_to: change.date_to,
    });

    this.emitFilterPatch({
      preset: change.preset,
      date_from: change.date_from,
      date_to: change.date_to,
      page: 1,
    });
  }

  onStatusSelectionChange(
    event: ChipSelectionChange<ClassificationStatus | undefined | null>
  ): void {
    const status = event.selected === null ? undefined : event.selected;
    this.form.controls.status.setValue(status, { emitEvent: false });
    this.emitFilterPatch({ status, page: 1 });
  }

  onCategorySelected(categoryId: string | null): void {
    this.form.controls.category_id.setValue(categoryId, { emitEvent: false });
    this.emitFilterPatch({ category_id: categoryId, page: 1 });
  }

  onResetFilters(): void {
    this.dateFilterValue.set({ preset: DEFAULT_PRESET });
    this.form.patchValue(
      {
        status: undefined,
        category_id: null,
      },
      { emitEvent: false }
    );

    // Reset date filter will emit its own change
    this.emitFilterPatch({
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
}
