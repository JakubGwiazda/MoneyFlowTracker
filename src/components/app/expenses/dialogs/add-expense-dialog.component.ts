import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

import { ExpensesFacadeService } from '../services/expenses-facade.service';

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
  template: `
    <h2 mat-dialog-title>Dodaj wydatek</h2>
    <div mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="mt-2 expense-form">
        <mat-form-field appearance="outline">
          <mat-label>Nazwa</mat-label>
          <input matInput formControlName="name" required maxlength="100" />
          @if (form.controls.name.hasError('required')) {
            <mat-error>Nazwa jest wymagana</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Kwota</mat-label>
          <input matInput type="number" min="0" step="0.01" formControlName="amount" required />
          @if (form.controls.amount.hasError('required')) {
            <mat-error>Kwota jest wymagana</mat-error>
          }
          @if (form.controls.amount.hasError('min')) {
            <mat-error>Kwota musi być większa od zera</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Data</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="expense_date" required />
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          @if (form.controls.expense_date.hasError('required')) {
            <mat-error>Data jest wymagana</mat-error>
          }
        </mat-form-field>

        <div class="form-actions">
          <button mat-raised-button color="primary" type="button" (click)="addExpenseToList()" [disabled]="form.invalid">
            Dodaj kolejny wydatek
          </button>
        </div>
      </form>

      @if (expensesList().length > 0) {
        <div class="expenses-table-container">
          <h3 class="table-title">Dodane wydatki ({{ expensesList().length }})</h3>
          <table mat-table [dataSource]="expensesList()" class="expenses-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nazwa</th>
              <td mat-cell *matCellDef="let expense">{{ expense.name }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Kwota</th>
              <td mat-cell *matCellDef="let expense">{{ expense.amount | number:'1.2-2' }} zł</td>
            </ng-container>

            <ng-container matColumnDef="expense_date">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let expense">{{ expense.expense_date | date:'dd.MM.yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let expense; let i = index">
                <button mat-icon-button color="warn" (click)="removeExpense(i)" type="button">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }

      @if (isClassifying()) {
        <div class="classification-status">
          <mat-spinner diameter="24"></mat-spinner>
          <span>Trwa klasyfikacja i zapis wydatków. Proszę czekać.</span>
        </div>
      }
    </div>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Anuluj</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="isClassifying()">
        Zapisz i klasyfikuj
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 600px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .expense-form {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 1rem;
      align-items: start;
    }

    .form-actions {
      display: flex;
      align-items: center;
      padding-top: 8px;
    }

    .expenses-table-container {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .table-title {
      margin: 0;
      padding: 1rem;
      background-color: #f5f5f5;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .expenses-table {
      width: 100%;
    }

    .classification-status {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddExpenseDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddExpenseDialogComponent, AddExpenseDialogResult | undefined>);
  private readonly fb = inject(FormBuilder);
  private readonly expensesFacade = inject(ExpensesFacadeService);

  readonly expensesList = signal<ExpenseToAdd[]>([]);
  readonly isClassifying = signal<boolean>(false);
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
  }

  removeExpense(index: number): void {
    this.expensesList.update(list => list.filter((_, i) => i !== index));
  }

  async onSave(): Promise<void> {
    if(this.expensesList().length !== 0){
      this.isClassifying.set(true);
      await this.classifyAndSaveExpenses(this.expensesList());
    }else{

      if(this.form.invalid){
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

