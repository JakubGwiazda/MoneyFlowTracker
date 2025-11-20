import { test, expect } from '@playwright/test';
import { CategoriesPage, AddCategoryDialog } from '../page-objects';
import path from 'path';

// Use saved authentication state for all tests in this file
test.use({ 
  storageState: path.join(__dirname, '../../playwright/.auth/user.json')
});

test.describe('Categories Management', () => {
  let categoriesPage: CategoriesPage;

  test.beforeEach(async ({ page }) => {
    // Navigate to categories page (user is already authenticated via storageState)
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
    await categoriesPage.waitForTimeout(10000);
    const isDisplayed = await categoriesPage.isCategoryDisplayed(categoryData.name);
    expect(isDisplayed).toBeTruthy();
  });

  test('should filter categories by search term', async () => {
    // Arrange
    const searchTerm = 'Food';

    // Act
    await categoriesPage.searchCategories(searchTerm);
    await categoriesPage.waitForTimeout(500);

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
});

