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
  const hpText = el("hpText");
  const hpBar = el("hpBar");
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
  let pickups = null;
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
  let aimX = W - 80;
  let aimY = H / 2;
  let invulnerableUntil = 0;
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
    make("medkit", 26, 26, (g) => {
      g.fillStyle(0xf8fafc, 1); g.fillRoundedRect(2, 2, 22, 22, 4);
      g.fillStyle(0xef4444, 1); g.fillRect(10, 5, 6, 16); g.fillRect(5, 10, 16, 6);
    });
  }

  function drawArena(currentScene) {
    const background = currentScene.add.graphics().setDepth(-100);
    background.fillStyle(0x07110c, 1).fillRect(0, 0, W, H);
    background.fillStyle(0x111c18, 1);
    for (let x = 0; x < W; x += 80) background.fillRect(x + 2, 0, 3, H);
    for (let y = 0; y < H; y += 80) background.fillRect(0, y + 2, W, 3);
    background.lineStyle(2, 0x4ade80, 0.07);
    for (let x = -H; x < W; x += 90) background.lineBetween(x, 0, x + H, H);
    background.fillStyle(0xbe185d, 0.13);
    for (let i = 0; i < 24; i += 1) background.fillRect((i * 137) % W, (i * 83) % H, 10 + (i % 4) * 5, 3);
  }

  function create() {
    scene = this;
    makeTextures(this);
    drawArena(this);

    zombies = this.physics.add.group({ maxSize: 40 });
    bullets = this.physics.add.group({ maxSize: 90 });
    pickups = this.physics.add.group({ maxSize: 12 });
    player = this.physics.add.image(W / 2, H / 2, "survivor").setDepth(10).setCollideWorldBounds(true);
    player.body.setCircle(14, 6, 6);
    player.setData("hp", 100);

    this.physics.add.overlap(bullets, zombies, onBulletHit, null, this);
    this.physics.add.overlap(player, zombies, onPlayerHit, null, this);
    this.physics.add.overlap(player, pickups, onPickup, null, this);

    this.input.on("pointermove", (pointer) => { aimX = pointer.worldX; aimY = pointer.worldY; });
    this.input.on("pointerdown", (pointer) => {
      aimX = pointer.worldX; aimY = pointer.worldY; pointerHeld = true;
      if (gameState === "idle" || gameState === "over") startGame();
    });
    this.input.on("pointerup", () => { pointerHeld = false; });
    resetGame();
    syncUi("대기 중");
  }

  function update(time, delta) {
    if (gameState !== "running") return;
    const dt = Math.min(delta, 50);
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
    const y = (heldKeys.ArrowDown || heldKeys.KeyS ? 1 : 0) - (heldKeys.ArrowUp || heldKeys.KeyW ? 1 : 0);
    const movement = new Phaser.Math.Vector2(x, y);
    if (movement.lengthSq() > 0) movement.normalize().scale(230);
    player.setVelocity(movement.x, movement.y);
    player.rotation = Phaser.Math.Angle.Between(player.x, player.y, aimX, aimY);
    player.setAlpha(time < invulnerableUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);
    if ((pointerHeld || fireHeld || heldKeys.Space) && time >= nextShotAt) fireWeapon(time);
  }

  function updateZombies() {
    zombies.children.iterate((zombie) => {
      if (!zombie || !zombie.active) return;
      const speed = zombie.getData("speed");
      scene.physics.moveToObject(zombie, player, speed);
      zombie.rotation = Phaser.Math.Angle.Between(zombie.x, zombie.y, player.x, player.y);
    });
  }

  function cleanupObjects(time) {
    bullets.children.iterate((bullet) => {
      if (!bullet || !bullet.active) return;
      if (bullet.x < -24 || bullet.x > W + 24 || bullet.y < -24 || bullet.y > H + 24 || time > bullet.getData("expires")) bullet.destroy();
    });
    pickups.children.iterate((pickup) => {
      if (!pickup || !pickup.active) return;
      pickup.rotation += 0.02;
      if (time > pickup.getData("expires")) pickup.destroy();
    });
  }

  function spawnPoint() {
    const edge = Phaser.Math.Between(0, 3);
    if (edge === 0) return { x: Phaser.Math.Between(10, W - 10), y: -24 };
    if (edge === 1) return { x: W + 24, y: Phaser.Math.Between(10, H - 10) };
    if (edge === 2) return { x: Phaser.Math.Between(10, W - 10), y: H + 24 };
    return { x: -24, y: Phaser.Math.Between(10, H - 10) };
  }

  function spawnZombie(forcedKind) {
    if (!scene || zombies.countActive(true) >= 38) return;
    const roll = Math.random();
    const kind = forcedKind || (roll < 0.58 ? "walker" : roll < 0.86 ? "runner" : "brute");
    const settings = {
      walker: { texture: "zombie-walker", hp: 42, speed: 52, reward: 100, radius: 15 },
      runner: { texture: "zombie-runner", hp: 27, speed: 92, reward: 140, radius: 12 },
      brute: { texture: "zombie-brute", hp: 125, speed: 34, reward: 260, radius: 20 },
      boss: { texture: "zombie-boss", hp: 600 + wave * 85, speed: 27, reward: 1800, radius: 34 }
    }[kind];
    const point = spawnPoint();
    const zombie = zombies.create(point.x, point.y, settings.texture).setDepth(5);
    zombie.body.setCircle(settings.radius, zombie.width / 2 - settings.radius, zombie.height / 2 - settings.radius);
    zombie.setData({ kind, hp: settings.hp + (kind === "boss" ? 0 : wave * 4), speed: settings.speed + Math.min(45, wave * 2.5), reward: settings.reward });
  }

  function fireWeapon(time) {
    const weapon = weapons[selectedWeapon];
    const baseAngle = Phaser.Math.Angle.Between(player.x, player.y, aimX, aimY);
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
    const dropX = zombie.x;
    const dropY = zombie.y;
    combo += 1;
    comboElapsed = 2400;
    score += Math.round(zombie.getData("reward") * (1 + Math.min(20, combo) * 0.08));
    zombie.destroy();
    if (Math.random() < 0.08 && kind !== "boss") {
      const medkit = pickups.create(dropX, dropY, "medkit").setDepth(4);
      medkit.setData("expires", scene.time.now + 10000);
    }
    if (kind === "boss") statusEl.textContent = `웨이브 ${wave} 보스 격파!`;
    syncUi();
  }

  function onPlayerHit(currentPlayer, zombie) {
    if (scene.time.now < invulnerableUntil || gameState !== "running" || !zombie.active) return;
    const damage = zombie.getData("kind") === "boss" ? 24 : 12;
    const hp = Math.max(0, currentPlayer.getData("hp") - damage);
    currentPlayer.setData("hp", hp);
    invulnerableUntil = scene.time.now + 850;
    combo = 0;
    scene.cameras.main.shake(220, 0.012);
    statusEl.textContent = `좀비에게 공격받았습니다. 체력 -${damage}`;
    if (zombie.getData("kind") !== "boss") zombie.destroy();
    if (hp <= 0) endGame();
    syncUi();
  }

  function onPickup(currentPlayer, pickup) {
    if (!pickup.active) return;
    currentPlayer.setData("hp", Math.min(100, currentPlayer.getData("hp") + 25));
    pickup.destroy();
    statusEl.textContent = "의료 키트 획득 · 체력 +25";
    syncUi();
  }

  function clearGroup(group) {
    if (group) group.clear(true, true);
  }

  function resetGame() {
    if (!scene || !player) return;
    clearGroup(zombies);
    clearGroup(bullets);
    clearGroup(pickups);
    player.setPosition(W / 2, H / 2).setVelocity(0, 0).setAlpha(1).setData("hp", 100);
    score = 0;
    wave = 1;
    waveElapsed = 0;
    spawnElapsed = 0;
    combo = 0;
    comboElapsed = 0;
    nextShotAt = 0;
    invulnerableUntil = 0;
    aimX = W - 80;
    aimY = H / 2;
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

  function endGame() {
    if (gameState === "over") return;
    gameState = "over";
    player.setVelocity(0, 0);
    scene.physics.world.pause();
    if (score > best) { best = score; localStorage.setItem("zombiShotBest", String(best)); }
    overlayTitle.textContent = "도시가 함락됐습니다";
    overlayText.textContent = `최종 ${score}점 · 웨이브 ${wave} · 최고 ${best}점. 무기를 바꿔 다시 도전하세요.`;
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
    const hp = player ? player.getData("hp") : 100;
    hpText.textContent = `${hp} / 100`;
    hpBar.style.width = `${clamp(hp, 0, 100)}%`;
    if (message) statusEl.textContent = message;
  }

  document.addEventListener("keydown", (event) => {
    heldKeys[event.code] = true;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Digit1") selectWeapon("pistol");
    if (event.code === "Digit2") selectWeapon("rifle");
    if (event.code === "Digit3") selectWeapon("shotgun");
    if (event.code === "KeyP") togglePause();
    if (event.code === "KeyF") toggleFullscreen();
    if ((event.code === "Space" || event.code.startsWith("Arrow")) && (gameState === "idle" || gameState === "over")) startGame();
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
    overlayText.textContent = "WASD로 이동하고 마우스로 조준한 뒤 클릭해 사격하세요. 모바일에서는 방향 버튼과 사격 버튼을 사용합니다.";
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
