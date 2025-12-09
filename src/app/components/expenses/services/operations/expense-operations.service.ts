import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CreateExpenseCommand, UpdateExpenseCommand } from '../../../../../types';
import type { ExpenseDialogResult } from '../../expenses.models';
import { ExpensesApiService } from '../expenses-api.service';
import { resolveErrorMessage } from '../../expenses.utils';

/**
 * Service for expense CRUD operations.
 * Delegates to API service and handles error transformation.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseOperationsService {
  private readonly expensesApi = inject(ExpensesApiService);

  async createExpense(command: CreateExpenseCommand): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.createExpense(command));
      return 'created';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async updateExpense(
    expenseId: string,
    command: UpdateExpenseCommand
  ): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.updateExpense(expenseId, command));
      return 'updated';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async deleteExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.deleteExpense(expenseId));
      return 'deleted';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }

  async reclassifyExpense(expenseId: string): Promise<ExpenseDialogResult> {
    try {
      await firstValueFrom(this.expensesApi.reclassifyExpense(expenseId));
      return 'reclassified';
    } catch (error) {
      throw new Error(resolveErrorMessage(error));
    }
  }
}
