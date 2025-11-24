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

export interface SelectAutocompleteOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-select-autocomplete',
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
    <mat-form-field appearance="outline">
      <mat-label>{{ fieldLabel() }}</mat-label>
      <input
        type="text"
        matInput
        [matAutocomplete]="auto"
        [formControl]="queryCtrl"
        [disabled]="disabled()"
        data-testid="select-search-input"
        (input)="onQueryInput()"
        (focus)="onFocus()"
        (blur)="onBlur()"
      />
      <mat-autocomplete
        #auto="matAutocomplete"
        (optionSelected)="onOptionSelected($event)"
        [displayWith]="displayLabel"
      >
        @if (options().length === 0) {
          <mat-option [disabled]="true">Brak dopasowań</mat-option>
        } @else {
          <mat-option [value]="null">-</mat-option>
          @for (option of options(); track option.id) {
            <mat-option [value]="option.id">
              <div class="flex items-center justify-between gap-3">
                <span class="truncate text-sm">{{ option.label }}</span>
              </div>
            </mat-option>
          }
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class SelectAutocompleteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<SelectAutocompleteOption[]>();
  readonly fieldLabel = input.required<string>();
  
  readonly value = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<string | null>();
  readonly queryChange = output<string>();

  readonly queryCtrl = this.fb.nonNullable.control('');

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private userTyping = false;

  constructor() {
    effect(() => {
      const currentValue = this.value();
      const options = this.options();

      if (this.syncing || this.userTyping) {
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

  onFocus(): void {
    if (this.syncing) {
      return;
    }

    this.userTyping = true;
    this.queryChange.emit('');
  }

  onQueryInput(): void {
    if (this.syncing) {
      return;
    }

    this.userTyping = true;
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
    
    this.userTyping = false;
    this.valueChange.emit(optionId);
  }

  onBlur(): void {
    // Reset userTyping flag when user leaves the field without selecting an option
    // This allows the effect to sync the display value properly
    setTimeout(() => {
      this.userTyping = false;
    }, 200); // Small delay to allow option selection to complete first
  }


  readonly displayLabel = (value: string): string => {
    const option = this.options().find((item) => item.id === value);
    return option ? option.label : value;
  };
}

