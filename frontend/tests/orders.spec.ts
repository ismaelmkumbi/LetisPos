/**
 * Order processing & POS tests.
 *
 * Covers: POS terminal launch, sale builder, sales list, quotations.
 */
import { test, expect } from '@playwright/test';

const SCREENSHOT_BASE = 'tests/screenshots';

test.describe('Order Processing (Sales & POS)', () => {
  test('TC-ORDER-001: Sales list page loads', async ({ page }) => {
    await page.goto('/smartpos/sales');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/sales/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/sales-list.png`, fullPage: true });
  });

  test('TC-ORDER-002: Sale builder page loads', async ({ page }) => {
    await page.goto('/smartpos/sales/new');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/sales\/new/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/sale-builder.png`, fullPage: true });
  });

  test('TC-ORDER-003: POS terminal launch page redirects to terminal', async ({ page }) => {
    await page.goto('/smartpos/sales/pos');
    await page.waitForLoadState('networkidle');

    // The launch page may redirect to the actual POS terminal
    await expect(page).toHaveURL(/\/smartpos\/(sales\/pos|pos)/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/pos-launch.png`, fullPage: true });
  });

  test('TC-ORDER-004: POS terminal page loads', async ({ page }) => {
    await page.goto('/smartpos/pos');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/pos/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/pos-terminal.png`, fullPage: true });
  });

  test('TC-ORDER-005: Quotations page loads', async ({ page }) => {
    await page.goto('/smartpos/quotations');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/quotations/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/quotations.png`, fullPage: true });
  });

  test('TC-ORDER-006: Returns page loads', async ({ page }) => {
    await page.goto('/smartpos/returns');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/returns/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/returns.png`, fullPage: true });
  });

  test('TC-ORDER-007: Purchases list loads', async ({ page }) => {
    await page.goto('/smartpos/purchases');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/purchases/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/purchases.png`, fullPage: true });
  });

  test('TC-ORDER-008: Recurring invoices page loads', async ({ page }) => {
    await page.goto('/smartpos/recurring-invoices');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/smartpos\/recurring-invoices/, { timeout: 15_000 });
    await page.screenshot({ path: `${SCREENSHOT_BASE}/recurring-invoices.png`, fullPage: true });
  });
});
