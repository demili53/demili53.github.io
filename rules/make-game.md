# 게임 사이트 운영 가이드

- 메인은 `index.html`의 ‘랜덤타워디펜스’ 디펜스 게임입니다. 엔진은 Phaser 4.2.1입니다.
- 선택 게임은 `arcade/space-shooter.html`의 비행기 슈팅 ‘1945EX’이며 자체 Canvas 2D 렌더러를 사용합니다(2026-11-20 전면 재구성, Excalibur 제거). 규칙은 `scripts/space-shooter-core.js`, 게임 루프는 `scripts/space-shooter.js`, 그림은 `scripts/shooter-sprites.js`, 세부 규칙은 `rules/games/space-shooter.md`입니다.
- 추가 게임 `arcade/shadow-sniper.html`은 ‘윌리를 찾아 보자’ 군중 속 인물 찾기·저격 게임이며 자체 Canvas 2D 렌더러를 사용합니다(2026-11-20 전면 재구성, Phaser 제거). 규칙은 `scripts/sniper-core.js`, 그림은 `scripts/sniper-art.js`, 게임 루프는 `scripts/shadow-sniper.js`, 세부 규칙은 `rules/games/shadow-sniper.md`입니다. 변경 후 `node scripts/test-shadow-sniper.cjs`와 `node scripts/test-shadow-sniper-browser.cjs`를 실행합니다.
- 추가 게임 `arcade/rift-blade.html`은 ‘던전엔드레곤’(옛 이름 균열의 검) 횡스크롤 액션 로그라이트(영웅 3종·5지역·수문장 5종·축복 선택)이며 자체 Canvas 2D 렌더러를 사용합니다. 규칙은 `scripts/rift-core.js`, 그림은 `scripts/rift-art.js`, 게임 루프·입력·화면은 `scripts/rift-blade.js`, 세부 규칙은 `rules/games/rift-blade.md`입니다. 변경 후 `node scripts/test-rift-blade.cjs`와 `node scripts/test-rift-blade-browser.cjs`를 실행합니다.
- 추가 게임 `arcade/missile-rush.html`은 ‘구글광고에나오는게임’ 세로형 무한 웨이브 슈팅이며, 줄지어 내려오는 연산 관문(+ − × ÷) 중 한 칸을 골라 지나가 기체 수와 화력이 바뀌는 방식이고 자체 Canvas 2D 렌더러를 사용합니다. 규칙은 `scripts/missile-rush-core.js`, 그리기는 `scripts/missile-rush-render.js`, 게임 진행은 `scripts/missile-rush.js`입니다.
- 추가 게임 `arcade/lantern-keeper.html`은 ‘뱀파이어 온라인’ 10분 생존 액션(자동 공격·불씨 경험치·레벨업 3택)이며 자체 Canvas 2D 렌더러를 사용합니다. 규칙과 수치는 `scripts/lantern-core.js`, 게임 루프는 `scripts/lantern-keeper.js`, 세부 규칙은 `rules/games/lantern-keeper.md`입니다. 변경 후 `node scripts/test-lantern-keeper.cjs`와 `node scripts/test-lantern-keeper-browser.cjs`를 실행합니다.
- 추가 게임 `arcade/fog-front.html`은 ‘운빨좆망겜’ 정찰 타워 디펜스(두 보드·안개 정찰·번갈아 오는 웨이브·AI 상대)이며 자체 Canvas 2D 렌더러를 사용합니다. 규칙과 상대 AI는 `scripts/fog-core.js`, 그림은 `scripts/fog-art.js`, 게임 루프·입력·화면은 `scripts/fog-front.js`, 세부 규칙은 `rules/games/fog-front.md`입니다. 변경 후 `node scripts/test-fog-front.cjs`와 `node scripts/test-fog-front-browser.cjs`를 실행합니다.
- 추가 게임 `arcade/exam-sneak.html`은 ‘들키면 재수’ 시험장 코믹 잠입 시뮬레이션(소매 속 AI 볼펜을 감독관 시야 밖에서만 꺼내 4교시를 버팀, 의심도·배터리·쉬는 시간 개조 3택)이며 자체 Canvas 2D 렌더러를 사용합니다. 규칙은 `scripts/exam-core.js`, 그림은 `scripts/exam-art.js`, 게임 루프·입력·화면은 `scripts/exam-sneak.js`, 세부 규칙은 `rules/games/exam-sneak.md`입니다. 지어낸 시험으로 두고 실존 시험 이름은 화면에 쓰지 않습니다. 변경 후 `node scripts/test-exam-sneak.cjs`와 `node scripts/test-exam-sneak-browser.cjs`를 실행합니다.
- 무료 타로점 `fortune/tarot.html`은 1909 라이더-웨이트 78장 카드로 보는 운세 페이지입니다. 동작은 `scripts/tarot.js`, 카드 이미지와 이름·뜻은 `assets/tarot/cards.json`, 카드별 주제 해석문(연애·재물·일·학업·건강·인간관계, 상대 마음, 역방향, 조언)은 `scripts/tarot-readings.js`입니다. 고민 글의 주제·질문 유형·감정 낱말 목록은 `scripts/tarot.js`의 TOPICS, QTYPES, EMOTIONS에서, 세부 상황과 상황별 결과 5단계, 사람·시점 낱말, 카드 두 장 조합 해석은 `scripts/tarot-ai.js`에서 관리하며 고민 글은 브라우저 밖으로 보내지 않습니다. 카드 이미지는 원본 세트 `C:\claudeSession\assets\tarot\rws1909\`의 제목을 잘라낸 버전에서 만들고, 대체 그림(`youtube_image_crop`)이 있는 카드는 대체 그림을 씁니다. 변경 후 `node scripts/test-tarot.cjs`를 실행합니다.
- 사용자 요청 없이 블로그·순위 콘텐츠·생활 도구·다른 게임을 추가하지 않습니다.
- 메뉴와 로그인·푸터는 `scripts/site-layout.js`, 인증은 `scripts/firebase-client.js`에서 공통 관리합니다.
- 공유 버튼·홈 화면 추가 버튼과 웹앱(매니페스트·아이콘·오프라인 서비스 워커 `sw.js`)도 공통입니다. 게임을 추가하거나 이름을 바꾸면 `rules/site-layout.md`의 웹앱 항목을 따릅니다.
- `sitemap.xml`에는 메인·비행기·윌리를 찾아 보자·던전엔드레곤·구글광고에나오는게임·뱀파이어 온라인·운빨좆망겜·들키면 재수 게임, 무료 타로점과 EXAONE의 대표 URL만 포함합니다. 대표 URL, OG·Twitter 메타, 실제 내용과 일치하는 VideoGame 구조화 데이터를 유지합니다.
- 이전 디펜스·게임 목록 주소는 메인으로 이동하고, 제공이 종료된 콘텐츠는 404로 처리합니다. 관련 없는 예전 페이지를 일괄 메인 리다이렉트하지 않습니다.
- 게임 구현 변경 후 `node scripts/test-dawn-bastion.cjs`, 사이트 변경 후 `node scripts/test-site-layout.cjs`와 `node scripts/test-site-seo.cjs`를 실행합니다.
- 브라우저 테스트는 Playwright가 있는 NODE_PATH에서 `node scripts/test-dawn-bastion-browser.cjs`로 실행합니다. 공유 이미지 재생성은 UPDATE_SHARE_IMAGES=1로 명시합니다.
- GitHub Pages에서는 `_config.yml`의 제외 목록으로 개발용 규칙·설정·테스트 파일을 배포에서 제외합니다.
