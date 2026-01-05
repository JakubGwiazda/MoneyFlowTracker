import { Injectable } from '@angular/core';
import type { Database } from '../../../../db/database.types';
import type { ExpenseDto } from '../../../../types';
import { supabaseClient } from '../../../../db/supabase.client';
import { IExpenseRepository } from './expense.repository.interface';

/**
 * Supabase implementation of expense repository.
 * Handles all direct database operations for expenses.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseExpenseRepository implements IExpenseRepository {
  private readonly supabase = supabaseClient;

  async create(data: Database['public']['Tables']['expenses']['Insert']): Promise<ExpenseDto> {
    const { data: expense, error } = await this.supabase
      .from('expenses')
      .insert(data)
      .select()
      .single();

    if (error || !expense) {
      console.error('Failed to create expense:', error);
      throw new Error('EXPENSE_CREATE_FAILED');
    }

    return this.mapToDto(expense);
  }

  async update(
    id: string,
    data: Database['public']['Tables']['expenses']['Update'],
    userId: string
  ): Promise<ExpenseDto> {
    const { data: expense, error } = await this.supabase
      .from('expenses')
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !expense) {
      console.error('Failed to update expense:', error);
      throw new Error('EXPENSE_UPDATE_FAILED');
    }

    return this.mapToDto(expense);
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete expense:', error);
      throw new Error('EXPENSE_DELETE_FAILED');
    }
  }

  async massUpdateCategory(
    expenseIds: string[],
    categoryId: string,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('expenses')
      .update({
        category_id: categoryId,
        classification_status: 'corrected',
        corrected_category_id: categoryId,
      })
      .in('id', expenseIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to mass update expenses:', error);
      throw new Error('EXPENSE_MASS_UPDATE_FAILED');
    }
  }

  async findById(id: string, userId: string): Promise<ExpenseDto | null> {
    const { data: expense, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error('EXPENSE_FETCH_FAILED');
    }

    return expense ? this.mapToDto(expense) : null;
  }

  private mapToDto(expense: Database['public']['Tables']['expenses']['Row']): ExpenseDto {
    return {
      id: expense.id,
      user_id: expense.user_id,
      name: expense.name,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category_id: expense.category_id,
      predicted_category_id: expense.predicted_category_id,
      prediction_confidence: expense.prediction_confidence,
      classification_status: expense.classification_status,
      corrected_category_id: expense.corrected_category_id,
      created_at: expense.created_at,
      updated_at: expense.updated_at,
    };
  }
}
