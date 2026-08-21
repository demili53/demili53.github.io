## 아케이드 게임 페이지 작성 가이드

- 버전: `2026-08-21`
- 기준: `/arcade/` 하위 브라우저 미니게임 (단일 HTML)

1. **엔진 규칙 (필수)**
   - 새 게임은 반드시 **Matter.js** 또는 **Phaser** 게임 엔진을 사용해 제작한다.
     - **Matter.js**: 물리/충돌/래그돌 기반 게임 (예: 사람 계단 굴리기, 자동차 사고 시뮬레이션)
       - CDN: `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js` (전역 `Matter`)
     - **Phaser**: Scene/게임루프/입력/Arcade Physics 기반 아케이드·액션 게임
       - 공식 문서: `https://phaser.io/tools/phaser-docs`
       - CDN: `https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js` (전역 `Phaser`)
   - 두 엔진을 함께 사용해도 되지만, 최소 한 개 이상 반드시 포함한다.
   - 순수 `requestAnimationFrame` 루프나 수동 캔버스 렌더만으로 신규 게임을 만들지 않는다.
   - 엔진 스크립트는 인라인 게임 스크립트보다 **먼저** 로드한다 (`defer` 없이 동기 로드).
   - 사이드바 "조작 방법" 섹션 하단에 `Powered by <엔진명>` 링크를 표기한다.
     - Matter.js → `https://brm.io/matter-js/`
     - Phaser → `https://phaser.io/tools/phaser-docs`

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
     - Phaser: `scale.mode: Phaser.Scale.FIT`, `scale.autoCenter: Phaser.Scale.CENTER_BOTH`, `canvas: document.getElementById("gameCanvas")`
     - Matter: `Render` `options.pixelRatio: 1`, 컨테이너 aspect를 캔버스 `width/height` 비율과 일치시킨다.
   - `cursor`/`touch-action` 등 조작에 맞는 스타일을 캔버스에 적용한다. (`touch-action:none`)
   - 마우스와 터치 입력을 모두 지원한다.

6. **점수/기록 규칙**
   - 최고 기록은 `localStorage`에 게임별 고유 키로 저장/복원한다. (예: `carCrashBest`)
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
   - 엔진(Matter.js/Phaser) CDN이 게임 스크립트보다 먼저 로드되는지 확인
   - `/arcade/<game-slug>.html` 접근 및 게임 실행 확인
   - 마우스/터치 조작, 점수 집계, 최고 기록 저장, 다시하기 동작 확인
   - `Powered by <엔진>` 표기 확인
   - `/arcade/` 타일 추가 및 `sitemap.xml` 등록 확인
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
   - Firebase 앱이 한 번만 초기화되고 배포된 HTTPS 페이지에서 Analytics 요청 오류가 없는지 확인
   - 배포 전 검증: 인라인 스크립트 구문 검사 + (가능 시) 실제 엔진 라이브러리로 초기화/1프레임 이상 런타임 확인

10. **Firebase 앱 연동 규칙 (필수)**
   - 신규 `/arcade/` 게임 페이지에는 아래 Firebase Web SDK 모듈 스크립트를 한 번만 추가한다.
   - `initializeApp(firebaseConfig)` 호출은 페이지당 한 번만 실행하고, 반환된 앱으로 Analytics를 초기화한다.
   - Firebase 모듈 스크립트는 일반 인라인 게임 스크립트와 분리한다. 게임 엔진의 전역 객체(`Phaser`, `Matter`) 초기화 순서에 영향을 주지 않도록 `<head>` 또는 게임 스크립트 앞에 배치한다.
   - 로컬 `file://` 실행 결과만으로 Analytics 성공 여부를 판단하지 않는다. Analytics는 배포된 HTTPS 주소에서 최종 확인한다.
   - 아래 웹 설정값은 Firebase 클라이언트 식별 정보다. Firebase Admin SDK 키, 서비스 계정 JSON, 개인키 등 서버 비밀정보는 HTML이나 저장소에 절대 추가하지 않는다.
   - 회원가입·로그인은 공용 `/account.html`에서 처리한다. 게임 페이지에서 별도 가입 폼을 중복 구현하지 말고 공통 네비게이션에 `회원 계정` 링크를 제공한다.
   - 인증이 필요한 기능은 `onAuthStateChanged`로 초기 인증 확인이 끝난 다음 노출한다. `auth.currentUser`를 페이지 로드 직후 바로 신뢰하지 않는다.
   - 비밀번호를 `localStorage`, 쿠키, 게임 저장 데이터 또는 로그에 기록하지 않는다.

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
