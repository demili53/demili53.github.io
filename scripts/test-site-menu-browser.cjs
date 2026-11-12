// NODE_PATH must provide Playwright; PLAYWRIGHT_EXECUTABLE_PATH may select a browser.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const fixture = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PartyGame 메뉴 검증</title><script src="/scripts/site-layout.js" defer></script>
<style>body{background:#0c1320;color:#d2dcee;font-family:system-ui,sans-serif}main{max-width:1224px;margin:0 auto;padding:40px 24px;min-height:650px}h1{font-size:28px}p{color:#a0b1c9;line-height:1.8}button{padding:12px 18px;background:#24364d;color:#fff;border:1px solid #445b77;border-radius:10px}</style>
</head><body><site-header></site-header><main id="mainContent" tabindex="-1">
<h1>PartyGame</h1><p>공통 메뉴의 화면 크기와 키보드 동작을 확인하는 검증 화면입니다.</p>
<button id="contentAction">본문으로 이동</button></main><site-footer></site-footer></body></html>`;
const firebaseMock = `export const auth={currentUser:null}; export const authReady=Promise.resolve();
let changed; export function onAuthStateChanged(a, cb){changed=cb;queueMicrotask(()=>cb(a.currentUser));return()=>{changed=null;}};
export function setUser(user){auth.currentUser=user;changed?.(user);}
export async function signOut(){setUser(null);}`;

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/scripts/site-layout.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.end(fs.readFileSync(path.join(root, 'scripts/site-layout.js')));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(fixture);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(5000);
    const errors = [];
    const failures = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({
      contentType: 'text/javascript', body: firebaseMock
    }));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const toggle = page.locator('site-header .menu-toggle');
    const panel = page.locator('site-header .menu-panel');
    const menuLinks = page.locator('site-header nav a');
    const expectOpen = async open => {
      assert.equal(await toggle.getAttribute('aria-expanded'), String(open));
      assert.equal(await panel.isVisible(), open);
    };
    const focused = async selector => page.evaluate(selector => {
      const header = document.querySelector('site-header').shadowRoot;
      return header.activeElement === header.querySelector(selector);
    }, selector);
    const setUser = user => page.evaluate(async user => {
      const client = await import('/scripts/firebase-client.js');
      client.setUser(user);
    }, user);
    const user = { displayName: '매우 긴 이름을 사용하는 PartyGame 플레이어 '.repeat(8), email: 'long-player-address@example.com' };

    await page.goto(`${origin}/arcade/rift-blade.html`);
    await page.waitForFunction(() => document.querySelector('site-header')?.shadowRoot?.querySelector('#accountLabel')?.textContent === '로그인·회원가입');
    assert.equal(await menuLinks.count(), 5);
    assert.equal(await page.locator('site-header nav [aria-current="page"]').getAttribute('href'), '/arcade/rift-blade.html');
    await expectOpen(false);
    const closedBounds = await page.evaluate(() => ({
      main: document.querySelector('main').getBoundingClientRect().top,
      header: document.querySelector('site-header').getBoundingClientRect().height
    }));
    await toggle.click();
    await expectOpen(true);
    assert.deepEqual(await page.evaluate(() => ({
      main: document.querySelector('main').getBoundingClientRect().top,
      header: document.querySelector('site-header').getBoundingClientRect().height
    })), closedBounds, 'opening panel does not resize header or move main');
    await menuLinks.first().focus();
    await page.keyboard.press('Escape');
    await expectOpen(false);
    assert(await focused('.menu-toggle'), 'Escape restores focus to toggle');

    await toggle.click();
    await menuLinks.last().focus();
    await page.keyboard.press('Tab');
    await expectOpen(false);
    assert.equal(await page.locator('#contentAction').evaluate(el => el === document.activeElement), true, 'Tab leaves header for main content');

    await toggle.click();
    await page.locator('site-header .skip').focus();
    await page.keyboard.press('Enter');
    await expectOpen(false);
    assert.equal(await page.locator('#mainContent').evaluate(el => el === document.activeElement), true, 'skip link focuses main');

    await toggle.click();
    await page.mouse.click(20, 700);
    await expectOpen(false);

    await toggle.click();
    await page.setViewportSize({ width: 1024, height: 844 });
    await page.waitForFunction(() => document.querySelector('site-header').shadowRoot.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false');
    assert(await panel.isVisible(), 'desktop navigation stays visible');
    assert(await focused('nav [aria-current]'), 'desktop resize focuses current page');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('site-header').shadowRoot.activeElement?.matches('.menu-toggle'))
      .catch(() => failures.push('desktop-to-mobile resize should restore focus to menu toggle'));
    await expectOpen(false);
    await page.setViewportSize({ width: 1024, height: 844 });
    await page.locator('#contentAction').focus();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('site-header').shadowRoot.querySelector('.menu-toggle')).display !== 'none');
    assert.equal(await page.locator('#contentAction').evaluate(el => el === document.activeElement), true, 'resize preserves intentional focus outside header');

    for (const width of [320, 390, 760, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const loggedIn of [false, true]) {
        await setUser(loggedIn ? user : null);
        if (width <= 760 && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
        const geometry = await page.evaluate(() => {
          const header = document.querySelector('site-header');
          const shadow = header.shadowRoot;
          const brand = shadow.querySelector('.brand').getBoundingClientRect();
          const account = shadow.querySelector('.account').getBoundingClientRect();
          const nodes = [header, shadow.querySelector('.top'), shadow.querySelector('nav')];
          return {
            viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
            brandRight: brand.right, accountLeft: account.left, accountRight: account.right,
            overflow: nodes.some(el => el.scrollWidth > el.clientWidth + 1),
            linksOutside: [...shadow.querySelectorAll('nav a')].some(el => {
              const rect = el.getBoundingClientRect();
              return rect.left < -1 || rect.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1;
            })
          };
        });
        const label = `${width}px ${loggedIn ? 'logged-in' : 'logged-out'}`;
        assert(geometry.documentWidth <= geometry.viewport + 1, `${label}: document overflows`);
        assert(!geometry.overflow && !geometry.linksOutside, `${label}: menu overflows: ${JSON.stringify(geometry)}`);
        assert(geometry.brandRight + 4 <= geometry.accountLeft, `${label}: brand overlaps account`);
        assert(geometry.accountRight <= width, `${label}: account extends offscreen`);
      }
    }

    await setUser(null);
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/site-menu-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await toggle.click();
    await expectOpen(true);
    await page.screenshot({ path: path.join(root, 'test-results/site-menu-mobile.png') });

    await page.setViewportSize({ width: 667, height: 375 });
    await menuLinks.last().scrollIntoViewIfNeeded();
    const landscape = await panel.evaluate(el => {
      const last = el.querySelector('nav a:last-child').getBoundingClientRect();
      const bounds = el.getBoundingClientRect();
      return { scrollable: el.scrollHeight > el.clientHeight, lastTop: last.top, lastBottom: last.bottom, panelTop: bounds.top, panelBottom: bounds.bottom, height: innerHeight };
    });
    assert(landscape.scrollable, 'short landscape panel scrolls');
    assert(landscape.lastTop >= landscape.panelTop && landscape.lastBottom <= landscape.panelBottom + 1 && landscape.panelBottom <= landscape.height, 'last item is reachable inside landscape viewport');
    await page.setViewportSize({ width: 390, height: 844 });

    for (const pathname of ['/', '/arcade/space-shooter.html', '/arcade/shadow-sniper.html', '/exaone/']) {
      await page.goto(origin + pathname);
      assert.equal(await page.locator('site-header nav [aria-current="page"]').getAttribute('href'), pathname);
    }
    await page.goto(`${origin}/account.html`);
    assert.equal(await page.locator('site-header .current-label').innerText(), '회원 계정');
    assert.equal(await page.locator('site-header nav [aria-current]').count(), 0);
    assert.deepEqual(errors, [], 'no browser errors');
    assert.deepEqual(failures, [], 'interaction regressions');
    console.log('PASS: menu toggle, Escape/focus, skip/outside close, breakpoint reset, current pages, 6 responsive widths, both auth states, and screenshots');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
