import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import type { DatePreset, DatePresetOption } from '../../../lib/models/expenses';

@Component({
  selector: 'app-date-quick-filter',
  standalone: true,
  imports: [MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      [value]="selectedPreset()"
      [disabled]="disabled()"
      (valueChange)="onPresetChange($event as DatePreset)"
      appearance="legacy"
      class="flex flex-wrap gap-2"
    >
      @for (option of presets(); track option.id) {
        <mat-button-toggle [value]="option.id" class="min-w-[84px] px-3">
          {{ option.label }}
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class DateQuickFilterComponent {
  readonly presets = input.required<DatePresetOption[]>();
  readonly selectedPreset = input<DatePreset>('custom');
  readonly disabled = input<boolean>(false);

  readonly presetChange = output<DatePreset>();

  onPresetChange(preset: DatePreset): void {
    this.presetChange.emit(preset);
  }
}

