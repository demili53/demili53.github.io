// Shared site header, navigation, account status and footer. Page content stays in <main>.
(() => {
  const menus = [['/', '디펜스 게임'], ['/arcade/space-shooter.html', '옵션 · 비행기 게임']];
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
        :host{display:block;position:sticky;top:0;z-index:1000;width:100%;flex-shrink:0;background:#101925;border-bottom:1px solid #334254;box-shadow:0 5px 24px #0003}
        .top{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;padding-top:10px;padding-bottom:10px}
        .brand{font-size:19px;font-weight:850;letter-spacing:.04em;white-space:nowrap}.brand span{color:#95e2cf}
        .account{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:0;font-size:13px}.identity{min-width:0;text-align:right}
        #name{display:block;font-weight:700;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        #detail{display:block;color:#a9bdcb;font-size:11px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}
        .account a,.account button{border:1px solid #4a6570;background:#192c34;border-radius:8px;padding:8px 11px;color:#deeee9;white-space:nowrap;font-size:12px;min-height:36px}
        nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:thin;padding-top:2px;padding-bottom:8px;overscroll-behavior-x:contain}
        nav a{display:block;flex-shrink:0;min-height:40px;padding:11px 12px;border-radius:7px;font-size:13px;line-height:18px;white-space:nowrap}
        nav a:hover{background:#213039}nav a[aria-current]{background:#23443f;color:#bdffeb;font-weight:750}
        .skip{position:absolute;left:-9999px;top:5px;background:#fff;color:#14232b;padding:12px;border-radius:6px;z-index:1}.skip:focus{left:12px}
        @media(max-width:540px){.top{gap:8px;min-height:70px}.brand{font-size:15px}.account{gap:6px;font-size:12px}.account a,.account button{padding:7px 8px}.identity{max-width:40vw}#name,#detail{max-width:100%}#logout{font-size:11px}nav a{padding:10px;font-size:12px}}
        @media(max-width:380px){.top{flex-wrap:wrap}.account{width:100%;justify-content:space-between}.identity{max-width:55vw;text-align:left}}
      </style><header>
        <a class="skip" href="#mainContent">본문 바로가기</a>
        <div class="wrap top"><a class="brand" href="/">PARTY<span>GAME</span></a>
          <div class="account" aria-label="로그인 정보"><div class="identity" role="status" aria-live="polite"><span id="name">로그인 확인 중…</span><span id="detail">계정 상태를 확인하고 있습니다.</span></div>
            <a id="accountLink" href="/account.html">회원 계정</a><button id="logout" type="button" hidden>로그아웃</button>
          </div>
        </div>
        <nav class="wrap" aria-label="주요 메뉴">${menus.map(([url, label]) => `<a href="${url}"${active(url) ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
      </header>`;
      root.querySelector('.skip').addEventListener('click', event => {
        const main = document.getElementById('mainContent');
        if (main) { event.preventDefault(); main.focus({ preventScroll: true }); main.scrollIntoView(); }
      });
      this.sizeObserver = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--site-header-height', `${this.getBoundingClientRect().height + 12}px`);
        const nav = root.querySelector('nav');
        const selected = nav.querySelector('[aria-current]');
        if (selected) nav.scrollLeft = selected.offsetLeft - nav.offsetLeft - (nav.clientWidth - selected.offsetWidth) / 2;
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
      root.querySelector('#accountLink').textContent = user ? '내 계정' : '로그인·회원가입';
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
      window.removeEventListener('partygame:profile', this.profileChanged);
    }
  }
  class SiteFooter extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>${base}
        :host{display:block;width:100%;margin-top:28px;border-top:1px solid #334254;background:#101925;font-size:12px;color:#a9bdcb}
        footer{padding-top:22px!important;padding-bottom:24px!important}nav{display:flex;gap:12px 22px;flex-wrap:wrap}p{margin:16px 0 0;line-height:1.6}
      </style><footer class="wrap"><nav aria-label="사이트 안내"><a href="/privacy.html">개인정보처리방침</a><a href="/terms.html">이용약관</a><a href="/contact.html">문의하기</a><a href="/account.html">회원 계정</a><a href="/">새벽의 요새</a></nav><p>© ${new Date().getFullYear()} PartyGame. 새벽의 요새 · 무료 타워 디펜스 게임.</p></footer>`;
    }
  }
  customElements.define('site-header', SiteHeader);
  customElements.define('site-footer', SiteFooter);
  const scrollStyle = document.createElement('style');
  scrollStyle.textContent = 'html{scroll-padding-top:var(--site-header-height,130px)}body{margin:0}site-header,site-footer{display:block}';
  document.head.append(scrollStyle);
})();
