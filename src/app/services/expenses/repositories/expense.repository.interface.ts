import type { ExpenseDto } from '../../../../types';
import type { Database } from '../../../../db/database.types';

/**
 * Interface for expense repository operations.
 * Defines contract for data access layer.
 */
export interface IExpenseRepository {
  /**
   * Creates a new expense record
   */
  create(data: Database['public']['Tables']['expenses']['Insert']): Promise<ExpenseDto>;

  /**
   * Updates an existing expense record
   */
  update(
    id: string,
    data: Database['public']['Tables']['expenses']['Update'],
    userId: string
  ): Promise<ExpenseDto>;

  /**
   * Deletes an expense record
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Finds an expense by ID
   */
  findById(id: string, userId: string): Promise<ExpenseDto | null>;
}
