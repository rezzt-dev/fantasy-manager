import { test, expect } from '@playwright/test';

test('login with token redirects to dashboard', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('http://localhost:4321/login');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'e2e/screenshot-login.png' });

  console.log('Console errors:', consoleErrors);

  // Wait for React island to hydrate
  await expect(page.getByRole('tab', { name: 'Email' })).toBeVisible();
  await page.getByRole('tab', { name: 'Token' }).click();
  await expect(page.getByLabel('Access token')).toBeVisible();

  // Fill a dummy token and submit
  await page.fill('textarea#token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  await page.click('button:has-text("Entrar con token")');

  // Should redirect to dashboard (even if the token is invalid for API calls)
  await expect(page).toHaveURL(/\/dashboard/);
});

