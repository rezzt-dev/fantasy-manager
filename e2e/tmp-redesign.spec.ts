import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('tmp: player dialog + sidebar collapse', async ({ page }) => {
  test.setTimeout(150000);
  const messages: string[] = [];
  page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));
  const email = /^LALIGA_FANTASY_EMAIL=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';
  const password = /^LALIGA_FANTASY_PASSWORD=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';

  await page.goto('http://localhost:4321/login');
  await page.getByRole('tab', { name: 'Email' }).click();
  await page.locator('input#username').fill(email);
  await page.locator('input#password, input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForURL('**/dashboard**', { timeout: 60000 });
  await page.waitForTimeout(25000);
  console.log('--- URL:', page.url());
  console.log('--- MENSAJES CONSOLA:');
  for (const m of messages) console.log(m);
  await page.screenshot({ path: 'e2e/tmp-state.png' });
  await page.getByText('Cargando dashboard...').waitFor({ state: 'hidden', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 1. Sidebar expandida (estado inicial)
  await page.screenshot({ path: 'e2e/tmp-sidebar-expanded.png' });

  // 2. Abrir detalle de jugador desde Mi Equipo
  await page.getByRole('button', { name: 'Mi Equipo' }).first().click();
  await page.waitForTimeout(6000);
  await page.getByText('Szczesny').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/tmp-player-dialog.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. Colapsar sidebar desde el botón del header
  await page.getByRole('button', { name: 'Ocultar panel lateral' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'e2e/tmp-sidebar-collapsed.png' });

  // 4. Diálogo de jugador con la sidebar colapsada
  await page.getByText('Mouriño').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/tmp-player-dialog-collapsed.png' });
});
