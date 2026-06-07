/**
 * Forgot Password — E2E test: submit form from UI, capture exact API payload.
 *
 * Purpose: verify what email the UI actually sends, and whether backend
 * logs an email send or an error.
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5173';

test.describe('Forgot password flow', () => {

  test('submit forgot-password form and capture API request', async ({ page }) => {
    // Intercept the API call
    let requestBody: string | null = null;
    const apiPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/password/forgot') && res.request().method() === 'POST',
    );
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/auth/password/forgot')) {
        requestBody = req.postData();
      }
    });

    // Navigate to the forgot-password page
    await page.goto(`${BASE_URL}/auth/forgot-password`, { waitUntil: 'networkidle' });

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Wait for the form to be visible
    const emailInput = page.locator('#reset-email');
    await expect(emailInput).toBeVisible({ timeout: 20_000 });

    // Type the email address
    await emailInput.fill(TEST_EMAIL);

    // Click submit
    const submitBtn = page.getByRole('button', { name: /send reset link/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Wait for API response
    const response = await apiPromise;
    const responseBody = await response.text();
    const status = response.status();

    console.log('━━━ Forgot Password UI Test ━━━');
    console.log(`Request body: ${requestBody}`);
    console.log(`Response status: ${status}`);
    console.log(`Response body: ${responseBody}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check if we got success or error
    if (status === 200) {
      console.log('✅ API returned 200');
    } else if (status === 429) {
      console.log('⚠️  Rate limited (429) — too many attempts, wait a bit');
    } else {
      console.log(`❌ API returned ${status}`);
    }

    // The form should show a message after submission
    await expect(page.locator('text=/check your inbox|error|too many|try again later/i'))
      .toBeVisible({ timeout: 10_000 });
  });
});
