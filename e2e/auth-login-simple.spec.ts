import { test, expect } from '@playwright/test';
import { login, TEST_USER, isLoggedIn, fillLoginForm } from './helpers/auth.helper';

/**
 * Simplified login tests using helper functions
 * This test demonstrates the use of test helpers
 */

test.describe('Login - Simplified Tests', () => {
  test('should login successfully with helper function', async ({ page }) => {
    // Use helper to login
    const success = await login(page, TEST_USER);
    
    // Verify login was successful
    expect(success).toBe(true);
    expect(await isLoggedIn(page)).toBe(true);
  });

  test('should fail login with wrong password using helper', async ({ page }) => {
    // Try to login with wrong password
    const success = await login(page, {
      email: TEST_USER.email,
      password: 'WrongPassword123',
    });
    
    // Verify login failed
    expect(success).toBe(false);
    expect(await isLoggedIn(page)).toBe(false);
  });

  test('should show form validation errors', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.getByLabel('Email').click();
    await page.getByLabel('Hasło').click();
    await page.getByLabel('Email').click();
    
    // Check for validation error
    await expect(page.locator('text=Email jest wymagany')).toBeVisible();
  });
});


