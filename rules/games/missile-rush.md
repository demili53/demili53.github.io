# 미사일 러시 (arcade/missile-rush.html)

- 세로형(480×760) 무한 웨이브 슈팅. 적은 위에서 내려오고, 아래 포대는 자동 발사하며 이동만 조작합니다.
- 규칙·수치는 `scripts/missile-rush-core.js`(업그레이드 10종, 미사일 진화 5단계, 적 7종, 웨이브 구성), 게임 루프·렌더는 `scripts/missile-rush.js`.
- 레벨업마다 최대치가 아닌 업그레이드 3장 제시(1·2·3 키/클릭). 모든 업그레이드가 최대면 보너스 점수.
- 5웨이브마다 보스(거대 요새선). 격파 시 미사일 진화 +1단계(최대 Mk.V), 내구도 +2 회복.
- 적이 방어선을 넘거나 포대·적 탄환과 충돌하면 내구도 -1. 0이면 종료 후 `partygame:score`(gameId `missile-rush`)로 순위 저장.
- Firestore 규칙의 허용 게임 목록에 `missile-rush`가 있어야 온라인 순위가 저장됩니다(`firebase deploy --only firestore:rules`).
- 모바일은 스테이지 크기를 sticky 헤더 아래 화면 높이에 맞추고, 시작 시 스테이지로 스크롤합니다.
- 테스트: `node scripts/test-missile-rush.cjs`, 브라우저 `node scripts/test-missile-rush-browser.cjs`(공유 이미지 재생성은 UPDATE_SHARE_IMAGES=1).
