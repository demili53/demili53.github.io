// Builds the web app files: manifest.webmanifest, manifests/*.webmanifest and assets/app/*.png.
// Run after adding or renaming a game: NODE_PATH must provide Playwright (icons are drawn in Chromium).
// Keep APPS in step with the `apps` table and menu icons in scripts/site-layout.js.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

const APPS = [
  { id: 'partygame', url: '/', name: 'PartyGame 무료 게임', short: 'PartyGame', description: '랜덤타워디펜스와 무료 브라우저 게임 모음', bg: ['#ffbe82', '#e5772e'], fg: '#231a14', glyph: 'star' },
  { id: 'rift-blade', url: '/arcade/rift-blade.html', name: '던전엔드레곤', short: '던전엔드레곤', description: '횡스크롤 액션 로그라이트', bg: ['#7b2f45', '#2a1220'], fg: '#ffd1a9', paths: '<path d="m4 3 7 7m2 3 7 7M3 3l1 5 12 12 4-4L8 4 3 3Zm0 18 5-5m8-8 5-5m-5 0h5v5M3 16l5 5"/>' },
  { id: 'space-shooter', url: '/arcade/space-shooter.html', name: '1945EX', short: '1945EX', description: '세로 스크롤 비행기 슈팅', bg: ['#2c66b0', '#0e2244'], fg: '#d6ecff', paths: '<path d="m12 3 8 17-8-4-8 4 8-17Zm0 0v13"/>' },
  { id: 'missile-rush', url: '/arcade/missile-rush.html', name: '구글광고에나오는게임', short: '구글광고에나오는게임', description: '연산 관문 함대 증식 슈팅', bg: ['#d0532f', '#5e1a10'], fg: '#ffe7bf', paths: '<path d="M12 2c2 2 3 5 3 9v6H9v-6c0-4 1-7 3-9Zm-3 11-3 3v4l3-2m6-5 3 3v4l-3-2m-5 2v4m4-4v4"/>' },
  { id: 'fog-front', url: '/arcade/fog-front.html', name: '운빨좆망겜', short: '운빨좆망겜', description: '안개 정찰 타워 디펜스', bg: ['#337383', '#0f262d'], fg: '#c4fff0', paths: '<path d="M3 10h18M3 15h18M7 5v14M17 5v14"/><path d="M4 7c2-2 4 0 6-1s3-2 5-1 3 1 5 0"/>' },
  { id: 'lantern-keeper', url: '/arcade/lantern-keeper.html', name: '뱀파이어 온라인', short: '뱀파이어 온라인', description: '10분 생존 로그라이트', bg: ['#5d3487', '#1c0f2e'], fg: '#ffd88a', paths: '<path d="M9 3h6M12 3v2M7 9a5 5 0 0 1 10 0v7a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V9Zm0 0h10M12 12c1.4 1.3 1.4 3 0 4-1.4-1-1.4-2.7 0-4ZM9 21h6"/>' },
  { id: 'exam-sneak', url: '/arcade/exam-sneak.html', name: '들키면 재수', short: '들키면 재수', description: 'AI 수능 컨닝 게임', bg: ['#3a8048', '#13301a'], fg: '#eaffd6', paths: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 12h6M9 15h3"/><circle cx="17" cy="17" r="3.2"/><path d="m19.3 19.3 2 2"/>' },
  { id: 'shadow-sniper', url: '/arcade/shadow-sniper.html', name: '윌리를 찾아 보자', short: '윌리를 찾아 보자', description: '군중 속 숨은 그림 저격', bg: ['#a56a16', '#3a2406'], fg: '#fff0c4', paths: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>' },
  { id: 'tarot', url: '/fortune/tarot.html', name: '무료 타로점', short: '무료 타로점', description: '타로 카드 78장 무료 해석', bg: ['#5c3aa0', '#1d1240'], fg: '#f6e2ff', paths: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="m12 8 1.2 2.6 2.8.3-2.1 1.9.6 2.8L12 14.2l-2.5 1.4.6-2.8L8 10.9l2.8-.3L12 8Z"/>' }
];

const manifestPath = app => app.id === 'partygame' ? 'manifest.webmanifest' : `manifests/${app.id}.webmanifest`;
const iconUrl = (app, kind) => `/assets/app/${app.id}-${kind}.png`;

function manifest(app) {
  const data = {
    id: app.url,
    name: app.name,
    short_name: app.short,
    description: app.description,
    lang: 'ko',
    dir: 'ltr',
    start_url: app.url,
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    background_color: '#0c1117',
    theme_color: '#101722',
    categories: ['games', 'entertainment'],
    icons: [
      { src: iconUrl(app, '192'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconUrl(app, '512'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconUrl(app, 'maskable'), sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  // Long-pressing the PartyGame icon lists the games.
  if (app.id === 'partygame') data.shortcuts = APPS.slice(1).map(game => ({
    name: game.name, short_name: game.short, description: game.description, url: game.url,
    icons: [{ src: iconUrl(game, '192'), sizes: '192x192', type: 'image/png' }]
  }));
  return JSON.stringify(data, null, 2).replace(/\n/g, '\r\n') + '\r\n';
}

// kind: any = rounded tile with transparent corners, full = square tile (maskable, Apple).
function iconHtml(app, size, kind) {
  const glyphScale = kind === 'any' ? 0.56 : 0.48; // maskable keeps the glyph inside the 80% safe zone
  const radius = kind === 'any' ? size * 0.22 : 0;
  const inset = kind === 'any' ? size * 0.04 : 0;
  const g = size * glyphScale;
  const glyph = app.glyph === 'star'
    ? `<svg viewBox="0 0 24 24" width="${g}" height="${g}"><path fill="${app.fg}" d="M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5Z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="${g}" height="${g}" fill="none" stroke="${app.fg}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${app.paths}</svg>`;
  return `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:transparent">
    <div style="position:absolute;inset:${inset}px;border-radius:${radius}px;overflow:hidden;display:grid;place-items:center;
      background:radial-gradient(circle at 30% 22%,${app.bg[0]},${app.bg[1]} 78%);box-shadow:inset 0 0 0 ${size * 0.012}px #ffffff22">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#ffffff1f,#0000 55%)"></div>
      <div style="filter:drop-shadow(0 ${size * 0.02}px ${size * 0.03}px #0007);display:grid">${glyph}</div>
    </div></body></html>`;
}

(async () => {
  fs.mkdirSync(path.join(root, 'manifests'), { recursive: true });
  fs.mkdirSync(path.join(root, 'assets/app'), { recursive: true });
  for (const app of APPS) fs.writeFileSync(path.join(root, manifestPath(app)), manifest(app));
  const { chromium } = require('playwright');
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined);
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const app of APPS) {
    for (const [file, size, kind] of [['192', 192, 'any'], ['512', 512, 'any'], ['maskable', 512, 'full'], ['180', 180, 'full']]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(iconHtml(app, size, kind));
      await page.screenshot({ path: path.join(root, `assets/app/${app.id}-${file}.png`), omitBackground: kind === 'any' });
    }
  }
  await browser.close();
  console.log(`Built ${APPS.length} manifests and ${APPS.length * 4} icons`);
})().catch(error => { console.error(error); process.exit(1); });

