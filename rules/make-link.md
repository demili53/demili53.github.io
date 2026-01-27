## 링크 재수집 가이드

목표:  
`https://poomang.com/search?q=%ED%91%B8%EB%A7%9D%EC%9D%B4%20%EB%A7%8C%EB%93%A0%20%EB%AA%A8%EB%93%A0%20%EC%8B%AC%EB%A6%AC%ED%85%8C%EC%8A%A4%ED%8A%B8` 페이지를 끝까지 스크롤 하며 등장하는 모든 테스트 카드의 제목·URL을 추출하고, `sourceList/poomangList.json`을 최신 데이터로 갱신한다.

---

### 1. 수집 스크립트 생성
```bash
mkdir -p scripts
cat > scripts/fetchPoomangTests.js <<'EOF'
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const SEARCH_URL = 'https://poomang.com/search?q=%ED%91%B8%EB%A7%9D%EC%9D%B4%20%EB%A7%8C%EB%93%A0%20%EB%AA%A8%EB%93%A0%20%EC%8B%AC%EB%A6%AC%ED%85%8C%EC%8A%A4%ED%8A%B8';
const OUTPUT = path.join(__dirname, '..', 'sourceList', 'poomangList.json');

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let prev = -1;
      const timer = setInterval(() => {
        const current = document.scrollingElement.scrollTop;
        window.scrollBy(0, 600);
        if (current === prev) {
          clearInterval(timer);
          resolve();
        } else {
          prev = current;
        }
      }, 200);
    });
  });
}

async function collect() {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  await page.setViewport({width: 520, height: 960});
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.goto(SEARCH_URL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('a[href^="/detail/"]', {timeout: 20000});

  let count = 0;
  let stable = 0;
  while (stable < 5) {
    await autoScroll(page);
    await page.waitForTimeout(1200);
    const next = await page.evaluate(() => document.querySelectorAll('a[href^="/detail/"]').length);
    if (next === count) stable += 1;
    else {
      count = next;
      stable = 0;
    }
  }

  const tests = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/detail/"]'));
    const dedup = new Map();
    anchors.forEach(a => {
      const href = a.href;
      if (!href || dedup.has(href)) return;
      const title = (a.innerText || '').split('\n').map(t => t.trim()).filter(Boolean)[0] || null;
      dedup.set(href, {title, url: href});
    });
    return Array.from(dedup.values());
  });

  const payload = {
    source: SEARCH_URL,
    generatedAt: new Date().toISOString(),
    total: tests.length,
    tests
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved ${payload.total} entries → ${OUTPUT}`);
  await browser.close();
}

collect().catch(err => {
  console.error(err);
  process.exit(1);
});
EOF
```

### 2. 의존성 설치 및 실행
```bash
npm init -y
npm install puppeteer@24.15.0
node scripts/fetchPoomangTests.js
```

### 3. 정리
```bash
rm -rf node_modules package.json package-lock.json scripts
```

실행이 완료되면 `sourceList/poomangList.json`에 최신 카드 목록이 저장된다.
