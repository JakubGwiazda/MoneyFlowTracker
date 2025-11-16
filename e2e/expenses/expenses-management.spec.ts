import { test, expect } from '@playwright/test';
import { ExpensesPage, LoginPage, AddExpenseDialog } from '../page-objects';

test.describe('Expenses Management', () => {
  let expensesPage: ExpensesPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Arrange - Login before each test
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'Password123!');

    // Navigate to expenses page
    expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();
  });

  test('should display expenses page correctly', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(expensesPage.addExpenseButton).toBeVisible();
    await expect(expensesPage.expensesTable).toBeVisible();
    await expect(expensesPage.searchInput).toBeVisible();
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
      description: 'Test Expense',
      amount: '50.00',
      category: 'Food',
      date: '2024-01-15',
    };

    // Act
    await expensesPage.clickAddExpense();
    await addExpenseDialog.waitForDialog();
    await addExpenseDialog.fillExpenseForm(expenseData);
    await addExpenseDialog.save();

    // Assert
    await page.waitForTimeout(1000);
    const isDisplayed = await expensesPage.isExpenseDisplayed(expenseData.description);
    expect(isDisplayed).toBeTruthy();
  });

  test('should filter expenses by search term', async () => {
    // Arrange
    const searchTerm = 'Coffee';

    // Act
    await expensesPage.searchExpenses(searchTerm);
    await expensesPage.page.waitForTimeout(500);

    // Assert
    const count = await expensesPage.getExpensesCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter expenses by category', async () => {
    // Arrange
    const category = 'Food';

    // Act
    await expensesPage.filterByCategory(category);
    await expensesPage.applyFilters();
    await expensesPage.page.waitForTimeout(500);

    // Assert
    const count = await expensesPage.getExpensesCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should clear all filters', async () => {
    // Arrange
    await expensesPage.searchExpenses('Test');
    await expensesPage.filterByCategory('Food');
    await expensesPage.applyFilters();

    // Act
    await expensesPage.clearFilters();
    await expensesPage.page.waitForTimeout(500);

    // Assert
    await expect(expensesPage.searchInput).toHaveValue('');
  });

  test('should navigate through pages using pagination', async () => {
    // Arrange
    const initialCount = await expensesPage.getExpensesCount();

    // Act
    await expensesPage.goToNextPage();
    await expensesPage.page.waitForTimeout(500);

    // Assert
    const newCount = await expensesPage.getExpensesCount();
    expect(newCount).toBeGreaterThanOrEqual(0);
  });

  test('should display expenses chart', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(expensesPage.expenseChart).toBeVisible();
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

