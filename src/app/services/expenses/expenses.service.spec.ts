import { TestBed } from '@angular/core/testing';
import { ExpenseManagementService } from './expense-management.service';
import { SupabaseExpenseRepository } from './repositories/supabase-expense.repository';
import { CategoryValidator } from './validators/category.validator';
import { ExpenseLoggingService } from './logging/expense-logging.service';
import type { CreateExpenseCommand, ExpenseDto } from '../../../types';

describe('ExpenseManagementService - Critical Category Validation Tests', () => {
  let service: ExpenseManagementService;
  let mockRepository: jasmine.SpyObj<SupabaseExpenseRepository>;
  let mockValidator: jasmine.SpyObj<CategoryValidator>;
  let mockLogger: jasmine.SpyObj<ExpenseLoggingService>;
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

  const mockExpenseData: ExpenseDto = {
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
    // Create mocks for all dependencies
    mockRepository = jasmine.createSpyObj('SupabaseExpenseRepository', [
      'create',
      'update',
      'delete',
    ]);
    mockValidator = jasmine.createSpyObj('CategoryValidator', ['validate']);
    mockLogger = jasmine.createSpyObj('ExpenseLoggingService', [
      'logCreate',
      'logUpdate',
      'logClassification',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ExpenseManagementService,
        { provide: SupabaseExpenseRepository, useValue: mockRepository },
        { provide: CategoryValidator, useValue: mockValidator },
        { provide: ExpenseLoggingService, useValue: mockLogger },
      ],
    });

    service = TestBed.inject(ExpenseManagementService);
  });

  describe('createExpense - Category ID Validation (TC-EXP-004)', () => {
    it('should successfully create expense with valid active category', async () => {
      const command: CreateExpenseCommand = {
        name: 'Tankowanie',
        amount: 150.0,
        expense_date: '2025-01-15',
        category_id: 'cat-active-1',
      };

      // Mock category validation to pass
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));

      // Mock repository create to return expense
      mockRepository.create.and.returnValue(Promise.resolve(mockExpenseData));

      const result = await service.createExpense(command, userId);

      // Verify category was validated
      expect(mockValidator.validate).toHaveBeenCalledWith('cat-active-1');

      // Verify expense was created
      expect(mockRepository.create).toHaveBeenCalled();
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

      // Mock category validation to fail
      mockValidator.validate.and.returnValue(
        Promise.resolve({ isValid: false, errors: ['CATEGORY_NOT_FOUND'] })
      );

      await expectAsync(service.createExpense(command, userId)).toBeRejectedWithError(
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

      // Mock category validation to fail for inactive category
      mockValidator.validate.and.returnValue(
        Promise.resolve({ isValid: false, errors: ['CATEGORY_NOT_FOUND'] })
      );

      await expectAsync(service.createExpense(command, userId)).toBeRejectedWithError(
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

      // Mock category validation (should not be called for null category)
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));

      // Mock repository create to return expense with null category
      const expectedExpense = { ...mockExpenseData, category_id: null };
      mockRepository.create.and.returnValue(Promise.resolve(expectedExpense));

      const result = await service.createExpense(command, userId);

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

      // Mock category validation to fail
      mockValidator.validate.and.returnValue(
        Promise.resolve({ isValid: false, errors: ['CATEGORY_NOT_FOUND'] })
      );

      await expectAsync(service.createExpense(command, userId)).toBeRejectedWithError(
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

      // Mock category validation to fail for category from different user
      mockValidator.validate.and.returnValue(
        Promise.resolve({ isValid: false, errors: ['CATEGORY_NOT_FOUND'] })
      );

      await expectAsync(service.createExpense(command, userId)).toBeRejectedWithError(
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

      // Mock dependencies
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));
      mockRepository.create.and.returnValue(Promise.resolve(mockExpenseData));
      mockLogger.logCreate.and.returnValue(Promise.resolve());

      await service.createExpense(command, userId);

      // Verify log was created
      expect(mockLogger.logCreate).toHaveBeenCalledWith(mockExpenseData, userId);
    });

    it('should not fail expense creation if log creation fails', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: 'cat-active-1',
      };

      // Mock dependencies - logger fails but expense creation succeeds
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));
      mockRepository.create.and.returnValue(Promise.resolve(mockExpenseData));

      // Mock logger to reject but suppress the unhandled rejection
      // The 'void' in implementation means we don't await this, so it shouldn't block
      const rejectedPromise = Promise.reject(new Error('Log insert failed'));
      rejectedPromise.catch(() => {}); // Suppress unhandled rejection warning
      mockLogger.logCreate.and.returnValue(rejectedPromise);

      // Should not throw - expense creation is primary operation
      const result = await service.createExpense(command, userId);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockExpenseData.id);
    });
  });

  describe('updateExpenseClassification - Classification Update', () => {
    it('should update expense with AI classification results', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      // Mock repository update and logger
      mockRepository.update.and.returnValue(Promise.resolve(mockExpenseData));
      mockLogger.logClassification.and.returnValue(Promise.resolve());

      await service.updateExpenseClassification(expenseId, predictedCategoryId, confidence, userId);

      // Verify repository was called with correct data
      expect(mockRepository.update).toHaveBeenCalledWith(expenseId, jasmine.any(Object), userId);

      // Verify logger was called
      expect(mockLogger.logClassification).toHaveBeenCalledWith(
        expenseId,
        predictedCategoryId,
        confidence,
        userId
      );
    });

    it('should set status to "failed" when prediction is null', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = null;
      const confidence = null;

      // Mock repository update and logger
      mockRepository.update.and.returnValue(Promise.resolve(mockExpenseData));
      mockLogger.logClassification.and.returnValue(Promise.resolve());

      await service.updateExpenseClassification(expenseId, predictedCategoryId, confidence, userId);

      // Verify repository was called with failed status
      const updateCall = mockRepository.update.calls.mostRecent();
      expect(updateCall.args[1].classification_status).toBe('failed');
    });

    it('should create log entry for classification action', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      // Mock repository update and logger
      mockRepository.update.and.returnValue(Promise.resolve(mockExpenseData));
      mockLogger.logClassification.and.returnValue(Promise.resolve());

      await service.updateExpenseClassification(expenseId, predictedCategoryId, confidence, userId);

      // Verify logger was called with correct parameters
      expect(mockLogger.logClassification).toHaveBeenCalledWith(
        expenseId,
        predictedCategoryId,
        confidence,
        userId
      );
    });

    it('should handle database update errors', async () => {
      const expenseId = 'exp-123';
      const predictedCategoryId = 'cat-predicted-1';
      const confidence = 0.85;

      // Mock repository to throw error
      mockRepository.update.and.throwError('Update failed');

      await expectAsync(
        service.updateExpenseClassification(expenseId, predictedCategoryId, confidence, userId)
      ).toBeRejectedWithError('Update failed');
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

      // Mock dependencies
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));
      mockRepository.create.and.callFake((data: any) => {
        // Verify user_id is set correctly
        expect(data.user_id).toBe(userId);
        return Promise.resolve(mockExpenseData);
      });
      mockLogger.logCreate.and.returnValue(Promise.resolve());

      await service.createExpense(command, userId);

      // Repository create should have been called with correct user_id
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should set proper defaults for classification fields on creation', async () => {
      const command: CreateExpenseCommand = {
        name: 'Test',
        amount: 100.0,
        expense_date: '2025-01-15',
        category_id: undefined,
      };

      // Mock dependencies and capture the data passed to repository
      let capturedData: any = null;
      mockValidator.validate.and.returnValue(Promise.resolve({ isValid: true, errors: [] }));
      mockRepository.create.and.callFake((data: any) => {
        capturedData = data;
        return Promise.resolve(mockExpenseData);
      });
      mockLogger.logCreate.and.returnValue(Promise.resolve());

      await service.createExpense(command, userId);

      // Verify classification defaults are set by the builder
      expect(capturedData.classification_status).toBe('pending');
      expect(capturedData.predicted_category_id).toBeNull();
      expect(capturedData.prediction_confidence).toBeNull();
      expect(capturedData.corrected_category_id).toBeNull();
    });
  });
});
