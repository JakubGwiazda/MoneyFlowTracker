import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import type { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { cn } from '@/lib/utils';

export interface PurchaseData {
  name: string;
  amount: number;
}

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div [class]="containerClasses">
      <h2 class="text-lg font-semibold text-foreground mb-4">Dodaj zakup</h2>
      
      <form [formGroup]="purchaseForm" (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Name Field -->
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium text-foreground">
            Nazwa zakupu <span class="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            formControlName="name"
            placeholder="np. Zakupy spożywcze"
            [class]="inputClasses"
            [attr.aria-invalid]="purchaseForm.get('name')?.invalid && purchaseForm.get('name')?.touched"
          />
          <div 
            *ngIf="purchaseForm.get('name')?.invalid && purchaseForm.get('name')?.touched"
            class="text-sm text-destructive"
          >
            <span *ngIf="purchaseForm.get('name')?.errors?.['required']">
              Nazwa zakupu jest wymagana
            </span>
            <span *ngIf="purchaseForm.get('name')?.errors?.['minlength']">
              Nazwa musi mieć co najmniej 2 znaki
            </span>
          </div>
        </div>

        <!-- Amount Field -->
        <div class="space-y-2">
          <label for="amount" class="text-sm font-medium text-foreground">
            Kwota (PLN) <span class="text-destructive">*</span>
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            formControlName="amount"
            placeholder="0.00"
            [class]="inputClasses"
            [attr.aria-invalid]="purchaseForm.get('amount')?.invalid && purchaseForm.get('amount')?.touched"
          />
          <div 
            *ngIf="purchaseForm.get('amount')?.invalid && purchaseForm.get('amount')?.touched"
            class="text-sm text-destructive"
          >
            <span *ngIf="purchaseForm.get('amount')?.errors?.['required']">
              Kwota jest wymagana
            </span>
            <span *ngIf="purchaseForm.get('amount')?.errors?.['min']">
              Kwota musi być większa niż 0
            </span>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            (click)="onCancel()"
            [disabled]="isSubmitting"
            [class]="cancelButtonClasses"
          >
            Anuluj
          </button>
          <button
            type="submit"
            [disabled]="purchaseForm.invalid || isSubmitting"
            [class]="submitButtonClasses"
          >
            {{ isSubmitting ? 'Dodawanie...' : 'Dodaj zakup' }}
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseComponent implements OnInit {
  @Input() className: string = '';
  @Input() initialData?: Partial<PurchaseData>;
  @Output() purchaseSubmit = new EventEmitter<PurchaseData>();
  @Output() purchaseCancel = new EventEmitter<void>();

  purchaseForm!: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.purchaseForm = this.fb.group({
      name: [
        this.initialData?.name || '', 
        [Validators.required, Validators.minLength(2)]
      ],
      amount: [
        this.initialData?.amount || null, 
        [Validators.required, Validators.min(0.01)]
      ]
    });
  }

  get containerClasses(): string {
    return cn(
      'bg-card border border-border rounded-lg p-6 shadow-sm',
      this.className
    );
  }

  get inputClasses(): string {
    return cn(
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs transition-colors',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'md:text-sm'
    );
  }

  get cancelButtonClasses(): string {
    return cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
      'h-9 px-4 py-2'
    );
  }

  get submitButtonClasses(): string {
    return cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'bg-primary text-primary-foreground shadow hover:bg-primary/90',
      'h-9 px-4 py-2'
    );
  }

  onSubmit(): void {
    if (this.purchaseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const purchaseData: PurchaseData = {
        name: this.purchaseForm.value.name.trim(),
        amount: parseFloat(this.purchaseForm.value.amount)
      };

      // Simulate async operation
      setTimeout(() => {
        this.purchaseSubmit.emit(purchaseData);
        this.isSubmitting = false;
        this.resetForm();
      }, 500);
    }
  }

  onCancel(): void {
    this.purchaseCancel.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.purchaseForm.reset();
    this.purchaseForm.markAsUntouched();
  }

  // Public method to reset form externally
  reset(): void {
    this.resetForm();
  }

  // Public method to set form data externally
  setData(data: Partial<PurchaseData>): void {
    this.purchaseForm.patchValue(data);
  }
}
