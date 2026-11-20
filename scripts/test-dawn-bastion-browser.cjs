// 새벽의 요새 브라우저 테스트. Playwright가 NODE_PATH에 있어야 합니다: node scripts/test-dawn-bastion-browser.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml' };
    try { const body = fs.readFileSync(file); res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(body); }
    catch { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [], scores = [], requested = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requested.push(request.url()));
    await page.route(/googletagmanager|googlesyndication|google-analytics|gstatic|googleapis/, route => route.abort());
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.exposeFunction('reportScore', detail => scores.push(detail));
    await page.addInitScript(() => addEventListener('partygame:score', event => window.reportScore(event.detail)));
    await page.goto(base + '/');
    await page.waitForFunction(() => typeof ready !== 'undefined' && ready);

    // 예전 엔진과 Phaser를 더는 불러오지 않는다
    assert.ok(!requested.some(url => /phaser|bastion-/.test(url)), '예전 스크립트 요청 없음');
    assert.equal(await page.evaluate(() => typeof Phaser), 'undefined');
    assert.equal(await page.locator('#start').textContent(), '게임 시작');
    assert.equal(await page.locator('#summon').isDisabled(), true);
    assert.equal(await page.locator('#towerCodex li').count(), await page.evaluate(() => Dawn.DECK.length));
    assert.equal(await page.locator('#tierLegend span').count(), 6);

    // 시작과 소환
    await page.click('#start');
    assert.equal(await page.evaluate(() => game.state), 'running');
    assert.equal(await page.locator('#overlay').isHidden(), true);
    await page.click('#summon');
    assert.equal(await page.evaluate(() => game.cells.filter(c => c.tower).length), 1);
    assert.equal(await page.locator('#gold').textContent(), '80');
    assert.equal(await page.locator('#summonCost').textContent(), '24 에테르');
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => game.cells.filter(c => c.tower).length), 2);

    // 화면에 실제로 그려진다
    const painted = await page.evaluate(() => { const c = document.getElementById('gameCanvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return seen.size; });
    assert.ok(painted > 60, '전장이 그려짐: ' + painted);

    // 끌어서 합성
    const point = async index => { const box = await page.locator('#gameCanvas').boundingBox(); return page.evaluate(([i, box]) => ({ x: box.x + Dawn.CELLS[i].x / 720 * box.width, y: box.y + Dawn.CELLS[i].y / 720 * box.height }), [index, box]); };
    await page.evaluate(() => { game.cells.forEach(c => c.tower = null); game.place(0, 'arrow', 1); game.place(5, 'arrow', 1); game.place(3, 'cannon', 2); selected = -1; });
    let a = await point(0), b = await point(5);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 }); await page.mouse.move(b.x, b.y, { steps: 4 });
    assert.equal(await page.evaluate(() => drag && drag.over), 5);
    await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [game.cells[0].tower, game.cells[5].tower.tier, game.merges]), [null, 2, 1]);

    // 눌러서 고르고 빈 칸을 눌러 이동, 판매
    a = await point(3); b = await point(10);
    await page.mouse.click(a.x, a.y);
    assert.equal(await page.evaluate(() => selected), 3);
    assert.match(await page.locator('#selection').textContent(), /고급 폭발탑/);
    assert.equal(await page.locator('#sell').isVisible(), true);
    await page.mouse.click(b.x, b.y);
    assert.deepEqual(await page.evaluate(() => [game.cells[3].tower, game.cells[10].tower.type, selected]), [null, 'cannon', -1]);
    await page.mouse.click(b.x, b.y); await page.keyboard.press('x');
    assert.equal(await page.evaluate(() => game.cells[10].tower), null);

    // 길에 닿지 않는 타워 경고
    await page.evaluate(() => { game.place(5, 'frost', 1); selected = 5; sync(); });
    assert.match(await page.locator('#selection').textContent(), /길에 닿지 않습니다/);

    // 화력 강화, 섬광, 배속, 일시정지
    await page.evaluate(() => { game.gold = 500; game.spawn('grunt', 300); selected = -1; sync(); });
    await page.click('#amplify'); assert.equal(await page.evaluate(() => game.amplified), 1);
    await page.click('#flash'); assert.equal(await page.evaluate(() => game.flashCd > 29), true); assert.equal(await page.locator('#flash').isDisabled(), true);
    await page.click('#battleSpeed'); assert.equal(await page.locator('#battleSpeed').textContent(), '×2');
    await page.keyboard.press('p');
    assert.equal(await page.locator('#overlayTitle').textContent(), '일시정지');
    const frozen = await page.evaluate(() => game.time); await page.waitForTimeout(250); assert.equal(await page.evaluate(() => game.time), frozen);
    await page.click('#start'); await page.waitForTimeout(250);
    assert.ok(await page.evaluate(() => game.time) > frozen, '계속하면 시간이 흐른다');

    // 연구: 여는 동안 멈추고, 에테르로 단계를 올린다
    await page.evaluate(() => { game.gold = 120; sync(); });
    await page.click('#research');
    assert.equal(await page.locator('#overlayTitle').textContent(), '타워 연구');
    assert.equal(await page.locator('#researchList button').count(), await page.evaluate(() => Dawn.DECK.length));
    const held = await page.evaluate(() => game.time);
    await page.click('#researchList [data-research="arrow"]');
    assert.deepEqual(await page.evaluate(() => [game.research.arrow, game.gold]), [1, 70]);
    assert.equal(await page.locator('#researchList [data-research="arrow"]').isDisabled(), true, '에테르가 모자라면 연구할 수 없다');
    assert.equal(await page.evaluate(() => game.time), held);
    await page.click('#start'); assert.equal(await page.locator('#overlay').isHidden(), true); assert.equal(await page.evaluate(() => paused), false);

    // 군주 보상
    await page.evaluate(() => { game.enemies = []; game.wave = 5; game.spawnLimit = game.waveSize(5); game.spawned = game.spawnLimit; });
    await page.waitForFunction(() => game.state === 'reward');
    await page.waitForSelector('#rewardChoices button');
    assert.equal(await page.locator('#rewardChoices button').count(), 3);
    await page.locator('#rewardChoices button').first().click();
    assert.equal(await page.evaluate(() => game.state), 'running'); assert.equal(await page.locator('#overlay').isHidden(), true);

    // 패배와 점수 전송, 다시 시작
    await page.evaluate(() => { game.score = 4321; game.core = 1; game.spawn('grunt', Dawn.TRACK_LENGTH - 1); });
    await page.waitForFunction(() => game.state === 'lost');
    await page.waitForFunction(() => document.getElementById('start').textContent === '다시 도전');
    assert.equal(scores.length, 1); assert.equal(scores[0].gameId, 'dawn-bastion'); assert.equal(scores[0].score, 4321);
    assert.equal(await page.evaluate(() => localStorage.getItem('dawnMergeBest')), '4321');
    await page.click('#start');
    assert.deepEqual(await page.evaluate(() => [game.state, game.wave, game.core]), ['running', 1, 20]);

    // 휴대폰 폭에서도 가로로 넘치지 않고 버튼이 한 줄에 들어간다
    await page.setViewportSize({ width: 360, height: 760 }); await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음');
    const boxes = await page.evaluate(() => ['summon', 'amplify', 'flash'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
    assert.ok(boxes.every(box => box[0] === boxes[0][0] && box[1] >= 44), '행동 버튼 한 줄: ' + JSON.stringify(boxes));
    assert.ok(await page.evaluate(() => { const c = document.getElementById('gameCanvas'); return c.width >= c.getBoundingClientRect().width; }), '캔버스 해상도');

    assert.deepEqual(errors, []);
    console.log('dawn bastion browser: ok');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
