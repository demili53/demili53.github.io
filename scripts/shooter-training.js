/* Pure training configuration and stationary targets; never publishes scores. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShooterTraining = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WAVES = Object.freeze([1, 5, 10, 15, 20]);
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  function ownValue(config, key) {
    try { return Object.getOwnPropertyDescriptor(config, key)?.value; }
    catch { return undefined; }
  }
  function normalize(config) {
    const defaults = { wave: 5, level: 5, invincible: true };
    try {
      if (!config || typeof config !== 'object' || Array.isArray(config)) return defaults;
      const wave = ownValue(config, 'wave'), level = ownValue(config, 'level'), invincible = ownValue(config, 'invincible');
      return {
        wave: WAVES.includes(wave) ? wave : defaults.wave,
        level: typeof level === 'number' && Number.isFinite(level) ? clamp(Math.trunc(level), 1, 10) : defaults.level,
        invincible: typeof invincible === 'boolean' ? invincible : defaults.invincible
      };
    } catch { return defaults; }
  }
  function describe(config) {
    const settings = normalize(config);
    return `훈련 · 웨이브 ${settings.wave} · 무기 Lv.${settings.level} · 무적 ${settings.invincible ? '켜짐' : '꺼짐'}`;
  }
  function buildTargets(config, width = 480, height = 640) {
    const settings = normalize(config);
    const fieldWidth = typeof width === 'number' && Number.isFinite(width) && width >= 40 ? width : 480;
    const fieldHeight = typeof height === 'number' && Number.isFinite(height) && height >= 40 ? height : 640;
    const hp = 30 + settings.wave * 4;
    return [-100, 0, 100].map(offset => ({
      type: 'grunt', trainingTarget: true,
      x: clamp(fieldWidth / 2 + offset, 20, fieldWidth - 20),
      y: clamp(180, 20, fieldHeight - 20),
      w: 40, h: 40, hp, maxHp: hp, vx: 0, vy: 0, fireCd: 999999, score: 0
    }));
  }
  return Object.freeze({ WAVES, normalize, describe, buildTargets });
});
