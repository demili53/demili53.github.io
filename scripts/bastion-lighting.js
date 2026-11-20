/* Light pass for the merge battlefield: cached gradient textures, additive glows, night-to-dawn tint and lane portals.
   Everything follows the combat clock, so pause and reward selection freeze the picture. */
function bastionGlowKey(scene, color) {
  const key = 'bastion-glow-' + color.toString(16);
  if (!scene.textures.exists(key)) {
    const size = 128, texture = scene.textures.createCanvas(key, size, size), ctx = texture.getContext();
    const r = color >> 16 & 255, g = color >> 8 & 255, b = color & 255, gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${r},${g},${b},.9)`); gradient.addColorStop(.35, `rgba(${r},${g},${b},.32)`); gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size); texture.refresh();
  }
  return key;
}
function installBastionLighting(scene, size = 720) {
  const center = size / 2;
  const vignette = scene.textures.createCanvas('bastion-vignette', size, size);
  { const ctx = vignette.getContext(), gradient = ctx.createRadialGradient(center, center, size * .3, center, center, size * .74);
    gradient.addColorStop(0, 'rgba(3,8,16,0)'); gradient.addColorStop(.7, 'rgba(3,8,16,.42)'); gradient.addColorStop(1, 'rgba(2,5,12,.88)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size); vignette.refresh(); }
  const dawn = scene.textures.createCanvas('bastion-dawn', size, size);
  { const ctx = dawn.getContext(), gradient = ctx.createLinearGradient(0, 0, size * .45, size);
    gradient.addColorStop(0, 'rgba(255,196,120,.85)'); gradient.addColorStop(.35, 'rgba(255,140,110,.3)'); gradient.addColorStop(1, 'rgba(120,90,160,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size); dawn.refresh(); }
  const night = scene.add.graphics().setDepth(1.2);
  const dawnImage = scene.add.image(center, center, 'bastion-dawn').setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  const vignetteImage = scene.add.image(center, center, 'bastion-vignette').setDepth(6);
  const under = [], over = [];
  const take = (pool, index, depth) => { if (!pool[index]) pool[index] = scene.add.image(0, 0, bastionGlowKey(scene, 0xffffff)).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth); return pool[index]; };
  let usedUnder = 0, usedOver = 0;
  return {
    begin() { usedUnder = 0; usedOver = 0; },
    // layer 'under' sits below towers and enemies, 'over' above them.
    glow(x, y, radius, color, alpha, layer = 'under') {
      if (alpha <= 0 || (layer === 'under' ? usedUnder : usedOver) >= 40) return;
      const image = layer === 'under' ? take(under, usedUnder++, 1.5) : take(over, usedOver++, 4.5);
      image.setTexture(bastionGlowKey(scene, color)).setPosition(x, y).setDisplaySize(radius * 2, radius * 2).setAlpha(Math.min(1, alpha)).setVisible(true);
    },
    // progress 0 = deepest night, 1 = dawn breaking.
    end(progress, danger) {
      for (let i = usedUnder; i < under.length; i++) under[i].setVisible(false);
      for (let i = usedOver; i < over.length; i++) over[i].setVisible(false);
      const p = Math.max(0, Math.min(1, progress));
      night.clear(); night.fillStyle(danger ? 0x1c0710 : 0x060d24, .3 * (1 - p)); night.fillRect(0, 0, size, size);
      dawnImage.setAlpha(.05 + .3 * p * p); vignetteImage.setAlpha(.95 - .35 * p);
    }
  };
}
// Swirling gate where the next enemies arrive; drawn on the shared effect layer.
function drawBastionPortal(g, x, y, time, strength, reduced) {
  if (strength <= 0) return;
  const spin = reduced ? 0 : time * 1.6;
  g.fillStyle(0x12061f, .55 * strength); g.fillEllipse(x, y, 74, 74);
  g.fillStyle(0x4a1f7a, .35 * strength); g.fillEllipse(x, y, 52, 52);
  for (let i = 0; i < 3; i++) {
    const start = spin + i * Math.PI * 2 / 3, radius = 18 + i * 8;
    g.lineStyle(3 - i * .5, i === 1 ? 0xff8ad8 : 0xb68cff, (.75 - i * .15) * strength);
    g.beginPath(); g.arc(x, y, radius, start, start + 2.2, false); g.strokePath();
  }
  g.fillStyle(0xf2d9ff, .7 * strength); g.fillCircle(x, y, 4 + (reduced ? 0 : Math.sin(time * 5) * 1.5));
}
