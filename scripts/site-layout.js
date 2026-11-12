// Shared site header, navigation, account status and footer. Page content stays in <main>.
(() => {
  const menus = [
    { url: '/', label: '새벽의 요새', description: '타워 디펜스', group: 'games', paths: '<path d="M4 21V7h4V3h8v4h4v14M3 21h18M8 11h1m6 0h1M10 21v-6h4v6"/>' },
    { url: '/arcade/rift-blade.html', label: '균열의 검 RPG', description: '액션 · 성장', group: 'games', paths: '<path d="m4 3 7 7m2 3 7 7M3 3l1 5 12 12 4-4L8 4 3 3Zm0 18 5-5m8-8 5-5m-5 0h5v5M3 16l5 5"/>' },
    { url: '/arcade/space-shooter.html', label: '비행기 슈팅', description: '우주 아케이드', group: 'games', paths: '<path d="m12 3 8 17-8-4-8 4 8-17Zm0 0v13"/>' },
    { url: '/arcade/shadow-sniper.html', label: '윌리 저격', description: '관찰 · 저격', group: 'games', paths: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>' },
    { url: '/exaone/', label: 'EXAONE Agent', description: '로컬 AI 도구', group: 'tools', paths: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4M9 9h6v6H9z"/>' }
  ];
  const menuGroups = [{ id: 'games', label: '게임' }, { id: 'tools', label: 'AI 도구' }];
  const icon = paths => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  const currentPath = location.pathname.replace(/index\.html$/, '');
  const active = href => href === '/' ? currentPath === '/' : href.endsWith('/')
    ? currentPath.startsWith(href) : currentPath === href;
  const base = `
    :host{font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;color:#edf2fa;letter-spacing:normal;box-sizing:border-box;text-align:left}
    *,*::before,*::after{box-sizing:border-box}a{color:inherit;text-decoration:none}button{font:inherit;cursor:pointer}
    [hidden]{display:none!important}a:focus-visible,button:focus-visible{outline:2px solid #a5e9dd;outline-offset:3px}
    a,button{touch-action:manipulation}a:hover,button:hover{color:#b8ffec}
    .wrap{max-width:1220px;margin:0 auto;padding:0 20px}
    @media(max-width:540px){.wrap{padding:0 14px}}
  `;
  let firebasePromise;
  function firebase() {
    return firebasePromise ||= import('/scripts/firebase-client.js');
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${base}
        :host{display:block;position:sticky;top:0;z-index:1000;width:100%;flex-shrink:0;background:#101722f5;border-bottom:1px solid #293448;backdrop-filter:blur(16px);box-shadow:0 8px 30px #0002}
        .wrap{max-width:1280px;padding-left:28px;padding-right:28px}
        .top{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:64px;padding-top:10px;padding-bottom:10px}
        .brand{display:flex;align-items:center;flex-shrink:0;font-size:18px;font-weight:850;letter-spacing:.035em;white-space:nowrap}.brand>span:not(.brand-icon){color:#ffad66}
        .brand-icon{display:grid;place-items:center;margin-right:11px;background:#ffad66;color:#231a14;width:32px;height:34px;border-radius:10px;font-size:23px}
        .brand small{font-size:9px;letter-spacing:.12em;font-weight:500;color:#9bacc5;max-width:100px;line-height:1.6;margin-left:18px;padding-left:18px;border-left:1px solid #354257;white-space:normal}
        .account{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0}.identity{min-width:0;text-align:right}
        #name,#detail{display:block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#name{color:#d2dcee;font-size:12px;font-weight:600}#detail{color:#9bacc5;font-size:11px;margin-top:4px}
        .account a,.account button{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#1b2639;border:1px solid #35455d;border-radius:10px;color:#d9e3f2;min-height:44px;padding:10px 13px;font-size:12px;white-space:nowrap}
        .account a:hover,.account button:hover{background:#2a3950;color:#fff}.account button:disabled{opacity:.6;cursor:wait}.account svg{width:16px;height:16px}
        .menu-bar{position:relative;border-top:1px solid #243045}.menu-toggle,.panel-heading{display:none}
        nav{display:grid;grid-template-columns:minmax(0,4fr) minmax(170px,1fr);gap:20px;padding-top:12px!important;padding-bottom:14px!important}
        .menu-group{min-width:0}.group-heading{display:flex;align-items:center;gap:8px;margin:0 0 8px 4px;color:#aebed4;font-size:11px;font-weight:600;line-height:16px}.group-count{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border:1px solid #35445a;border-radius:5px;color:#9bacc5;font-size:10px;font-variant-numeric:tabular-nums}
        .menu-items{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.menu-group-tools{border-left:1px solid #2b394e;padding-left:20px}.menu-group-tools .menu-items{grid-template-columns:minmax(0,1fr)}.menu-group-tools .menu-icon{background:#1b3537;color:#9edcd1}.menu-group-tools a{background:#15252d;border-color:#29424b}.menu-group-tools a:hover{background:#20363e;border-color:#507b80}
        nav a{position:relative;display:flex;align-items:center;gap:11px;min-width:0;min-height:60px;padding:10px;border:1px solid transparent;border-radius:12px;color:#c2cde0;transition:background .18s,border-color .18s}
        nav a:hover{background:#1c293d;border-color:#3c4e68;color:#fff}nav a[aria-current]{background:linear-gradient(115deg,#382b25,#24232b);border-color:#926341;color:#ffd1a9}
        nav a[aria-current]::after{content:'';position:absolute;top:9px;right:9px;width:5px;height:5px;border-radius:50%;background:#ffad66}
        .menu-icon{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:10px;background:#1e2c41;color:#acbfdc}.menu-icon svg{width:21px;height:21px}nav a[aria-current] .menu-icon{background:#573a29;color:#ffc18b}
        .menu-copy{min-width:0}.menu-title{display:block;font-size:13px;font-weight:700;line-height:1.5;word-break:keep-all}.menu-description{display:block;font-size:11px;color:#a0b1c9;margin-top:3px;line-height:1.4;word-break:keep-all}nav a[aria-current] .menu-description{color:#d5af91}
        .skip{position:absolute;left:-9999px;top:5px;background:#fff;color:#14232b;padding:12px;border-radius:6px;z-index:2}.skip:focus{left:12px}
        a:focus-visible,button:focus-visible{outline-color:#ffca9d}
        @media(max-width:1100px){.brand small{display:none}.identity{max-width:230px}nav{gap:12px;grid-template-columns:minmax(0,4fr) minmax(150px,1fr)}.menu-group-tools{padding-left:12px}nav a{padding:10px 7px;gap:7px}.menu-icon{width:28px;height:30px}.menu-title{font-size:12px}.menu-description{font-size:10px}}
        @media(min-width:761px) and (max-width:900px){nav a{align-items:flex-start;flex-direction:column;gap:6px}.menu-icon{width:26px;height:26px}.menu-icon svg{width:18px;height:18px}.menu-title{font-size:12px}}
        @media(max-width:760px){
          .wrap{padding-left:16px;padding-right:16px}.top{min-height:66px;gap:8px;padding-top:10px;padding-bottom:10px}.brand{font-size:15px}.brand-icon{width:28px;height:30px;margin-right:8px;font-size:21px}.identity{display:none}.account{gap:6px}.account a,.account button{font-size:11px;padding:10px 9px}
          .menu-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;border:0;background:transparent;color:#bac8dd;text-align:left;font-size:12px}.current-label{display:flex;align-items:center;gap:8px;min-width:0;color:#ffd1a9;font-weight:700}.current-dot{width:5px;height:5px;background:#ffad66;border-radius:50%;flex-shrink:0}.toggle-action{display:flex;align-items:center;gap:8px;flex-shrink:0}.chevron{width:16px;height:16px;transition:transform .18s}.menu-toggle[aria-expanded="true"] .chevron{transform:rotate(180deg)}
          .menu-panel{display:none;position:absolute;top:100%;left:0;right:0;max-height:calc(100dvh - 130px);overflow-y:auto;overscroll-behavior:contain;background:#101722;border-bottom:1px solid #445069;box-shadow:0 18px 24px #0006;border-radius:0 0 18px 18px}.menu-panel.is-open{display:block;animation:menu-appear .16s ease-out}.panel-heading{display:flex;justify-content:space-between;align-items:center;padding-top:16px;padding-bottom:12px;font-size:11px;color:#a0b1c9}.panel-heading strong{font-size:11px;font-weight:600;letter-spacing:.08em;color:#d2dcee}
          nav{grid-template-columns:minmax(0,1fr);padding-top:0!important;padding-bottom:16px!important;gap:16px}.menu-items{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.menu-group-tools{border-left:0;border-top:1px solid #2b394e;padding-left:0;padding-top:14px}.group-heading{margin:0 0 10px 0;font-size:12px}nav a{min-height:80px;padding:12px;gap:10px;background:#152033;border-color:#29364b}.menu-icon{width:34px;height:36px}.menu-title{font-size:13px}.menu-description{font-size:11px}.menu-group-tools a{min-height:64px}.menu-group-tools .menu-copy{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px}.menu-group-tools .menu-description{margin-top:0}.menu-toggle:hover{color:#ffd1a9}
        }
        @media(max-width:360px){.wrap{padding-left:12px;padding-right:12px}.brand{font-size:13px}.brand-icon{margin-right:6px}.account a,.account button{padding:10px 7px;font-size:10px}.account svg{display:none}nav a{padding:10px;gap:8px}.menu-title{font-size:12px}.menu-description{font-size:10px}}
        @media(max-width:300px){.top{flex-wrap:wrap}.account{margin-left:auto}.menu-items{grid-template-columns:1fr}.menu-panel{max-height:50dvh}}
        @keyframes menu-appear{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){nav a,.chevron{transition:none}.menu-panel.is-open{animation:none}}
      </style><header>
        <a class="skip" href="#mainContent">본문 바로가기</a>
        <div class="wrap top"><a class="brand" href="/" aria-label="PartyGame 홈"><span class="brand-icon" aria-hidden="true">✦</span>PARTY<span>GAME</span><small>PLAY IN YOUR BROWSER</small></a>
          <div class="account" aria-label="로그인 정보"><div class="identity" role="status" aria-live="polite"><span id="name">로그인 확인 중…</span><span id="detail">계정 상태를 확인하고 있습니다.</span></div>
            <a id="accountLink" href="/account.html">${icon('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>')}<span id="accountLabel">회원 계정</span></a><button id="logout" type="button" hidden>로그아웃</button>
          </div>
        </div>
        <div class="menu-bar">
          <button class="wrap menu-toggle" type="button" aria-expanded="false" aria-controls="menuPanel"><span class="current-label"><span class="current-dot" aria-hidden="true"></span>${menus.find(item => active(item.url))?.label || ({'/account.html':'회원 계정','/contact.html':'문의하기','/privacy.html':'개인정보처리방침','/terms.html':'이용약관','/404.html':'페이지 안내'}[currentPath] || 'PartyGame 둘러보기')}</span><span class="toggle-action"><span class="toggle-text">전체 메뉴</span><svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></button>
          <div id="menuPanel" class="menu-panel">
          <div class="wrap panel-heading"><strong>PARTYGAME 둘러보기</strong><span>원하는 메뉴를 선택하세요</span></div>
          <nav id="primaryMenu" class="wrap" aria-label="주요 메뉴">${menuGroups.map(group => {
            const items = menus.filter(item => item.group === group.id);
            return `<section class="menu-group menu-group-${group.id}" aria-labelledby="${group.id}Label"><h2 class="group-heading" id="${group.id}Label">${group.label}<span class="group-count">${items.length}</span></h2><div class="menu-items">${items.map(({ url, label, description, paths }) => `<a href="${url}"${active(url) ? ' aria-current="page"' : ''}><span class="menu-icon" aria-hidden="true">${icon(paths)}</span><span class="menu-copy"><span class="menu-title">${label}</span><span class="menu-description">${description}</span></span></a>`).join('')}</div></section>`;
          }).join('')}</nav>
          </div>
        </div>
      </header>`;
      const toggle = root.querySelector('.menu-toggle');
      const nav = root.querySelector('nav');
      const panel = root.querySelector('.menu-panel');
      // CSS can hide the focused control before the breakpoint event fires.
      let lastHeaderFocus = null;
      root.addEventListener('focusin', event => { lastHeaderFocus = event.target; });
      this.outsideFocus = event => {
        if (!event.composedPath().includes(this)) lastHeaderFocus = null;
      };
      document.addEventListener('focusin', this.outsideFocus);
      const setMenuOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.toggle-text').textContent = open ? '메뉴 닫기' : '전체 메뉴';
        panel.classList.toggle('is-open', open);
      };
      toggle.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      root.addEventListener('keydown', event => {
        // Shadow DOM retargets controls to SITE-HEADER in document game handlers.
        // Preserve native button/link keys while preventing game shortcuts.
        // Let keyup bubble so games can release keys held before focus moved here.
        event.stopPropagation();
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen(false);
          toggle.focus();
        }
      });
      this.outsideClick = event => {
        if (!event.composedPath().includes(this)) {
          lastHeaderFocus = null;
          setMenuOpen(false);
        }
      };
      document.addEventListener('click', this.outsideClick);
      root.addEventListener('focusout', event => {
        if (!root.contains(event.relatedTarget)) setMenuOpen(false);
      });
      this.menuBreakpoint = matchMedia('(max-width:760px)');
      this.resetMenu = () => {
        const focused = root.activeElement || lastHeaderFocus;
        if (this.menuBreakpoint.matches && focused?.closest('nav')) toggle.focus();
        if (!this.menuBreakpoint.matches && focused === toggle) (nav.querySelector('[aria-current]') || nav.querySelector('a')).focus();
        setMenuOpen(false);
      };
      this.menuBreakpoint.addEventListener('change', this.resetMenu);
      root.querySelector('.skip').addEventListener('click', event => {
        const main = document.getElementById('mainContent');
        if (main) { event.preventDefault(); setMenuOpen(false); main.focus({ preventScroll: true }); main.scrollIntoView(); }
      });
      this.sizeObserver = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--site-header-height', `${this.getBoundingClientRect().height + 12}px`);
      });
      this.sizeObserver.observe(this);
      root.querySelector('#logout').addEventListener('click', async () => {
        const button = root.querySelector('#logout');
        button.disabled = true;
        try { const client = await firebase(); await client.signOut(client.auth); }
        catch { root.querySelector('#detail').textContent = '로그아웃에 실패했습니다. 다시 시도해 주세요.'; }
        finally { button.disabled = false; }
      });
      this.profileChanged = () => firebase().then(client => this.renderUser(client.auth.currentUser)).catch(() => {});
      window.addEventListener('partygame:profile', this.profileChanged);
      // Render navigation immediately, even when the authentication CDN is unavailable.
      this.checkTimer = setTimeout(() => {
        root.querySelector('#detail').textContent = '계정 확인이 지연되고 있습니다. 회원 계정에서 확인하세요.';
      }, 8000);
      firebase().then(async client => {
        await client.authReady;
        if (!this.isConnected) return;
        this.unsubscribe = client.onAuthStateChanged(client.auth, user => {
          clearTimeout(this.checkTimer);
          this.renderUser(user);
        }, () => this.authFailed());
      }).catch(() => this.authFailed());
    }
    renderUser(user) {
      const root = this.shadowRoot;
      const name = root.querySelector('#name');
      const detail = root.querySelector('#detail');
      name.textContent = user ? (user.displayName || 'PartyGame 회원') : '로그아웃 상태';
      detail.textContent = user ? (user.email || '로그인됨') : '로그인하면 게임 기록을 저장할 수 있습니다.';
      name.title = name.textContent;
      detail.title = detail.textContent;
      root.querySelector('#accountLabel').textContent = user ? '내 계정' : '로그인·회원가입';
      root.querySelector('#logout').hidden = !user;
    }
    authFailed() {
      clearTimeout(this.checkTimer);
      this.shadowRoot.querySelector('#name').textContent = '로그인 확인 불가';
      this.shadowRoot.querySelector('#detail').textContent = '회원 계정에서 다시 확인해 주세요.';
    }
    disconnectedCallback() {
      clearTimeout(this.checkTimer);
      this.unsubscribe?.();
      this.sizeObserver?.disconnect();
      document.removeEventListener('click', this.outsideClick);
      document.removeEventListener('focusin', this.outsideFocus);
      this.menuBreakpoint?.removeEventListener('change', this.resetMenu);
      window.removeEventListener('partygame:profile', this.profileChanged);
    }
  }
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>${base}
        :host{display:block;width:100%;margin-top:28px;border-top:1px solid #334254;background:#101925;font-size:12px;color:#a9bdcb}
        footer{padding-top:22px!important;padding-bottom:24px!important}nav{display:flex;gap:12px 22px;flex-wrap:wrap}p{margin:16px 0 0;line-height:1.6}

        :host{margin-top:42px;background:#101722;border-color:#293448;color:#8396b2}footer{display:flex;justify-content:space-between;gap:24px;align-items:center;min-height:100px}nav{gap:10px 20px}nav a{font-size:11px;color:#a5b6cf}nav a:hover{color:#ffbf8a}p{font-size:10px;line-height:1.8;margin:0;max-width:245px;text-align:right}@media(max-width:650px){footer{align-items:start;flex-direction:column;gap:18px;padding-top:24px!important;padding-bottom:24px!important}p{text-align:left;max-width:none}nav{gap:10px 18px}}
      </style><footer class="wrap"><nav aria-label="사이트 안내"><a href="/privacy.html">개인정보처리방침</a><a href="/terms.html">이용약관</a><a href="/contact.html">문의하기</a><a href="/account.html">회원 계정</a><a href="/">새벽의 요새</a><a href="/arcade/shadow-sniper.html">윌리를 찾아서 저격해라</a></nav><p>© ${new Date().getFullYear()} PartyGame. 새벽의 요새 · 무료 타워 디펜스 게임.</p></footer>`;
    }
  }
  customElements.define('site-header', SiteHeader);
  customElements.define('site-footer', SiteFooter);
  const scrollStyle = document.createElement('style');
  scrollStyle.textContent = 'html{scroll-padding-top:var(--site-header-height,130px)}body{margin:0}site-header,site-footer{display:block}';
  document.head.append(scrollStyle);
})();
