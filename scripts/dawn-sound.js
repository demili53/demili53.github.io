/* 랜덤타워디펜스 — 효과음. 음원 파일 없이 합성하며, 사용자가 켰을 때만 소리를 냅니다. */
(function (root) {
  'use strict';
  // [시작 주파수, 끝 주파수, 길이(초), 음량, 파형]
  const TONES = {
    summon: [520, 880, .12, .05, 'triangle'], merge: [440, 1320, .22, .07, 'triangle'], amplify: [330, 990, .3, .06, 'sine'], flash: [1200, 200, .35, .08, 'sawtooth'],
    blast: [150, 55, .16, .07, 'square'], bolt: [900, 300, .08, .035, 'sawtooth'], beam: [1100, 500, .12, .04, 'sine'], frost: [700, 1400, .1, .025, 'sine'], cone: [220, 160, .08, .02, 'sawtooth'], cloud: [260, 130, .12, .03, 'sine'],
    boss: [110, 70, .5, .09, 'sawtooth'], bossDeath: [300, 50, .5, .1, 'square'], leak: [200, 80, .25, .09, 'square'], wave: [392, 784, .25, .05, 'triangle'], jam: [140, 420, .15, .05, 'square'], snipe: [1600, 120, .14, .07, 'sawtooth'], well: [90, 40, .3, .06, 'sine'], meteor: [900, 90, .22, .06, 'triangle'], snap: [500, 180, .07, .05, 'square'], temper: [660, 1320, .25, .06, 'triangle'], execute: [300, 60, .12, .06, 'sawtooth'], freeze: [1800, 2400, .1, .03, 'sine']
  };
  const PRIORITY = ['bossDeath', 'boss', 'leak', 'merge', 'flash', 'amplify', 'wave', 'temper', 'summon', 'jam', 'execute', 'snipe', 'meteor', 'well', 'snap', 'freeze', 'blast', 'beam', 'bolt', 'cloud', 'frost', 'cone'];
  class Sound {
    constructor() { this.context = null; this.enabled = false; this.seen = 0; this.game = null; this.last = 0; this.voices = 0; }
    async enable() { try { const Audio = root.AudioContext || root.webkitAudioContext; if (!Audio) return false; this.context = this.context || new Audio(); await this.context.resume(); this.enabled = this.context.state === 'running'; } catch { this.enabled = false; } return this.enabled; }
    disable() { this.enabled = false; }
    play(kind) {
      const tone = TONES[kind]; if (!tone || !this.enabled || this.voices >= 4) return;
      const ctx = this.context, now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = tone[4]; osc.frequency.setValueAtTime(tone[0], now); osc.frequency.exponentialRampToValueAtTime(tone[1], now + tone[2]);
      gain.gain.setValueAtTime(tone[3], now); gain.gain.exponentialRampToValueAtTime(.0001, now + tone[2]);
      osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + tone[2] + .02); this.voices++; osc.onended = () => { this.voices--; osc.disconnect(); gain.disconnect(); };
    }
    // 프레임마다 호출: 새로 생긴 효과 가운데 가장 중요한 것 하나만 소리 냅니다.
    update(game) {
      if (this.game !== game) { this.game = game; this.seen = game.nextFx; }
      let best = -1; for (const f of game.effects) if (f.id > this.seen) { const rank = PRIORITY.indexOf(f.kind); if (rank >= 0 && (best < 0 || rank < best)) best = rank; }
      this.seen = game.nextFx; if (best < 0 || !this.enabled) return;
      const now = this.context.currentTime; if (best > 7 && now - this.last < .07) return; this.last = now; this.play(PRIORITY[best]);
    }
  }
  root.DawnSound = Sound;
})(typeof globalThis !== 'undefined' ? globalThis : this);
