import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import {
  SelectAutocompleteComponent,
  type SelectAutocompleteOption,
} from '../../../common/select-autocomplete/select-autocomplete.component';
import type { CategoryOptionViewModel, ExpensesListViewModel } from '../../../../models/expenses';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

type DialogData = {
  expense: ExpensesListViewModel;
  getCategories: () => CategoryOptionViewModel[];
  onCategorySearch?: (query: string) => void;
};

@Component({
  selector: 'app-edit-expense-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    SelectAutocompleteComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './edit-expense.html',
  styleUrl: './edit-expense.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditExpenseDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditExpenseDialogComponent, string | null | undefined>);
  readonly data = inject(MAT_DIALOG_DATA) as DialogData;
  private readonly fb = inject(FormBuilder);

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expense_date: [new Date(), Validators.required],
  });

  readonly categories = computed((): SelectAutocompleteOption[] =>
    this.data.getCategories().map(category => ({
      id: category.id,
      label: category.label,
    }))
  );

  readonly selectedId = signal<string | null>(this.data.expense.category_id);

  readonly selectedCategoryId = computed(() => this.selectedId());

  constructor() {
    this.editForm.patchValue({
      name: this.data.expense.name,
      amount: this.data.expense.amount,
      expense_date: new Date(this.data.expense.expense_date),
    });
    this.selectedId.set(this.data.expense.category_id);
  }

  onSelect(categoryId: string | null): void {
    this.selectedId.set(categoryId);
  }

  onSave(): void {
    if (this.editForm.invalid) {
      return;
    }

    if (!this.selectedCategoryId()) {
      return;
    }

    this.dialogRef.close({
      name: this.editForm.controls.name.value,
      amount: this.editForm.controls.amount.value,
      expense_date: this.editForm.controls.expense_date.value,
      category_id: this.selectedCategoryId(),
      classification_status:
        this.data.expense.category_id !== this.selectedCategoryId()
          ? 'corrected'
          : this.data.expense.classification_status,
    });
  }
}
