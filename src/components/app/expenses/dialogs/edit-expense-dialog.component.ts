import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { SelectAutocompleteComponent, type SelectAutocompleteOption } from '../../common/select-autocomplete/select-autocomplete.component';
import type { CategoryOptionViewModel, ExpensesListViewModel } from '../../../../lib/models/expenses';
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
  imports: [CommonModule, MatDialogModule, MatButtonModule, SelectAutocompleteComponent,
     ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Edycja pozycji</h2>
    <div mat-dialog-content class="flex flex-col gap-4"> 
      <form [formGroup]="editForm" class="expense-edit-form">
        <mat-form-field appearance="outline">
          <mat-label>Nazwa</mat-label>
          <input matInput formControlName="name" required maxlength="100" />
          @if (editForm.controls.name.hasError('required')) {
            <mat-error>Nazwa jest wymagana</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Kwota</mat-label>
          <input matInput type="number" min="0" step="0.01" formControlName="amount" required />
          @if (editForm.controls.amount.hasError('required')) {
            <mat-error>Kwota jest wymagana</mat-error>
          }
          @if (editForm.controls.amount.hasError('min')) {
            <mat-error>Kwota musi być większa od zera</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Data</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="expense_date" required />
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          @if (editForm.controls.expense_date.hasError('required')) {
            <mat-error>Data jest wymagana</mat-error>
          }
        </mat-form-field>
        
      <app-select-autocomplete formControlName="category_id"
        [options]="categories()"
        [fieldLabel]="'Kategoria'"
        [value]="selectedId()"
        (valueChange)="onSelect($event)"
        (queryChange)="data.onCategorySearch?.($event)"
      />
      </form>
    </div>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="editForm.invalid">
        Zapisz
      </button>
    </mat-dialog-actions>
  `,
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
    category_id: [null as string | null, Validators.required],
  });

  readonly categories = computed((): SelectAutocompleteOption[] =>
    this.data.getCategories().map((category) => ({
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
      category_id: this.data.expense.category_id,
    });
  }

  onSelect(categoryId: string | null): void {
    this.selectedId.set(categoryId);
  }

  onSave(): void {
    this.dialogRef.close({
      name: this.editForm.controls.name.value,
      amount: this.editForm.controls.amount.value,
      expense_date: this.editForm.controls.expense_date.value,
      category_id: this.selectedCategoryId(),
      classification_status: this.data.expense.category_id !== this.selectedCategoryId() ? 'corrected' : this.data.expense.classification_status,
    });
  }
}

