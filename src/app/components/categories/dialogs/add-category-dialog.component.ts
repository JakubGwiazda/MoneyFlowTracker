import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDto } from '../../../../types';
import type { CategoryOptionViewModel } from '../../../models/categories';

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
    MatIconModule,
  ],
  templateUrl: './add-category-dialog.html',
  styleUrl: './add-category-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCategoryDialogComponent implements OnInit {
  readonly dialogRef = inject(
    MatDialogRef<AddCategoryDialogComponent, AddCategoryDialogResult | undefined>
  );
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
      name: [category?.name || '', [Validators.required, Validators.maxLength(100)]],
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
