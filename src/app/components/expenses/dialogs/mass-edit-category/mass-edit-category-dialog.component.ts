import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SelectAutocompleteComponent } from '../../../common/select-autocomplete/select-autocomplete.component';
import type { CategoryOptionViewModel } from '../../../../models/expenses';

export type MassEditCategoryDialogData = {
  expenseIds: string[];
  expenseCount: number;
  getCategories: () => CategoryOptionViewModel[];
  onCategorySearch: (query: string) => void;
};

export type MassEditCategoryDialogResult = {
  category_id: string;
};

@Component({
  selector: 'app-mass-edit-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    SelectAutocompleteComponent,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="align-middle me-2">edit</mat-icon>
      Edycja
    </h2>
    <div mat-dialog-content class="dialog-content">
      <p class="text-muted mb-3">
        Wybierz kategorię dla {{ data.expenseCount }}
        {{ data.expenseCount === 1 ? 'wydatku' : data.expenseCount < 5 ? 'wydatków' : 'wydatków' }}
      </p>

      <form [formGroup]="form" class="mt-2">
        <app-select-autocomplete
          formControlName="category_id"
          [options]="categoryOptions()"
          [fieldLabel]="'Kategoria'"
          (queryChange)="onCategorySearch($event)"
          (valueChange)="onCategorySelected($event)"
          data-testid="mass-edit-category-select" />
      </form>
    </div>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()" data-testid="cancel-button">
        Anuluj
      </button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        [disabled]="form.invalid"
        (click)="onSave()"
        data-testid="save-button">
        Zapisz
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 350px;
        padding: 20px 24px;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MassEditCategoryDialogComponent {
  readonly dialogRef = inject(
    MatDialogRef<MassEditCategoryDialogComponent, MassEditCategoryDialogResult | undefined>
  );
  readonly data = inject<MassEditCategoryDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly categoryOptions = computed(() => this.data.getCategories());

  readonly form = this.fb.group({
    category_id: ['', Validators.required],
  });

  onCategorySearch(query: string): void {
    this.data.onCategorySearch(query);
  }

  onCancel(): void {
     this.dialogRef.close(undefined);
  }

  onCategorySelected(categoryId: string | null): void {
    this.form.controls.category_id.setValue(categoryId, { emitEvent: false });
  }

  onSave(): void {
    if (this.form.invalid) {
      return;
    }

    const category_id = this.form.value.category_id;
    if (!category_id) {
      return;
    }

    this.dialogRef.close({ category_id });
  }
}
