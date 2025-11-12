import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { firstValueFrom } from 'rxjs';
import { ExpensesFacadeService } from '../../app/expenses/services/expenses-facade.service';
import { ExpensesFilterComponent } from '../../app/expenses/ui/expenses-filters.component';
import { ExpensesTableComponent } from '../../app/expenses/ui/expenses-table.component';
import { ExpensesChartsComponent } from '../../app/expenses/ui/expenses-charts.component';
import { PaginationControlsComponent } from '../../app/common/pagination-controls.component';
import { CategoriesPageComponent } from '../categories/categories-page.component';
import type { ExpensesFilterState, SortState } from '../../../lib/models/expenses';
import { AddExpenseDialogComponent, type AddExpenseDialogResult } from '../../app/expenses/dialogs/add-expense-dialog.component';
import { EditExpenseDialogComponent } from '../../app/expenses/dialogs/edit-expense-dialog.component';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../../app/expenses/dialogs/confirm-dialog.component';
import { ClassificationStatus } from 'src/types';

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
    ExpensesFilterComponent,
    ExpensesTableComponent,
    ExpensesChartsComponent,
    PaginationControlsComponent,
    CategoriesPageComponent,
  ],
  templateUrl: './expenses-page.component.html',
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .expenses-page-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .page-header {
        flex-shrink: 0;
        margin-bottom: 1rem;
      }
      
      .tab_group {
        width: 90%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
      }
      
      .tab_group ::ng-deep .mat-mdc-tab-body-wrapper {
        flex: 1;
        overflow: hidden;
      }
      
      .tab_group ::ng-deep .mat-mdc-tab-body-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .tab-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      
      .filters-card {
        flex-shrink: 0;
        margin-bottom: 1rem;
      }
      
      .filters-expansion-panel {
        box-shadow: none;
        border: 1px solid #e0e0e0;
      }
      
      .filters-expansion-panel .mat-expansion-panel-header {
        padding: 0 16px;
        height: 56px;
      }
      
      .filters-expansion-panel .mat-expansion-panel-body {
        padding: 16px;
      }
      
      .table-container {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      
      .pagination-container {
        flex-shrink: 0;
        margin-top: 1rem;
      }
    `,
  ],
})
export class ExpensesPageComponent implements OnInit{

  private readonly facade = inject(ExpensesFacadeService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly vm = this.facade.viewModel;
  readonly categoryOptions = this.facade.categoryOptions;
  readonly chartData = this.facade.expensesByCategory;

  private readonly expenseLookup = computed(() => {
    const vm = this.vm();
    const map = new Map<string, (typeof vm.expenses)[number]>();
    for (const expense of vm.expenses) {
      map.set(expense.id, expense);
    }
    return map;
  });

  ngOnInit(): void {
    void this.facade.loadCategories();
  }

  onFilterChange(patch: Partial<ExpensesFilterState>): void {
    this.facade.setFilters(patch);
  }

  onChartDateFilterChange(change: { preset: string; date_from?: string; date_to?: string }): void {
    this.facade.setFilters({
      preset: change.preset as any,
      date_from: change.date_from,
      date_to: change.date_to,
      page: 1
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

    dialogRef.afterClosed().subscribe(async (result: { name: string; amount: number; expense_date: string; category_id: string; classification_status: ClassificationStatus } | undefined) => {
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
        this.snackBar.open('Nie udało się zaktualizować kategorii.', 'Zamknij', { duration: 3000 });
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
    // Edycja pojedynczego wydatku nie jest obecnie obsługiwana w nowym flow
    // if (expenseId) {
    //   this.snackBar.open('Edycja wydatków jest dostępna przez tabelę.', 'Zamknij', { duration: 3000 });
    //   return;
    // }

    const dialogRef = this.dialog.open<AddExpenseDialogComponent, unknown, AddExpenseDialogResult>(AddExpenseDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
    });

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

