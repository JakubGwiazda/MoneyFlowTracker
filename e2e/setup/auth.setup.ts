import { test as setup, expect } from '@playwright/test';
import { login, TEST_USER } from '../helpers/auth.helper';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

/**
 * Authentication setup
 * Runs once before all tests to create an authenticated session
 * Saves the authentication state to a file for reuse in tests
 */
setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication for tests...');
  
  // Check if credentials are available
  if (!TEST_USER.email || !TEST_USER.password) {
    throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in .env.test file');
  }
  
  // Perform login
  const loginSuccess = await login(page, TEST_USER);
  
  if (!loginSuccess) {
    throw new Error('Authentication failed during setup. Check credentials in .env.test');
  }
  
  // Verify we're logged in
  await expect(page).toHaveURL(/.*\/app/);
  
  // Wait a bit to ensure session is fully established
  await page.waitForTimeout(1000);
  
  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });
  
  console.log('Authentication state saved successfully');
});

