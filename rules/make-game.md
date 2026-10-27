# 게임 사이트 운영 가이드

- 메인은 `index.html`의 ‘새벽의 요새’ 디펜스 게임입니다. 엔진은 Phaser 4.2.1입니다.
- 선택 게임은 `arcade/space-shooter.html`의 비행기 슈팅이며 기존 Excalibur 엔진을 유지합니다.
- 사용자 요청 없이 블로그·순위 콘텐츠·생활 도구·다른 게임을 추가하지 않습니다.
- 메뉴와 로그인·푸터는 `scripts/site-layout.js`, 인증은 `scripts/firebase-client.js`에서 공통 관리합니다.
- `sitemap.xml`에는 메인과 비행기 게임의 대표 URL만 포함합니다. 대표 URL, OG·Twitter 메타, 실제 내용과 일치하는 VideoGame 구조화 데이터를 유지합니다.
- 이전 디펜스·게임 목록 주소는 메인으로 이동하고, 제공이 종료된 콘텐츠는 404로 처리합니다. 관련 없는 예전 페이지를 일괄 메인 리다이렉트하지 않습니다.
- 게임 구현 변경 후 `node scripts/test-dawn-bastion.cjs`, 사이트 변경 후 `node scripts/test-site-layout.cjs`와 `node scripts/test-site-seo.cjs`를 실행합니다.
- 브라우저 테스트는 Playwright가 있는 NODE_PATH에서 `node scripts/test-dawn-bastion-browser.cjs`로 실행합니다. 공유 이미지 재생성은 UPDATE_SHARE_IMAGES=1로 명시합니다.
- GitHub Pages에서는 `_config.yml`의 제외 목록으로 개발용 규칙·설정·테스트 파일을 배포에서 제외합니다.
