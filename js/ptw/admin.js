/* Admin: 工作许可 (Permit to Work) — permits with their teams, the hard stop and what to do about it (swap a worker, renew a document, override a certificate stop).
   Employer administrators see every permit in their data scope; a subcontractor sees permits with its workers and can apply, swap and renew for its own;
   a main contractor sees permits on its sites and approves, starts and closes them. */
(function (BS) {
  const { html, icon } = BS;
  const P = BS.perm, hr = BS.hr, dep = BS.dep, comp = BS.comp, ptw = BS.ptw;
  const today = () => BS.fmt.now().slice(0, 10);
  const SIZE = 5;
  const FILTERS = ['', 'stopped', 'hold', 'inprogress', 'ready', 'requested', 'closed'];

  BS.registerAdmin({
    id: 'ptw', nav: 'a.nav.ptw', stores: [hr, comp, dep, ptw, BS.kchat],
    tabs: [{ id: 'list', k: 'ptw.tab' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const D = { f: { kw: '', state: '' }, draft: { kw: '' }, page: 1, modal: null };
      const party = () => P.party(); const org = () => P.orgOf(P.current()); const can = (op) => P.can('ptw', op);
      const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
      const empOf = (no) => { const e = hr.emp(no); return e && party() !== 'employer' ? P.project(party(), e) : e; };
      const coName = (id) => { const c = hr.company(id); return c ? (z() ? c.name : c.nameEn || c.name) : '—'; };
      const prjName = (k) => { const p = hr.project(k); return p ? (z() ? p.zh : p.en) : k; };
      const siteName = (k) => { const s = hr.site(k); return s ? (z() ? s.zh : s.en) : k; };
      const typeName = (id) => { const p = comp.permitType(id); return p ? (z() ? p.zh : p.en) : id; };
      const certName = (code) => { const c = hr.certType(code); return c ? (z() ? c.zh : c.en) : code; };
      const accName = (id) => { const a = P.account(id); return a ? (z() ? a.name : a.nameEn || a.name) : (id === 'system' ? t('ptw.sys') : String(id)); };
      const reasonText = (r) => {
        if (r.kind === 'gate') return t('ptw.r.gate', { r: r.reason });
        if (r.kind === 'deployment') return t('ptw.r.deployment');
        const x = r.kind === 'cert' ? certName(r.type) : '';
        return t(r.status === 'soon' ? 'cp.w.' + r.kind : `cp.r.${r.kind}.${r.status}`, { x, d: r.expiry || '', n: r.days, ref: r.ref || '' });
      };
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

      // ---------- who sees what, who may act ----------
      function visible() {
        const p = party(), o = org();
        return ptw.all().filter((x) => {
          if (p === 'employer') return P.inScopeProject(x.projectKey);
          if (!o) return false;
          if (p === 'maincon') return x.mainconId === o.id;
          return x.subconId === o.id || x.team.some((no) => P.partyCanSee(P.current(), hr.emp(no)));
        });
      }
      const ownsEdit = (x) => party() === 'employer' || (party() === 'subcon' && !!org() && x.subconId === org().id);
      const canDecide = () => party() !== 'subcon';
      const rows = () => {
        const f = D.f, kw = f.kw.trim().toLowerCase();
        return visible().filter((x) => {
          const st = ptw.state(x); const bucket = ['closed', 'cancelled', 'rejected'].includes(st) ? 'closed' : st;
          if (f.state && bucket !== f.state) return false;
          if (!kw) return true;
          return x.id.toLowerCase().includes(kw) || x.title.toLowerCase().includes(kw) || siteName(x.siteKey).toLowerCase().includes(kw) || x.team.some((no) => { const e = hr.emp(no); return no.toLowerCase().includes(kw) || (e && (e.name.toLowerCase().includes(kw) || (e.nameEn || '').toLowerCase().includes(kw))); });
        }).sort((a, b) => (+(ptw.state(b) === 'stopped') - +(ptw.state(a) === 'stopped')) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      };
      const stateTag = (x) => { const s = ptw.state(x); const cls = { requested: 'pending', ready: 'sub-upcoming', inprogress: 'approved', stopped: 'rejected', hold: 'rejected', closed: 'withdrawn', cancelled: 'withdrawn', rejected: 'rejected' }[s]; return html`<span class="a-tag ${cls}">${s === 'stopped' || s === 'hold' ? html`${icon('warn', 11)} ` : ''}${t('ptw.st.' + s)}</span>`; };

      // ---------- list ----------
      function reasonList(w) { return html`<ul class="dp-reasons">${w.reasons.map((r) => html`<li class="bad">${reasonText(r)}</li>`)}</ul>`; }
      const holdPanel = (x) => html`<div class="pt-stop pt-hold" data-role="hold"><div class="pt-stop-h"><b>${icon('warn', 16)} ${t('ptw.hold.title', { n: ptw.hold(x).length })}</b></div><p class="pt-stop-p">${t('ptw.hold.msg')}</p><ul class="kc-dgl">${ptw.hold(x).map((c) => html`<li><b>${c.id}</b> ${c.title} <small class="mute">${c.loc}</small></li>`)}</ul><button type="button" class="a-link" data-act="ptw-kchat">${t('ptw.kcOpen')}</button></div>`;
      function stopPanel(x) {
        const ov = ptw.overrideActive(x); const edit = ownsEdit(x) && can('update'); const st = x.stop;
        return html`<div class="pt-stop" data-role="stop"><div class="pt-stop-h">${icon('warn', 16)} <b>${t('ptw.stop.title', { n: st.workers.length })}</b>${ov ? html`<span class="a-tag pending">${t('ptw.stop.overridden')}</span>` : ''}</div>
          <p class="pt-stop-p">${t('ptw.stop.msg')}</p>
          ${st.workers.map((w) => { const e = hr.emp(w.empNo); const pe = empOf(w.empNo); const renewable = w.reasons.filter((r) => ['passport', 'pass', 'cert'].includes(r.kind));
            return html`<div class="pt-bad" data-worker="${w.empNo}"><div><b>${nm(pe)}</b> <span class="mute">(${e ? e.idMask : ''} · ${w.empNo})</span>${reasonList(w)}${w.reasons.filter((r) => r.kind === 'cert').map((r) => { const bk = BS.train && BS.train.pendingFor(w.empNo, r.type); return bk ? html`<p class="pt-booked">${icon('check', 12)} ${t('ptw.refresherBooked', { id: bk.id, d: bk.start })}</p>` : ''; })}</div>
              <div class="pt-bad-act">${edit ? html`<button type="button" class="a-btn sm bad" data-act="ptw-edit-swap" data-id="${x.id}" data-e="${w.empNo}">${t('ptw.swap')}</button>${w.reasons.some((r) => r.kind === 'cert') ? html`<button type="button" class="a-btn sm primary" data-act="ptw-refresher" data-id="${x.id}" data-e="${w.empNo}" data-ty="${w.reasons.find((r) => r.kind === 'cert').type}">${t('ptw.refresher')}</button>` : ''}${renewable.length ? html`<button type="button" class="a-btn sm" data-act="ptw-edit-renew" data-id="${x.id}" data-e="${w.empNo}" data-k="${renewable[0].kind}" data-ty="${renewable[0].type || ''}">${t('ptw.renew')}</button>` : ''}` : ''}</div></div>`; })}
          ${ov ? html`<p class="a-fhint">${t('ptw.stop.ovBy', { n: accName(st.override.by), t: st.override.at, r: st.override.note })}</p>` : ''}
          ${!ov && ptw.canOverride(x) && party() === 'employer' && can('approve') ? html`<div class="pt-stop-ov"><button type="button" class="a-btn sm" data-act="ptw-approve-override" data-id="${x.id}">${t('ptw.override')}</button><small class="a-fhint">${t('ptw.override.hint')}</small></div>` : ''}
          ${!ptw.canOverride(x) ? html`<p class="a-fhint">${icon('shield', 12)} ${t('ptw.noOverride')}</p>` : ''}</div>`;
      }
      function card(x) {
        const s = ptw.state(x); const res = ptw.check(x); const as = hr.emp(x.assessor); const hrs = ptw.hours(x);
        const act = (a, label, cls = '') => html`<button type="button" class="a-btn sm ${cls}" data-act="${a}" data-id="${x.id}">${label}</button>`;
        return html`<article class="a-card pt-card ${s === 'stopped' || s === 'hold' ? 'stop' : ''}" data-ptw="${x.id}" data-state="${s}">
          <header class="pt-h"><div class="pt-tags"><span class="pt-id">${x.id}</span><span class="a-tag sub-upcoming">${typeName(x.type)}</span>${stateTag(x)}</div><button type="button" class="a-link" data-act="ptw-view" data-id="${x.id}">${icon('search', 14)} ${t('ptw.view')}</button></header>
          <h3 class="pt-title">${x.title}</h3>
          ${BS.kchat && BS.kchat.permitCards(x.id).length ? html`<p class="pt-kc" data-role="kc-cards">${icon('warn', 13)} ${t('ptw.kcards', { n: BS.kchat.permitCards(x.id).length })} <button type="button" class="a-link" data-act="ptw-kchat">${t('ptw.kcOpen')}</button></p>` : ''}
          <p class="pt-meta">${icon('pin', 13)} ${prjName(x.projectKey)} · ${siteName(x.siteKey)}${x.mainconId ? ' · ' + coName(x.mainconId) : ''} <span class="mute">·</span> ${icon('clock', 13)} ${x.date} ${t('ptw.shift.' + x.shift)} (${hrs[0]}–${hrs[1]}) <span class="mute">·</span> ${t('ptw.ra')}: <code>${x.raRef}</code></p>
          ${s === 'stopped' ? stopPanel(x) : ''}${s === 'hold' || (s === 'requested' && ptw.hold(x).length) ? holdPanel(x) : ''}
          <div class="pt-team"><span class="mute">${t('ptw.team', { n: x.team.length })}</span>${res.workers.map((w) => { const e = empOf(w.empNo); return html`<span class="pt-chip ${w.ok ? (w.warnings.length ? 'warn' : 'ok') : 'bad'}" title="${w.reasons.concat(w.warnings).map(reasonText).join('；')}">${nm(e)}</span>`; })}
            <span class="pt-asr mute">${t('ptw.assessor')}: <b>${nm(as)}</b>${x.lastInspected ? html` · ${t('ptw.inspected')}: ${x.lastInspected}` : ''}</span></div>
          <footer class="pt-act">
            ${x.status === 'requested' && canDecide() && can('approve') ? html`${act('ptw-approve', t('ptw.approve'), 'primary')}${act('ptw-reject', t('ptw.reject'), 'bad')}` : ''}
            ${x.status === 'approved' && canDecide() && can('update') ? act('ptw-edit-start', t('ptw.start'), 'primary') : ''}
            ${x.status === 'active' && canDecide() && can('update') ? act('ptw-edit-close', t('ptw.close')) : ''}
            ${ptw.OPEN.includes(x.status) && ownsEdit(x) && can('update') ? act('ptw-edit-cancel', t('ptw.cancel'), 'bad') : ''}</footer></article>`;
      }
      function page() {
        const p = party(); const base = visible(); const k = ptw.counts(base); const all = rows(); const pages = Math.max(1, Math.ceil(all.length / SIZE)); if (D.page > pages) D.page = pages; const slice = all.slice((D.page - 1) * SIZE, D.page * SIZE);
        const bucket = (x) => { const s = ptw.state(x); return ['closed', 'cancelled', 'rejected'].includes(s) ? 'closed' : s; };
        const cnt = (key) => (key ? base.filter((x) => bucket(x) === key).length : base.length);
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('ptw.title')}</h1><p class="a-sub">${t('ptw.sub')}</p></div>
            <div class="a-tbtns"><button type="button" class="a-btn" data-act="ptw-export">${icon('upload', 16)} ${t('hr.export')}</button>${can('create') && p !== 'maincon' ? html`<button type="button" class="a-btn primary" data-act="ptw-new">${icon('plus', 16)} ${t('ptw.new')}</button>` : ''}</div></div>
          <p class="pt-rule" role="note">${icon('shield', 14)} <span><b>${t('ptw.rule.h')}</b> ${t('ptw.rule.b')}</span></p>
          ${k.stopped ? html`<div class="pt-banner" data-role="banner">${icon('warn', 18)}<div><b>${t('ptw.banner', { n: k.stopped })}</b><small>${t('ptw.banner.sub')}</small></div><button type="button" class="a-btn sm" data-act="ptw-filter" data-s="stopped">${t('ptw.banner.btn')}</button></div>` : ''}
          <div class="dp-kpis">${[['open', 'active', 'ptw.k.open'], ['stopped', 'blocked', 'ptw.k.stopped'], ['hold', 'blocked', 'ptw.k.hold'], ['inprogress', 'granted', 'ptw.k.inprogress'], ['badWorkers', 'requested', 'ptw.k.bad']].map(([key, cls, lab]) => html`<div class="dp-kpi ${cls}"><b>${k[key]}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card pt-bar"><form class="a-filters" autocomplete="off"><label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${D.draft.kw}" placeholder="${t('ptw.f.kw')}" aria-label="${t('ptw.f.kw')}"></label><span class="a-fgrow"></span><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="hr-chips pt-filters" role="group">${FILTERS.map((key) => html`<button type="button" class="${D.f.state === key ? 'on' : ''}" data-act="ptw-filter" data-s="${key}" aria-pressed="${D.f.state === key ? 'true' : 'false'}">${t(key ? 'ptw.st.' + key : 'dep.f.all')} (${cnt(key)})</button>`)}</div></section>
          ${slice.length ? slice.map(card) : html`<section class="a-card"><div class="a-none"><p>${t('ptw.none')}</p></div></section>`}
          <footer class="a-pager"><span>${t('ptw.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${D.page === i + 1 ? 'on' : ''}" data-act="ptw-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer>
          <p class="l-audit">${icon('shield', 14)} ${t('ptw.proto')}</p>`;
      }

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('ptw.e.' + M.errs[k])}${k === 'team' && M.errs._worker ? ' (' + M.errs._worker + ')' : ''}</small>` : '');
      const pick = (id, key, list, cur, ph = true) => html`<select id="${id}" class="a-field" data-p="${key}">${ph ? html`<option value="">${t('dep.f.pick')}</option>` : ''}${list.map(([v, n]) => html`<option value="${v}" ${cur === v ? 'selected' : ''}>${n}</option>`)}</select>`;
      function formModal() {
        const M = D.modal, f = M.f; const own = party() === 'subcon' ? org() : null;
        const assessors = hr.emps().filter((e) => e.status === 'active' && ['safety', 'supervisor'].includes(e.role));
        const sites = f.projectKey ? hr.projectSites(f.projectKey, true) : [];
        const ready = f.siteKey && f.type && validDate(f.date);
        const cands = ready ? ptw.candidates({ mainconId: f.mainconId, siteKey: f.siteKey, subconId: f.subconId, type: f.type, date: f.date }) : [];
        const row = (k, label, control, req = true) => html`<div class="a-frow"><label class="a-lab" for="pf-${k}">${req ? html`<b class="req">*</b> ` : ''}${label}</label>${control}${E(M, k)}</div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ptw.m.title'), t('ptw.m.sub', { id: ptw.nextId() }))}
          <div class="a-mbody l-form">
            <div class="p-two">${row('type', t('ptw.f.type'), pick('pf-type', 'type', comp.PERMIT_TYPES.map((x) => [x.id, typeName(x.id)]), f.type))}${row('title', t('ptw.f.title'), html`<input id="pf-title" class="a-field" data-p="title" maxlength="80" value="${f.title}" placeholder="${t('ptw.f.titlePh')}">`)}</div>
            <div class="p-two">${row('projectKey', t('dep.f.project'), pick('pf-projectKey', 'projectKey', hr.projects().filter((x) => hr.projectStatus(x) !== 'done').map((x) => [x.key, prjName(x.key)]), f.projectKey))}${row('siteKey', t('dep.f.site'), pick('pf-siteKey', 'siteKey', sites.map((k) => [k, siteName(k)]), f.siteKey))}</div>
            <div class="p-two">${row('mainconId', t('dep.f.mainSel'), pick('pf-mainconId', 'mainconId', dep.mainContractors().map((c) => [c.id, coName(c.id)]), f.mainconId), false)}
              ${row('subconId', t('dep.f.subSel'), own ? html`<div class="a-field ro">${coName(own.id)}</div>` : pick('pf-subconId', 'subconId', dep.subcontractors().map((c) => [c.id, coName(c.id)]), f.subconId), false)}</div>
            <div class="p-two">${row('date', t('ptw.f.date'), html`<input id="pf-date" type="date" class="a-field" data-p="date" value="${f.date}">`)}${row('shift', t('ptw.f.shift'), pick('pf-shift', 'shift', Object.keys(ptw.SHIFTS).map((k) => [k, `${t('ptw.shift.' + k)} (${ptw.SHIFTS[k][0]}–${ptw.SHIFTS[k][1]})`]), f.shift, false))}</div>
            <div class="p-two">${row('raRef', t('ptw.f.ra'), html`<input id="pf-raRef" class="a-field" data-p="raRef" maxlength="40" value="${f.raRef}" placeholder="RA-MS-2026-HW09">`)}${row('assessor', t('ptw.assessor'), pick('pf-assessor', 'assessor', assessors.map((e) => [e.empNo, `${nm(e)} · ${e.empNo}`]), f.assessor))}</div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('ptw.f.team')}</label>
              ${ready ? (cands.length ? html`<div class="pt-cands">${cands.map((c) => html`<label class="p-check pt-cand ${c.ok ? '' : 'off'}"><input type="checkbox" data-pteam="${c.emp.empNo}" ${f.team.includes(c.emp.empNo) ? 'checked' : ''} ${c.ok ? '' : 'disabled'}> <b>${nm(empOf(c.emp.empNo))}</b> <small>${c.emp.empNo}</small>${c.ok ? (c.warnings.length ? html` <span class="a-tag pending">${t('cp.s.soon')}</span>` : '') : html` <span class="a-tag rejected" title="${c.reasons.map(reasonText).join('；')}">${t('cp.s.blocked')}</span>`}</label>`)}</div>` : html`<p class="a-fhint">${t('ptw.f.noCands')}</p>`) : html`<p class="a-fhint">${t('ptw.f.teamFirst')}</p>`}
              <small class="a-fhint">${t('ptw.f.teamHint')}</small>${E(M, 'team')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ptw-new-ok">${t('ptw.new')}</button></footer></div></div>`;
      }
      const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
      function detailModal() {
        const x = ptw.get(D.modal.id); if (!x) return ''; const res = ptw.check(x); const as = hr.emp(x.assessor); const hrs = ptw.hours(x);
        const kv = (k, v) => html`<div><dt>${k}</dt><dd>${v || '—'}</dd></div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ptw.d.title'), `${x.id} · ${x.title}`)}
          <div class="a-mbody"><p>${stateTag(x)}</p>
            <dl class="a-dl lv-dl">${kv(t('ptw.f.type'), typeName(x.type))}${kv(t('dep.f.project'), prjName(x.projectKey))}${kv(t('dep.f.site'), siteName(x.siteKey))}${kv(t('dep.f.mainSel'), x.mainconId ? coName(x.mainconId) : '')}${kv(t('dep.f.subSel'), x.subconId ? coName(x.subconId) : '')}${kv(t('ptw.f.date'), `${x.date} ${t('ptw.shift.' + x.shift)} (${hrs[0]}–${hrs[1]})`)}${kv(t('ptw.f.ra'), x.raRef)}${kv(t('ptw.assessor'), nm(as))}${kv(t('ptw.inspected'), x.lastInspected)}${kv(t('ptw.d.by'), accName(x.requestedBy))}</dl>
            <h3 class="hr-h">${t('ptw.d.team', { n: x.team.length })} <small class="mute">${t('ptw.d.checkDate', { d: res.date })}</small></h3>
            <div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('dep.c.worker')}</th><th>${t('cp.c.status')}</th><th>${t('cp.c.reasons')}</th></tr></thead><tbody>${res.workers.map((w) => { const e = empOf(w.empNo); return html`<tr><td><b>${nm(e)}</b><small class="hr-sub">${w.empNo}</small></td><td><span class="a-tag ${w.ok ? (w.warnings.length ? 'pending' : 'approved') : 'rejected'}">${t(w.ok ? (w.warnings.length ? 'cp.s.soon' : 'cp.s.ok') : 'cp.s.blocked')}</span></td><td>${w.reasons.length || w.warnings.length ? html`<ul class="dp-reasons">${w.reasons.map((r) => html`<li class="bad">${reasonText(r)}</li>`)}${w.warnings.map((r) => html`<li class="warn">${reasonText(r)}</li>`)}</ul>` : html`<span class="mute">${t('cp.allgood')}</span>`}</td></tr>`; })}</tbody></table></div>
            <h3 class="hr-h">${t('dep.d.log')}</h3><ol class="dp-log">${x.log.map((l) => html`<li><b>${t('ptw.log.' + l.type)}</b> <span class="mute">${l.at} · ${accName(l.by)}</span>${l.note ? html`<small>${l.type === 'swapped' || l.type === 'stopped' ? l.note : l.note}</small>` : ''}</li>`)}</ol></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }
      function noteModal() {
        const M = D.modal; const x = ptw.get(M.id); if (!x) return '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t(`ptw.n.${M.k}.title`), t(`ptw.n.${M.k}.sub`, { id: x.id }))}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="pn-note">${M.k === 'close' ? '' : html`<b class="req">*</b> `}${t('dep.note')}</label><textarea id="pn-note" class="a-field" data-p="note" rows="3" maxlength="200">${M.f.note}</textarea>${E(M, 'note')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="${M.ok}">${t(`ptw.n.${M.k}.ok`)}</button></footer></div></div>`;
      }
      function swapModal() {
        const M = D.modal; const x = ptw.get(M.id); if (!x) return ''; const out = hr.emp(M.out);
        const cands = ptw.candidates({ mainconId: x.mainconId, siteKey: x.siteKey, subconId: x.subconId, type: x.type, date: ptw.evalDate(x), exclude: x.team });
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ptw.sw.title'), t('ptw.sw.sub', { n: nm(out) }))}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="ps-in"><b class="req">*</b> ${t('ptw.sw.pick')}</label>
            <select id="ps-in" class="a-field" data-p="in"><option value="">${t('dep.f.pick')}</option>${cands.map((c) => html`<option value="${c.emp.empNo}" ${M.f.in === c.emp.empNo ? 'selected' : ''} ${c.ok ? '' : 'disabled'}>${nm(empOf(c.emp.empNo))} · ${c.emp.empNo}${c.ok ? '' : ' — ' + t('cp.s.blocked')}</option>`)}</select>${E(M, 'in')}
            ${cands.some((c) => c.ok) ? '' : html`<small class="a-fhint">${t('ptw.f.noCands')}</small>`}<small class="a-fhint">${t('ptw.sw.hint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ptw-edit-swap-ok">${t('ptw.swap')}</button></footer></div></div>`;
      }
      function renewModal() {
        const M = D.modal; const e = hr.emp(M.e); if (!e) return ''; const x = ptw.get(M.id);
        const w = x && x.stop && x.stop.workers.find((y) => y.empNo === M.e); const opts = (w ? w.reasons : []).filter((r) => ['passport', 'pass', 'cert'].includes(r.kind));
        const key = (r) => r.kind + ':' + (r.type || '');
        const cur = M.f.doc; const kind = cur.split(':')[0];
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ptw.rn.title'), t('ptw.rn.sub', { n: nm(e) }))}
          <div class="a-mbody l-form">
            <div class="a-frow"><label class="a-lab" for="pr-doc">${t('ptw.rn.doc')}</label><select id="pr-doc" class="a-field" data-p="doc">${opts.map((r) => html`<option value="${key(r)}" ${cur === key(r) ? 'selected' : ''}>${reasonText(r)}</option>`)}</select></div>
            <div class="a-frow"><label class="a-lab" for="pr-exp"><b class="req">*</b> ${t('ptw.rn.exp')}</label><input id="pr-exp" type="date" class="a-field" data-p="expiry" value="${M.f.expiry}">${E(M, 'expiry')}</div>
            ${kind !== 'pass' ? html`<div class="a-frow"><label class="a-lab" for="pr-no">${kind === 'cert' ? html`<b class="req">*</b> ` : ''}${t(kind === 'cert' ? 'hr.f.certNo' : 'hr.f.passportNo')}</label><input id="pr-no" class="a-field" data-p="no" maxlength="40" value="${M.f.no}">${E(M, 'no')}</div>` : ''}
            <p class="a-fhint">${t('ptw.rn.hint')}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ptw-edit-renew-ok">${t('ptw.renew')}</button></footer></div></div>`;
      }
      function modal() {
        const M = D.modal; if (!M) return ''; if (M.id && !ptw.get(M.id)) { D.modal = null; return ''; }
        return M.k === 'form' ? formModal() : M.k === 'view' ? detailModal() : M.k === 'swap' ? swapModal() : M.k === 'renew' ? renewModal() : noteModal();
      }

      // ---------- actions ----------
      const blank = () => ({ type: '', title: '', projectKey: '', siteKey: '', mainconId: '', subconId: party() === 'subcon' && org() ? org().id : '', date: today(), shift: 'day', raRef: '', assessor: '', team: [] });
      const FLOW_ERR = { not_fit: 'ptw.t.notFit', hold: 'ptw.t.hold', stopped: 'ptw.t.stopped', not_today: 'ptw.t.notToday', state: 'ptw.t.stale', missing: 'ptw.t.stale', not_overridable: 'ptw.t.noOverride', not_stopped: 'ptw.t.stale' };
      function flow(r, okMsg) {
        if (r.ok) { D.modal = null; render(); toast(t(okMsg), 'ok'); return true; }
        if (r.error === 'note') { D.modal.errs = { note: 'note' }; render(); return false; }
        D.modal = null; render(); toast(t(FLOW_ERR[r.error] || 'ptw.t.stale', { n: (r.workers || []).length }), 'warn'); return false;
      }
      function sanitizeTeam(M) { const f = M.f; if (!(f.siteKey && f.type && validDate(f.date))) { f.team = []; return; } const ok = ptw.candidates({ mainconId: f.mainconId, siteKey: f.siteKey, subconId: f.subconId, type: f.type, date: f.date }).filter((c) => c.ok).map((c) => c.emp.empNo); f.team = f.team.filter((n) => ok.includes(n)); }
      function exportCsv() {
        const all = rows();
        download(`permits-${today()}.csv`, csvOf([['id', 'type', 'title', 'project', 'site', 'main_contractor', 'date', 'shift', 'ra_ref', 'status', 'team', 'stopped'], ...all.map((x) => [x.id, typeName(x.type), x.title, prjName(x.projectKey), siteName(x.siteKey), x.mainconId ? coName(x.mainconId) : '', x.date, x.shift, x.raRef, t('ptw.st.' + ptw.state(x)), x.team.join(' '), ptw.stopped(x) ? 'yes' : ''])]));
        toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }

      return {
        tab: 'list', crumbs() { return [{ text: t('a.nav.ptw'), act: 'noop' }, { text: t('ptw.tab') }]; }, page, modal,
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.dataset.f) { D.draft[el.dataset.f] = el.value; return; }
          if (!M) return;
          if (el.dataset.pteam) { const f = M.f; f.team = el.checked ? [...new Set([...f.team, el.dataset.pteam])] : f.team.filter((n) => n !== el.dataset.pteam); if (M.errs) M.errs.team = null; return; }
          if (!el.dataset.p) return; const k = el.dataset.p; M.f[k] = el.value;
          if (M.errs && M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
          if (M.k === 'form') { if (k === 'projectKey') M.f.siteKey = ''; if (['type', 'projectKey', 'siteKey', 'mainconId', 'subconId', 'date'].includes(k)) { sanitizeTeam(M); render(); } }
          if (M.k === 'renew' && k === 'doc') { M.f.no = this_no(M); render(); }
        },
        onSubmit() { D.f.kw = D.draft.kw; D.page = 1; render(); },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id;
          // the role guard knows operations; these checks know who the viewer is (a button can be forced from the console, so the screen's own rules are repeated here)
          const pid = id || (D.modal && D.modal.id); const x = pid && ptw.get(pid); const p = party();
          const deny = (x && !visible().some((v) => v.id === x.id))
            || (x && ['ptw-edit-swap', 'ptw-edit-swap-ok', 'ptw-edit-renew', 'ptw-edit-renew-ok', 'ptw-edit-cancel', 'ptw-edit-cancel-ok', 'ptw-refresher'].includes(a) && !ownsEdit(x))
            || (x && ['ptw-approve', 'ptw-reject', 'ptw-reject-ok', 'ptw-edit-start', 'ptw-edit-close', 'ptw-edit-close-ok'].includes(a) && (p === 'subcon' || (p === 'maincon' && x.mainconId !== (org() || {}).id)))
            || (['ptw-approve-override', 'ptw-approve-override-ok'].includes(a) && p !== 'employer')
            || (['ptw-new', 'ptw-new-ok'].includes(a) && p === 'maincon');
          if (deny) { D.modal = null; toast(t('pm.noOp'), 'warn'); render(); return true; }
          switch (a) {
            case 'noop': break;
            case 'ptw-page': D.page = +b.dataset.p; render(); break;
            case 'ptw-filter': D.f.state = b.dataset.s; D.page = 1; render(); break;
            case 'ptw-export': exportCsv(); break;
            case 'ptw-view': D.modal = { k: 'view', id }; render(); break;
            case 'ptw-kchat': if (!ctx.go('kchat', {})) toast(t('pm.noOp'), 'warn'); break;
            case 'ptw-new': D.modal = { k: 'form', f: blank(), errs: {} }; render(); break;
            case 'ptw-new-ok': { const M = D.modal; if (p === 'subcon' && org()) M.f.subconId = org().id; const r = ptw.create(M.f); if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; } D.modal = null; D.f.state = ''; render(); toast(t('ptw.t.created', { id: r.permit.id }), 'ok'); break; }
            case 'ptw-approve': flow(ptw.approve(id), 'ptw.t.approved'); break;
            case 'ptw-reject': D.modal = { k: 'reject', id, ok: 'ptw-reject-ok', f: { note: '' }, errs: {} }; render(); break;
            case 'ptw-reject-ok': flow(ptw.reject(D.modal.id, D.modal.f.note), 'ptw.t.rejected'); break;
            case 'ptw-edit-start': flow(ptw.start(id), 'ptw.t.started'); break;
            case 'ptw-edit-close': D.modal = { k: 'close', id, ok: 'ptw-edit-close-ok', f: { note: '' }, errs: {} }; render(); break;
            case 'ptw-edit-close-ok': flow(ptw.close(D.modal.id, D.modal.f.note), 'ptw.t.closed'); break;
            case 'ptw-edit-cancel': D.modal = { k: 'cancel', id, ok: 'ptw-edit-cancel-ok', f: { note: '' }, errs: {} }; render(); break;
            case 'ptw-edit-cancel-ok': flow(ptw.cancel(D.modal.id, D.modal.f.note), 'ptw.t.cancelled'); break;
            case 'ptw-approve-override': D.modal = { k: 'override', id, ok: 'ptw-approve-override-ok', f: { note: '' }, errs: {} }; render(); break;
            case 'ptw-approve-override-ok': { const M = D.modal; const r = ptw.override(M.id, M.f.note); if (!r.ok && r.error === 'note') { M.errs = { note: 'note_len' }; render(); break; } flow(r, 'ptw.t.overridden'); break; }
            case 'ptw-edit-swap': D.modal = { k: 'swap', id, out: b.dataset.e, f: { in: '' }, errs: {} }; render(); break;
            case 'ptw-edit-swap-ok': { const M = D.modal; if (!M.f.in) { M.errs = { in: 'pick' }; render(); break; } const r = ptw.swap(M.id, M.out, M.f.in); if (!r.ok && (r.error === 'unfit' || r.error === 'candidate')) { M.errs = { in: 'unfit' }; render(); break; } flow(r, 'ptw.t.swapped'); break; }
            case 'ptw-refresher': {
              const course = BS.train.courseForCert(b.dataset.ty);
              if (!course) { toast(t('trn.t.refresherNone'), 'warn'); break; }
              if (!ctx.go('train', { courseId: course.id, trainees: [b.dataset.e] })) toast(t('pm.noOp'), 'warn');
              break;
            }
            case 'ptw-edit-renew': { const e = hr.emp(b.dataset.e); const k = b.dataset.k, ty = b.dataset.ty; const cur = ty ? e.certs.find((c) => c.type === ty) : null; D.modal = { k: 'renew', id, e: b.dataset.e, f: { doc: k + ':' + ty, expiry: '', no: k === 'cert' ? (cur ? cur.no : '') : k === 'passport' ? e.passportNo || '' : '' }, errs: {} }; render(); break; }
            case 'ptw-edit-renew-ok': {
              const M = D.modal; const [kind, type] = M.f.doc.split(':'); const r = ptw.renew(M.e, { kind, type, expiry: M.f.expiry, no: M.f.no });
              if (!r.ok) { const er = r.errors || {}; const ex = er.expiry || er.date || null; M.errs = { expiry: ex === 'past' ? 'renew_past' : ex === 'date' ? 'expiry' : ex, no: er.no || er.ref || null }; if (!M.f.expiry) M.errs.expiry = 'expiry'; render(); break; }
              D.modal = null; render(); toast(t('ptw.t.renewed'), 'ok'); break;
            }
            case 'close-modal': D.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.f = { kw: '', state: '' }; D.draft = { kw: '' }; D.page = 1; D.modal = null; },
      };
      function this_no(M) { const e = hr.emp(M.e); const [kind, type] = M.f.doc.split(':'); if (kind === 'cert') { const c = e.certs.find((x) => x.type === type); return c ? c.no : ''; } return kind === 'passport' ? e.passportNo || '' : ''; }
    },
  });
})(window.BS);
