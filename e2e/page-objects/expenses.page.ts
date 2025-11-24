import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Expenses page
 */
export class ExpensesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get addExpenseButton() {
    return this.getByTestId('add-expense-button');
  }

  get expensesListTab() {
    return this.getByTestId('expenses-list-tab');
  }

  get expensesTable() {
    return this.getByTestId('expenses-table');
  }

  get categoryFilter() {
    return this.getByTestId('expenses-category-filter');
  }

  get dateFromFilter() {
    return this.getByTestId('expenses-date-from-filter');
  }

  get dateToFilter() {
    return this.getByTestId('expenses-date-to-filter');
  }

  get applyFiltersButton() {
    return this.getByTestId('expenses-apply-filters-button');
  }

  get clearFiltersButton() {
    return this.getByTestId('expenses-clear-filters-button');
  }

  get paginationNextButton() {
    return this.getByTestId('pagination-next-button');
  }

  get paginationPreviousButton() {
    return this.getByTestId('pagination-previous-button');
  }

  get expenseChart() {
    return this.getByTestId('expenses-chart');
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto('/app');
    await this.waitForPageLoad();
    await this.page.getByRole('tab', { name: 'Lista wydatków' }).click();
  }

  async clickAddExpense(): Promise<void> {
    await this.addExpenseButton.click();
  }

  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.click();
    await this.page.getByRole('option', { name: category }).click();
  }

  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async goToNextPage(): Promise<void> {
    await this.paginationNextButton.click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.paginationPreviousButton.click();
  }

  async getExpenseRowByDescription(description: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${description}")`);
  }

  async editExpense(description: string): Promise<void> {
    const row = await this.getExpenseRowByDescription(description);
    await row.getByTestId('expense-edit-button').click();
  }

  async deleteExpense(description: string): Promise<void> {
    const row = await this.getExpenseRowByDescription(description);
    await row.getByTestId('expense-delete-button').click();
  }

  async getExpensesCount(): Promise<number> {
    const rows = await this.expensesTable.locator('tbody tr').count();
    return rows;
  }

  async isExpenseDisplayed(description: string): Promise<boolean> {
    const row = await this.getExpenseRowByDescription(description);
    return await row.isVisible();
  }

  async waitForExpenseAddedSnackbar(): Promise<void> {
    await this.page
      .locator('.mat-mdc-snack-bar-container')
      .filter({ hasText: 'Dodano 1 wydatek i sklasyfikowano.' })
      .waitFor({ state: 'visible' });
  }
}
