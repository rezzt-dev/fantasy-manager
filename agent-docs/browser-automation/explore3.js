const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();
  console.log('Navegando a https://fantasy.laliga.com/login');
  await page.goto('https://fantasy.laliga.com/login', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('URL actual:', page.url());
  await page.screenshot({ path: 'screenshot_login.png' });
  console.log('HTML parcial:', await page.content().then(c => c.slice(0, 2000)));
  await browser.close();
})();
