module.exports = async function runEighthUpgradeChecks(check, page) {
  await check('71. three boss kinds rotate by threat tier and keep destroyer patterns', () => {
    const kinds = [5, 10, 15, 20, 25, 30].map(number => { resetGame(); startGame(); wave = number; spawnBoss(); return enemies[0]; });
    const ids = kinds.map(boss => boss.kind).join(',');
    const [destroyer, weaver, fortress] = kinds;
    return ids === 'destroyer,weaver,fortress,destroyer,weaver,fortress'
      && weaver.hp === Math.round((120 + 10 * 40) * .9) && fortress.hp === Math.round((120 + 15 * 40) * 1.3) && destroyer.hp === 320
      && Math.abs(weaver.vx) > Math.abs(destroyer.vx) && Math.abs(fortress.vx) < Math.abs(destroyer.vx)
      && waveBriefing(10).includes('보스 위협 2') && waveBriefing(10).includes('직조자') && waveBriefing(15).includes('요새');
  });
  await check('72. weaver preview names match spiral, missile and cross attacks; spiral keeps emitting then stops', () => {
    resetGame(); startGame(); wave = 10; player.invuln = 999; spawnBoss(); const boss = enemies[0]; boss.entering = false; boss.y = 90;
    boss.pattern = 2; // next is index 0
    if (nextBossPattern(boss) !== '나선 탄막') return false;
    eBullets = []; bossFire(boss); const first = eBullets.length; boss.fireCd = 99;
    if (first !== 2 || !boss.spiral) return false;
    for (let i = 0; i < 10; i++) update(.05);
    const during = eBullets.length; for (let i = 0; i < 12; i++) update(.05);
    const after = boss.spiral;
    if (!(during > first + 6) || after) return false;
    if (nextBossPattern(boss) !== '추적 미사일') return false;
    eBullets = []; bossFire(boss); if (!eBullets.every(b => b.kind === 'missile')) return false;
    if (nextBossPattern(boss) !== '교차 탄막') return false;
    eBullets = []; bossFire(boss);
    const left = eBullets.filter(b => b.x < boss.x), right = eBullets.filter(b => b.x > boss.x);
    return left.length === right.length && left.length >= 5 && left.every(b => b.vx > 0) && right.every(b => b.vx < 0) && nextBossPattern(boss) === '나선 탄막';
  });
  await check('73. fortress wall leaves the telegraphed gap open and bomb cancels a spiral', () => {
    resetGame(); startGame(); wave = 15; player.invuln = 999; spawnBoss(); const boss = enemies[0]; boss.entering = false; boss.y = 90;
    boss.beamCooldown = 99; boss.escortCooldown = 99; boss.pattern = 3; boss.fireCd = .35; player.x = 300;
    update(.01); const gap = boss.wallGap;
    if (!(gap >= 60 && gap <= W - 60) || nextBossPattern(boss) !== '탄막 벽' || eBullets.length) return false;
    update(.2); if (boss.wallGap !== gap) return false; // 예고 중에는 틈이 움직이지 않는다
    update(.2); const wall = eBullets.filter(b => b.kind === 'orb');
    if (wall.length < 10 || wall.some(b => Math.abs(b.x - gap) < 48) || boss.wallGap !== null) return false;
    resetGame(); startGame(); wave = 10; spawnBoss(); const weaver = enemies[0]; weaver.entering = false; weaver.pattern = 2; bossFire(weaver);
    bombs = 1; bomb(); return weaver.spiral === null && eBullets.length === 0;
  });
  await check('74. fortress mines slow down, burst into eight bullets once and stay under the bullet cap', () => {
    resetGame(); startGame(); wave = 15; player.invuln = 999; spawnBoss(); const boss = enemies[0]; boss.entering = false; boss.y = 90;
    boss.beamCooldown = 99; boss.escortCooldown = 99; boss.pattern = 0; boss.fireCd = 99;
    if (nextBossPattern(boss) !== '기뢰 살포') return false;
    eBullets = []; bossFire(boss); const mines = eBullets.length;
    if (mines !== 3 || !eBullets.every(b => b.kind === 'mine')) return false;
    const speed = Math.hypot(eBullets[0].vx, eBullets[0].vy); update(.05); update(.05);
    if (!(Math.hypot(eBullets[0].vx, eBullets[0].vy) < speed)) return false;
    for (let i = 0; i < 31; i++) update(.05);
    return eBullets.length === mines * 8 && eBullets.every(b => b.kind === 'orb') && eBullets.length <= 180;
  });
  await check('75. chain lightning jumps to nearby enemies once each and reports its own damage', () => {
    resetGame(); startGame(); changeWeapon('chain'); player.level = 4;
    const make = (x, y) => ({ type: 'grunt', x, y, w: 30, h: 26, hp: 100, maxHp: 100, vy: 0, score: 0 });
    enemies = [make(240, 300), make(290, 300), make(340, 300), make(390, 300), make(60, 80)];
    const bullet = { type: 'chain', dmg: 10, jumps: chainJumps(4), hits: [] };
    hitEnemyWithBullet(bullet, enemies[0]);
    const lost = enemies.map(enemy => Math.round((100 - enemy.hp) * 10) / 10);
    if (chainJumps(4) !== 3 || JSON.stringify(lost) !== '[10,5.5,5.5,5.5,0]' || arcs.length !== 3) return false;
    if (Math.round(damageByWeapon.chain * 10) / 10 !== 26.5) return false;
    enemies[1].armored = true; enemies[1].hp = 100; enemies[2].hp = 0;
    hitEnemyWithBullet(bullet, enemies[0]);
    pBullets = []; playerFire();
    return Math.round((100 - enemies[1].hp) * 10) / 10 === 3.3 && pBullets.length === 2 && pBullets.every(b => b.type === 'chain' && b.jumps === 3);
  });
  await check('76. disc pierces, turns back, can hit the same enemy again and is removed at the ship', () => {
    resetGame(); startGame(); changeWeapon('disc'); player.level = 1; player.cooldown = 99; pBullets = []; playerFire();
    const disc = pBullets[0]; if (pBullets.length !== 1 || disc.kind !== 'disc') return false;
    const target = { type: 'grunt', x: player.x, y: player.y - 150, w: 30, h: 26, hp: 500, maxHp: 500, vy: 0, score: 0, stunTime: 99 };
    const behind = { ...target, y: player.y - 230 };
    enemies = [target, behind]; player.invuln = 999; spawnTimer = 99; let top = H;
    for (let i = 0; i < 80 && pBullets.includes(disc); i++) { update(.03); top = Math.min(top, disc.y); enemies.forEach(e => { e.stunTime = 99; }); }
    const hitEach = (500 - target.hp) / disc.dmg;
    player.level = 9; pBullets = []; playerFire();
    return !pBullets.includes(disc) && disc.returning && Math.round(hitEach) === 2 && Math.round((500 - behind.hp) / disc.dmg) === 2
      && top < player.y - 280 && top > 0 && pBullets.length === 3 && damageByWeapon.disc > 0;
  });
  await check('77. splitter breaks into two small enemies once, respecting bombs and the enemy cap', () => {
    const original = Math.random;
    try {
      resetGame(); startGame(); wave = 5; Math.random = () => .05; spawnEnemy(); Math.random = () => .99;
      const splitter = enemies[0]; if (!splitter.splitter || splitter.armored) return false;
      splitter.hp = 0; resolveEnemyDeaths(true);
      if (enemies.length !== 2 || !enemies.every(e => e.mini && e.hp > 0) || enemies[0].vx !== -enemies[1].vx || kills !== 1) return false;
      const x = enemies[0].x; enemies[0].y = 100; update(.1); if (enemies[0].x === x) return false;
      enemies.forEach(e => { e.hp = 0; }); resolveEnemyDeaths(true); if (enemies.length) return false;
      Math.random = () => .05; spawnEnemy(); Math.random = () => .99; bombs = 1; bomb(); if (enemies.length) return false;
      Math.random = () => .05; spawnEnemy(); Math.random = () => .99; const last = enemies[0];
      while (enemies.length < 40) enemies.push({ type: 'grunt', x: 20, y: -500, w: 30, h: 26, hp: 9, maxHp: 9, vy: 0, score: 0 });
      last.hp = 0; resolveEnemyDeaths(true); if (enemies.length !== 40 || enemies.filter(e => e.mini).length !== 1) return false;
      wave = 4; enemies = []; Math.random = () => .05; spawnEnemy(); return !enemies[0].splitter;
    } finally { Math.random = original; }
  });
  await check('78. sniper holds position, locks its aim for 0.8s, fires a fast shot and leaves', () => {
    const original = Math.random;
    try {
      resetGame(); startGame(); wave = 7; spawnTimer = 99; formationSpawned = true; carrierSpawned = true; player.invuln = 999;
      Math.random = () => .12; spawnEnemy(); spawnEnemy(); spawnEnemy(); Math.random = original;
      if (enemies.filter(e => e.sniper).length !== 2) return false; // 동시에 두 기까지만
      enemies = enemies.filter(e => e.sniper).slice(0, 1); const sniper = enemies[0]; sniper.holdY = 100; sniper.x = 240;
      for (let i = 0; i < 40 && sniper.vy > 0; i++) update(.05);
      if (sniper.vy !== 0 || Math.abs(sniper.y - 100) > 6) return false;
      player.x = 100; player.y = 500; sniper.fireCd = .01; update(.02);
      const angle = sniper.aimAngle; if (!(sniper.aimTime > 0) || eBullets.length) return false;
      player.x = 400; update(.4); if (sniper.aimAngle !== angle || eBullets.length) return false; // 조준 중 재조준 없음
      update(.45); const shot = eBullets.find(b => b.kind === 'snipe');
      if (!shot || Math.abs(Math.hypot(shot.vx, shot.vy) - 480) > 1 || !(shot.vx < 0)) return false;
      sniper.holdTime = 0; sniper.aimTime = 0; const y = sniper.y;
      for (let i = 0; i < 60 && enemies.includes(sniper); i++) update(.05);
      return !enemies.includes(sniper) && Math.abs(sniper.y - y) < 1;
    } finally { Math.random = original; }
  });
  await check('79. hit flash, shockwave rings and damage vignette are timed, capped and skipped when effects are reduced', () => {
    resetGame(); startGame(); reducedEffects = false; spawnTimer = 99;
    const enemy = { type: 'grunt', x: 100, y: 200, w: 30, h: 26, hp: 10, maxHp: 10, vy: 0, score: 100 };
    enemies = [enemy]; damageEnemy(enemy, 1, 'pulse'); if (enemy.flash !== .07) return false;
    damageEnemy(enemy, 0, 'pulse'); enemy.hp = 0; resolveEnemyDeaths(true);
    if (rings.length !== 1) return false;
    for (let i = 0; i < 40; i++) ring(10, 10, 20, '#fff');
    if (rings.length !== 24) return false;
    update(.2); if (rings.length !== 24) return false; update(.2); if (rings.length) return false;
    hitPlayer(); if (hurtFlash !== .4) return false;
    togglePause(); update(1); if (hurtFlash !== .4) return false; togglePause();
    for (let i = 0; i < 9; i++) update(.05);
    if (hurtFlash !== 0) return false;
    reducedEffects = true; ring(10, 10, 20, '#fff'); const skipped = rings.length === 0; reducedEffects = false;
    resetGame(); return skipped && rings.length === 0 && arcs.length === 0 && hurtFlash === 0;
  });
  await check('80. nine weapons are selectable, saved and local scripts carry a cache version', () => {
    resetGame();
    const options = [...el('weaponSelect').options].map(option => option.value);
    changeWeapon('disc'); const saved = JSON.parse(localStorage.getItem('spaceShooterLoadout')).weapon;
    const text = el('weaponInfo').textContent; changeWeapon('pulse');
    const local = [...document.querySelectorAll('script[src^="/scripts/shooter-"]')].map(script => script.getAttribute('src'));
    return options.length === 9 && options.includes('chain') && options.includes('disc') && saved === 'disc' && text.includes('되돌아오며')
      && local.length === 3 && local.every(src => /\?v=\d{8}/.test(src));
  });
};
