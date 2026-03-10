## 게임 순위 페이지 작성 가이드

- 버전: `2026-03-10`
- 기준: 날짜별 온라인 게임 Top 20 + 게임 스크린샷 + 설명

1. **기본 위치 및 구조**
   - 페이지 경로는 `/game-ranking/index.html`을 사용한다.
   - 단일 HTML 파일로 작성한다.
   - 파일은 반드시 `UTF-8` 인코딩으로 저장한다.
   - `<head>`에는 `title`, `description`, `canonical`, `robots`, `og:*`, 파비콘 태그를 포함한다.

2. **필수 메타/광고 스니펫**
   - 아래 메타/스크립트를 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

3. **순위 데이터 규칙**
   - 날짜별 데이터 구조를 사용한다.
   - 날짜 포맷은 `YYYY-MM-DD`로 통일한다.
   - 날짜별 순위는 반드시 `Top 20`으로 구성한다.
   - 1~20위 번호가 누락되지 않도록 렌더링한다.

4. **게임 카드 구성 규칙**
   - 각 순위 카드에 아래 항목을 포함한다.
     - 순위 번호
     - 게임명
     - 장르
     - 한 줄 설명
     - 공식 페이지 링크
   - 카드에는 게임 공식 페이지 스크린샷 이미지를 포함한다.

5. **스크린샷 규칙**
   - 스크린샷은 외부 미리보기 URL을 사용한다.
     - 예: `https://s.wordpress.com/mshots/v1/<인코딩된 URL>?w=1200`
   - 이미지 `alt` 텍스트는 `게임명 + 스크린샷` 형태로 작성한다.

6. **인터랙션 규칙**
   - 상단에 날짜 선택 버튼 영역을 둔다.
   - 날짜 버튼 클릭 시 해당 날짜의 Top 20 목록이 즉시 갱신되어야 한다.
   - 기본 선택 날짜는 최신 날짜로 설정한다.

7. **외부 링크 안전 규칙**
   - 공식 페이지 링크는 새 창으로 연다. (`target="_blank"`)
   - `rel="noopener noreferrer nofollow"`를 반드시 적용한다.
   - 불법/사행성/성인 유도 링크를 포함하지 않는다.

8. **UI/반응형 규칙**
   - Tailwind 기반 다크 그라데이션 톤을 사용한다.
   - 모바일 우선 레이아웃으로 작성한다.
   - 권장 카드 그리드: `sm 2열`, `lg 3열`

9. **사이트 연동 규칙**
   - 홈(`index.html`) 상단 네비와 하단 푸터에 `/game-ranking/` 링크를 추가/유지한다.
   - `sitemap.xml`에 아래 URL을 추가/유지한다.
     - `https://partygame.pe.kr/game-ranking/`

10. **검수 체크리스트**
   - `/game-ranking/` 접근 확인
   - 날짜 버튼 전환 시 목록 변경 확인
   - 날짜별 1~20위 노출 확인
   - 카드별 스크린샷/설명/공식 링크 표시 확인
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
