/**
 * Payment processing tests.
 *
 * Covers: payments list, record payment, accounts, expenses, transfers.
 */
import { test, expect } from '@playwright/test';

const SCREENSHOT_BASE = 'tests/screenshots';

test.describe('Payment Processing', () => {
  test('TC-PAY-001: Accounts list page loads', async ({ page }) => {
    await page.goto('/smartpos/accounts');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/accounts/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/accounts-list.png`, fullPage: true });
  });

  test('TC-PAY-002: Payments list page loads', async ({ page }) => {
    await page.goto('/smartpos/payments');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/payments/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/payments-list.png`, fullPage: true });
  });

  test('TC-PAY-003: Expenses page loads', async ({ page }) => {
    await page.goto('/smartpos/expenses');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/expenses/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/expenses.png`, fullPage: true });
  });

  test('TC-PAY-004: Transfers page loads', async ({ page }) => {
    await page.goto('/smartpos/transfers');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/transfers/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/transfers.png`, fullPage: true });
  });

  test('TC-PAY-005: Chart of accounts loads', async ({ page }) => {
    await page.goto('/smartpos/accounting/chart-of-accounts');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/accounting\/chart-of-accounts/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/chart-of-accounts.png`, fullPage: true });
  });

  test('TC-PAY-006: Journal entries page loads', async ({ page }) => {
    await page.goto('/smartpos/accounting/journal-entries');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/accounting\/journal-entries/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/journal-entries.png`, fullPage: true });
  });

  test('TC-PAY-007: Financial statements page loads', async ({ page }) => {
    await page.goto('/smartpos/accounting/financials');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/accounting\/financials/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/financial-statements.png`, fullPage: true });
  });

  test('TC-PAY-008: Revenue reports page loads', async ({ page }) => {
    await page.goto('/smartpos/reports/sales');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/reports\/sales/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/sales-report.png`, fullPage: true });
  });
});
