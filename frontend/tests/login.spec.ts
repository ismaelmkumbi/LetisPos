/**
 * Login flow tests.
 *
 * Covers: UI login, invalid credentials, logout, and session persistence.
 */
import { test, expect } from '@playwright/test';

const SCREENSHOT_BASE = 'tests/screenshots';

test.describe('Login Flow', () => {
  // Run login tests without saved auth state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-LOGIN-001: Successful login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');
    await emailInput.fill('admin@smartpos.local');
    await passwordInput.fill('Admin@12345');

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/smartpos\/dashboard/, { timeout: 20_000 });
  });

  test('TC-LOGIN-002: Invalid credentials show error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.locator('#email').fill('wrong@email.com');
    await page.locator('#password').fill('WrongPassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show an error alert
    const errorAlert = page.locator('.MuiAlert-standardError, [role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/login-invalid-credentials.png`, fullPage: true });
  });

  test('TC-LOGIN-003: Empty email or password disables submit', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Clear the pre-filled email
    await page.locator('#email').fill('');
    await page.locator('#password').fill('');

    // Submit button should be disabled
    const submitBtn = page.getByRole('button', { name: /sign in/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('TC-LOGIN-004: Password visibility toggle works', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon
    await page.locator('[aria-label="Show password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('[aria-label="Hide password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('TC-LOGIN-005: Forgot password link navigates', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.getByText(/forgot password/i).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('TC-LOGIN-006: Register link navigates to registration', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.getByText(/create account/i).click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

// TC-LOGIN-007 uses saved auth state from the setup project (not cleared).
test.describe('Authenticated Sessions', () => {
  test('TC-LOGIN-007: Logged-in state shows dashboard', async ({ page }) => {
    await page.goto('/smartpos/dashboard');
    // The dashboard may show various content — check we're not on the login page
    const loginForm = page.locator('form');
    await expect(loginForm).not.toBeVisible({ timeout: 15_000 });
    // Should be on a smartpos page, not redirected to landing or login
    await expect(page).toHaveURL(/\/smartpos\//, { timeout: 15_000 });
  });
});
