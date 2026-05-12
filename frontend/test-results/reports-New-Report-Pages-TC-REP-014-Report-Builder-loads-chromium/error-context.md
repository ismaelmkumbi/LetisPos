# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reports.spec.ts >> New Report Pages >> TC-REP-014: Report Builder loads
- Location: tests/reports.spec.ts:86:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Report Builder' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Report Builder' })

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - img "404" [ref=e7]
  - heading "Opps!!!" [level=1] [ref=e8]
  - heading "This page you are looking for could not be found." [level=4] [ref=e9]
  - link "Go Back to Home" [ref=e10] [cursor=pointer]:
    - /url: /dashboards/modern
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Reports Hub', () => {
  4  |   test('TC-REP-001: Reports hub page loads', async ({ page }) => {
  5  |     await page.goto('/smartpos/reports');
  6  |     await page.waitForLoadState('networkidle');
  7  |     await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible({ timeout: 10_000 });
  8  |   });
  9  | });
  10 | 
  11 | test.describe('Core Reports', () => {
  12 |   test('TC-REP-002: Sales Report loads', async ({ page }) => {
  13 |     await page.goto('/smartpos/reports/sales');
  14 |     await page.waitForLoadState('networkidle');
  15 |     await expect(page.getByRole('heading', { name: 'Sales Report' })).toBeVisible({ timeout: 10_000 });
  16 |   });
  17 | 
  18 |   test('TC-REP-003: Profit & Loss loads', async ({ page }) => {
  19 |     await page.goto('/smartpos/reports/profit-loss');
  20 |     await page.waitForLoadState('networkidle');
  21 |     await expect(page.getByRole('heading', { name: 'Profit & Loss' })).toBeVisible({ timeout: 10_000 });
  22 |   });
  23 | 
  24 |   test('TC-REP-004: Inventory Report loads', async ({ page }) => {
  25 |     await page.goto('/smartpos/reports/inventory');
  26 |     await page.waitForLoadState('networkidle');
  27 |     await expect(page.getByRole('heading', { name: 'Inventory Report' })).toBeVisible({ timeout: 10_000 });
  28 |   });
  29 | 
  30 |   test('TC-REP-005: Tax Report loads', async ({ page }) => {
  31 |     await page.goto('/smartpos/reports/tax');
  32 |     await page.waitForLoadState('networkidle');
  33 |     await expect(page.getByRole('heading', { name: 'Tax Report' })).toBeVisible({ timeout: 10_000 });
  34 |   });
  35 | 
  36 |   test('TC-REP-006: Purchase Report loads', async ({ page }) => {
  37 |     await page.goto('/smartpos/reports/purchases');
  38 |     await page.waitForLoadState('networkidle');
  39 |     await expect(page.getByRole('heading', { name: 'Purchase Report' })).toBeVisible({ timeout: 10_000 });
  40 |   });
  41 | 
  42 |   test('TC-REP-007: Payment Report loads', async ({ page }) => {
  43 |     await page.goto('/smartpos/reports/payments');
  44 |     await page.waitForLoadState('networkidle');
  45 |     await expect(page.getByRole('heading', { name: 'Payment Report' })).toBeVisible({ timeout: 10_000 });
  46 |   });
  47 | 
  48 |   test('TC-REP-008: Customer Report loads', async ({ page }) => {
  49 |     await page.goto('/smartpos/reports/customers');
  50 |     await page.waitForLoadState('networkidle');
  51 |     await expect(page.getByRole('heading', { name: 'Customer Report' })).toBeVisible({ timeout: 10_000 });
  52 |   });
  53 | });
  54 | 
  55 | test.describe('New Report Pages', () => {
  56 |   test('TC-REP-009: Supplier Report loads', async ({ page }) => {
  57 |     await page.goto('/smartpos/reports/suppliers');
  58 |     await page.waitForLoadState('networkidle');
  59 |     await expect(page.getByRole('heading', { name: 'Supplier Report' })).toBeVisible({ timeout: 10_000 });
  60 |   });
  61 | 
  62 |   test('TC-REP-010: Financial Report loads', async ({ page }) => {
  63 |     await page.goto('/smartpos/reports/financial');
  64 |     await page.waitForLoadState('networkidle');
  65 |     await expect(page.getByRole('heading', { name: 'Financial Reports' })).toBeVisible({ timeout: 10_000 });
  66 |   });
  67 | 
  68 |   test('TC-REP-011: Employee Report loads', async ({ page }) => {
  69 |     await page.goto('/smartpos/reports/employees');
  70 |     await page.waitForLoadState('networkidle');
  71 |     await expect(page.getByRole('heading', { name: 'Employee Report' })).toBeVisible({ timeout: 10_000 });
  72 |   });
  73 | 
  74 |   test('TC-REP-012: Operations Report loads', async ({ page }) => {
  75 |     await page.goto('/smartpos/reports/operations');
  76 |     await page.waitForLoadState('networkidle');
  77 |     await expect(page.getByRole('heading', { name: 'Operations Report' })).toBeVisible({ timeout: 10_000 });
  78 |   });
  79 | 
  80 |   test('TC-REP-013: Report Schedules loads', async ({ page }) => {
  81 |     await page.goto('/smartpos/reports/schedules');
  82 |     await page.waitForLoadState('networkidle');
  83 |     await expect(page.getByRole('heading', { name: 'Report Schedules' })).toBeVisible({ timeout: 10_000 });
  84 |   });
  85 | 
  86 |   test('TC-REP-014: Report Builder loads', async ({ page }) => {
  87 |     await page.goto('/smartpos/reports/builder');
  88 |     await page.waitForLoadState('networkidle');
> 89 |     await expect(page.getByRole('heading', { name: 'Report Builder' })).toBeVisible({ timeout: 10_000 });
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  90 |   });
  91 | 
  92 |   test('TC-REP-015: Export Center loads', async ({ page }) => {
  93 |     await page.goto('/smartpos/reports/exports');
  94 |     await page.waitForLoadState('networkidle');
  95 |     await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 10_000 });
  96 |   });
  97 | });
  98 | 
```