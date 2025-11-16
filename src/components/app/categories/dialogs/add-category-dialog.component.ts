import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDto } from '../../../../types';
import type { CategoryOptionViewModel } from '../../../../lib/models/categories';

export type AddCategoryDialogData = {
  category?: CategoryDto;
  parentCategories: CategoryOptionViewModel[];
};

export type AddCategoryDialogResult = {
  command: CreateCategoryCommand | UpdateCategoryCommand;
  isUpdate: boolean;
};

@Component({
  selector: 'app-add-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (isEditMode()) {
        Edytuj kategorię
      } @else {
        Dodaj nową kategorię
      }
    </h2>

    <mat-dialog-content data-testid="add-category-dialog">
      <form [formGroup]="form" class="category-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nazwa kategorii</mat-label>
          <input 
            matInput 
            formControlName="name"
            placeholder="np. Transport, Jedzenie"
            autocomplete="off"
            data-testid="category-name-input"
          />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Nazwa jest wymagana</mat-error>
          }
          @if (form.get('name')?.hasError('maxlength')) {
            <mat-error>Nazwa może mieć maksymalnie 100 znaków</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kategoria nadrzędna (opcjonalnie)</mat-label>
          <mat-select formControlName="parent_id">
            <mat-option [value]="null">Brak</mat-option>
            @for (parent of availableParents(); track parent.id) {
              <mat-option [value]="parent.id">{{ parent.label }}</mat-option>
            }
          </mat-select>
          <mat-hint>Wybierz kategorię nadrzędną, jeśli ta kategoria jest podkategorią</mat-hint>
        </mat-form-field>

        <div class="form-field-wrapper">
          <mat-slide-toggle formControlName="is_active">
            Kategoria aktywna
          </mat-slide-toggle>
          <p class="hint-text">
            Nieaktywne kategorie nie będą widoczne podczas dodawania wydatków
          </p>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" data-testid="category-cancel-button">
        Anuluj
      </button>
      <button 
        mat-raised-button 
        color="primary"
        (click)="onSubmit()"
        [disabled]="form.invalid || submitting()"
        data-testid="category-save-button"
      >
        @if (submitting()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          @if (isEditMode()) {
            Zapisz zmiany
          } @else {
            Dodaj kategorię
          }
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .category-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0;
      min-width: 400px;
    }

    .full-width {
      width: 100%;
    }

    .form-field-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .hint-text {
      margin: 0;
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.6);
    }

    mat-dialog-content {
      overflow: visible;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `],
})
export class AddCategoryDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<AddCategoryDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<AddCategoryDialogData>(MAT_DIALOG_DATA);

  readonly submitting = signal(false);
  readonly isEditMode = signal(!!this.data.category);
  readonly availableParents = signal<CategoryOptionViewModel[]>([]);

  form!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.filterAvailableParents();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const formValue = this.form.value;

    const command = {
      name: formValue.name?.trim(),
      parent_id: formValue.parent_id || null,
      is_active: formValue.is_active ?? true,
    };

    const result: AddCategoryDialogResult = {
      command,
      isUpdate: this.isEditMode(),
    };

    this.dialogRef.close(result);
  }

  private initializeForm(): void {
    const category = this.data.category;

    this.form = this.fb.group({
      name: [
        category?.name || '',
        [Validators.required, Validators.maxLength(100)]
      ],
      parent_id: [category?.parent_id || null],
      is_active: [category?.is_active ?? true],
    });
  }

  private filterAvailableParents(): void {
    // Filter out the current category and its children from parent options
    let parents = this.data.parentCategories.filter(p => p.isActive);

    if (this.data.category) {
      // Exclude self
      parents = parents.filter(p => p.id !== this.data.category!.id);
      
      // Exclude direct children (categories where parent_id === current category id)
      parents = parents.filter(p => p.parentId !== this.data.category!.id);
    }

    this.availableParents.set(parents);
  }
}

