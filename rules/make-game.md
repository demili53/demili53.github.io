## 아케이드 게임 페이지 작성 가이드

- 버전: `2026-08-26`
- 기준: `/arcade/` 하위 브라우저 미니게임 (단일 HTML)

1. **엔진 규칙 (필수)**
   - 새 게임은 **PixiJS**를 기본 엔진으로 사용해 제작한다.
     - 공식 가이드: `https://pixijs.com/8.x/guides/`
     - CDN: `https://cdn.jsdelivr.net/npm/pixi.js@8.20.0/dist/pixi.min.js` (전역 `PIXI`)
     - `PIXI.Application`, `app.ticker`, `Container`, `Sprite`, `Graphics`, `Assets`를 사용해 게임 루프와 렌더링을 구성한다.
   - 래그돌·차량 충돌처럼 정교한 물리 시뮬레이션이 핵심인 게임에만 Matter.js를 PixiJS와 함께 사용할 수 있다.
   - 순수 `requestAnimationFrame` 루프나 수동 캔버스 렌더만으로 신규 게임을 만들지 않는다.
   - 엔진 스크립트는 인라인 게임 스크립트보다 **먼저** 로드한다 (`defer` 없이 동기 로드).
   - 사이드바 "조작 방법" 섹션 하단에 `Powered by <엔진명>` 링크를 표기한다.
     - PixiJS → `https://pixijs.com/8.x/guides/`
     - Matter.js 병용 시 → `https://brm.io/matter-js/`

2. **기본 위치 및 구조**
   - 페이지 경로는 `/arcade/<game-slug>.html`을 사용한다. (예: `/arcade/car-crash.html`)
   - 단일 HTML 파일로 작성하고 `UTF-8`로 저장한다.
   - `<head>`에는 `title`, `description`, `keywords`, `canonical`, `robots`, `theme-color`, `og:*`, `twitter:*`, 파비콘 태그를 포함한다.
   - `<link rel="stylesheet" href="/styles/site-theme.css">`와 Tailwind CDN(`https://cdn.tailwindcss.com`)을 포함한다.

3. **필수 메타/광고 스니펫**
   - 상단에 GTM 스니펫(`GTM-T2KDKBN8`)과 noscript 블록을 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

4. **페이지 레이아웃 규칙**
   - [공통 페이지 구조](site-layout.md)를 적용한다. 상단 메뉴·로그인 정보·공통 푸터는 페이지에 직접 복사하지 않는다.
   - 다른 아케이드 게임과 동일한 구조를 사용한다.
     - 상단 공통 네비게이션(홈/블로그/온라인 PC게임/각종 순위/문의하기)
     - 헤더: 카테고리 라벨 + `h1` 게임명 + 한 줄 설명 + 게임 조작 버튼
     - 게임 상호 링크 3-카드 섹션 (본 게임 `aria-current="page"` + 다른 게임 2개)
     - 게임 영역: `aspect-*` 컨테이너 안에 `<canvas id="gameCanvas">`
     - 사이드바: 기록(점수/최고 등) HUD + 조작 방법(+엔진 표기)
     - 하단: 공통 푸터

5. **캔버스/게임 규칙**
   - 캔버스 id는 `gameCanvas`로 고정한다. (엔진에 이 캔버스를 연결)
   - 고정 내부 해상도를 정하고, 컨테이너에 맞춰 스케일링한다.
     - PixiJS 8: `await app.init({ canvas, width, height, autoDensity: true, resolution: Math.min(devicePixelRatio, 2) })`
     - 캔버스 CSS는 `width:100%; height:100%`로 두고 컨테이너 aspect를 내부 해상도 비율과 일치시킨다.
   - `cursor`/`touch-action` 등 조작에 맞는 스타일을 캔버스에 적용한다. (`touch-action:none`)
   - 마우스와 터치 입력을 모두 지원한다.

6. **점수/기록 규칙**
   - 최고 기록은 `localStorage`에 게임별 고유 키로 저장/복원한다. (예: `carCrashBest`)
   - 모든 점수형 게임은 `/scripts/firebase-game-ranking.js`의 `initializeGameRanking()`을 호출하고 게임별 고유 `gameId`를 사용한다.
   - 사이드바에 해당 게임의 Firebase `TOP 10` 순위를 표시한다.
   - 게임 종료 시 `partygame:score` 이벤트에 `gameId`, `score`, `wave`를 담아 전달한다.
   - 비로그인 사용자는 순위를 열람하고 로컬 최고 기록을 유지하며, 로그인 회원의 최고 점수만 Firebase에 저장한다.
   - Firebase에는 회원별·게임별 최고 점수 문서 하나만 유지하고 낮은 점수로 기존 기록을 덮어쓰지 않는다.
   - 결과/게임오버 시 오버레이로 결과를 표시하고 다시하기 흐름을 제공한다.
   - 시작/일시정지/다시하기 등 상태 전이를 명확한 상태값으로 관리한다. (`idle`/`running`/`over` 등)

