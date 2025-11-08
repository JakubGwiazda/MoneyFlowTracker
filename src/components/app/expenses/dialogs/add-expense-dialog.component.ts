import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

import type { CategoryOptionViewModel } from '../../../../lib/models/expenses';
import type { CreateExpenseCommand } from '../../../../types';
import { SelectAutocompleteComponent, type SelectAutocompleteOption } from '../../common/select-autocomplete.component';

export type AddExpenseDialogMode = 'single' | 'add-another';

export type AddExpenseDialogResult = {
  command: CreateExpenseCommand;
  mode: AddExpenseDialogMode;
};

type DialogData = {
  getCategories: () => CategoryOptionViewModel[];
  expense?: {
    id: string;
    name: string;
    amount: number;
    expense_date: string;
    category_id: string | null;
  };
  onCategorySearch?: (query: string) => void;
};

@Component({
  selector: 'app-add-expense-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCheckboxModule,
    SelectAutocompleteComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ expense ? 'Edytuj wydatek' : 'Dodaj wydatek' }}</h2>
    <form mat-dialog-content [formGroup]="form" class="flex flex-col gap-4">
      <mat-form-field class="mt-2" appearance="outline">
        <mat-label>Nazwa</mat-label>
        <input matInput formControlName="name" required maxlength="100" />
        <mat-error *ngIf="form.controls.name.hasError('required')">
          Nazwa jest wymagana
        </mat-error>
      </mat-form-field>

      <mat-form-field class="mt-2" appearance="outline">
        <mat-label>Kwota</mat-label>
        <input matInput type="number" min="0" step="0.01" formControlName="amount" required />
        <mat-error *ngIf="form.controls.amount.hasError('required')">
          Kwota jest wymagana
        </mat-error>
        <mat-error *ngIf="form.controls.amount.hasError('min')">
          Kwota musi być większa od zera
        </mat-error>
      </mat-form-field>

      <mat-form-field class="mt-2" appearance="outline">
        <mat-label>Data</mat-label>
        <input matInput [matDatepicker]="picker" formControlName="expense_date" required />
        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
        <mat-error *ngIf="form.controls.expense_date.hasError('required')">
          Data jest wymagana
        </mat-error>
      </mat-form-field>
      <p>Kategoria
      <app-select-autocomplete class="w-25"
        [options]="categories()"
        [value]="form.controls.category_id.value"
        (valueChange)="form.controls.category_id.setValue($event)"
        (queryChange)="handleCategorySearch($event)"
      />

      <mat-checkbox formControlName="addAnother" *ngIf="!expense">
        Zapisz i dodaj kolejny
      </mat-checkbox>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="form.invalid">
        {{ expense ? 'Zapisz' : 'Dodaj' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseDialogComponent {
  private readonly data = inject(MAT_DIALOG_DATA) as DialogData;
  readonly dialogRef = inject(MatDialogRef<AddExpenseDialogComponent, AddExpenseDialogResult | undefined>);
  private readonly fb = inject(FormBuilder);

  readonly categories = computed((): SelectAutocompleteOption[] =>
    this.data.getCategories().map((category) => ({
      id: category.id,
      label: category.label,
    }))
  );
  readonly expense = this.data.expense;

  readonly form = this.fb.group({
    name: [this.expense?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    amount: [this.expense?.amount ?? null, [Validators.required, Validators.min(0.01)]],
    expense_date: [this.parseDate(this.data.expense?.expense_date) ?? new Date(), Validators.required],
    category_id: [this.expense?.category_id ?? null],
    addAnother: [false],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const name = (value.name ?? '').trim();
    const amount = value.amount ?? 0;

    const command: CreateExpenseCommand = {
      name,
      amount: Number(amount),
      expense_date: this.toIsoDate(value.expense_date as Date),
      category_id: value.category_id ?? null,
    };

    this.dialogRef.close({
      command,
      mode: value.addAnother ? 'add-another' : 'single',
    });
  }

  handleCategorySearch(query: string): void {
    this.data.onCategorySearch?.(query);
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toIsoDate(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .slice(0, 10);
  }
}

