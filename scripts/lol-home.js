(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('partyForm');
  const status = byId('partyStatus');
  const boardStatus = byId('boardStatus');
  const publish = byId('publishParty');
  const cards = [...document.querySelectorAll('[data-mode]')];
  let mode = cards[0].dataset.mode;
  let user = null, store, stopPosts;
  let posts = [], busy = false, connecting = false;
  const boxes = name => [...form.querySelectorAll(`input[name="${name}"]`)];
  const selection = name => boxes(name).filter(box => box.checked).map(box => box.value);
  const value = id => byId(id).value.trim();
  function updateButton() { publish.disabled = !store || !user || busy; }
  for (const name of ['positions', 'wantedPositions']) {
    boxes(name).forEach(box => box.addEventListener('change', () => {
      const group = boxes(name);
      if (box.checked) {
        if (box.value === '상관없음') group.forEach(other => { other.checked = other === box; });
        else group[0].checked = false;
      }
      if (!group.some(other => other.checked)) group[0].checked = true;
    }));
  }
  cards.forEach(card => card.addEventListener('click', () => {
    mode = card.dataset.mode;
    cards.forEach(item => {
      item.classList.toggle('selected', item === card);
      item.setAttribute('aria-pressed', String(item === card));
    });
    byId('chosenMode').textContent = mode;
  }));
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function render() {
    const list = byId('duoPosts');
    list.replaceChildren();
    posts.forEach(post => {
      const article = element('article', undefined, 'duo-post');
      const heading = element('div', undefined, 'post-heading');
      heading.append(element('h3', post.riotId), element('span', post.mode, 'post-mode'));
      article.append(heading, element('p', `티어 · ${post.tier}`, 'post-tier'));
      for (const [label, positions] of [['주 포지션', post.positions], ['원하는 듀오', post.wantedPositions]]) {
        const row = element('div', undefined, 'post-positions');
        row.append(element('strong', label));
        positions.forEach(position => row.append(element('span', position, 'position-tag')));
        article.append(row);
      }
      if (post.note) article.append(element('p', post.note, 'post-note'));
      const date = post.updatedAt?.toDate();
      const footer = element('div', undefined, 'post-footer');
      footer.append(element('span', date ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(date) : '저장 확인 중'));
      const copy = element('button', 'ID 복사', 'button secondary');
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(post.riotId); boardStatus.textContent = 'Riot ID를 복사했습니다.'; }
        catch { boardStatus.textContent = `자동 복사를 사용할 수 없습니다. ID를 직접 복사해 주세요: ${post.riotId}`; }
      });
      footer.append(copy);
      if (user?.uid === post.id) {
        const remove = element('button', '모집글 삭제', 'button secondary');
        remove.type = 'button'; remove.disabled = busy;
        remove.addEventListener('click', async () => {
          if (busy || !user) return;
          busy = true; updateButton(); render();
          status.textContent = '모집글을 삭제하고 있습니다.';
          try { await store.removePost(user); status.textContent = '모집글을 삭제했습니다.'; }
          catch { status.textContent = '삭제하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.'; }
          finally { busy = false; updateButton(); render(); }
        });
        footer.append(remove);
      }
      article.append(footer); list.append(article);
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!user || !store || busy || !form.reportValidity()) return;
    if (!/^[^#\s][^#]*#[^#\s]+$/.test(value('riotId'))) {
      status.textContent = 'Riot ID를 소환사 이름#태그 형식으로 입력해 주세요.';
      byId('riotId').focus(); return;
    }
    const data = { riotId: value('riotId'), tier: value('tier'), positions: selection('positions'), wantedPositions: selection('wantedPositions'), mode, note: value('partyNote') };
    busy = true; updateButton(); render();
    status.textContent = '모집글을 저장하고 있습니다. 연결이 느리면 잠시 기다려 주세요.';
    try { await store.savePost(user, data); status.textContent = '모집글을 등록했습니다. 기존 글이 있으면 새 내용으로 갱신됩니다.'; }
    catch { status.textContent = '등록하지 못했습니다. 로그인·네트워크와 게시판 권한을 확인한 뒤 다시 시도해 주세요.'; }
    finally { busy = false; updateButton(); render(); }
  });
  function subscribe() {
    stopPosts?.();
    boardStatus.textContent = '모집글을 불러오고 있습니다.';
    stopPosts = store.watchPosts((items, metadata) => {
      posts = items; render();
      boardStatus.textContent = metadata.hasPendingWrites ? '변경 내용을 서버에 저장하고 있습니다.'
        : metadata.fromCache ? '서버 연결을 확인하고 있습니다. 표시된 내용이 최신이 아닐 수 있습니다.'
        : posts.length ? `최근 모집글 ${posts.length}개 · 최신 갱신순 (최대 50개)` : '아직 모집글이 없습니다. 첫 듀오를 모집해 보세요.';
    }, () => {
      posts = []; render();
      boardStatus.textContent = '게시판을 불러오지 못했습니다. 네트워크 또는 게시판 권한을 확인하고 새로고침해 주세요.';
    });
  }
  async function connect() {
    if (connecting) return;
    connecting = true;
    try {
      store = await import('./duo-store.js');
      store.watchUser(current => {
        user = current; updateButton(); render();
        byId('accountStatus').textContent = user ? '로그인되어 있습니다. 내 모집글을 등록·갱신·삭제할 수 있습니다.' : '모집글을 등록하려면 로그인해 주세요. 글은 로그인 없이 볼 수 있습니다.';
        if (!busy) status.textContent = user ? '프로필을 입력하고 모집글을 등록해 주세요.' : '로그인 후 모집글을 등록할 수 있습니다.';
      });
      subscribe();
    } catch {
      store = null; updateButton();
      status.textContent = '게시판 연결에 실패했습니다. 네트워크를 확인하고 새로고침해 주세요.';
      boardStatus.textContent = '모집글을 불러올 수 없습니다.';
      byId('accountStatus').textContent = '로그인 상태를 확인할 수 없습니다.';
    } finally { connecting = false; }
  }
  byId('refreshBoard').addEventListener('click', () => store ? subscribe() : connect());
  connect();
})();
