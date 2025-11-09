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
  styles: [
    `
      :host ::ng-deep .tone-info {
        background-color: rgba(59, 130, 246, 0.12);
        color: rgb(37, 99, 235);
      }

      :host ::ng-deep .tone-success {
        background-color: rgba(34, 197, 94, 0.12);
        color: rgb(22, 163, 74);
      }

      :host ::ng-deep .tone-warning {
        background-color: rgba(250, 204, 21, 0.16);
        color: rgb(217, 119, 6);
      }

      :host ::ng-deep .tone-error {
        background-color: rgba(239, 68, 68, 0.12);
        color: rgb(220, 38, 38);
      }
    `,
  ],
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

