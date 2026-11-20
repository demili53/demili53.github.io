# 공통 페이지 구조

- 일반 페이지의 `<head>`에 `<script src="/scripts/site-layout.js" defer></script>`를 포함합니다.
- `<body>`의 첫 요소는 `<site-header></site-header>`, 마지막 요소는 `<site-footer></site-footer>`로 둡니다.
- 본문은 `<main id="mainContent" tabindex="-1">` 안에 작성합니다. 페이지 제목, 글의 안내문, 검색 필터, 게임 간 링크는 본문에 유지합니다.
- 사이트 메뉴, 로그인 정보, 공통 푸터의 HTML과 스타일은 `scripts/site-layout.js` 한 파일에서 수정합니다. 페이지마다 같은 메뉴를 복사하지 않습니다.
- Firebase 앱과 로그인 영속성 설정은 `scripts/firebase-client.js`에서 관리합니다. 계정 페이지와 게임 순위도 이 모듈의 `auth`를 사용합니다.
- 새 페이지도 공통 구조를 적용하고 `node scripts/test-site-layout.cjs`로 확인합니다.

## 공유·홈 화면 추가·웹앱

- 헤더의 공유 버튼: 휴대폰은 기기 공유 창(카카오톡 등), PC와 앱 안 브라우저는 링크 복사·X·페이스북·밴드 창을 엽니다. 공유 주소는 페이지의 canonical, 제목·설명은 og 메타를 씁니다.
- 헤더의 홈 화면 추가 버튼: Android Chrome·PC Chrome은 설치 창을 띄우고, 아이폰은 공유 → 홈 화면에 추가 안내를, 카카오톡 등 앱 안 브라우저는 기본 브라우저로 여는 버튼을 보여 줍니다. 홈 화면 아이콘으로 실행 중이면 숨깁니다. 이 버튼이 보이는 곳은 휴대폰이거나 브라우저가 설치를 허용할 때뿐입니다.
- 게임마다 매니페스트(`manifests/<게임>.webmanifest`, 메인은 `manifest.webmanifest`)와 아이콘(`assets/app/<게임>-192/512/maskable/180.png`)이 있어 홈 화면 아이콘이 그 게임으로 바로 열립니다. 매니페스트 링크와 apple-touch-icon은 `site-layout.js`가 `<head>`에 넣습니다.
- 게임을 추가하거나 이름을 바꾸면 `scripts/build-web-app.cjs`의 APPS, `site-layout.js`의 `apps` 표, `sw.js`의 PAGE_NAMES를 함께 고치고 Playwright가 있는 NODE_PATH에서 `node scripts/build-web-app.cjs`로 매니페스트와 아이콘을 다시 만듭니다.
- `sw.js`는 같은 사이트의 파일만 저장합니다. 페이지·스크립트·스타일은 네트워크 우선(4~6초 안에 응답이 없으면 저장본), 그림·소리는 저장본 우선 후 뒤에서 갱신합니다. 광고·분석·Firebase는 건드리지 않습니다. 문제가 생기면 `sw.js` 내용을 `self.registration.unregister();` 한 줄로 바꿔 푸시하면 모든 방문자에게서 꺼집니다.
- 확인: Playwright가 있는 NODE_PATH에서 `node scripts/test-web-app-browser.cjs`.
