const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    viewport: { width: 1280, height: 720 }
  });

  context.on('request', request => {
    const url = request.url();
    if (url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('login.laliga') || url.includes('llt-services')) {
      console.log('[REQUEST]', request.method(), url);
    }
  });

  context.on('response', async response => {
    const url = response.url();
    if (url.includes('fantasy-api') || url.includes('api-fantasy') || url.includes('login.laliga') || url.includes('llt-services')) {
      console.log('[RESPONSE]', response.status(), url);
      try {
        const text = await response.text();
        if (text.length < 1500) console.log(text);
      } catch (e) {}
    }
  });

  const page = await context.newPage();
  console.log('Navegando a https://fantasy.laliga.com/login');
  await page.goto('https://fantasy.laliga.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL actual:', page.url());
  await page.screenshot({ path: 'screenshot_login2.png' });
  const html = await page.content();
  console.log('HTML parcial:', html.slice(0, 3000));
  console.log('Inputs de formulario:', await page.$$eval('input, button, a', els => els.map(e => `${e.tagName} ${e.type || ''} ${e.name || ''} ${e.id || ''} ${e.className || ''} ${e.textContent.slice(0, 50)}`)));
  await browser.close();
})();
