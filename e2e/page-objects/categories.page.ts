import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Categories page
 */
export class CategoriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get addCategoryButton() {
    return this.getByTestId('add-category-button');
  }

  get categoriesTable() {
    return this.getByTestId('categories-table');
  }

  get searchInput() {
    return this.getByTestId('categories-search-input');
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto('/categories');
    await this.waitForPageLoad();
  }

  async clickAddCategory(): Promise<void> {
    await this.addCategoryButton.click();
  }

  async searchCategories(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
  }

  async getCategoryRowByName(name: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${name}")`);
  }

  async editCategory(name: string): Promise<void> {
    const row = await this.getCategoryRowByName(name);
    await row.getByTestId('category-edit-button').click();
  }

  async deleteCategory(name: string): Promise<void> {
    const row = await this.getCategoryRowByName(name);
    await row.getByTestId('category-delete-button').click();
  }

  async getCategoriesCount(): Promise<number> {
    const rows = await this.categoriesTable.locator('tbody tr').count();
    return rows;
  }

  async isCategoryDisplayed(name: string): Promise<boolean> {
    const row = await this.getCategoryRowByName(name);
    return await row.isVisible();
  }
}

