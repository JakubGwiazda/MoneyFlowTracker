import { test, expect } from '@playwright/test';
import path from 'path';

// Use saved authentication state
test.use({ 
  storageState: path.join(__dirname, '../playwright/.auth/user.json')
});

test.describe('Authentication Verification', () => {
  test('should be authenticated and access protected page', async ({ page }) => {
    // Try to navigate to a protected page
    await page.goto('/expenses');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're NOT redirected to login
    expect(page.url()).not.toContain('/login');
    
    // Check if we can see protected content
    // This should work if authentication is successful
    console.log('Current URL:', page.url());
    console.log('Authentication test passed!');
  });

  test('should have access token in localStorage', async ({ page }) => {
    await page.goto('/expenses');
    
    // Check if auth token exists in localStorage
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('sb-auth-token');
    });
    
    expect(authToken).toBeTruthy();
    console.log('Auth token found in localStorage');
  });
});

