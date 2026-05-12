import { test, expect } from '@playwright/test';

test.describe('Reports Hub', () => {
  test('TC-REP-001: Reports hub page loads', async ({ page }) => {
    await page.goto('/smartpos/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Core Reports', () => {
  test('TC-REP-002: Sales Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/sales');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-003: Profit & Loss loads', async ({ page }) => {
    await page.goto('/smartpos/reports/profit-loss');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Profit & Loss' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-004: Inventory Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Inventory Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-005: Tax Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/tax');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Tax Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-006: Purchase Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/purchases');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Purchase Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-007: Payment Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/payments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Payment Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-008: Customer Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Customer Report' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('New Report Pages', () => {
  test('TC-REP-009: Supplier Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/suppliers');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Supplier Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-010: Financial Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/financial');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Financial Reports' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-011: Employee Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/employees');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Employee Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-012: Operations Report loads', async ({ page }) => {
    await page.goto('/smartpos/reports/operations');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Operations Report' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-013: Report Schedules loads', async ({ page }) => {
    await page.goto('/smartpos/reports/schedules');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Report Schedules' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-014: Report Builder loads', async ({ page }) => {
    await page.goto('/smartpos/reports/builder');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Report Builder' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REP-015: Export Center loads', async ({ page }) => {
    await page.goto('/smartpos/reports/exports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 10_000 });
  });
});
