/* Admin: 部署与合规 — deployments of subcontractor workers on main contractors' sites, who may work today, the compliance rule table and the event log.
   One page for three kinds of viewer: the employer's administrators see everything; a subcontractor sees only its own workers (and their wages);
   a main contractor sees only workers deployed to it, with wages and personal details left out (BS.perm.project). */
(function (BS) {
  const { html, icon } = BS;
  const P = BS.perm, dep = BS.dep, comp = BS.comp, hr = BS.hr;
  const today = () => BS.fmt.now().slice(0, 10);
  const SIZE = 8;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  BS.registerAdmin({
    id: 'dep', nav: 'a.nav.dep', stores: [hr, comp, dep],
    tabs() { const all = [{ id: 'list', k: 'dep.tab.list' }, { id: 'fit', k: 'dep.tab.fit' }, { id: 'rules', k: 'dep.tab.rules' }, { id: 'events', k: 'dep.tab.events' }]; return P.party() === 'employer' ? all : all.slice(0, 1); },
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const F0 = () => ({ kw: '', sub: '', main: '', state: '' });
      const D = { tab: 'list', draft: F0(), applied: F0(), page: 1, modal: null, fit: { kw: '', state: '', permit: '', page: 1 }, ev: { type: '' }, rules: null };
      const can = (op) => P.can('dep', op);
      const party = () => P.party();
      const org = () => P.orgOf(P.current());
      const coName = (id) => { const c = hr.company(id); return c ? (z() ? c.name : c.nameEn || c.name) : id; };
      const nm = (e) => (z() ? e.name : e.nameEn || e.name);
      const certName = (code) => { const c = hr.certType(code); return c ? (z() ? c.zh : c.en) : code; };
      const tradeName = (c) => { const x = hr.trade(c); return x ? (z() ? x.zh : x.en) : c; };
      const siteName = (k) => { const s = hr.site(k); return s ? (z() ? s.zh : s.en) : k; };
      const prjName = (k) => { const p = hr.project(k); return p ? (z() ? p.zh : p.en) : k; };
      const permitName = (id) => { const p = comp.permitType(id); return p ? (z() ? p.zh : p.en) : id; };
      const accName = (id) => { const a = P.account(id); return a ? (z() ? a.name : a.nameEn || a.name) : ({ subcon: t('pm.party.subcon'), maincon: t('pm.party.maincon') }[id] || String(id)); };
      const reasonText = (r) => {
        const x = r.kind === 'cert' ? certName(r.type) : '';
        const key = r.status === 'soon' ? 'cp.w.' + r.kind : `cp.r.${r.kind}.${r.status}`;
        return t(key, { x, d: r.expiry || '', n: r.days, ref: r.ref || '' });
      };
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

      // ---------- what this viewer may see ----------
      /** deployments visible to the signed-in account: the employer's own scope, a subcontractor's own, a main contractor's own */
      function visible() {
        const p = party(), o = org();
        return dep.all().filter((x) => {
          if (p === 'subcon') return !!o && x.subconId === o.id;
          if (p === 'maincon') return !!o && x.mainconId === o.id;
          return P.inScopeEmp(hr.emp(x.empNo));
        });
      }
      const rows = () => {
        const f = D.applied, kw = f.kw.trim().toLowerCase();
        return visible().filter((x) => {
          const e = hr.emp(x.empNo); if (!e) return false;
          return (!kw || e.name.toLowerCase().includes(kw) || (e.nameEn || '').toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw)) && (!f.sub || x.subconId === f.sub) && (!f.main || x.mainconId === f.main) && (!f.state || dep.phase(x) === f.state);
        }).sort((a, b) => b.from.localeCompare(a.from) || b.id.localeCompare(a.id));
      };
      const wageText = (pe) => {
        if (!('rateCents' in pe)) return html`<span class="a-tag withdrawn">${icon('shield', 12)} ${t('dep.wage.conf')}</span>`;
        const tpl = BS.pay.template(pe.templateId); const n = (pe.rateCents / 100).toLocaleString('en-US'); return t(tpl && tpl.type === 'monthly' ? 'dep.wage.mon' : 'dep.wage.day', { n });
      };
      const docsTag = (e) => {
        const f = comp.fit(e); const bad = f.reasons.length, warn = f.warnings.length;
        return bad ? html`<span class="a-tag rejected" title="${f.reasons.map(reasonText).join('；')}">${t('dep.docs.bad', { n: bad })}</span>` : warn ? html`<span class="a-tag pending" title="${f.warnings.map(reasonText).join('；')}">${t('dep.docs.warn', { n: warn })}</span>` : html`<span class="a-tag approved">${t('dep.docs.ok')}</span>`;
      };
      const gateTag = (x) => {
        const g = dep.gate(x); if (g.state === 'none') return html`<span class="mute">—</span>`;
        return g.state === 'granted' ? html`<span class="a-tag approved">${t('dep.g.granted')}</span>` : html`<span class="a-tag rejected" title="${g.reasons.map((r) => (r.kind === 'manual' ? t('dep.g.manual', { r: r.reason }) : reasonText(r))).join('；')}">${t('dep.g.blocked')}</span>`;
      };
      const phaseTag = (x) => { const ph = dep.phase(x); return html`<span class="a-tag ${{ requested: 'pending', scheduled: 'sub-upcoming', active: 'approved', ended: 'withdrawn', rejected: 'rejected' }[ph]}">${t('dep.st.' + ph)}</span>`; };
      const pager = (n, pg, act) => { const pages = Math.max(1, Math.ceil(n / SIZE)); return html`<footer class="a-pager"><span>${t('dep.count', { n })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${pg === i + 1 ? 'on' : ''}" data-act="${act}" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer>`; };

      // ---------- list ----------
      function listPage() {
        const p = party(); const all = rows(); const pages = Math.max(1, Math.ceil(all.length / SIZE)); if (D.page > pages) D.page = pages; const slice = all.slice((D.page - 1) * SIZE, D.page * SIZE); const d = D.draft;
        const base = visible(); const k = { active: 0, granted: 0, blocked: 0, requested: base.filter((x) => x.status === 'requested').length };
        base.forEach((x) => { const g = dep.gate(x); if (g.state !== 'none') { k.active++; k[g.state]++; } });
        const subs = dep.subcontractors(), mains = dep.mainContractors();
        const sel = (key, label, list) => html`<label class="a-in"><select data-f="${key}" aria-label="${label}"><option value="">${label}</option>${list.map(([v, n]) => html`<option value="${v}" ${d[key] === v ? 'selected' : ''}>${n}</option>`)}</select></label>`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('dep.title')}</h1><p class="a-sub">${t('dep.sub')}</p></div>
            <div class="a-tbtns"><button type="button" class="a-btn" data-act="dep-export">${icon('upload', 16)} ${t('hr.export')}</button>${can('create') && p !== 'maincon' ? html`<button type="button" class="a-btn primary" data-act="dep-new">${icon('plus', 16)} ${t('dep.new')}</button>` : ''}</div></div>
          ${p !== 'employer' ? html`<p class="a-scopebar" role="note">${icon('shield', 14)} ${t('dep.pt.' + p)}</p>` : ''}
          <div class="dp-kpis">${[['active', 'dep.k.active'], ['granted', 'dep.k.granted'], ['blocked', 'dep.k.blocked'], ['requested', 'dep.k.requested']].map(([key, lab]) => html`<div class="dp-kpi ${key}"><b>${k[key]}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card">
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('dep.f.kw')}" aria-label="${t('dep.f.kw')}"></label>
              ${p !== 'subcon' ? sel('sub', t('dep.f.sub'), subs.map((c) => [c.id, coName(c.id)])) : ''}${p !== 'maincon' ? sel('main', t('dep.f.main'), mains.map((c) => [c.id, coName(c.id)])) : ''}
              ${sel('state', t('dep.f.state'), ['requested', 'scheduled', 'active', 'ended', 'rejected'].map((s) => [s, t('dep.st.' + s)]))}
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="dep-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table dp-table"><thead><tr><th>${t('dep.c.worker')}</th>${p !== 'subcon' ? html`<th>${t('dep.c.sub')}</th>` : ''}<th>${t('dep.c.main')}</th><th>${t('dep.c.period')}</th><th>${t('dep.c.docs')}</th><th>${t('dep.c.wage')}</th><th>${t('dep.c.gate')}</th><th>${t('dep.c.rfid')}</th><th>${t('dep.c.status')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((x) => {
                const e = hr.emp(x.empNo); const pe = P.project(p === 'employer' ? 'employer' : p, e); const ph = dep.phase(x); const live = ph === 'active' || ph === 'scheduled';
                return html`<tr data-dep="${x.id}"><td><b>${nm(pe)}</b><small class="hr-sub">${pe.empNo} · ${pe.trades.map(tradeName).join('、')}</small></td>
                  ${p !== 'subcon' ? html`<td>${coName(x.subconId)}</td>` : ''}${p !== 'maincon' ? html`<td><b>${coName(x.mainconId)}</b><small class="hr-sub">${prjName(x.projectKey)} · ${siteName(x.siteKey)}</small></td>` : html`<td><b>${prjName(x.projectKey)}</b><small class="hr-sub">${siteName(x.siteKey)}</small></td>`}
                  <td class="mute">${x.from} → ${x.to || t('dep.noPeriodEnd')}</td><td>${docsTag(e)}</td><td>${wageText(pe)}</td><td>${gateTag(x)}</td><td class="mute">${x.rfid || '—'}</td><td>${phaseTag(x)}</td>
                  <td class="c-act"><button type="button" class="a-link" data-act="dep-view" data-id="${x.id}">${t('dep.view')}</button>
                    ${x.status === 'requested' && p !== 'subcon' && can('approve') ? html`<button type="button" class="a-link ok" data-act="dep-approve" data-id="${x.id}">${t('dep.accept')}</button><button type="button" class="a-link bad" data-act="dep-reject" data-id="${x.id}">${t('dep.reject')}</button>` : ''}
                    ${x.status === 'accepted' && live && p !== 'subcon' && can('update') ? (x.block ? html`<button type="button" class="a-link ok" data-act="dep-edit-unblock" data-id="${x.id}">${t('dep.unblock')}</button>` : html`<button type="button" class="a-link bad" data-act="dep-edit-block" data-id="${x.id}">${t('dep.block')}</button>`) : ''}
                    ${x.status === 'accepted' && live && p !== 'maincon' && can('update') ? html`<button type="button" class="a-link bad" data-act="dep-edit-end" data-id="${x.id}">${t('dep.end')}</button>` : ''}</td></tr>`;
              }) : html`<tr><td colspan="10" class="a-none"><p>${t('dep.none')}</p></td></tr>`}</tbody></table></div>
            ${pager(all.length, D.page, 'dep-page')}</section>
          <p class="l-audit">${icon('shield', 14)} ${t('dep.proto')}</p>`;
      }

      // ---------- compliance status ----------
      function fitRows() {
        const f = D.fit, kw = f.kw.trim().toLowerCase();
        return comp.scan({ permit: f.permit || undefined }).filter(({ emp, fit }) => P.inScopeEmp(emp) && (!kw || emp.name.toLowerCase().includes(kw) || (emp.nameEn || '').toLowerCase().includes(kw) || emp.empNo.toLowerCase().includes(kw))
          && (!f.state || (f.state === 'blocked' ? !fit.ok : f.state === 'soon' ? fit.ok && fit.warnings.length > 0 : fit.ok && !fit.warnings.length)))
          .sort((a, b) => (a.fit.ok - b.fit.ok) || (b.fit.reasons.length - a.fit.reasons.length) || a.emp.empNo.localeCompare(b.emp.empNo));
      }
      function fitPage() {
        const f = D.fit; const sm = comp.summary({ permit: f.permit || undefined }); const all = fitRows(); const pages = Math.max(1, Math.ceil(all.length / SIZE)); if (f.page > pages) f.page = pages; const slice = all.slice((f.page - 1) * SIZE, f.page * SIZE);
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('cp.title')}</h1><p class="a-sub">${t('cp.sub')}</p></div></div>
          <div class="dp-kpis">${[['total', 'cp.k.total'], ['ok', 'cp.k.ok'], ['soon', 'cp.k.soon'], ['blocked', 'cp.k.blocked']].map(([key, lab]) => html`<div class="dp-kpi ${key === 'ok' ? 'granted' : key === 'blocked' ? 'blocked' : key === 'soon' ? 'requested' : 'active'}"><b>${sm[key]}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card">
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-fit="kw" value="${f.kw}" placeholder="${t('cp.f.kw')}" aria-label="${t('cp.f.kw')}"></label>
              <label class="a-in"><select data-fit="permit" aria-label="${t('cp.f.permit')}"><option value="">${t('cp.f.base')}</option>${comp.PERMIT_TYPES.map((p) => html`<option value="${p.id}" ${f.permit === p.id ? 'selected' : ''}>${permitName(p.id)}</option>`)}</select></label>
              <label class="a-in"><select data-fit="state" aria-label="${t('cp.f.state')}"><option value="">${t('cp.f.state')}</option>${['blocked', 'soon', 'ok'].map((s) => html`<option value="${s}" ${f.state === s ? 'selected' : ''}>${t('cp.s.' + s)}</option>`)}</select></label>
              <span class="a-fgrow"></span></form>
            <div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('cp.c.person')}</th><th>${t('cp.c.status')}</th><th>${t('cp.c.reasons')}</th><th>${t('cp.c.deploy')}</th></tr></thead>
              <tbody>${slice.length ? slice.map(({ emp, fit }) => { const st = !fit.ok ? 'blocked' : fit.warnings.length ? 'soon' : 'ok'; const dp = dep.activeFor(emp.empNo);
                return html`<tr data-emp="${emp.empNo}"><td><b>${nm(emp)}</b><small class="hr-sub">${emp.empNo} · ${z() ? emp.employer.zh : emp.employer.en}</small></td>
                  <td><span class="a-tag ${st === 'ok' ? 'approved' : st === 'soon' ? 'pending' : 'rejected'}">${t('cp.s.' + st)}</span></td>
                  <td>${fit.reasons.length || fit.warnings.length ? html`<ul class="dp-reasons">${fit.reasons.map((r) => html`<li class="bad">${reasonText(r)}</li>`)}${fit.warnings.map((r) => html`<li class="warn">${reasonText(r)}</li>`)}</ul>` : html`<span class="mute">${t('cp.allgood')}</span>`}</td>
                  <td>${dp ? html`${coName(dp.mainconId)}<small class="hr-sub">${siteName(dp.siteKey)}</small>` : html`<span class="mute">—</span>`}</td></tr>`; }) : html`<tr><td colspan="4" class="a-none"><p>${t('cp.none')}</p></td></tr>`}</tbody></table></div>
            ${pager(all.length, f.page, 'cp-page')}</section>`;
      }

      // ---------- rules ----------
      const rules = () => { if (!D.rules) D.rules = { base: clone(comp.rules().base), errs: {} }; return D.rules; };
      function rulesPage() {
        const R = rules(); const b = R.base; const err = (k) => (R.errs[k] ? html`<small class="a-ferr">${t('cp.e.' + R.errs[k])}</small>` : '');
        const days = (path, v, k) => html`<label class="dp-days">${t('cp.rb.soon')} <input type="number" min="0" max="365" data-r="${path}" value="${v}" aria-label="${t('cp.rb.soon')}"></label>${err(k)}`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('cp.rules.title')}</h1><p class="a-sub">${t('cp.rules.sub')}</p></div></div>
          <section class="a-card dp-rules"><h3 class="hr-h">${t('cp.rb.title')}</h3>
            <div class="dp-rule"><label class="p-check"><input type="checkbox" data-r="passport.on" ${b.passport.on ? 'checked' : ''}> ${t('cp.rb.passport')}</label>${days('passport.soonDays', b.passport.soonDays, 'passport')}</div>
            <div class="dp-rule"><label class="p-check"><input type="checkbox" data-r="pass.on" ${b.pass.on ? 'checked' : ''}> ${t('cp.rb.pass')}</label>${days('pass.soonDays', b.pass.soonDays, 'pass')}</div>
            <h4 class="dp-h4">${t('cp.rb.certs')}</h4>
            ${b.certs.map((c, i) => html`<div class="dp-rule" data-cert="${i}"><label class="p-check"><input type="checkbox" data-r="certs.${i}.on" ${c.on ? 'checked' : ''}></label>
              <select class="a-field sm" data-r="certs.${i}.type" aria-label="${t('hr.f.certType')}">${hr.certTypes().filter((x) => x.active || x.code === c.type).map((x) => html`<option value="${x.code}" ${c.type === x.code ? 'selected' : ''}>${z() ? x.zh : x.en}</option>`)}</select>
              ${days(`certs.${i}.soonDays`, c.soonDays, 'cert' + i)}<button type="button" class="a-link bad" data-act="cp-edit-rm" data-i="${i}">${t('cp.rb.rm')}</button></div>`)}
            <div class="dp-actions"><button type="button" class="a-btn" data-act="cp-edit-add">${icon('plus', 16)} ${t('cp.rb.addCert')}</button><button type="button" class="a-btn primary" data-act="cp-update-base">${t('cp.rb.save')}</button></div></section>
          <section class="a-card dp-rules"><h3 class="hr-h">${t('cp.rp.title')}</h3><p class="a-fhint">${t('cp.rp.hint')}</p>
            ${comp.PERMIT_TYPES.map((p) => html`<div class="dp-permit" data-permit="${p.id}"><b>${permitName(p.id)}</b><div class="hr-chips">${hr.certTypes().filter((x) => x.active || comp.permitCerts(p.id).includes(x.code)).map((x) => html`<button type="button" class="${comp.permitCerts(p.id).includes(x.code) ? 'on' : ''}" data-act="cp-update-permit" data-p="${p.id}" data-c="${x.code}" aria-pressed="${comp.permitCerts(p.id).includes(x.code) ? 'true' : 'false'}">${z() ? x.zh : x.en}</button>`)}${comp.permitCerts(p.id).length ? '' : html`<span class="mute">${t('cp.rp.none')}</span>`}</div></div>`)}
            <p class="a-fhint">${t('cp.rules.upd', { t: comp.rules().updatedAt })}</p><p class="l-audit">${icon('shield', 14)} ${t('cp.rules.note')}</p></section>`;
      }

      // ---------- events ----------
      const EV_TYPES = ['employee.*', 'cert.*', 'leave.*', 'deployment.*', 'compliance.*', 'ptw.*', 'training.*', 'wallet.*', 'dorm.*', 'spin.*', 'kchat.*'];
      function eventsPage() {
        const log = BS.bus.log(60, D.ev.type ? [D.ev.type] : undefined);
        const sum = (p) => Object.entries(p).map(([k, v]) => `${k}=${Array.isArray(v) ? v.length + ' items' : v}`).join(' · ');
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('ev.title')}</h1><p class="a-sub">${t('ev.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="ev-clear">${t('ev.clear')}</button></div></div>
          <section class="a-card"><form class="a-filters"><label class="a-in"><select data-ev="type" aria-label="${t('ev.f.type')}"><option value="">${t('ev.f.type')}</option>${EV_TYPES.map((x) => html`<option value="${x}" ${D.ev.type === x ? 'selected' : ''}>${x}</option>`)}</select></label><span class="a-fgrow"></span></form>
            <div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('ev.c.at')}</th><th>${t('ev.c.type')}</th><th>${t('ev.c.detail')}</th></tr></thead>
              <tbody>${log.length ? log.map((e) => html`<tr><td class="mute">${e.at}</td><td><code>${e.type}</code></td><td class="mute">${sum(e.payload)}</td></tr>`) : html`<tr><td colspan="3" class="a-none"><p>${t('ev.none')}</p></td></tr>`}</tbody></table></div></section>`;
      }

      function page() { if (!tabsOk()) D.tab = 'list'; return D.tab === 'fit' ? fitPage() : D.tab === 'rules' ? rulesPage() : D.tab === 'events' ? eventsPage() : listPage(); }
      const tabsOk = () => party() === 'employer' || D.tab === 'list';

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('dep.e.' + M.errs[k])}</small>` : '');
      function formModal() {
        const M = D.modal, f = M.f; const own = party() === 'subcon' ? org() : null;
        const workers = hr.emps().filter((e) => e.status === 'active' && dep.subconOf(e) === f.subconId);
        const sites = f.projectKey ? hr.projectSites(f.projectKey, true) : [];
        const row = (k, label, control) => html`<div class="a-frow"><label class="a-lab" for="dm-${k}"><b class="req">*</b> ${label}</label>${control}${E(M, k)}</div>`;
        const pick = (k, list, cur) => html`<select id="dm-${k}" class="a-field" data-d="${k}"><option value="">${t('dep.f.pick')}</option>${list.map(([v, n]) => html`<option value="${v}" ${cur === v ? 'selected' : ''}>${n}</option>`)}</select>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('dep.m.title'), t('dep.m.sub'))}
          <div class="a-mbody l-form">
            ${row('subconId', t('dep.f.subSel'), own ? html`<div class="a-field ro">${coName(own.id)}</div>` : pick('subconId', dep.subcontractors().map((c) => [c.id, coName(c.id)]), f.subconId))}
            ${row('empNo', t('dep.f.worker'), pick('empNo', workers.map((e) => [e.empNo, `${nm(e)} · ${e.empNo}`]), f.empNo))}<small class="a-fhint">${t('dep.f.workerHint')}</small>
            ${row('mainconId', t('dep.f.mainSel'), pick('mainconId', dep.mainContractors().map((c) => [c.id, coName(c.id)]), f.mainconId))}
            <div class="p-two">${row('projectKey', t('dep.f.project'), pick('projectKey', hr.projects().filter((p) => hr.projectStatus(p) !== 'done').map((p) => [p.key, prjName(p.key)]), f.projectKey))}${row('siteKey', t('dep.f.site'), pick('siteKey', sites.map((k) => [k, siteName(k)]), f.siteKey))}</div>
            <div class="p-two">${row('from', t('dep.f.from'), html`<input id="dm-from" type="date" class="a-field" data-d="from" value="${f.from}">`)}<div class="a-frow"><label class="a-lab" for="dm-to">${t('dep.f.to')}</label><input id="dm-to" type="date" class="a-field" data-d="to" value="${f.to}">${E(M, 'to')}</div></div>
          </div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="dep-new-ok">${t('dep.new')}</button></footer></div></div>`;
      }
      function detailModal() {
        const x = dep.get(D.modal.id); if (!x) return ''; const e = hr.emp(x.empNo); if (!e) return ''; const p = party(); const pe = P.project(p, e); const g = dep.gate(x); const f = comp.fit(e);
        const kv = (k, v) => html`<div><dt>${k}</dt><dd>${v || '—'}</dd></div>`;
        const hidden = pe._hidden.map((k) => t('dep.grp.' + k)).join('、');
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('dep.d.title'), t('dep.d.sub', { id: x.id, name: nm(pe) }))}
          <div class="a-mbody"><h3 class="hr-h">${t('dep.d.worker')}</h3>
            <dl class="a-dl lv-dl">${kv(t('hr.f.name'), nm(pe))}${kv(t('hr.col.empNo'), pe.empNo)}${kv(t('hr.f.idNo'), pe.idMask)}${kv(t('hr.f.country'), hr.COUNTRIES[pe.country] ? hr.COUNTRIES[pe.country][z() ? 0 : 1] : pe.country)}${kv(t('hr.f.trades'), pe.trades.map(tradeName).join('、'))}${kv(t('hr.f.employer'), z() ? pe.employer.zh : pe.employer.en)}
              ${pe.passType ? kv(t('hr.f.passType'), t('cp.pass.' + pe.passType)) : ''}${'passExpiry' in pe && pe.idType === 'fin' ? kv(t('hr.f.passExpiry'), pe.passExpiry) : ''}${'passportNo' in pe && pe.idType === 'fin' ? kv(t('hr.f.passportNo'), pe.passportNo) : ''}${'passportExpiry' in pe && pe.idType === 'fin' ? kv(t('hr.f.passportExpiry'), pe.passportExpiry) : ''}
              ${kv(t('dep.c.wage'), wageText(pe))}${kv(t('dep.c.main'), `${coName(x.mainconId)} · ${prjName(x.projectKey)} · ${siteName(x.siteKey)}`)}${kv(t('dep.c.period'), `${x.from} → ${x.to || t('dep.noPeriodEnd')}`)}${kv(t('dep.c.rfid'), x.rfid)}</dl>
            ${hidden ? html`<p class="a-fhint" data-role="hidden">${icon('shield', 12)} ${t('dep.d.hidden', { g: hidden })}</p>` : ''}
            <h3 class="hr-h">${t('dep.d.checks')} ${gateTag(x)}</h3>
            ${g.reasons.length || (f.warnings.length) ? html`<ul class="dp-reasons">${g.reasons.map((r) => html`<li class="bad">${r.kind === 'manual' ? t('dep.g.manual', { r: r.reason }) : reasonText(r)}</li>`)}${f.warnings.map((r) => html`<li class="warn">${reasonText(r)}</li>`)}</ul>` : html`<p class="a-fhint">${t('dep.d.allOk')}</p>`}
            <h3 class="hr-h">${t('dep.d.log')}</h3>
            <ol class="dp-log">${x.log.map((l) => html`<li><b>${t('dep.log.' + l.type)}</b> <span class="mute">${l.at} · ${accName(l.by)}</span>${l.note ? html`<small>${l.note}</small>` : ''}</li>`)}</ol></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }
      function noteModal(kind) {
        const M = D.modal; const x = dep.get(M.id); if (!x) return ''; const cfg = { reject: ['dep.rj', 'dep-reject-ok'], block: ['dep.bl', 'dep-edit-block-ok'] }[kind];
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t(cfg[0] + '.title'), t(cfg[0] + '.sub'))}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="dm-note"><b class="req">*</b> ${t('dep.note')}</label><textarea id="dm-note" class="a-field" data-d="note" rows="3" maxlength="120">${M.f.note}</textarea>${E(M, 'note')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="${cfg[1]}">${t(cfg[0] + '.ok')}</button></footer></div></div>`;
      }
      function endModal() {
        const M = D.modal; const x = dep.get(M.id); if (!x) return '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('dep.en.title'), t('dep.en.sub'))}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="dm-date"><b class="req">*</b> ${t('dep.en.date')}</label><input id="dm-date" type="date" class="a-field" data-d="date" value="${M.f.date}">${E(M, 'date')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="dep-edit-end-ok">${t('dep.en.ok')}</button></footer></div></div>`;
      }
      function modal() {
        const M = D.modal; if (!M) return '';
        if (M.id && !dep.get(M.id)) { D.modal = null; return ''; }
        return M.k === 'form' ? formModal() : M.k === 'view' ? detailModal() : M.k === 'end' ? endModal() : noteModal(M.k);
      }

      const blankForm = () => { const o = party() === 'subcon' ? org() : null; return { subconId: o ? o.id : '', empNo: '', mainconId: '', projectKey: '', siteKey: '', from: today(), to: '' }; };
      function result(r, okMsg) {
        if (!r.ok) {
          if (r.errors) { D.modal.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); return false; }
          if (r.error === 'note' || r.error === 'note_len' || r.error === 'date' || r.error === 'before_start') { D.modal.errs = { [D.modal.k === 'end' ? 'date' : 'note']: r.error }; render(); return false; }
          D.modal = null; render(); toast(t('dep.t.stale'), 'warn'); return false;
        }
        D.modal = null; render(); toast(t(okMsg), 'ok'); return true;
      }
      function exportCsv() {
        const all = rows();
        download(`deployments-${today()}.csv`, csvOf([['id', 'empNo', 'worker', 'subcontractor', 'main_contractor', 'project', 'site', 'from', 'to', 'status', 'gate', 'rfid'], ...all.map((x) => { const e = hr.emp(x.empNo); return [x.id, e.empNo, nm(e), coName(x.subconId), coName(x.mainconId), prjName(x.projectKey), siteName(x.siteKey), x.from, x.to || '', t('dep.st.' + dep.phase(x)), t('dep.g.' + dep.gate(x).state), x.rfid]; })]));
        ctx.toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.dep'), act: 'noop' }, { text: t('dep.tab.' + (tabsOk() ? D.tab : 'list')) }]; }, page, modal,
        onTab() { D.modal = null; },
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.dataset.f) { D.draft[el.dataset.f] = el.value; return; }
          if (el.dataset.fit) { D.fit[el.dataset.fit] = el.value; D.fit.page = 1; render(); const kw = ctx.view().querySelector('[data-fit=kw]'); if (kw && el.dataset.fit === 'kw') { kw.focus(); kw.setSelectionRange(kw.value.length, kw.value.length); } return; }
          if (el.dataset.ev) { D.ev[el.dataset.ev] = el.value; render(); return; }
          if (el.dataset.r) { // rules form
            const R = rules(); const path = el.dataset.r.split('.'); let o = R.base; path.slice(0, -1).forEach((k) => { o = o[k]; }); const last = path[path.length - 1];
            o[last] = el.type === 'checkbox' ? el.checked : last === 'soonDays' ? (el.value === '' ? NaN : Number(el.value)) : el.value; R.errs = {}; return;
          }
          if (M && el.dataset.d) {
            const k = el.dataset.d; M.f[k] = el.value; if (M.errs && M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
            if (M.k === 'form') { if (k === 'subconId') M.f.empNo = ''; if (k === 'projectKey') M.f.siteKey = ''; if (k === 'subconId' || k === 'projectKey') render(); }
          }
        },
        onSubmit() { D.applied = { ...D.draft }; D.page = 1; render(); },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id;
          // the role guard knows operations; these checks know who the viewer is (a button can be forced from the console)
          const pid = id || (D.modal && D.modal.id); const p = party();
          const deny = (pid && dep.get(pid) && !visible().some((v) => v.id === pid))
            || (['dep-approve', 'dep-reject', 'dep-reject-ok', 'dep-edit-block', 'dep-edit-block-ok', 'dep-edit-unblock'].includes(a) && p === 'subcon')
            || (['dep-edit-end', 'dep-edit-end-ok', 'dep-new', 'dep-new-ok'].includes(a) && p === 'maincon')
            || (['cp-edit-add', 'cp-edit-rm', 'cp-update-base', 'cp-update-permit', 'ev-clear'].includes(a) && p !== 'employer');
          if (deny) { D.modal = null; toast(t('pm.noOp'), 'warn'); render(); return true; }
          switch (a) {
            case 'noop': break;
            case 'dep-reset': D.draft = F0(); D.applied = F0(); D.page = 1; render(); break;
            case 'dep-page': D.page = +b.dataset.p; render(); break;
            case 'cp-page': D.fit.page = +b.dataset.p; render(); break;
            case 'dep-export': exportCsv(); break;
            case 'dep-view': D.modal = { k: 'view', id }; render(); break;
            case 'dep-new': D.modal = { k: 'form', f: blankForm(), errs: {} }; render(); break;
            case 'dep-new-ok': { const M = D.modal; if (p === 'subcon' && org()) M.f.subconId = org().id; result(dep.request(M.f), 'dep.t.requested'); break; }
            case 'dep-approve': result(dep.accept(id), 'dep.t.accepted'); break;
            case 'dep-reject': D.modal = { k: 'reject', id, f: { note: '' }, errs: {} }; render(); break;
            case 'dep-reject-ok': { const M = D.modal; result(dep.reject(M.id, M.f.note), 'dep.t.rejected'); break; }
            case 'dep-edit-block': D.modal = { k: 'block', id, f: { note: '' }, errs: {} }; render(); break;
            case 'dep-edit-block-ok': { const M = D.modal; result(dep.block(M.id, M.f.note), 'dep.t.blocked'); break; }
            case 'dep-edit-unblock': result(dep.unblock(id), 'dep.t.unblocked'); break;
            case 'dep-edit-end': D.modal = { k: 'end', id, f: { date: today() }, errs: {} }; render(); break;
            case 'dep-edit-end-ok': { const M = D.modal; result(dep.end(M.id, M.f.date), 'dep.t.ended'); break; }
            case 'cp-edit-add': { const R = rules(); const used = R.base.certs.map((c) => c.type); const next = hr.certTypes().find((x) => x.active && !used.includes(x.code)); if (next) R.base.certs.push({ type: next.code, on: true, soonDays: 30 }); render(); break; }
            case 'cp-edit-rm': { const R = rules(); R.base.certs.splice(+b.dataset.i, 1); render(); break; }
            case 'cp-update-base': { const R = rules(); const r = comp.saveBase(R.base); if (!r.ok) { R.errs = r.errors; render(); break; } D.rules = null; render(); toast(t('cp.t.saved'), 'ok'); break; }
            case 'cp-update-permit': { const cur = comp.permitCerts(b.dataset.p); const c = b.dataset.c; comp.savePermit(b.dataset.p, cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]); break; }
            case 'ev-clear': BS.bus.clearLog(); render(); break;
            case 'close-modal': D.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.tab = 'list'; D.draft = F0(); D.applied = F0(); D.page = 1; D.modal = null; D.fit = { kw: '', state: '', permit: '', page: 1 }; D.ev = { type: '' }; D.rules = null; },
      };
    },
  });
})(window.BS);
