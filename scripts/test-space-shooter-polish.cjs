module.exports = async function polish(check, page) {
  await check('41. swept shots hit the first surface rather than the nearest center', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    const boss = { type: 'boss', x: 240, y: 180, w: 140, h: 94, hp: 100, maxHp: 100, vx: 0, entering: false, fireCd: 99, tier: 1 };
    const grunt = { type: 'grunt', x: 240, y: 200, w: 30, h: 26, hp: 100, maxHp: 100, vy: 0, score: 100 };
    enemies = [grunt, boss];
    const first = sweptEntry(240, 300, 240, 100, 2, boss);
    const second = sweptEntry(240, 300, 240, 100, 2, grunt);
    if (Math.abs(first - .355) > .0001 || Math.abs(second - .425) > .0001 || first >= second) return false;
    pBullets = [{ x: 240, y: 300, vx: 0, vy: -4000, r: 2, dmg: 10, type: 'pulse', hits: [], pierce: 0 }];
    update(.05);
    return boss.hp === 90 && grunt.hp === 100 && pBullets.length === 0;
  });
  await check('42. relative-touch dash rebases drag anchors by the clamped displacement', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    relativeTouch = true; pointerIsTouch = true; pointerControlEnabled = true; activePointerId = 77;
    const x = player.x, y = player.y;
    touchAnchor = { x: 20, y: 20, shipX: x, shipY: y }; touchTarget = { x: x + 30, y };
    keys.KeyD = true; dash(); delete keys.KeyD;
    if (player.x !== x + 110 || touchAnchor.shipX !== x + 110 || touchTarget.x !== x + 140) return false;
    const rect = el('gameCanvas').getBoundingClientRect();
    handlePointer({ type: 'pointermove', pointerId: 77, pointerType: 'touch', clientX: rect.left + 50 * rect.width / W, clientY: rect.top + 20 * rect.height / H });
    update(.05);
    if (player.x < x + 110 || Math.abs(touchTarget.x - (x + 140)) > .0001) return false;
    // At the edge, only the actual clamped movement belongs in the anchor.
    player.x = W - 20; touchAnchor.shipX = player.x; touchTarget.x = player.x;
    const edgeX = player.x; dashCooldown = 0; keys.KeyD = true; dash(); delete keys.KeyD;
    const displacement = player.x - edgeX;
    return displacement > 0 && displacement < 110 && touchAnchor.shipX === player.x && touchTarget.x === player.x;
  });
  await check('43. a mission completed on a fatal frame is included in the final score event', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99; kills = 19; player.lives = 1;
    const target = { type: 'grunt', x: 240, y: 100, w: 30, h: 26, hp: 1, maxHp: 1, vy: 0, score: 100 };
    const collider = { type: 'grunt', x: player.x, y: player.y, w: 30, h: 26, hp: 100, maxHp: 100, vy: 0, score: 100 };
    enemies = [target, collider];
    pBullets = [{ x: 240, y: 130, vx: 0, vy: -1000, r: 2, dmg: 2, type: 'pulse', hits: [], pierce: 0 }];
    const events = [], listener = event => events.push(event.detail);
    window.addEventListener('partygame:score', listener);
    try {
      update(.05);
      // First kill grants 108 points; the newly completed 20-kill mission grants 1,500.
      return state === 'over' && kills === 20 && completedMissions.has('kills') && score === 1608 && events.length === 1 && events[0].score === 1608 && recentRuns[0].score === 1608;
    } finally { window.removeEventListener('partygame:score', listener); }
  });
  await check('44. weapon lock converts pickups to energy without changing manual selection', () => {
    resetGame(); startGame(); weaponLocked = true; changeWeapon('pulse'); player.cooldown = .3;
    try {
      applyItem('weapon', 'wave');
      if (player.weapon !== 'pulse' || player.cooldown !== .3 || charge !== 10) return false;
      changeWeapon('railgun');
      return player.weapon === 'railgun' && player.cooldown === .3 && charge === 10;
    } finally { weaponLocked = false; }
  });
  await check('45. upgraded bombs scale boss damage and cannot be spent while paused', () => {
    resetGame(); startGame(); wave = 5; spawnBoss(); const boss = enemies[0];
    const initial = boss.hp; player.level = 1; bomb();
    if (initial - boss.hp !== 30 || bombs !== 1) return false;
    player.level = 10; bomb();
    if (initial - boss.hp !== 105 || bombs !== 0 || damageByWeapon.bomb !== 105) return false;
    bombs = 1; togglePause(); const remainingHp = boss.hp; bomb();
    return boss.hp === remainingHp && bombs === 1;
  });
  await check('46. hit recovery clears nearby bullets safely including shield hits', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    const bullet = dx => ({ x: player.x + dx, y: player.y, r: 3, vx: 0, vy: 0 });
    const far = bullet(130), hp = player.lives;
    eBullets = [bullet(10), far, bullet(20), bullet(0)];
    update(.01);
    if (player.lives !== hp - 1 || eBullets.length !== 1 || eBullets[0] !== far) return false;
    eBullets.push(bullet(10)); hitPlayer();
    if (eBullets.length !== 2) return false; // Invulnerability does not repeatedly erase bullets.
    player.invuln = 0; player.shield = 1; hitPlayer();
    return player.shield === 0 && player.lives === hp - 1 && eBullets.length === 1 && eBullets[0] === far;
  });
  await check('47. support drones unlock at levels six and nine and pause their cadence', () => {
    resetGame(); startGame(); spawnTimer = 99; player.cooldown = 99;
    player.level = 5; fireDrones(); if (droneCount() !== 0 || pBullets.length) return false;
    player.level = 6; fireDrones(); if (droneCount() !== 1 || pBullets.length !== 1 || pBullets[0].type !== 'drone') return false;
    pBullets = []; player.level = 9; fireDrones();
    if (droneCount() !== 2 || pBullets.length !== 2 || pBullets[0].x === pBullets[1].x) return false;
    hitEnemyWithBullet(pBullets[0], { type: 'grunt', hp: 100 });
    if (!(damageByWeapon.drone > 0)) return false;
    pBullets = []; droneCooldown = 0; update(.01);
    if (pBullets.length !== 2 || Math.abs(droneCooldown - .65) > .0001) return false;
    togglePause(); update(1); if (Math.abs(droneCooldown - .65) > .0001) return false;
    startGame(); update(.05); return Math.abs(droneCooldown - .6) < .0001;
  });
  await check('48. earned lifetime medals appear in the collection after a completed run', () => {
    resetGame(); startGame(); wave = 6; kills = 55; perfectWaves = 3; grazes = 20; elapsed = 123;
    gameOver(); const snapshot = progressLedger.snapshot();
    const earned = ['first_clear', 'ace', 'untouchable', 'grazer'];
    return earned.every(id => snapshot.medals.includes(id) && el('medalList').textContent.includes('★ ' + ShooterProgress.MEDALS[id]));
  });
  await check('49. lifetime counters persist, count each run once and survive restarting', () => {
    const before = progressLedger.snapshot();
    resetGame(); startGame(); kills = 7; elapsed = 17.9; wave = 2; score = 100;
    gameOver(); gameOver(); const after = progressLedger.snapshot();
    if (after.runs !== before.runs + 1 || after.totalKills !== before.totalKills + 7 || after.totalSeconds !== before.totalSeconds + 17) return false;
    const restored = ShooterProgress.create(localStorage).snapshot();
    const counters = ['runs', 'totalKills', 'totalSeconds', 'bestWave', 'bestScore'];
    if (!counters.every(key => restored[key] === after[key])) return false;
    resetGame(); return counters.every(key => progressLedger.snapshot()[key] === after[key]);
  });
  const savedVolume = await page.evaluate(() => ({ value: soundVolume, enabled: soundEnabled }));
  try {
    if (!savedVolume.enabled) { await page.click('#soundBtn'); await page.waitForFunction(() => soundEnabled); }
    await page.locator('#soundVolume').evaluate(input => { input.value = '25'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.evaluate(() => playSound('boss'));
    try {
      await page.waitForFunction(() => masterGain !== null && Math.abs(masterGain.gain.value - .25) < .01, null, { timeout: 2000 });
    } catch (error) {
      console.error('Volume automation state:', await page.evaluate(() => ({ soundVolume, enabled: soundEnabled, context: audioContext?.state, time: audioContext?.currentTime, gain: masterGain?.gain.value, voices: soundVoices })));
      throw error;
    }
    await check('50a. the actual volume input updates preference, label and master gain', () => {
      return soundVolume === 25 && el('soundVolumeValue').textContent === '25%' && localStorage.getItem('spaceShooterVolume') === '25' && masterGain !== null && Math.abs(masterGain.gain.value - .25) < .01;
    });
    if (!(await page.evaluate(() => soundEnabled))) { await page.click('#soundBtn'); await page.waitForFunction(() => soundEnabled); }
    await page.locator('#soundVolume').evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await check('50b. zero volume suppresses new voices even while sound is enabled', () => {
      const before = soundEvents; playSound('power');
      return soundEnabled && soundVolume === 0 && soundEvents === before;
    });
  } finally {
    await page.locator('#soundVolume').evaluate((input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }, savedVolume.value);
    if ((await page.evaluate(() => soundEnabled)) !== savedVolume.enabled) await page.click('#soundBtn');
  }
};
