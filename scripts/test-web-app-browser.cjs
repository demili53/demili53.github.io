// Web app check: share button, home-screen button, manifests/icons and offline play through sw.js.
// NODE_PATH must provide Playwright; PLAYWRIGHT_EXECUTABLE_PATH may select a browser.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium, devices } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
const games = ['rift-blade', 'space-shooter', 'missile-rush', 'fog-front', 'lantern-keeper', 'exam-sneak', 'shadow-sniper'];
const pages = { partygame: '/', ...Object.fromEntries(games.map(id => [id, `/arcade/${id}.html`])), tarot: '/fortune/tarot.html' };

// Static checks: every app has a manifest whose icons exist and are the stated size.
const pngSize = file => { const b = fs.readFileSync(file); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
for (const [id, url] of Object.entries(pages)) {
  const file = id === 'partygame' ? 'manifest.webmanifest' : `manifests/${id}.webmanifest`;
  const manifest = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  assert.equal(manifest.start_url, url, file);
  assert.equal(manifest.id, url, file);
  assert.equal(manifest.scope, '/', file);
  assert.equal(manifest.display, 'standalone', file);
  assert(manifest.icons.some(icon => icon.purpose === 'maskable'), `${file}: maskable icon`);
  for (const icon of manifest.icons) assert.equal(pngSize(path.join(root, icon.src)), icon.sizes, icon.src);
  assert.equal(pngSize(path.join(root, `assets/app/${id}-180.png`)), '180x180', `${id} apple icon`);
  const layout = fs.readFileSync(path.join(root, 'scripts/site-layout.js'), 'utf8');
  if (id !== 'partygame') assert(layout.includes(`'${url}': ['${id}', '${manifest.name}']`), `${id}: site-layout.js apps table matches manifest name`);
}

(async () => {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(root, pathname);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined);
  const errors = [];
  const open = async (options, url = '/arcade/fog-front.html') => {
    const context = await browser.newContext({ ...options, permissions: ['clipboard-read', 'clipboard-write'] });
    await context.route(/googlesyndication|googletagmanager|gstatic\.com|firebaseio|googleapis/, route => route.abort());
    await context.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const auth={currentUser:null};export const authReady=Promise.resolve();export function onAuthStateChanged(a,cb){cb(null);return()=>{}};export async function signOut(){}' }));
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + url);
    await page.waitForFunction(() => document.querySelector('site-header')?.shadowRoot?.querySelector('#shareButton'));
    return { context, page };
  };
  const header = '#appSheet';
  try {
    // PC: share opens the copy-link sheet, install stays hidden until Chrome offers it.
    let { context, page } = await open({ viewport: { width: 1280, height: 800 } });
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/manifests/fog-front.webmanifest');
    assert.equal(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'), '/assets/app/fog-front-180.png');
    assert.equal(await page.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), '운빨좆망겜');
    assert.equal(await page.locator('site-header #installButton').isVisible(), false);
    await page.locator('site-header #shareButton').click();
    await page.locator(`site-header ${header}`).waitFor();
    assert.equal(await page.locator('site-header #shareUrl').inputValue(), 'https://partygame.pe.kr/arcade/fog-front.html');
    await page.locator('site-header [data-copy]').click();
    await page.locator('site-header .sheet-status', { hasText: '복사했어요' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://partygame.pe.kr/arcade/fog-front.html');
    // Keys inside the sheet must not reach game shortcuts.
    await page.evaluate(() => { window.gameKeys = 0; document.addEventListener('keydown', () => window.gameKeys++); });
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.gameKeys), 0);
    await page.keyboard.press('Escape');
    await page.locator(`site-header ${header}`).waitFor({ state: 'hidden' });
    // Chrome's install offer shows the button and the button calls prompt().
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      event.prompt = () => { window.prompted = true; return Promise.resolve(); };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      dispatchEvent(event);
    });
    await page.locator('site-header #installButton').click();
    assert.equal(await page.evaluate(() => window.prompted), true);
    await page.screenshot({ path: path.join(root, 'test-results/web-app-pc.png') });
    // Offline: the service worker serves the game page and its scripts after one visit.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.waitForTimeout(500);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('site-header')?.shadowRoot?.querySelector('#shareButton'));
    assert.equal(await page.locator('main#mainContent').count(), 1, 'game page loads offline');
    await page.goto(origin + '/arcade/space-shooter.html');
    await page.getByText('인터넷에 연결되어 있지 않아요').waitFor();
    assert(await page.getByRole('link', { name: '운빨좆망겜' }).count(), 'offline page lists saved games');
    await context.close();

    // iPhone Safari: home-screen guide with the Share → 홈 화면에 추가 steps; share uses the system sheet.
    ({ context, page } = await open(devices['iPhone 13']));
    await page.evaluate(() => { navigator.share = data => { window.shared = data; return Promise.resolve(); }; });
    await page.locator('site-header #shareButton').click();
    assert.equal((await page.evaluate(() => window.shared)).url, 'https://partygame.pe.kr/arcade/fog-front.html');
    await page.locator('site-header #installButton').click();
    await page.locator('site-header ol.steps', { hasText: '홈 화면에 추가' }).waitFor();
    await page.screenshot({ path: path.join(root, 'test-results/web-app-iphone-guide.png') });
    await context.close();

    // KakaoTalk in-app browser: offer to open the page in the phone's own browser.
    ({ context, page } = await open({ ...devices['Galaxy S9+'], userAgent: devices['Galaxy S9+'].userAgent + ' KAKAOTALK 10.8.0' }, '/'));
    assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'), '/manifest.webmanifest');
    await page.locator('site-header #installButton').click();
    assert.match(await page.locator('site-header #sheetBody a.primary').getAttribute('href'), /^kakaotalk:\/\/web\/openExternal\?url=/);
    await page.locator('site-header .sheet-close').click();
    await page.locator('site-header #shareButton').click(); // in-app: copy-link sheet, not the system sheet
    await page.locator('site-header [data-copy]').waitFor();
    await page.screenshot({ path: path.join(root, 'test-results/web-app-kakao-share.png') });
    await context.close();

    // Narrow phones: buttons fit without horizontal scroll or overlap.
    for (const width of [320, 360, 390]) {
      ({ context, page } = await open({ viewport: { width, height: 700 }, isMobile: true, hasTouch: true, userAgent: devices['Galaxy S9+'].userAgent }));
      const boxes = await page.evaluate(() => {
        const root = document.querySelector('site-header').shadowRoot;
        return ['.brand', '#shareButton', '#installButton', '#accountLink'].map(selector => root.querySelector(selector).getBoundingClientRect().toJSON());
      });
      for (let i = 1; i < boxes.length; i++) assert(boxes[i].left >= boxes[i - 1].right, `${width}px: header items overlap`);
      assert(boxes.at(-1).right <= width, `${width}px: header fits`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: share sheet, home-screen guides and prompt, 9 manifests with icons, offline game page');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
