const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    viewport: { width: 1280, height: 720 }
  });

  context.on('request', request => {
    const url = request.url();
    if (url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('login.laliga')) {
      console.log('[REQUEST]', request.method(), url);
    }
  });

  context.on('response', async response => {
    const url = response.url();
    if (url.includes('fantasy-api') || url.includes('api-fantasy')) {
      console.log('[RESPONSE]', response.status(), url);
      try {
        const text = await response.text();
        if (text.length < 2000) console.log(text);
      } catch (e) {}
    }
  });

  const page = await context.newPage();
  console.log('Navegando a https://fanslaliga.laliga.com/ ...');
  await page.goto('https://fanslaliga.laliga.com/', { waitUntil: 'networkidle', timeout: 60000 });

  console.log('URL actual:', page.url());

  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      items[key] = localStorage.getItem(key);
    }
    return items;
  });

  console.log('localStorage:', JSON.stringify(localStorage, null, 2));

  await page.screenshot({ path: '/home/rezzt/personal-data/develop-projects/fantasy-manager/agent-docs/browser-automation/screenshot.png' });
  console.log('Screenshot guardado.');

  await browser.close();
})();
