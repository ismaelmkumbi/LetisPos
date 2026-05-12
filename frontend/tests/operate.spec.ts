/**
 * Operate + Purchases + Inventory section tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Operate Section', () => {
  test('TC-OP-001: Suspended Sales page loads', async ({ page }) => {
    await page.goto('/smartpos/sales/suspended');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Suspended Sales' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-OP-002: Sales list page loads', async ({ page }) => {
    await page.goto('/smartpos/sales');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Transaction history')).toBeVisible({ timeout: 10_000 });
  });

  test('TC-OP-003: Quotations page loads', async ({ page }) => {
    await page.goto('/smartpos/quotations');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Quotations' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-OP-004: Returns page loads', async ({ page }) => {
    await page.goto('/smartpos/returns');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Returns' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-OP-005: Recurring invoices page loads', async ({ page }) => {
    await page.goto('/smartpos/recurring-invoices');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Recurring Invoices' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Purchases Section', () => {
  test('TC-PUR-001: Purchases list loads', async ({ page }) => {
    await page.goto('/smartpos/purchases');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Purchases' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-PUR-002: Goods Received page loads', async ({ page }) => {
    await page.goto('/smartpos/purchases/received');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Goods Received' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-PUR-003: Supplier Returns page loads', async ({ page }) => {
    await page.goto('/smartpos/purchases/returns');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Supplier Returns' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-PUR-004: Supplier Payments page loads', async ({ page }) => {
    await page.goto('/smartpos/supplier-payments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Supplier Payments' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Inventory Section', () => {
  test('TC-INV-001: Expiry Tracking page loads', async ({ page }) => {
    await page.goto('/smartpos/stock/expiry');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Expiry Tracking' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-INV-002: Batch/Lot Tracking page loads', async ({ page }) => {
    await page.goto('/smartpos/stock/batches');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Batch / Lot Tracking' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-INV-003: Stock Levels page loads', async ({ page }) => {
    await page.goto('/smartpos/stock');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Stock Levels' })).toBeVisible({ timeout: 10_000 });
  });
});
