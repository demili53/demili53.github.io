(() => {
  "use strict";

  const W = 480;
  const H = 720;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const el = (id) => document.getElementById(id);
  const scoreEl = el("scoreEl");
  const bestEl = el("bestEl");
  const waveEl = el("waveEl");
  const comboEl = el("comboEl");
  const weaponEl = el("weaponEl");
  const effectEl = el("effectEl");
  const statusEl = el("statusEl");
  const overlay = el("gameOverlay");
  const overlayTitle = el("overlayTitle");
  const overlayText = el("overlayText");
  const overlayStartBtn = el("overlayStartBtn");
  const waveBanner = el("waveBanner");
  const nightOverlay = el("nightOverlay");
  const upgradeOverlay = el("upgradeOverlay");
  const upgradeChoices = el("upgradeChoices");

  const weapons = {
    pistol: { name: "권총", interval: 320, speed: 600, damage: 28, spread: 0, pellets: 1, texture: "bullet-pistol" },
    rifle: { name: "소총", interval: 110, speed: 720, damage: 15, spread: 0.035, pellets: 1, texture: "bullet-rifle", pickupAmmo: 80 },
    shotgun: { name: "산탄총", interval: 650, speed: 520, damage: 18, spread: 0.34, pellets: 6, texture: "bullet-shotgun", pickupAmmo: 24 },
    piercer: { name: "관통탄", interval: 260, speed: 660, damage: 34, spread: 0, pellets: 1, texture: "bullet-piercer", pickupAmmo: 30, pierce: 4 }
  };

  const eventNames = {
    normal: "일반 웨이브",
    rush: "돌진 웨이브",
    armored: "중장갑 웨이브",
    zigzag: "지그재그 웨이브",
    supply: "보급 웨이브",
    horde: "떼거리 웨이브",
    elite: "정예 웨이브",
    night: "야간 웨이브"
  };

  const upgradeDefinitions = {
    pistolPower: { title: "권총 강화", description: "기본 권총 공격력 +15%" },
    bulletSize: { title: "대구경 탄환", description: "모든 총알 크기 +20%" },
    itemAmmo: { title: "추가 탄창", description: "아이템 무기 탄약 +25%" },
    comboWindow: { title: "전투 집중", description: "콤보 유지 시간 +0.4초" },
    itemDrop: { title: "보급 탐색", description: "아이템 드롭 확률 +5%" }
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
  let maxCombo = 0;
  let killsThisWave = 0;
  let missedItems = 0;
  let selectedWeapon = "pistol";
  let weaponAmmo = Infinity;
  let currentEvent = "normal";
  let previousSpecialEvent = "";
  let freezeUntil = 0;
  let magnetUntil = 0;
  let overdriveUntil = 0;
  let bossPending = false;
  let bossActive = false;
  let audioContext = null;
  let soundMuted = false;
  let bannerVersion = 0;
  let runId = 0;
  const upgradeLevels = { pistolPower: 0, bulletSize: 0, itemAmmo: 0, comboWindow: 0, itemDrop: 0 };
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

    const zombieFrames = (key, width, height, skin, clothes, eyes, boss = false) => {
      const poses = [-1, 0, 1, 0];
      poses.forEach((pose, frame) => make(`${key}-${frame}`, width, height, (g) => {
        const cx = width / 2;
        const line = Math.max(3, width * 0.09);
        const hipY = height * 0.68;
        const footY = height * 0.94;
        const swing = pose * width * 0.16;

        g.fillStyle(0x000000, 0.3); g.fillEllipse(cx, height * 0.94, width * 0.72, height * 0.1);
        g.lineStyle(line, skin, 1);
        g.lineBetween(cx - width * 0.1, hipY, cx - width * 0.15 + swing, footY);
        g.lineBetween(cx + width * 0.1, hipY, cx + width * 0.15 - swing, footY);
        g.lineStyle(line * 0.86, skin, 1);
        g.lineBetween(width * 0.28, height * 0.42, width * 0.12 - swing * 0.45, height * 0.68);
        g.lineBetween(width * 0.72, height * 0.42, width * 0.88 + swing * 0.45, height * 0.68);

        g.fillStyle(clothes, 1); g.fillRoundedRect(width * 0.24, height * 0.34, width * 0.52, height * 0.4, width * 0.11);
        g.fillStyle(skin, 1); g.fillCircle(cx, height * 0.23, width * 0.23);
        g.fillStyle(eyes, 1);
        g.fillCircle(width * 0.42, height * 0.21, Math.max(2, width * 0.035));
        g.fillCircle(width * 0.58, height * 0.21, Math.max(2, width * 0.035));
        g.lineStyle(Math.max(2, width * 0.035), 0x1c1917, 1);
        g.lineBetween(width * 0.39, height * 0.29, width * 0.61, height * 0.29);
        g.fillStyle(0x7f1d1d, 0.75); g.fillRect(width * 0.3, height * 0.48, width * 0.18, height * 0.06);
        if (boss) {
          g.fillStyle(0xf97316, 1); g.fillRect(width * 0.2, height * 0.08, width * 0.6, Math.max(5, height * 0.055));
          g.fillStyle(0xfbbf24, 0.7); g.fillCircle(cx, height * 0.52, width * 0.08);
        }
      }));
    };
    zombieFrames("zombie-walker", 42, 58, 0x84cc16, 0x365314, 0xd9f99d);
    zombieFrames("zombie-runner", 36, 50, 0xeab308, 0x92400e, 0xfef9c3);
    zombieFrames("zombie-brute", 54, 72, 0x22c55e, 0x14532d, 0xbbf7d0);
    zombieFrames("zombie-boss", 86, 112, 0x991b1b, 0x450a0a, 0xfecaca, true);
    zombieFrames("zombie-zigzag", 40, 56, 0x38bdf8, 0x164e63, 0xe0f2fe);
    zombieFrames("zombie-splitter", 48, 66, 0xc084fc, 0x581c87, 0xf3e8ff);
    zombieFrames("zombie-carrier", 44, 60, 0x2dd4bf, 0x134e4a, 0xccfbf1);
    zombieFrames("zombie-mini", 26, 36, 0xa3e635, 0x3f6212, 0xecfccb);

    make("bullet-pistol", 10, 10, (g) => { g.fillStyle(0xfde68a, 1); g.fillCircle(5, 5, 4); });
    make("bullet-rifle", 10, 10, (g) => { g.fillStyle(0x86efac, 1); g.fillCircle(5, 5, 4); });
    make("bullet-shotgun", 10, 10, (g) => { g.fillStyle(0xfda4af, 1); g.fillCircle(5, 5, 4); });
    make("bullet-piercer", 14, 14, (g) => {
      g.fillStyle(0xc084fc, 0.35); g.fillCircle(7, 7, 7);
      g.fillStyle(0xe9d5ff, 1); g.fillRect(5, 0, 4, 14);
    });
    make("pickup-rifle", 38, 38, (g) => {
      g.fillStyle(0x052e16, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(2, 0x86efac, 1); g.strokeRoundedRect(2, 2, 34, 34, 7);
      g.fillStyle(0x86efac, 1); g.fillRect(7, 15, 24, 6); g.fillRect(20, 20, 6, 9);
      g.fillStyle(0xfde68a, 1); g.fillCircle(31, 18, 3);
    });
    make("pickup-shotgun", 38, 38, (g) => {
      g.fillStyle(0x4c0519, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(2, 0xfda4af, 1); g.strokeRoundedRect(2, 2, 34, 34, 7);
      g.fillStyle(0xfda4af, 1); g.fillRect(6, 14, 26, 7); g.fillRect(9, 21, 8, 8);
      g.fillStyle(0xfde68a, 1); g.fillCircle(31, 17, 3);
    });
    make("pickup-piercer", 38, 38, (g) => {
      g.fillStyle(0x2e1065, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(2, 0xc084fc, 1); g.strokeRoundedRect(2, 2, 34, 34, 7);
      g.fillStyle(0xe9d5ff, 1); g.fillTriangle(19, 5, 12, 29, 26, 29);
    });
    make("pickup-grenade", 38, 38, (g) => {
      g.fillStyle(0x431407, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(2, 0xfb923c, 1); g.strokeRoundedRect(2, 2, 34, 34, 7);
      g.fillStyle(0xf97316, 1); g.fillCircle(19, 22, 10); g.fillRect(16, 7, 7, 8);
    });
    make("pickup-freeze", 38, 38, (g) => {
      g.fillStyle(0x083344, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(3, 0x67e8f9, 1); g.strokeRoundedRect(2, 2, 34, 34, 7);
      g.lineBetween(19, 7, 19, 31); g.lineBetween(8, 13, 30, 25); g.lineBetween(8, 25, 30, 13);
    });
    make("pickup-magnet", 38, 38, (g) => {
      g.fillStyle(0x500724, 0.95); g.fillRoundedRect(1, 1, 36, 36, 8);
      g.lineStyle(6, 0xf472b6, 1); g.beginPath(); g.arc(19, 18, 10, 0, Math.PI, false); g.strokePath();
      g.fillStyle(0xfde68a, 1); g.fillRect(7, 16, 6, 12); g.fillRect(25, 16, 6, 12);
    });
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

  function playTone(frequency, duration = 0.08, volume = 0.035, type = "sine") {
    if (soundMuted) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {}
  }

  function vibrate(duration) {
    if (navigator.vibrate) navigator.vibrate(duration);
  }

  function announce(message, color = "#fde68a", duration = 1300) {
    const version = ++bannerVersion;
    waveBanner.textContent = message;
    waveBanner.style.color = color;
    waveBanner.classList.remove("hidden");
    window.setTimeout(() => {
      if (version === bannerVersion) waveBanner.classList.add("hidden");
    }, duration);
  }

  function burst(x, y, color = 0x86efac, count = 7) {
    if (!scene) return;
    for (let i = 0; i < count; i += 1) {
      const particle = scene.add.rectangle(x, y, 4, 4, color, 0.9).setDepth(15);
      scene.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-34, 34),
        y: y + Phaser.Math.Between(-34, 34),
        alpha: 0,
        scale: 0.2,
        duration: 260,
        onComplete: () => particle.destroy()
      });
    }
  }

  function showLaneWarning(x, delay, callback, wide = false) {
    const warningRun = runId;
    const marker = scene.add.rectangle(x, H / 2, wide ? 150 : 54, H, 0xef4444, 0.13).setDepth(13);
    scene.tweens.add({ targets: marker, alpha: { from: 0.08, to: 0.38 }, yoyo: true, repeat: Math.max(1, Math.floor(delay / 260)), duration: 130 });
    scene.time.delayedCall(delay, () => {
      marker.destroy();
      if (gameState === "running" && warningRun === runId) callback();
    });
  }

  function create() {
    scene = this;
    makeTextures(this);
    drawArena(this);

    zombies = this.physics.add.group({ maxSize: 40 });
    bullets = this.physics.add.group({ maxSize: 90 });
    pickups = this.physics.add.group({ maxSize: 12 });
    player = this.physics.add.image(W / 2, H - 48, "survivor").setDepth(10).setCollideWorldBounds(true);
    player.body.setCircle(14, 6, 6);
    player.rotation = -Math.PI / 2;

    this.physics.add.overlap(bullets, zombies, onBulletHit, null, this);
    this.physics.add.overlap(player, zombies, onPlayerHit, isPlayerContact, this);
    this.physics.add.overlap(player, pickups, onWeaponPickup, null, this);

    this.input.on("pointermove", (pointer) => { targetX = clamp(pointer.worldX, 60, W - 60); pointerControls = true; });
    this.input.on("pointerdown", (pointer) => {
      targetX = clamp(pointer.worldX, 60, W - 60); pointerControls = true; pointerHeld = true;
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
    updateZombies(time);
    updatePickups(time);
    cleanupObjects(time);
    updateActiveEffects(time);

    waveElapsed += dt;
    spawnElapsed -= dt;
    comboElapsed -= dt;
    if (comboElapsed <= 0 && combo > 0) combo = 0;

    if (spawnElapsed <= 0 && !bossPending) {
      spawnWaveEnemies();
      const eventDelay = currentEvent === "horde" ? 720 : currentEvent === "elite" ? 1320 : currentEvent === "supply" ? 1080 : 1180;
      spawnElapsed = Math.max(360, eventDelay - wave * 42);
    }
    if (waveElapsed >= 18000) {
      const summary = `${killsThisWave}킬 · 최대 콤보 ${maxCombo} · 놓친 아이템 ${missedItems}`;
      wave += 1;
      waveElapsed = 0;
      killsThisWave = 0;
      maxCombo = 0;
      missedItems = 0;
      selectWaveEvent();
      statusEl.textContent = `이전 웨이브: ${summary}`;
      announce(`WAVE ${wave} · ${eventNames[currentEvent]}`);
      if (wave % 5 === 0) warnBoss();
      if ((wave - 1) % 3 === 0) openUpgradeChoice();
    }
    syncUi();
  }

  function selectWaveEvent() {
    if (wave % 3 === 0) {
      const specials = ["supply", "horde", "elite", "night"].filter((name) => name !== previousSpecialEvent);
      currentEvent = specials[Phaser.Math.Between(0, specials.length - 1)];
      previousSpecialEvent = currentEvent;
    } else {
      const regular = wave < 2 ? ["normal"] : ["normal", "rush", "armored", "zigzag"];
      currentEvent = regular[Phaser.Math.Between(0, regular.length - 1)];
    }
    nightOverlay.classList.toggle("hidden", currentEvent !== "night");
  }

  function spawnWaveEnemies() {
    if (bossActive) {
      spawnZombie("walker");
      return;
    }
    if (currentEvent === "horde") {
      spawnZombie("walker");
      if (zombies.countActive(true) < 34) spawnZombie(Math.random() < 0.75 ? "walker" : "runner");
      return;
    }
    const roll = Math.random();
    let kind = "walker";
    if (currentEvent === "supply") kind = roll < 0.48 ? "carrier" : roll < 0.75 ? "walker" : "runner";
    else if (currentEvent === "elite") kind = roll < 0.42 ? "brute" : roll < 0.72 ? "zigzag" : "splitter";
    else if (currentEvent === "rush") kind = roll < 0.58 ? "runner" : roll < 0.82 ? "zigzag" : "walker";
    else if (currentEvent === "armored") kind = roll < 0.52 ? "brute" : roll < 0.76 ? "walker" : "splitter";
    else if (currentEvent === "zigzag") kind = roll < 0.55 ? "zigzag" : roll < 0.8 ? "runner" : "walker";
    else if (currentEvent === "night") kind = roll < 0.48 ? "walker" : roll < 0.76 ? "zigzag" : "carrier";
    else kind = roll < 0.58 ? "walker" : roll < 0.84 ? "runner" : "brute";
    spawnZombie(kind);
  }

  function warnBoss() {
    bossPending = true;
    announce("⚠ 거대 변종 접근 ⚠", "#fca5a5", 1900);
    playTone(110, 0.5, 0.06, "sawtooth");
    showLaneWarning(W / 2, 2000, () => {
      bossPending = false;
      bossActive = true;
      spawnZombie("boss", W / 2, true);
    }, true);
  }

  function updateActiveEffects(time) {
    const effects = [];
    if (time < overdriveUntil) effects.push(`오버드라이브 ${Math.ceil((overdriveUntil - time) / 1000)}초`);
    if (time < freezeUntil) effects.push(`냉각 ${Math.ceil((freezeUntil - time) / 1000)}초`);
    if (time < magnetUntil) effects.push(`자석 ${Math.ceil((magnetUntil - time) / 1000)}초`);
    effectEl.textContent = effects.join(" · ") || "없음";
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
    player.x = clamp(player.x, 60, W - 60);
    player.y = H - 48;
    player.rotation = -Math.PI / 2;
    if ((pointerHeld || fireHeld || heldKeys.Space) && time >= nextShotAt) fireWeapon(time);
  }

  function updateZombies(time) {
    zombies.children.iterate((zombie) => {
      if (!zombie || !zombie.active) return;
      const kind = zombie.getData("kind");
      const slowed = time < freezeUntil ? 0.6 : 1;
      let drift = zombie.getData("drift");
      let speed = zombie.getData("speed") * slowed;
      if (kind === "zigzag") drift = Math.sin((time + zombie.getData("walkOffset")) / 410) * 72;
      if (kind === "boss") {
        const hpRatio = zombie.getData("hp") / zombie.getData("maxHp");
        const phase = hpRatio <= 0.25 ? 3 : hpRatio <= 0.6 ? 2 : 1;
        drift = Math.sin((time + zombie.getData("walkOffset")) / (phase === 1 ? 760 : 430)) * (phase === 1 ? 34 : phase === 2 ? 76 : 104);
        speed *= phase === 3 ? 1.45 : phase === 2 ? 1.15 : 1;
        if (time >= zombie.getData("summonAt")) {
          spawnZombie("walker", clamp(zombie.x + Phaser.Math.Between(-70, 70), 66, W - 66), true, zombie.y - 55);
          zombie.setData("summonAt", time + (phase === 1 ? 3300 : 2500));
        }
      }
      if ((zombie.x < 62 && drift < 0) || (zombie.x > W - 62 && drift > 0)) {
        drift *= -1;
        zombie.setData("drift", drift);
      }
      zombie.setVelocity(drift, speed);
      const frameDuration = kind === "runner" || kind === "mini" ? 85 : kind === "boss" ? 180 : 125;
      const frame = Math.floor((time + zombie.getData("walkOffset")) / frameDuration) % 4;
      if (frame !== zombie.getData("walkFrame")) {
        zombie.setTexture(`${zombie.getData("textureBase")}-${frame}`);
        zombie.setData("walkFrame", frame);
      }
      zombie.rotation = Math.sin((time + zombie.getData("walkOffset")) / frameDuration) * 0.035;
      const badge = zombie.getData("badge");
      if (badge?.active) badge.setPosition(zombie.x, zombie.y - zombie.height * 0.32);
      const weakSpot = zombie.getData("weakSpot");
      if (weakSpot?.active) {
        weakSpot.setPosition(zombie.x + Math.sin(time / 430) * zombie.width * 0.28, zombie.y + zombie.height * 0.08);
        weakSpot.setAlpha(0.55 + Math.sin(time / 90) * 0.2);
      }
      if (zombie.y > H + zombie.displayHeight / 2) {
        destroyZombieSprite(zombie);
      }
    });
  }

  function cleanupObjects(time) {
    bullets.children.iterate((bullet) => {
      if (!bullet || !bullet.active) return;
      if (bullet.x < -24 || bullet.x > W + 24 || bullet.y < -24 || bullet.y > H + 24 || time > bullet.getData("expires")) bullet.destroy();
    });
  }

  function updatePickups(time) {
    pickups.children.iterate((pickup) => {
      if (!pickup || !pickup.active) return;
      if (time < magnetUntil) scene.physics.moveToObject(pickup, player, 270);
      else pickup.setVelocity(0, 118);
      pickup.rotation = Math.sin((time + pickup.getData("floatOffset")) / 170) * 0.16;
      if (pickup.y > H + 30) {
        missedItems += 1;
        pickup.destroy();
      }
    });
  }

  function spawnPoint() {
    return { x: Phaser.Math.Between(66, W - 66), y: -70 };
  }

  function spawnZombie(forcedKind, fixedX = null, warned = false, fixedY = -70) {
    if (!scene || zombies.countActive(true) >= 38) return;
    const roll = Math.random();
    const kind = forcedKind || (roll < 0.58 ? "walker" : roll < 0.86 ? "runner" : "brute");
    const settings = {
      walker: { texture: "zombie-walker", hp: 42, speed: 52, reward: 100, drift: 0 },
      runner: { texture: "zombie-runner", hp: 27, speed: 92, reward: 140, drift: Phaser.Math.Between(-35, 35) },
      brute: { texture: "zombie-brute", hp: 125, speed: 34, reward: 260, drift: 0 },
      zigzag: { texture: "zombie-zigzag", hp: 50, speed: 58, reward: 190, drift: 0 },
      splitter: { texture: "zombie-splitter", hp: 82, speed: 42, reward: 240, drift: 0 },
      carrier: { texture: "zombie-carrier", hp: 58, speed: 48, reward: 210, drift: Phaser.Math.Between(-18, 18) },
      mini: { texture: "zombie-mini", hp: 18, speed: 86, reward: 60, drift: Phaser.Math.Between(-25, 25) },
      boss: { texture: "zombie-boss", hp: 600 + wave * 85, speed: 27, reward: 1800, drift: 0 }
    }[kind];
    const point = spawnPoint();
    point.x = fixedX ?? point.x;
    point.y = fixedY;
    if (kind === "runner" && !warned) {
      showLaneWarning(point.x, 650, () => spawnZombie("runner", point.x, true, point.y));
      return;
    }
    const zombie = zombies.create(point.x, point.y, `${settings.texture}-0`).setDepth(kind === "boss" ? 6 : 5);
    zombie.body.setSize(zombie.width * 0.62, zombie.height * 0.78, true);
    const adjustedHp = settings.hp + (["boss", "mini"].includes(kind) ? 0 : wave * 4);
    zombie.setData({
      kind,
      hp: adjustedHp,
      maxHp: adjustedHp,
      speed: settings.speed + Math.min(45, wave * 2.5),
      reward: settings.reward,
      drift: settings.drift,
      textureBase: settings.texture,
      walkFrame: 0,
      walkOffset: Phaser.Math.Between(0, 500),
      summonAt: scene.time.now + 3200,
      contactGraceUntil: kind === "mini" ? scene.time.now + 450 : 0
    });
    if (kind === "carrier") {
      const badge = scene.add.rectangle(point.x, point.y - zombie.height * 0.3, 20, 14, 0xfbbf24, 1).setDepth(8);
      zombie.setData("badge", badge);
    }
    if (kind === "boss") {
      const weakSpot = scene.add.circle(point.x, point.y, 9, 0xfde047, 0.8).setStrokeStyle(2, 0xffffff, 0.9).setDepth(9);
      zombie.setData("weakSpot", weakSpot);
    }
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
      const pistolMultiplier = selectedWeapon === "pistol" ? 1 + upgradeLevels.pistolPower * 0.15 : 1;
      const bulletScale = 1 + upgradeLevels.bulletSize * 0.2;
      bullet.setScale(bulletScale);
      bullet.body.setCircle(Math.max(3, bullet.width * 0.38), bullet.width * 0.12, bullet.height * 0.12);
      bullet.setData({ damage: weapon.damage * pistolMultiplier, expires: time + 1700, remainingPierce: weapon.pierce || 0, hitTargets: new Set() });
      bullet.setVelocity(Math.cos(angle) * weapon.speed, Math.sin(angle) * weapon.speed);
    }
    const rapidMultiplier = selectedWeapon === "pistol" && time < overdriveUntil ? 0.52 : 1;
    nextShotAt = time + weapon.interval * rapidMultiplier;
    if (selectedWeapon !== "pistol" && time >= overdriveUntil) {
      weaponAmmo -= 1;
      if (weaponAmmo <= 0) {
        selectedWeapon = "pistol";
        weaponAmmo = Infinity;
        statusEl.textContent = "아이템 탄약 소진 · 기본 권총으로 전환";
      }
      syncWeaponUi();
    }
  }

  function onBulletHit(bullet, zombie) {
    if (!bullet.active || !zombie.active) return;
    const hitTargets = bullet.getData("hitTargets");
    if (hitTargets.has(zombie)) return;
    hitTargets.add(zombie);
    const weakSpot = zombie.getData("weakSpot");
    const weakHit = weakSpot?.active && Phaser.Math.Distance.Between(bullet.x, bullet.y, weakSpot.x, weakSpot.y) <= 18;
    const damage = bullet.getData("damage") * (weakHit ? 1.8 : 1);
    const hp = zombie.getData("hp") - damage;
    const remainingPierce = bullet.getData("remainingPierce");
    if (remainingPierce > 0) bullet.setData("remainingPierce", remainingPierce - 1);
    else bullet.destroy();
    zombie.setData("hp", hp);
    zombie.setTintFill(0xffffff);
    burst(bullet.x, bullet.y, weakHit ? 0xfde047 : 0xffffff, weakHit ? 6 : 3);
    if (weakHit) playTone(940, 0.04, 0.018, "square");
    scene.time.delayedCall(45, () => { if (zombie.active) zombie.clearTint(); });
    if (hp <= 0) destroyZombie(zombie);
  }

  function destroyZombie(zombie, allowDrop = true) {
    if (!zombie.active) return;
    const kind = zombie.getData("kind");
    const dropX = zombie.x;
    const dropY = zombie.y;
    const reward = zombie.getData("reward");
    if (kind === "splitter") {
      spawnZombie("mini", clamp(dropX - 15, 66, W - 66), true, dropY);
      spawnZombie("mini", clamp(dropX + 15, 66, W - 66), true, dropY - 8);
    }
    combo += 1;
    comboElapsed = 2400 + upgradeLevels.comboWindow * 400;
    maxCombo = Math.max(maxCombo, combo);
    killsThisWave += 1;
    score += Math.round(reward * (1 + Math.min(20, combo) * 0.08) * (scene.time.now < overdriveUntil ? 2 : 1));
    destroyZombieSprite(zombie);
    burst(dropX, dropY, kind === "boss" ? 0xf97316 : 0x84cc16, kind === "boss" ? 18 : 7);
    if (allowDrop) dropWeaponItem(dropX, dropY, kind);
    if ([5, 10].includes(combo)) {
      announce(`COMBO ${combo}!`, "#86efac", 850);
      playTone(combo === 5 ? 520 : 660, 0.1, 0.04, "square");
    }
    if (combo > 0 && combo % 20 === 0) activateOverdrive();
    if (kind === "boss") {
      bossPending = false;
      bossActive = false;
      statusEl.textContent = `웨이브 ${wave} 보스 격파!`;
      announce("BOSS DOWN!", "#fde68a", 1600);
      playTone(880, 0.4, 0.06, "triangle");
    }
    syncUi();
  }

  function destroyZombieSprite(zombie) {
    const badge = zombie.getData("badge");
    if (badge?.active) badge.destroy();
    const weakSpot = zombie.getData("weakSpot");
    if (weakSpot?.active) weakSpot.destroy();
    zombie.destroy();
  }

  function activateOverdrive() {
    overdriveUntil = scene.time.now + 5000;
    announce("⚡ OVERDRIVE 5초 ⚡", "#fde047", 1500);
    playTone(760, 0.25, 0.055, "sawtooth");
    scene.cameras.main.flash(180, 253, 224, 71, false);
  }

  function dropWeaponItem(x, y, zombieKind) {
    if (!pickups || pickups.countActive(true) >= 10) return;
    const guaranteed = zombieKind === "boss" || zombieKind === "carrier";
    const dropChance = guaranteed ? 1 : Math.min(0.75, (zombieKind === "brute" ? 0.34 : 0.2) + upgradeLevels.itemDrop * 0.05);
    if (Math.random() > dropChance) return;
    let itemName;
    if (zombieKind === "boss") itemName = Math.random() < 0.5 ? "piercer" : "shotgun";
    else if (zombieKind === "carrier") itemName = ["rifle", "shotgun", "piercer"][Phaser.Math.Between(0, 2)];
    else {
      const roll = Math.random();
      itemName = roll < 0.34 ? "rifle" : roll < 0.52 ? "shotgun" : roll < 0.65 ? "piercer" : roll < 0.78 ? "grenade" : roll < 0.9 ? "freeze" : "magnet";
    }
    const pickup = pickups.create(x, y, `pickup-${itemName}`).setDepth(7);
    pickup.body.setCircle(16, 3, 3);
    pickup.setData({ item: itemName, floatOffset: Phaser.Math.Between(0, 500) });
    pickup.setVelocityY(118);
  }

  function onWeaponPickup(currentPlayer, pickup) {
    if (!pickup.active || gameState !== "running") return;
    const itemName = pickup.getData("item");
    pickup.destroy();
    if (weapons[itemName]) {
      selectedWeapon = itemName;
      weaponAmmo = Math.round(weapons[itemName].pickupAmmo * (1 + upgradeLevels.itemAmmo * 0.25));
      statusEl.textContent = `${weapons[itemName].name} 아이템 획득 · ${weaponAmmo}발`;
    } else if (itemName === "grenade") useGrenade();
    else if (itemName === "freeze") {
      freezeUntil = scene.time.now + 5000;
      statusEl.textContent = "냉각탄 획득 · 모든 적 5초 감속";
    } else if (itemName === "magnet") {
      magnetUntil = scene.time.now + 6000;
      statusEl.textContent = "자석 획득 · 아이템 자동 흡수 6초";
    }
    playTone(itemName === "grenade" ? 180 : 720, 0.16, 0.05, itemName === "grenade" ? "sawtooth" : "sine");
    vibrate(35);
    syncWeaponUi();
  }

  function useGrenade() {
    const targets = zombies.getChildren().filter((zombie) => zombie.active);
    targets.forEach((zombie) => {
      const damage = zombie.getData("kind") === "boss" ? 65 : 110;
      zombie.setData("hp", zombie.getData("hp") - damage);
      zombie.setTintFill(0xfb923c);
      if (zombie.getData("hp") <= 0) destroyZombie(zombie, false);
      else scene.time.delayedCall(90, () => { if (zombie.active) zombie.clearTint(); });
    });
    scene.cameras.main.flash(220, 249, 115, 22, false);
    scene.cameras.main.shake(240, 0.009);
    statusEl.textContent = "수류탄 폭발 · 화면 전체 피해";
  }

  function openUpgradeChoice() {
    const available = Object.keys(upgradeDefinitions).filter((name) => upgradeLevels[name] < 3);
    if (available.length === 0) return;
    gameState = "upgrading";
    pointerHeld = false;
    fireHeld = false;
    player.setVelocity(0, 0);
    scene.physics.world.pause();
    upgradeChoices.replaceChildren();
    Phaser.Utils.Array.Shuffle(available);
    available.slice(0, 3).forEach((name) => {
      const definition = upgradeDefinitions[name];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rounded-xl border border-amber-200/30 bg-white/5 p-4 text-left transition hover:bg-amber-500/15 focus:bg-amber-500/15";
      const title = document.createElement("strong");
      title.className = "block text-base text-amber-100";
      title.textContent = `${definition.title} · Lv.${upgradeLevels[name] + 1}`;
      const description = document.createElement("span");
      description.className = "mt-1 block text-sm text-slate-300";
      description.textContent = definition.description;
      button.append(title, description);
      button.addEventListener("click", () => applyUpgrade(name), { once: true });
      upgradeChoices.append(button);
    });
    upgradeOverlay.classList.remove("hidden");
    upgradeOverlay.classList.add("flex");
    announce("강화 선택 가능", "#fde68a", 900);
  }

  function applyUpgrade(name) {
    if (gameState !== "upgrading" || !upgradeDefinitions[name]) return;
    upgradeLevels[name] += 1;
    upgradeOverlay.classList.add("hidden");
    upgradeOverlay.classList.remove("flex");
    scene.physics.world.resume();
    gameState = "running";
    statusEl.textContent = `${upgradeDefinitions[name].title} Lv.${upgradeLevels[name]} 적용`;
    announce(`${upgradeDefinitions[name].title} 강화!`, "#fde68a", 1100);
    playTone(820, 0.2, 0.05, "triangle");
  }

  function isPlayerContact(currentPlayer, zombie) {
    if (gameState !== "running" || !zombie.active) return false;
    const kind = zombie.getData("kind");
    const maxX = kind === "boss" ? 32 : kind === "brute" ? 21 : kind === "mini" ? 12 : 17;
    const maxY = kind === "boss" ? 42 : kind === "brute" ? 29 : kind === "mini" ? 16 : 23;
    return Math.abs(currentPlayer.x - zombie.x) <= maxX
      && Math.abs(currentPlayer.y - zombie.y) <= maxY;
  }

  function onPlayerHit(currentPlayer, zombie) {
    if (gameState !== "running" || !zombie.active) return;
    if (scene.time.now < (zombie.getData("contactGraceUntil") || 0)) return;
    combo = 0;
    scene.cameras.main.shake(220, 0.012);
    destroyZombieSprite(zombie);
    endGame("좀비가 군인과 충돌했습니다.");
  }

  function clearGroup(group) {
    if (group) group.clear(true, true);
  }

  function clearZombies() {
    if (!zombies) return;
    zombies.children.iterate((zombie) => {
      const badge = zombie?.getData?.("badge");
      if (badge?.active) badge.destroy();
      const weakSpot = zombie?.getData?.("weakSpot");
      if (weakSpot?.active) weakSpot.destroy();
    });
    clearGroup(zombies);
  }

  function resetGame() {
    if (!scene || !player) return;
    runId += 1;
    clearZombies();
    clearGroup(bullets);
    clearGroup(pickups);
    player.setPosition(W / 2, H - 48).setVelocity(0, 0).setAlpha(1);
    player.rotation = -Math.PI / 2;
    score = 0;
    wave = 1;
    waveElapsed = 0;
    spawnElapsed = 0;
    combo = 0;
    comboElapsed = 0;
    maxCombo = 0;
    killsThisWave = 0;
    missedItems = 0;
    nextShotAt = 0;
    selectedWeapon = "pistol";
    weaponAmmo = Infinity;
    currentEvent = "normal";
    previousSpecialEvent = "";
    freezeUntil = 0;
    magnetUntil = 0;
    overdriveUntil = 0;
    bossPending = false;
    bossActive = false;
    Object.keys(upgradeLevels).forEach((name) => { upgradeLevels[name] = 0; });
    targetX = W / 2;
    pointerControls = false;
    gameState = "idle";
    scene.physics.world.resume();
    nightOverlay.classList.add("hidden");
    upgradeOverlay.classList.add("hidden");
    upgradeOverlay.classList.remove("flex");
    waveBanner.classList.add("hidden");
    syncUi("대기 중");
  }

  function startGame() {
    if (!scene || !player) { statusEl.textContent = "게임 엔진을 불러오는 중입니다."; return; }
    if (gameState === "upgrading") return;
    if (!soundMuted) playTone(440, 0.06, 0.02, "sine");
    if (gameState === "over") resetGame();
    if (gameState === "paused") scene.scene.resume();
    scene.physics.world.resume();
    gameState = "running";
    overlay.classList.add("hidden");
    announce(`WAVE ${wave} · ${eventNames[currentEvent]}`);
    statusEl.textContent = `웨이브 ${wave} 시작 · 좀비를 처치해 무기 아이템을 획득하세요`;
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
    pointerHeld = false;
    fireHeld = false;
    player.setVelocity(0, 0);
    scene.physics.world.pause();
    if (score > best) { best = score; localStorage.setItem("zombiShotBest", String(best)); }
    window.dispatchEvent(new CustomEvent("partygame:score", { detail: { gameId: "zombi-shot", score, wave } }));
    overlayTitle.textContent = "도시가 함락됐습니다";
    overlayText.textContent = `${reason} 최종 ${score}점 · 웨이브 ${wave} · 최고 ${best}점. 다시 방어해 보세요.`;
    overlayStartBtn.textContent = "다시 시작";
    overlay.classList.remove("hidden");
    upgradeOverlay.classList.add("hidden");
    upgradeOverlay.classList.remove("flex");
    playTone(90, 0.5, 0.06, "sawtooth");
    vibrate(90);
    syncUi("게임 오버");
  }

  function syncWeaponUi() {
    weaponEl.textContent = selectedWeapon === "pistol"
      ? "권총 · 무제한"
      : `${weapons[selectedWeapon].name} · ${weaponAmmo}발`;
  }

  function syncUi(message) {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(Math.max(best, score));
    waveEl.textContent = String(wave);
    comboEl.textContent = String(combo);
    syncWeaponUi();
    updateActiveEffects(scene?.time?.now || 0);
    if (message) statusEl.textContent = message;
  }

  document.addEventListener("keydown", (event) => {
    heldKeys[event.code] = true;
    if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "KeyP") togglePause();
    if (event.code === "KeyF") toggleFullscreen();
  });
  document.addEventListener("keyup", (event) => { heldKeys[event.code] = false; });

  document.querySelectorAll(".mobile-key[data-key]").forEach((button) => {
    const setKey = (value) => { heldKeys[button.dataset.key] = value; };
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); setKey(true); });
    button.addEventListener("pointerup", () => setKey(false));
    button.addEventListener("pointercancel", () => setKey(false));
  });
  const mobileFireBtn = el("mobileFireBtn");
  mobileFireBtn.addEventListener("pointerdown", (event) => { event.preventDefault(); mobileFireBtn.setPointerCapture(event.pointerId); fireHeld = true; });
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
    overlayText.textContent = "도로와 적이 계속 내려옵니다. 무기와 전술 아이템을 획득하고 콤보를 이어 방어하세요.";
    overlayStartBtn.textContent = "게임 시작";
    overlay.classList.remove("hidden");
  });

  const gameShell = el("gameShell");
  const fullscreenBtn = el("fullscreenBtn");
  const muteBtn = el("muteBtn");
  muteBtn.addEventListener("click", () => {
    soundMuted = !soundMuted;
    muteBtn.textContent = soundMuted ? "🔇 음소거" : "🔊 소리";
    muteBtn.setAttribute("aria-pressed", String(soundMuted));
    if (!soundMuted) playTone(620, 0.08, 0.035, "sine");
  });
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
    parent: "gameViewport",
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
