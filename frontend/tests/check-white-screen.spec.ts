import { test, chromium } from '@playwright/test';

test('Check white screen on production', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  console.log('▶ Loading login page...');
  await page.goto('https://letispos.com/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Title:', title);

  const rootHTML = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 500) : 'NO ROOT ELEMENT';
  });
  console.log('Root HTML:', rootHTML);

  console.log('\nConsole errors:', errors.length === 0 ? '(none)' : errors.join('\n'));

  // Check failed JS loads
  const resources = await page.evaluate(() => {
    return performance.getEntriesByType('resource')
      .filter(r => r.transferSize === 0 && r.name.includes('.js'))
      .map(r => r.name);
  });
  console.log('Failed JS loads:', resources.length === 0 ? '(none)' : resources.join(', '));

  await browser.close();
});
