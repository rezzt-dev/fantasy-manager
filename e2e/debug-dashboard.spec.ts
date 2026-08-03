import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('debug: dashboard loading state', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => messages.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));

  const email = /^LALIGA_FANTASY_EMAIL=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';
  const password = /^LALIGA_FANTASY_PASSWORD=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';

  // Login real por la UI (el flujo del usuario).
  await page.goto('http://localhost:4321/login');
  await page.getByRole('tab', { name: 'Email' }).click();
  await page.locator('input#username').fill(email);
  await page.locator('input#password, input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForTimeout(20000);

  console.log('URL final:', page.url());
  const bodyText = await page.locator('body').innerText();
  console.log('--- BODY (primeros 500):', bodyText.slice(0, 500).replace(/\n+/g, ' | '));
  console.log('--- MENSAJES CONSOLA:');
  for (const m of messages) console.log(m);

  await page.screenshot({ path: 'e2e/screenshot-debug-dashboard.png', fullPage: true });
});
