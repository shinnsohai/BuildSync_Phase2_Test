/* Admin dashboard shell: sidebar, top bar, tabs, modal host. Feature modules register themselves with
   BS.registerAdmin({ id, nav, stores, tabs, create(ctx) -> instance }) and render only the page body.

   instance: { tab, crumbs(), page(), modal?(), afterRender?(), onClick(act, el, evt) -> bool, onInput?, onChange?,
               onSubmit?, onEscape?() -> bool, onStore?(evt), onTab?(id), reset?() } */
(function (BS) {
  const { html, icon } = BS;
  BS.adminMods = [];
  BS.registerAdmin = (m) => BS.adminMods.push(m);

  // the sidebar in groups; a group with no page the signed-in account may open is left out
  const NAV = [
    ['overview', [['chart', 'a.nav.stats']]],
    ['people', [['users', 'a.nav.people'], ['folder', 'a.nav.projects'], ['brief', 'a.nav.clients'], ['cert', 'a.nav.certs']]],
    ['timepay', [['cal', 'a.nav.att'], ['cal2', 'a.nav.leave'], ['wallet', 'a.nav.pay'], ['receipt', 'a.nav.reimb']]],
    ['site', [['pin', 'a.nav.dep']]],
    ['welfare', [['cap', 'a.nav.train'], ['tag', 'a.nav.wallet'], ['gift', 'a.nav.spin'], ['home', 'a.nav.dorm']]],
    ['engage', [['bell', 'a.nav.notice'], ['clip', 'a.nav.survey'], ['list', 'a.nav.content']]],
    ['system', [['shield', 'a.nav.audit'], ['user', 'a.nav.perm'], ['tag', 'a.nav.tenant'], ['gear', 'a.nav.sys']]],
  ];

  // a module with a manifest puts its own entry in the sidebar, after the entry it names
  BS.modules.navItems().forEach((it) => { const g = NAV.find(([id]) => id === it.group); if (!g) return; const i = g[1].findIndex(([, k]) => k === it.after); g[1].splice(i >= 0 ? i + 1 : g[1].length, 0, [it.icon, it.label]); });

  BS.createAdmin = function (root) {
    const A = { lang: 'zh', mod: 'reimb', collapsed: null, narrow: false, closed: new Set() };
    // which sidebar groups the person folded up is remembered in this browser
    try { JSON.parse(localStorage.getItem('bs_nav_closed') || '[]').forEach((g) => A.closed.add(g)); } catch (e) { /* no storage */ }
    const saveClosed = () => { try { localStorage.setItem('bs_nav_closed', JSON.stringify([...A.closed])); } catch (e) { /* no storage */ } };
    const t = (k, p) => BS.t(A.lang, k, p);
    const toast = (m, k) => BS.toast(root, m, k);
    // toasts and the receipt viewer live on `root`; only the view container is re-rendered
    const view = root.appendChild(document.createElement('div')); view.className = 'a-view';
    const instances = {};
    let afterScroll0 = false;

    const ctx = {
      host: root, t, toast, view: () => view,
      lang: () => A.lang,
      rerender: () => render(),
      /** open another page of the dashboard (when this account may), handing it parameters: how one module sends the user into the next */
      go: (id, params) => { if (!modOf(id) || !BS.perm.canPage(id)) return false; const prev = instances[A.mod]; if (prev && prev.onEscape) prev.onEscape(); A.mod = id; const i = inst(id); if (i.onGo) i.onGo(params || {}); render(); return true; },
      scrollTop0: () => { afterScroll0 = true; const pg = view.querySelector('.a-page'); if (pg) pg.scrollTop = 0; },
    };
    function modOf(id) { return BS.adminMods.find((m) => m.id === id); }
    /** a module's tabs may depend on who is signed in (an external party sees fewer) */
    function tabsOf(m) { return typeof m.tabs === 'function' ? m.tabs() : m.tabs; }
    function inst(id) { const m = modOf(id); if (!instances[id]) instances[id] = m.create(ctx); return instances[id]; }

    /** the signed-in administrator (prototype stand-in for a login) and the menu to switch to another account */
    function userBlock() {
      const P = BS.perm; const cur = P.current(); const nm = (a) => (A.lang === 'zh' ? a.name : a.nameEn || a.name); const rn = (a) => { const r = P.role(a && a.roleId); return r ? (A.lang === 'zh' ? r.name : r.nameEn || r.name) : t('pm.noRole'); };
      return html`<button type="button" class="a-user a-user-btn" data-act="user-menu" aria-haspopup="menu" aria-expanded="${A.userMenu ? 'true' : 'false'}"><span class="a-av">${cur ? nm(cur).slice(0, 1) : t('a.userShort')}</span><div><b>${cur ? nm(cur) : t('a.user')}</b><small>${cur ? rn(cur) : t('a.role')}</small></div></button>`;
    }
    /** a reminder on pages whose lists are cut down to the signed-in role's data scope */
    function scopeBar() {
      const P = BS.perm; if (!P.SCOPED.includes(A.mod) || !P.scopeActive() || P.party() !== 'employer') return '';
      const sc = P.scope(); const nm = (o) => (A.lang === 'zh' ? o.zh : o.en || o.zh); let s;
      if (sc.kind === 'projects') s = `${t('pm.scope.projects')} · ${sc.projects.map((k) => { const p = BS.hr.project(k); return p ? nm(p) : k; }).join('、')}`;
      else if (sc.kind === 'company') { const c = P.companyOf(P.current()); s = c ? t('pm.scopebar.company', { c: A.lang === 'zh' ? c.name : c.nameEn || c.name }) : t('pm.scopebar.nocompany'); }
      else s = t('pm.scopebar.self');
      return html`<p class="a-scopebar" role="note">${icon('shield', 14)} ${t('pm.scopebar', { s })}</p>`;
    }
    /** the account list opens beside the sidebar (not inside it, which may be collapsed to icons) */
    function userMenu() {
      if (!A.userMenu) return '';
      const P = BS.perm; const cur = P.current(); const nm = (a) => (A.lang === 'zh' ? a.name : a.nameEn || a.name); const rn = (a) => { const r = P.role(a.roleId); return r ? (A.lang === 'zh' ? r.name : r.nameEn || r.name) : t('pm.noRole'); };
      return html`<div class="a-user-menu" role="menu"><h4>${t('pm.user.menu')}</h4>${P.accounts().filter((a) => P.roleOf(a)).map((a) => html`<button type="button" role="menuitem" class="${cur && a.id === cur.id ? 'on' : ''}" data-act="user-as" data-id="${a.id}"><span>${nm(a)}</span><small>${rn(a)}</small></button>`)}</div>`;
    }
    function render() {
      // the signed-in administrator may have lost the page that was open: move to the first page they can still use
      if (!BS.perm.canPage(A.mod)) { const first = BS.adminMods.find((x) => BS.perm.canPage(x.id)); if (first) A.mod = first.id; }
      const m = modOf(A.mod), i = inst(A.mod); const allowed = BS.perm.canPage(A.mod);
      const keep = view.querySelector('.a-page'); const sc = keep && !afterScroll0 ? keep.scrollTop : 0; afterScroll0 = false;
      const crumbs = i.crumbs();
      view.innerHTML = html`
      <div class="a-app ${(A.collapsed ?? A.narrow) ? 'collapsed' : ''}">
        <aside class="a-side">
          <div class="a-brand"><span class="a-logo">${icon('users', 18)}</span><div><b>BuiltSync</b><small>WORKFORCE OS</small></div></div>
          <nav class="a-nav" aria-label="Main">${NAV.map(([g, items]) => [g, items.filter(([, k]) => BS.perm.canPage(BS.perm.NAV_TO_PAGE[k]))]).filter(([, items]) => items.length).map(([g, items]) => html`<div class="a-nav-g ${A.closed.has(g) ? 'closed' : ''}" role="group" aria-label="${t('a.nav.g.' + g)}"><div class="a-nav-h" role="button" tabindex="0" data-act="nav-group" data-g="${g}" aria-expanded="${A.closed.has(g) ? 'false' : 'true'}">${icon('right', 12)}<span>${t('a.nav.g.' + g)}</span></div>${items.map(([ic, k]) => { const live = BS.adminMods.find((x) => x.nav === k); return html`<button type="button" class="${k === m.nav ? 'on' : ''} ${live ? 'live' : ''}" data-act="${live ? 'nav' : 'inert'}" data-m="${live ? live.id : ''}" title="${t(k)}">${icon(ic, 18)}<span>${t(k)}</span></button>`; })}</div>`)}</nav>
          <div class="a-side-foot"><button type="button" class="a-collapse" data-act="collapse">${icon('menu', 16)}<span>${t('a.collapse')}</span></button>
            ${userBlock()}</div>
        </aside>
        ${userMenu()}
        <div class="a-main">
          <header class="a-top"><nav class="a-crumb" aria-label="Breadcrumb"><span>${t('a.crumb.root')}</span>${crumbs.map((c, n) => html`<i>/</i>${n === crumbs.length - 1 ? html`<b>${c.text}</b>` : c.act ? html`<button type="button" data-act="${c.act}">${c.text}</button>` : html`<span>${c.text}</span>`}`)}</nav>
            <div class="a-lang" role="group" aria-label="Language">${icon('globe', 16)}<button type="button" class="${A.lang === 'zh' ? 'on' : ''}" data-act="lang" data-l="zh">中文</button><i>|</i><button type="button" class="${A.lang === 'en' ? 'on' : ''}" data-act="lang" data-l="en">EN</button></div></header>
          <div class="a-tabs" role="tablist">${tabsOf(m).map((tb) => html`<button type="button" role="tab" aria-selected="${i.tab === tb.id ? 'true' : 'false'}" class="${i.tab === tb.id ? 'on' : ''} ${tb.live === false ? 'dim' : ''}" data-act="tab" data-id="${tb.id}">${t(tb.k)}</button>`)}</div>
          <main class="a-page">${allowed ? scopeBar() : ''}${allowed ? i.page() : html`<div class="a-noaccess"><p>${t('pm.noAccess')}</p></div>`}</main>
        </div>
        ${allowed && i.modal ? i.modal() : ''}
      </div>`.s;
      const pg = view.querySelector('.a-page'); if (pg) pg.scrollTop = sc;
      if (i.afterRender) i.afterRender(view);
      // a dialog that is open keeps the keyboard: Escape closes it only while focus is inside the dashboard, and a re-render drops the focused button
      const dlg = view.querySelector('.a-modal'); if (dlg && !dlg.contains(document.activeElement)) { dlg.setAttribute('tabindex', '-1'); dlg.focus({ preventScroll: true }); }
    }

    // ---------- events ----------
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
      if (b.classList.contains('a-scrim') && e.target.closest('[data-stop]')) return; // click inside a dialog body
      const a = b.dataset.act;
      if (A.userMenu && a !== 'user-menu' && a !== 'user-as') { A.userMenu = false; if (a === 'inert') render(); }
      switch (a) {
        case 'user-menu': A.userMenu = !A.userMenu; render(); return;
        case 'user-as': { A.userMenu = false; const r = BS.perm.signInAs(b.dataset.id); if (r.ok) { const x = BS.perm.account(b.dataset.id); toast(t('pm.toast.as', { n: A.lang === 'zh' ? x.name : x.nameEn || x.name }), 'ok'); } else render(); return; }
        case 'inert': toast(t('a.toast.inert')); return;
        case 'collapse': A.collapsed = !(A.collapsed ?? A.narrow); render(); return;
        case 'lang': A.lang = b.dataset.l; render(); return;
        case 'nav-group': { const g = b.dataset.g; if (A.closed.has(g)) A.closed.delete(g); else A.closed.add(g); saveClosed(); render(); return; }
        case 'nav': if (A.mod !== b.dataset.m) { const prev = instances[A.mod]; if (prev && prev.onEscape) prev.onEscape(); A.mod = b.dataset.m; const grp = NAV.find(([, its]) => its.some(([, k]) => { const x = BS.adminMods.find((y) => y.nav === k); return x && x.id === A.mod; })); if (grp && A.closed.delete(grp[0])) saveClosed(); render(); } return;
        case 'tab': {
          const tb = tabsOf(modOf(A.mod)).find((x) => x.id === b.dataset.id); const i = inst(A.mod);
          if (tb.live === false) { toast(t('a.toast.tab')); return; }
          if (i.tab !== tb.id) { i.tab = tb.id; if (i.onTab) i.onTab(tb.id); render(); }
          return;
        }
      }
      if (!BS.perm.guard(A.mod, a)) { toast(t('pm.noOp'), 'warn'); return; } // the role may open this page but not do this operation
      inst(A.mod).onClick(a, b, e);
    });
    root.addEventListener('keydown', (e) => { const h = e.target.closest && e.target.closest('.a-nav-h'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); h.click(); } });
    root.addEventListener('input', (e) => { const i = inst(A.mod); if (i.onInput) i.onInput(e); });
    root.addEventListener('change', (e) => { const i = inst(A.mod); if (i.onChange) i.onChange(e); });
    root.addEventListener('submit', (e) => { e.preventDefault(); const i = inst(A.mod); if (i.onSubmit) i.onSubmit(e); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !root.contains(document.activeElement) || root.querySelector('.lightbox')) return;
      const i = inst(A.mod); if (i.onEscape) i.onEscape();
    });

    BS.adminMods.forEach((m) => (m.stores || []).forEach((s) => s.subscribe((evt) => {
      if (A.mod !== m.id) return;
      const i = inst(m.id); if (i.onStore) i.onStore(evt); else render();
    })));

    BS.perm.subscribe(() => render());
    // a tenant's module entitlements decide which pages exist; repaint when they change even if the open page does not watch the tenant store
    BS.tenant.subscribe(() => { if (!(modOf(A.mod).stores || []).includes(BS.tenant)) render(); });

    // auto-collapse the sidebar when the pane is narrow (e.g. side-by-side on a laptop)
    if (window.ResizeObserver) new ResizeObserver(() => { const n = root.clientWidth < 1100; if (n !== A.narrow) { A.narrow = n; render(); } }).observe(root);

    render();
    return {
      setLang(l) { A.lang = l; render(); }, get lang() { return A.lang; },
      reset() { Object.values(instances).forEach((i) => i.reset && i.reset()); A.mod = 'reimb'; render(); },
      toast,
    };
  };
})(window.BS);
