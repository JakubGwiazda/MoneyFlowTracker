import { test, expect } from '@playwright/test';

/**
 * Example test suite demonstrating Playwright basics
 * This can be removed once you have your own tests set up
 */
test.describe('Example Tests', () => {
  test('should load the home page', async ({ page }) => {
    // Arrange
    const url = '/';

    // Act
    await page.goto(url);

    // Assert
    await expect(page).toHaveURL(/.*localhost/);
    await expect(page).toHaveTitle(/MoneyFlowTracker/);
  });

  test('should take a screenshot', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act
    await page.waitForLoadState('networkidle');

    // Assert
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

