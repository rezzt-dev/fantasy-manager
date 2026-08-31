import { test } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const TABS = [
  { id: 'overview', name: 'Resumen' },
  { id: 'team', name: 'Plantilla' },
  { id: 'lineup', name: 'Alineación' },
  { id: 'market', name: 'Mercado' },
  { id: 'recommendations', name: 'Centro Estrategia' },
  { id: 'standings', name: 'Clasificación' },
  { id: 'rivals', name: 'Rivales' },
  { id: 'statistics', name: 'Estadísticas' },
  { id: 'track-record', name: 'Acierto del motor' },
];

test('responsive screenshots', async ({ page }) => {
  test.setTimeout(300_000);

  const email = /^LALIGA_FANTASY_EMAIL=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';
  const password = /^LALIGA_FANTASY_PASSWORD=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';

  await page.goto('http://localhost:4321/login');
  await page.getByRole('tab', { name: 'Email' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForTimeout(15000);

  const outDir = path.join(process.cwd(), 'e2e', 'responsive');
  mkdirSync(outDir, { recursive: true });

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const tab of TABS) {
      await page.goto(`http://localhost:4321/dashboard?tab=${tab.id}`, { waitUntil: 'load' });
      await page.waitForTimeout(5000);
      await page.screenshot({
        path: path.join(outDir, `${tab.id}-${size.name}.png`),
        fullPage: true,
      });
    }
  }
});
