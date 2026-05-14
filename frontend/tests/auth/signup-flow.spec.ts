import { test, expect } from '@playwright/test';

test.describe('Quick signup flow', () => {
  test('renders single-page signup form', async ({ page }) => {
    await page.goto('/auth/register');

    // Should show trial badge
    await expect(page.getByText('30-day free trial')).toBeVisible();
    await expect(page.getByText('No credit card')).toBeVisible();

    // Should have all required fields on one page
    await expect(page.getByLabel('Business name')).toBeVisible();
    await expect(page.getByLabel('Workspace URL')).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Should NOT show plan selection cards from old wizard
    await expect(page.getByText('Choose your plan')).not.toBeVisible();

    // Should show plan chip with Starter mention
    await expect(page.getByText(/Starter/)).toBeVisible();

    // Submit button should say "Start free trial"
    await expect(page.getByRole('button', { name: /Start free trial/ })).toBeVisible();
  });

  test('password strength meter shows for valid input', async ({ page }) => {
    await page.goto('/auth/register');

    const passwordInput = page.getByLabel('Password');
    await passwordInput.fill('weak');

    // Should show validation message
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();

    // Fill a strong password
    await passwordInput.fill('StrongP@ss1');
    await expect(page.getByText('Password must be at least 8 characters')).not.toBeVisible();
  });

  test('slug auto-generation from business name', async ({ page }) => {
    await page.goto('/auth/register');

    await page.getByLabel('Business name').fill('Mwanza General Stores');
    const slugInput = page.getByLabel('Workspace URL');
    await expect(slugInput).toHaveValue('mwanza-general-stores');
  });

  test('login page has no Google SSO button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByText('Continue with Google')).not.toBeVisible();
    await expect(page.getByText('or continue with')).not.toBeVisible();
  });
});
