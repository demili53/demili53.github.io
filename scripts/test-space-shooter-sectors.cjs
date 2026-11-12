module.exports = async function sectors(check, page) {
  await check('31. sectors rotate every five waves and loop safely', () => {
    resetGame(); return sectorFor(1) === sectorFor(5) && sectorFor(6) !== sectorFor(5) && sectorFor(11) !== sectorFor(6) && sectorFor(16) === sectorFor(1);
  });
  await check('32. sector rosters change real enemy selection', () => {
    return enemyTypeFor(.4, 1) === 'grunt' && enemyTypeFor(.4, 6) === 'shooter' && enemyTypeFor(.6, 11) === 'rusher';
  });
  await check('33. armor resists normal fire but railgun and laser bypass it', () => {
    resetGame(); const enemy = { hp: 100, armored: true, type: 'grunt' };
    hitEnemyWithBullet({ type: 'pulse', dmg: 10 }, enemy); if (enemy.hp !== 94) return false;
    hitEnemyWithBullet({ type: 'railgun', dmg: 10 }, enemy); hitEnemyWithBullet({ type: 'laser', dmg: 10 }, enemy);
    return enemy.hp === 74;
  });
  await check('34. carrier spawns once per wave and grants guaranteed supplies', () => {
    resetGame(); startGame(); wave = 4; waveTimer = 5.99; formationSpawned = true; spawnTimer = 99; player.cooldown = 99;
    update(.02); update(.02); const carrier = enemies.find(e => e.carrier);
    if (!carrier || enemies.filter(e => e.carrier).length !== 1) return false;
    carrier.hp = 0; resolveEnemyDeaths(true); resolveEnemyDeaths(true);
    return items.some(it => it.kind === 'power') && items.some(it => it.kind === 'bomb') && kills === 1;
  });
  await check('35. boss exposes a temporary weak point after firing', () => {
    resetGame(); startGame(); wave = 5; spawnBoss(); const boss = enemies[0]; boss.entering = false; boss.y = 90;
    bossFire(boss); const hp = boss.hp; hitEnemyWithBullet({ type: 'pulse', dmg: 10 }, boss);
    if (Math.abs(hp - boss.hp - 13.5) > .001) return false;
    boss.fireCd = 99; player.cooldown = 99; update(.5);
    const normalHp = boss.hp; hitEnemyWithBullet({ type: 'pulse', dmg: 10 }, boss);
    return boss.exposed === 0 && normalHp - boss.hp === 10;
  });
  await check('36. boss salvage recovers consumables once and leaves weapon choice intact', () => {
    resetGame(); startGame(); player.lives = 2;
    items = [{ kind: 'power' }, { kind: 'life' }, { kind: 'bomb' }, { kind: 'weapon', weapon: 'wave' }];
    bossSalvage = true; rewardWave = 5; showReward(); showReward('modules');
    return player.level === 2 && player.lives === 3 && bombs === 3 && items.length === 1 && items[0].kind === 'weapon' && !bossSalvage;
  });
  await page.evaluate(() => { resetGame(); startGame(); rewardWave = 3; showReward(); });
  await page.keyboard.press('m');
  await page.keyboard.press('1');
  await check('37. actual reward shortcuts select a module once', () => state === 'playing' && upgrades.damage === 1);
  await check('38. next-wave briefing distinguishes bosses and sector rosters', () => {
    resetGame(); startGame(); wave = 4; syncUi();
    if (!el('briefingEl').textContent.includes('보스 위협 1')) return false;
    wave = 6; rewardWave = 5; showReward();
    return el('briefingEl').textContent.includes('W6') && el('briefingEl').textContent.includes('사수 비중 증가') && waveBriefing(11).includes('돌격기 비중 증가');
  });
  await check('39. battle report counts actual damage without overkill and saves grade', () => {
    resetGame(); startGame(); const enemy = { hp: 7, type: 'grunt' };
    hitEnemyWithBullet({ type: 'pulse', dmg: 10 }, enemy); hitEnemyWithBullet({ type: 'pulse', dmg: 10 }, enemy);
    if (damageByWeapon.pulse !== 7 || enemy.hp !== 0) return false;
    score = 15000; gameOver();
    if (recentRuns[0].grade !== 'A' || recentRuns[0].damage.pulse !== 7 || !el('reportText').textContent.includes('펄스 7 (100%)')) return false;
    resetGame(); return Object.keys(damageByWeapon).length === 0 && runGrade(29999) === 'A' && runGrade(30000) === 'S';
  });
  await check('40a. audio is opt-in and creates no context before user action', () => {
    playSound('shot'); return !soundEnabled && audioContext === null && soundEvents === 0;
  });
  await page.click('#soundBtn');
  await page.waitForFunction(() => soundEnabled);
  await check('40b. enabled audio schedules bounded voices and throttles firing', () => {
    const before = soundEvents; for (let i = 0; i < 20; i++) playSound('shot');
    return soundEvents === before + 1 && soundVoices <= 6 && audioContext.state === 'running';
  });
  await page.click('#soundBtn');
  await page.waitForFunction(() => soundVoices === 0);
  await check('40c. muting stops active sound and prevents new voices', () => {
    const before = soundEvents; playSound('power'); return !soundEnabled && soundEvents === before && activeSounds.size === 0;
  });
};