7. **UI/반응형 규칙**
   - Tailwind 기반 다크 그라데이션 톤을 사용하고 게임마다 고유 액센트 색을 정한다.
   - 모바일 우선 레이아웃으로 작성한다.
   - 접근성: `skip-link`, `:focus-visible` 아웃라인, `aria-live` 상태 영역을 포함한다.

8. **사이트 연동 규칙 (등록)**
   - `/arcade/index.html` 게임 목록에 새 타일을 추가한다.
     - 타일 그라데이션 클래스(`.<slug>-tile::before`)를 스타일에 추가한다.
     - 아이콘/카테고리/제목/설명/기능칩/플레이 CTA를 다른 타일과 동일 구조로 작성한다.
   - `/arcade/index.html`의 소개문·`description`·`keywords` 메타에 새 게임을 반영한다.
   - `sitemap.xml`에 아래 형식으로 URL을 추가한다. (`<url>` 여닫음 균형 유지)
     - `https://partygame.pe.kr/arcade/<game-slug>.html`
   - 기존 게임 페이지의 3-카드 상호 링크에도 가능하면 새 게임을 노출한다.

9. **검수 체크리스트**
   - PixiJS CDN이 게임 스크립트보다 먼저 로드되는지 확인
   - `/arcade/<game-slug>.html` 접근 및 게임 실행 확인
   - 마우스/터치 조작, 점수 집계, 최고 기록 저장, 다시하기 동작 확인
   - `Powered by <엔진>` 표기 확인
   - `/arcade/` 타일 추가 및 `sitemap.xml` 등록 확인
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
   - Firebase 앱이 한 번만 초기화되고 배포된 HTTPS 페이지에서 Analytics 요청 오류가 없는지 확인
   - 게임별 TOP 10 조회, 로그인 회원의 최고 점수 저장, 낮은 점수 덮어쓰기 방지를 확인
   - 배포 전 검증: 인라인 스크립트 구문 검사 + (가능 시) 실제 엔진 라이브러리로 초기화/1프레임 이상 런타임 확인

10. **Firebase 앱 연동 규칙 (필수)**
   - 신규 `/arcade/` 게임 페이지에는 아래 Firebase Web SDK 모듈 스크립트를 한 번만 추가한다.
   - `initializeApp(firebaseConfig)` 호출은 페이지당 한 번만 실행하고, 반환된 앱으로 Analytics를 초기화한다.
   - Firebase 모듈 스크립트는 일반 게임 스크립트와 분리한다. 게임 엔진의 전역 객체(`PIXI`, 필요 시 `Matter`) 초기화 순서에 영향을 주지 않도록 `<head>` 또는 게임 스크립트 앞에 배치한다.
   - 로컬 `file://` 실행 결과만으로 Analytics 성공 여부를 판단하지 않는다. Analytics는 배포된 HTTPS 주소에서 최종 확인한다.
   - 아래 웹 설정값은 Firebase 클라이언트 식별 정보다. Firebase Admin SDK 키, 서비스 계정 JSON, 개인키 등 서버 비밀정보는 HTML이나 저장소에 절대 추가하지 않는다.
   - 회원가입·로그인은 공용 `/account.html`에서 처리한다. 게임 페이지에서 별도 가입 폼을 중복 구현하지 말고 공통 네비게이션에 `회원 계정` 링크를 제공한다.
   - 인증이 필요한 기능은 `onAuthStateChanged`로 초기 인증 확인이 끝난 다음 노출한다. `auth.currentUser`를 페이지 로드 직후 바로 신뢰하지 않는다.
   - 비밀번호를 `localStorage`, 쿠키, 게임 저장 데이터 또는 로그에 기록하지 않는다.
   - 공개 점수 쓰기는 허용하지 않는다. 저장소의 `firestore.rules`를 Firebase 프로젝트에 배포해 로그인한 회원이 자신의 게임별 문서만 갱신하도록 제한한다.

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCtCAly3XVVZTu0szIHAoQwYu0QaaXoNRM",
    authDomain: "gitpage-93dfb.firebaseapp.com",
    projectId: "gitpage-93dfb",
    storageBucket: "gitpage-93dfb.firebasestorage.app",
    messagingSenderId: "590509724278",
    appId: "1:590509724278:web:cb26ed63e8733ffa240557",
    measurementId: "G-0JPQ9J5Y18"
  };

  const app = initializeApp(firebaseConfig);
  getAnalytics(app);
</script>
```
