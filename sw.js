// PartyGame web app service worker: keeps visited pages and game files for offline play.
// Pages, scripts and styles come from the network first so updates show at once;
// images and sounds come from the cache first and refresh in the background.
// Only same-origin GET requests are handled. Ads, analytics and Firebase pass straight through.
// Emergency off switch: replace this file with `self.registration.unregister()` and push.
const VERSION = '20261120a';
const SHELL = `partygame-shell-${VERSION}`;
const RUNTIME = 'partygame-runtime';
const MAX_RUNTIME_ENTRIES = 300;
const PRECACHE = ['/', '/manifest.webmanifest', '/scripts/site-layout.js', '/styles/site-design.css', '/assets/app/partygame-192.png'];
const PAGE_NAMES = {
  '/': '랜덤타워디펜스', '/arcade/rift-blade.html': '던전엔드레곤', '/arcade/space-shooter.html': '1945EX',
  '/arcade/missile-rush.html': '구글광고에나오는게임', '/arcade/fog-front.html': '운빨좆망겜',
  '/arcade/lantern-keeper.html': '뱀파이어 온라인', '/arcade/exam-sneak.html': '들키면 재수',
  '/arcade/shadow-sniper.html': '윌리를 찾아 보자', '/fortune/tarot.html': '무료 타로점'
};
const MEDIA = /\.(?:png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav|m4a|woff2?)$/i;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('partygame-shell-') && key !== SHELL).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/') || url.pathname === '/sw.js') return;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request, pageKey(url)));
  else if (MEDIA.test(url.pathname)) event.respondWith(cacheFirst(request, event));
  else event.respondWith(networkFirst(request, request));
});

function pageKey(url) {
  return url.origin + url.pathname.replace(/index\.html$/, '');
}

function cacheable(response) {
  return response && response.ok && response.type === 'basic' && !response.redirected;
}

async function remember(key, response) {
  const cache = await caches.open(RUNTIME);
  await cache.put(key, response);
  const keys = await cache.keys();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES))) await cache.delete(old);
}

async function cached(key) {
  return (await caches.open(RUNTIME).then(cache => cache.match(key))) || caches.match(key, { ignoreSearch: typeof key === 'string' });
}

// Waits up to a few seconds for the network, then falls back to the saved copy.
async function networkFirst(request, key) {
  const isPage = typeof key === 'string';
  const network = fetch(request).then(response => {
    if (cacheable(response)) remember(key, response.clone()).catch(() => {});
    return response;
  });
  network.catch(() => {});
  try {
    return await Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), isPage ? 4000 : 6000))]);
  } catch {
    const hit = await cached(key);
    if (hit) return hit;
    try { return await network; } catch { return isPage ? offlinePage() : Response.error(); }
  }
}

async function cacheFirst(request, event) {
  const hit = await cached(request);
  const network = fetch(request).then(response => {
    if (cacheable(response)) return remember(request, response.clone()).then(() => response);
    return response;
  });
  if (hit) {
    event.waitUntil(network.catch(() => {}));
    return hit;
  }
  return network.catch(() => Response.error());
}

async function offlinePage() {
  const keys = await caches.open(RUNTIME).then(cache => cache.keys()).catch(() => []);
  const saved = keys.map(request => new URL(request.url).pathname).filter(path => PAGE_NAMES[path]);
  const links = saved.map(path => `<li><a href="${path}">${PAGE_NAMES[path]}</a></li>`).join('');
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>오프라인 · PartyGame</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c1117;color:#e8eefa;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
main{max-width:360px}h1{font-size:22px;margin:0 0 10px}p{color:#9fb0c2;line-height:1.7;font-size:14px}ul{list-style:none;padding:0;display:grid;gap:8px}
a,button{display:block;padding:12px;border-radius:10px;background:#1b2639;border:1px solid #35455d;color:#ffd1a9;text-decoration:none;font:inherit;width:100%;box-sizing:border-box}</style></head>
<body><main><h1>인터넷에 연결되어 있지 않아요</h1><p>${links ? '전에 열었던 게임은 지금도 할 수 있어요.' : '연결되면 다시 시도해 주세요. 한 번 열었던 게임은 다음부터 오프라인에서도 열립니다.'}</p>
<ul>${links}</ul><button onclick="location.reload()">다시 시도</button></main></body></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
