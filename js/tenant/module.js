/* Admin modules: 租户管理 (tenant list + subscription records) and 数据统计 → 人员开通统计. */
(function (BS) {
  const { html, icon, fmt } = BS;
  const tn = BS.tenant;

  // ---------- 租户管理 wrapper ----------
  BS.registerAdmin({
    id: 'tenant', nav: 'a.nav.tenant', stores: [tn],
    tabs: [{ id: 'tenants', k: 't.tab.tenants' }, { id: 'subs', k: 't.tab.subs' }],
    create(ctx) {
      const parts = { tenants: BS.tenantParts.tenants(ctx), subs: BS.tenantParts.subs(ctx) };
      let tab = 'tenants'; const cur = () => parts[tab];
      return {
        get tab() { return tab; },
        set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v),
        onInput: (e) => cur().onInput && cur().onInput(e), onChange: (e) => cur().onChange && cur().onChange(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: () => ctx.rerender(), onClick: (a, b, e) => cur().onClick(a, b, e),
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'tenants'; },
      };
    },
  });

  // ---------- 数据统计 → 人员开通统计 ----------
  const PAGE = 10;
  const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`; };
  BS.registerAdmin({
    id: 'stats', nav: 'a.nav.stats', stores: [tn],
    tabs: [{ id: 'basic', k: 't.st.basic', live: false }, { id: 'prov', k: 't.st.prov' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender;
      const thisMonth = () => BS.fmt.now().slice(0, 7);
      const D0 = () => ({ month: thisMonth(), tenant: '' });
      const V = { draft: D0(), applied: D0(), q: { kw: '', from: '', to: '' }, qa: { kw: '', from: '', to: '' }, page: 1, modal: null };
      const lang = () => ctx.lang();
      const tag = (s) => html`<span class="a-tag ${s === 'active' ? 'approved' : 'withdrawn'}">${t('t.st.' + s)}</span>`;

      function scope() {
        const a = V.applied; const start = `${a.month}-01`, end = monthEnd(a.month);
        const us = tn.users().filter((u) => !a.tenant || u.tenantId === a.tenant);
        const provisioned = us.filter((u) => u.opened <= end);
        return {
          start, end, us, provisioned,
          total: provisioned.length,
          valid: provisioned.filter((u) => u.status === 'active' || (u.disabled && u.disabled > end)).length,
          added: us.filter((u) => u.opened >= start && u.opened <= end).length,
          off: us.filter((u) => u.disabled && u.disabled >= start && u.disabled <= end).length,
        };
      }
      function rows(sc) {
        const q = V.qa; const kw = q.kw.trim().toLowerCase();
        return sc.provisioned.filter((u) => (!kw || u.name.toLowerCase().includes(kw) || u.nameEn.toLowerCase().includes(kw) || u.account.toLowerCase().includes(kw)) && (!q.from || u.opened >= q.from) && (!q.to || u.opened <= q.to))
          .sort((a, b) => b.opened.localeCompare(a.opened) || a.account.localeCompare(b.account));
      }
      const uName = (u) => (lang() === 'zh' ? u.name : u.nameEn);

      function page() {
        const sc = scope(); const all = rows(sc); const pages = Math.max(1, Math.ceil(all.length / PAGE)); if (V.page > pages) V.page = pages;
        const slice = all.slice((V.page - 1) * PAGE, V.page * PAGE); const d = V.draft; const a = V.applied;
        const tname = a.tenant ? tn.tenant(a.tenant).name : t('t.st.allTenants');
        const card = (k, v, sub, cls) => html`<div class="st-card ${cls}"><small>${t('t.st.' + k)}</small><b>${t('t.people', { n: v })}</b><span>${t('t.st.' + k + 'Sub', { m: a.month.replace('-', ' / ') })}</span></div>`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('t.st.title')}</h1><p class="a-sub">${t('t.st.sub')}</p></div></div>
          <section class="a-card">
            <form class="a-filters" data-form="scope" autocomplete="off">
              <label class="a-in"><span class="a-in-l">${t('t.st.range')}</span><input type="month" data-s="month" value="${d.month}" max="${thisMonth()}" aria-label="${t('t.st.range')}"></label>
              <label class="a-in"><select data-s="tenant" aria-label="${t('t.st.tenant')}"><option value="">${t('t.st.allTenants')}</option>${tn.tenants().map((x) => html`<option value="${x.id}" ${d.tenant === x.id ? 'selected' : ''}>${x.name}</option>`)}</select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="st-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
            </form>
            <p class="cal-hint">${t('t.st.scope', { t: tname, a: sc.start, b: sc.end })}</p>
            <div class="st-cards">${card('total', sc.total)}${card('valid', sc.valid)}${card('added', sc.added, '', 'add')}${card('off', sc.off, '', 'off')}</div>
          </section>
          <section class="a-card">
            <div class="a-bulk"><div><h2 class="a-h2" style="margin:0">${t('t.st.detail')}</h2><small class="a-fhint">${t('t.st.detailSub')}</small></div></div>
            <form class="a-filters" data-form="detail" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-q="kw" value="${V.q.kw}" placeholder="${t('t.st.kw')}" aria-label="${t('t.st.kw')}"></label>
              <span class="a-in a-range"><input type="date" data-q="from" value="${V.q.from}" aria-label="${t('t.st.opened')}"><i>–</i><input type="date" data-q="to" value="${V.q.to}" aria-label="${t('t.st.opened')}"></span>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="st-q-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
            </form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['name', 'account', 'opened', 'status', 'disabled'].map((c) => html`<th>${t('t.st.col.' + c)}</th>`)}${a.tenant ? '' : html`<th>${t('t.st.tenant')}</th>`}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((u) => html`<tr><td><b>${uName(u)}</b></td><td class="mute">${u.account}</td><td>${u.opened}</td><td>${tag(u.status)}</td><td class="mute">${u.disabled || '—'}</td>${a.tenant ? '' : html`<td class="mute">${tn.tenant(u.tenantId).name}</td>`}<td class="c-act"><button type="button" class="a-link" data-act="st-view" data-acct="${u.account}">${t('t.s.view')}</button></td></tr>`)
                : html`<tr><td colspan="7" class="a-none">${icon('users', 32)}<p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('t.st.shown', { a: slice.length, b: all.length })}</span>
              <nav aria-label="${t('a.pager')}"><button type="button" data-act="st-page" data-p="${V.page - 1}" ${V.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
              ${pageList(V.page, pages).map((p) => (p === '…' ? html`<span class="st-gap">…</span>` : html`<button type="button" class="${V.page === p ? 'on' : ''}" data-act="st-page" data-p="${p}" aria-current="${V.page === p ? 'page' : 'false'}">${p}</button>`))}
              <button type="button" data-act="st-page" data-p="${V.page + 1}" ${V.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
          </section>`;
      }
      function pageList(cur, n) {
        if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
        const s = new Set([1, 2, cur - 1, cur, cur + 1, n - 1, n]); const out = []; let prev = 0;
        [...s].filter((p) => p >= 1 && p <= n).sort((a, b) => a - b).forEach((p) => { if (p - prev > 1) out.push('…'); out.push(p); prev = p; }); return out;
      }
      function modal() {
        const M = V.modal; if (!M) return ''; const u = tn.users().find((x) => x.account === M.account); if (!u) return '';
        const x = tn.tenant(u.tenantId);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${uName(u)}</h2><p>${u.account}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody"><dl class="a-sum"><div><dt>${t('t.st.tenant')}</dt><dd>${x.name}</dd></div><div><dt>${t('t.st.col.status')}</dt><dd>${tag(u.status)}</dd></div><div><dt>${t('t.st.col.opened')}</dt><dd>${u.opened}</dd></div><div><dt>${t('t.st.col.disabled')}</dt><dd>${u.disabled || '—'}</dd></div></dl></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('l.log.close')}</button></footer></div></div>`;
      }

      return {
        tab: 'prov',
        crumbs() { return [{ text: t('a.nav.stats'), act: 'noop' }, { text: t('t.st.prov') }]; },
        page, modal,
        onInput(e) { const el = e.target; if (el.dataset.s) V.draft[el.dataset.s] = el.value; else if (el.dataset.q) V.q[el.dataset.q] = el.value; },
        onSubmit(e) {
          if (e.target.dataset.form === 'scope') { if (!/^\d{4}-\d{2}$/.test(V.draft.month)) V.draft.month = thisMonth(); V.applied = { ...V.draft }; V.page = 1; } else { V.qa = { ...V.q }; V.page = 1; }
          render();
        },
        onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'st-reset': V.draft = D0(); V.applied = D0(); V.page = 1; render(); break;
            case 'st-q-reset': V.q = { kw: '', from: '', to: '' }; V.qa = { ...V.q }; V.page = 1; render(); break;
            case 'st-page': { const p = +b.dataset.p; if (p >= 1) { V.page = p; render(); } break; }
            case 'st-view': V.modal = { account: b.dataset.acct }; render(); break;
            case 'close-modal': V.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { V.draft = D0(); V.applied = D0(); V.q = { kw: '', from: '', to: '' }; V.qa = { ...V.q }; V.page = 1; V.modal = null; },
      };
    },
  });
})(window.BS);
