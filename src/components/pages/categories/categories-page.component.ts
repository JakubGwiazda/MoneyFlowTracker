import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { CategoriesFacadeService } from '../../app/categories/services/categories-facade.service';
import { CategoriesTableComponent } from '../../app/categories/ui/categories-table.component';
import { PaginationControlsComponent } from '../../app/common/pagination-controls.component';
import { AddCategoryDialogComponent, type AddCategoryDialogResult } from '../../app/categories/dialogs/add-category-dialog.component';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../app/expenses/dialogs/confirm-dialog.component';
import type { CategoryListViewModel } from '../../../lib/models/categories';
import { CreateCategoryCommand } from 'src/types';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    CategoriesTableComponent,
    PaginationControlsComponent,
  ],
  template: `
    <div class="categories-page-container">
      <header class="page-header">
        <div class="header-content">
          <div>
            <h2 class="page-title">Zarządzanie kategoriami</h2>
            <p class="page-description">
              Twórz i organizuj kategorie do klasyfikacji wydatków
            </p>
          </div>
          <button 
            mat-raised-button 
            color="primary"
            (click)="onAddCategory()"
            data-testid="add-category-button"
          >
            <mat-icon>add</mat-icon>
            Dodaj kategorię
          </button>
        </div>
      </header>

      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-container">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Szukaj kategorii</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
                placeholder="Wpisz nazwę kategorii..."
                data-testid="categories-search-input"
              />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select 
                [(ngModel)]="activeFilter"
                (ngModelChange)="onActiveFilterChange($event)"
              >
                <mat-option [value]="undefined">Wszystkie</mat-option>
                <mat-option [value]="true">Aktywne</mat-option>
                <mat-option [value]="false">Nieaktywne</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="table-container">
        <app-categories-table
          [data]="vm().categories"
          [loading]="vm().loading"
          (editCategory)="onEditCategory($event)"
          (deleteCategory)="onDeleteCategory($event)"
          (toggleActive)="onToggleActive($event)"
        />
      </div>

      @if (vm().categories.length > 0) {
        <div class="pagination-container">
          <app-pagination-controls
            [state]="vm().pagination"
            [disabled]="vm().loading"
            (pageChange)="onPageChange($event)"
            (perPageChange)="onPerPageChange($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .categories-page-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      padding: 1rem;
      gap: 1rem;
    }

    .page-header {
      flex-shrink: 0;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .page-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.87);
    }

    .page-description {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .filters-card {
      flex-shrink: 0;
    }

    .filters-container {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .search-field {
      flex: 1;
      min-width: 300px;
    }

    .filter-field {
      width: 200px;
    }

    .table-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .pagination-container {
      flex-shrink: 0;
    }
  `],
})
export class CategoriesPageComponent implements OnInit {
  private readonly facade = inject(CategoriesFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly vm = this.facade.viewModel;

  searchQuery = '';
  activeFilter: boolean | undefined = true;

  private readonly categoryLookup = computed(() => {
    const vm = this.vm();
    const map = new Map<string, CategoryListViewModel>();
    for (const category of vm.categories) {
      map.set(category.id, category);
    }
    return map;
  });

  ngOnInit(): void {
    void this.facade.refresh();
  }

  onSearchChange(query: string): void {
    this.facade.setFilters({ search: query });
  }

  onActiveFilterChange(active: boolean | undefined): void {
    this.facade.setFilters({ active });
  }

  onAddCategory(): void {
    void this.openCategoryDialog();
  }

  onEditCategory(categoryId: string): void {
    const category = this.categoryLookup().get(categoryId);
    if (!category) {
      return;
    }

    void this.openCategoryDialog(category);
  }

  onDeleteCategory(categoryId: string): void {
    const category = this.categoryLookup().get(categoryId);
    if (!category) {
      return;
    }

    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Usuń kategorię',
        message: `Czy na pewno chcesz usunąć kategorię "${category.name}"? Tej operacji nie można cofnąć.`,
        confirmLabel: 'Usuń',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) {
        return;
      }

      try {
        await this.facade.deleteCategory(categoryId);
        this.snackBar.open('Kategoria została usunięta.', 'Zamknij', { duration: 3000 });
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Nie udało się usunąć kategorii.';
        this.snackBar.open(message, 'Zamknij', { duration: 5000 });
      }
    });
  }

  onToggleActive(categoryId: string): void {
    const category = this.categoryLookup().get(categoryId);
    if (!category) {
      return;
    }

    const newStatus = !category.is_active;
    const action = newStatus ? 'aktywować' : 'dezaktywować';

    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `${newStatus ? 'Aktywuj' : 'Dezaktywuj'} kategorię`,
        message: `Czy na pewno chcesz ${action} kategorię "${category.name}"?${
          !newStatus ? ' Kategoria nie będzie widoczna podczas dodawania wydatków.' : ''
        }`,
        confirmLabel: newStatus ? 'Aktywuj' : 'Dezaktywuj',
        confirmColor: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) {
        return;
      }

      try {
        await this.facade.updateCategory(categoryId, { is_active: newStatus });
        this.snackBar.open(
          `Kategoria została ${newStatus ? 'aktywowana' : 'dezaktywowana'}.`,
          'Zamknij',
          { duration: 3000 }
        );
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Nie udało się zmienić statusu kategorii.';
        this.snackBar.open(message, 'Zamknij', { duration: 5000 });
      }
    });
  }

  onPageChange(page: number): void {
    this.facade.setPage(page);
  }

  onPerPageChange(perPage: number): void {
    this.facade.setPerPage(perPage);
  }

  private async openCategoryDialog(category?: CategoryListViewModel): Promise<void> {
    // Load all categories for parent selection
    await this.facade.loadAllCategories();

    const dialogRef = this.dialog.open<AddCategoryDialogComponent, unknown, AddCategoryDialogResult>(
      AddCategoryDialogComponent,
      {
        width: '500px',
        data: {
          category,
          parentCategories: this.facade.allCategories(),
        },
      }
    );

    const result = await dialogRef.afterClosed().toPromise();
    if (!result) {
      return;
    }

    try {
      if (result.isUpdate && category) {
        await this.facade.updateCategory(category.id, result.command);
        this.snackBar.open('Kategoria została zaktualizowana.', 'Zamknij', { duration: 3000 });
      } else {
        await this.facade.createCategory(result.command as CreateCategoryCommand);
        this.snackBar.open('Kategoria została dodana.', 'Zamknij', { duration: 3000 });
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Operacja nie powiodła się.';
      this.snackBar.open(message, 'Zamknij', { duration: 5000 });
    }
  }
}

