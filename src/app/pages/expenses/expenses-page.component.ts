import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { firstValueFrom } from 'rxjs';
import type { ExpensesFilterState, SortState } from '../../models/expenses';
import { ClassificationStatus } from 'src/types';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from 'src/app/components/common/dialogs/confirm-dialog/confirm-dialog.component';
import { PaginationControlsComponent } from 'src/app/components/common/pagination-controls/pagination-controls.component';
import {
  AddExpenseDialogComponent,
  AddExpenseDialogResult,
} from 'src/app/components/expenses/dialogs/add-expense/add-expense-dialog.component';
import { EditExpenseDialogComponent } from 'src/app/components/expenses/dialogs/edit-expense/edit-expense-dialog.component';
import {
  MassEditCategoryDialogComponent,
  type MassEditCategoryDialogData,
  type MassEditCategoryDialogResult,
} from 'src/app/components/expenses/dialogs/mass-edit-category/mass-edit-category-dialog.component';
import { ExpensesFacadeService } from 'src/app/components/expenses/services/expenses-facade.service';
import { ExpensesFilterComponent } from 'src/app/components/expenses/ui/expenses-filters.component';
import { ExpensesTableComponent } from 'src/app/components/expenses/ui/expenses-table.component';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTabsModule,
    MatCardModule,
    MatExpansionModule,
    MatButtonModule,
    ExpensesFilterComponent,
    ExpensesTableComponent,
    PaginationControlsComponent,
    MatIcon,
  ],
  templateUrl: './expenses-page.component.html',
  styleUrl: './expenses-page.scss',
})
export class ExpensesPageComponent implements OnInit {
  private readonly facade = inject(ExpensesFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly vm = this.facade.viewModel;
  readonly categoryOptions = this.facade.categoryOptions;
  readonly chartData = this.facade.expensesByCategory;

  readonly filtersExpanded = signal(false);
  protected readonly summaryAmount = computed(() => this.facade.summaryAmount());
  readonly selectedExpenseIds = signal<string[]>([]);
  readonly hasSelection = computed(() => this.selectedExpenseIds().length > 0);

  private readonly expenseLookup = computed(() => {
    const vm = this.vm();
    const map = new Map<string, (typeof vm.expenses)[number]>();
    for (const expense of vm.expenses) {
      map.set(expense.id, expense);
    }
    return map;
  });

  async ngOnInit(): Promise<void> {
    await this.facade.loadCategories();
  }

  onFilterChange(patch: Partial<ExpensesFilterState>): void {
    this.facade.setFilters(patch);
  }

  onChartDateFilterChange(change: { preset: string; date_from?: string; date_to?: string }): void {
    this.facade.setFilters({
      preset: change.preset as any,
      date_from: change.date_from,
      date_to: change.date_to,
      page: 1,
    });
  }

  onAddExpense(): void {
    void this.openExpenseDialog();
  }

  onCategorySearch(query: string): void {
    void this.facade.loadCategories(query);
  }

  onSortChange(sort: SortState | null): void {
    this.facade.setSort(sort);
  }

  onEditExpense(expenseId: string): void {
    const expense = this.expenseLookup().get(expenseId);
    if (!expense) {
      return;
    }

    void this.facade.loadCategories('');

    const dialogRef = this.dialog.open(EditExpenseDialogComponent, {
      width: '420px',
      data: {
        expense,
        getCategories: () => this.categoryOptions(),
        onCategorySearch: (query: string) => this.facade.loadCategories(query),
      },
    });

    dialogRef.afterClosed().subscribe(
      async (
        result:
          | {
              name: string;
              amount: number;
              expense_date: string;
              category_id: string;
              classification_status: ClassificationStatus;
            }
          | undefined
      ) => {
        if (result === undefined) {
          return;
        }

        try {
          await this.facade.updateExpense(expenseId, {
            name: result.name,
            amount: result.amount,
            expense_date: result.expense_date,
            category_id: result.category_id,
            classification_status: result.classification_status,
          });
          this.snackBar.open('Pozycja została zaktualizowana.', 'Zamknij', { duration: 3000 });
        } catch (error) {
          console.error(error);
          this.snackBar.open('Nie udało się zaktualizować kategorii.', 'Zamknij', {
            duration: 3000,
          });
        }
      }
    );
  }

  onDeleteExpense(expenseId: string): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '360px',
        data: {
          title: 'Usuń wydatek',
          message: 'Czy na pewno chcesz trwale usunąć ten wydatek? Tej operacji nie można cofnąć.',
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
        await this.facade.deleteExpense(expenseId);
        this.snackBar.open('Wydatek został usunięty.', 'Zamknij', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Nie udało się usunąć wydatku.', 'Zamknij', { duration: 3000 });
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

  onSelectionChange(selectedIds: string[]): void {
    this.selectedExpenseIds.set(selectedIds);
  }

  onMassEditCategory(): void {
    const selectedIds = this.selectedExpenseIds();
    if (selectedIds.length === 0) {
      return;
    }

    void this.facade.loadCategories('');

    const dialogRef = this.dialog.open<
      MassEditCategoryDialogComponent,
      MassEditCategoryDialogData,
      MassEditCategoryDialogResult
    >(MassEditCategoryDialogComponent, {
      width: '420px',
      data: {
        expenseIds: selectedIds,
        expenseCount: selectedIds.length,
        getCategories: () => this.categoryOptions(),
        onCategorySearch: (query: string) => this.facade.loadCategories(query),
      },
    });

    dialogRef.afterClosed().subscribe(async (result: MassEditCategoryDialogResult | undefined) => {
      if (result === undefined) {
        return;
      }

      try {
        await this.facade.massUpdateCategory(selectedIds, result.category_id);
        this.snackBar.open(
          `Zaktualizowano kategorię dla ${selectedIds.length} wydatków.`,
          'Zamknij',
          { duration: 3000 }
        );
        this.selectedExpenseIds.set([]);
      } catch (error) {
        console.error(error);
        this.snackBar.open('Nie udało się zaktualizować kategorii.', 'Zamknij', {
          duration: 3000,
        });
      }
    });
  }

  private async openExpenseDialog(expenseId?: string): Promise<void> {
    // Edycja pojedynczego wydatku nie jest obecnie obsługiwana w nowym flow
    // if (expenseId) {
    //   this.snackBar.open('Edycja wydatków jest dostępna przez tabelę.', 'Zamknij', { duration: 3000 });
    //   return;
    // }

    const dialogRef = this.dialog.open<AddExpenseDialogComponent, unknown, AddExpenseDialogResult>(
      AddExpenseDialogComponent,
      {
        width: '800px',
        maxHeight: '70vh',
        disableClose: true,
      }
    );

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result || result.expenses.length === 0) {
      return;
    }

    try {
      // Dialog już obsługuje klasyfikację i zapis, więc tutaj tylko pokazujemy komunikat
      const count = result.expenses.length;
      this.snackBar.open(
        `Dodano ${count} ${count === 1 ? 'wydatek' : count < 5 ? 'wydatki' : 'wydatków'} i sklasyfikowano.`,
        'Zamknij',
        { duration: 3000 }
      );
    } catch (error) {
      console.error(error);
      this.snackBar.open('Operacja nie powiodła się.', 'Zamknij', { duration: 3000 });
    }
  }
}
