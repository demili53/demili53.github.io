(() => {
  "use strict";

  const W = 720;
  const H = 480;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const el = (id) => document.getElementById(id);
  const scoreEl = el("scoreEl");
  const bestEl = el("bestEl");
  const waveEl = el("waveEl");
  const comboEl = el("comboEl");
  const statusEl = el("statusEl");
  const overlay = el("gameOverlay");
  const overlayTitle = el("overlayTitle");
  const overlayText = el("overlayText");
  const overlayStartBtn = el("overlayStartBtn");

  const weapons = {
    pistol: { name: "권총", interval: 320, speed: 600, damage: 28, spread: 0, pellets: 1, texture: "bullet-pistol" },
    rifle: { name: "소총", interval: 110, speed: 720, damage: 15, spread: 0.035, pellets: 1, texture: "bullet-rifle" },
    shotgun: { name: "산탄총", interval: 650, speed: 520, damage: 18, spread: 0.34, pellets: 6, texture: "bullet-shotgun" }
  };

  let scene = null;
  let player = null;
  let zombies = null;
  let bullets = null;
  let gameState = "idle";
  let score = 0;
  let best = Number(localStorage.getItem("zombiShotBest") || 0);
  let wave = 1;
  let waveElapsed = 0;
  let spawnElapsed = 0;
  let combo = 0;
  let comboElapsed = 0;
  let selectedWeapon = "pistol";
  let pointerHeld = false;
  let fireHeld = false;
  let nextShotAt = 0;
  let targetX = W / 2;
  let pointerControls = false;
  const scrollingDecor = [];
  const heldKeys = {};

  function makeTextures(currentScene) {
    const make = (key, width, height, draw) => {
      if (currentScene.textures.exists(key)) return;
      const graphics = currentScene.make.graphics({ x: 0, y: 0, add: false });
      draw(graphics, width, height);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    make("survivor", 40, 40, (g) => {
      g.fillStyle(0x4ade80, 0.2); g.fillCircle(20, 20, 19);
      g.fillStyle(0xd1fae5, 1); g.fillCircle(18, 20, 10);
      g.fillStyle(0x22c55e, 1); g.fillRect(10, 25, 17, 11);
      g.fillStyle(0xe2e8f0, 1); g.fillRect(24, 17, 16, 6);
    });

    const zombieTexture = (key, size, color, eyes, boss = false) => make(key, size, size, (g) => {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(size / 2 + 2, size * 0.78, size * 0.72, size * 0.22);
      g.fillStyle(color, 1); g.fillCircle(size / 2, size / 2, size * 0.39);
      g.fillStyle(eyes, 1); g.fillCircle(size * 0.39, size * 0.43, Math.max(2, size * 0.045)); g.fillCircle(size * 0.61, size * 0.43, Math.max(2, size * 0.045));
      g.lineStyle(Math.max(2, size * 0.04), 0x1c1917, 1); g.lineBetween(size * 0.36, size * 0.62, size * 0.64, size * 0.59);
      if (boss) { g.fillStyle(0xf97316, 1); g.fillRect(size * 0.12, size * 0.08, size * 0.76, 7); }
    });
    zombieTexture("zombie-walker", 38, 0x65a30d, 0xd9f99d);
    zombieTexture("zombie-runner", 32, 0xeab308, 0xfef9c3);
    zombieTexture("zombie-brute", 50, 0x15803d, 0xbbf7d0);
    zombieTexture("zombie-boss", 82, 0x7f1d1d, 0xfecaca, true);

    make("bullet-pistol", 10, 10, (g) => { g.fillStyle(0xfde68a, 1); g.fillCircle(5, 5, 4); });
    make("bullet-rifle", 10, 10, (g) => { g.fillStyle(0x86efac, 1); g.fillCircle(5, 5, 4); });
    make("bullet-shotgun", 10, 10, (g) => { g.fillStyle(0xfda4af, 1); g.fillCircle(5, 5, 4); });
  }

  function drawArena(currentScene) {
    const background = currentScene.add.graphics().setDepth(-100);
    background.fillStyle(0x07110c, 1).fillRect(0, 0, W, H);
    background.fillStyle(0x111c18, 1).fillRect(48, 0, W - 96, H);
    background.fillStyle(0x052e16, 0.72).fillRect(0, 0, 48, H).fillRect(W - 48, 0, 48, H);
    background.lineStyle(3, 0x4ade80, 0.32).lineBetween(48, 0, 48, H).lineBetween(W - 48, 0, W - 48, H);
    scrollingDecor.length = 0;
    [W / 3, W * 2 / 3].forEach((x) => {
      for (let y = -60; y < H + 80; y += 96) {
        scrollingDecor.push(currentScene.add.rectangle(x, y, 5, 42, 0x94a3b8, 0.28).setDepth(-90).setData("speed", 150));
      }
    });
    for (let i = 0; i < 18; i += 1) {
      const x = 66 + ((i * 137) % (W - 132));
      const y = (i * 71) % (H + 80) - 40;
      scrollingDecor.push(currentScene.add.rectangle(x, y, 9 + (i % 3) * 5, 3, 0xbe185d, 0.24).setDepth(-91).setData("speed", 110));
    }
    background.fillStyle(0xef4444, 0.22).fillRect(0, H - 12, W, 12);
    background.lineStyle(2, 0xf87171, 0.85).lineBetween(0, H - 12, W, H - 12);
  }

  function updateScrollingArena(delta) {
    scrollingDecor.forEach((item) => {
      item.y += item.getData("speed") * delta / 1000;
      if (item.y > H + 28) item.y = -60;
    });
  }

  function create() {
    scene = this;
    makeTextures(this);
    drawArena(this);

    zombies = this.physics.add.group({ maxSize: 40 });
    bullets = this.physics.add.group({ maxSize: 90 });
    player = this.physics.add.image(W / 2, H - 42, "survivor").setDepth(10).setCollideWorldBounds(true);
    player.body.setCircle(14, 6, 6);
    player.rotation = -Math.PI / 2;

    this.physics.add.overlap(bullets, zombies, onBulletHit, null, this);
    this.physics.add.overlap(player, zombies, onPlayerHit, null, this);

    this.input.on("pointermove", (pointer) => { targetX = clamp(pointer.worldX, 20, W - 20); pointerControls = true; });
    this.input.on("pointerdown", (pointer) => {
      targetX = clamp(pointer.worldX, 20, W - 20); pointerControls = true; pointerHeld = true;
      if (gameState === "idle" || gameState === "over") startGame();
    });
    this.input.on("pointerup", () => { pointerHeld = false; });
    resetGame();
    syncUi("대기 중");
  }

  function update(time, delta) {
    if (gameState !== "running") return;
    const dt = Math.min(delta, 50);
    updateScrollingArena(dt);
    updatePlayer(time);
    updateZombies();
    cleanupObjects(time);

    waveElapsed += dt;
    spawnElapsed -= dt;
    comboElapsed -= dt;
    if (comboElapsed <= 0) combo = 0;

    if (spawnElapsed <= 0) {
      spawnZombie();
      if (wave >= 3 && Math.random() < 0.25) spawnZombie();
      spawnElapsed = Math.max(280, 1200 - wave * 65);
    }
    if (waveElapsed >= 18000) {
      wave += 1;
      waveElapsed = 0;
      if (wave % 5 === 0) { spawnZombie("boss"); statusEl.textContent = `웨이브 ${wave} · 거대 변종 출현!`; }
      else statusEl.textContent = `웨이브 ${wave} 시작`;
    }
    syncUi();
  }

  function updatePlayer(time) {
    const x = (heldKeys.ArrowRight || heldKeys.KeyD ? 1 : 0) - (heldKeys.ArrowLeft || heldKeys.KeyA ? 1 : 0);
    if (x !== 0) {
      player.setVelocityX(x * 230);
      targetX = player.x;
      pointerControls = false;
    } else if (pointerControls) {
      const distance = targetX - player.x;
      player.setVelocityX(Math.abs(distance) < 3 ? 0 : clamp(distance * 8, -230, 230));
    } else player.setVelocityX(0);
    player.setVelocityY(0);
    player.y = H - 42;
    player.rotation = -Math.PI / 2;
    if ((pointerHeld || fireHeld || heldKeys.Space) && time >= nextShotAt) fireWeapon(time);
  }

  function updateZombies() {
    zombies.children.iterate((zombie) => {
      if (!zombie || !zombie.active) return;
      let drift = zombie.getData("drift");
      if ((zombie.x < 18 && drift < 0) || (zombie.x > W - 18 && drift > 0)) {
        drift *= -1;
        zombie.setData("drift", drift);
      }
      zombie.setVelocity(drift, zombie.getData("speed"));
      zombie.rotation = Math.PI / 2;
      if (zombie.y >= H - 8) {
        zombie.destroy();
        endGame("좀비가 방어선을 통과했습니다.");
      }
    });
  }

  function cleanupObjects(time) {
    bullets.children.iterate((bullet) => {
      if (!bullet || !bullet.active) return;
      if (bullet.x < -24 || bullet.x > W + 24 || bullet.y < -24 || bullet.y > H + 24 || time > bullet.getData("expires")) bullet.destroy();
    });
  }

  function spawnPoint() {
    return { x: Phaser.Math.Between(28, W - 28), y: -42 };
  }

  function spawnZombie(forcedKind) {
    if (!scene || zombies.countActive(true) >= 38) return;
    const roll = Math.random();
    const kind = forcedKind || (roll < 0.58 ? "walker" : roll < 0.86 ? "runner" : "brute");
    const settings = {
      walker: { texture: "zombie-walker", hp: 42, speed: 52, reward: 100, radius: 15, drift: 0 },
      runner: { texture: "zombie-runner", hp: 27, speed: 92, reward: 140, radius: 12, drift: Phaser.Math.Between(-35, 35) },
      brute: { texture: "zombie-brute", hp: 125, speed: 34, reward: 260, radius: 20, drift: 0 },
      boss: { texture: "zombie-boss", hp: 600 + wave * 85, speed: 27, reward: 1800, radius: 34, drift: Phaser.Math.Between(-18, 18) }
    }[kind];
    const point = spawnPoint();
    const zombie = zombies.create(point.x, point.y, settings.texture).setDepth(5);
    zombie.body.setCircle(settings.radius, zombie.width / 2 - settings.radius, zombie.height / 2 - settings.radius);
    zombie.setData({ kind, hp: settings.hp + (kind === "boss" ? 0 : wave * 4), speed: settings.speed + Math.min(45, wave * 2.5), reward: settings.reward, drift: settings.drift });
  }

  function fireWeapon(time) {
    const weapon = weapons[selectedWeapon];
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < weapon.pellets; i += 1) {
      const offset = weapon.pellets === 1
        ? Phaser.Math.FloatBetween(-weapon.spread, weapon.spread)
        : -weapon.spread / 2 + weapon.spread * (i / (weapon.pellets - 1));
      const angle = baseAngle + offset;
      const bullet = bullets.create(player.x + Math.cos(angle) * 22, player.y + Math.sin(angle) * 22, weapon.texture).setDepth(8);
      bullet.setData({ damage: weapon.damage, expires: time + 1500 });
      bullet.setVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed);
    }
    nextShotAt = time + weapon.interval;
  }

  function onBulletHit(bullet, zombie) {
    if (!bullet.active || !zombie.active) return;
    const hp = zombie.getData("hp") - bullet.getData("damage");
    bullet.destroy();
    zombie.setData("hp", hp);
    zombie.setTintFill(0xffffff);
    scene.time.delayedCall(45, () => { if (zombie.active) zombie.clearTint(); });
    if (hp <= 0) destroyZombie(zombie);
  }

  function destroyZombie(zombie) {
    if (!zombie.active) return;
    const kind = zombie.getData("kind");
    combo += 1;
    comboElapsed = 2400;
    score += Math.round(zombie.getData("reward") * (1 + Math.min(20, combo) * 0.08));
    zombie.destroy();
    if (kind === "boss") statusEl.textContent = `웨이브 ${wave} 보스 격파!`;
    syncUi();
  }

  function onPlayerHit(currentPlayer, zombie) {
    if (gameState !== "running" || !zombie.active) return;
    combo = 0;
    scene.cameras.main.shake(220, 0.012);
    zombie.destroy();
    endGame("좀비가 군인과 충돌했습니다.");
  }

  function clearGroup(group) {
    if (group) group.clear(true, true);
  }

  function resetGame() {
    if (!scene || !player) return;
    clearGroup(zombies);
    clearGroup(bullets);
    player.setPosition(W / 2, H - 42).setVelocity(0, 0).setAlpha(1);
    player.rotation = -Math.PI / 2;
    score = 0;
    wave = 1;
    waveElapsed = 0;
    spawnElapsed = 0;
    combo = 0;
    comboElapsed = 0;
    nextShotAt = 0;
    targetX = W / 2;
    pointerControls = false;
    gameState = "idle";
    scene.physics.world.resume();
    syncUi("대기 중");
  }

  function startGame() {
    if (!scene || !player) { statusEl.textContent = "게임 엔진을 불러오는 중입니다."; return; }
    if (gameState === "over") resetGame();
    if (gameState === "paused") scene.scene.resume();
    scene.physics.world.resume();
    gameState = "running";
    overlay.classList.add("hidden");
    statusEl.textContent = `웨이브 ${wave} 시작 · ${weapons[selectedWeapon].name} 장착`;
  }

  function togglePause() {
    if (!scene) return;
    if (gameState === "running") {
      gameState = "paused";
      overlayTitle.textContent = "일시정지";
      overlayText.textContent = "P 또는 계속하기 버튼을 누르면 전투가 이어집니다.";
      overlayStartBtn.textContent = "계속하기";
      overlay.classList.remove("hidden");
      statusEl.textContent = "일시정지";
      scene.scene.pause();
    } else if (gameState === "paused") startGame();
  }

  function endGame(reason = "도시 방어에 실패했습니다.") {
    if (gameState === "over") return;
    gameState = "over";
    player.setVelocity(0, 0);
    scene.physics.world.pause();
    if (score > best) { best = score; localStorage.setItem("zombiShotBest", String(best)); }
    overlayTitle.textContent = "도시가 함락됐습니다";
    overlayText.textContent = `${reason} 최종 ${score}점 · 웨이브 ${wave} · 최고 ${best}점. 다시 방어해 보세요.`;
    overlayStartBtn.textContent = "다시 시작";
    overlay.classList.remove("hidden");
    syncUi("게임 오버");
  }

  function selectWeapon(name) {
    if (!weapons[name]) return;
    selectedWeapon = name;
    document.querySelectorAll(".weapon-btn").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.weapon === name)));
    statusEl.textContent = `${weapons[name].name} 장착`;
  }

  function syncUi(message) {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(Math.max(best, score));
    waveEl.textContent = String(wave);
    comboEl.textContent = String(combo);
    if (message) statusEl.textContent = message;
  }

  document.addEventListener("keydown", (event) => {
    heldKeys[event.code] = true;
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Digit1") selectWeapon("pistol");
    if (event.code === "Digit2") selectWeapon("rifle");
    if (event.code === "Digit3") selectWeapon("shotgun");
    if (event.code === "KeyP") togglePause();
    if (event.code === "KeyF") toggleFullscreen();
    if ((event.code === "Space" || event.code === "ArrowLeft" || event.code === "ArrowRight") && (gameState === "idle" || gameState === "over")) startGame();
  });
  document.addEventListener("keyup", (event) => { heldKeys[event.code] = false; });

  document.querySelectorAll(".weapon-btn").forEach((button) => button.addEventListener("click", () => selectWeapon(button.dataset.weapon)));
  document.querySelectorAll(".mobile-key[data-key]").forEach((button) => {
    const setKey = (value) => { heldKeys[button.dataset.key] = value; if (value && (gameState === "idle" || gameState === "over")) startGame(); };
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); setKey(true); });
    button.addEventListener("pointerup", () => setKey(false));
    button.addEventListener("pointercancel", () => setKey(false));
  });
  const mobileFireBtn = el("mobileFireBtn");
  mobileFireBtn.addEventListener("pointerdown", (event) => { event.preventDefault(); mobileFireBtn.setPointerCapture(event.pointerId); fireHeld = true; if (gameState === "idle" || gameState === "over") startGame(); });
  mobileFireBtn.addEventListener("pointerup", () => { fireHeld = false; });
  mobileFireBtn.addEventListener("pointercancel", () => { fireHeld = false; });

  el("startBtn").addEventListener("click", startGame);
  overlayStartBtn.addEventListener("click", startGame);
  el("pauseBtn").addEventListener("click", togglePause);
  el("resetBtn").addEventListener("click", () => {
    if (!scene) return;
    if (gameState === "paused") scene.scene.resume();
    resetGame();
    overlayTitle.textContent = "도시 최후의 생존자";
    overlayText.textContent = "도로와 적이 계속 내려옵니다. A/D 또는 좌우 방향키로 아래쪽 군인을 움직이고 클릭이나 Space로 사격하세요.";
    overlayStartBtn.textContent = "게임 시작";
    overlay.classList.remove("hidden");
  });

  const gameShell = el("gameShell");
  const fullscreenBtn = el("fullscreenBtn");
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await gameShell.requestFullscreen();
    } catch (error) { statusEl.textContent = "전체화면을 사용할 수 없습니다."; }
  }
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    const active = document.fullscreenElement === gameShell;
    fullscreenBtn.textContent = active ? "⛶ 전체화면 종료 (F)" : "⛶ 전체화면 (F)";
    fullscreenBtn.setAttribute("aria-pressed", String(active));
  });
  if (!document.fullscreenEnabled) fullscreenBtn.disabled = true;

  new Phaser.Game({
    type: Phaser.CANVAS,
    canvas: el("gameCanvas"),
    width: W,
    height: H,
    backgroundColor: "#07110c",
    physics: { default: "arcade", arcade: { debug: false } },
    input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { create, update }
  });
})();
