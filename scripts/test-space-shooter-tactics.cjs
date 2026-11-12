module.exports = async function tactics(check, page) {
  await check('21. swept collision catches fast bullets and preserves piercing', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    enemies = [100, 140].map(y => ({ type: 'grunt', x: 200, y, w: 30, h: 26, hp: 10, maxHp: 10, vy: 0, score: 100 }));
    pBullets = [{ x: 200, y: 180, vx: 0, vy: -2000, r: 2, dmg: 2, type: 'railgun', hits: [], pierce: 2 }];
    update(.05);
    if (!enemies.every(e => e.hp === 8) || pBullets[0].hits.length !== 2) return false;
    pBullets = [{ x: 200, y: 180, vx: 0, vy: -2000, r: 2, dmg: 2, type: 'pulse', hits: [], pierce: 0 }];
    update(.05); if (enemies[0].hp !== 8 || enemies[1].hp !== 6) return false;
    eBullets = [{ x: player.x, y: player.y - 70, vx: 0, vy: 3000, r: 3 }];
    const lives = player.lives; update(.05);
    return player.lives === lives - 1 && !sweptHit(0, 0, 20, 20, 2, { x: 80, y: 80, w: 10, h: 10 });
  });
  await check('22. plasma splash damages nearby enemies without doubling direct damage', () => {
    resetGame(); startGame();
    enemies = [0, 30, 100].map(dx => ({ x: 100 + dx, y: 100, hp: 100, type: 'grunt' }));
    hitEnemyWithBullet({ type: 'plasma', dmg: 10 }, enemies[0]);
    return enemies[0].hp === 90 && enemies[1].hp === 95.5 && enemies[2].hp === 100;
  });
  await check('23. wave slow affects movement, expires and does not slow bosses', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    const enemy = { type: 'grunt', x: 60, y: 100, w: 30, h: 26, hp: 20, vy: 100 };
    enemies = [enemy]; hitEnemyWithBullet({ type: 'wave', dmg: 1 }, enemy); update(.1);
    if (Math.abs(enemy.y - 105.5) > .001) return false;
    const boss = { type: 'boss', hp: 100 }; hitEnemyWithBullet({ type: 'wave', dmg: 1 }, boss);
    togglePause(); update(1); if (enemy.slowTime < 1) return false;
    startGame(); update(1.2); return enemy.slowTime === 0 && !boss.slowTime;
  });
  await check('24. homing avoids dead, previously hit and rear targets', () => {
    resetGame(); const b = { x: 100, y: 200, hits: [] };
    enemies = [{ x: 100, y: 201, hp: 0 }, { x: 100, y: 250, hp: 10 }, { x: 110, y: 150, hp: 10 }];
    if (homingTarget(b) !== enemies[2]) return false;
    b.hits.push(enemies[2]); return homingTarget(b) === null;
  });
  await check('25. rushers lock their direction, telegraph and freeze during pause', () => {
    resetGame(); startGame(); wave = 3; spawnTimer = 99; player.cooldown = 99;
    const e = { type: 'rusher', x: 60, y: 80, w: 26, h: 30, hp: 20, vy: 200 }; enemies = [e];
    update(.1); const aim = e.aimX;
    if (e.y !== 80 || e.chargeTime <= 0) return false;
    togglePause(); update(1); if (e.chargeTime < .5) return false;
    startGame(); player.x = 400; update(.6); update(.1);
    return e.y > 80 && e.x > 60 && e.aimX === aim;
  });
  await check('26. boss pattern preview matches the next fired pattern', () => {
    resetGame(); startGame(); wave = 20; spawnBoss(); const b = enemies[0];
    const expected = ['추적 미사일', '좌우 파동탄', '회전 탄막', '부채꼴 탄막'];
    const kinds = ['missile', 'wave', 'void', 'orb'];
    for (let i = 0; i < 4; i++) {
      if (nextBossPattern(b) !== expected[i]) return false;
      eBullets = []; bossFire(b); if (!eBullets.every(bullet => bullet.kind === kinds[i])) return false;
    }
    return true;
  });
  await check('27. refit choice applies once, respects caps and resets with the run', () => {
    resetGame(); startGame(); playerFire(); const base = pBullets[0].dmg;
    rewardWave = 3; showReward('modules'); const button = el('rewardChoices').firstElementChild; button.click(); button.click();
    pBullets = []; playerFire();
    if (upgrades.damage !== 1 || Math.abs(pBullets[0].dmg / base - 1.1) > .001 || state !== 'playing') return false;
    upgrades.dash = 3; dashCooldown = 0; dash(); if (dashCooldown !== 3.5) return false;
    upgrades.combo = 2; killEnemy({ x: 100, y: 100, score: 100, type: 'grunt' }, true); if (comboTimer !== 3.5) return false;
    Object.keys(upgrades).forEach(key => upgrades[key] = 3); showReward('modules');
    if ([...el('rewardChoices').children].some(choice => !choice.disabled)) return false;
    resetGame(); return Object.values(upgrades).every(value => value === 0);
  });
  await check('28. sortie missions award once and restart clears their progress', () => {
    resetGame(); startGame(); kills = 20; grazes = 10; perfectWaves = 3;
    checkMissions(); checkMissions();
    if (score !== 4500 || charge !== 60 || completedMissions.size !== 3) return false;
    syncUi(); if (!el('missionList').textContent.includes('보상 완료')) return false;
    resetGame(); return completedMissions.size === 0 && kills === 0 && grazes === 0 && perfectWaves === 0;
  });
  await check('29. relative touch avoids initial jump and ignores a second finger', () => {
    resetGame(); startGame(); relativeTouch = false; toggleTouchMode(); player.cooldown = 99; spawnTimer = 99;
    const rect = el('gameCanvas').getBoundingClientRect(), x = player.x, y = player.y;
    handlePointer({ type: 'pointerdown', pointerId: 7, pointerType: 'touch', clientX: rect.left + 20, clientY: rect.top + 20 });
    update(.01); if (player.x !== x || player.y !== y) return false;
    handlePointer({ type: 'pointermove', pointerId: 8, pointerType: 'touch', clientX: rect.right, clientY: rect.bottom });
    if (touchTarget.x !== x) return false;
    handlePointer({ type: 'pointermove', pointerId: 7, pointerType: 'touch', clientX: rect.left + 20 + rect.width * .1, clientY: rect.top + 20 });
    update(.1); if (!(player.x > x && player.x <= x + 48.01) || player.y !== y) return false;
    el('gameCanvas').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7 }));
    if (pointerControlEnabled || touchTarget || activePointerId !== null) return false;
    return localStorage.getItem('spaceShooterRelativeTouch') === 'true';
  });
  await check('30. weapon guide reflects current weapon, ship and refit firepower', () => {
    resetGame(); startGame(); changeWeapon('plasma'); upgrades.damage = 2; syncUi();
    if (!el('weaponInfo').textContent.includes('45% 범위 피해') || !el('weaponInfo').textContent.includes(fireInterval().toFixed(2) + '초')) return false;
    const normal = fireInterval(); charge = 100; activateOverdrive(); syncUi();
    if (!(fireInterval() < normal) || !el('weaponInfo').textContent.includes((SHIPS[player.ship].damage * 1.2 * 1.3).toFixed(2))) return false;
    changeWeapon('wave'); return el('weaponInfo').textContent.includes('감속');
  });
};
