## 과일 순위 페이지 작성 가이드

- 버전: `2026-03-10`
- 기준: 건강에 좋은 과일 순위 Top 20 + 과일별 한 줄 영양 설명

1. **기본 위치 및 구조**
   - 페이지 경로는 `/fruit-ranking/index.html`을 사용한다.
   - 단일 HTML 파일로 작성한다.
   - 파일은 반드시 `UTF-8` 인코딩으로 저장한다.
   - `<head>`에는 `title`, `description`, `canonical`, `robots`, `og:*`, 파비콘 태그를 포함한다.

2. **필수 메타/광고 스니펫**
   - 아래 메타/스크립트를 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

3. **순위 콘텐츠 규칙**
   - 반드시 `Top 20`을 채운다. (1~20위 누락 금지)
   - 각 순위 항목은 아래를 포함한다.
     - 순위 번호
     - 과일명
     - 핵심 영양/특징 한 줄 설명
   - 의료적 효능을 단정하는 표현은 금지한다.
   - 페이지 하단에 일반 정보 목적 안내 문구를 포함한다.

4. **표현/문장 규칙**
   - 과장형 표현보다 중립적 정보형 문장을 우선한다.
   - 질환 치료·예방을 확정적으로 말하지 않는다.
   - 특정 제품/브랜드 광고성 문구를 넣지 않는다.

5. **UI/반응형 규칙**
   - Tailwind 기반 다크 그라데이션 톤을 사용한다.
   - 카드형 목록을 기본으로 한다.
   - 모바일 우선 레이아웃으로 작성한다.
   - 권장 그리드: `sm 2열`, `lg 3열`

6. **사이트 연동 규칙**
   - 홈(`index.html`) 상단 네비와 하단 푸터에 `/fruit-ranking/` 링크를 추가/유지한다.
   - `sitemap.xml`에 아래 URL을 추가/유지한다.
     - `https://partygame.pe.kr/fruit-ranking/`

7. **검수 체크리스트**
   - `/fruit-ranking/` 접근 확인
   - 1~20위 전체 노출 확인
   - 오탈자/중복 과일 점검
   - SEO 태그(`title`, `description`, `canonical`, `og:title`, `og:description`) 확인
   - 모바일 가독성(카드 간격/줄간격) 확인
