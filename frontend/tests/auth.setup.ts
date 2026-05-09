/**
 * Auth setup — authenticates via API and saves browser storage state
 * so subsequent tests start already logged in.
 */
import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('authenticate via API and save state', async ({ request, page }) => {
  // 1. Login via API
  const loginRes = await request.post('http://localhost:8080/api/v1/auth/login', {
    data: { email: 'admin@smartpos.local', password: 'Admin@12345' },
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login API failed: ${loginRes.status()} — ${body}`);
  }

  const { accessToken, refreshToken } = await loginRes.json();

  // 2. Navigate to app and inject tokens into localStorage
  await page.goto('/');
  await page.evaluate(
    ({ token, refresh }) => {
      localStorage.setItem('smartpos.accessToken', token);
      localStorage.setItem('smartpos.refreshToken', refresh);
    },
    { token: accessToken, refresh: refreshToken },
  );

  // 3. Save the storage state for reuse
  await page.context().storageState({ path: AUTH_FILE });
});
