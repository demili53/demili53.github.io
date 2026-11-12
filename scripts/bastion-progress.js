/* Local, read-only progression panels. They never change a running battle. */
const BastionProgressData = (() => {
  const modes = new Set(['classic', 'rush', 'siege', 'practice']);
  const maps = new Set(['grove', 'canyon', 'glacier', 'marsh', 'volcano', 'ruins']);
  const towerTypes = new Set(['arrow', 'cannon', 'frost', 'laser', 'tesla', 'sniper', 'venom', 'gravity', 'flame', 'banner']);
  const perkLimits = { bounty: 2, capacitor: 3, mending: 3, power: 3, haste: 3, range: 3, guardian: 3, restore: 100, supply: 100 };
  const guardianIds = new Set(['guardian', 'scout', 'gunner']), missionIds = new Set(['none', 'noRepair', 'compact', 'diverse']);
  const achievements = [
    { id: 'first_win', name: '첫 승리', description: '어떤 모드든 한 번 승리' },
    { id: 'perfect_wave', name: '흠 없는 방어', description: '수정 피해 없이 웨이브 완료' },
    { id: 'combo_ten', name: '연속 격파', description: '한 도전에서 10콤보 달성' },
    { id: 'five_weapons', name: '다채로운 방어선', description: '서로 다른 타워 5종을 동시에 운용' },
    { id: 'final_stage', name: '원정의 끝', description: '마지막 원정 스테이지에서 승리' },
    { id: 'relocation', name: '유연한 지휘', description: '타워를 다른 지점으로 재배치' }
  ];
  const ids = new Set(achievements.map(item => item.id));
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const count = (n, max = 1000000) => Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : 0;
  function cleanLoadout(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const slots = new Set(), perkIds = new Set();
    const towers = (Array.isArray(value.towers) ? value.towers : []).slice(0, 8).filter(tower => tower && integer(tower.slot, 0, 7) && towerTypes.has(tower.type) && !slots.has(tower.slot) && slots.add(tower.slot)).map(tower => ({ slot: tower.slot, type: tower.type, level: integer(tower.level, 1, 3) ? tower.level : 1, specialization: ['power', 'rapid', 'reach'].includes(tower.specialization) ? tower.specialization : null }));
    const perks = (Array.isArray(value.perks) ? value.perks : []).slice(0, 16).filter(perk => perk && Object.hasOwn(perkLimits, perk.id) && integer(perk.count, 1, perkLimits[perk.id]) && !perkIds.has(perk.id) && perkIds.add(perk.id)).map(perk => ({ id: perk.id, count: perk.count }));
    return { towers, perks, guardian: guardianIds.has(value.guardian) ? value.guardian : null, mission: missionIds.has(value.mission) ? value.mission : 'none' };
  }
  function captureLoadout(game) {
    return cleanLoadout({ towers: (Array.isArray(game.slots) ? game.slots : []).slice(0, 8).flatMap((slot, index) => slot?.tower ? [{ slot: index, type: slot.tower.type, level: slot.tower.level, specialization: slot.tower.specialization }] : []), perks: Object.entries(game.perks && typeof game.perks === 'object' ? game.perks : {}).slice(0, 32).map(([id, count]) => ({ id, count })), guardian: game.guardian, mission: game.mission });
  }
  function cloneRecord(row) { return { ...row, ...(row.loadout ? { loadout: { ...row.loadout, towers: row.loadout.towers.map(tower => ({ ...tower })), perks: row.loadout.perks.map(perk => ({ ...perk })) } } : {}) }; }
  function filterHistory(history, outcome = 'all') { return (Array.isArray(history) ? history : []).filter(row => !['won', 'lost'].includes(outcome) || row.outcome === outcome).map(cloneRecord); }
  function cleanHistory(value, stageCount = 8) {
    if (!Array.isArray(value)) return [];
    const result = [];
    // Do not trust arbitrary strings, field types, or unbounded lists from storage.
    for (const row of value.slice(0, 100)) {
      if (!row || !['won', 'lost'].includes(row.outcome) || !modes.has(row.mode) || !maps.has(row.map) || !integer(row.stage, -1, stageCount - 1) || !integer(row.at, 0, 8640000000000000)) continue;
      if (!integer(row.score, 0, 1000000000) || !integer(row.wave, 1, 100) || !integer(row.waves, row.wave, 100)) continue;
      const loadout = cleanLoadout(row.loadout);
      result.push({ at: row.at, outcome: row.outcome, mode: row.mode, map: row.map, stage: row.stage, score: row.score, wave: row.wave, waves: row.waves, kills: count(row.kills), seconds: count(row.seconds, 86400), perfect: count(row.perfect, 100), medal: count(row.medal, 3), ...(loadout ? { loadout } : {}) });
      if (result.length === 10) break;
    }
    return result;
  }
  function cleanAchievements(value) {
    return Array.isArray(value) ? [...new Set(value.slice(0, 100).filter(id => ids.has(id)))] : [];
  }
  function earned(game, stageCount = 8) {
    if (!game || !['running', 'building', 'paused', 'reward', 'won', 'lost'].includes(game.state)) return [];
    const played = Number(game.time) > 0 || Number(game.kills) > 0 || Number(game.runStats?.damage) > 0 || (Array.isArray(game.waveHistory) && game.waveHistory.length > 0);
    if (!played) return [];
    const types = new Set((Array.isArray(game.slots) ? game.slots : []).slice(0, 8).map(slot => slot?.tower?.type).filter(type => towerTypes.has(type)));
    return [
      game.state === 'won' && 'first_win',
      game.perfectWaves >= 1 && 'perfect_wave',
      game.bestCombo >= 10 && 'combo_ten',
      types.size >= 5 && 'five_weapons',
      game.state === 'won' && game.stage === stageCount - 1 && 'final_stage',
      game.runStats?.relocations >= 1 && 'relocation'
    ].filter(Boolean);
  }
  function achievementProgress(game, stageCount = 8) {
    const active = !!game && ['running', 'building', 'paused', 'reward'].includes(game.state);
    const types = active ? new Set((Array.isArray(game.slots) ? game.slots : []).slice(0, 8).map(slot => slot?.tower?.type).filter(type => towerTypes.has(type))).size : 0;
    const final = active && game.stage === stageCount - 1, waves = final ? Math.max(1, count(game.rules?.waves, 100)) : 1;
    const values = { first_win: [0, 1, '승리'], perfect_wave: [active ? count(game.perfectWaves, 1) : 0, 1, '무피해 웨이브'], combo_ten: [active ? count(game.bestCombo, 10) : 0, 10, '최고 콤보'], five_weapons: [Math.min(5, types), 5, '동시 무기 종류'], final_stage: [final ? Math.min(waves, count(game.waveHistory?.length, 100)) : 0, waves, '최종 원정 완료 웨이브'], relocation: [active ? count(game.runStats?.relocations, 1) : 0, 1, '재배치'] };
    return achievements.map(item => { const [value, target, label] = values[item.id]; return { id: item.id, value, target, active, text: !active ? '다음 전투에서 진행도를 확인하세요.' : item.id === 'final_stage' && !final ? stageCount + '단계 승리에 도전하세요.' : label + ' ' + value + ' / ' + target }; });
  }
  function recommendation(rawMedals, stageCount = 8) {
    const medals = Array.from({ length: stageCount }, (_, i) => integer(rawMedals?.[i], 0, 3) ? rawMedals[i] : 0);
    let index = medals.indexOf(0);
    if (index >= 0) return { index, reason: '아직 완료하지 않은 원정입니다.', medal: 0 };
    const lowest = Math.min(...medals);
    if (lowest < 3) { index = medals.indexOf(lowest); return { index, reason: '별 ' + (lowest + 1) + '개 평가에 도전해 보세요.', medal: lowest }; }
    return { index: Math.max(0, stageCount - 1), reason: '모든 원정에서 별 3개를 달성했습니다. 마지막 전투를 다시 즐겨 보세요.', medal: 3 };
  }
  function createStore(storage, stageCount = 8, now = Date.now) {
    let available = !!storage;
    const read = key => { try { return JSON.parse(storage?.getItem(key) || '[]'); } catch { available = false; return []; } };
    let history = cleanHistory(read('dawnBastionRunHistory'), stageCount);
    const unlocked = new Set(cleanAchievements(read('dawnBastionAchievements'))), recorded = new WeakSet();
    let revision = 0;
    const write = (key, value) => { try { if (!storage) { available = false; return; } storage.setItem(key, JSON.stringify(value)); } catch { available = false; } };
    function observe(game) {
      if (!game || typeof game !== 'object') return [];
      const newlyEarned = earned(game, stageCount).filter(id => !unlocked.has(id));
      if (newlyEarned.length) { newlyEarned.forEach(id => unlocked.add(id)); write('dawnBastionAchievements', [...unlocked]); revision++; }
      if (['won', 'lost'].includes(game.state) && !recorded.has(game)) {
        // Mark before storage access, so a blocked quota never duplicates the same run.
        recorded.add(game);
        const row = cleanHistory([{ at: now(), outcome: game.state, mode: game.mode, map: game.map, stage: game.stage, score: Math.round(game.score), wave: game.wave, waves: game.rules?.waves, kills: game.kills, seconds: game.time, perfect: game.perfectWaves, medal: typeof game.stageMedal === 'function' ? game.stageMedal() : 0, loadout: captureLoadout(game) }], stageCount)[0];
        if (row) { history = [row, ...history].slice(0, 10); write('dawnBastionRunHistory', history); revision++; }
      }
      return newlyEarned;
    }
    return { observe, revision: () => revision, snapshot: () => ({ history: history.map(cloneRecord), unlocked: [...unlocked], revision, available }) };
  }
  return { achievements, cleanLoadout, captureLoadout, cleanHistory, cleanAchievements, filterHistory, earned, achievementProgress, recommendation, createStore };
})();

