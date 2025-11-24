import { test, expect } from '@playwright/test';
import { ExpensesPage, AddExpenseDialog } from '../page-objects';
import path from 'path';

// Use saved authentication state for all tests in this file
test.use({
  storageState: path.join(__dirname, '../../playwright/.auth/user.json'),
});

test.describe('Expenses Management', () => {
  let expensesPage: ExpensesPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to expenses page (user is already authenticated via storageState)
    expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();
  });

  test('should display expenses page correctly', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(expensesPage.addExpenseButton).toBeVisible();
    await expect(expensesPage.expensesTable).toBeVisible();
  });

  test('should open add expense dialog when clicking add button', async ({ page }) => {
    // Arrange
    const addExpenseDialog = new AddExpenseDialog(page);

    // Act
    await expensesPage.clickAddExpense();

    // Assert
    await addExpenseDialog.waitForDialog();
    await expect(addExpenseDialog.dialog).toBeVisible();
  });

  test('should successfully add a new expense', async ({ page }) => {
    // Arrange
    const addExpenseDialog = new AddExpenseDialog(page);
    const expenseData = {
      description: 'Bułka',
      amount: '50.00',
      category: 'Food',
      date: '2024-01-15',
    };

    // Act
    await expensesPage.clickAddExpense();
    await addExpenseDialog.waitForDialog();
    await addExpenseDialog.fillExpenseForm(expenseData);
    await addExpenseDialog.save();
    await addExpenseDialog.waitForClassificationInProgressToDisappear();

    // Assert
    await expensesPage.waitForExpenseAddedSnackbar();
  });

  test('should cancel add expense dialog', async ({ page }) => {
    // Arrange
    const addExpenseDialog = new AddExpenseDialog(page);

    // Act
    await expensesPage.clickAddExpense();
    await addExpenseDialog.waitForDialog();
    await addExpenseDialog.cancel();

    // Assert
    await expect(addExpenseDialog.dialog).not.toBeVisible();
  });
});
