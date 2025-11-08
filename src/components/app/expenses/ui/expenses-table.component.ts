import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
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

import type { ExpensesListViewModel, SortState } from '../../../../lib/models/expenses';
import { BadgeComponent } from '../../common/badge.component';
import { RowActionsComponent } from '../../common/row-actions.component';

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
      <div class="table-scroll-container">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="created_at">Nazwa</th>
            <td mat-cell *matCellDef="let element">
              <div class="flex flex-col">
                <span class="font-medium text-sm text-gray-900">{{ element.name }}</span>
                <span class="text-xs text-gray-500">Dodano {{ element.created_at | date:'mediumDate' }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="amount" class="text-right">Kwota</th>
            <td mat-cell *matCellDef="let element" class="text-right font-semibold text-sm">
              {{ element.amount | number:'1.2-2' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="expense_date">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="expense_date">Data</th>
            <td mat-cell *matCellDef="let element">{{ element.expense_date | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef>Kategoria</th>
            <td mat-cell *matCellDef="let element">
              <div class="flex flex-col">
                <span class="text-sm text-gray-800">{{ element.categoryName }}</span>
                @if (element.predictedCategoryName && element.classification_status === 'predicted') {
                  <span class="text-xs text-blue-500">Sugestia: {{ element.predictedCategoryName }}</span>
                }
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
                [tooltip]="element.classification_status === 'predicted' ? 'Pewność: ' + element.confidenceDisplay : null"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="confidence">
            <th mat-header-cell *matHeaderCellDef>Pewność</th>
            <td mat-cell *matCellDef="let element">{{ element.confidenceDisplay }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="w-12 text-right">Akcje</th>
            <td mat-cell *matCellDef="let element" class="text-right">
              <app-row-actions
                [expense]="element"
                [disabled]="loading()"
                (actionSelect)="onAction(element.id, $event)"
              />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
          <tr matNoDataRow>
            <td [attr.colspan]="columns.length" class="p-6 text-center text-sm text-gray-500">
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
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .table-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        position: relative;
      }
      
      .table-scroll-container {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }
      
      :host table {
        width: 100%;
      }
      
      :host th.mat-sort-header-sorted {
        color: #2563eb;
      }
      
      :host .mat-mdc-header-row {
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: #fafafa;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesTableComponent implements AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  readonly data = input.required<ExpensesListViewModel[]>();
  readonly loading = input<boolean>(false);
  readonly sortState = input<SortState | null>(null);

  readonly sortChange = output<SortState | null>();
  readonly editExpense = output<string>();
  readonly editCategory = output<string>();
  readonly deleteExpense = output<string>();
  readonly reclassifyExpense = output<string>();

  readonly dataSource = new MatTableDataSource<ExpensesListViewModel>([]);

  readonly columns = ['name', 'amount', 'expense_date', 'category', 'classification', 'confidence', 'actions'];

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

    this.sortChange.emit({ active: sort.active as SortState['active'], direction: sort.direction as 'asc' | 'desc' });
  }

  onAction(expenseId: string, action: 'edit' | 'changeCategory' | 'reclassify' | 'delete'): void {
    switch (action) {
      case 'edit':
        this.editExpense.emit(expenseId);
        break;
      case 'changeCategory':
        this.editCategory.emit(expenseId);
        break;
      case 'reclassify':
        this.reclassifyExpense.emit(expenseId);
        break;
      case 'delete':
        this.deleteExpense.emit(expenseId);
        break;
    }
  }
}

