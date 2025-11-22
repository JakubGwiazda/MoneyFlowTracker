import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

export interface RowAction<T = any> {
  key: string;
  label: string;
  icon: string;
  color?: 'primary' | 'accent' | 'warn';
  class?: string;
  data?: T;
}

export interface RowActionEvent<T = any> {
  action: RowAction<T>;
  data?: T;
}

@Component({
  selector: 'app-row-actions',
  standalone: true,
  imports: [MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
    >
      <mat-icon fontIcon="more_vert"></mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      @for (action of actions(); track action.key) {
        <button
          mat-menu-item
          [class]="action.class"
          (click)="emitAction(action)"
        >
          <mat-icon [color]="action.color">{{ action.icon }}</mat-icon>
          <span>{{ action.label }}</span>
        </button>
        @if (!$last) {
          <mat-divider></mat-divider>
        }
      }
    </mat-menu>
  `,
})
export class RowActionsComponent<T = any> {
  readonly actions = input.required<RowAction<T>[]>();
  readonly data = input<T>();
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('Opcje');

  readonly actionSelect = output<RowActionEvent<T>>();

  emitAction(action: RowAction<T>): void {
    this.actionSelect.emit({
      action,
      data: this.data()
    });
  }
}

