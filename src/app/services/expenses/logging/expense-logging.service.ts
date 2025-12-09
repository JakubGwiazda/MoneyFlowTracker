import { Injectable } from '@angular/core';
import type { Database } from '../../../../db/database.types';
import type { ExpenseDto, UpdateExpenseCommand } from '../../../../types';
import { supabaseClient } from '../../../../db/supabase.client';

/**
 * Service for logging expense operations.
 * Handles audit trail creation for all expense-related actions.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseLoggingService {
  private readonly supabase = supabaseClient;

  /**
   * Logs expense creation
   */
  async logCreate(expense: ExpenseDto, userId: string): Promise<void> {
    const logPayload = {
      action: 'insert',
      expense_data: {
        name: expense.name,
        amount: expense.amount,
        expense_date: expense.expense_date,
        category_id: expense.category_id,
      },
      timestamp: new Date().toISOString(),
    };

    await this.createLogEntry(userId, expense.id, 'insert', logPayload);
  }

  /**
   * Logs expense update
   */
  async logUpdate(expenseId: string, changes: UpdateExpenseCommand, userId: string): Promise<void> {
    const logPayload = {
      action: 'update',
      changes,
      timestamp: new Date().toISOString(),
    };

    await this.createLogEntry(userId, expenseId, 'update', logPayload);
  }

  /**
   * Logs expense classification
   */
  async logClassification(
    expenseId: string,
    predictedCategoryId: string | null,
    confidence: number | null,
    userId: string
  ): Promise<void> {
    const status = predictedCategoryId ? 'predicted' : 'failed';

    const logPayload = {
      action: 'classify',
      classification_result: {
        predicted_category_id: predictedCategoryId,
        confidence,
        status,
      },
      timestamp: new Date().toISOString(),
    };

    await this.createLogEntry(userId, expenseId, 'classify', logPayload);
  }

  /**
   * Creates a log entry in the database
   */
  private async createLogEntry(
    userId: string,
    expenseId: string,
    logAction: 'insert' | 'update' | 'classify',
    payload: any
  ): Promise<void> {
    const { error } = await this.supabase.from('logs').insert({
      user_id: userId,
      expense_id: expenseId,
      log_action: logAction,
      payload,
    });

    if (error) {
      console.error('Failed to create log entry:', error);
      // Don't throw - logging is secondary to main operation
    }
  }
}
