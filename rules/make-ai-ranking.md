## AI 순위 페이지 작성 가이드

1. **기본 위치 및 구조**
   - 페이지 경로는 `/ai-ranking/index.html`을 사용한다.
   - 단일 HTML 파일로 작성한다.
   - 파일은 반드시 `UTF-8` 인코딩으로 저장한다.
   - `<head>`에는 `title`, `description`, `canonical`, `robots`, `og:*`, 파비콘 태그를 포함한다.

2. **필수 메타/광고 스니펫**
   - 아래 메타/스크립트를 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

3. **콘텐츠 구성 규칙**
   - 제목은 `AI 생성 사이트 순위` 형태를 유지한다.
   - 상단에 업데이트 날짜를 표기한다. (`YYYY-MM-DD`)
   - 카드형 순위 목록을 사용한다.
   - 각 카드에는 아래 4가지를 반드시 포함한다.
     - 순위 번호 (`#1`, `#2` ...)
     - 사이트명
     - 한 줄 설명
     - 외부 링크 버튼(예: `사이트 바로가기`)

4. **스크린샷 규칙**
   - 각 사이트 카드는 페이지 스크린샷 이미지를 포함한다.
   - 스크린샷은 외부 미리보기 URL을 사용한다.
     - 예: `https://s.wordpress.com/mshots/v1/<인코딩된 URL>?w=1200`
   - 이미지 `alt` 텍스트는 `사이트명 + 페이지 스크린샷` 형태로 작성한다.

5. **외부 링크 안전 규칙**
   - 모든 외부 링크는 새 창으로 연다. (`target="_blank"`)
   - `rel="noopener noreferrer nofollow"`를 반드시 적용한다.
   - 서비스 소개 목적 외 불법/유해 유도 문구를 금지한다.

6. **UI/반응형 규칙**
   - Tailwind 기반 다크 그라데이션 톤을 사용한다.
   - 카드 레이아웃은 모바일 우선으로 구성한다.
   - 권장 그리드: `sm 2열`, `lg 3열` 또는 동급 가독성 구조

7. **사이트 연동 규칙**
   - 홈(`index.html`) 상단 네비와 하단 푸터에 `/ai-ranking/` 링크를 추가/유지한다.
   - `sitemap.xml`에 아래 URL을 추가/유지한다.
     - `https://partygame.pe.kr/ai-ranking/`

8. **검수 체크리스트**
   - `/ai-ranking/` 접근 확인
   - 카드별 스크린샷 표시 확인
   - 카드별 외부 링크 동작 확인
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
   - 모바일에서 카드 간격/텍스트 가독성 확인
