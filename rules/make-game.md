## 아케이드 게임 페이지 작성 가이드

- 버전: `2026-07-02`
- 기준: `/arcade/` 하위 브라우저 미니게임 (단일 HTML)

1. **엔진 규칙 (필수)**
   - 새 게임은 반드시 **Matter.js** 또는 **Excalibur.js** 게임 엔진을 사용해 제작한다.
     - **Matter.js**: 물리/충돌/래그돌 기반 게임 (예: 사람 계단 굴리기, 자동차 사고 시뮬레이션)
       - CDN: `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js` (전역 `Matter`)
     - **Excalibur.js**: 액터/씬/게임루프 기반 아케이드·액션 게임 (예: 똥피하기, 배그 에임연습)
       - CDN: `https://cdn.jsdelivr.net/npm/excalibur@0.30.3/build/dist/excalibur.min.js` (전역 `ex`)
   - 두 엔진을 함께 사용해도 되지만, 최소 한 개 이상 반드시 포함한다.
   - 순수 `requestAnimationFrame` 루프나 수동 캔버스 렌더만으로 신규 게임을 만들지 않는다.
   - 엔진 스크립트는 인라인 게임 스크립트보다 **먼저** 로드한다 (`defer` 없이 동기 로드).
   - 사이드바 "조작 방법" 섹션 하단에 `Powered by <엔진명>` 링크를 표기한다.
     - Matter.js → `https://brm.io/matter-js/`
     - Excalibur.js → `https://excaliburjs.com/`

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
     - 하단: Minnit 채팅방 섹션 + 공통 푸터

5. **캔버스/게임 규칙**
   - 캔버스 id는 `gameCanvas`로 고정한다. (엔진에 이 캔버스를 연결)
   - 고정 내부 해상도를 정하고, 컨테이너에 맞춰 스케일링한다.
     - Excalibur: `displayMode: ex.DisplayMode.FitContainer`, `pointerScope: ex.PointerScope.Canvas`
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
   - 엔진(Matter.js/Excalibur.js) CDN이 게임 스크립트보다 먼저 로드되는지 확인
   - `/arcade/<game-slug>.html` 접근 및 게임 실행 확인
   - 마우스/터치 조작, 점수 집계, 최고 기록 저장, 다시하기 동작 확인
   - `Powered by <엔진>` 표기 확인
   - `/arcade/` 타일 추가 및 `sitemap.xml` 등록 확인
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
   - 배포 전 검증: 인라인 스크립트 구문 검사 + (가능 시) 실제 엔진 라이브러리로 초기화/1프레임 이상 런타임 확인
