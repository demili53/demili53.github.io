// Run with Playwright available on NODE_PATH: node scripts/test-duo-board.cjs
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = createServer((req, res) => {
  const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
const fixture = `
let callback;
let data=[];
window.testUser=null;
export function watchUser(next){window.login=()=>{window.testUser={uid:'owner'};next(window.testUser)};next(null)}
export function watchPosts(next,error){callback=next;window.failRead=error;next(data,{});return ()=>{}}
export async function savePost(user,post){if(window.failWrite)throw Error('denied');window.saved=post;data=[{id:user.uid,...post}];callback(data,{})}
export async function removePost(){data=[];callback(data,{})}
`;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (!route.request().url().startsWith('http://127.0.0.1:')) return route.abort();
      if (route.request().url().endsWith('/duo-store.js')) return route.fulfill({ contentType: 'text/javascript', body: fixture });
      return route.continue();
    });
    const url = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(url);
    await page.waitForFunction(() => typeof window.login === 'function');
    assert(await page.locator('#publishParty').isDisabled());
    await page.evaluate(() => window.login());
    await page.locator('#riotId').fill('테스트#KR1');
    await page.locator('#tier').selectOption('골드');
    const check = (name, value) => page.locator(`input[name="${name}"][value="${value}"]`);
    await check('positions', '탑').locator('..').click();
    await check('positions', '미드').locator('..').click();
    assert(!(await check('positions','상관없음').isChecked()));
    assert(await check('positions','탑').isChecked());
    await check('wantedPositions','정글').locator('..').click();
    await check('wantedPositions','서포터').locator('..').click();
    await page.locator('#partyNote').fill('<img src=x onerror=alert(1)>');
    await page.locator('#publishParty').click();
    await page.waitForFunction(() => !!window.saved);
    let saved = await page.evaluate(() => window.saved);
    assert.deepEqual(saved.positions,['탑','미드']);
    assert.deepEqual(saved.wantedPositions,['정글','서포터']);
    assert.equal(await page.locator('.duo-post').count(),1);
    assert.equal(await page.locator('.duo-post img').count(),0);
    assert.equal(await page.locator('.post-note').textContent(),'<img src=x onerror=alert(1)>');
    await check('positions','상관없음').locator('..').click();
    assert(!(await check('positions','탑').isChecked()));
    await check('wantedPositions','서포터').locator('..').click();
    await check('wantedPositions','정글').locator('..').click();
    assert(await check('wantedPositions','상관없음').isChecked());
    await page.locator('#publishParty').click();
    await page.waitForFunction(() => window.saved.positions[0] === '상관없음');
    assert.equal(await page.locator('.duo-post').count(),1);
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#party').scrollIntoViewIfNeeded();
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-results/duo-board-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:path.join(root,'test-results/duo-board-desktop.png'),fullPage:true});
    await page.getByRole('button',{name:'모집글 삭제'}).click();
    assert.equal(await page.locator('.duo-post').count(),0);
    await page.evaluate(() => window.failWrite=true);
    await page.locator('#publishParty').click();
    await page.waitForFunction(() => document.getElementById('partyStatus').textContent.includes('등록하지 못했습니다'));
    assert(!(await page.locator('#publishParty').isDisabled()));
    await page.evaluate(() => window.failRead());
    assert((await page.locator('#boardStatus').textContent()).includes('불러오지 못했습니다'));
    await page.locator('#refreshBoard').click();
    assert((await page.locator('#boardStatus').textContent()).includes('아직 모집글이 없습니다'));
    assert.deepEqual(errors,[]);
    console.log('PASS: guest gate, multi-position selection, any-position exclusivity and fallback, registration/update/delete, safe text rendering, error/retry, mobile overflow. Firebase is mocked.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1}).finally(() => server.close());
