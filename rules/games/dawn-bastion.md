# 새벽의 요새

- 메인 경로: `/`, 구현: `index.html`, 게임 ID: `dawn-bastion`. 이전 `/arcade/dawn-bastion.html`은 메인으로 이동합니다.
- Phaser 4.2.1, 720×720 Canvas. 캐릭터 아틀라스는 `assets/games/dawn-bastion/characters-v2.*`; 이미지 실패 시 자체 도형 사용.
- 방어전 10웨이브 / 돌격전 6웨이브 / 타워 전용 요새전 8웨이브. 모드별 보스와 로컬 기록을 유지합니다.
- WASD·방향키·모바일 드래그, B 건설, Q 충격파, P·Esc 일시정지. 보상 선택 중에는 전투를 정지합니다.
- 타워 3종·강화 카드·연속 처치·무피해 보너스를 유지합니다.
- 온라인 순위는 방어전만 집계하고 기존 기록 키와 이벤트 ID를 보존합니다.
- 비행기 게임은 `/arcade/space-shooter.html`에서 보조 게임으로 제공합니다.
- 검증: `node scripts/test-dawn-bastion.cjs`, `node scripts/test-site-layout.cjs`.
