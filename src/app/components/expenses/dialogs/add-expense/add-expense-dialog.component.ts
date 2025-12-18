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
import { MatTabsModule } from '@angular/material/tabs';

import { ExpensesFacadeService } from '../../services/expenses-facade.service';
import { ReceiptOcrService } from '../../../../services/receipt-ocr/receipt-ocr.service';
import { CameraCaptureComponent } from '../camera-capture/camera-capture.component';
import { ReceiptItemsListComponent } from '../receipt-items-list/receipt-items-list.component';
import { ReceiptItem } from '../../../../models/receipt';

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
    MatTabsModule,
    CameraCaptureComponent,
    ReceiptItemsListComponent,
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
  private readonly receiptOcrService = inject(ReceiptOcrService);

  // Manual entry state
  readonly expensesList = signal<ExpenseToAdd[]>([]);
  readonly isClassifying = signal<boolean>(false);
  readonly disableSaveBtn = computed(
    () => this.isClassifying() || this.expensesList().length === 0
  );

  readonly displayedColumns = ['name', 'amount', 'expense_date', 'actions'];

  // OCR state
  readonly ocrInProgress = signal(false);
  readonly ocrError = signal<string | null>(null);
  readonly receiptItems = signal<ReceiptItem[]>([]);
  readonly showReceiptItems = computed(() => this.receiptItems().length > 0);

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

  // OCR Methods
  async onImageCaptured(imageBlob: Blob) {
    this.ocrInProgress.set(true);
    this.ocrError.set(null);

    try {
      const result = await this.receiptOcrService.processReceipt(imageBlob);

      if (!result.success) {
        this.ocrError.set(result.error || 'Nie udało się przetworzyć paragonu');
        return;
      }

      if (result.items.length === 0) {
        this.ocrError.set(
          'Nie znaleziono pozycji na paragonie. Spróbuj ponownie lub dodaj ręcznie.'
        );
        return;
      }

      // Set receipt items to display
      this.receiptItems.set(result.items);
    } catch (error: any) {
      console.error('OCR error:', error);
      this.ocrError.set('Nieoczekiwany błąd podczas przetwarzania paragonu');
    } finally {
      this.ocrInProgress.set(false);
    }
  }

  onReceiptItemsChanged(items: ReceiptItem[]) {
    // Update receipt items when user edits them
    this.receiptItems.set(items);
  }

  async onClassifyReceiptItems(items: ReceiptItem[]) {
    // Convert receipt items to expenses with current date
    const expenses: ExpenseToAdd[] = items.map(item => ({
      name: item.name,
      amount: item.price,
      expense_date: this.toIsoDate(new Date()),
    }));

    // Set to expenses list and classify/save
    this.expensesList.set(expenses);
    await this.onSave();
  }

  retryOcr() {
    this.ocrError.set(null);
    this.receiptItems.set([]);
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
