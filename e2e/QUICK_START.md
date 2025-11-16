# E2E Testing Quick Start Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application
```bash
npm start
```

### 3. Run Tests (in another terminal)
```bash
npm run test:e2e
```

## 📝 Common Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all tests in headless mode |
| `npm run test:e2e:ui` | Open Playwright UI for interactive testing |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:debug` | Run tests in debug mode |
| `npm run test:e2e:codegen` | Generate tests using Playwright codegen |
| `npm run test:e2e:report` | View HTML test report |

## 🎯 Example Test

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Act
    await loginPage.login('test@example.com', 'Password123!');

    // Assert
    await expect(page).toHaveURL(/.*expenses/);
  });
});
```

## 🏗️ Creating a New Test

### Step 1: Create Page Object (if needed)
```typescript
// e2e/page-objects/my-page.page.ts
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get myButton() {
    return this.getByTestId('my-button');
  }

  async clickMyButton(): Promise<void> {
    await this.myButton.click();
  }
}
```

### Step 2: Add data-testid to Component
```typescript
// In your Angular component
<button data-testid="my-button">Click Me</button>
```

### Step 3: Write Test
```typescript
// e2e/my-feature/my-test.spec.ts
import { test, expect } from '@playwright/test';
import { MyPage } from '../page-objects/my-page.page';

test('should do something', async ({ page }) => {
  // Arrange
  const myPage = new MyPage(page);
  await myPage.navigate();

  // Act
  await myPage.clickMyButton();

  // Assert
  await expect(myPage.myButton).toBeDisabled();
});
```

## 📚 Key Principles

### 1. Arrange-Act-Assert (AAA)
```typescript
test('example', async ({ page }) => {
  // Arrange - Set up test data and state
  const loginPage = new LoginPage(page);
  
  // Act - Perform the action
  await loginPage.login('user@test.com', 'password');
  
  // Assert - Verify the result
  await expect(page).toHaveURL(/dashboard/);
});
```

### 2. Page Object Model
✅ **Good** - Use Page Objects
```typescript
await loginPage.login(email, password);
```

❌ **Bad** - Direct selectors in tests
```typescript
await page.getByTestId('email-input').fill(email);
await page.getByTestId('password-input').fill(password);
await page.getByTestId('login-button').click();
```

### 3. Test ID Selectors
✅ **Good** - Use data-testid
```typescript
await page.getByTestId('submit-button').click();
```

❌ **Bad** - CSS selectors
```typescript
await page.locator('.btn.btn-primary').click();
```

## 🔍 Debugging Tips

### View Test in UI Mode
```bash
npm run test:e2e:ui
```

### Run Specific Test
```bash
npx playwright test login.spec.ts
```

### Run Single Test by Name
```bash
npx playwright test -g "should login successfully"
```

### Take Screenshot Manually
```typescript
await page.screenshot({ path: 'debug.png' });
```

### Pause Test for Debugging
```typescript
await page.pause();
```

## 📊 Understanding Test Results

### Successful Test
```
✓ auth/login.spec.ts:5:3 › should login successfully (2s)
```

### Failed Test
```
✗ auth/login.spec.ts:5:3 › should login successfully (2s)
  Error: expect(received).toHaveURL(expected)
```

### View Detailed Report
```bash
npm run test:e2e:report
```

## 🛠️ Troubleshooting

### Tests are slow
- Check network conditions
- Ensure dev server is running locally
- Use `page.waitForLoadState('networkidle')` sparingly

### Tests are flaky
- Avoid hard-coded timeouts (`setTimeout`)
- Use Playwright's auto-waiting features
- Ensure proper test isolation

### Can't find element
- Verify `data-testid` is correct
- Check if element is visible: `await expect(element).toBeVisible()`
- Use `page.pause()` to inspect the page

### Application not starting
- Ensure port 4200 is free
- Check if Supabase is running: `npm run db_start`
- Verify `package.json` scripts are correct

## 🎓 Learning Resources

- [Playwright Docs](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

## 💡 Pro Tips

1. **Use Fixtures**: Create reusable test data in `e2e/fixtures/`
2. **Test in Parallel**: Playwright runs tests in parallel by default
3. **Use beforeEach**: Set up common test state in hooks
4. **Check Reports**: Always check HTML reports for failed tests
5. **Update Baselines**: Regenerate visual snapshots when UI changes
6. **Keep Tests Simple**: One test should verify one thing
7. **Name Tests Well**: Test name should describe what it tests

