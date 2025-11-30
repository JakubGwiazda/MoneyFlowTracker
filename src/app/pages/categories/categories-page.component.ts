import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import type { CategoryListViewModel } from '../../../lib/models/categories';
import { CreateCategoryCommand } from 'src/types';
import {
  AddCategoryDialogComponent,
  AddCategoryDialogResult,
} from 'src/app/components/categories/dialogs/add-category-dialog.component';
import { CategoriesFacadeService } from 'src/app/components/categories/services/categories-facade.service';
import { CategoriesTableComponent } from 'src/app/components/categories/ui/categories-table.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from 'src/app/components/common/dialogs/confirm-dialog/confirm-dialog.component';
import { PaginationControlsComponent } from 'src/app/components/common/pagination-controls/pagination-controls.component';
import {
  ChipOption,
  ChipsComponent,
  ChipSelectionChange,
} from 'src/app/components/common/chips/chips.component';

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
    MatExpansionModule,
    CategoriesTableComponent,
    PaginationControlsComponent,
    ChipsComponent,
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories.scss',
})
export class CategoriesPageComponent implements OnInit {
  private readonly facade = inject(CategoriesFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusChipOptions: ChipOption<boolean | undefined>[] = [
    { id: 'all', value: undefined, label: 'Wszystkie' },
    { id: 'active', value: true, label: 'Aktywne' },
    { id: 'inactive', value: false, label: 'Nieaktywne' },
  ];

  readonly vm = this.facade.viewModel;

  searchQuery = '';
  activeFilter: boolean | undefined = true;
  choosenCategoriesStatus: boolean | undefined = true;

  readonly filtersExpanded = signal(true);

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

  onStatusSelectionChange(event: ChipSelectionChange<boolean | undefined | null>): void {
    const status = event.selected === null ? undefined : event.selected;
    this.facade.setFilters({ active: status });
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

    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Usuń kategorię',
          message: `Czy na pewno chcesz usunąć kategorię "${category.name}"? Tej operacji nie można cofnąć.`,
          confirmLabel: 'Usuń',
          confirmColor: 'warn',
        },
      }
    );

    dialogRef.afterClosed().subscribe(async confirmed => {
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

    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: `${newStatus ? 'Aktywuj' : 'Dezaktywuj'} kategorię`,
          message: `Czy na pewno chcesz ${action} kategorię "${category.name}"?${
            !newStatus ? ' Kategoria nie będzie widoczna podczas dodawania wydatków.' : ''
          }`,
          confirmLabel: newStatus ? 'Aktywuj' : 'Dezaktywuj',
          confirmColor: 'primary',
        },
      }
    );

    dialogRef.afterClosed().subscribe(async confirmed => {
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
        const message =
          error instanceof Error ? error.message : 'Nie udało się zmienić statusu kategorii.';
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

  onFiltersPanelExpandedChange(expanded: boolean): void {
    this.filtersExpanded.set(expanded);
  }

  private async openCategoryDialog(category?: CategoryListViewModel): Promise<void> {
    // Load all categories for parent selection
    await this.facade.loadAllCategories();

    const dialogRef = this.dialog.open<
      AddCategoryDialogComponent,
      unknown,
      AddCategoryDialogResult
    >(AddCategoryDialogComponent, {
      width: '500px',
      data: {
        category,
        parentCategories: this.facade.allCategories(),
      },
    });

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
