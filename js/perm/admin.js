/* Admin: 权限管理 — admin roles (page, operation and data-scope permissions) and admin accounts. */
(function (BS) {
  const { html, icon } = BS;
  const pm = BS.perm, hr = BS.hr;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const SUBS = { stats: 'pg.stats', people: 'pg.people', prj: 'pg.prj', co: 'pg.co', cert: 'pg.cert', att: 'pg.att', pay: 'pg.pay', leave: 'pg.leave', notice: 'pg.notice', survey: 'pg.survey', content: 'pg.content', audit: 'pg.audit', perm: 'pg.perm', tenant: 'pg.tenant', reimb: 'pg.reimb', sys: 'pg.sys', dep: 'pg.dep', train: 'pg.train', wallet: 'pg.wallet', dorm: 'pg.dorm', spin: 'pg.spin', ...Object.fromEntries(BS.modules.permPages().map((p) => [p.id, p.descKey])) };
  const NAVK = Object.fromEntries(Object.entries(pm.NAV_TO_PAGE).map(([k, v]) => [v, k]));

  BS.registerAdmin({
    id: 'perm', nav: 'a.nav.perm', stores: [pm],
    tabs: [{ id: 'roles', k: 'pm.tab.roles' }, { id: 'accounts', k: 'pm.tab.accounts' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const S = { tab: 'roles', R: { draft: { kw: '', status: '' }, applied: { kw: '', status: '' } }, A: { draft: { kw: '', role: '', status: '' }, applied: { kw: '', role: '', status: '' } }, cfg: null, C: null, modal: null };
      const rName = (r) => (r ? (z() ? r.name : r.nameEn || r.name) : t('pm.noRole'));
      const aName = (a) => (z() ? a.name : a.nameEn || a.name);
      const pName = (id) => t(NAVK[id]);
      const prjName = (k) => { const p = hr.project(k); return p ? (z() ? p.zh : p.en) : k; };
      const scopeText = (r) => (!r ? '—' : r.scope.kind === 'projects' ? `${t('pm.scope.projects')} · ${t('pm.nProjects', { n: r.scope.projects.length })}` : t('pm.scope.' + r.scope.kind));
      const pagesText = (r) => { if (r.pages.length === pm.PAGES.length) return t('pm.allPages'); if (!r.pages.length) return t('pm.noPages'); const n = r.pages.slice(0, 3).map(pName).join(' / '); return r.pages.length > 3 ? `${n} ${t('pm.moreN', { n: r.pages.length - 3 })}` : n; };
      const stTag = (s) => html`<span class="a-tag ${s === 'active' ? 'approved' : 'withdrawn'}">${t(s === 'active' ? 'p.on' : 'p.off')}</span>`;
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('pm.e.' + M.errs[k])}</small>` : '');
      const canEdit = () => pm.can('perm', 'update');

      // ---------- roles ----------
      const roleRows = () => { const f = S.R.applied, kw = f.kw.trim().toLowerCase(); return pm.roles().filter((r) => (!kw || r.name.toLowerCase().includes(kw) || (r.nameEn || '').toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw)) && (!f.status || r.status === f.status)); };
      function rolesPage() {
        const all = roleRows(); const d = S.R.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('pm.r.title')}</h1><p class="a-sub">${t('pm.r.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="rl-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="rl-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('pm.f.role')}" aria-label="${t('pm.f.role')}"></label>
              <label class="a-in"><select data-f="status" aria-label="${t('pm.col.status')}"><option value="">${t('pm.col.status')}</option><option value="active" ${d.status === 'active' ? 'selected' : ''}>${t('p.on')}</option><option value="disabled" ${d.status === 'disabled' ? 'selected' : ''}>${t('p.off')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="rl-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['name', 'count', 'pages', 'scope', 'upd', 'status'].map((c) => html`<th>${t('pm.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((r) => html`<tr><td><b>${rName(r)}</b>${r.system ? html` <span class="a-tag sub-upcoming">${t('pm.system')}</span>` : ''}<small class="hr-sub">${r.code}</small></td><td>${pm.adminCount(r.id)}</td><td class="pm-pages">${pagesText(r)}</td><td>${scopeText(r)}</td><td class="mute">${r.updatedAt.slice(5)}</td><td>${stTag(r.status)}</td>
                <td class="c-act"><button type="button" class="a-link" data-act="rl-edit" data-id="${r.id}">${t('p.edit')}</button><button type="button" class="a-link" data-act="rl-cfg" data-id="${r.id}">${t('pm.cfg')}</button>${r.system ? html`<span class="mute pm-nodel">${t('pm.noDel')}</span>` : html`<button type="button" class="a-link danger" data-act="rl-del" data-id="${r.id}">${t('prj.s.del')}</button>`}</td></tr>`)
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('pm.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- permission configuration page ----------
      const opsCount = (C) => Object.values(C.ops).reduce((n, o) => n + o.length, 0);
      function cfgPage() {
        const r = pm.role(S.cfg); const C = S.C; const ro = r.system || !canEdit(); const D = ro ? 'disabled' : '';
        const allSel = C.pages.length === pm.PAGES.length;
        const opAll = pm.PAGES.filter((p) => C.pages.includes(p.id)).every((p) => p.ops.every((o) => (C.ops[p.id] || []).includes(o)));
        const sec = (k, title, sum, body) => html`<section class="a-card pm-sec"><button type="button" class="pm-sec-h ${C.open === k ? 'on' : ''}" data-act="pm-sec" data-k="${k}" aria-expanded="${C.open === k ? 'true' : 'false'}"><b>${title}</b><span>${sum}</span>${icon('right', 16, C.open === k ? 'pm-open' : '')}</button>${C.open === k ? html`<div class="pm-sec-b">${body}</div>` : ''}</section>`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('pm.cfg.title', { n: rName(r) })}</h1><p class="a-sub">${t('pm.cfg.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="pm-back">${t('pm.cfg.back')}</button>${ro ? '' : html`<button type="button" class="a-btn primary" data-act="pm-save">${t('pm.cfg.save')}</button>`}</div></div>
          ${r.system ? html`<p class="prj-warn sv-lock">${icon('warn', 16)} ${t('pm.cfg.sysLock')}</p>` : !canEdit() ? html`<p class="prj-warn sv-lock">${icon('warn', 16)} ${t('pm.cfg.noEdit')}</p>` : ''}
          <section class="a-card sv-card"><dl class="a-dl lv-dl"><div><dt>${t('pm.col.name')}</dt><dd>${rName(r)}</dd></div><div><dt>${t('pm.code')}</dt><dd>${r.code}</dd></div><div><dt>${t('pm.admins')}</dt><dd>${t('pm.nAdmins', { n: pm.adminCount(r.id) })}</dd></div><div><dt>${t('pm.col.status')}</dt><dd>${t(r.status === 'active' ? 'p.on' : 'p.off')}</dd></div></dl></section>
          ${sec('pages', t('pm.s.pages'), t('pm.s.nPages', { n: C.pages.length }), html`
            <label class="p-check pm-all"><input type="checkbox" data-pall="pages" ${allSel ? 'checked' : ''} ${D}> ${t('pm.s.allPages')}</label>
            <div class="pm-grid">${pm.PAGES.map((p) => html`<label class="pm-card ${C.pages.includes(p.id) ? 'on' : ''}"><input type="checkbox" data-ppage="${p.id}" ${C.pages.includes(p.id) ? 'checked' : ''} ${D}><span><b>${pName(p.id)}</b><small>${t(SUBS[p.id])}</small></span></label>`)}</div>
            <p class="a-fhint">${t('pm.s.pagesHint')}</p>`)}
          ${sec('ops', t('pm.s.ops'), t('pm.s.nOps', { n: opsCount(C) }), html`
            <label class="p-check pm-all"><input type="checkbox" data-pall="ops" ${opAll && C.pages.length ? 'checked' : ''} ${D || !C.pages.length ? 'disabled' : ''}> ${t('pm.s.allOps')}</label>
            ${C.pages.length ? html`<div class="a-tablewrap"><table class="a-table pm-matrix"><thead><tr><th>${t('pm.s.module')}</th>${pm.OPS.map((o) => html`<th>${t('pm.op.' + o)}</th>`)}</tr></thead>
              <tbody>${pm.PAGES.filter((p) => C.pages.includes(p.id)).map((p) => html`<tr><td><b>${pName(p.id)}</b></td>${pm.OPS.map((o) => (p.ops.includes(o) ? html`<td><input type="checkbox" aria-label="${pName(p.id)} ${t('pm.op.' + o)}" data-pop="${p.id}:${o}" ${(C.ops[p.id] || []).includes(o) ? 'checked' : ''} ${D}></td>` : html`<td class="mute">—</td>`))}</tr>`)}</tbody></table></div>` : html`<p class="a-fhint">${t('pm.s.noPagesYet')}</p>`}
            <p class="a-fhint">${t('pm.s.opsHint')}</p>`)}
          ${sec('scope', t('pm.s.scope'), scopeText({ scope: C.scope }), html`
            <div class="pm-scopes" role="radiogroup">${['all', 'company', 'projects', 'self'].map((k) => html`<label class="pm-card ${C.scope.kind === k ? 'on' : ''}"><input type="radio" name="pm-scope" data-pscope="${k}" ${C.scope.kind === k ? 'checked' : ''} ${D}><span><b>${t('pm.scope.' + k)}</b><small>${t('pm.scope.d.' + k)}</small></span></label>`)}</div>
            ${C.scope.kind === 'projects' ? html`<div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('pm.s.pickPrj')} <em>${t('pm.s.nPicked', { n: C.scope.projects.length })}</em></label><div class="nt-chips">${hr.projects().map((p) => html`<button type="button" class="${C.scope.projects.includes(p.key) ? 'on' : ''}" aria-pressed="${C.scope.projects.includes(p.key) ? 'true' : 'false'}" data-act="pm-prj" data-k="${p.key}" ${D}>${z() ? p.zh : p.en} <small>${p.code}</small></button>`)}</div>${C.err ? html`<small class="a-ferr">${t('pm.e.' + C.err)}</small>` : ''}</div>` : ''}
            <p class="a-fhint">${t('pm.s.scopeHint')}</p>`)}`;
      }

      // ---------- accounts ----------
      const acctRows = () => { const f = S.A.applied, kw = f.kw.trim().toLowerCase(); return pm.accounts().filter((a) => (!kw || a.id.includes(kw) || a.name.toLowerCase().includes(kw) || (a.nameEn || '').toLowerCase().includes(kw)) && (!f.role || a.roleId === f.role) && (!f.status || a.status === f.status)); };
      function accountsPage() {
        const all = acctRows(); const d = S.A.draft; const cur = pm.currentId();
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('pm.a.title')}</h1><p class="a-sub">${t('pm.a.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="ac-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="ac-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('pm.f.acct')}" aria-label="${t('pm.f.acct')}"></label>
              <label class="a-in"><select data-f="role" aria-label="${t('pm.col.role')}"><option value="">${t('pm.col.role')}</option>${pm.roles().map((r) => html`<option value="${r.id}" ${d.role === r.id ? 'selected' : ''}>${rName(r)}</option>`)}</select></label>
              <label class="a-in"><select data-f="status" aria-label="${t('pm.a.status')}"><option value="">${t('pm.a.status')}</option><option value="active" ${d.status === 'active' ? 'selected' : ''}>${t('p.on')}</option><option value="disabled" ${d.status === 'disabled' ? 'selected' : ''}>${t('p.off')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="ac-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['id', 'name', 'role', 'scope', 'last', 'status'].map((c) => html`<th>${t('pm.a.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((a) => { const r = pm.role(a.roleId); return html`<tr><td><b>${a.id}</b>${a.id === cur ? html` <span class="a-tag approved">${t('pm.current')}</span>` : ''}</td><td>${aName(a)}</td><td>${rName(r)}</td><td>${scopeText(r)}${r && r.scope.kind === 'company' && pm.companyOf(a) ? html`<small class="hr-sub">${z() ? pm.companyOf(a).name : pm.companyOf(a).nameEn}</small>` : ''}</td><td class="mute">${a.lastLogin ? a.lastLogin.slice(5) : '—'}</td><td>${stTag(a.status)}</td>
                <td class="c-act"><button type="button" class="a-link" data-act="ac-edit" data-id="${a.id}">${t('p.edit')}</button><button type="button" class="a-link" data-act="ac-upd-pw" data-id="${a.id}">${t('pm.a.reset')}</button>${a.id === cur ? '' : html`<button type="button" class="a-link" data-act="user-as" data-id="${a.id}" ${pm.roleOf(a) ? '' : 'disabled'}>${t('pm.a.signin')}</button>`}</td></tr>`; })
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('pm.count2', { n: all.length })}</span><span></span></footer></section>
          <p class="a-fhint pm-note">${icon('shield', 14)} ${t('pm.a.note')}</p>`;
      }

      // ---------- dialogs ----------
      const fld = (M, k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="pf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="pf-${k}" class="a-field" data-p="${k}" type="${o.type || 'text'}" value="${M.f[k] ?? ''}" maxlength="${o.max || 40}" placeholder="${o.ph || ''}" ${o.dis ? 'disabled' : ''} autocomplete="${o.ac || 'off'}">${o.hint ? html`<small class="a-fhint">${o.hint}</small>` : ''}${E(M, k)}</div>`;
      function roleForm() {
        const M = S.modal; const cur = M.id ? pm.role(M.id) : null;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(M.id ? t('pm.r.edit') : t('pm.r.add'), t('prj.p.formSub'))}
          <div class="a-mbody l-form"><div class="p-two">${fld(M, 'name', t('pm.r.name'), { req: 1, max: 20, ph: t('pm.r.namePh') })}${fld(M, 'nameEn', t('pm.r.nameEn'), { max: 40, ph: 'Enter role name' })}</div>
            <div class="a-frow"><label class="a-lab" for="pf-desc">${t('pm.r.desc')}</label><textarea id="pf-desc" class="a-field" data-p="desc" rows="2" maxlength="100" placeholder="${t('pm.r.descPh')}">${M.f.desc}</textarea>${E(M, 'desc')}</div>
            <div class="a-frow"><label class="a-lab" for="pf-status">${t('pm.col.status')}</label><select id="pf-status" class="a-field" data-p="status" ${cur && cur.system ? 'disabled' : ''}><option value="active" ${M.f.status === 'active' ? 'selected' : ''}>${t('p.on')}</option><option value="disabled" ${M.f.status === 'disabled' ? 'selected' : ''}>${t('p.off')}</option></select>${E(M, 'status')}</div>
            <div class="a-frow"><label class="a-lab" for="pf-party">${t('pm.r.party')}</label><select id="pf-party" class="a-field" data-p="party" ${cur && cur.system ? 'disabled' : ''}>${pm.PARTIES.filter((k) => ['employer', 'subcon', 'maincon'].includes(k) || M.f.party === k).map((k) => html`<option value="${k}" ${M.f.party === k ? 'selected' : ''}>${t('pm.party.' + k)}</option>`)}</select><small class="a-fhint">${t('pm.r.partyHint')}</small>${E(M, 'party')}</div>
            <p class="a-fhint">${t('pm.r.hint')}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="rl-save">${t('co.ok')}</button></footer></div></div>`;
      }
      function roleDel() {
        const r = pm.role(S.modal.id); const n = pm.adminCount(r.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('pm.d.title'), rName(r))}
          <div class="a-mbody l-form"><p class="prj-q">${t('pm.d.msg', { n: rName(r) })}</p><p class="a-fhint">${t('pm.d.note', { n })}</p>${n ? html`<p class="prj-warn">${icon('warn', 16)} ${t('pm.d.warn')}</p>` : ''}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn danger" data-act="rl-del-ok">${t('co.del.ok')}</button></footer></div></div>`;
      }
      function acctForm() {
        const M = S.modal; const edit = !!M.id;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(edit ? t('pm.a.edit') : t('pm.a.add'), t('prj.p.formSub'))}
          <div class="a-mbody l-form"><div class="p-two">${fld(M, 'id', t('pm.a.id'), { req: 1, max: 20, ph: t('pm.a.idPh'), dis: edit })}${fld(M, 'password', t('pm.a.pw'), { type: 'password', req: !edit, ph: edit ? '••••••••' : t('pm.a.pwPh'), ac: 'new-password', hint: edit ? t('t.m.pwEdit') : t('t.m.pwRule') })}</div>
            <div class="p-two">${fld(M, 'name', t('pm.a.name'), { req: 1, max: 30, ph: t('pm.a.namePh') })}${fld(M, 'nameEn', t('pm.a.nameEn'), { max: 40, ph: 'English name' })}</div>
            <div class="p-two">${fld(M, 'phone', t('pm.a.phone'), { max: 20, ph: '91234567' })}
              <div class="a-frow"><label class="a-lab" for="pf-roleId"><b class="req">*</b> ${t('pm.col.role')}</label><select id="pf-roleId" class="a-field" data-p="roleId"><option value="">${t('prj.p.pick')}</option>${pm.roles().map((r) => html`<option value="${r.id}" ${M.f.roleId === r.id ? 'selected' : ''} ${r.status !== 'active' && M.f.roleId !== r.id ? 'disabled' : ''}>${rName(r)}${r.status !== 'active' ? ' · ' + t('p.off') : ''}</option>`)}</select>${E(M, 'roleId')}</div></div>
            <div class="a-frow"><label class="a-lab" for="pf-companyId">${t('pm.a.company')}${(pm.role(M.f.roleId) || { scope: {} }).scope.kind === 'company' ? html` <b class="req">*</b>` : ''}</label><select id="pf-companyId" class="a-field" data-p="companyId"><option value="">${t('pm.a.noCompany')}</option>${hr.companies().filter((c) => c.active || c.id === M.f.companyId).map((c) => html`<option value="${c.id}" ${M.f.companyId === c.id ? 'selected' : ''}>${z() ? c.name : c.nameEn || c.name}</option>`)}</select><small class="a-fhint">${t('pm.a.companyHint')}</small>${E(M, 'companyId')}</div>
            <div class="a-frow"><label class="a-lab" for="pf-status">${t('pm.a.status')}</label><select id="pf-status" class="a-field" data-p="status"><option value="active" ${M.f.status === 'active' ? 'selected' : ''}>${t('p.on')}</option><option value="disabled" ${M.f.status === 'disabled' ? 'selected' : ''}>${t('p.off')}</option></select>${E(M, 'status')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ac-save">${t('co.ok')}</button></footer></div></div>`;
      }
      function pwModal() {
        const M = S.modal; const a = pm.account(M.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('pm.pw.title'), `${a.id} · ${aName(a)}`)}
          <div class="a-mbody l-form">${M.pw ? html`<p class="prj-q">${t('pm.pw.done')}</p><div class="pm-pw"><code>${M.pw}</code></div><p class="a-fhint">${t('pm.pw.once')}</p>` : html`<p class="prj-q">${t('pm.pw.msg')}</p><p class="a-fhint">${t('pm.pw.note')}</p>`}</div>
          <footer>${M.pw ? html`<button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button>` : html`<button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ac-pw-ok">${t('pm.pw.ok')}</button>`}</footer></div></div>`;
      }
      function modal() {
        const M = S.modal; if (!M) return '';
        if (M.id && (M.k === 'rform' || M.k === 'rdel') && !pm.role(M.id)) { S.modal = null; return ''; } if (M.id && (M.k === 'aform' || M.k === 'pw') && !pm.account(M.id)) { S.modal = null; return ''; }
        return { rform: roleForm, rdel: roleDel, aform: acctForm, pw: pwModal }[M.k]();
      }

      const blankRole = () => ({ name: '', nameEn: '', desc: '', status: 'active', party: 'employer' });
      const blankAcct = () => ({ id: '', password: '', name: '', nameEn: '', phone: '', roleId: '', companyId: '', status: 'active' });
      function openCfg(id) { const r = pm.role(id); S.cfg = id; S.C = { pages: r.pages.slice(), ops: JSON.parse(JSON.stringify(r.ops)), scope: { kind: r.scope.kind, projects: r.scope.projects.slice() }, open: 'pages', err: null }; }
      const keepViews = (C) => { C.pages.forEach((p) => { const o = C.ops[p] || (C.ops[p] = []); if (o.length && !o.includes('view')) o.unshift('view'); }); Object.keys(C.ops).forEach((p) => { if (!C.pages.includes(p)) delete C.ops[p]; }); };

      return {
        get tab() { return S.tab; }, set tab(v) { S.modal = null; S.tab = v; S.cfg = null; },
        crumbs() { const c = [{ text: t('a.nav.perm'), act: 'noop' }]; if (S.tab === 'roles' && S.cfg) return [...c, { text: t('pm.tab.roles'), act: 'pm-back' }, { text: t('pm.cfg') }]; return [...c, { text: t(S.tab === 'roles' ? 'pm.tab.roles' : 'pm.tab.accounts') }]; },
        page() { if (S.tab === 'roles' && S.cfg && pm.role(S.cfg)) return cfgPage(); S.cfg = null; return S.tab === 'roles' ? rolesPage() : accountsPage(); }, modal,
        afterRender(v) { const M = S.modal; if (M && (M.k === 'rform' || M.k === 'aform') && !M.focused) { M.focused = true; const el = v.querySelector(M.k === 'rform' ? '#pf-name' : (M.id ? '#pf-name' : '#pf-id')); if (el) el.focus(); } },
        onInput(e) {
          const el = e.target, M = S.modal;
          if (el.dataset.f) { (S.tab === 'roles' ? S.R : S.A).draft[el.dataset.f] = el.value; return; }
          if (M && el.dataset.p) { const k = el.dataset.p; M.f[k] = el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } return; }
          const C = S.C; if (!C || M) return;
          if (el.dataset.pall === 'pages') { C.pages = el.checked ? pm.PAGES.map((p) => p.id) : []; keepViews(C); render(); return; }
          if (el.dataset.pall === 'ops') { C.pages.forEach((p) => { C.ops[p] = el.checked ? pm.pageDef(p).ops.slice() : []; }); render(); return; }
          if (el.dataset.ppage) { const p = el.dataset.ppage; C.pages = el.checked ? [...C.pages, p] : C.pages.filter((x) => x !== p); if (!el.checked) delete C.ops[p]; else if (!(C.ops[p] || []).length) C.ops[p] = ['view']; render(); return; }
          if (el.dataset.pop) { const [p, o] = el.dataset.pop.split(':'); let cur = C.ops[p] || []; cur = el.checked ? [...new Set([...cur, o, 'view'])] : cur.filter((x) => x !== o); if (o === 'view' && !el.checked) cur = []; C.ops[p] = cur; render(); return; }
          if (el.dataset.pscope) { C.scope.kind = el.dataset.pscope; C.err = null; render(); }
        },
        onSubmit() { if (S.modal || S.cfg) return; if (S.tab === 'roles') S.R.applied = { ...S.R.draft }; else S.A.applied = { ...S.A.draft }; render(); },
        onEscape() { if (S.modal) { S.modal = null; render(); return true; } return false; }, onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'rl-reset': S.R.draft = { kw: '', status: '' }; S.R.applied = { ...S.R.draft }; render(); break;
            case 'ac-reset': S.A.draft = { kw: '', role: '', status: '' }; S.A.applied = { ...S.A.draft }; render(); break;
            case 'rl-new': S.modal = { k: 'rform', id: null, f: blankRole(), errs: {} }; render(); break;
            case 'rl-edit': { const r = pm.role(b.dataset.id); S.modal = { k: 'rform', id: r.id, f: { name: r.name, nameEn: r.nameEn === r.name ? '' : r.nameEn, desc: r.desc, status: r.status, party: r.party || 'employer' }, errs: {} }; render(); break; }
            case 'rl-save': { const M = S.modal; const r = pm.saveRole(M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); break; } S.modal = null; render(); toast(t(M.id ? 'pm.toast.rSaved' : 'pm.toast.rAdded'), 'ok'); break; }
            case 'rl-cfg': openCfg(b.dataset.id); render(); ctx.scrollTop0(); break;
            case 'rl-del': S.modal = { k: 'rdel', id: b.dataset.id }; render(); break;
            case 'rl-del-ok': { const id = S.modal.id; const r = pm.deleteRole(id); if (!r.ok) { toast(t('pm.e.' + r.error), 'warn'); S.modal = null; render(); break; } S.modal = null; render(); toast(t('pm.toast.rDel'), 'ok'); break; }
            case 'rl-export': { const all = roleRows(); download(`roles-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([['code', 'name', 'admins', 'pages', 'scope', 'status'], ...all.map((r) => [r.code, rName(r), pm.adminCount(r.id), pagesText(r), scopeText(r), t(r.status === 'active' ? 'p.on' : 'p.off')])])); toast(t('hr.toast.exported', { n: all.length }), 'ok'); break; }
            case 'pm-back': S.cfg = null; S.C = null; render(); break;
            case 'pm-sec': S.C.open = S.C.open === b.dataset.k ? '' : b.dataset.k; render(); break;
            case 'pm-prj': { const C = S.C, k = b.dataset.k; C.scope.projects = C.scope.projects.includes(k) ? C.scope.projects.filter((x) => x !== k) : [...C.scope.projects, k]; C.err = null; render(); break; }
            case 'pm-save': { const C = S.C; keepViews(C); const r = pm.savePermissions(S.cfg, { pages: C.pages, ops: C.ops, scope: C.scope }); if (!r.ok) { C.err = r.errors ? r.errors.scope : r.error; C.open = 'scope'; render(); break; } toast(t('pm.toast.perm'), 'ok'); break; }
            case 'ac-new': S.modal = { k: 'aform', id: null, f: blankAcct(), errs: {} }; render(); break;
            case 'ac-edit': { const x = pm.account(b.dataset.id); S.modal = { k: 'aform', id: x.id, f: { id: x.id, password: '', name: x.name, nameEn: x.nameEn === x.name ? '' : x.nameEn, phone: x.phone, roleId: x.roleId || '', companyId: x.companyId || '', status: x.status }, errs: {} }; render(); break; }
            case 'ac-save': { const M = S.modal; const r = pm.saveAccount(M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); break; } S.modal = null; render(); toast(t(M.id ? 'pm.toast.aSaved' : 'pm.toast.aAdded'), 'ok'); break; }
            case 'ac-upd-pw': S.modal = { k: 'pw', id: b.dataset.id, pw: null }; render(); break;
            case 'ac-pw-ok': { const r = pm.resetPassword(S.modal.id); S.modal.pw = r.password; render(); break; }
            case 'ac-export': { const all = acctRows(); download(`admin-accounts-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([['account', 'name', 'role', 'scope', 'last_login', 'status'], ...all.map((x) => [x.id, aName(x), rName(pm.role(x.roleId)), scopeText(pm.role(x.roleId)), x.lastLogin, t(x.status === 'active' ? 'p.on' : 'p.off')])])); toast(t('hr.toast.exported', { n: all.length }), 'ok'); break; }
            case 'close-modal': S.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { S.tab = 'roles'; S.R = { draft: { kw: '', status: '' }, applied: { kw: '', status: '' } }; S.A = { draft: { kw: '', role: '', status: '' }, applied: { kw: '', role: '', status: '' } }; S.cfg = null; S.C = null; S.modal = null; },
      };
    },
  });
})(window.BS);
