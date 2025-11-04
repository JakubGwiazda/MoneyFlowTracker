import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import type { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import type { CategoryOptionViewModel } from '../../../lib/models/expenses';

@Component({
  selector: 'app-category-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" class="w-full">
      <mat-label>Kategoria</mat-label>
      <input
        type="text"
        matInput
        [matAutocomplete]="auto"
        [formControl]="queryCtrl"
        [disabled]="disabled()"
        (input)="onQueryInput()"
        (blur)="onBlur()"
      />
      <button
        *ngIf="queryCtrl.value || value()"
        type="button"
        mat-icon-button
        matSuffix
        aria-label="Wyczyść kategorię"
        (click)="clearSelection()"
        [disabled]="disabled()"
      >
        <mat-icon>close</mat-icon>
      </button>
      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="onOptionSelected($event)"
        [displayWith]="displayLabel"
      >
        @if (options().length === 0) {
          <mat-option [disabled]="true">Brak dopasowań</mat-option>
        } @else {
          @for (option of options(); track option.id) {
            <mat-option [value]="option.id">
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-sm">{{ option.label }}</span>
                <span
                  class="text-xs"
                  [class.text-emerald-600]="option.isActive"
                  [class.text-red-500]="!option.isActive"
                >
                  {{ option.isActive ? 'Aktywna' : 'Nieaktywna' }}
                </span>
              </div>
            </mat-option>
          }
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class CategoryAutocompleteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<CategoryOptionViewModel[]>();
  readonly value = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<string | null>();
  readonly queryChange = output<string>();

  readonly queryCtrl = this.fb.nonNullable.control('');

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;

  constructor() {
    effect(() => {
      const currentValue = this.value();
      const options = this.options();

      if (this.syncing) {
        return;
      }

      this.syncing = true;
      const match = options.find((option) => option.id === currentValue);
      this.queryCtrl.setValue(match ? match.label : '', { emitEvent: false });
      this.syncing = false;
    });

    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
    });
  }

  onQueryInput(): void {
    if (this.syncing) {
      return;
    }

    const query = this.queryCtrl.value.trim();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.queryChange.emit(query);
    }, 300);
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const optionId = event.option.value as string;
    const label = event.option.viewValue;

    this.syncing = true;
    this.queryCtrl.setValue(label, { emitEvent: false });
    this.syncing = false;

    this.valueChange.emit(optionId);
  }

  onBlur(): void {
    const currentValue = this.value();
    const label = this.queryCtrl.value.trim();
    const match = this.options().find((option) => option.label === label);

    if (!match && currentValue) {
      this.clearSelection();
    }
  }

  clearSelection(): void {
    this.syncing = true;
    this.queryCtrl.setValue('', { emitEvent: false });
    this.syncing = false;
    this.valueChange.emit(null);
  }

  readonly displayLabel = (value: string): string => {
    const option = this.options().find((item) => item.id === value);
    return option ? option.label : value;
  };
}

