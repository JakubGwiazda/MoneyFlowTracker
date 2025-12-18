import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReceiptItem } from '../../../../models/receipt';

export interface EditableReceiptItem extends ReceiptItem {
  isEditing: boolean;
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
  readonly receiptItems = input.required<ReceiptItem[]>();

  // Outputs
  readonly itemsChanged = output<ReceiptItem[]>();
  readonly classifyRequested = output<ReceiptItem[]>();

  // State
  readonly items = signal<EditableReceiptItem[]>([]);
  readonly displayedColumns = ['name', 'price', 'actions'];

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
        isEditing: false,
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
          isEditing: false,
        }))
      );
    }
  }

  startEditing(index: number) {
    this.items.update(items => {
      const updated = [...items];
      updated[index].isEditing = true;
      return updated;
    });
  }

  finishEditing(index: number) {
    this.items.update(items => {
      const updated = [...items];
      const item = updated[index];

      // Validate
      item.name = item.name.trim();
      if (item.name === '') {
        item.name = 'Produkt';
      }
      if (item.price <= 0) {
        item.price = 0.01;
      }

      // Round price to 2 decimals
      item.price = Math.round(item.price * 100) / 100;

      item.isEditing = false;
      return updated;
    });

    this.emitChanges();
  }

  removeItem(index: number) {
    this.items.update(items => items.filter((_, i) => i !== index));
    this.emitChanges();
  }

  classifyAll() {
    const items = this.items().map(({ name, price }) => ({ name, price }));
    this.classifyRequested.emit(items);
  }

  private emitChanges() {
    const items = this.items().map(({ name, price }) => ({ name, price }));
    this.itemsChanged.emit(items);
  }
}
