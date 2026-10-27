# 공통 페이지 구조

- 일반 페이지의 `<head>`에 `<script src="/scripts/site-layout.js" defer></script>`를 포함합니다.
- `<body>`의 첫 요소는 `<site-header></site-header>`, 마지막 요소는 `<site-footer></site-footer>`로 둡니다.
- 본문은 `<main id="mainContent" tabindex="-1">` 안에 작성합니다. 페이지 제목, 글의 안내문, 검색 필터, 게임 간 링크는 본문에 유지합니다.
- 사이트 메뉴, 로그인 정보, 공통 푸터의 HTML과 스타일은 `scripts/site-layout.js` 한 파일에서 수정합니다. 페이지마다 같은 메뉴를 복사하지 않습니다.
- Firebase 앱과 로그인 영속성 설정은 `scripts/firebase-client.js`에서 관리합니다. 계정 페이지와 게임 순위도 이 모듈의 `auth`를 사용합니다.
- 새 페이지도 공통 구조를 적용하고 `node scripts/test-site-layout.cjs`로 확인합니다.
