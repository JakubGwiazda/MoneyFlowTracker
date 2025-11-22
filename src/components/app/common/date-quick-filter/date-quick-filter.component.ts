import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import type { DatePreset, DatePresetOption } from '../../../../lib/models/expenses';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-date-quick-filter',
  standalone: true,
  imports: [MatButtonToggleModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      [value]="selectedPreset()"
      [disabled]="disabled()"
      (valueChange)="onPresetChange($event)"
    >
      @for (option of presets(); track option.id) {
        <mat-button-toggle [value]="option.id">
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

  onPresetChange(event: unknown): void {
    const preset = typeof event === 'string' ? event : (event as { value?: string | null })?.value;

    if (!preset) {
      return;
    }

    this.presetChange.emit(preset as DatePreset);
  }
}

