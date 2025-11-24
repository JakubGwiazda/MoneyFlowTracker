import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [NgClass, MatChipsModule, MatTooltipModule],
  template: `
  @if(label()) {
    <mat-chip
      [ngClass]="toneClass()"
      [matTooltip]="tooltip()"
      class="min-w-[7rem] justify-center text-xs font-medium"
    >
      {{ label() }}
    </mat-chip>
    } @else {
    <span class="text-xs text-gray-500">Brak danych</span>
    }
  `,
  styleUrls: ['./badge.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly label = input<string | null>(null);
  readonly tone = input<'info' | 'success' | 'warning' | 'error' | null>('info');
  readonly pending = input<boolean>(false);
  readonly tooltip = input<string | null>(null);

  toneClass(): string {
    const tone = this.pending() ? 'info' : this.tone() ?? 'info';
    return `tone-${tone}`;
  }
}

