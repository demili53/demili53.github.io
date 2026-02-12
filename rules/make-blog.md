## 블로그 작성 가이드

1. **기본 위치 및 구조**
   - 블로그 목록은 `/blog/index.html`을 사용한다.
   - 신규 글은 `/blog/posts/` 아래에 HTML 단일 파일로 작성한다.
   - 파일명은 영문 소문자 kebab-case를 사용한다. 예: `how-to-read-test-results.html`
   - 모든 파일은 반드시 `UTF-8` 인코딩으로 작성한다.
   - `<head>`에는 `canonical`, `description`, `robots`, `og:*`, 파비콘 태그를 반드시 포함한다.

2. **필수 메타/광고 스니펫**
   - 모든 글 페이지에 아래 메타/스크립트를 포함한다.
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">`
   - `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>`

3. **콘텐츠 원칙**
   - 작성자는 30대 여성 감성으로 글을 작성한다.
   - 블로그 주제는 최근 이슈가 되고 있는 `연애` 또는 `경제` 소재로 작성한다.
   - 글 단위로 주제를 분리한다. 한 글에서 `연애`와 `경제`를 혼합하지 않는다.
   - 운영 시 `연애` 글과 `경제` 글을 균형 있게 구성한다.
   - 주제 선정 시 구글/네이버에서 검색량이 높은 연애·경제 이슈 키워드를 우선 반영한다.
   - 글은 정보형/해설형 중심으로 작성한다. (테스트 해석법, 관계 대화 팁, 감정 표현 가이드)
   - 글 길이는 최소 1000자 이상으로 작성한다.
   - 최소 3개 이상 섹션으로 구성하고, 각 섹션은 실전 적용 가능한 문장을 포함한다.
   - 외부 자료를 참고하더라도 문장/구조를 그대로 복사하지 말고 독자적으로 재구성한다.
   - 의료/심리 진단으로 오해될 수 있는 확정적 표현은 피한다.

4. **목록 연동 규칙**
   - 새 글을 추가하면 `/blog/index.html`의 `posts` 배열에 `title`, `path`, `summary`, `tags`를 반드시 추가한다.
   - 목록 검색/태그 필터에서 노출되는지 확인한다.

5. **사이트 연동**
   - 홈(`index.html`)의 상단 네비와 하단 푸터에서 블로그 링크(`/blog/`)가 유지되도록 한다.
   - `sitemap.xml`에 블로그 목록 URL과 신규 글 URL을 반드시 추가한다.

6. **검수 체크리스트**
   - 링크 동작 확인: `index.html -> /blog/ -> /blog/posts/...`
   - SEO 태그 확인: `title`, `description`, `canonical`, `og:title`, `og:description`
   - 모바일 가독성 확인: 본문 줄간격, 버튼 간격, 터치 영역
   - 맞춤법 및 문장 중복 점검

7. **이미지 사용**
   - `/brainTest/images` 폴더에 적절한 이미지가 있을 경우 해당 이미지를 사용합니다.
   - 적절한 이미지가 없는 경우 `https://pixabay.com/api/docs/` API를 사용해서 적절한 이미지를 `/brainTest/images` 폴더에 저용량 버전으로 저장한 후, 저장된 이미지를 사용합니다.
   - API key는 `53761312-8e8e82ca5d56622afe4689c50`를 사용합니다.
