## 토렌트 허브 작성 가이드

- 버전: `2026-03-09`
- 기준: 일일 토렌트 순위 탭 + 사이트 설명/링크 모음 탭

1. **기본 위치 및 구조**
   - 허브 메인 페이지는 `/torrent/index.html`을 사용한다.
   - 탭 페이지는 `/torrent/tabs/` 아래에 HTML 단일 파일로 작성한다.
   - 기본 탭은 2개로 고정한다.
     - `daily-ranking.html` (일일 토렌트 순위)
     - `site-directory.html` (사이트 설명 + 링크 모음)
   - 파일명은 영문 소문자 kebab-case를 사용한다.
   - 모든 파일은 반드시 `UTF-8` 인코딩으로 작성한다.
   - 모든 페이지의 `<head>`에는 `title`, `description`, `canonical`, `robots`, `og:*`, 파비콘 태그를 포함한다.

2. **필수 메타/광고 스니펫**
   - 모든 탭 페이지에 아래 메타/스크립트를 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

3. **탭 UI 규칙**
   - 상단 탭 네비는 2개 탭을 항상 노출한다.
   - 현재 탭은 시각적으로 구분한다. (`aria-current="page"` 사용)
   - 모바일 우선 레이아웃으로 작성하고, 360px 너비에서도 버튼/링크 터치가 가능해야 한다.
   - 공통 스타일 톤은 기존 사이트와 통일한다. (Tailwind 기반 다크 그라데이션 계열)

4. **일일 순위 탭(`daily-ranking.html`) 규칙**
   - 리스트는 순위, 제목, 카테고리, 기준일, 상세 링크를 포함한다.
   - 기준일 표기는 `YYYY-MM-DD` 형식으로 통일한다.
   - 데이터가 없을 때를 대비한 빈 상태 UI를 반드시 포함한다.
   - 정렬 기본값은 순위 오름차순(1위부터)으로 유지한다.
   - 동일 항목 중복 노출을 금지한다. (동일 URL 기준 dedupe)

5. **사이트 설명/링크 탭(`site-directory.html`) 규칙**
   - 각 카드에 `사이트명`, `한 줄 설명`, `링크`, `주의사항`을 포함한다.
   - 링크는 새 창으로 열되 `rel="noopener noreferrer nofollow"`를 사용한다.
   - 성인/도박/피싱/악성코드 의심 사이트는 등록 금지한다.
   - 깨진 링크(4xx/5xx) 또는 리다이렉트 루프 링크는 등록 금지한다.

6. **콘텐츠/법적 안전 원칙**
   - 저작권 침해를 조장하거나 불법 다운로드를 직접 유도하는 문구를 금지한다.
   - 페이지 하단에 안내 문구를 고정한다.
     - "본 페이지는 정보 제공 목적이며, 저작권 및 관련 법규 준수 책임은 이용자에게 있습니다."
   - 불법/유해 콘텐츠 신고를 위한 연락 경로(`/contact.html`)를 명시한다.

7. **사이트 연동 규칙**
   - 홈(`index.html`) 또는 관련 허브 페이지에서 `/torrent/` 진입 링크를 유지한다.
   - `sitemap.xml`에 아래 URL을 반드시 추가한다.
     - `/torrent/`
     - `/torrent/tabs/daily-ranking.html`
     - `/torrent/tabs/site-directory.html`

8. **검수 체크리스트**
   - 탭 이동 동작 확인: `/torrent/ -> daily-ranking -> site-directory`
   - SEO 태그 확인: `title`, `description`, `canonical`, `og:title`, `og:description`
   - 링크 점검: 외부 링크 정상 응답(최소 1회 수동 확인)
   - 모바일 가독성 확인: 줄간격, 카드 간격, 터치 영역
   - 오탈자/중복 카드/죽은 링크 점검
