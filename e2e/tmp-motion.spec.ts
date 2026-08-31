import { test, expect } from '@playwright/test';

const OUT = '/tmp/claude-1000/-home-rezzt-repositorios-webpage-projects-fantasy-manager/7f299132-17a0-4f38-bcd2-acc291778cb3/scratchpad/qa';

test('portada: sin errores, scroll suave montado, raíl progresa', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:4321/');
  await page.waitForTimeout(2500);

  // Lenis se ha montado: marca <html> con su clase.
  const htmlClass = await page.locator('html').getAttribute('class');

  // El raíl arranca recogido.
  const railStart = await page.locator('[data-steps-progress]').evaluate(
    (el) => getComputedStyle(el).transform,
  );

  await page.screenshot({ path: `${OUT}/landing-top.png` });

  // Bajar hasta la sección de pasos y comprobar que el raíl ha avanzado.
  await page.evaluate(() => {
    document.querySelector('#como-funciona')?.scrollIntoView();
  });
  await page.waitForTimeout(1800);

  const railEnd = await page.locator('[data-steps-progress]').evaluate(
    (el) => getComputedStyle(el).transform,
  );
  const firstDot = await page.locator('[data-step-dot]').first().getAttribute('class');

  await page.screenshot({ path: `${OUT}/landing-steps.png` });

  console.log(JSON.stringify({ htmlClass, railStart, railEnd, firstDot, errors }, null, 2));
  expect(errors, `errores de consola: ${errors.join(' | ')}`).toHaveLength(0);
});

test('portada con prefers-reduced-motion: nada de Lenis ni GSAP', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const requests: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/gsap|lenis|ScrollTrigger|animejs|timeline|svg\./i.test(u)) requests.push(u.split('/').pop()!);
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:4321/');
  await page.waitForTimeout(2500);

  const htmlClass = await page.locator('html').getAttribute('class');
  const rail = await page.locator('[data-steps-progress]').evaluate((el) => getComputedStyle(el).transform);
  const dot = await page.locator('[data-step-dot]').first().getAttribute('class');
  await page.screenshot({ path: `${OUT}/landing-reduced.png` });

  console.log(JSON.stringify({ htmlClass, rail, dot, motionLibsRequested: requests, errors }, null, 2));
  expect(errors).toHaveLength(0);
  await ctx.close();
});

test('acceso: el símbolo se traza', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4321/login');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/login-early.png` });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/login-done.png` });
  const dash = await page.locator('[data-logo-stroke]').first().evaluate(
    (el) => (el as SVGElement).getAttribute('stroke-dasharray'),
  );
  console.log(JSON.stringify({ dash, errors }, null, 2));
  expect(errors).toHaveLength(0);
});
