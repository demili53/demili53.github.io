(() => {
  "use strict";

  const W = 480;
  const H = 720;
  const MAX_ENEMIES = 110;
  const $ = (id) => document.getElementById(id);
  const ui = {
    score: $("scoreEl"), best: $("bestEl"), time: $("timeEl"), level: $("levelEl"), kills: $("killsEl"),
    hpText: $("hpText"), hpBar: $("hpBar"), xpText: $("xpText"), xpBar: $("xpBar"), status: $("statusEl"),
    overlay: $("gameOverlay"), overlayTitle: $("overlayTitle"), overlayText: $("overlayText"), overlayStart: $("overlayStartBtn"),
    upgrades: $("upgradeOverlay"), upgradeChoices: $("upgradeChoices"), pause: $("pauseOverlay")
  };

  let app;
  let state = "loading";
  let world;
  let effects;
  let player;
  let heroFrames = [];
  let enemyFrames = [];
  let enemies = [];
  let bullets = [];
  let gems = [];
  let slashes = [];
  let keys = new Set();
  let pointer = { active: false, sx: 0, sy: 0, x: 0, y: 0 };
  let elapsed = 0;
  let score = 0;
  let kills = 0;
  let level = 1;
  let xp = 0;
  let xpNeeded = 8;
  let wave = 1;
  let spawnTimer = 0;
  let fireTimer = 0;
  let auraTimer = 0;
  let bossWave = 0;
  let best = Number(localStorage.getItem("vampireSurvivalBest") || 0);
  let stats = {};

  ui.best.textContent = best.toLocaleString("ko-KR");

  function makeFrame(texture, col, row) {
    const fw = Math.floor(texture.width / 2);
    const fh = Math.floor(texture.height / 2);
    return new PIXI.Texture({ source: texture.source, frame: new PIXI.Rectangle(col * fw, row * fh, fw, fh) });
  }

  function makeCircle(radius, color, alpha = 1) {
    return new PIXI.Graphics().circle(0, 0, radius).fill({ color, alpha });
  }

  async function boot() {
    try {
      app = new PIXI.Application();
      await app.init({ canvas: $("gameCanvas"), width: W, height: H, background: "#090613", antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
      const [heroAtlas, enemyAtlas] = await Promise.all([
        PIXI.Assets.load("/assets/games/vampire-survival/hunter-walk-v1.png"),
        PIXI.Assets.load("/assets/games/vampire-survival/enemy-atlas-v1.png")
      ]);
      heroFrames = [makeFrame(heroAtlas, 0, 0), makeFrame(heroAtlas, 1, 0), makeFrame(heroAtlas, 0, 1), makeFrame(heroAtlas, 1, 1)];
      enemyFrames = [makeFrame(enemyAtlas, 0, 0), makeFrame(enemyAtlas, 1, 0), makeFrame(enemyAtlas, 0, 1), makeFrame(enemyAtlas, 1, 1)];
      createScene();
      bindControls();
      state = "idle";
      ui.status.textContent = "준비 완료";
      app.ticker.add(gameLoop);
    } catch (error) {
      console.error("PixiJS 게임을 초기화하지 못했습니다.", error);
      ui.status.textContent = "게임 자산을 불러오지 못했습니다. 새로고침해 주세요.";
      ui.overlayTitle.textContent = "불러오기 실패";
      ui.overlayText.textContent = "네트워크 연결을 확인한 뒤 새로고침해 주세요.";
      ui.overlayStart.hidden = true;
    }
  }

  function createScene() {
    world = new PIXI.Container();
    effects = new PIXI.Container();
    app.stage.addChild(world, effects);

    const ground = new PIXI.Graphics().rect(0, 0, W, H).fill("#0b0716");
    for (let y = 0; y < H; y += 48) {
      for (let x = (y / 48) % 2 ? 24 : 0; x < W; x += 48) {
        ground.circle(x, y, 1.6).fill({ color: "#6d5b92", alpha: 0.28 });
      }
    }
    ground.rect(18, 18, W - 36, H - 36).stroke({ color: "#4c3b72", alpha: 0.4, width: 2 });
    world.addChild(ground);

    const fog = new PIXI.Graphics();
    for (let i = 0; i < 12; i += 1) {
      fog.circle(Math.random() * W, Math.random() * H, 25 + Math.random() * 55).fill({ color: i % 2 ? "#45226e" : "#163b4c", alpha: 0.04 });
    }
    world.addChild(fog);
  }

  function resetGame() {
    if (!app || heroFrames.length !== 4 || state === "loading") {
      ui.status.textContent = "게임 자산을 불러오는 중입니다…";
      return;
    }
    enemies.forEach(removeEnemy);
    bullets.forEach((b) => b.g.destroy());
    gems.forEach((g) => g.g.destroy());
    slashes.forEach((g) => g.destroy());
    enemies = []; bullets = []; gems = []; slashes = [];
    if (player) player.sprite.destroy();

    elapsed = 0; score = 0; kills = 0; level = 1; xp = 0; xpNeeded = 8; wave = 1;
    spawnTimer = 0.35; fireTimer = 0.2; auraTimer = 0; bossWave = 0;
    stats = { maxHp: 100, hp: 100, speed: 190, damage: 18, fireRate: 0.72, projectiles: 1, pickup: 62, aura: 0, armor: 0 };

    const sprite = new PIXI.AnimatedSprite(heroFrames);
    sprite.anchor.set(0.5);
    sprite.width = 82; sprite.height = 82;
    sprite.animationSpeed = 0.13;
    sprite.play();
    sprite.x = W / 2; sprite.y = H / 2;
    const aura = new PIXI.Graphics().circle(0, 0, 46).stroke({ color: "#c4b5fd", alpha: 0, width: 2 });
    sprite.addChildAt(aura, 0);
    world.addChild(sprite);
    player = { sprite, aura, invulnerable: 0 };

    state = "running";
    ui.overlay.classList.add("hidden");
    ui.upgrades.classList.add("hidden");
    ui.upgrades.classList.remove("flex");
    ui.pause.classList.add("hidden");
    ui.pause.classList.remove("flex");
    ui.status.textContent = "밤이 시작되었습니다";
    updateHud();
  }

  function enemyTypeForTime() {
    const r = Math.random();
    if (elapsed > 70 && r < 0.24) return 2;
    if (elapsed > 28 && r < 0.5) return 1;
    return 0;
  }

  function spawnEnemy(type = enemyTypeForTime()) {
    if (enemies.length >= MAX_ENEMIES) return;
    const side = Math.floor(Math.random() * 4);
    let x; let y;
    if (side === 0) { x = Math.random() * W; y = -45; }
    else if (side === 1) { x = W + 45; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 45; }
    else { x = -45; y = Math.random() * H; }

    const isBoss = type === 3;
    const base = [26, 54, 88, 760][type];
    const hp = Math.round(base * (1 + elapsed / (isBoss ? 220 : 150)));
    const sprite = new PIXI.Sprite(enemyFrames[type]);
    sprite.anchor.set(0.5);
    const size = [58, 64, 67, 116][type];
    sprite.width = size; sprite.height = size;
    sprite.x = x; sprite.y = y;
    world.addChild(sprite);

    const bar = new PIXI.Graphics();
    sprite.addChild(bar);
    const enemy = { sprite, type, hp, maxHp: hp, speed: [74, 50, 37, 29][type] * (1 + Math.min(elapsed, 180) / 600), radius: isBoss ? 37 : 22, points: [12, 28, 48, 500][type], bar, hit: 0 };
    drawEnemyBar(enemy);
    enemies.push(enemy);
  }

  function drawEnemyBar(enemy) {
    const width = enemy.type === 3 ? 74 : 42;
    const y = -(enemy.sprite.height / 2) - 8;
    enemy.bar.clear().roundRect(-width / 2, y, width, 5, 2).fill({ color: "#160d20", alpha: 0.9 }).roundRect(-width / 2, y, width * Math.max(0, enemy.hp / enemy.maxHp), 5, 2).fill(enemy.type === 3 ? "#ef4444" : "#a3e635");
  }

  function removeEnemy(enemy) {
    if (enemy?.sprite && !enemy.sprite.destroyed) enemy.sprite.destroy({ children: true });
  }

  function nearestEnemy() {
    let nearest = null;
    let bestDist = Infinity;
    for (const enemy of enemies) {
      const dx = enemy.sprite.x - player.sprite.x;
      const dy = enemy.sprite.y - player.sprite.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; nearest = enemy; }
    }
    return nearest;
  }

  function fire() {
    const target = nearestEnemy();
    if (!target) return;
    const baseAngle = Math.atan2(target.sprite.y - player.sprite.y, target.sprite.x - player.sprite.x);
    const count = stats.projectiles;
    for (let i = 0; i < count; i += 1) {
      const angle = baseAngle + (i - (count - 1) / 2) * 0.13;
      const g = new PIXI.Graphics().circle(0, 0, 5).fill("#9ee7ff").circle(0, 0, 9).stroke({ color: "#7c3aed", alpha: 0.55, width: 2 });
      g.x = player.sprite.x; g.y = player.sprite.y;
      effects.addChild(g);
      bullets.push({ g, vx: Math.cos(angle) * 390, vy: Math.sin(angle) * 390, damage: stats.damage, life: 1.5 });
    }
  }

  function damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.hit = 0.08;
    drawEnemyBar(enemy);
    if (enemy.hp <= 0) { killEnemy(enemy); return true; }
    return false;
  }

  function killEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    enemies.splice(index, 1);
    score += enemy.points;
    kills += 1;
    const gem = makeCircle(enemy.type === 3 ? 10 : 7, enemy.type === 3 ? "#fbbf24" : "#a78bfa");
    gem.x = enemy.sprite.x; gem.y = enemy.sprite.y;
    world.addChild(gem);
    gems.push({ g: gem, value: enemy.type === 3 ? 12 : enemy.type + 1, life: 18 });
    burst(enemy.sprite.x, enemy.sprite.y, enemy.type === 3 ? "#ef4444" : "#8b5cf6");
    removeEnemy(enemy);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 5; i += 1) {
      const p = makeCircle(2 + Math.random() * 2, color, 0.8);
      p.x = x; p.y = y;
      p.vx = (Math.random() - 0.5) * 110;
      p.vy = (Math.random() - 0.5) * 110;
      p.life = 0.35;
      effects.addChild(p);
      slashes.push(p);
    }
  }

  function gainXp(amount) {
    xp += amount;
    if (xp >= xpNeeded) {
      xp -= xpNeeded;
      level += 1;
      xpNeeded = Math.floor(8 + level * 4.2);
      showUpgrade();
    }
  }

  const upgradePool = [
    { icon: "✦", title: "응축 마력", text: "마력탄 공격력 +30%", apply: () => { stats.damage *= 1.3; } },
    { icon: "☄", title: "분열 주문", text: "동시 발사체 +1 (최대 5)", available: () => stats.projectiles < 5, apply: () => { stats.projectiles += 1; } },
    { icon: "⚡", title: "신속 시전", text: "공격 간격 16% 감소", apply: () => { stats.fireRate = Math.max(0.19, stats.fireRate * 0.84); } },
    { icon: "☾", title: "밤의 발걸음", text: "이동 속도 +14%", apply: () => { stats.speed *= 1.14; } },
    { icon: "♡", title: "진홍 계약", text: "최대 체력 +25, 체력 35 회복", apply: () => { stats.maxHp += 25; stats.hp = Math.min(stats.maxHp, stats.hp + 35); } },
    { icon: "◎", title: "영혼 자석", text: "경험치 획득 반경 +35", apply: () => { stats.pickup += 35; } },
    { icon: "◉", title: "성스러운 오라", text: "근접 적에게 지속 피해", apply: () => { stats.aura += 8; } },
    { icon: "◆", title: "은빛 갑옷", text: "받는 피해 15% 감소", available: () => stats.armor < 0.6, apply: () => { stats.armor += 0.15; } }
  ];

  function showUpgrade() {
    state = "upgrade";
    ui.upgradeChoices.replaceChildren();
    const choices = [...upgradePool].sort(() => Math.random() - 0.5).filter((u) => !u.available || u.available()).slice(0, 3);
    choices.forEach((upgrade) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      const title = document.createElement("strong");
      title.className = "block text-lg text-violet-100";
      title.textContent = `${upgrade.icon} ${upgrade.title}`;
      const desc = document.createElement("span");
      desc.className = "mt-1 block text-sm text-slate-300";
      desc.textContent = upgrade.text;
      button.append(title, desc);
      button.addEventListener("click", () => {
        upgrade.apply();
        ui.upgrades.classList.add("hidden");
        ui.upgrades.classList.remove("flex");
        state = "running";
        ui.status.textContent = `${upgrade.title} 강화 완료`;
        updateHud();
      }, { once: true });
      ui.upgradeChoices.append(button);
    });
    ui.upgrades.classList.remove("hidden");
    ui.upgrades.classList.add("flex");
    ui.upgradeChoices.querySelector("button")?.focus();
  }

  function movePlayer(dt) {
    let x = 0; let y = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
    if (pointer.active) {
      const dx = pointer.x - pointer.sx;
      const dy = pointer.y - pointer.sy;
      const length = Math.hypot(dx, dy);
      if (length > 8) { x += dx / Math.max(42, length); y += dy / Math.max(42, length); }
    }
    const length = Math.hypot(x, y);
    if (length > 0) {
      x /= length; y /= length;
      player.sprite.x = Math.max(35, Math.min(W - 35, player.sprite.x + x * stats.speed * dt));
      player.sprite.y = Math.max(48, Math.min(H - 42, player.sprite.y + y * stats.speed * dt));
      player.sprite.scale.x = x < -0.05 ? -Math.abs(player.sprite.scale.x) : x > 0.05 ? Math.abs(player.sprite.scale.x) : player.sprite.scale.x;
      player.sprite.animationSpeed = 0.16;
    } else player.sprite.animationSpeed = 0.08;
  }

  function gameLoop(ticker) {
    if (state !== "running") return;
    const dt = Math.min(ticker.deltaMS / 1000, 0.034);
    elapsed += dt;
    wave = Math.floor(elapsed / 30) + 1;
    movePlayer(dt);
    if (player.invulnerable > 0) {
      player.invulnerable -= dt;
      player.sprite.alpha = Math.floor(player.invulnerable * 12) % 2 ? 0.42 : 1;
    } else player.sprite.alpha = 1;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.19, 0.82 - elapsed * 0.0045);
    }
    if (wave % 3 === 0 && bossWave !== wave) { bossWave = wave; spawnEnemy(3); ui.status.textContent = `웨이브 ${wave}: 뱀파이어 군주 출현!`; }

    fireTimer -= dt;
    if (fireTimer <= 0) { fire(); fireTimer = stats.fireRate; }
    auraTimer -= dt;
    player.aura.clear().circle(0, 0, 50 + stats.aura * 1.8).stroke({ color: "#c4b5fd", alpha: stats.aura ? 0.42 : 0, width: 2 });

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      const dx = player.sprite.x - enemy.sprite.x;
      const dy = player.sprite.y - enemy.sprite.y;
      const distance = Math.max(0.01, Math.hypot(dx, dy));
      enemy.sprite.x += dx / distance * enemy.speed * dt;
      enemy.sprite.y += dy / distance * enemy.speed * dt;
      enemy.hit -= dt;
      enemy.sprite.tint = enemy.hit > 0 ? "#ffffff" : "#ffffff";
      if (stats.aura > 0 && distance < 52 + stats.aura * 1.8 && auraTimer <= 0 && damageEnemy(enemy, stats.aura)) continue;
      if (distance < enemy.radius + 19 && player.invulnerable <= 0) {
        const damage = (enemy.type === 3 ? 28 : 13 + enemy.type * 4) * (1 - stats.armor);
        stats.hp = Math.max(0, stats.hp - damage);
        player.invulnerable = 0.72;
        burst(player.sprite.x, player.sprite.y, "#fb7185");
        if (stats.hp <= 0) { endGame(); return; }
      }
    }
    if (auraTimer <= 0) auraTimer = 0.45;

    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.g.x += bullet.vx * dt; bullet.g.y += bullet.vy * dt; bullet.life -= dt;
      let hit = false;
      for (const enemy of enemies) {
        const dx = enemy.sprite.x - bullet.g.x; const dy = enemy.sprite.y - bullet.g.y;
        if (dx * dx + dy * dy < (enemy.radius + 7) ** 2) { damageEnemy(enemy, bullet.damage); hit = true; break; }
      }
      if (hit || bullet.life <= 0 || bullet.g.x < -20 || bullet.g.x > W + 20 || bullet.g.y < -20 || bullet.g.y > H + 20) {
        bullet.g.destroy(); bullets.splice(i, 1);
      }
    }

    for (let i = gems.length - 1; i >= 0; i -= 1) {
      const gem = gems[i];
      const dx = player.sprite.x - gem.g.x; const dy = player.sprite.y - gem.g.y; const distance = Math.hypot(dx, dy);
      if (distance < stats.pickup) { gem.g.x += dx * dt * 8; gem.g.y += dy * dt * 8; }
      gem.g.rotation += dt * 3; gem.life -= dt;
      if (distance < 22) { gainXp(gem.value); gem.g.destroy(); gems.splice(i, 1); }
      else if (gem.life <= 0) { gem.g.destroy(); gems.splice(i, 1); }
    }
    for (let i = slashes.length - 1; i >= 0; i -= 1) {
      const p = slashes[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.alpha = Math.max(0, p.life * 2.5);
      if (p.life <= 0) { p.destroy(); slashes.splice(i, 1); }
    }
    score += dt * (3 + wave);
    updateHud();
  }

  function updateHud() {
    const roundedScore = Math.floor(score);
    ui.score.textContent = roundedScore.toLocaleString("ko-KR");
    ui.best.textContent = Math.max(best, roundedScore).toLocaleString("ko-KR");
    ui.time.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
    ui.level.textContent = level; ui.kills.textContent = kills;
    ui.hpText.textContent = `${Math.ceil(stats.hp)} / ${stats.maxHp}`;
    ui.hpBar.style.width = `${Math.max(0, stats.hp / stats.maxHp * 100)}%`;
    ui.xpText.textContent = `${xp} / ${xpNeeded}`; ui.xpBar.style.width = `${xp / xpNeeded * 100}%`;
  }

  function endGame() {
    if (state === "over") return;
    state = "over";
    const finalScore = Math.floor(score);
    if (finalScore > best) { best = finalScore; localStorage.setItem("vampireSurvivalBest", String(best)); }
    updateHud();
    ui.overlayTitle.textContent = "밤이 사냥꾼을 삼켰습니다";
    ui.overlayText.textContent = `${ui.time.textContent} 생존 · ${kills}마리 처치 · ${finalScore.toLocaleString("ko-KR")}점`;
    ui.overlayStart.textContent = "다시 도전";
    ui.overlayStart.hidden = false;
    ui.overlay.classList.remove("hidden");
    ui.status.textContent = "게임 오버";
    window.dispatchEvent(new CustomEvent("partygame:score", { detail: { gameId: "vampire-survival", score: finalScore, wave } }));
  }

  function togglePause() {
    if (state === "running") {
      state = "paused"; ui.pause.classList.remove("hidden"); ui.pause.classList.add("flex"); ui.status.textContent = "일시정지";
    } else if (state === "paused") {
      state = "running"; ui.pause.classList.add("hidden"); ui.pause.classList.remove("flex"); ui.status.textContent = "생존 중";
    }
  }

  function canvasPoint(event) {
    const rect = app.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }

  function bindControls() {
    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
      keys.add(event.code);
      if (event.code === "KeyP") togglePause();
    });
    window.addEventListener("keyup", (event) => keys.delete(event.code));
    app.canvas.addEventListener("pointerdown", (event) => { const p = canvasPoint(event); pointer = { active: true, sx: p.x, sy: p.y, x: p.x, y: p.y }; app.canvas.setPointerCapture(event.pointerId); });
    app.canvas.addEventListener("pointermove", (event) => { if (pointer.active) Object.assign(pointer, canvasPoint(event)); });
    const release = () => { pointer.active = false; };
    app.canvas.addEventListener("pointerup", release); app.canvas.addEventListener("pointercancel", release);
    ui.overlayStart.addEventListener("click", resetGame);
    $("startBtn").addEventListener("click", () => state === "paused" ? togglePause() : resetGame());
    $("resetBtn").addEventListener("click", resetGame);
    $("pauseBtn").addEventListener("click", togglePause);
    $("fullscreenBtn").addEventListener("click", async () => {
      try { if (!document.fullscreenElement) await $("gameShell").requestFullscreen(); else await document.exitFullscreen(); } catch (_) {}
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden && state === "running") togglePause(); });
  }

  boot();
})();
