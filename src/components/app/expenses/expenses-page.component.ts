import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

import { ExpensesFacadeService } from './expenses-facade.service';
import { ExpensesToolbarComponent } from './expenses-toolbar.component';
import { ExpensesTableComponent } from './expenses-table.component';
import { PaginationControlsComponent } from './pagination-controls.component';
import type { ExpensesFilterState, SortState } from '../../../lib/models/expenses';
import { AddExpenseDialogComponent, type AddExpenseDialogResult } from './dialogs/add-expense-dialog.component';
import { EditExpenseCategoryDialogComponent } from './dialogs/edit-expense-category-dialog.component';
import { ConfirmDialogComponent, type ConfirmDialogData } from './dialogs/confirm-dialog.component';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
    ExpensesToolbarComponent,
    ExpensesTableComponent,
    PaginationControlsComponent,
  ],
  template: `
    <section class="flex flex-col gap-6">
      <header class="space-y-1">
        <h1 class="text-2xl font-semibold text-gray-900">Lista wydatków</h1>
        <p class="text-sm text-gray-600">
          Zarządzaj wydatkami, filtruj według daty i statusu klasyfikacji, a także dodawaj nowe pozycje.
        </p>
      </header>

      <app-expenses-toolbar
        [value]="vm().filters"
        [loading]="vm().loading"
        [categories]="categoryOptions()"
        (filterChange)="onFilterChange($event)"
        (addExpenseClick)="onAddExpense()"
        (categorySearch)="onCategorySearch($event)"
      />

      <section class="rounded-lg border border-gray-200 bg-white">
        <app-expenses-table
          [data]="vm().expenses"
          [loading]="vm().loading"
          [sortState]="vm().sort"
          (sortChange)="onSortChange($event)"
          (editExpense)="onEditExpense($event)"
          (editCategory)="onEditCategory($event)"
          (reclassifyExpense)="onReclassifyExpense($event)"
          (deleteExpense)="onDeleteExpense($event)"
        />
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-4">
        <app-pagination-controls
          [state]="vm().pagination"
          [disabled]="vm().loading"
          (pageChange)="onPageChange($event)"
          (perPageChange)="onPerPageChange($event)"
        />
      </section>
    </section>
  `,
})
export class ExpensesPageComponent {
  private readonly facade = inject(ExpensesFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly vm = this.facade.viewModel;
  readonly categoryOptions = this.facade.categoryOptions;

  private readonly expenseLookup = computed(() => {
    const vm = this.vm();
    const map = new Map<string, (typeof vm.expenses)[number]>();
    for (const expense of vm.expenses) {
      map.set(expense.id, expense);
    }
    return map;
  });

  onFilterChange(patch: Partial<ExpensesFilterState>): void {
    this.facade.setFilters(patch);
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
    void this.openExpenseDialog(expenseId);
  }

  onEditCategory(expenseId: string): void {
    const expense = this.expenseLookup().get(expenseId);
    if (!expense) {
      return;
    }

    void this.facade.loadCategories('');

    const dialogRef = this.dialog.open(EditExpenseCategoryDialogComponent, {
      width: '420px',
      data: {
        expense,
        getCategories: () => this.categoryOptions(),
        onCategorySearch: (query: string) => this.facade.loadCategories(query),
      },
    });

    dialogRef.afterClosed().subscribe(async (categoryId: string | null | undefined) => {
      if (categoryId === undefined) {
        return;
      }

      try {
        await this.facade.updateExpense(expenseId, {
          name: expense.name,
          amount: expense.amount,
          expense_date: expense.expense_date,
          category_id: categoryId,
        });
        this.snackBar.open('Kategoria została zaktualizowana.', 'Zamknij', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Nie udało się zaktualizować kategorii.', 'Zamknij', { duration: 3000 });
      }
    });
  }

  onReclassifyExpense(expenseId: string): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Czy na pewno chcesz zlecić ponowną klasyfikację?',
        message: 'Wydatki w statusie oczekującym zostaną wysłane do usługi klasyfikacji AI.',
        confirmLabel: 'Reklasyfikuj',
        confirmColor: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (!confirmed) {
        return;
      }

      try {
        await this.facade.reclassifyExpense(expenseId);
        this.snackBar.open('Rozpoczęto klasyfikację wydatku.', 'Zamknij', { duration: 3000 });
      } catch (error) {
        console.error(error);
        this.snackBar.open('Nie udało się zainicjować klasyfikacji.', 'Zamknij', { duration: 3000 });
      }
    });
  }

  onDeleteExpense(expenseId: string): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Usuń wydatek',
        message: 'Czy na pewno chcesz trwale usunąć ten wydatek? Tej operacji nie można cofnąć.',
        confirmLabel: 'Usuń',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
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

  private async openExpenseDialog(expenseId?: string): Promise<void> {
    if (this.categoryOptions().length === 0) {
      await this.facade.loadCategories('');
    }

    const expense = expenseId ? this.expenseLookup().get(expenseId) : undefined;

    const dialogRef = this.dialog.open<AddExpenseDialogComponent, unknown, AddExpenseDialogResult>(AddExpenseDialogComponent, {
      width: '520px',
      data: {
        getCategories: () => this.categoryOptions(),
        expense,
        onCategorySearch: (query: string) => this.facade.loadCategories(query),
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) {
      return;
    }

    try {
      if (expense) {
        await this.facade.updateExpense(expense.id, result.command);
        this.snackBar.open('Wydatek został zaktualizowany.', 'Zamknij', { duration: 3000 });
      } else {
        await this.facade.createExpense(result.command);
        this.snackBar.open('Wydatek został dodany.', 'Zamknij', { duration: 3000 });

        if (result.mode === 'add-another') {
          void this.openExpenseDialog();
        }
      }
    } catch (error) {
      console.error(error);
      this.snackBar.open('Operacja nie powiodła się.', 'Zamknij', { duration: 3000 });
    }
  }
}