function installBastionProgress({ getGame, getMedals, selectStage }) {
  const aside = document.querySelector('.aside');
  if (!aside) return { update() {} };
  const stageCount = STAGES.length;
  let storage = null;
  try { storage = localStorage; } catch {}
  const store = BastionProgressData.createStore(storage, stageCount);
  const element = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  if (!document.getElementById('bastionProgressStyles')) {
    const style = element('style'); style.id = 'bastionProgressStyles';
    style.textContent = '.bastion-progress-list{list-style:none;padding:0;margin:12px 0;display:grid;gap:8px}.bastion-progress-list li{padding:9px;border:1px solid #39534c;border-radius:8px;line-height:1.6;overflow-wrap:anywhere}.bastion-progress-list small{display:block;color:#abc4bd;font-size:11px}.bastion-progress-list [data-earned="true"]{border-color:#beaa71;background:#283b34}.bastion-progress-list strong{font-size:13px}.bastion-progress-note{font-size:12px;color:#b8ccc4;line-height:1.6}.bastion-progress-panel .btn{max-width:100%;white-space:normal}.bastion-progress-panel h2{font-size:18px}.bastion-history-filters{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.bastion-history-filters .btn{padding:7px 11px}.bastion-history-filters [aria-pressed=true]{border-color:#e8c183;background:#354b40}.bastion-run-loadout{margin-top:7px;font-size:12px}.bastion-run-loadout p{margin:7px 0;color:#bed1c6;line-height:1.6}.bastion-achievement-progress[hidden]{display:none}.bastion-achievement-progress{width:100%;height:7px;accent-color:#a9d7b3;display:block;margin-top:7px}'; document.head.append(style);
  }
  const historyPanel = element('section', undefined, 'panel side-card bastion-progress-panel'); historyPanel.id = 'runHistoryPanel';
  const historyDetails = element('details'), historySummary = element('summary', '최근 전투 기록'), historyList = element('ol', undefined, 'bastion-progress-list'), historyNote = element('p', undefined, 'bastion-progress-note'); historyList.id = 'runHistoryList';
  const historyFilters = element('div', undefined, 'bastion-history-filters'); historyFilters.id = 'historyOutcomeFilters'; historyFilters.setAttribute('role', 'group'); historyFilters.setAttribute('aria-label', '전투 기록 결과 필터');
  historyDetails.append(historySummary, historyNote, historyFilters, historyList); historyPanel.append(historyDetails);
  const achievementPanel = element('section', undefined, 'panel side-card bastion-progress-panel'); achievementPanel.id = 'achievementPanel';
  const achievementDetails = element('details'), achievementSummary = element('summary'), achievementList = element('ul', undefined, 'bastion-progress-list'), announcement = element('p', '', 'bastion-progress-note'); achievementList.id = 'achievementList'; announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
  achievementDetails.append(achievementSummary, achievementList); achievementPanel.append(achievementDetails, announcement);
  const nextPanel = element('section', undefined, 'panel side-card bastion-progress-panel'); nextPanel.id = 'recommendedStagePanel';
  const nextHeading = element('h2', '다음 도전'), nextName = element('strong'), nextDescription = element('p', undefined, 'bastion-progress-note'), nextButton = element('button', '이 스테이지 준비', 'btn'), nextHint = element('p', undefined, 'bastion-progress-note'); nextButton.id = 'recommendedStage'; nextButton.type = 'button';
  nextPanel.append(nextHeading, nextName, nextDescription, nextButton, nextHint); aside.append(historyPanel, achievementPanel, nextPanel);
  let renderedRevision = -1, recommendationKey = '', outcomeFilter = 'all', cachedSnapshot = null;
  const filterButtons = new Map(), progressRows = new Map();
  const towerNames = { arrow: '연사탑', cannon: '폭발탑', frost: '냉기탑', laser: '관통 광선탑', tesla: '연쇄 번개탑', sniper: '저격탑', venom: '맹독탑', gravity: '중력탑', flame: '화염 방사탑', banner: '지휘탑' };
  const perkNames = { bounty: '회수 전문가', capacitor: '충격파 축전기', mending: '수정 복구 회로', power: '요새의 화력', haste: '빠른 장전', range: '정밀 조준', guardian: '수호자의 결의', restore: '긴급 복구', supply: '보급 상자' };
  const guardianNames = { guardian: '균형 수호자', scout: '척후병', gunner: '포격수' }, missionNames = { none: '기본 도전', noRepair: '무수리 도전', compact: '소수 정예', diverse: '무기 연구가' }, specializationNames = { power: '고출력', rapid: '속사', reach: '장거리' };
  function renderHistory() {
    if (!cachedSnapshot) return;
    const snapshot = cachedSnapshot, visible = BastionProgressData.filterHistory(snapshot.history, outcomeFilter);
    historySummary.textContent = '최근 전투 기록 · ' + snapshot.history.length + ' / 10';
    historyNote.textContent = (snapshot.available ? '이 브라우저의 최근 10회 · 시간은 한국 기준' : '브라우저 저장소를 사용할 수 없어 이 창에서만 기록합니다.') + (outcomeFilter === 'all' ? '' : ' · ' + (outcomeFilter === 'won' ? '승리' : '패배') + ' ' + visible.length + '회');
    for (const [id, button] of filterButtons) button.setAttribute('aria-pressed', String(id === outcomeFilter));
    historyList.replaceChildren();
    if (!visible.length) { const empty = element('li', snapshot.history.length ? '선택한 결과의 전투 기록이 없습니다.' : '전투를 마치면 기록이 표시됩니다.'); empty.dataset.empty = 'true'; historyList.append(empty); }
    for (const entry of visible) {
      const row = element('li'); row.dataset.outcome = entry.outcome;
      const label = entry.stage >= 0 ? (entry.stage + 1) + '단계 · ' + STAGES[entry.stage].name : MODES[entry.mode].name + ' · ' + MAPS[entry.map].name;
      row.append(element('strong', (entry.outcome === 'won' ? '승리' : '패배') + ' · ' + label), element('small', entry.score.toLocaleString('ko-KR') + '점 · ' + entry.wave + '/' + entry.waves + '웨이브 · ' + entry.kills + '처치 · ' + entry.seconds + '초' + (entry.medal ? ' · ' + '★'.repeat(entry.medal) : '')), element('small', new Date(entry.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })));
      const detail = element('details', undefined, 'bastion-run-loadout'); detail.append(element('summary', '편성·강화 보기'));
      if (entry.loadout) {
        const loadout = entry.loadout;
        detail.append(element('p', (guardianNames[loadout.guardian] || '이전 수호자 설정') + ' · ' + missionNames[loadout.mission]));
        detail.append(element('p', '종료 시 배치: ' + (loadout.towers.length ? loadout.towers.map(tower => (tower.slot + 1) + '번 ' + towerNames[tower.type] + ' Lv.' + tower.level + (tower.specialization ? ' (' + specializationNames[tower.specialization] + ')' : '')).join(' · ') : '설치된 타워 없음')));
        detail.append(element('p', '강화 카드: ' + (loadout.perks.length ? loadout.perks.map(perk => perkNames[perk.id] + ' ×' + perk.count).join(' · ') : '선택한 카드 없음')));
      } else detail.append(element('p', '이전 기록에는 편성 정보가 저장되지 않았습니다.'));
      row.append(detail); historyList.append(row);
    }
  }
  for (const [id, label] of [['all', '전체'], ['won', '승리'], ['lost', '패배']]) { const button = element('button', label, 'btn'); button.type = 'button'; button.dataset.outcomeFilter = id; button.setAttribute('aria-pressed', String(id === outcomeFilter)); button.onclick = () => { outcomeFilter = id; renderHistory(); }; historyFilters.append(button); filterButtons.set(id, button); }
  function update() {
    const game = getGame();
    const newlyEarned = store.observe(game), snapshot = renderedRevision !== store.revision() ? store.snapshot() : null;
    if (newlyEarned.length) announcement.textContent = '업적 달성: ' + newlyEarned.map(id => BastionProgressData.achievements.find(item => item.id === id).name).join(' · ');
    if (snapshot) {
      renderedRevision = snapshot.revision; cachedSnapshot = snapshot; renderHistory();
      achievementSummary.textContent = '업적 · ' + snapshot.unlocked.length + ' / ' + BastionProgressData.achievements.length;
      achievementList.replaceChildren(); progressRows.clear();
      for (const achievement of BastionProgressData.achievements) {
        const complete = snapshot.unlocked.includes(achievement.id), row = element('li'); row.dataset.earned = String(complete); row.dataset.achievement = achievement.id;
        row.append(element('strong', (complete ? '달성 · ' : '미달성 · ') + achievement.name), element('small', achievement.description));
        if (!complete) { const label = element('small'), meter = element('progress', undefined, 'bastion-achievement-progress'); label.dataset.progressFor = achievement.id; meter.setAttribute('aria-label', achievement.name + ' 진행도'); meter.max = 1; meter.value = 0; row.append(label, meter); progressRows.set(achievement.id, { label, meter, key: '' }); }
        achievementList.append(row);
      }
    }
    for (const progress of BastionProgressData.achievementProgress(game, stageCount)) {
      const view = progressRows.get(progress.id); if (!view) continue;
      const key = progress.text + ':' + progress.value + ':' + progress.target + ':' + progress.active;
      if (view.key !== key) { view.key = key; view.label.textContent = progress.text; view.meter.max = progress.target; view.meter.value = progress.value; view.meter.hidden = !progress.active; }
    }
    const recommendation = BastionProgressData.recommendation(getMedals(), stageCount), allowed = !!game && ['idle', 'won', 'lost'].includes(game.state), key = recommendation.index + ':' + recommendation.medal + ':' + allowed;
    if (key !== recommendationKey) { recommendationKey = key; nextName.textContent = (recommendation.index + 1) + '단계 · ' + STAGES[recommendation.index].name; nextDescription.textContent = recommendation.reason; nextButton.disabled = !allowed; nextButton.dataset.stage = recommendation.index; nextHint.textContent = allowed ? '버튼을 누르면 출전 준비 화면으로 이동합니다.' : '현재 전투를 마친 뒤 다음 도전을 선택할 수 있습니다.'; }
  }
  nextButton.onclick = () => { const game = getGame(); if (!game || !['idle', 'won', 'lost'].includes(game.state)) return; const next = BastionProgressData.recommendation(getMedals(), stageCount); selectStage(next.index); };
  update();
  return { update };
}
if (typeof module !== 'undefined' && module.exports) module.exports = BastionProgressData;
