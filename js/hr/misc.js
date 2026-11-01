/* Admin: 人员管理 → 工种字典, 项目人员分布 + the module wrapper. */
(function (BS) {
  const { html, icon, fmt } = BS;
  const hr = BS.hr;
  BS.hrParts = BS.hrParts || {};

  // ---------------- 工种字典 ----------------
  BS.hrParts.trades = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const T = { draft: { kw: '', code: '', status: '' }, applied: { kw: '', code: '', status: '' }, page: 1, modal: null };
    const rows = () => { const f = T.applied, kw = f.kw.trim().toLowerCase(), c = f.code.trim().toLowerCase();
      return hr.trades().filter((x) => (!kw || x.zh.toLowerCase().includes(kw) || x.en.toLowerCase().includes(kw)) && (!c || x.code.toLowerCase().includes(c)) && (!f.status || (f.status === 'on') === x.active)); };
    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 10)); if (T.page > pages) T.page = pages; const slice = all.slice((T.page - 1) * 10, T.page * 10); const d = T.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('hr.tr.title')}</h1><p class="a-sub">${t('hr.tr.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn primary" data-act="tr-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('hr.tr.name')}" aria-label="${t('hr.tr.name')}"></label>
            <label class="a-in"><input data-f="code" value="${d.code}" placeholder="${t('hr.tr.code')}" aria-label="${t('hr.tr.code')}"></label>
            <label class="a-in"><select data-f="status" aria-label="${t('hr.col.status')}"><option value="">${t('hr.col.status')}</option><option value="on" ${d.status === 'on' ? 'selected' : ''}>${t('p.on')}</option><option value="off" ${d.status === 'off' ? 'selected' : ''}>${t('p.off')}</option></select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="tr-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table"><thead><tr>${['name', 'code', 'count', 'status', 'upd'].map((c) => html`<th>${t('hr.tr.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((x) => html`<tr><td><b>${lang() === 'zh' ? x.zh : x.en}</b><small class="hr-sub">${lang() === 'zh' ? x.en : x.zh}</small></td><td class="mute">${x.code}</td><td>${hr.tradeCount(x.code)}</td><td><span class="a-tag ${x.active ? 'approved' : 'withdrawn'}">${x.active ? t('p.on') : t('p.off')}</span></td><td class="mute">${x.updatedAt}</td><td class="c-act"><button type="button" class="a-link" data-act="tr-edit" data-c="${x.code}">${t('p.edit')}</button></td></tr>`)
              : html`<tr><td colspan="6" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('hr.total', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${T.page === i + 1 ? 'on' : ''}" data-act="tr-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
    }
    function modal() {
      const M = T.modal; const F = M.f; const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('hr.e.' + M.errs[k])}</small>` : '');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${M.code ? t('hr.tr.edit') : t('hr.tr.add')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><div class="p-two"><div class="a-frow"><label class="a-lab" for="tr-z"><b class="req">*</b> ${t('hr.tr.zh')}</label><input id="tr-z" class="a-field" data-t="zh" value="${F.zh}" maxlength="20">${E('zh')}</div>
            <div class="a-frow"><label class="a-lab" for="tr-e"><b class="req">*</b> ${t('hr.tr.en')}</label><input id="tr-e" class="a-field" data-t="en" value="${F.en}" maxlength="40">${E('en')}</div></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="tr-c"><b class="req">*</b> ${t('hr.tr.code')}</label><input id="tr-c" class="a-field" data-t="code" value="${F.code}" maxlength="20" placeholder="REBAR">${E('code')}</div>
            <div class="a-frow"><label class="a-lab" for="tr-s">${t('hr.col.status')}</label><select id="tr-s" class="a-field" data-t="active"><option value="1" ${F.active ? 'selected' : ''}>${t('p.on')}</option><option value="0" ${F.active ? '' : 'selected'}>${t('p.off')}</option></select></div></div>
          <div class="a-frow"><label class="a-lab" for="tr-n">${t('hr.f.note')}</label><textarea id="tr-n" class="a-field" data-t="note" rows="2" maxlength="100">${F.note}</textarea>${E('note')}</div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="tr-save">${t('p.m.save')}</button></footer></div></div>`;
    }
    return {
      tab: 'trades', crumbs() { return [{ text: t('a.nav.people'), act: 'noop' }, { text: t('hr.tab.trades') }]; }, page, modal() { return T.modal ? modal() : ''; },
      afterRender(v) { const M = T.modal; if (M && !M.focused) { M.focused = true; const el = v.querySelector('#tr-z'); if (el) el.focus(); } },
      onInput(e) { const el = e.target, M = T.modal; if (el.dataset.f) { T.draft[el.dataset.f] = el.value; return; } if (M && el.dataset.t) { const k = el.dataset.t; M.f[k] = k === 'active' ? el.value === '1' : el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } } },
      onSubmit() { T.applied = { ...T.draft }; T.page = 1; render(); }, onEscape() { if (T.modal) { T.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'tr-reset': T.draft = { kw: '', code: '', status: '' }; T.applied = { ...T.draft }; T.page = 1; render(); break;
          case 'tr-page': T.page = +b.dataset.p; render(); break;
          case 'tr-new': T.modal = { code: null, f: { zh: '', en: '', code: '', active: true, note: '' }, errs: {} }; render(); break;
          case 'tr-edit': { const x = hr.trade(b.dataset.c); T.modal = { code: x.code, f: { zh: x.zh, en: x.en, code: x.code, active: x.active, note: x.note }, errs: {} }; render(); break; }
          case 'tr-save': { const M = T.modal; const r = hr.saveTrade(M.f, M.code); if (!r.ok) { M.errs = r.errors; render(); break; } T.modal = null; render(); toast(t('hr.toast.tradeSaved'), 'ok'); break; }
          case 'close-modal': T.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { T.draft = { kw: '', code: '', status: '' }; T.applied = { ...T.draft }; T.page = 1; T.modal = null; },
    };
  };

  // ---------------- 项目人员分布 ----------------
  BS.hrParts.projects = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const P = { draft: { kw: '', status: '' }, applied: { kw: '', status: '' }, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const nameOf = (e) => (lang() === 'zh' ? e.name : e.nameEn || e.name);
    const rows = () => { const f = P.applied, kw = f.kw.trim().toLowerCase(); return hr.projects().filter((p) => BS.perm.inScopeProject(p.key)).filter((p) => (!kw || p.zh.toLowerCase().includes(kw) || p.en.toLowerCase().includes(kw) || p.code.toLowerCase().includes(kw)) && (!f.status || hr.projectStatus(p) === f.status)); };
    function page() {
      const all = rows(); const d = P.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('hr.pj.title')}</h1><p class="a-sub">${t('hr.pj.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="pj-inert">${icon('upload', 16)} ${t('hr.pj.exportStat')}</button><button type="button" class="a-btn" data-act="pj-tpl">${icon('list', 16)} ${t('hr.i.tpl')}</button></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('hr.pj.kw')}" aria-label="${t('hr.pj.kw')}"></label>
            <label class="a-in"><select data-f="status" aria-label="${t('hr.pj.status')}"><option value="">${t('hr.pj.status')}</option>${['upcoming', 'running', 'delayed', 'done'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('hr.pj.st.' + k)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="pj-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table"><thead><tr>${['name', 'company', 'sites', 'people', 'start', 'end', 'status'].map((c) => html`<th>${t('hr.pj.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${all.map((p) => { const st = hr.projectStatus(p); return html`<tr><td><b>${loc(p)}</b> <span class="mute">/ ${p.code}</span></td><td>${loc(p.company)}</td><td>${p.sites.length}</td><td>${hr.emps().filter((e) => BS.perm.inScopeEmp(e) && e.assigns.some((a) => a.projectKey === p.key)).length} ${t("t.ppl")}</td><td class="mute">${p.start}</td><td class="mute">${p.end}</td>
              <td><span class="a-tag ${BS.prjTag(st)}">${t('hr.pj.st.' + st)}</span></td>
              <td class="c-act"><button type="button" class="a-link" data-act="pj-view" data-k="${p.key}">${t('hr.pj.viewPeople')}</button><button type="button" class="a-link" data-act="prj-import" data-k="${p.key}" ${hr.assignable(p) ? '' : 'disabled'}>${t('hr.pj.import')}</button></td></tr>`; })}</tbody></table></div>
          <footer class="a-pager"><span>${t('hr.pj.count', { n: all.length })}</span><span></span></footer></section>`;
    }
    function viewModal() {
      const M = P.modal; const p = hr.project(M.key); const q = M.q;
      const list = hr.emps().filter((e) => BS.perm.inScopeEmp(e) && e.assigns.some((a) => a.projectKey === p.key)).map((e) => ({ e, a: e.assigns.find((a) => a.projectKey === p.key) }))
        .filter(({ e, a }) => (!q.kw || e.name.toLowerCase().includes(q.kw.toLowerCase()) || e.nameEn.toLowerCase().includes(q.kw.toLowerCase()) || e.empNo.toLowerCase().includes(q.kw.toLowerCase())) && (!q.trade || e.trades.includes(q.trade)) && (!q.site || a.siteKey === q.site) && (!q.status || e.status === q.status));
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('hr.pj.people')}</h2><p>${loc(p)} / ${p.code} · ${t('hr.pj.assignedN', { n: hr.emps().filter((e) => BS.perm.inScopeEmp(e) && e.assigns.some((a) => a.projectKey === p.key)).length })}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><div class="a-filters" style="padding:0 0 12px;border:0">
            <label class="a-in a-search">${icon('search', 16)}<input data-q="kw" value="${q.kw}" placeholder="${t('hr.pj.pkw')}" aria-label="${t('hr.pj.pkw')}"></label>
            <label class="a-in"><select data-q="trade"><option value="">${t('hr.pj.allTrades')}</option>${hr.trades().map((x) => html`<option value="${x.code}" ${q.trade === x.code ? 'selected' : ''}>${loc(x)}</option>`)}</select></label>
            <label class="a-in"><select data-q="site"><option value="">${t('hr.pj.allSites')}</option>${p.sites.map((k) => html`<option value="${k}" ${q.site === k ? 'selected' : ''}>${loc(hr.site(k))}</option>`)}</select></label>
            <label class="a-in"><select data-q="status"><option value="">${t('hr.f.allStatus')}</option><option value="active" ${q.status === 'active' ? 'selected' : ''}>${t('hr.st.active')}</option><option value="disabled" ${q.status === 'disabled' ? 'selected' : ''}>${t('hr.st.disabled')}</option></select></label></div>
          <div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr>${['person', 'role', 'employer', 'trades', 'site', 'status'].map((c) => html`<th>${t('hr.pj.pc.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${list.length ? list.map(({ e, a }) => html`<tr><td><b>${nameOf(e)}</b> <span class="mute">/ ${e.empNo}</span></td><td>${t('hr.role.' + a.role)}</td><td>${loc(e.employer)}</td><td>${e.trades.map((c) => loc(hr.trade(c) || { zh: c })).join('、')}</td><td>${loc(hr.site(a.siteKey))}</td><td><span class="a-tag ${e.status === 'active' ? 'approved' : 'withdrawn'}">${t('hr.st.' + e.status)}</span></td><td class="c-act"><button type="button" class="a-link" data-act="pj-role" data-e="${e.empNo}">${t('hr.pj.adjust')}</button></td></tr>`)
              : html`<tr><td colspan="7" class="a-none">${t('t.none')}</td></tr>`}</tbody></table></div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    function roleModal() {
      const M = P.modal; const e = hr.emp(M.e); const p = hr.project(M.key); const cur = e.assigns.find((a) => a.projectKey === p.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('hr.pj.roleTitle')}</h2><p>${nameOf(e)} / ${e.empNo} · ${loc(p)} / ${p.code}</p></header>
        <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab">${t('hr.pj.roleIn')}</label><div class="hr-roles">${hr.ROLES.map((k) => html`<label class="${M.role === k ? 'on' : ''}"><input type="radio" name="pj-r" data-r="${k}" ${M.role === k ? 'checked' : ''}><span><b>${t('hr.role.' + k)}</b><small>${t('hr.pj.roleDesc.' + k)}</small></span></label>`)}</div></div>
          <p class="a-fhint">${t('hr.f.roleHint')}</p></div>
        <footer><button type="button" class="a-btn" data-act="pj-back">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="pj-role-ok" ${M.role === cur.role ? 'disabled' : ''}>${t('p.m.save')}</button></footer></div></div>`;
    }
    return {
      tab: 'projects', crumbs() { return [{ text: t('a.nav.people'), act: 'noop' }, { text: t('hr.tab.projects') }]; }, page, modal() { const M = P.modal; return !M ? '' : M.k === 'role' ? roleModal() : viewModal(); },
      onInput(e) { const el = e.target; if (el.dataset.f) P.draft[el.dataset.f] = el.value; else if (el.dataset.q && P.modal) { P.modal.q[el.dataset.q] = el.value; if (el.dataset.q !== 'kw') render(); else { const pos = el.selectionStart; render(); const n = ctx.view().querySelector('[data-q=kw]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } } else if (el.dataset.r && P.modal) { P.modal.role = el.dataset.r; render(); } },
      onSubmit() { P.applied = { ...P.draft }; render(); }, onEscape() { if (P.modal) { P.modal = P.modal.k === 'role' ? { k: 'view', key: P.modal.key, q: { kw: '', trade: '', site: '', status: '' } } : null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'pj-inert': toast(t('p.toast.inert')); break;
          case 'pj-tpl': ctx.downloadTemplate && ctx.downloadTemplate(); break;
          case 'pj-reset': P.draft = { kw: '', status: '' }; P.applied = { ...P.draft }; render(); break;
          case 'pj-view': P.modal = { k: 'view', key: b.dataset.k, q: { kw: '', trade: '', site: '', status: '' } }; render(); break;
          case 'pj-role': { const M = P.modal; const e = hr.emp(b.dataset.e); P.modal = { k: 'role', key: M.key, e: e.empNo, role: e.assigns.find((x) => x.projectKey === M.key).role }; render(); break; }
          case 'pj-back': P.modal = { k: 'view', key: P.modal.key, q: { kw: '', trade: '', site: '', status: '' } }; render(); break;
          case 'pj-role-ok': { const M = P.modal; hr.setProjectRole(M.e, M.key, M.role); P.modal = { k: 'view', key: M.key, q: { kw: '', trade: '', site: '', status: '' } }; render(); toast(t('hr.toast.role'), 'ok'); break; }
          case 'close-modal': P.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { P.draft = { kw: '', status: '' }; P.applied = { ...P.draft }; P.modal = null; },
    };
  };

  // ---------------- module wrapper ----------------
  BS.registerAdmin({
    id: 'people', nav: 'a.nav.people', stores: [hr, BS.tenant],
    tabs: [{ id: 'roster', k: 'hr.tab.roster' }, { id: 'trades', k: 'hr.tab.trades' }, { id: 'projects', k: 'hr.tab.projects' }],
    create(ctx) {
      const roster = BS.hrParts.roster(ctx);
      const parts = { roster, trades: BS.hrParts.trades(ctx), projects: BS.hrParts.projects(ctx) };
      let tab = 'roster'; const cur = () => parts[tab];
      return {
        get tab() { return tab; }, set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v), onInput: (e) => cur().onInput && cur().onInput(e), onChange: (e) => cur().onChange && cur().onChange(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: () => ctx.rerender(),
        onClick(a, b, e) {
          if (a === 'prj-import') { tab = 'roster'; roster.openImport(b.dataset.k); return true; }
          if (a === 'pj-tpl') { roster.downloadTemplate(); return true; }
          return cur().onClick(a, b, e);
        },
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'roster'; },
      };
    },
  });
})(window.BS);
