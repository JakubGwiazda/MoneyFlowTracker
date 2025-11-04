import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatListModule],
  template: `
    <div class="container-sm p-4">
      <h2 class="text-xl font-bold mb-4">Dodaj zakup</h2>      
      <form (ngSubmit)="onSubmit()" #form="ngForm" class="mb-4">
        <mat-form-field appearance="outline" class="w-full mb-3">
          <mat-label>Nazwa zakupu</mat-label>
          <input 
            matInput 
            [(ngModel)]="inputValue" 
            name="purchase"
            placeholder="np. Zakupy spożywcze"
            required
            #purchaseInput="ngModel"
          />
          <mat-error *ngIf="purchaseInput.invalid && purchaseInput.touched">
            Nazwa zakupu jest wymagana
          </mat-error>
        </mat-form-field>

        <button 
          mat-raised-button 
          color="primary" 
          type="submit"
          [disabled]="form.invalid"
        >
          <mat-icon>add</mat-icon>
          Dodaj
        </button>
      </form>

      <!-- Lista dodanych zakupów -->
      <div *ngIf="purchaseList.length > 0">
        <h3 class="text-lg font-medium mb-3">Dodane zakupy:</h3>
        <mat-list>
          <mat-list-item *ngFor="let item of purchaseList; let i = index">
            <mat-icon matListItemIcon>receipt</mat-icon>
            <div matListItemTitle>{{ item.name }}</div>
            <div matListItemLine>Dodano: {{ item.date | date:'short' }}</div>
            <button 
              mat-icon-button 
              color="warn" 
              (click)="removeItem(i)"
              matListItemMeta
            >
              <mat-icon>delete</mat-icon>
            </button>
          </mat-list-item>
        </mat-list>
      </div>

      <!-- Komunikat gdy lista jest pusta -->
      <div *ngIf="purchaseList.length === 0" class="text-gray-500 text-center p-4">
        <mat-icon style="font-size: 48px; width: 48px; height: 48px;" class="mb-2">shopping_cart</mat-icon>
        <p>Brak dodanych zakupów</p>
      </div>
    </div>
  `,
})
export class PurchaseComponent {
  inputValue: string = '';
  purchaseList: Array<{name: string, date: Date}> = [];

  constructor() {}

  onSubmit(): void {
    if (this.inputValue.trim()) {
      this.purchaseList.push({
        name: this.inputValue.trim(),
        date: new Date()
      });
      this.inputValue = '';
    }
  }

  removeItem(index: number): void {
    this.purchaseList.splice(index, 1);
  }
}
