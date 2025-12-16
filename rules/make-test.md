## 심리테스트 제작 가이드

1. **기본 위치 및 구조**
   - 새 테스트는 모두 `/brainTest/pages/brainTest/`에 HTML 단일 파일로 작성한다.
   - Tailwind CDN 또는 기존 레이아웃을 재사용하고, 질문 흐름과 결과 계산 로직을 포함한다.

2. **목록 및 홈 연동**
   - 테스트를 추가/수정하면 `brainTest/pages/list.json`에 `id`, `title`, `path`, `description`을 반드시 기록한다.
   - `index.html`의 카드 섹션도 `list.json` 내용과 동일하게 유지한다.
  

3. **콘텐츠 작성 원칙**
   - 외부 서비스 정보를 참고하더라도 그대로 복사하지 말고 독자적으로 재구성한다.
   - 출처 표기는 페이지 내용에 직접 드러내지 않는다.

4. **UX 및 검수**
   - 최소 4개 이상의 결과 타입을 제공하고, 다시 시작·이전 버튼 등 기본 UX를 구현한다.
   - 파일 작성 후 실제 클릭 테스트(문항 이동, 결과 확인)를 통해 동작을 검수한다.
   - 결과페이지에는 항상 다른결과와 궁합을 표시하고 해당 결과의 링크도 포함한다.

5. **이미지 사용**
   - 결과 카드나 대표 이미지는 `https://unsplash.com/documentation` api를 사용해서 적절한 이미지를 사용합니다.

6. **광고 스니펫**
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">` 메타 태그를 `<head>` 안에 반드시 포함한다.
   - 아래 스크립트를 그대로 넣고 중복 실행되지 않도록 `window.__AD_SENSE_INITIALIZED__` 가드를 유지한다.
     ```html
     <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565"
             crossorigin="anonymous"></script>
     <script>
       window.adsbygoogle = window.adsbygoogle || [];
       if (!window.__AD_SENSE_INITIALIZED__) {
         window.adsbygoogle.push({
           google_ad_client: "ca-pub-1087435977438565",
           enable_page_level_ads: true
         });
         window.__AD_SENSE_INITIALIZED__ = true;
       }
     </script>
     ```

  
