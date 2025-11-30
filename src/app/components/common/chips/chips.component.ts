import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import type { MatChipListboxChange } from '@angular/material/chips';

/**
 * Generic interface for chip options
 */
export interface ChipOption<T = unknown> {
  id: string | number;
  label: string;
  value: T;
  range?: {
    from: string;
    to: string;
  };
}

/**
 * Generic interface for chip selection change event
 */
export interface ChipSelectionChange<T = unknown> {
  selected: T | undefined;
}

@Component({
  selector: 'app-chips',
  standalone: true,
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ChipsComponent),
      multi: true,
    },
  ],
  template: `
    <mat-chip-listbox
      class="custom flex flex-wrap gap-2"
      [multiple]="false"
      [disabled]="disabled() || isDisabled"
      [value]="value ?? ''"
      (change)="onSelectionChange($event)">
      @for (option of options(); track option.label) {
        <mat-chip-option [value]="option.value ?? ''" class="px-2 py-1 text-sm">
          {{ option.label }}
        </mat-chip-option>
      }
    </mat-chip-listbox>
  `,
  styles: [
    `
      .custom {
        width: fit-content;
      }
    `,
  ],
})
export class ChipsComponent<T = unknown> implements ControlValueAccessor {
  readonly options = input.required<ChipOption<T>[]>();
  readonly selectedValue = input<T | undefined>(undefined);
  readonly disabled = input<boolean>(false);

  readonly selectionChange = output<ChipSelectionChange<T>>();

  private onChange?: (value: T | undefined) => void;
  private onTouched?: () => void;
  isDisabled = false;
  value?: T;

  writeValue(value: T | undefined): void {
    this.value = value;
  }

  registerOnChange(fn: (value: T | undefined) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onSelectionChange(change: MatChipListboxChange): void {
    const value = change.value;
    const selectedOption = this.options().find(option => (option.value ?? '') === value);

    this.value = selectedOption?.value;
    this.onChange?.(this.value);
    this.onTouched?.();

    this.selectionChange.emit({
      selected: selectedOption?.value,
    });
  }
}
