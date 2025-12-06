import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ExpensesFacadeService } from '../../services/expenses-facade.service';

export type ExpenseToAdd = {
  name: string;
  amount: number;
  expense_date: string;
};

export type AddExpenseDialogResult = {
  expenses: ExpenseToAdd[];
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
    MatProgressSpinnerModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './add-expense.html',
  styleUrl: './add-expense.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseDialogComponent {
  readonly dialogRef = inject(
    MatDialogRef<AddExpenseDialogComponent, AddExpenseDialogResult | undefined>
  );
  private readonly fb = inject(FormBuilder);
  private readonly expensesFacade = inject(ExpensesFacadeService);

  readonly expensesList = signal<ExpenseToAdd[]>([]);
  readonly isClassifying = signal<boolean>(false);
  readonly disableSaveBtn = computed(
    () => this.isClassifying() || this.expensesList().length === 0
  );

  readonly displayedColumns = ['name', 'amount', 'expense_date', 'actions'];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expense_date: [new Date(), Validators.required],
  });

  addExpenseToList(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const name = (value.name ?? '').trim();
    const amount = value.amount ?? 0;
    const expense_date = this.toIsoDate(value.expense_date as Date);

    const expense: ExpenseToAdd = {
      name,
      amount: Number(amount),
      expense_date,
    };

    this.expensesList.update(list => [...list, expense]);

    // Reset form but keep the date
    this.form.patchValue({
      name: '',
      amount: null,
    });
    this.form.markAsUntouched();
    console.log(this.disableSaveBtn());
    console.log(this.expensesList().length > 0);
    console.log(this.isClassifying());
  }

  removeExpense(index: number): void {
    this.expensesList.update(list => list.filter((_, i) => i !== index));
  }

  async onSave(): Promise<void> {
    if (this.expensesList().length !== 0) {
      this.isClassifying.set(true);
      await this.classifyAndSaveExpenses(this.expensesList());
    } else {
      if (this.form.invalid) {
        return;
      }

      this.isClassifying.set(true);
      const value = this.form.getRawValue();
      const name = (value.name ?? '').trim();
      const amount = value.amount ?? 0;
      const expense_date = this.toIsoDate(value.expense_date as Date);

      const expense: ExpenseToAdd = {
        name,
        amount: Number(amount),
        expense_date,
      };

      await this.classifyAndSaveExpenses([expense]);
    }
  }

  private async classifyAndSaveExpenses(expenses: ExpenseToAdd[]): Promise<void> {
    try {
      await this.expensesFacade.batchClassifyAndCreateExpenses(expenses);
      this.dialogRef.close({ expenses });
    } catch (error) {
      console.error('Error classifying and saving expenses:', error);
      // TODO: Show error message to user
    } finally {
      this.isClassifying.set(false);
    }
  }

  private toIsoDate(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .slice(0, 10);
  }
}
