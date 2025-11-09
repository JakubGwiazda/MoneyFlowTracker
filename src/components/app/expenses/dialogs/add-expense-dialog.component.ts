import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import type { CategoryOptionViewModel } from '../../../../lib/models/expenses';
import type { CreateExpenseCommand } from '../../../../types';
import { SelectAutocompleteComponent, type SelectAutocompleteOption } from '../../common/select-autocomplete.component';
import { ExpensesFacadeService } from '../services/expenses-facade.service';
import { ClassificationResult } from '../../../../lib/models/openrouter';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

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
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    SelectAutocompleteComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ expense ? 'Edytuj wydatek' : 'Dodaj wydatek' }}</h2>
    <form mat-dialog-content [formGroup]="form" class="flex flex-col gap-4">
      <mat-form-field class="mt-2" appearance="outline">
        <mat-label>Nazwa</mat-label>
        <input matInput formControlName="name" required maxlength="100" (input)="onDescriptionChange($event)" />
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

      <!-- AI Classification Suggestion -->
      @if (isClassifying()) {
        <mat-card class="classification-loading">
          <mat-card-content class="flex items-center gap-2">
            <mat-spinner diameter="20"></mat-spinner>
            <span>Sugeruję kategorię...</span>
          </mat-card-content>
        </mat-card>
      }

      @if (suggestedCategory()) {
        <mat-card class="classification-suggestion" [class.high-confidence]="suggestedCategory()!.confidence > 0.8">
          <mat-card-content>
            <div class="flex items-center gap-2">
              <mat-icon>{{ suggestedCategory()!.isNewCategory ? 'add_circle' : 'check_circle' }}</mat-icon>
              <div class="suggestion-content flex-1">
                <div class="category-name font-medium">{{ suggestedCategory()!.categoryName }}</div>
                <div class="confidence text-sm text-gray-600">Pewność: {{ (suggestedCategory()!.confidence * 100).toFixed(0) }}%</div>
                <div class="reasoning text-sm text-gray-500">{{ suggestedCategory()!.reasoning }}</div>
              </div>
              @if (suggestedCategory()!.isNewCategory) {
                <button mat-stroked-button (click)="createNewCategory(suggestedCategory()!.categoryName)">
                  Utwórz kategorię
                </button>
              } @else {
                <button mat-stroked-button (click)="applySuggestion()">
                  Zastosuj
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

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
  private readonly expensesFacade = inject(ExpensesFacadeService);

  private readonly descriptionChange$ = new Subject<string>();
  
  readonly suggestedCategory = signal<ClassificationResult | null>(null);
  readonly isClassifying = signal<boolean>(false);

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

  constructor() {
    // Setup debounced description change handling
    this.descriptionChange$.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(description => {
      this.classifyDescription(description);
    });
  }

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

  onDescriptionChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const description = target.value.trim();
    
    if (description.length >= 1) {
      this.descriptionChange$.next(description);
    } else {
      this.suggestedCategory.set(null);
    }
  }

  private async classifyDescription(description: string): Promise<void> {
    const amount = this.form.get('amount')?.value || 0;
    
    this.isClassifying.set(true);
    
    try {
      const result = await this.expensesFacade.suggestCategory(description, amount);
      this.suggestedCategory.set(result);
      
      // Auto-apply if confidence is very high and it's an existing category
      if (result.confidence > 0.9 && !result.isNewCategory) {
        this.form.patchValue({ category_id: result.categoryId });
      }
    } catch (error) {
      console.error('Classification error:', error);
      this.suggestedCategory.set(null);
    } finally {
      this.isClassifying.set(false);
    }
  }

  applySuggestion(): void {
    const suggestion = this.suggestedCategory();
    if (suggestion && !suggestion.isNewCategory) {
      this.form.patchValue({ category_id: suggestion.categoryId });
    }
  }

  createNewCategory(categoryName: string): void {
    // TODO: Implement category creation dialog
    console.log('Create new category:', categoryName);
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

