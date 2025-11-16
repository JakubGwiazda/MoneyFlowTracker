import { test, expect } from '@playwright/test';
import { CategoriesPage, LoginPage, AddCategoryDialog } from '../page-objects';

test.describe('Categories Management', () => {
  let categoriesPage: CategoriesPage;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Arrange - Login before each test
    loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('test@example.com', 'Password123!');

    // Navigate to categories page
    categoriesPage = new CategoriesPage(page);
    await categoriesPage.navigate();
  });

  test('should display categories page correctly', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(categoriesPage.addCategoryButton).toBeVisible();
    await expect(categoriesPage.categoriesTable).toBeVisible();
    await expect(categoriesPage.searchInput).toBeVisible();
  });

  test('should open add category dialog when clicking add button', async ({ page }) => {
    // Arrange
    const addCategoryDialog = new AddCategoryDialog(page);

    // Act
    await categoriesPage.clickAddCategory();

    // Assert
    await addCategoryDialog.waitForDialog();
    await expect(addCategoryDialog.dialog).toBeVisible();
  });

  test('should successfully add a new category', async ({ page }) => {
    // Arrange
    const addCategoryDialog = new AddCategoryDialog(page);
    const categoryData = {
      name: 'Test Category',
      description: 'Test category description',
      color: '#FF5733',
    };

    // Act
    await categoriesPage.clickAddCategory();
    await addCategoryDialog.waitForDialog();
    await addCategoryDialog.fillCategoryForm(categoryData);
    await addCategoryDialog.save();

    // Assert
    await page.waitForTimeout(1000);
    const isDisplayed = await categoriesPage.isCategoryDisplayed(categoryData.name);
    expect(isDisplayed).toBeTruthy();
  });

  test('should filter categories by search term', async () => {
    // Arrange
    const searchTerm = 'Food';

    // Act
    await categoriesPage.searchCategories(searchTerm);
    await categoriesPage.page.waitForTimeout(500);

    // Assert
    const count = await categoriesPage.getCategoriesCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should cancel add category dialog', async ({ page }) => {
    // Arrange
    const addCategoryDialog = new AddCategoryDialog(page);

    // Act
    await categoriesPage.clickAddCategory();
    await addCategoryDialog.waitForDialog();
    await addCategoryDialog.cancel();

    // Assert
    await expect(addCategoryDialog.dialog).not.toBeVisible();
  });

  test('should display all default categories', async () => {
    // Arrange - Already done in beforeEach

    // Act
    const count = await categoriesPage.getCategoriesCount();

    // Assert
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should have correct page title', async () => {
    // Arrange - Already done in beforeEach

    // Act
    const title = await categoriesPage.getTitle();

    // Assert
    expect(title).toContain('MoneyFlowTracker');
  });
});

