module.exports = async function seventh(check, page) {
  await check('61. wave pairs sweep opposite sides instead of stacking on one path', () => {
    resetGame(); startGame(); player.weapon = 'wave'; player.level = 1; player.cooldown = 99; spawnTimer = 99;
    const origin = player.x; playerFire();
    if (pBullets.length !== 2) return false;
    update(.05);
    const left = pBullets[0].x - origin, right = pBullets[1].x - origin;
    if (left * right >= 0 || Math.abs(left + right) > .0001 || pBullets[0].y !== pBullets[1].y) return false;
    update(.05);
    return Math.abs(pBullets[0].x + pBullets[1].x - origin * 2) < .0001 && Math.abs(pBullets[0].x - pBullets[1].x) > 1;
  });
  await check('62. simultaneous normal and boss kills settle before the wave report', () => {
    resetGame(); startGame(); wave = 5; player.lives = 3;
    const normal = { type: 'grunt', x: 50, y: 100, w: 30, h: 26, hp: 1, maxHp: 1, vy: 0, score: 100, bounty: true };
    enemies = [normal]; spawnBoss(); const boss = enemies.find(e => e.type === 'boss'); boss.hp = 1;
    const expected = Math.round(normal.score * 1.08) + 250 + 5 * 25 + Math.round(boss.score * 1.16) + 200 + 5 * 50;
    const originalRandom = Math.random;
    try {
      Math.random = () => .99; // Isolate guaranteed rewards from random item drops.
      bomb();
      const row = waveHistory[0];
      return state === 'reward' && wave === 6 && kills === 2 && enemies.length === 0 && row.wave === 5 && row.kills === 2 && row.score === expected && score === expected;
    } finally { Math.random = originalRandom; }
  });
  await check('63. training cannot publish scores or alter best, recent runs or lifetime progress', () => {
    resetGame();
    const snapshot = () => JSON.stringify({ best, recentRuns, progress: progressLedger.snapshot(), saved: ['spaceShooterBest', 'spaceShooterRuns', 'spaceShooterProgress'].map(key => localStorage.getItem(key)) });
    const before = snapshot(), published = [];
    const listener = event => published.push(event.detail);
    window.addEventListener('partygame:score', listener);
    try {
      startTraining({ wave: 20, level: 10, invincible: true });
      for (let i = 0; i < 20; i++) { damageEnemy(enemies[0], 999, 'pulse'); resolveEnemyDeaths(true); }
      checkMissions();
      if (kills !== 20 || score !== 0 || completedMissions.size !== 0 || items.length !== 0) return false;
      // Even an arbitrarily large training score must stay outside every score sink.
      score = best + 100000; elapsed = 99; recordRun(); gameOver(); gameOver();
      return runMode === 'training' && state === 'over' && snapshot() === before && published.length === 0 && overlayText.textContent.includes('미반영');
    } finally { window.removeEventListener('partygame:score', listener); }
  });
  await check('64. stationary training targets respawn without timed waves or enemy spawns', () => {
    resetGame(); startTraining({ wave: 20, level: 1, invincible: true }, 'targets'); player.cooldown = 999;
    const positions = enemies.map(enemy => [enemy.trainingSlot, enemy.x, enemy.y]);
    for (let i = 0; i < 500; i++) update(.05);
    if (state !== 'playing' || wave !== 20 || waveTimer !== 0 || enemies.length !== 3 || eBullets.length !== 0 || bossActive || JSON.stringify(enemies.map(enemy => [enemy.trainingSlot, enemy.x, enemy.y])) !== JSON.stringify(positions)) return false;
    const target = enemies[1]; damageEnemy(target, target.maxHp, 'pulse'); resolveEnemyDeaths(true);
    const replacement = enemies.find(enemy => enemy.trainingSlot === target.trainingSlot);
    if (kills !== 1 || enemies.length !== 3 || replacement === target || replacement.hp !== replacement.maxHp || replacement.x !== target.x || replacement.y !== target.y) return false;
    bomb();
    return kills === 4 && enemies.length === 3 && enemies.every(enemy => enemy.trainingTarget && enemy.hp === enemy.maxHp) && items.length === 0 && score === 0;
  });
  await check('65. selected boss training clears, redeploys and returns to a clean normal run', () => {
    resetGame(); el('trainingWave').value = '15'; el('trainingLevel').value = '7'; el('trainingInvincible').checked = false;
    el('trainingBossBtn').click(); const boss = enemies[0];
    if (runMode !== 'training' || trainingScenario !== 'boss' || wave !== 15 || player.level !== 7 || trainingConfig.invincible || !bossActive || boss.tier !== 3 || boss.entering || boss.y !== 90) return false;
    damageEnemy(boss, boss.maxHp, 'railgun'); resolveEnemyDeaths(true);
    if (state !== 'over' || !trainingCleared || bossActive || wave !== 15 || kills !== 1 || score !== 0 || rewardPending || items.length || !overlayTitle.textContent.includes('성공')) return false;
    overlayStartBtn.click();
    if (state !== 'playing' || wave !== 15 || trainingCleared || kills !== 0 || enemies.length !== 1 || enemies[0] === boss || enemies[0].hp !== enemies[0].maxHp || player.level !== 7) return false;
    elapsed = 3; damageEnemy(enemies[0], 10, 'pulse'); el('trainingBossBtn').click();
    if (elapsed !== 0 || Object.keys(damageByWeapon).length || enemies[0].hp !== enemies[0].maxHp) return false;
    el('normalRunBtn').click();
    if (!el('trainingBossBtn').disabled || !el('trainingTargetsBtn').disabled) return false;
    el('trainingBossBtn').click(); startTraining({ wave: 20, level: 10 }, 'boss');
    return runMode === 'normal' && state === 'playing' && wave === 1 && player.level === 1 && bombs === 2 && charge === 0 && !bossActive && enemies.length === 0 && !trainingCleared && el('normalRunBtn').disabled;
  });
  await check('66. training DPS uses effective damage and invincibility remains optional', () => {
    resetGame(); startTraining({ wave: 5, level: 1, invincible: true });
    damageEnemy(enemies[0], 10, 'pulse'); damageEnemy(enemies[0], 999, 'pulse'); damageEnemy(enemies[1], 25, 'laser'); elapsed = 2;
    const lives = player.lives; hitPlayer(); hitPlayer(); syncUi();
    if (damageByWeapon.pulse !== 50 || damageByWeapon.laser !== 25 || player.lives !== lives || hitsTaken !== 1 || state !== 'playing' || !el('trainingStats').textContent.includes('유효 피해 75') || !el('trainingStats').textContent.includes('DPS 37.5')) return false;
    player.invuln = 0; hitPlayer();
    if (hitsTaken !== 2 || player.lives !== lives) return false;
    startTraining({ wave: 5, level: 1, invincible: false }); player.lives = 1; hitPlayer();
    return state === 'over' && player.lives === 0 && hitsTaken === 1 && !trainingCleared && overlayTitle.textContent === '훈련 종료';
  });
  await check('67. supply labels explain weapon lock energy and maximum-level conversion', () => {
    resetGame(); startGame(); const originalLock = weaponLocked;
    try {
      weaponLocked = false; player.lives = 3; player.shield = 0;
      for (const key of WEAPON_KEYS) {
        const expected = key === player.weapon ? WEAPON_KEYS[(WEAPON_KEYS.indexOf(key) + 1) % WEAPON_KEYS.length] : key;
        if (itemLabel({ kind: 'weapon', weapon: key }) !== WEAPONS[expected].name) return false;
      }
      const current = player.weapon, next = WEAPON_KEYS[(WEAPON_KEYS.indexOf(current) + 1) % WEAPON_KEYS.length];
      applyItem('weapon', current); if (player.weapon !== next) return false;
      if (itemLabel({ kind: 'power' }) !== '강화 +1' || itemLabel({ kind: 'life' }) !== '회복 +1' || itemLabel({ kind: 'bomb' }) !== '봄 +1' || itemLabel({ kind: 'shield' }) !== '방어막') return false;
      weaponLocked = true; const weapon = player.weapon;
      if (itemLabel({ kind: 'weapon', weapon: 'wave' }) !== '에너지 +10') return false;
      applyItem('weapon', 'wave');
      if (charge !== 10 || player.weapon !== weapon) return false;
      player.level = MAX_WEAPON_LEVEL; const before = score;
      if (itemLabel({ kind: 'power' }) !== '+500점') return false;
      applyItem('power'); if (score !== before + 500 || player.level !== MAX_WEAPON_LEVEL) return false;
      player.lives = 5; player.shield = 1;
      return itemLabel({ kind: 'life' }) === '+500점' && itemLabel({ kind: 'shield' }) === '+500점';
    } finally { weaponLocked = originalLock; syncUi(); }
  });
  await check('68. twelve player kills guarantee power and a natural power drop resets the count', () => {
    resetGame(); startGame(); const originalRandom = Math.random;
    const kill = byPlayer => {
      enemies = [{ type: 'grunt', x: 80, y: 100, w: 30, h: 26, hp: 0, maxHp: 1, vy: 0, score: 100 }];
      resolveEnemyDeaths(byPlayer);
    };
    try {
      Math.random = () => .99;
      for (let i = 0; i < 11; i++) kill(true);
      if (powerDrought !== 11 || items.length !== 0) return false;
      kill(false); if (powerDrought !== 11 || items.length !== 0) return false;
      kill(true); if (powerDrought !== 0 || items.length !== 1 || items[0].kind !== 'power') return false;
      items = []; for (let i = 0; i < 7; i++) kill(true);
      Math.random = () => .01; kill(true);
      if (powerDrought !== 0 || items.length !== 1 || items[0].kind !== 'power') return false;
      Math.random = () => .99; for (let i = 0; i < 11; i++) kill(true);
      if (powerDrought !== 11 || items.length !== 1) return false;
      kill(true); if (powerDrought !== 0 || items.length !== 2 || !items.every(item => item.kind === 'power')) return false;
      powerDrought = 8; wave = 5; spawnBoss(); enemies[0].hp = 0; resolveEnemyDeaths(true);
      return powerDrought === 0 && player.level === 2;
    } finally { Math.random = originalRandom; }
  });
  await check('69. high-contrast checkbox applies and persists both enabled and disabled states', () => {
    const original = highContrast, saved = localStorage.getItem('spaceShooterHighContrast');
    try {
      for (const enabled of [true, false, true]) {
        el('highContrast').checked = enabled; el('highContrast').dispatchEvent(new Event('change', { bubbles: true }));
        if (highContrast !== enabled || localStorage.getItem('spaceShooterHighContrast') !== String(enabled)) return false;
        el('highContrast').checked = !enabled; syncUi();
        if (el('highContrast').checked !== enabled) return false;
      }
      resetGame(); return highContrast && el('highContrast').checked;
    } finally {
      highContrast = original;
      if (saved === null) localStorage.removeItem('spaceShooterHighContrast'); else localStorage.setItem('spaceShooterHighContrast', saved);
      syncUi();
    }
  });
  await check('70. finishing is pause-only and records one normal run but no training run', () => {
    resetGame(); const published = [];
    const listener = event => published.push(event.detail);
    const snapshot = () => JSON.stringify({ best, recentRuns, progress: progressLedger.snapshot(), saved: ['spaceShooterBest', 'spaceShooterRuns', 'spaceShooterProgress'].map(key => localStorage.getItem(key)) });
    const before = snapshot(), runs = progressLedger.snapshot().runs;
    window.addEventListener('partygame:score', listener);
    try {
      finishRun(); if (state !== 'idle' || snapshot() !== before) return false;
      startGame(); score = 2345; kills = 3; elapsed = 12;
      finishRun(); if (state !== 'playing' || snapshot() !== before) return false;
      rewardWave = 3; showReward(); finishRun();
      if (state !== 'reward' || snapshot() !== before || published.length) return false;
      el('rewardChoices').querySelector('button').click(); togglePause();
      if (el('finishRunBtn').classList.contains('hidden')) return false;
      el('finishRunBtn').click();
      if (state !== 'over' || progressLedger.snapshot().runs !== runs + 1 || published.length !== 1 || published[0].score !== 2345 || recentRuns[0].score !== 2345 || !el('finishRunBtn').classList.contains('hidden')) return false;
      const after = snapshot(); finishRun(); gameOver();
      if (snapshot() !== after || published.length !== 1) return false;
      startTraining({ wave: 5, level: 1, invincible: true }); score = best + 100000; togglePause(); el('finishRunBtn').click(); finishRun();
      return state === 'over' && runMode === 'training' && snapshot() === after && published.length === 1;
    } finally { window.removeEventListener('partygame:score', listener); }
  });
};
