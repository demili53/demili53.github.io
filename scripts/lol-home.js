import { TIERS, COOLDOWN, TTL, millis, normalize, stateOf, matches, relativeTime, profileData } from './duo-core.mjs';

const $ = id => document.getElementById(id);
const form = $('partyForm'), filters = $('boardFilters');
let store, user = null, ownPost = null, stopOwn, mode = '솔로/듀오 랭크';
let posts = new Map(), cursor = null, hasMore = true, loaded = false;
let busy = false, loading = false, scanning = false, connecting = false;
let ownReady = false, reportTarget = null;
const filterIds = ['searchRiotId','filterMode','filterMinTier','filterMaxTier','filterState','filterMic','filterStyle','filterAvailability','filterDuration'];
const profileIds = ['riotId','tier','division','mic','style','availability','duration','partyNote'];
const cards = [...document.querySelectorAll('[data-mode]')];
const boxes = (scope,name) => [...scope.querySelectorAll(`input[name="${name}"]`)];
const selected = (scope,name) => boxes(scope,name).filter(box => box.checked).map(box => box.value);
const val = id => $(id).value.trim();
const key = name => `duo.v2.${name}.${user?.uid || 'guest'}`;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ } }
function clear(key) { try { localStorage.removeItem(key); } catch {} }
function blocked() {
  const data = read(key('blocked'),[]);
  return Array.isArray(data) ? data.filter(item => typeof item?.id === 'string' && typeof item.riotId === 'string') : [];
}
function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text,action,disabled = false) {
  const node = element('button',text,'button secondary'); node.type = 'button'; node.disabled = disabled;
  node.addEventListener('click',action); return node;
}
function message(text) { $('partyStatus').textContent = text; }
function errorText(error, action) {
  if (error.code === 'cooldown') return error.message;
  if (error.code === 'permission-denied') return `${action}하지 못했습니다. 게시판 보안 규칙이 최신인지 확인해 주세요.${action === '신고' ? ' 같은 사용자는 24시간에 한 번 신고할 수 있습니다.' : ''}`;
  return `${action}하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.`;
}
function setMode(next) {
  mode = cards.some(card => card.dataset.mode === next) ? next : cards[0].dataset.mode;
  cards.forEach(card => { const active = card.dataset.mode === mode; card.classList.toggle('selected',active); card.setAttribute('aria-pressed',String(active)); });
  $('chosenMode').textContent = mode;
}
function syncDivision() {
  $('division').disabled = !val('tier') || ['언랭크','마스터','그랜드마스터','챌린저'].includes(val('tier'));
  if ($('division').disabled) $('division').value = '';
}
function profile() {
  return { riotId:val('riotId'),tier:val('tier'),division:val('division'),mic:val('mic'),style:val('style'),availability:val('availability'),duration:val('duration'),note:val('partyNote'),mode,positions:selected(form,'positions'),wantedPositions:selected(form,'wantedPositions') };
}
function fillProfile(data) {
  const p = normalize(data || {});
  for (const id of profileIds) {
    const field = id === 'partyNote' ? 'note' : id;
    $(id).value = typeof p[field] === 'string' ? p[field] : '';
  }
  for (const name of ['positions','wantedPositions']) {
    const values = Array.isArray(p[name]) && p[name].length ? p[name] : ['상관없음'];
    boxes(form,name).forEach(box => { box.checked = values.includes(box.value); });
    if (!selected(form,name).length) boxes(form,name)[0].checked = true;
  }
  setMode(p.mode); syncDivision();
}
function saveDraft() { if (user) save(key('draft'),profile()); }
cards.forEach(card => card.addEventListener('click',() => { setMode(card.dataset.mode); saveDraft(); }));
for (const name of ['positions','wantedPositions']) {
  boxes(form,name).forEach(box => box.addEventListener('change',() => {
    const group = boxes(form,name);
    if (box.checked && box.value === '상관없음') group.forEach(item => { item.checked = item === box; });
    else if (box.checked) group[0].checked = false;
    if (!group.some(item => item.checked)) group[0].checked = true;
    saveDraft();
  }));
}
form.addEventListener('input',() => { syncDivision(); saveDraft(); });
form.addEventListener('change',saveDraft);
$('clearDraft').addEventListener('click',() => { form.reset(); setMode('솔로/듀오 랭크'); syncDivision(); clear(key('draft')); message('입력 초안을 지웠습니다. 등록된 모집글은 유지됩니다.'); });
$('loadMyPost').addEventListener('click',() => editPost());
function editPost() {
  if (!ownPost || ownPost.status === 'deleted') return;
  fillProfile(ownPost); saveDraft(); $('party').scrollIntoView({block:'start'}); $('riotId').focus({preventScroll:true});
  message('내 등록글을 불러왔습니다. 수정 후 저장하세요. 모집 시간은 끌어올리기로 연장할 수 있습니다.');
}
function filterData() {
  return { search:val('searchRiotId'),mode:val('filterMode'),minTier:val('filterMinTier'),maxTier:val('filterMaxTier'),state:val('filterState'),mic:val('filterMic'),style:val('filterStyle'),availability:val('filterAvailability'),duration:val('filterDuration'),positions:selected(filters,'filterPositions'),wantedPositions:selected(filters,'filterWantedPositions'),includeAny:$('includeAny').checked };
}
function saveFilters() {
  save('duo.v2.filters',{values:Object.fromEntries(filterIds.map(id => [id,$(id).value])),positions:selected(filters,'filterPositions'),wantedPositions:selected(filters,'filterWantedPositions'),includeAny:$('includeAny').checked});
}
function restoreFilters() {
  const saved = read('duo.v2.filters',null); if (!saved || typeof saved !== 'object') return;
  for (const id of filterIds) if (typeof saved.values?.[id] === 'string') {
    if ($(id).tagName !== 'SELECT' || [...$(id).options].some(option => option.value === saved.values[id])) $(id).value = saved.values[id];
  }
  for (const [name,field] of [['filterPositions','positions'],['filterWantedPositions','wantedPositions']]) boxes(filters,name).forEach(box => { box.checked = Array.isArray(saved[field]) && saved[field].includes(box.value); });
  $('includeAny').checked = saved.includeAny !== false;
}
function filtersChanged() { saveFilters(); render(); }
filters.addEventListener('input',filtersChanged);
filters.addEventListener('submit',event => { event.preventDefault(); filtersChanged(); });
filters.addEventListener('reset',event => {
  event.preventDefault();
  filters.querySelectorAll('input,select').forEach(control => { if (control.type === 'checkbox') control.checked = control.id === 'includeAny'; else control.value = control.id === 'filterState' ? 'open' : ''; });
  saveFilters(); render();
});
function updateControls() {
  $('publishParty').disabled = !user || !store || !ownReady || busy;
  $('loadMyPost').disabled = busy || !ownPost || ownPost.status === 'deleted';
  $('loadMore').disabled = !store || loading || scanning || !hasMore;
  $('searchAll').disabled = !store || loading || scanning || !hasMore;
  $('refreshBoard').disabled = !store || loading || scanning;
  $('stopSearch').hidden = !scanning;
  $('sendReport').disabled = busy;
  $('closeReport').disabled = busy;
}
const stateLabels = {open:'모집 중',closed:'모집 완료',expired:'만료됨'};
function ownerActions() {
  const area = $('myPostActions'); area.replaceChildren();
  if (!ownPost || ownPost.status === 'deleted') return;
  const state = stateOf(ownPost);
  area.append(element('span',`내 글 · ${stateLabels[state]}`,'post-mode'));
  const remaining = Math.max(0, COOLDOWN - (Date.now() - millis(ownPost.updatedAt)));
  area.append(button(remaining ? `다시 모집까지 ${Math.ceil(remaining/1000)}초` : state === 'open' ? '끌어올리기' : '다시 모집',() => mutate('bumpPost','모집을 시작하고 2시간 연장했습니다.'),busy || !!remaining));
  if (state === 'open') area.append(button('모집 완료',() => mutate('closePost','모집 완료로 변경했습니다.'),busy));
  area.append(button('모집글 삭제',() => mutate('removePost','모집글 내용을 삭제했습니다.'),busy));
}
function render() {
  updateControls(); ownerActions();
  const all = [...posts.values()].filter(post => post.status !== 'deleted');
  const f = filterData();
  const invalidRange = f.minTier && f.maxTier && TIERS.indexOf(f.minTier) > TIERS.indexOf(f.maxTier);
  const blockedIds = new Set(blocked().map(item => item.id));
  const results = invalidRange ? [] : all.filter(post => !blockedIds.has(post.id) && matches(post,f)).sort((a,b) => millis(b.updatedAt)-millis(a.updatedAt));
  $('filterSummary').textContent = invalidRange ? '최소 티어가 최대 티어보다 높습니다. 범위를 확인해 주세요.' : loaded ? `검색 결과 ${results.length}개 · ${all.length}개 확인${hasMore ? ' · 이전 글 더 있음' : ' · 전체 확인 완료'}` : '';
  const list = $('duoPosts'); list.replaceChildren();
  if (loaded && !results.length) list.append(element('p',hasMore ? '현재 불러온 글에는 조건에 맞는 모집글이 없습니다. 이전 글을 더 보거나 전체 글 검색을 이용하세요.' : '조건에 맞는 모집글이 없습니다. 조건을 초기화하거나 직접 모집해 보세요.','board-empty'));
  for (const raw of results) {
    const post = normalize(raw), state = stateOf(post);
    const article = element('article',undefined,`duo-post post-${state}`);
    const heading = element('div',undefined,'post-heading');
    const title = element('h3'); const profile = element('a',post.riotId,'opgg-profile');
    const [name,tag] = post.riotId.split('#');
    profile.href = `https://op.gg/ko/lol/summoners/kr/${encodeURIComponent(name)}-${encodeURIComponent(tag)}`;
    profile.target = '_blank'; profile.rel = 'noopener noreferrer';
    profile.setAttribute('aria-label',`${post.riotId} OP.GG 전적 검색 (새 탭)`); profile.append(element('small','OP.GG ↗')); title.append(profile);
    heading.append(title,element('span',stateLabels[state],'state-badge'));
    article.append(heading,element('p',`${post.mode} · ${post.tier}${post.division ? ' '+post.division : ''} (직접 입력)`,'post-tier'));
    for (const [label,values] of [['주 포지션',post.positions],['원하는 듀오',post.wantedPositions]]) {
      const row = element('div',undefined,'post-positions'); row.append(element('strong',label));
      values.forEach(value => row.append(element('span',value,'position-tag'))); article.append(row);
    }
    article.append(element('p',`마이크 ${post.mic} · ${post.style} · ${post.availability} · ${post.duration}`,'post-preferences'));
    if (post.note) article.append(element('p',post.note,'post-note'));
    const footer = element('div',undefined,'post-footer');
    const time = element('span',`${relativeTime(post.updatedAt)}${state === 'open' ? ` · ${Math.max(1,Math.ceil((millis(post.updatedAt)+TTL-Date.now())/60000))}분 후 만료` : ''}`);
    time.title = new Date(millis(post.updatedAt)).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}); footer.append(time);
    footer.append(button('ID 복사',async () => {
      try { await navigator.clipboard.writeText(post.riotId); $('boardStatus').textContent = 'Riot ID를 복사했습니다.'; }
      catch { $('boardStatus').textContent = `직접 복사해 주세요: ${post.riotId}`; }
    }));
    if (user?.uid === post.id) footer.append(button('내 글 수정',editPost,busy));
    else {
      footer.append(button('신고',() => openReport(post)),button('차단',() => {
        const entries = blocked(); if (!entries.some(entry => entry.id === post.id)) entries.push({id:post.id,riotId:post.riotId});
        save(key('blocked'),entries); render(); $('boardStatus').textContent = '이 작성자의 글을 숨겼습니다. 차단 관리에서 해제할 수 있습니다.';
      }));
    }
    article.append(footer); list.append(article);
  }
}
async function loadPage(reset = false) {
  if (loading || !store) return false;
  loading = true; updateControls();
  if (reset) { posts.clear(); cursor = null; hasMore = true; loaded = false; render(); }
  $('boardStatus').textContent = '모집글을 불러오고 있습니다.';
  try {
    const page = await store.fetchPosts(cursor);
    page.items.forEach(post => posts.set(post.id,post)); cursor = page.cursor; hasMore = page.hasMore; loaded = true;
    // Own post may have changed while this page was in flight.
    if (ownPost) posts.set(ownPost.id,ownPost);
    $('boardStatus').textContent = posts.size ? '최신 등록·끌어올리기 순입니다. 새 글은 새로고침으로 확인하세요.' : '아직 모집글이 없습니다. 첫 듀오를 모집해 보세요.';
    return true;
  } catch (error) { $('boardStatus').textContent = `게시판을 불러오지 못했습니다. ${errorText(error,'조회')}`; return false; }
  finally { loading = false; render(); }
}
$('refreshBoard').addEventListener('click',() => loadPage(true));
$('loadMore').addEventListener('click',() => loadPage());
$('searchAll').addEventListener('click',async () => {
  if (scanning || loading || !store) return;
  scanning = true; updateControls();
  while (scanning && hasMore) { if (!await loadPage()) break; }
  scanning = false; updateControls();
});
$('stopSearch').addEventListener('click',() => { scanning = false; updateControls(); $('boardStatus').textContent = '추가 검색을 중지했습니다. 진행 중인 한 페이지는 표시될 수 있습니다.'; });
async function mutate(method,success,data) {
  if (!user || !store || busy || !ownReady) return;
  const account = user;
  busy = true; render(); message('변경 내용을 저장하고 있습니다.');
  try {
    await store[method](account,data);
    if (user?.uid === account.uid) { if (method === 'removePost') { clear(key('draft')); form.reset(); syncDivision(); } message(success); }
  } catch (error) { if (user?.uid === account.uid) message(errorText(error,'저장')); }
  finally { busy = false; render(); }
}
form.addEventListener('submit',event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  if (!/^[^#\s][^#]*#[^#\s]+$/.test(val('riotId'))) { message('Riot ID를 소환사 이름#태그 형식으로 입력해 주세요.'); $('riotId').focus(); return; }
  saveDraft(); mutate('savePost','모집글을 저장했습니다. 완료·만료된 글은 다시 모집 버튼으로 열 수 있습니다.',profile());
});
function openReport(post) {
  if (!user) { $('boardStatus').textContent = '신고하려면 먼저 로그인해 주세요.'; return; }
  reportTarget = post; $('reportForm').reset(); $('reportTarget').textContent = post.riotId;
  $('reportStatus').textContent = ''; $('reportDialog').showModal();
}
$('closeReport').addEventListener('click',() => $('reportDialog').close());
$('reportDialog').addEventListener('cancel',event => { if (busy) event.preventDefault(); });
$('reportForm').addEventListener('submit',async event => {
  event.preventDefault(); if (!user || busy || !reportTarget) return;
  busy = true; updateControls(); const account = user;
  try { await store.reportPost(account,reportTarget,val('reportReason'),val('reportDetails')); $('reportStatus').textContent = '신고가 접수되었습니다. 운영자가 확인할 수 있습니다.'; }
  catch (error) { $('reportStatus').textContent = errorText(error,'신고'); }
  finally { busy = false; updateControls(); }
});
function renderBlocks() {
  const list = $('blockedList'); list.replaceChildren();
  if (!blocked().length) list.append(element('p','차단한 사용자가 없습니다.'));
  blocked().forEach(entry => {
    const row = element('div',undefined,'blocked-row'); row.append(element('span',entry.riotId),button('차단 해제',() => { save(key('blocked'),blocked().filter(item => item.id !== entry.id)); renderBlocks(); render(); })); list.append(row);
  });
}
$('manageBlocks').addEventListener('click',() => { renderBlocks(); $('blockDialog').showModal(); });
$('closeBlocks').addEventListener('click',() => $('blockDialog').close());
async function connect() {
  if (connecting) return; connecting = true;
  try {
    store = await import('./duo-store.js');
    store.watchUser(current => {
      if (current?.uid === user?.uid && ownReady) return;
      stopOwn?.(); user = current; ownPost = null; ownReady = !current;
      $('reportDialog').close(); $('blockDialog').close();
      form.reset(); setMode('솔로/듀오 랭크'); syncDivision();
      const draft = current ? read(key('draft'),null) : null;
      if (draft) fillProfile(draft);
      $('accountStatus').textContent = user ? '로그인되어 있습니다. 내 모집글을 관리할 수 있습니다.' : '로그인 후 모집글을 등록할 수 있습니다. 조회는 로그인 없이 가능합니다.';
      message(user ? '내 모집글을 확인하고 있습니다.' : '로그인 후 모집글을 등록할 수 있습니다.');
      if (current) {
        let first = true;
        stopOwn = store.watchOwnPost(current,post => {
          if (user?.uid !== current.uid) return;
          ownPost = post; ownReady = true;
          if (post) posts.set(post.id,post);
          else posts.delete(current.uid);
          if (first && !draft && post && post.status !== 'deleted') fillProfile(post);
          if (first) message('프로필을 입력하거나 내 모집글을 수정해 주세요.');
          first = false; render();
        },error => { if (user?.uid === current.uid) { ownReady = false; message(errorText(error,'내 글 확인')); render(); } });
      }
      render();
    });
    await loadPage(true);
  } catch { message('게시판 연결에 실패했습니다. 페이지를 새로고침해 주세요.'); $('boardStatus').textContent = '게시판 모듈을 불러오지 못했습니다.'; }
  finally { connecting = false; render(); }
}
restoreFilters(); syncDivision(); render(); connect();
// Expiry and cooldown labels remain accurate without continuously reading Firestore.
setInterval(() => { if (!document.hidden && !$('reportDialog').open && !$('blockDialog').open && !document.activeElement?.closest('.duo-post, #myPostActions')) render(); },15000);
