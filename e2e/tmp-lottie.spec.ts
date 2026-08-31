import { test, expect } from '@playwright/test';

const OUT = '/tmp/claude-1000/-home-rezzt-repositorios-webpage-projects-fantasy-manager/7f299132-17a0-4f38-bcd2-acc291778cb3/scratchpad/qa';
const PLAYER =
  'node_modules/.pnpm/lottie-web@5.13.0/node_modules/lottie-web/build/player/lottie_light.min.js';

test('la ilustración Lottie se reproduce', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('http://localhost:4321/');
  await page.addScriptTag({ path: PLAYER });

  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.id = 'lottie-host';
    host.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#151515;display:flex;align-items:center;justify-content:center';
    const box = document.createElement('div');
    box.id = 'lottie-box';
    box.style.cssText = 'width:220px;height:220px';
    host.appendChild(box);
    document.body.appendChild(host);
    // @ts-ignore
    window.__anim = lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/lottie/pitch-search.json',
    });
  });

  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/lottie-mid.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/lottie-late.png` });

  const info = await page.evaluate(() => {
    // @ts-ignore
    const a = window.__anim;
    const svg = document.querySelector('#lottie-box svg');
    return {
      totalFrames: a?.totalFrames ?? null,
      currentFrame: Math.round(a?.currentFrame ?? -1),
      svgPresent: !!svg,
      shapeCount: document.querySelectorAll('#lottie-box svg g').length,
      paths: document.querySelectorAll('#lottie-box svg path').length,
    };
  });
  console.log(JSON.stringify({ info, errors }, null, 2));
  expect(errors).toHaveLength(0);
  expect(info.svgPresent).toBe(true);
  expect(info.paths).toBeGreaterThan(0);
});
