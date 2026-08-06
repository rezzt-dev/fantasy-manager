import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const email = /^LALIGA_FANTASY_EMAIL=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';
const password = /^LALIGA_FANTASY_PASSWORD=(.*)$/m.exec(readFileSync('.env.credentials', 'utf8'))?.[1] ?? '';

const SIZES = [
  { name: 'm360', width: 360, height: 800 },
  { name: 'm375', width: 375, height: 812 },
  { name: 'tablet768', width: 768, height: 1024 },
];
const TABS = ['overview', 'team', 'market', 'recommendations'];

const outDir = path.join(process.cwd(), 'e2e', 'tmp-mobile-check');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:4321/login');
await page.getByRole('tab', { name: 'Email' }).click();
await page.locator('input#username').fill(email);
await page.locator('input#password, input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /entrar/i }).click();
await page.waitForTimeout(12000);

for (const size of SIZES) {
  await page.setViewportSize({ width: size.width, height: size.height });
  for (const tab of TABS) {
    await page.goto(`http://localhost:4321/dashboard?tab=${tab}`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    const metrics = await page.evaluate(() => {
      const html = document.documentElement;
      // Medir overflow real: quitar el clip temporalmente
      const prevHtml = html.style.overflowX;
      const prevBody = document.body.style.overflowX;
      html.style.overflowX = 'visible';
      document.body.style.overflowX = 'visible';
      const real = Math.max(html.scrollWidth, document.body.scrollWidth);
      html.style.overflowX = prevHtml;
      document.body.style.overflowX = prevBody;
      const nav = document.querySelector('nav');
      const navRect = nav?.getBoundingClientRect();
      const lastNavItem = nav?.querySelector('div > *:last-child')?.getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        realScrollWidth: real,
        navRight: navRect ? Math.round(navRect.right) : null,
        navLastItemRight: lastNavItem ? Math.round(lastNavItem.right) : null,
      };
    });
    const overflow = metrics.realScrollWidth - metrics.innerWidth;
    console.log(
      `${size.name} [${tab}] innerWidth=${metrics.innerWidth} realScrollWidth=${metrics.realScrollWidth} overflow=${overflow}px navRight=${metrics.navRight} navLastItemRight=${metrics.navLastItemRight}`,
    );
    if (tab === 'team' || tab === 'overview') {
      await page.screenshot({ path: path.join(outDir, `${tab}-${size.name}.png`) });
    }
  }
}

await browser.close();
