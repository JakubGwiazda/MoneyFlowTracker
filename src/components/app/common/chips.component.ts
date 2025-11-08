import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  template: `
    <mat-chip-listbox
      class=" custom flex flex-wrap gap-2"
      [multiple]="false"
      [disabled]="disabled()"
      [value]="selectedValue() ?? ''"
      (change)="onSelectionChange($event)"
    >
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
    `
  ]
})
export class ChipsComponent<T = unknown> {
  readonly options = input.required<ChipOption<T>[]>();
  readonly selectedValue = input<T | undefined>(undefined);
  readonly disabled = input<boolean>(false);

  readonly selectionChange = output<ChipSelectionChange<T>>();

  onSelectionChange(change: MatChipListboxChange): void {
    const value = change.value;
    this.selectionChange.emit({
      selected: value ? value as T : undefined
    });
  }
}

