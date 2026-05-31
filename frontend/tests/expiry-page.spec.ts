import { test, expect } from '@playwright/test';

test('Expiry Tracking — skeleton loader disappears', async ({ page }) => {
  await page.goto('https://letispos.com/smartpos/stock/expiry');
  await page.waitForLoadState('networkidle');
  
  // Wait up to 10s for skeletons to disappear
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0, { timeout: 10000 });
  
  // Warehouse filter should be visible
  await expect(page.getByText('Warehouse')).toBeVisible();
});
