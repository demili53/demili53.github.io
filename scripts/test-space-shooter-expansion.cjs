module.exports = async function expansion(check, page) {
  await check('11. V formations stay in bounds and spawn only once per wave', () => {
    resetGame(); startGame(); player.cooldown = 99; wave = 2; spawnTimer = 99; waveTimer = 2.99; update(.02);
    if (enemies.filter(e => e.formation).length !== 5) return false;
    for (let i = 0; i < 20; i++) update(.05);
    return enemies.filter(e => e.formation).length === 5 && enemies.every(e => e.x > 15 && e.x < W - 15);
  });
  await check('12. elite leader fires and guarantees a power drop', () => {
    resetGame(); startGame(); wave = 4; spawnFormation(); const leader = enemies.find(e => e.elite);
    leader.y = 100; leader.fireCd = 0; update(.01);
    if (eBullets.length !== 3 || leader.maxHp <= enemies[0].maxHp) return false;
    leader.hp = 0; resolveEnemyDeaths(true); resolveEnemyDeaths(true);
    return kills === 1 && items.some(it => it.kind === 'power') && !enemies.includes(leader);
  });
  await check('13. emergency dash respects direction, bounds, cooldown and pause', () => {
    resetGame(); startGame(); keys.KeyD = true; const x = player.x; dash();
    if (player.x !== x + 110 || player.invuln < .4 || dashCooldown !== 5) return false;
    const after = player.x; dash(); if (player.x !== after) return false;
    togglePause(); update(1); if (dashCooldown !== 5) return false;
    startGame(); dashCooldown = 0; player.x = W - 15; dash();
    return player.x === W - player.w / 2;
  });
  await check('14. grazing rewards each bullet once and excludes invulnerability', () => {
    resetGame(); startGame(); spawnTimer = 99;
    const bullet = { x: player.x + 26, y: player.y, r: 3, vx: 0, vy: 0 };
    eBullets = [bullet]; update(.01); update(.01);
    if (grazes !== 1 || charge !== 8 || score !== 25 || player.lives !== SHIPS[player.ship].lives) return false;
    player.invuln = 1; eBullets.push({ ...bullet, grazed: false }); update(.01);
    return grazes === 1;
  });
  await check('15. overdrive consumes charge, boosts fire and freezes while paused', () => {
    resetGame(); startGame(); playerFire(); const base = pBullets[0].dmg;
    activateOverdrive(); if (overdriveTime !== 0) return false;
    charge = 100; activateOverdrive(); pBullets = []; playerFire();
    if (charge !== 0 || overdriveTime !== 4 || Math.abs(pBullets[0].dmg / base - 1.3) > .001) return false;
    addCharge(20); if (charge !== 0) return false;
    togglePause(); update(1); if (overdriveTime !== 4) return false;
    startGame(); update(.05); return overdriveTime < 4 && overdriveTime > 3;
  });
  await check('16. perfect-wave bonus is single-use and any hit disqualifies it', () => {
    resetGame(); startGame(); completeWave(1); const first = score; completeWave(1);
    if (first !== 250 || score !== first || perfectWaves !== 1 || charge !== 10) return false;
    applyItem('shield'); hitPlayer(); completeWave(2);
    return score === first && lastWaveBonus === 0 && perfectWaves === 1 && !waveDamaged;
  });
  await check('17. boss grants immediate upgrade and overflow pickups convert to score', () => {
    resetGame(); startGame(); wave = 5; spawnBoss(); enemies[0].hp = 0; resolveEnemyDeaths(true);
    if (player.level !== 2 || wave !== 6) return false;
    player.level = MAX_WEAPON_LEVEL; player.lives = 5; const before = score;
    applyItem('power'); applyItem('life');
    return score === before + 1000 && player.level === MAX_WEAPON_LEVEL && player.lives === 5;
  });
  await check('18. combat text is bounded, pauses and expires', () => {
    resetGame(); startGame();
    for (let i = 0; i < 50; i++) floatText('+' + i, -100, 100);
    if (notices.length !== 20 || notices.some(n => n.x < 0)) return false;
    togglePause(); const snapshot = JSON.stringify(notices); update(1);
    if (JSON.stringify(notices) !== snapshot) return false;
    startGame(); spawnTimer = 99; update(1); return notices.length === 0;
  });
  await check('19. reduced effects limits particles, freezes stars and persists preference', () => {
    resetGame(); startGame(); reducedEffects = false; toggleEffects();
    particles = []; burst(100, 100, '#fff', 40);
    if (particles.length !== 4 || localStorage.getItem('spaceShooterReducedEffects') !== 'true') return false;
    const before = JSON.stringify(stars); update(.05);
    return before === JSON.stringify(stars) && el('effectsBtn').getAttribute('aria-pressed') === 'true';
  });
  await check('20. recent runs are capped, persisted, validated and tolerate blocked storage', () => {
    recentRuns = [];
    for (let i = 0; i < 7; i++) { resetGame(); startGame(); score = 100 + i; gameOver(); gameOver(); }
    if (recentRuns.length !== 5 || recentRuns[0].score !== 106 || recentRuns[4].score !== 102) return false;
    recentRuns = []; loadRecentRuns(); if (recentRuns.length !== 5 || el('recentRuns').children.length !== 5) return false;
    localStorage.setItem('spaceShooterRuns', JSON.stringify([null, { ship: '<script>', score: 100 }, recentRuns[0]]));
    loadRecentRuns(); if (recentRuns.length !== 1) return false;
    const original = Storage.prototype.setItem;
    try {
      Storage.prototype.setItem = () => { throw new Error('storage blocked'); };
      resetGame(); startGame(); score = 999; gameOver();
      return state === 'over' && recentRuns[0].score === 999;
    } finally { Storage.prototype.setItem = original; }
  });
};
