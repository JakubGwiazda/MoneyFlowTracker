import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import type { ExpenseActionType, ExpensesListViewModel } from '../../../lib/models/expenses';

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
      aria-label="Opcje wydatku"
    >
      <mat-icon fontIcon="more_vert"></mat-icon>
    </button>

    <mat-menu #menu="matMenu">
      <button mat-menu-item (click)="emit('edit')">
        <mat-icon>edit</mat-icon>
        <span>Edytuj</span>
      </button>
      <button mat-menu-item (click)="emit('changeCategory')">
        <mat-icon>label</mat-icon>
        <span>Zmień kategorię</span>
      </button>
      <button mat-menu-item [disabled]="expense().classification_status === 'pending'" (click)="emit('reclassify')">
        <mat-icon>refresh</mat-icon>
        <span>Reklasyfikuj</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item class="text-red-600" (click)="emit('delete')">
        <mat-icon color="warn">delete</mat-icon>
        <span>Usuń</span>
      </button>
    </mat-menu>
  `,
})
export class RowActionsComponent {
  readonly expense = input.required<ExpensesListViewModel>();
  readonly disabled = input<boolean>(false);

  readonly actionSelect = output<ExpenseActionType>();

  emit(action: ExpenseActionType): void {
    this.actionSelect.emit(action);
  }
}

