import { z } from 'zod';

/**
 * Zod schema for validating CreateExpenseCommand input.
 * Validates the request body for POST /api/v1/expenses endpoint.
 */
export const createExpenseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),

  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(9999999999.99, 'Amount exceeds maximum allowed value'),

  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(date => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'Invalid date'),

  category_id: z.string().uuid('Category ID must be a valid UUID').optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
