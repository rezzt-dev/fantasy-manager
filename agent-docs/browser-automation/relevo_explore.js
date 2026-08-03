const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    viewport: { width: 1280, height: 720 }
  });

  context.on('request', request => {
    const url = request.url();
    if (url.includes('.js') || url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('llt-services')) {
      console.log('[REQUEST]', request.method(), url);
    }
  });

  context.on('response', async response => {
    const url = response.url();
    if (url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('llt-services')) {
      console.log('[RESPONSE]', response.status(), url);
    }
  });

  const page = await context.newPage();
  console.log('Navegando a https://laligafantasy.relevo.com/');
  try {
    await page.goto('https://laligafantasy.relevo.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('URL actual:', page.url());
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'relevo_screenshot.png' });
    const html = await page.content();
    console.log('HTML parcial:', html.slice(0, 1000));
  } catch (e) {
    console.log('Error:', e.message);
  }
  await browser.close();
})();
