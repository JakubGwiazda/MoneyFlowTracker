import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { CategoryAutocompleteComponent } from '../category-autocomplete.component.ts';
import type { CategoryOptionViewModel, ExpensesListViewModel } from '../../../../lib/models/expenses';

type DialogData = {
  expense: ExpensesListViewModel;
  getCategories: () => CategoryOptionViewModel[];
  onCategorySearch?: (query: string) => void;
};

@Component({
  selector: 'app-edit-expense-category-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, CategoryAutocompleteComponent],
  template: `
    <h2 mat-dialog-title>Zmień kategorię</h2>
    <div mat-dialog-content class="flex flex-col gap-4">
      <div class="rounded-lg bg-gray-100 p-3 text-sm">
        <div class="font-medium text-gray-900">{{ data.expense.name }}</div>
        <div class="text-gray-600">{{ data.expense.amount | number:'1.2-2' }} · {{ data.expense.expense_date | date:'mediumDate' }}</div>
      </div>

      <app-category-autocomplete
        [options]="categories()"
        [value]="selectedCategoryId()"
        (valueChange)="onSelect($event)"
        (queryChange)="data.onCategorySearch?.($event)"
      />
    </div>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Anuluj</button>
      <button mat-raised-button color="primary" (click)="dialogRef.close(selectedCategoryId())" [disabled]="selectedCategoryId() === data.expense.category_id">
        Zapisz
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditExpenseCategoryDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditExpenseCategoryDialogComponent, string | null | undefined>);
  readonly data = inject(MAT_DIALOG_DATA) as DialogData;

  readonly categories = computed(() => this.data.getCategories());
  private readonly selectedId = signal<string | null>(this.data.expense.category_id ?? null);

  readonly selectedCategoryId = computed(() => this.selectedId());

  onSelect(categoryId: string | null): void {
    this.selectedId.set(categoryId);
  }
}

