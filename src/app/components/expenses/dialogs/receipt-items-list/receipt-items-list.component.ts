import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ExpenseToAdd } from '../../../../models/receipt';

export interface EditableExpenseItem extends ExpenseToAdd {
  isEditingName: boolean;
  isEditingAmount: boolean;
}

/**
 * ReceiptItemsListComponent
 * Displays and allows editing of receipt items extracted from OCR
 */
@Component({
  selector: 'app-receipt-items-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './receipt-items-list.component.html',
  styleUrls: ['./receipt-items-list.component.scss'],
})
export class ReceiptItemsListComponent {
  // Inputs
  readonly receiptItems = input<ExpenseToAdd[]>([]);

  // Outputs
  readonly itemsChanged = output<ExpenseToAdd[]>();

  // State
  readonly items = signal<EditableExpenseItem[]>([]);
  readonly displayedColumns = ['name', 'amount', 'actions'];

  // Computed
  readonly itemsCount = computed(() => this.items().length);
  readonly canClassify = computed(() => this.items().length > 0);

  constructor() {
    // Watch for input changes and update items
    this.watchReceiptItems();
  }

  private watchReceiptItems() {
    // This will be called when receiptItems input changes
    // We need to set up effect for this
    const items = this.receiptItems();
    this.items.set(
      items.map(item => ({
        ...item,
        isEditingName: false,
        isEditingAmount: false,
      }))
    );
  }

  ngOnChanges() {
    // Handle input changes
    const items = this.receiptItems();
    if (items) {
      this.items.set(
        items.map(item => ({
          ...item,
          isEditingName: false,
          isEditingAmount: false,
        }))
      );
    }
  }

  startEditingName(index: number) {
    this.items.update(items => {
      const updated = items.map((item, i) => ({
        ...item,
        isEditingName: i === index,
        isEditingAmount: false, // Close amount editing in all rows
      }));
      return updated;
    });
  }

  startEditingAmount(index: number) {
    this.items.update(items => {
      const updated = items.map((item, i) => ({
        ...item,
        isEditingName: false, // Close name editing in all rows
        isEditingAmount: i === index,
      }));
      return updated;
    });
  }

  finishEditingName(index: number) {
    this.items.update(items => {
      const updated = [...items];
      const item = updated[index];

      // Validate name
      item.name = item.name.trim();
      if (item.name === '') {
        item.name = 'Produkt';
      }

      item.isEditingName = false;
      return updated;
    });

    this.emitChanges();
  }

  finishEditingAmount(index: number) {
    this.items.update(items => {
      const updated = [...items];
      const item = updated[index];

      // Validate amount
      if (item.amount <= 0) {
        item.amount = 0.01;
      }

      // Round amount to 2 decimals
      item.amount = Math.round(item.amount * 100) / 100;

      item.isEditingAmount = false;
      return updated;
    });

    this.emitChanges();
  }

  removeItem(index: number) {
    this.items.update(items => items.filter((_, i) => i !== index));
    this.emitChanges();
  }

  private emitChanges() {
    const items = this.items().map(({ name, amount, expense_date, quantity, unit }) => ({
      name,
      amount,
      expense_date,
      ...(quantity !== undefined && { quantity }),
      ...(unit !== undefined && { unit }),
    }));
    this.itemsChanged.emit(items);
  }
}
