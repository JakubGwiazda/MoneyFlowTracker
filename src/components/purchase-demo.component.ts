import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseComponent } from './ui/purchase/purchase.component';
import type { PurchaseData } from './ui/purchase/purchase.component';

@Component({
  selector: 'app-purchase-demo',
  standalone: true,
  imports: [CommonModule, PurchaseComponent],
  template: `
    <div class="space-y-8">
      <!-- Basic Purchase Form -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Basic Purchase Form</h2>
        <div class="max-w-md">
          <app-purchase
            (purchaseSubmit)="onPurchaseSubmit($event)"
            (purchaseCancel)="onPurchaseCancel()"
          />
        </div>
      </section>

      <!-- Purchase Form with Initial Data -->
      <section>
        <h2 class="text-2xl font-semibold mb-4">Form with Initial Data</h2>
        <div class="max-w-md">
          <app-purchase
            [initialData]="sampleData"
            (purchaseSubmit)="onPurchaseSubmitWithData($event)"
            (purchaseCancel)="onPurchaseCancel()"
          />
        </div>
      </section>

      <!-- Results Display -->
      <section *ngIf="submittedPurchases.length > 0">
        <h2 class="text-2xl font-semibold mb-4">Submitted Purchases</h2>
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nazwa
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kwota (PLN)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data dodania
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let purchase of submittedPurchases; let i = index" 
                  [class.bg-gray-50]="i % 2 === 1">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ purchase.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ purchase.amount | currency:'PLN':'symbol':'1.2-2' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ purchase.submittedAt | date:'medium' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Action Logs -->
      <section *ngIf="actionLogs.length > 0">
        <h2 class="text-2xl font-semibold mb-4">Action Logs</h2>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
          <div *ngFor="let log of actionLogs; let i = index" 
               class="text-sm text-gray-600 mb-2 last:mb-0">
            <span class="font-mono text-xs text-gray-400">{{ log.timestamp | date:'HH:mm:ss' }}</span>
            <span class="ml-2">{{ log.message }}</span>
          </div>
        </div>
      </section>

      <!-- Clear Data Button -->
      <section *ngIf="submittedPurchases.length > 0 || actionLogs.length > 0">
        <button
          (click)="clearData()"
          class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Wyczyść dane
        </button>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseDemoComponent {
  sampleData: Partial<PurchaseData> = {
    name: 'Zakupy spożywcze',
    amount: 125.50
  };

  submittedPurchases: Array<PurchaseData & { submittedAt: Date }> = [];
  actionLogs: Array<{ timestamp: Date; message: string }> = [];

  constructor(private cdr: ChangeDetectorRef) {}

  onPurchaseSubmit(purchaseData: PurchaseData): void {
    console.log('dodano zakup');
    this.submittedPurchases.push({
      ...purchaseData,
      submittedAt: new Date()
    });

    this.addLog(`Dodano zakup: "${purchaseData.name}" za ${purchaseData.amount} PLN`);
    this.cdr.markForCheck();
  }

  onPurchaseSubmitWithData(purchaseData: PurchaseData): void {
    this.submittedPurchases.push({
      ...purchaseData,
      submittedAt: new Date()
    });

    this.addLog(`Dodano zakup z danymi początkowymi: "${purchaseData.name}" za ${purchaseData.amount} PLN`);
    this.cdr.markForCheck();
  }

  onPurchaseCancel(): void {
    this.addLog('Anulowano dodawanie zakupu');
    this.cdr.markForCheck();
  }

  private addLog(message: string): void {
    this.actionLogs.unshift({
      timestamp: new Date(),
      message
    });

    // Keep only last 10 logs
    if (this.actionLogs.length > 10) {
      this.actionLogs = this.actionLogs.slice(0, 10);
    }
  }

  clearData(): void {
    this.submittedPurchases = [];
    this.actionLogs = [];
    this.addLog('Wyczyszczono wszystkie dane');
    this.cdr.markForCheck();
  }
}
