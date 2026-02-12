## 심리테스트 제작 가이드

1. **기본 위치 및 구조**
   - 새 테스트는 모두 `/brainTest/pages/brainTest/`에 HTML 단일 파일로 작성한다.
   - Tailwind CDN 또는 기존 레이아웃을 재사용하고, 질문 흐름과 결과 계산 로직을 포함한다.
   - 모든 파일은 반드시 `UTF-8` 인코딩으로 작성한다.
   - `<head>` 영역에는 `<link rel="icon" type="image/x-icon" href="/favicon.ico">` 파비콘 태그를 반드시 추가한다.

2. **목록 및 홈 연동**
   - 테스트를 추가/수정하면 `brainTest/pages/list.json`에 `id`, `title`, `path`, `description`을 반드시 기록한다.
   - `index.html`의 카드 섹션도 `list.json` 내용과 동일하게 유지한다.
   - 홈으로 이동하는 버튼을 추가한다
   - sitemap.xml에도 추가한다.
  

3. **콘텐츠 작성 원칙**
   - 외부 서비스 정보를 참고하더라도 그대로 복사하지 말고 독자적으로 재구성한다.
   - 출처 표기는 페이지 내용에 직접 드러내지 않는다.
  

4. **UX 및 검수**
   - 최소 4개 이상의 결과 타입을 제공하고, 다시 시작·이전 버튼 등 기본 UX를 구현한다.
   - 파일 작성 후 실제 클릭 테스트(문항 이동, 결과 확인)를 통해 동작을 검수한다.
   - 결과페이지에는 항상 결과의 궁합을 표시하고 해당 결과의 링크도 포함한다.

5. **이미지 사용**
   - /brainTest/images 폴더에 적절한 이미지가 있을경우 해당 이미지를 사용합니다. 적절한 결과이미지가 없는경우  `https://pixabay.com/api/docs/` api를 사용해서 적절한 이미지를 images 폴더에 저용량 버전으로 저장한후 저장된 이미지를 사용합니다.
   - api key는 53761312-8e8e82ca5d56622afe4689c50 로 합니다.
   

6. **광고 스니펫**
   - `<meta name="google-adsense-account" content="ca-pub-1087435977438565">` 메타 태그를 `<head>` 안에 반드시 포함한다.
     <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565"
             crossorigin="anonymous"></script>
     
7. **공유 기능**
   - 결과 카드에는 카카오톡 공유 버튼을 필수로 배치한다.
   - `https://developers.kakao.com/sdk/js/kakao.min.js` 스크립트를 로드하고 전역에 `window.__KAKAO_APP_KEY__ = "af0f520240f2c824b721bbd002c45178"` 값을 지정한 뒤, `Kakao.init("af0f520240f2c824b721bbd002c45178")` → `Kakao.Share.sendDefault` 순으로 현재 테스트 링크를 공유한다.
   - 공유 버튼은 결과 노출 영역 하단에 위치시키고 클릭 시 공유 다이얼로그가 뜨도록 한다.

8. **결과 문구 분량**
   - 테스트 결과 설명 본문은 결과 타입별로 약 200자 내외로 작성한다.

9. **테스트 플랜 소스**
   - 테스트 주제 선정은 `rules/make-test-plan.md`에 있는 링크 목록을 기준으로 한다.
   - 새 테스트를 만들 때는 목록의 번호 순서대로 다음 항목을 사용한다.
   - 링크 1개당 테스트 1개를 작성하며, 원문을 복사하지 말고 주제/구성만 참고해 독자적으로 재구성한다.
