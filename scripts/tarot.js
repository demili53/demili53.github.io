// Tarot reading page: shuffle, pick face-down cards, flip, and read the spread.
(() => {
  const BASE = '/assets/tarot/';
  const SPREADS = {
    one: { label: '오늘의 카드', positions: [{ name: '오늘의 카드', lead: '오늘 당신 곁에 머무는 기운은' }] },
    time: { label: '과거 · 현재 · 미래', positions: [
      { name: '과거', lead: '지금의 고민을 만든 지난 흐름은' },
      { name: '현재', lead: '지금 가장 크게 작용하는 기운은' },
      { name: '미래', lead: '이대로 흘러갈 때 다가올 모습은' }] },
    advice: { label: '상황 · 조언 · 결과', positions: [
      { name: '상황', lead: '지금 처한 상황의 핵심은' },
      { name: '조언', lead: '카드가 건네는 조언은' },
      { name: '결과', lead: '조언을 따를 때 기대할 수 있는 결과는' }] }
  };
  const SUITS = {
    wands: { ko: '완드', theme: '열정과 일, 추진력' },
    cups: { ko: '컵', theme: '감정과 관계, 마음' },
    swords: { ko: '소드', theme: '생각과 갈등, 결단' },
    pentacles: { ko: '펜타클', theme: '돈과 현실, 안정' }
  };
  const DECK_SIZE = 26;
  const $ = id => document.getElementById(id);
  const deckEl = $('deck'), slotsEl = $('slots'), statusEl = $('status');
  const shuffleBtn = $('shuffleBtn'), reading = $('reading');
  let cards = [], state = null;

  function randomInt(n) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % n;
  }
  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const spreadKey = () => document.querySelector('input[name=spread]:checked').value;
  const setStatus = text => { statusEl.textContent = text; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderSlots(spread) {
    slotsEl.className = 'slots' + (spread.positions.length === 1 ? ' one' : '');
    slotsEl.innerHTML = spread.positions.map((p, i) => `<div class="slot"><div class="pos">${esc(p.name)}</div>
      <button class="flip empty" type="button" data-slot="${i}" disabled aria-label="${esc(p.name)} 자리, 아직 카드 없음"><span class="inner"><span class="face back"><img src="${BASE}back.jpg" alt=""></span><span class="face front"><img alt=""></span></span></button>
      <div class="name"></div><div class="en"></div></div>`).join('');
  }

  function start() {
    if (!cards.length) return;
    const key = spreadKey(), spread = SPREADS[key];
    state = { key, spread, reversed: $('useReversed').checked, pool: shuffled(cards).slice(0, DECK_SIZE), picks: [], opened: 0 };
    reading.hidden = true;
    deckEl.innerHTML = state.pool.map((_, i) => `<button type="button" data-i="${i}" aria-label="엎어 놓은 카드 ${i + 1}번" style="--dx:${randomInt(40) - 20}px;--dy:${randomInt(24) - 12}px;--rot:${randomInt(24) - 12}deg"><img src="${BASE}back.jpg" alt=""></button>`).join('');
    deckEl.classList.remove('shuffling'); void deckEl.offsetWidth; deckEl.classList.add('shuffling');
    renderSlots(spread);
    shuffleBtn.textContent = '다시 섞기';
    setStatus(`끌리는 카드를 ${spread.positions.length}장 고르세요.`);
  }

  function pick(i) {
    if (!state || state.picks.length >= state.spread.positions.length) return;
    const btn = deckEl.querySelector(`[data-i="${i}"]`);
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.classList.add('taken');
    const card = state.pool[i];
    const rev = state.reversed && randomInt(2) === 1;
    const slotIndex = state.picks.length;
    state.picks.push({ card, rev });
    const slot = slotsEl.querySelector(`[data-slot="${slotIndex}"]`);
    slot.classList.remove('empty'); slot.disabled = false;
    slot.setAttribute('aria-label', `${state.spread.positions[slotIndex].name} 카드 뒤집기`);
    const front = slot.querySelector('.front');
    front.classList.toggle('reversed', rev);
    front.querySelector('img').src = BASE + card.img;
    const left = state.spread.positions.length - state.picks.length;
    if (left) setStatus(`${left}장 더 고르세요.`);
    else {
      deckEl.querySelectorAll('button:not(.taken)').forEach(b => { b.disabled = true; });
      setStatus('고른 카드를 눌러 하나씩 뒤집어 보세요.');
      slotsEl.querySelector('.flip:not(.open)').focus();
    }
  }

  function open(slotIndex) {
    const slot = slotsEl.querySelector(`[data-slot="${slotIndex}"]`);
    const p = state && state.picks[slotIndex];
    if (!p || slot.classList.contains('open')) return;
    slot.classList.add('open');
    const name = p.card.ko + (p.rev ? ' (역방향)' : '');
    slot.setAttribute('aria-label', `${state.spread.positions[slotIndex].name}: ${name}`);
    const box = slot.parentElement;
    box.querySelector('.name').textContent = name;
    box.querySelector('.en').textContent = p.card.en;
    state.opened++;
    const total = state.spread.positions.length;
    if (state.opened === total && state.picks.length === total) setTimeout(showReading, 650);
    else if (state.picks.length === total) setStatus(`${total - state.opened}장 남았습니다.`);
  }

  function cardText(p, position) {
    if (!p.rev) return `${position.lead} ‘${p.card.ko}’입니다. 이 카드의 뜻은 ‘${p.card.meaning}’입니다.`;
    return `${position.lead} 역방향 ‘${p.card.ko}’입니다. 이 카드의 뜻은 ‘${p.card.meaning}’이지만, 역방향이라 그 기운이 아직 막혀 있거나 늦게 나타납니다. 서두르기보다 무엇이 흐름을 붙잡고 있는지 살펴보세요.`;
  }

  function summaryText() {
    const picks = state.picks;
    const majors = picks.filter(p => p.card.arcana === 'major').length;
    const reversed = picks.filter(p => p.rev).length;
    const parts = [];
    if (picks.length === 1) {
      const p = picks[0];
      parts.push(p.card.arcana === 'major'
        ? `메이저 카드가 나왔습니다. 오늘은 사소한 일보다 마음가짐과 큰 방향을 돌아보기 좋은 날입니다.`
        : `${SUITS[p.card.suit].ko} 카드가 나왔습니다. 오늘은 ${SUITS[p.card.suit].theme}에 관한 일에 마음을 쓰게 될 수 있습니다.`);
    } else {
      if (majors >= 2) parts.push(`세 장 중 ${majors}장이 메이저 카드입니다. 지금의 고민은 일상의 작은 일보다 삶의 큰 전환과 연결되어 있습니다.`);
      else if (majors === 0) parts.push('모두 마이너 카드입니다. 큰 운명보다 지금 할 수 있는 구체적인 행동이 결과를 좌우합니다.');
      const counts = {};
      picks.forEach(p => { if (p.card.suit) counts[p.card.suit] = (counts[p.card.suit] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) parts.push(`${SUITS[top[0]].ko} 카드가 ${top[1]}장으로, ${SUITS[top[0]].theme}가 이번 고민의 중심입니다.`);
      const last = picks[picks.length - 1];
      parts.push(`마지막 자리의 ‘${last.card.ko}’${last.rev ? '(역방향)' : ''}이 앞으로의 방향을 가리킵니다.`);
    }
    if (reversed) parts.push(`역방향 카드가 ${reversed}장 있어, 일부 흐름은 조금 더 시간이 필요합니다.`);
    return parts.join(' ');
  }

  function showReading() {
    const q = $('question').value.trim();
    $('readingQuestion').textContent = (q ? `질문: ${q} · ` : '') + state.spread.label;
    $('readingList').innerHTML = state.picks.map((p, i) => {
      const pos = state.spread.positions[i];
      return `<li><img src="${BASE + p.card.img}" alt="${esc(p.card.ko)} 카드"${p.rev ? ' class="reversed"' : ''}><div><span class="tag">${esc(pos.name)}</span><b>${esc(p.card.ko)}${p.rev ? ' · 역방향' : ''} <small style="font-weight:400;color:#9a93b8">${esc(p.card.en)}</small></b><p>${esc(cardText(p, pos))}</p></div></li>`;
    }).join('');
    $('readingSummary').textContent = summaryText();
    reading.hidden = false;
    setStatus('해석이 준비되었습니다.');
    reading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function resultText() {
    const q = $('question').value.trim();
    const lines = [`[타로점] ${state.spread.label}${q ? ' / 질문: ' + q : ''}`];
    state.picks.forEach((p, i) => lines.push(`${state.spread.positions[i].name}: ${p.card.ko}${p.rev ? '(역방향)' : ''} - ${p.card.meaning}`));
    lines.push($('readingSummary').textContent, location.origin + location.pathname);
    return lines.join('\n');
  }

  function renderDict(filter) {
    const list = cards.filter(c => filter === 'major' ? c.arcana === 'major' : c.suit === filter);
    $('dictGrid').innerHTML = list.map(c => `<li><img src="${BASE + c.img}" alt="${esc(c.ko)} 카드" loading="lazy" width="300" height="434"><b>${esc(c.ko)}</b><small>${esc(c.en)}</small><p>${esc(c.meaning)}</p></li>`).join('');
    document.querySelectorAll('#dictTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  }

  deckEl.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
  slotsEl.addEventListener('click', e => { const b = e.target.closest('button[data-slot]'); if (b) open(+b.dataset.slot); });
  shuffleBtn.addEventListener('click', start);
  document.querySelectorAll('input[name=spread]').forEach(r => r.addEventListener('change', () => { if (state) start(); else if (cards.length) renderSlots(SPREADS[spreadKey()]); }));
  $('againBtn').addEventListener('click', () => { start(); $('deck').scrollIntoView({ block: 'center' }); });
  $('copyBtn').addEventListener('click', async () => {
    const btn = $('copyBtn');
    try { await navigator.clipboard.writeText(resultText()); btn.textContent = '복사했습니다'; }
    catch { btn.textContent = '복사하지 못했습니다'; }
    setTimeout(() => { btn.textContent = '결과 복사'; }, 1800);
  });
  $('dictTabs').addEventListener('click', e => { const b = e.target.closest('button[data-filter]'); if (b) renderDict(b.dataset.filter); });

  shuffleBtn.disabled = true;
  fetch(BASE + 'cards.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    cards = data.cards;
    shuffleBtn.disabled = false;
    renderDict('major');
    setStatus('질문을 떠올린 뒤 카드 섞기를 누르세요.');
    renderSlots(SPREADS[spreadKey()]);
  }).catch(() => setStatus('카드를 불러오지 못했습니다. 새로고침해 주세요.'));
})();
