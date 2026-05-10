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

setup('authenticate via API and save state', async ({ request, page, context }) => {
  const loginRes = await request.post('http://localhost:8080/api/v1/auth/login', {
    data: { email: 'admin@smartpos.local', password: 'Admin@12345' },
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login API failed: ${loginRes.status()} — ${body}`);
  }

  const { accessToken, refreshToken } = await loginRes.json();
  if (!refreshToken) {
    throw new Error('Login did not return refreshToken in body');
  }

  await context.addCookies([
    {
      name: 'smartpos_refresh',
      value: refreshToken,
      domain: 'localhost',
      path: '/api/v1/auth',
      httpOnly: true,
      sameSite: 'Lax' as const,
    },
  ]);

  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('smartpos.accessToken', token);
  }, accessToken);

  await context.storageState({ path: AUTH_FILE });
});
