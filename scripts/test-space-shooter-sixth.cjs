module.exports = async function sixth(check, page) {
  await check('51. boss entry reserves a capped enemy slot and cannot duplicate the boss', () => {
    resetGame(); startGame(); wave = 4; waveTimer = WAVE_LEN - .01;
    spawnTimer = 99; formationSpawned = true; carrierSpawned = true; player.cooldown = 99;
    enemies = Array.from({ length: 40 }, (_, i) => ({ type: 'grunt', x: 50, y: i ? 200 : -120, w: 30, h: 26, hp: 99, maxHp: 99, vy: 0, score: 100 }));
    const offscreen = enemies[0]; update(.02);
    if (wave !== 5 || enemies.length !== 40 || enemies.includes(offscreen) || enemies.filter(e => e.type === 'boss').length !== 1) return false;
    const boss = enemies.find(e => e.type === 'boss'); spawnBoss();
    return enemies.length === 40 && enemies.filter(e => e.type === 'boss').length === 1 && enemies.includes(boss) && bossActive;
  });
  await check('52. fast enemy bodies hit along their path before offscreen cleanup', () => {
    function setup(speed, startOffset, xOffset = 0) {
      resetGame(); startGame(); wave = 200; spawnTimer = 99; formationSpawned = true; carrierSpawned = true; player.cooldown = 99;
      enemies = [{ type: 'rusher', x: player.x + xOffset, y: player.y + startOffset, w: 26, h: 30, hp: 99, maxHp: 99, vy: 0, score: 100, chargeReady: true, chargeTime: 0, diveVx: 0, diveVy: speed }];
      return player.lives;
    }
    let lives = setup(1500, -37.5); update(.05);
    if (player.lives !== lives - 1) return false;
    // Both endpoints miss and the end lies below the cleanup boundary.
    lives = setup(6000, -150); update(.05);
    if (player.lives !== lives - 1 || enemies.length !== 0) return false;
    lives = setup(6000, -150, 80); update(.05);
    return player.lives === lives && enemies.length === 0;
  });
  await check('53. boss escorts respect tier, six-escort limit and global enemy cap', () => {
    resetGame(); startGame(); wave = 5; spawnBoss(); const firstBoss = enemies[0];
    spawnBossEscorts(firstBoss); if (enemies.length !== 1) return false;
    resetGame(); startGame(); wave = 10; spawnBoss(); const boss = enemies[0];
    boss.entering = false; boss.y = 90; boss.vx = 0; boss.fireCd = 99; boss.escortCooldown = 0;
    player.cooldown = 99; update(.01);
    let escorts = enemies.filter(e => e.escort);
    if (escorts.length !== 2 || escorts.some(e => e.type !== 'shooter' || e.x < e.w / 2 || e.x > W - e.w / 2)) return false;
    for (let i = 0; i < 5; i++) spawnBossEscorts(boss);
    if (enemies.filter(e => e.escort).length !== 6) return false;
    enemies = enemies.filter(e => !e.escort);
    while (enemies.length < 39) enemies.push({ type: 'grunt', x: 40, y: 40, w: 30, h: 26, hp: 99, vy: 0 });
    spawnBossEscorts(boss); return enemies.length <= 40 && enemies.filter(e => e.escort).length <= 1;
  });
  await check('54. boss beam warns, locks aim, freezes on pause and is cancelled by a bomb', () => {
    function setup(entering = false) {
      resetGame(); startGame(); wave = 15; spawnBoss(); const boss = enemies[0];
      boss.entering = entering; boss.y = entering ? -90 : 90; boss.vx = 0;
      boss.fireCd = 99; boss.escortCooldown = 99; boss.beamCooldown = 0; player.cooldown = 99;
      return boss;
    }
    let boss = setup(true); update(.01); if (boss.beam) return false;
    boss = setup(); const lives = player.lives; update(.01);
    if (boss.beam?.phase !== 'warning' || player.lives !== lives) return false;
    const warning = JSON.stringify(boss.beam); togglePause(); update(1);
    if (JSON.stringify(boss.beam) !== warning || player.lives !== lives) return false;
    startGame(); update(.9);
    if (boss.beam?.phase !== 'active' || player.lives !== lives - 1) return false;
    boss = setup(); update(.01); const aimedX = boss.beam.x, safeLives = player.lives;
    player.x = aimedX + 90; update(.9);
    if (boss.beam?.phase !== 'active' || boss.beam.x !== aimedX || player.lives !== safeLives) return false;
    bomb(); return boss.beam === null && bombs === 1;
  });
  await check('55. EMP spends energy once, clears locally and stuns only regular enemies', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    const near = { type: 'grunt', x: player.x + 80, y: player.y, w: 30, h: 26, hp: 99, maxHp: 99, vy: 100 };
    const boss = { type: 'boss', x: player.x - 100, y: player.y, w: 60, h: 40, hp: 99, maxHp: 99, entering: true };
    enemies = [near, boss]; eBullets = [{ x: player.x + 20, y: player.y, vx: 0, vy: 0, r: 3 }, { x: player.x + 200, y: player.y, vx: 0, vy: 0, r: 3 }];
    emp(); if (empCooldown !== 0 || eBullets.length !== 2) return false;
    charge = 50; emp();
    if (charge !== 0 || empCooldown !== 4 || near.stunTime !== 1.5 || boss.stunTime || eBullets.length !== 1) return false;
    charge = 50; emp(); if (charge !== 50) return false;
    togglePause(); update(1); if (empCooldown !== 4 || near.stunTime !== 1.5) return false;
    startGame(); const oldY = near.y; update(.1);
    return near.y === oldY && near.stunTime < 1.5 && empCooldown < 4;
  });
  await check('56. guard drones intercept nearby bullets without firing or resetting their cooldown', () => {
    resetGame(); startGame(); player.level = 9; droneMode = 'guard';
    try {
      fireDrones(); if (pBullets.length !== 0) return false;
      const bullet = dx => ({ x: player.x + dx, y: player.y + 6, vx: 0, vy: 0, r: 3 });
      const left = bullet(-30), right = bullet(30), far = bullet(140); eBullets = [left, right, far];
      guardDrones(); if (eBullets.length !== 1 || eBullets[0] !== far || guardCooldown !== 2) return false;
      el('droneMode').value = 'attack'; el('droneMode').dispatchEvent(new Event('change'));
      el('droneMode').value = 'guard'; el('droneMode').dispatchEvent(new Event('change'));
      eBullets.push(bullet(-30)); guardDrones(); if (eBullets.length !== 2 || guardCooldown !== 2) return false;
      togglePause(); update(1); return guardCooldown === 2;
    } finally {
      el('droneMode').value = 'attack'; el('droneMode').dispatchEvent(new Event('change'));
    }
  });
  await check('57. priority target is assigned once per wave and pays a single bonus', () => {
    resetGame(); startGame(); wave = 3; spawnEnemy(); spawnEnemy();
    const targets = enemies.filter(e => e.bounty); if (targets.length !== 1) return false;
    const target = targets[0], base = target.score; target.hp = 0;
    resolveEnemyDeaths(true); resolveEnemyDeaths(true);
    if (kills !== 1 || score !== Math.round(base * 1.08) + 325 || charge !== 8) return false;
    completeWave(3); wave = 4; spawnEnemy();
    if (enemies.filter(e => e.bounty).length !== 1) return false;
    enemies = []; bountyAssigned = false; bossActive = true; spawnEnemy();
    return enemies.every(e => !e.bounty);
  });
  await check('58. top-field collection pulls distant supplies while respecting weapon lock', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    player.y = H * .2; const item = { x: 20, y: 500, vy: 0, kind: 'power' }; items = [item];
    const before = Math.hypot(item.x - player.x, item.y - player.y); update(.1);
    const after = Math.hypot(item.x - player.x, item.y - player.y);
    if (!(after < before - 30)) return false;
    player.y = H - 90; items = [{ x: 20, y: 100, vy: 0, kind: 'power' }]; update(.1);
    if (items[0].x !== 20 || items[0].y !== 100) return false;
    player.y = H * .2; weaponLocked = true; const weapon = player.weapon;
    try {
      items = [{ x: player.x, y: player.y + 1, vy: 0, kind: 'weapon', weapon: 'wave' }]; update(.01);
      return items.length === 0 && player.weapon === weapon && charge === 10;
    } finally { weaponLocked = false; }
  });
  await check('59. health feedback appears only after actual damage and pauses before expiry', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    const enemy = { type: 'grunt', x: 50, y: 100, w: 30, h: 26, hp: 100, maxHp: 100, vy: 0 }; enemies = [enemy];
    damageEnemy(enemy, 0, 'pulse'); if (enemy.hitFeedback) return false;
    damageEnemy(enemy, 5, 'pulse'); if (enemy.hitFeedback !== .8 || enemy.hp !== 95) return false;
    togglePause(); update(1); if (enemy.hitFeedback !== .8) return false;
    startGame(); update(.9); return enemy.hitFeedback === 0;
  });
  await check('60. wave history records completion deltas once and remains bounded', () => {
    resetGame(); startGame(); kills = 3; score = 100; hitsTaken = 1; elapsed = 12; waveDamaged = true;
    completeWave(1); completeWave(1);
    if (waveHistory.length !== 1) return false;
    const first = waveHistory[0];
    if (first.kills !== 3 || first.score !== 100 || first.hits !== 1 || first.seconds !== 12) return false;
    kills += 2; score += 50; elapsed += 12; waveDamaged = true; completeWave(2);
    const second = waveHistory[1];
    if (second.kills !== 2 || second.score !== 50 || second.hits !== 0 || second.seconds !== 12) return false;
    for (let i = 3; i <= 25; i++) { kills++; score += 10; elapsed += 12; waveDamaged = true; completeWave(i); }
    if (waveHistory.length !== 20 || waveHistory[0].wave !== 6 || el('waveHistory').children.length !== 6 || !el('waveHistory').firstElementChild.textContent.includes('W25')) return false;
    resetGame(); return waveHistory.length === 0 && el('waveHistory').children.length === 0;
  });
};
