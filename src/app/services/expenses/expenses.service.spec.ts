import { createExpense, updateExpenseClassification } from './expenses.service';
import { supabaseClient } from '../../../db/supabase.client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../db/database.types';
import type { CreateExpenseCommand, ExpenseDto } from '../../../types';

describe('ExpensesService - Critical Category Validation Tests', () => {
  let mockSupabase: jasmine.SpyObj<SupabaseClient<Database>>;
  const userId = 'user-123';

  const mockActiveCategory = {
    id: 'cat-active-1',
    name: 'Transport',
    is_active: true,
    parent_id: null,
    user_id: userId,
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockInactiveCategory = {
    id: 'cat-inactive-1',
    name: 'Old Category',
    is_active: false,
    parent_id: null,
    user_id: userId,
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockExpenseData = {
    id: 'exp-123',
    user_id: userId,
    name: 'Test Expense',
    amount: 100.0,
    expense_date: '2025-01-15',
    category_id: 'cat-active-1',
    classification_status: 'pending' as const,
    predicted_category_id: null,
    prediction_confidence: null,
    corrected_category_id: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    // Create a comprehensive mock for Supabase client
    mockSupabase = {
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            eq: jasmine.createSpy('eq').and.returnValue({
              single: jasmine
                .createSpy('single')
                .and.returnValue(Promise.resolve({ data: mockActiveCategory, error: null })),
            }),
            single: jasmine
              .createSpy('single')
              .and.returnValue(Promise.resolve({ data: mockActiveCategory, error: null })),
          }),
          single: jasmine
            .createSpy('single')
            .and.returnValue(Promise.resolve({ data: mockActiveCategory, error: null })),
        }),
        insert: jasmine.createSpy('insert').and.returnValue({
          select: jasmine.createSpy('select').and.returnValue({
            single: jasmine
              .createSpy('single')
              .and.returnValue(Promise.resolve({ data: mockExpenseData, error: null })),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: null, error: null })),
        }),
      }),
    } as any;
  });

  describe('createExpense - Category ID Validation (TC-EXP-004)', () => {
    it('should successfully create expense with valid active category', async () => {
      const command: CreateExpenseCommand = {
        name: 'Tankowanie',
        amount: 150.0,
        expense_date: '2025-01-15',
        category_id: 'cat-active-1',
      };

      // Mock category validation - return active category
      const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
      categorySelectSpy.eq.and.returnValue(categorySelectSpy);
      categorySelectSpy.single.and.returnValue(
        Promise.resolve({ data: mockActiveCategory, error: null })
      );

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          return {
            select: () => categorySelectSpy,
          };
        }
        if (table === 'expenses') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockExpenseData, error: null }),
              }),
            }),
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      const result = await createExpense(command, userId, mockSupabase);

      // Verify category was validated
      expect(fromSpy).toHaveBeenCalledWith('categories');
      expect(categorySelectSpy.eq).toHaveBeenCalledWith('id', 'cat-active-1');
      expect(categorySelectSpy.eq).toHaveBeenCalledWith('is_active', true);

      // Verify expense was created
      expect(result).toBeDefined();
      expect(result.category_id).toBe('cat-active-1');
      expect(result.name).toBe('Test Expense');
    });

    it('should verify category exists before creating expense', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 50.0,
        expense_date: '2025-01-15',
        category_id: 'non-existent-category',
      };

      // Mock category not found
      const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
      categorySelectSpy.eq.and.returnValue(categorySelectSpy);
      categorySelectSpy.single.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' } as any,
        })
      );

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          return {
            select: () => categorySelectSpy,
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await expectAsync(createExpense(command, userId, mockSupabase)).toBeRejectedWithError(
        'CATEGORY_NOT_FOUND'
      );
    });

    it('should reject inactive categories (soft delete validation)', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 50.0,
        expense_date: '2025-01-15',
        category_id: 'cat-inactive-1',
      };

      // Mock inactive category found
      const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
      categorySelectSpy.eq.and.returnValue(categorySelectSpy);
      categorySelectSpy.single.and.returnValue(
        Promise.resolve({
          data: null, // Query with is_active=true returns nothing
          error: null,
        })
      );

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          return {
            select: () => categorySelectSpy,
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await expectAsync(createExpense(command, userId, mockSupabase)).toBeRejectedWithError(
        'CATEGORY_NOT_FOUND'
      );
    });

    it('should allow NULL category_id (pending classification)', async () => {
      const command: CreateExpenseCommand = {
        name: 'Zakup książki',
        amount: 29.99,
        expense_date: '2025-01-15',
        category_id: undefined, // No category provided
      };

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            insert: (data: any) => {
              // Verify category_id is null
              expect(data.category_id).toBeNull();
              expect(data.classification_status).toBe('pending');

              return {
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: { ...mockExpenseData, category_id: null },
                      error: null,
                    }),
                }),
              };
            },
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      const result = await createExpense(command, userId, mockSupabase);

      // Verify expense created without category
      expect(result.category_id).toBeNull();
      expect(result.classification_status).toBe('pending');
    });

    it('should enforce foreign key constraint through validation', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: 'invalid-uuid-123',
      };

      // Mock category lookup failure
      const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
      categorySelectSpy.eq.and.returnValue(categorySelectSpy);
      categorySelectSpy.single.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Foreign key violation' } as any,
        })
      );

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          return {
            select: () => categorySelectSpy,
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await expectAsync(createExpense(command, userId, mockSupabase)).toBeRejectedWithError(
        'CATEGORY_NOT_FOUND'
      );
    });

    it('should validate category belongs to the user (RLS check)', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 50.0,
        expense_date: '2025-01-15',
        category_id: 'cat-other-user',
      };

      // Mock category from different user (RLS would block this)
      const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
      categorySelectSpy.eq.and.returnValue(categorySelectSpy);
      categorySelectSpy.single.and.returnValue(
        Promise.resolve({
          data: null, // RLS policy blocks access
          error: null,
        })
      );

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          return {
            select: () => categorySelectSpy,
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await expectAsync(createExpense(command, userId, mockSupabase)).toBeRejectedWithError(
        'CATEGORY_NOT_FOUND'
      );
    });
  });

  describe('createExpense - Log Creation', () => {
    it('should create log entry after successful expense creation', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test Expense',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: 'cat-active-1',
      };

      let logInsertCalled = false;
      let logData: any = null;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
          categorySelectSpy.eq.and.returnValue(categorySelectSpy);
          categorySelectSpy.single.and.returnValue(
            Promise.resolve({ data: mockActiveCategory, error: null })
          );
          return {
            select: () => categorySelectSpy,
          };
        }
        if (table === 'expenses') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockExpenseData, error: null }),
              }),
            }),
          };
        }
        if (table === 'logs') {
          return {
            insert: (data: any) => {
              logInsertCalled = true;
              logData = data;
              return Promise.resolve({ error: null });
            },
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await createExpense(command, userId, mockSupabase);

      // Verify log was created
      expect(logInsertCalled).toBe(true);
      expect(logData).toBeDefined();
      expect(logData.user_id).toBe(userId);
      expect(logData.expense_id).toBe(mockExpenseData.id);
      expect(logData.log_action).toBe('insert');
      expect(logData.payload).toBeDefined();
      expect(logData.payload.action).toBe('insert');
    });

    it('should not fail expense creation if log creation fails', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: 'cat-active-1',
      };

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'categories') {
          const categorySelectSpy = jasmine.createSpyObj('query', ['eq', 'single']);
          categorySelectSpy.eq.and.returnValue(categorySelectSpy);
          categorySelectSpy.single.and.returnValue(
            Promise.resolve({ data: mockActiveCategory, error: null })
          );
          return {
            select: () => categorySelectSpy,
          };
        }
        if (table === 'expenses') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: mockExpenseData, error: null }),
              }),
            }),
          };
        }
        if (table === 'logs') {
          return {
            insert: () =>
              Promise.resolve({
                error: { message: 'Log insert failed' } as any,
              }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      // Should not throw - expense creation is primary operation
      const result = await createExpense(command, userId, mockSupabase);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockExpenseData.id);
    });
  });

  describe('updateExpenseClassification - Classification Update', () => {
    it('should update expense with AI classification results', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      let updateData: any = null;
      let updateExpenseId: string = '';

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            update: (data: any) => {
              updateData = data;
              return {
                eq: (field: string, value: string) => {
                  if (field === 'id') {
                    updateExpenseId = value;
                  }
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await updateExpenseClassification(
        expenseId,
        predictedCategoryId,
        confidence,
        userId,
        mockSupabase
      );

      // Verify update data
      expect(updateData).toBeDefined();
      expect(updateData.predicted_category_id).toBe(predictedCategoryId);
      expect(updateData.prediction_confidence).toBe(confidence);
      expect(updateData.classification_status).toBe('predicted');
      expect(updateData.updated_at).toBeDefined();

      // Verify correct expense was updated
      expect(updateExpenseId).toEqual(expenseId);
    });

    it('should set status to "failed" when prediction is null', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = null;
      const confidence = null;

      let updateData: any = null;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            update: (data: any) => {
              updateData = data;
              return {
                eq: () => Promise.resolve({ error: null }),
              };
            },
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await updateExpenseClassification(
        expenseId,
        predictedCategoryId,
        confidence,
        userId,
        mockSupabase
      );

      expect(updateData.classification_status).toBe('failed');
    });

    it('should create log entry for classification action', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      let logData: any = null;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'logs') {
          return {
            insert: (data: any) => {
              logData = data;
              return Promise.resolve({ error: null });
            },
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await updateExpenseClassification(
        expenseId,
        predictedCategoryId,
        confidence,
        userId,
        mockSupabase
      );

      // Verify log entry
      expect(logData).toBeDefined();
      expect(logData.user_id).toBe(userId);
      expect(logData.expense_id).toBe(expenseId);
      expect(logData.log_action).toBe('classify');
      expect(logData.payload.action).toBe('classify');
      expect(logData.payload.classification_result.predicted_category_id).toBe(predictedCategoryId);
      expect(logData.payload.classification_result.confidence).toBe(confidence);
    });

    it('should handle database update errors', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            update: () => ({
              eq: () =>
                Promise.resolve({
                  error: { message: 'Update failed' } as any,
                }),
            }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await expectAsync(
        updateExpenseClassification(
          expenseId,
          predictedCategoryId,
          confidence,
          userId,
          mockSupabase
        )
      ).toBeRejectedWithError('CLASSIFICATION_UPDATE_FAILED');
    });
  });

  describe('Data Integrity', () => {
    it('should always use authenticated user ID, ignoring payload override', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: undefined,
      };

      let insertedData: any = null;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            insert: (data: any) => {
              insertedData = data;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: mockExpenseData, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await createExpense(command, userId, mockSupabase);

      // Verify user_id from JWT is used, not from payload
      expect(insertedData.user_id).toBe(userId);
    });

    it('should set proper defaults for classification fields on creation', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: undefined,
      };

      let insertedData: any = null;

      const fromSpy = jasmine.createSpy('from');
      fromSpy.and.callFake((table: string) => {
        if (table === 'expenses') {
          return {
            insert: (data: any) => {
              insertedData = data;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: mockExpenseData, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'logs') {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      });

      mockSupabase.from = fromSpy as any;

      await createExpense(command, userId, mockSupabase);

      // Verify classification defaults
      expect(insertedData.classification_status).toBe('pending');
      expect(insertedData.predicted_category_id).toBeNull();
      expect(insertedData.prediction_confidence).toBeNull();
      expect(insertedData.corrected_category_id).toBeNull();
    });
  });
});
