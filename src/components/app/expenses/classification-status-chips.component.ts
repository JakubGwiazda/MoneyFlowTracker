import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import type { MatChipListboxChange } from '@angular/material/chips';

import type { ClassificationStatus } from '../../../types';
import type { StatusFilterOption } from '../../../lib/models/expenses';

@Component({
  selector: 'app-classification-status-chips',
  standalone: true,
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip-listbox
      class="flex flex-wrap gap-2"
      [multiple]="false"
      [disabled]="disabled()"
      [value]="selectedStatus() ?? ''"
      (change)="onStatusChange($event)"
    >
      @for (option of options(); track option.label) {
        <mat-chip-option [value]="option.value ?? ''" class="px-2 py-1 text-sm">
          {{ option.label }}
        </mat-chip-option>
      }
    </mat-chip-listbox>
  `,
})
export class ClassificationStatusChipsComponent {
  readonly options = input.required<StatusFilterOption[]>();
  readonly selectedStatus = input<ClassificationStatus | undefined>(undefined);
  readonly disabled = input<boolean>(false);

  readonly statusChange = output<ClassificationStatus | undefined>();

  onStatusChange(change: MatChipListboxChange): void {
    const value = change.value as string;
    this.statusChange.emit(value ? (value as ClassificationStatus) : undefined);
  }
}

