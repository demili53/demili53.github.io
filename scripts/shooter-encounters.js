/* Pure boss encounter clocks. The caller owns rendering, spawning and damage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShooterEncounters = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ESCORT_INTERVAL = 8, BEAM_COOLDOWN = 6, WARNING_TIME = .9, ACTIVE_TIME = .35;
  const BEAM_CYCLE = BEAM_COOLDOWN + WARNING_TIME + ACTIVE_TIME, EPSILON = 1e-9;
  const clock = (value, fallback) => Number.isFinite(value) && value >= 0 ? value : fallback;

  function cancelBeam(boss) {
    if (!boss || typeof boss !== 'object') return;
    boss.beam = null;
    boss.beamCooldown = BEAM_COOLDOWN;
  }

  function stepBoss(boss, dt, playerX, width = 480) {
    const events = [];
    if (!boss || typeof boss !== 'object' || boss.entering || !Number.isFinite(dt) || dt <= 0) return events;
    if (boss.tier >= 2) {
      boss.escortCooldown = clock(boss.escortCooldown, ESCORT_INTERVAL) - dt;
      if (boss.escortCooldown <= EPSILON) {
        events.push({ type: 'escort' });
        // No accumulated wave of escorts after a delayed update.
        boss.escortCooldown = ESCORT_INTERVAL;
      }
    }
    if (!(boss.tier >= 3)) return events;

    if (!boss.beam || !['warning', 'active'].includes(boss.beam.phase)) boss.beam = null;
    boss.beamCooldown = clock(boss.beamCooldown, BEAM_COOLDOWN);
    let remaining = dt;
    // A partial phase plus at most one complete cycle needs fewer than six transitions.
    for (let transitions = 0; transitions < 8 && remaining > EPSILON; transitions++) {
      if (!boss.beam) {
        // Whole idle cycles are equivalent for this call's constant aim position.
        if (boss.beamCooldown === BEAM_COOLDOWN && remaining >= BEAM_CYCLE) remaining %= BEAM_CYCLE;
        if (remaining <= EPSILON) break;
        if (remaining + EPSILON < boss.beamCooldown) {
          boss.beamCooldown -= remaining;
          break;
        }
        remaining = Math.max(0, remaining - boss.beamCooldown);
        const fieldWidth = Number.isFinite(width) && width >= 80 ? width : 480;
        const target = Number.isFinite(playerX) ? playerX : fieldWidth / 2;
        boss.beamCooldown = BEAM_COOLDOWN;
        boss.beam = { x: Math.max(40, Math.min(fieldWidth - 40, target)), width: 52, phase: 'warning', remaining: WARNING_TIME };
      } else {
        const beam = boss.beam;
        beam.remaining = clock(beam.remaining, beam.phase === 'warning' ? WARNING_TIME : ACTIVE_TIME);
        if (remaining + EPSILON < beam.remaining) {
          beam.remaining -= remaining;
          break;
        }
        remaining = Math.max(0, remaining - beam.remaining);
        if (beam.phase === 'warning') {
          beam.phase = 'active'; beam.remaining = ACTIVE_TIME;
        } else cancelBeam(boss);
      }
    }
    // Damage must be decided from the current beam phase, never from elapsed phases.
    return events;
  }

  return Object.freeze({ stepBoss, cancelBeam });
});
