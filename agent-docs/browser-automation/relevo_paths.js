const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    viewport: { width: 1280, height: 720 }
  });

  context.on('request', request => {
    const url = request.url();
    if (url.includes('.js') || url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('llt-services') || url.includes('relevo')) {
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
  for (const path of ['/', '/login', '/fantasy', '/home', '/app', '/manager', '/leagues', '/liga']) {
    const url = 'https://laligafantasy.relevo.com' + path;
    console.log('\n=== Navegando a', url, '===');
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('URL actual:', page.url());
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  await browser.close();
})();
