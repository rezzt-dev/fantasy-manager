import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('modo compacto: toggle, densidad real, persistencia y atajo de teclado', async ({ page }) => {
  test.setTimeout(180_000);

  const email = /^LALIGA_FANTASY_EMAIL=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';
  const password = /^LALIGA_FANTASY_PASSWORD=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';

  // Login con credenciales reales (mismo patrón que responsive.spec.ts)
  await page.goto('http://localhost:4321/login');
  await page.getByRole('tab', { name: 'Email' }).click();
  await page.locator('input#username').fill(email);
  await page.locator('input#password, input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForTimeout(15000);

  // Estado inicial limpio: sin preferencia guardada
  await page.goto('http://localhost:4321/dashboard?tab=team', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('fantasy-density'));
  await page.reload({ waitUntil: 'load' });

  const html = page.locator('html');
  const headerBar = page.locator('header > div').first();
  const densitySwitch = page.getByRole('switch', { name: 'Densidad compacta' });
  await expect(densitySwitch).toBeVisible({ timeout: 30_000 });

  // Modo normal: sin clase en <html>, header de 64px y celdas con py-3 (12px)
  await expect(html).not.toHaveClass(/density-dense/);
  const heightComfortable = (await headerBar.boundingBox())!.height;
  expect(heightComfortable).toBe(64);

  const firstCell = page.locator('tbody tr td').first();
  await expect(firstCell).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(() => firstCell.evaluate((el) => getComputedStyle(el).paddingTop))
    .toBe('12px');

  // Activa el modo compacto desde el switch del header
  await densitySwitch.click();
  await expect(html).toHaveClass(/density-dense/);
  expect(await page.evaluate(() => localStorage.getItem('fantasy-density'))).toBe('dense');

  // La densidad se aplica de verdad: header 56px y celdas con py-1.5 (6px)
  const heightDense = (await headerBar.boundingBox())!.height;
  expect(heightDense).toBe(56);
  await expect
    .poll(() => firstCell.evaluate((el) => getComputedStyle(el).paddingTop))
    .toBe('6px');

  await page.screenshot({ path: 'e2e/screenshot-density-team-dense.png', fullPage: true });

  // Persistencia: la clase ya está aplicada al cargar el documento (anti-FOUC)
  // y el switch refleja el estado guardado tras hidratar React.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(html).toHaveClass(/density-dense/);
  expect(await page.evaluate(() => localStorage.getItem('fantasy-density'))).toBe('dense');
  await expect(densitySwitch).toBeChecked({ timeout: 30_000 });

  // El atajo de teclado D lo desactiva y avisa con un toast
  await page.keyboard.press('d');
  await expect(html).not.toHaveClass(/density-dense/);
  expect(await page.evaluate(() => localStorage.getItem('fantasy-density'))).toBe('comfortable');
  await expect(page.getByText('Modo compacto desactivado')).toBeVisible();
  await expect
    .poll(() => firstCell.evaluate((el) => getComputedStyle(el).paddingTop))
    .toBe('12px');

  await page.screenshot({ path: 'e2e/screenshot-density-team-comfortable.png', fullPage: true });
});
