import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  input,
  output,
} from '@angular/core';
import type { AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import type { Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import type { ExpensesListViewModel, SortState } from '../../../models/expenses';
import { BadgeComponent } from '../../common/badge/badge.component';
import {
  RowActionsComponent,
  type RowAction,
  type RowActionEvent,
} from '../../common/row-actions/row-actions.component';

@Component({
  selector: 'app-expenses-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    BadgeComponent,
    RowActionsComponent,
    DatePipe,
    DecimalPipe,
  ],
  template: `
    <div class="table-wrapper">
      <div class="table-container">
        <table
          class="expenses-table"
          mat-table
          [dataSource]="dataSource"
          matSort
          (matSortChange)="onSort($event)"
          data-testid="expenses-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="created_at">Nazwa</th>
            <td mat-cell *matCellDef="let element">
              <div class="d-flex flex-column">
                <span class="text-md-start">{{ element.name }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="amount">Kwota (PLN)</th>
            <td mat-cell *matCellDef="let element" class="text-start">
              {{ element.amount | number: '1.2-2' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="expense_date">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="expense_date">Data</th>
            <td mat-cell *matCellDef="let element">
              {{ element.expense_date | date: 'dd.MM.yyyy' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Kategoria</th>
            <td mat-cell *matCellDef="let element">
              <div class="d-flex flex-column">
                <span class="text-md-start"> {{ element.categoryName }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="classification">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let element">
              <app-badge
                [label]="element.statusLabel"
                [tone]="element.statusTone"
                [pending]="element.classification_status === 'pending'"
                [tooltip]="
                  element.classification_status === 'predicted'
                    ? 'Pewność: ' + element.confidenceDisplay
                    : null
                " />
            </td>
          </ng-container>

          <ng-container matColumnDef="confidence">
            <th mat-header-cell *matHeaderCellDef>Pewność</th>
            <td mat-cell *matCellDef="let element">
              {{
                element.classification_status === 'corrected' ? 'n/d' : element.confidenceDisplay
              }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-end" style="width: 3rem">Akcje</th>
            <td mat-cell *matCellDef="let element" class="text-end">
              <app-row-actions
                [actions]="expenseActions"
                [data]="element"
                [disabled]="loading()"
                [ariaLabel]="'Opcje wydatku'"
                (actionSelect)="onAction($event)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
          <tr matNoDataRow>
            <td [attr.colspan]="columns.length" class="p-4 text-center small text-secondary">
              Brak wydatków do wyświetlenia.
            </td>
          </tr>
        </table>
      </div>

      @if (loading()) {
        <div class="loading-overlay">
          <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .table-wrapper {
        position: relative;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.7);
        z-index: 20;
      }

      .table-container {
        width: 100%;
        overflow: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }

      .expenses-table {
        width: 100%;
        background: white;
      }
      
      /* Mobile responsive - optimized for Motorola Edge 60 Pro */
      @media (max-width: 450px) {
        .table-container {
          overflow-x: auto;
        }
        
        .expenses-table {
          min-width: 500px;
          font-size: 11px;
        }
        
        .expenses-table th,
        .expenses-table td {
          padding: 6px 4px !important;
          font-size: 11px !important;
        }
        
        /* Sticky first column (name) for easier navigation */
        .expenses-table th:first-child,
        .expenses-table td:first-child {
          position: sticky;
          left: 0;
          background: white;
          z-index: 2;
          box-shadow: 2px 0 4px rgba(0,0,0,0.1);
        }
        
        .expenses-table th:first-child {
          z-index: 3;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesTableComponent implements AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  readonly data = input.required<ExpensesListViewModel[]>();
  readonly loading = input<boolean>(false);
  readonly sortState = input<SortState | null>(null);
  readonly filtersExpanded = input<boolean>(true);

  readonly sortChange = output<SortState | null>();
  readonly editExpense = output<string>();
  readonly editCategory = output<string>();
  readonly deleteExpense = output<string>();
  readonly reclassifyExpense = output<string>();

  readonly dataSource = new MatTableDataSource<ExpensesListViewModel>([]);

  readonly columns = [
    'name',
    'amount',
    'expense_date',
    'category',
    'classification',
    'confidence',
    'actions',
  ];

  readonly expenseActions: RowAction<ExpensesListViewModel>[] = [
    {
      key: 'edit',
      label: 'Edytuj',
      icon: 'edit',
      color: 'primary',
    },
    {
      key: 'delete',
      label: 'Usuń',
      icon: 'delete',
      color: 'warn',
      class: 'text-danger',
    },
  ];

  constructor() {
    effect(() => {
      this.dataSource.data = this.data();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;

    const currentSort = this.sortState();
    if (currentSort) {
      this.sort.active = currentSort.active;
      this.sort.direction = currentSort.direction;
    }
  }

  onSort(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      this.sortChange.emit(null);
      return;
    }

    this.sortChange.emit({
      active: sort.active as SortState['active'],
      direction: sort.direction as 'asc' | 'desc',
    });
  }

  onAction(event: RowActionEvent<ExpensesListViewModel>): void {
    const { action, data } = event;
    const expenseId = data?.id;

    if (!expenseId) return;

    switch (action.key) {
      case 'edit':
        this.editExpense.emit(expenseId);
        break;
      case 'delete':
        this.deleteExpense.emit(expenseId);
        break;
    }
  }
}
