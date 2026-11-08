/* Admin: 培训预订 (training hub) on the Course Atlas snapshot — course catalogue, schedule matrix, map of centres, provider comparison, conflict advisor, enrolment requests and the data sources.
   Course Atlas lists what providers publish; a request is recorded here, the employer registers on the provider's own page, then marks it registered, confirmed and completed.
   Employer administrators request for people in their scope and answer workers' asks; a subcontractor requests for its own workers only and sees only its own requests. */
(function (BS) {
  const { html, icon } = BS;
  const P = BS.perm, hr = BS.hr, train = BS.train;
  const today = () => BS.fmt.now().slice(0, 10);
  const PAGE = 9;
  const FLOW = ['asked', 'requested', 'registered', 'confirmed', 'completed'];
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

  BS.registerAdmin({
    id: 'train', nav: 'a.nav.train', stores: [hr, train, BS.leaveReq, ...BS.modules.stores(['ptw']), BS.dep, BS.wallet],
    tabs() { const all = [{ id: 'catalog', k: 'trn.tab.catalog' }, { id: 'matrix', k: 'trn.tab.matrix' }, { id: 'centres', k: 'trn.tab.centres' }, { id: 'compare', k: 'trn.tab.compare' }, { id: 'advisor', k: 'trn.tab.advisor' }, { id: 'requests', k: 'trn.tab.requests' }, { id: 'sources', k: 'trn.tab.sources' }]; return P.party() === 'employer' ? all : all.slice(0, 6); },
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const F0 = () => ({ kw: '', lang: '', provider: '', from: '', maxFee: '', certOnly: '' });
      const topProviders = () => train.providers().map((p, i) => ({ i, n: train.providerStats(i).list.length })).sort((a, b) => b.n - a.n).slice(0, 4).map((x) => x.i);
      const D = { tab: 'catalog', f: F0(), draft: F0(), page: 1, mx: { groupId: 'cert:CSOC', start: today() }, cf: { groupId: '', lang: '' }, sel: '', cmp: topProviders(), adv: '', rq: { kw: '', state: '' }, rqDraft: { kw: '' }, modal: null, preset: [] };
      const party = () => P.party(); const org = () => P.orgOf(P.current()); const can = (op) => P.can('train', op);
      const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
      const money = (n) => 'S$ ' + Number(n).toFixed(2);
      const range = (r) => (r.dates.length > 1 ? `${r.start} → ${r.end}` : r.start);
      const spanOf = (i) => (i.d.length > 1 ? `${i.start} → ${i.end}` : i.start);
      const langName = (l) => (l ? t('trn.lang.' + l) : t('trn.lang.none'));
      const tradeName = (c) => { const x = hr.trade(c); return x ? (z() ? x.zh : x.en) : c; };
      const accName = (id) => { const a = P.account(id); return a ? (z() ? a.name : a.nameEn || a.name) : (id === 'system' ? t('ptw.sys') : String(id)); };
      const provName = (i) => train.providerName(i);
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
      const pad = (n) => String(n).padStart(2, '0');

      // ---------- who may be requested for, which requests are seen ----------
      const canEmp = (e) => (party() === 'employer' ? P.inScopeEmp(e) : !!org() && BS.dep.subconOf(e) === org().id);
      const myRequests = () => train.requests().filter((r) => (party() === 'employer' ? r.trainees.some((no) => P.inScope(no)) || (r.askedBy && P.inScope(r.askedBy)) : !!org() && r.orgId === org().id));
      const canTouch = (r) => (party() === 'employer' ? true : !!org() && r.orgId === org().id);

      // ---------- shared bits ----------
      const reqTag = { asked: 'pending', requested: 'pending', registered: 'sub-upcoming', confirmed: 'approved', completed: 'approved', declined: 'rejected', cancelled: 'withdrawn' };
      const feeBlock = (i) => {
        if (i.f == null) return html`<span class="a-tag withdrawn">${t('trn.fee.none')}</span>`; const e = train.estimate(i.f);
        return html`<span class="tr-net">${money(i.f)}</span> <small class="mute">${i.gst === 'excluded' ? t('trn.fee.exGst') : i.gst === 'included' ? t('trn.fee.inGst') : ''}</small><br><small class="mute">${t('trn.fee.est', { n: money(e.net) })}</small>`;
      };
      const availTag = (i) => (i.a === 'available' ? html`<span class="a-tag approved">${t('trn.avail.yes')}${i.s != null ? ' · ' + t('trn.avail.seats', { n: i.s }) : ''}</span>` : html`<span class="a-tag withdrawn">${t('trn.avail.unknown')}</span>`);
      const tyTag = (i) => (['recertification', 'refresher'].includes(i.ty) ? html`<span class="a-tag sub-upcoming">${t('trn.ty.' + i.ty)}</span>` : '');
      const provLink = (i, label) => (safeUrl(i.u) ? html`<a class="a-link" href="${i.u}" target="_blank" rel="noopener noreferrer" data-link="provider">${label || t('trn.open')} ↗</a>` : html`<span class="mute">${t('trn.nolink')}</span>`);
      function clashText(c) {
        if (c.kind === 'leave') return t('trn.cl.leave', { ref: c.ref, a: c.from, b: c.to, s: t('lv.st.' + c.status) });
        if (c.kind === 'training') return t('trn.cl.training', { ref: c.ref, a: c.from, b: c.to });
        return t('trn.cl.permit', { ref: c.ref, a: c.from });
      }
      const clashTag = (kind) => html`<span class="a-tag ${kind === 'training' ? 'rejected' : 'pending'}">${t('trn.ck.' + kind)}</span>`;
      const certName = (c) => (c ? t('trn.certName.' + c) : '');
      const filterBits = () => {
        const f = D.f; const d = D.draft; const sel = (key, label, opts) => html`<label class="a-in"><select data-f="${key}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, n]) => html`<option value="${v}" ${String(d[key]) === String(v) ? 'selected' : ''}>${n}</option>`)}</select></label>`;
        void f; return html`<label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('trn.f.kw')}" aria-label="${t('trn.f.kw')}"></label>
          ${sel('lang', t('trn.f.lang'), train.languages().map((l) => [l, langName(l)]))}${sel('provider', t('trn.f.provider'), train.providers().map((p, i) => [i, provName(i)]))}
          <label class="a-in"><input type="date" data-f="from" value="${d.from}" aria-label="${t('trn.f.from')}" title="${t('trn.f.from')}"></label>
          <label class="a-in"><input type="number" min="0" step="10" data-f="maxFee" value="${d.maxFee}" placeholder="${t('trn.f.maxFee')}" aria-label="${t('trn.f.maxFee')}" class="tr-num"></label>
          <label class="p-check"><input type="checkbox" data-f="certOnly" ${d.certOnly ? 'checked' : ''}> ${t('trn.f.certOnly')}</label>`;
      };

      // ---------- catalogue ----------
      function catalogPage() {
        const list = train.catalogue(D.f); const pages = Math.max(1, Math.ceil(list.length / PAGE)); if (D.page > pages) D.page = pages; const slice = list.slice((D.page - 1) * PAGE, D.page * PAGE);
        const A = train.meta();
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.cat.title')}</h1><p class="a-sub">${t('trn.cat.sub')}</p></div></div>
          ${train.has() ? '' : html`<p class="p-warnbox" role="alert">${icon('warn', 16)} ${t('trn.nodata')}</p>`}
          ${train.stale() ? html`<p class="p-warnbox" role="alert" data-role="stale">${icon('warn', 16)} ${t('trn.stale', { d: A.last })}</p>` : ''}
          ${D.f.locId ? html`<p class="a-scopebar" role="note">${icon('pin', 14)} ${t('trn.cat.centreOnly', { n: (train.location(D.f.locId) || {}).name || D.f.locId })} <button type="button" class="a-link" data-act="trn-centre-clear">${t('trn.cat.clear')}</button></p>` : ''}
          <section class="a-card"><form class="a-filters" autocomplete="off">${filterBits()}<span class="a-fgrow"></span><button type="button" class="a-btn" data-act="trn-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form></section>
          <div class="tr-grid">${slice.length ? slice.map(courseCard) : html`<section class="a-card"><div class="a-none"><p>${t('trn.none')}</p></div></section>`}</div>
          <footer class="a-pager"><span>${t('trn.count', { n: list.length, m: list.reduce((n, e) => n + e.intakes.length, 0) })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${D.page === i + 1 ? 'on' : ''}" data-act="trn-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer>
          <p class="l-audit">${icon('shield', 14)} ${t('trn.cat.note')}</p>`;
      }
      function courseCard({ group: g, intakes }) {
        const provs = [...new Set(intakes.map((i) => i.p))]; const fees = train.feeRange(intakes); const next = intakes[0]; const langs = [...new Set(intakes.map((i) => i.l).filter(Boolean))];
        const open = intakes.filter((i) => i.a === 'available').length;
        return html`<article class="a-card tr-course" data-course="${g.id}">
          <header class="tr-ch">${g.cert ? html`<span class="a-tag approved">${icon('shield', 12)} ${t('trn.renews', { c: certName(g.cert) })}</span>` : html`<span class="a-tag sub-upcoming">${t('trn.cat.course')}</span>`}<span class="tr-cert">${t('trn.intakesN', { n: intakes.length })}</span></header>
          <h3 class="pt-title">${g.title}</h3>${g.alias ? html`<p class="tr-desc">${g.alias}</p>` : ''}
          <div class="tr-box"><div class="tr-box-h"><b>${t('trn.provN', { n: provs.length })}</b><span class="a-tag ${open ? 'approved' : 'withdrawn'}">${open ? t('trn.openN', { n: open }) : t('trn.avail.unknown')}</span></div>
            <div class="tr-centres">${provs.slice(0, 3).map((p) => html`<span class="tr-cc">${provName(p)}</span>`)}${provs.length > 3 ? html`<span class="tr-cc">+${provs.length - 3}</span>` : ''}</div>
            <p class="tr-next">${icon('cal', 13)} ${t('trn.next')}: <b>${next.start}</b> · ${provName(next.p)}</p><p class="tr-next mute">${langs.map(langName).join(', ') || '—'}</p></div>
          <footer class="tr-foot"><div><small class="mute">${t('trn.fee.range')}</small><div>${fees ? html`<span class="tr-net">${fees[0] === fees[1] ? money(fees[0]) : money(fees[0]) + ' – ' + money(fees[1])}</span>` : html`<span class="a-tag withdrawn">${t('trn.fee.none')}</span>`}</div></div>
            <div class="tr-btns">${can('create') ? html`<button type="button" class="a-btn" data-act="trn-new" data-i="${next.id}">${icon('clock', 14)} ${t('trn.quick')}</button>` : ''}<button type="button" class="a-btn primary" data-act="trn-detail" data-id="${g.id}">${t('trn.compareN', { n: intakes.length })}</button></div></footer></article>`;
      }
      function detailModal() {
        const M = D.modal; const g = train.group(M.groupId); if (!g) return ''; const all = train.intakes({ ...D.f, groupId: g.id }); const MAXI = 60; const shown = all.slice(0, MAXI);
        const provs = [...new Set(shown.map((i) => i.p))];
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${g.title}</h2><p>${g.cert ? t('trn.renews', { c: certName(g.cert) }) + ' · ' : ''}${t('trn.compareSub', { n: all.length, p: new Set(all.map((i) => i.p)).size })}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody">${D.preset.length ? html`<p class="a-scopebar" role="note">${icon('users', 14)} ${t('trn.preset', { n: D.preset.map((no) => nm(hr.emp(no))).join('、') })}</p>` : ''}
            ${provs.length ? provs.map((p) => { const rows = shown.filter((i) => i.p === p); const pr = train.provider(p); return html`<section class="tr-centre" data-provider="${p}"><header><div><b>${provName(p)}</b><div class="mute">${(pr.frameworks || []).join(' · ')}</div></div><div class="tr-rt">${safeUrl(pr.site) ? html`<a class="a-link" href="${pr.site}" target="_blank" rel="noopener noreferrer">${t('trn.site')} ↗</a>` : ''}</div></header>
              <div class="tr-batches">${rows.map((i) => html`<div class="tr-batch" data-intake="${i.id}"><div><b>${icon('cal', 13)} ${spanOf(i)}</b> <span class="a-tag sub-upcoming">${langName(i.l)}</span> ${tyTag(i)}<div class="mute">${i.tm || t('trn.notime')} · ${icon('pin', 12)} ${i.v || t('trn.novenue')}${i.loc ? '' : ' · ' + t('trn.unmapped')}</div></div><div class="tr-bp">${feeBlock(i)}<br>${availTag(i)}</div>
                <div class="tr-btns">${provLink(i, t('trn.provider'))}${can('create') ? html`<button type="button" class="a-btn primary sm" data-act="trn-new" data-i="${i.id}">${t('trn.requestBtn')}</button>` : ''}</div></div>`)}</div></section>`; }) : html`<p class="a-fhint">${t('trn.noIntake')}</p>`}
            ${all.length > MAXI ? html`<p class="a-fhint">${t('trn.moreIntakes', { n: all.length - MAXI })}</p>` : ''}
          </div><footer><small class="mute">${icon('clock', 12)} ${t('trn.handHint')}</small><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }

      // ---------- schedule matrix ----------
      function matrixPage() {
        const groups = train.catalogue({}).map((e) => e.group); if (!groups.some((g) => g.id === D.mx.groupId) && groups[0]) D.mx.groupId = groups[0].id;
        const M = D.mx; const days = Array.from({ length: 10 }, (_, i) => hr.addDays(M.start, i)); const list = train.intakes({ groupId: M.groupId });
        const provs = [...new Set(list.map((i) => i.p))];
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.mx.title')}</h1><p class="a-sub">${t('trn.mx.sub')}</p></div></div>
          <section class="a-card tr-bar"><div class="a-filters"><label class="a-in"><select data-mx="groupId" aria-label="${t('trn.mx.course')}">${groups.map((g) => html`<option value="${g.id}" ${M.groupId === g.id ? 'selected' : ''}>${g.cert ? '★ ' : ''}${g.title}</option>`)}</select></label><span class="a-fgrow"></span>
            <button type="button" class="a-btn" data-act="trn-mx-prev" ${M.start <= today() ? 'disabled' : ''}>‹ ${t('trn.mx.prev')}</button><button type="button" class="a-btn" data-act="trn-mx-next">${t('trn.mx.next')} ›</button></div></section>
          <section class="a-card"><div class="a-tablewrap"><table class="a-table tr-mx"><thead><tr><th>${t('trn.mx.provider')}</th>${days.map((d) => html`<th class="${[0, 6].includes(new Date(d + 'T00:00:00').getDay()) ? 'wk' : ''}">${d.slice(5)}<small>${t('trn.dow.' + new Date(d + 'T00:00:00').getDay())}</small></th>`)}</tr></thead>
            <tbody>${provs.length ? provs.map((p) => html`<tr data-provider="${p}"><th class="tr-mxc"><b>${provName(p)}</b><small>${t('trn.intakesN', { n: list.filter((i) => i.p === p).length })}</small></th>${days.map((d) => { const here = list.filter((i) => i.p === p && i.start === d);
              if (!here.length) return html`<td class="none">—</td>`; const i = here[0];
              return html`<td class="cell ${i.a === 'available' ? 'ok' : 'off'}" data-intake="${i.id}"><span class="tr-seat">${langName(i.l)}${i.d.length > 1 ? ' · ' + i.d.length + 'd' : ''}</span><small>${i.f != null ? money(i.f) : t('trn.fee.none')}</small><small>${i.a === 'available' ? t('trn.avail.yes') : t('trn.avail.unknown')}</small>${here.length > 1 ? html`<small>+${here.length - 1}</small>` : ''}${can('create') ? html`<button type="button" class="a-link" data-act="trn-new" data-i="${i.id}">${t('trn.requestBtn')}</button>` : ''}</td>`; })}</tr>`) : html`<tr><td colspan="11" class="mute">${t('trn.noIntake')}</td></tr>`}</tbody></table></div>
            <p class="tr-legend"><span class="tr-seat ok">${t('trn.mx.ok')}</span> <span class="tr-seat none">${t('trn.mx.off')}</span> <span class="mute">· ${t('trn.mx.note')}</span></p></section>`;
      }

      // ---------- map of centres ----------
      function centresData() {
        const c = D.cf; const list = train.intakes({ groupId: c.groupId, lang: c.lang }); const mp = train.mapPlaces(list);
        return { list, ...mp, places: mp.places.sort((a, b) => b.count - a.count || a.loc.name.localeCompare(b.loc.name)) };
      }
      function centresPage() {
        const c = D.cf; const R = centresData(); const groups = train.catalogue({}).map((e) => e.group); const sel = D.sel && R.places.find((x) => x.loc.id === D.sel); const here = sel ? R.list.filter((i) => i.loc === D.sel) : [];
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.map.title')}</h1><p class="a-sub">${t('trn.map.sub')}</p></div></div>
          <section class="a-card tr-bar"><div class="a-filters"><label class="a-in"><select data-cf="groupId" aria-label="${t('trn.mx.course')}"><option value="">${t('trn.map.allCourses')}</option>${groups.map((g) => html`<option value="${g.id}" ${c.groupId === g.id ? 'selected' : ''}>${g.cert ? '★ ' : ''}${g.title}</option>`)}</select></label>
            <label class="a-in"><select data-cf="lang" aria-label="${t('trn.f.lang')}"><option value="">${t('trn.f.lang')}</option>${train.languages().map((l) => html`<option value="${l}" ${c.lang === l ? 'selected' : ''}>${langName(l)}</option>`)}</select></label></div>
            <small class="a-fhint">${t('trn.map.count', { p: R.places.length, n: R.list.length - R.unmapped, u: R.unmapped })}</small></section>
          <div class="tr-maprow"><div class="tr-mapcol"><div class="tr-mapslot" data-map-slot="train"></div></div>
            <div class="tr-maplist" role="list" aria-label="${t('trn.map.list')}">
              ${R.places.length ? R.places.map(({ loc, count }) => html`<article class="a-card tr-loc ${D.sel === loc.id ? 'sel' : ''}" role="listitem" data-loc="${loc.id}"><button type="button" class="tr-loc-b" data-act="trn-loc" data-id="${loc.id}"><b>${loc.name}</b><small class="mute">${loc.address || ''}</small><span class="a-tag sub-upcoming">${t('trn.intakesN', { n: count })}</span></button></article>`) : html`<section class="a-card"><div class="a-none"><p>${t('trn.none')}</p></div></section>`}</div></div>
          ${sel ? html`<section class="a-card tr-locdet" data-role="locdet"><header class="dm-dh"><div><span class="tr-code">${t('trn.map.centre')}</span><h2>${sel.loc.name}</h2><p class="mute">${icon('pin', 12)} ${sel.loc.address || ''} · ${t('trn.map.basis.' + (sel.loc.basis === 'provider_address' ? 'addr' : 'venue'))}</p></div><button type="button" class="a-btn" data-act="trn-centre" data-id="${sel.loc.id}">${t('trn.map.seeAll', { n: here.length })}</button></header>
            <div class="tr-batches">${here.slice(0, 8).map((i) => html`<div class="tr-batch" data-intake="${i.id}"><div><b>${(train.group(i.g) || {}).title || i.t}</b><div class="mute">${icon('cal', 13)} ${spanOf(i)} · ${langName(i.l)} · ${provName(i.p)}</div></div><div class="tr-bp">${feeBlock(i)}</div><div class="tr-btns">${provLink(i, t('trn.provider'))}${can('create') ? html`<button type="button" class="a-btn primary sm" data-act="trn-new" data-i="${i.id}">${t('trn.requestBtn')}</button>` : ''}</div></div>`)}</div></section>` : ''}
          <p class="l-audit">${icon('shield', 14)} ${t('trn.map.note', { a: (train.meta() || {}).attribution || '' })}</p>`;
      }
      function mountMap(v) {
        const host = v.querySelector('[data-map-slot=train]'); if (!host) return; const s = BS.map.slot('train'); s.mount(host);
        const R = centresData(); const pins = R.places.map(({ loc, count }) => ({ id: loc.id, kind: 'centre', lat: loc.lat, lng: loc.lng, count, label: `${loc.name} · ${t('trn.intakesN', { n: count })}`, selected: loc.id === D.sel }));
        s.set({ pins, lines: [], lang: lang(), fitText: t('dm.map.fit'), fitKey: R.places.map((x) => x.loc.id).join(',') + '|' + D.cf.groupId + '|' + D.cf.lang, legend: [{ cls: 'centre', text: t('trn.map.leg') }, { cls: 'sel', text: t('dm.map.leg.sel') }],
          onSelect: (ids) => { D.sel = ids[0]; render(); const card = ctx.view().querySelector(`[data-loc="${ids[0]}"]`); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
      }

      // ---------- provider comparison ----------
      function comparePage() {
        const ps = D.cmp.filter((i) => train.provider(i)); const st = ps.map((i) => train.providerStats(i));
        const row = (label, fn) => html`<tr><th>${label}</th>${ps.map((p, k) => html`<td>${fn(st[k], p)}</td>`)}</tr>`;
        const fr = (s) => (s.fees ? (s.fees[0] === s.fees[1] ? money(s.fees[0]) : money(s.fees[0]) + ' – ' + money(s.fees[1])) : t('trn.fee.none'));
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.cmp.title')}</h1><p class="a-sub">${t('trn.cmp.sub')}</p></div></div>
          <section class="a-card tr-bar"><b>${t('trn.cmp.pick')}</b><div class="hr-chips">${train.providers().map((p, i) => html`<button type="button" class="${D.cmp.includes(i) ? 'on' : ''}" data-act="trn-cmp" data-id="${i}" aria-pressed="${D.cmp.includes(i) ? 'true' : 'false'}">${D.cmp.includes(i) ? '✓ ' : '+ '}${provName(i)}</button>`)}</div><small class="a-fhint">${t('trn.cmp.hint')}</small></section>
          <section class="a-card"><div class="a-tablewrap"><table class="a-table tr-cmp"><thead><tr><th>${t('trn.cmp.feature')}</th>${ps.map((i) => html`<th><b>${provName(i)}</b><button type="button" class="a-btn sm primary" data-act="trn-prov" data-id="${i}">${t('trn.cmp.view')} →</button></th>`)}</tr></thead><tbody>
            ${row(t('trn.cmp.frameworks'), (s, i) => html`<div class="tr-amen col">${(train.provider(i).frameworks || []).map((f) => html`<span>✓ ${f}</span>`)}</div>`)}
            ${row(t('trn.cmp.courses'), (s) => t('trn.cmp.coursesN', { n: s.courses, m: s.list.length }))}${row(t('trn.cmp.lang'), (s) => s.langs.map(langName).join(', ') || '—')}
            ${row(t('trn.cmp.fee'), (s) => html`<b>${fr(s)}</b><small class="hr-sub">${t('trn.cmp.feeN', { n: s.withFee, m: s.list.length })}</small>`)}
            ${row(t('trn.cmp.venues'), (s) => html`${s.locs.length ? s.locs.map((l) => html`<div>${icon('pin', 12)} ${l.name}</div>`) : '—'}${s.venueless ? html`<small class="hr-sub">${t('trn.cmp.venueless', { n: s.venueless })}</small>` : ''}`)}
            ${row(t('trn.cmp.next'), (s) => (s.next ? html`<b>${s.next.start}</b><small class="hr-sub">${(train.group(s.next.g) || {}).title || s.next.t}</small>` : '—'))}
            ${row(t('trn.cmp.open'), (s) => t('trn.cmp.openN', { n: s.available, m: s.list.length }))}${row(t('trn.cmp.checked'), (s) => s.checked || '—')}
            ${row(t('trn.cmp.site'), (s, i) => (safeUrl(train.provider(i).site) ? html`<a class="a-link" href="${train.provider(i).site}" target="_blank" rel="noopener noreferrer">${t('trn.site')} ↗</a>` : '—'))}</tbody></table></div></section>`;
      }

      // ---------- conflict advisor ----------
      function advisorPage() {
        const all = train.conflicts().filter((c) => { const r = train.request(c.requestId); return r && canTouch(r) && (party() !== 'employer' || P.inScope(c.empNo)) && (party() === 'employer' || canEmp(hr.emp(c.empNo))); });
        const rows = all.filter((c) => !D.adv || c.kind === D.adv); const n = (k) => all.filter((c) => c.kind === k).length;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.adv.title')}</h1><p class="a-sub">${t('trn.adv.sub')}</p></div></div>
          <div class="dp-kpis">${[['trn.adv.k.active', all.length, all.length ? 'blocked' : 'granted'], ['trn.adv.k.leave', n('leave'), 'requested'], ['trn.adv.k.training', n('training'), 'requested'], ['trn.adv.k.permit', n('permit'), 'requested']].map(([lab, v, cls]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card"><div class="hr-chips pt-filters" role="group">${['', 'leave', 'training', 'permit'].map((k) => html`<button type="button" class="${D.adv === k ? 'on' : ''}" data-act="trn-adv" data-k="${k}">${k ? t('trn.ck.' + k) : t('dep.f.all')}</button>`)}</div></section>
          ${rows.length ? html`<section class="a-card"><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('trn.bk.ref')}</th><th>${t('dep.c.worker')}</th><th>${t('trn.adv.clash')}</th><th>${t('trn.adv.detail')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead><tbody>${rows.map((c) => { const r = train.request(c.requestId); const e = hr.emp(c.empNo);
            return html`<tr data-clash="${c.requestId}:${c.empNo}"><td><b>${c.requestId}</b><small class="hr-sub">${r.title} · ${range(r)}</small></td><td><b>${nm(e)}</b><small class="hr-sub">${c.empNo}</small></td><td>${clashTag(c.kind)}${c.overridden ? html` <span class="a-tag pending">${t('trn.overridden')}</span>` : ''}</td><td class="mute" style="white-space:normal">${clashText(c)}</td>
              <td class="c-act">${can('update') ? html`<button type="button" class="a-link" data-act="trn-edit-swap" data-id="${c.requestId}" data-e="${c.empNo}">${t('trn.autoSwap')}</button>${r.trainees.length > 1 ? html`<button type="button" class="a-link bad" data-act="trn-edit-drop" data-id="${c.requestId}" data-e="${c.empNo}">${t('trn.remove')}</button>` : ''}` : ''}<button type="button" class="a-link" data-act="trn-alt" data-id="${c.requestId}" data-e="${c.empNo}">${t('trn.adv.find')}</button></td></tr>`; })}</tbody></table></div></section>`
            : html`<section class="a-card tr-zero"><div>${icon('check', 40)}<h3>${t('trn.adv.zero')}</h3><p class="mute">${t('trn.adv.zeroSub')}</p></div></section>`}
          <p class="l-audit">${icon('shield', 14)} ${t('trn.adv.rules')}</p>`;
      }

      // ---------- requests ----------
      function requestRows() {
        const f = D.rq, kw = f.kw.trim().toLowerCase();
        return myRequests().filter((r) => (!f.state || r.status === f.state) && (!kw || r.id.toLowerCase().includes(kw) || r.title.toLowerCase().includes(kw) || r.provider.toLowerCase().includes(kw) || r.trainees.some((no) => { const e = hr.emp(no); return no.toLowerCase().includes(kw) || (e && (e.name.toLowerCase().includes(kw) || (e.nameEn || '').toLowerCase().includes(kw) || e.idMask.toLowerCase().includes(kw))); }))).sort((a, b) => (+(b.status === 'asked') - +(a.status === 'asked')) || b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
      }
      function requestsPage() {
        const rows = requestRows(); const cnt = (s) => myRequests().filter((r) => !s || r.status === s).length; const states = ['', 'asked', 'requested', 'registered', 'confirmed', 'completed', 'declined', 'cancelled'];
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.bk.title')}</h1><p class="a-sub">${t('trn.bk.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="trn-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="trn-goto-catalog">${icon('plus', 16)} ${t('trn.bk.new')}</button></div></div>
          <section class="a-card pt-bar"><form class="a-filters" autocomplete="off"><label class="a-in a-search">${icon('search', 16)}<input data-rq="kw" value="${D.rqDraft.kw}" placeholder="${t('trn.bk.kw')}" aria-label="${t('trn.bk.kw')}"></label><span class="a-fgrow"></span><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="hr-chips pt-filters" role="group">${states.map((s) => html`<button type="button" class="${D.rq.state === s ? 'on' : ''}" data-act="trn-rqf" data-s="${s}">${s ? t('trn.st.' + s) : t('dep.f.all')} (${cnt(s)})</button>`)}</div></section>
          ${rows.length ? rows.map(requestCard) : html`<section class="a-card"><div class="a-none"><p>${t('trn.bk.none')}</p></div></section>`}
          <footer class="a-pager"><span>${t('trn.bk.count', { n: rows.length })}</span></footer>`;
      }
      function stepper(r) {
        const idx = FLOW.indexOf(r.status); const dead = ['declined', 'cancelled'].includes(r.status);
        return html`<ol class="tr-steps" aria-label="${t('trn.steps')}">${FLOW.filter((s) => s !== 'asked' || r.source === 'worker').map((s) => html`<li class="${dead ? '' : FLOW.indexOf(s) < idx ? 'done' : FLOW.indexOf(s) === idx ? 'now' : ''}">${t('trn.st.' + s)}</li>`)}</ol>`;
      }
      function requestCard(r) {
        const intake = train.intake(r.intakeId); const upcoming = r.start > today(); const emp = party() === 'employer'; const open = ['requested', 'registered', 'confirmed'].includes(r.status);
        const n = r.trainees.length; const total = r.fee == null ? null : train.estimate(r.fee).net * n;
        return html`<article class="a-card tr-bk" data-booking="${r.id}" data-state="${r.status}">
          <header class="pt-h"><div class="pt-tags"><span class="tr-code">${r.id}</span><span class="a-tag ${reqTag[r.status]}">${t('trn.st.' + r.status)}</span>${r.source === 'worker' ? html`<span class="a-tag sub-upcoming">${t('trn.fromWorker')}</span>` : ''}${r.override ? html`<span class="a-tag pending">${t('trn.overridden')}</span>` : ''}<span class="mute">${t('trn.bk.on', { d: r.at.slice(0, 10) })}</span></div>
            <div class="tr-money"><b class="${total == null ? 'none' : ''}">${total == null ? t('trn.fee.none') : money(total)}</b><small class="mute">${t('trn.pay.' + r.payment)}${total == null ? '' : ' · ' + t('trn.estimateWord')}</small></div></header>
          <h3 class="pt-title">${r.title}</h3>${stepper(r)}
          <div class="tr-trio"><div><small>${icon('pin', 12)} ${t('trn.bk.venue')}</small><b>${r.provider}</b><span class="mute">${r.venue || t('trn.novenue')}</span></div><div><small>${icon('cal', 12)} ${t('trn.bk.intake')}</small><b>${range(r)}</b><span class="mute">${langName(r.lang)} · ${r.time || t('trn.notime')}</span></div>
            <div><small>${icon('users', 12)} ${t('trn.bk.people', { n })}</small>${r.trainees.map((no) => { const e = hr.emp(no); return html`<span class="tr-pp">${nm(e)} (${e ? e.idMask : no})</span>`; })}</div></div>
          ${r.status === 'asked' ? html`<p class="tr-hand ask">${icon('users', 14)} <span><b>${t('trn.ask.from', { n: nm(hr.emp(r.askedBy)) })}</b>${r.note ? html` — “${r.note}”` : ''}</span></p>` : ''}
          ${r.status === 'requested' ? html`<p class="tr-hand">${icon('upload', 14)} <span><b>${t('trn.hand.next')}</b> ${t('trn.hand.body')}</span> ${intake ? provLink(intake, t('trn.hand.open')) : provLink({ u: r.bookingUrl }, t('trn.hand.open'))}</p>` : ''}
          ${r.ref ? html`<p class="mute">${t('trn.ref')}: <code>${r.ref}</code></p>` : ''}
          ${r.status === 'declined' ? html`<p class="mute">${t('trn.declinedBecause', { r: (r.log.slice().reverse().find((l) => l.type === 'declined') || {}).note || '' })}</p>` : ''}
          <footer class="pt-act"><span class="tr-sync">${t('trn.bk.snap', { d: r.checked || '—' })}</span><span class="pt-asr"></span>
            ${r.status === 'asked' && emp && can('approve') ? html`<button type="button" class="a-btn sm primary" data-act="trn-approve-yes" data-id="${r.id}">${t('trn.ask.approve')}</button><button type="button" class="a-btn sm bad" data-act="trn-approve-decline" data-id="${r.id}">${t('trn.ask.decline')}</button>` : ''}
            ${r.status === 'requested' && can('update') ? html`<button type="button" class="a-btn sm primary" data-act="trn-edit-register" data-id="${r.id}">${t('trn.reg.btn')}</button>` : ''}
            ${r.status === 'registered' && can('update') && emp ? html`<button type="button" class="a-btn sm" data-act="trn-edit-confirm" data-id="${r.id}">${t('trn.conf.btn')}</button>` : ''}
            ${['registered', 'confirmed'].includes(r.status) && can('update') && emp ? html`<button type="button" class="a-btn sm" data-act="trn-edit-complete" data-id="${r.id}" title="${t('trn.bk.completeHint')}">${t('trn.bk.complete')}</button>` : ''}
            ${(r.status === 'asked' || (open && upcoming)) && can('update') && canTouch(r) && !(r.status === 'asked' && emp && can('approve')) ? html`<button type="button" class="a-btn sm bad" data-act="trn-edit-cancel" data-id="${r.id}">${t('trn.bk.cancel')}</button>` : ''}
            <button type="button" class="a-btn sm" data-act="trn-slip" data-id="${r.id}">${icon('search', 14)} ${t('trn.bk.slip')}</button></footer></article>`;
      }
      function slipModal() {
        const r = train.request(D.modal.id); if (!r) return ''; const emp = hr.emp;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('trn.slip.title')}</h2><p>${t('trn.pass.ref', { id: r.id })}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody"><div class="tr-pass-h"><div><small class="mute">${t('trn.slip.kicker')}</small><h3 class="pt-title">${r.title}</h3><p class="mute">${r.provider}${r.cert ? ' · ' + t('trn.renews', { c: certName(r.cert) }) : ''}</p></div><div class="tr-qrbox">${BS.qrSvg(r.id)}<code>${r.id}</code><small class="mute">${t('trn.slip.scan')}</small></div></div>
            <div class="tr-trio"><div><small>${icon('pin', 12)} ${t('trn.bk.venue')}</small><b>${r.venue || t('trn.novenue')}</b><span class="mute">${(train.location(r.locId) || {}).address || t('trn.unmapped')}</span></div><div><small>${icon('cal', 12)} ${t('trn.pass.schedule')}</small><b>${range(r)}</b><span class="mute">${r.time || t('trn.notime')}</span><span class="mute">${t('trn.pass.lang')}: ${langName(r.lang)}</span></div></div>
            <p class="tr-note">${icon('warn', 14)} <span><b>${t('trn.slip.instr')}</b> ${t('trn.slip.instrBody')}</span></p>
            <h3 class="hr-h">${t('trn.pass.trainees', { n: r.trainees.length })} <span class="a-tag ${reqTag[r.status]}">${t('trn.st.' + r.status)}</span></h3>
            <div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>#</th><th>${t('dep.c.worker')}</th><th>${t('hr.f.idNo')}</th><th>${t('hr.f.country')}</th><th>${t('hr.f.trades')}</th>${r.status === 'completed' ? html`<th>${t('trn.pass.result')}</th>` : ''}</tr></thead><tbody>${r.trainees.map((no, i) => { const e = emp(no); return html`<tr><td>${i + 1}</td><td><b>${nm(e)}</b></td><td><code>${e ? e.idMask : ''}</code></td><td>${e && hr.COUNTRIES[e.country] ? hr.COUNTRIES[e.country][z() ? 0 : 1] : ''}</td><td>${e ? e.trades.map(tradeName).join('、') : ''}</td>${r.status === 'completed' ? html`<td><span class="a-tag approved">${t('trn.pass.passed')}</span></td>` : ''}</tr>`; })}</tbody></table></div>
            ${r.override ? html`<p class="a-fhint">${icon('shield', 12)} ${t('trn.pass.ov', { n: accName(r.override.by), r: r.override.note })}</p>` : ''}
            <h3 class="hr-h">${t('dep.d.log')}</h3><ol class="dp-log">${r.log.map((l) => html`<li><b>${t('trn.log.' + l.type)}</b> <span class="mute">${l.at} · ${accName(l.by)}</span>${l.note ? html`<small>${l.note}</small>` : ''}</li>`)}</ol></div>
          <footer><small class="mute">${t('trn.slip.foot')}</small><button type="button" class="a-btn" data-act="trn-print">${icon('file', 14)} ${t('trn.pass.print')}</button><button type="button" class="a-btn primary" data-act="close-modal">${t('trn.pass.close')}</button></footer></div></div>`;
      }

      // ---------- request dialog (new request, or approving a worker's ask) ----------
      function bookModal() {
        const M = D.modal; const asked = M.reqId ? train.request(M.reqId) : null; const i = asked ? (train.intake(asked.intakeId) || asked) : train.intake(M.intakeId); if (!i) return '';
        const dates = i.d || i.dates; const f = M.f; const canOv = party() === 'employer' && can('approve'); const fee = i.f !== undefined ? i.f : i.fee; const price = fee == null ? null : train.estimate(fee);
        const a = train.analyse(dates, f.trainees, M.reqId); const q = f.q.trim().toLowerCase();
        const pool = hr.emps().filter((e) => e.status === 'active' && canEmp(e) && (!q || e.name.toLowerCase().includes(q) || (e.nameEn || '').toLowerCase().includes(q) || e.empNo.toLowerCase().includes(q)));
        const shown = [...pool.filter((e) => f.trainees.includes(e.empNo)), ...pool.filter((e) => !f.trainees.includes(e.empNo))].slice(0, 14);
        const unresolved = a.any && !(f.override && f.note.trim().length >= 10 && a.overridable && canOv);
        const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('trn.e.' + M.errs[k])}${k === 'payment' && M.errs._short ? ' (' + M.errs._short.map((n) => nm(hr.emp(n))).join('、') + ')' : ''}</small>` : '');
        const title = asked ? asked.title : (train.group(i.g) || {}).title || i.t; const provIdx = i.p; const provText = asked ? asked.provider : provName(provIdx);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl tr-book" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header class="dark"><div><span class="tr-code">${t(asked ? 'trn.m.kickerAsk' : 'trn.m.kicker')}</span><h2 id="a-mt">${title}</h2><p>${provText} · ${dates.length > 1 ? dates[0] + ' → ' + dates[dates.length - 1] : dates[0]} · ${langName(i.l || i.lang)} · ${i.tm || i.time || t('trn.notime')}</p></div><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody l-form">
            <p class="tr-hand">${icon('upload', 14)} <span><b>${t('trn.m.handTitle')}</b> ${t('trn.m.handBody')}</span></p>
            ${a.any ? html`<div class="tr-alert" data-role="advisor"><div class="tr-alert-h">${icon('shield', 18)}<div><b>${t('trn.m.alert', { n: Object.values(a.byEmp).filter((x2) => x2.length).length })}</b><small>${t('trn.m.alertSub')}</small></div><span class="a-tag rejected">${t('trn.m.blocked')}</span></div>
              ${f.trainees.filter((no) => a.byEmp[no].length).map((no) => html`<div class="tr-alert-row" data-clash-emp="${no}"><div><b>${nm(hr.emp(no))}</b> <span class="mute">(${no})</span>${a.byEmp[no].map((cl) => html`<p>${clashTag(cl.kind)} ${clashText(cl)}</p>`)}</div>${asked ? '' : html`<div class="tr-alert-act"><button type="button" class="a-link" data-act="trn-m-swap" data-e="${no}">${t('trn.autoSwap')}</button><button type="button" class="a-link bad" data-act="trn-m-drop" data-e="${no}">${t('trn.remove')}</button></div>`}</div>`)}
              ${a.hard ? html`<p class="a-fhint">${icon('x', 12)} ${t('trn.m.hard')}</p>` : canOv ? html`<label class="p-check tr-ov"><input type="checkbox" data-bf="override" ${f.override ? 'checked' : ''}> <b>${t('trn.m.override')}</b><small>${t('trn.m.overrideSub')}</small></label>${f.override ? html`<textarea class="a-field" data-bf="note" rows="2" maxlength="200" placeholder="${t('trn.m.overrideNote')}">${f.note}</textarea>${E('override')}` : ''}` : html`<p class="a-fhint">${icon('shield', 12)} ${t('trn.m.noOverride')}</p>`}</div>` : ''}
            ${asked ? html`<div class="tr-assign"><div class="tr-assign-h"><b>${icon('users', 14)} ${t('trn.m.assign', { n: f.trainees.length })}</b></div><div class="tr-chips">${f.trainees.map((no) => html`<span class="tr-pp">${nm(hr.emp(no))} (${no})</span>`)}</div>${asked.note ? html`<p class="mute">“${asked.note}”</p>` : ''}</div>`
              : html`<div class="tr-assign"><div class="tr-assign-h"><b>${icon('users', 14)} ${t('trn.m.assign', { n: f.trainees.length })}</b><span class="mute">${t('trn.m.max')}</span></div>
              <label class="a-in a-search">${icon('search', 16)}<input data-bf="q" value="${f.q}" placeholder="${t('trn.m.search')}" aria-label="${t('trn.m.search')}"></label>
              <p class="tr-qa">${t('trn.m.quick')}</p><div class="tr-chips">${shown.length ? shown.map((e) => { const on = f.trainees.includes(e.empNo); const cl = train.clashes(e.empNo, dates);
                return html`<button type="button" class="tr-pick ${on ? 'on' : ''} ${cl.length ? 'clash' : ''}" data-act="trn-m-toggle" data-e="${e.empNo}" aria-pressed="${on ? 'true' : 'false'}">${on ? '✓' : '+'} ${nm(e)} <small>(${e.empNo})</small>${cl.length ? html` <em>${t('trn.m.clash')}</em>` : ''}</button>`; }) : html`<span class="mute">${t('trn.m.noPeople')}</span>`}</div>${E('trainees')}</div>`}
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="bk-pay"><b class="req">*</b> ${t('trn.m.payment')}</label><select id="bk-pay" class="a-field" data-bf="payment">${train.PAYMENTS.map((k) => html`<option value="${k}" ${f.payment === k ? 'selected' : ''} ${k === 'wallet' && fee == null ? 'disabled' : ''}>${t('trn.pay.' + k)}</option>`)}</select>${E('payment')}</div>
              <div class="a-frow"><label class="a-lab">${t('trn.m.total')}</label><div class="a-field ro">${price ? html`<b class="tr-total">${money(price.net * f.trainees.length)}</b> <small class="mute">${t('trn.m.totalSub', { n: f.trainees.length, g: money(fee * f.trainees.length) })}</small>` : html`<span class="mute">${t('trn.m.nofee')}</span>`}</div></div></div>${E('intake')}</div>
          <footer><small class="mute">${price ? t('trn.m.estimate') : t('trn.m.nofeeHint')}</small><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="${asked ? 'trn-approve-ok' : 'trn-new-ok'}" ${unresolved || !f.trainees.length ? 'disabled' : ''}>${unresolved ? t('trn.m.resolve') : asked ? t('trn.ask.approve') : t('trn.m.confirm')}</button></footer></div></div>`;
      }
      function registerModal() {
        const M = D.modal; const r = train.request(M.id); if (!r) return ''; const i = train.intake(r.intakeId);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('trn.reg.title')}</h2><p>${r.title} · ${r.id}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody"><p class="tr-hand">${icon('upload', 14)} <span>${t('trn.reg.body')}</span> ${i ? provLink(i, t('trn.hand.open')) : provLink({ u: r.bookingUrl }, t('trn.hand.open'))}</p>
            <div class="a-frow"><label class="a-lab" for="rg-ref">${t('trn.reg.ref')}</label><input id="rg-ref" class="a-field" data-rg="ref" maxlength="60" value="${M.ref}" placeholder="${t('trn.reg.refPh')}">${M.err ? html`<small class="a-ferr" data-err="ref">${t('trn.e.' + M.err)}</small>` : ''}<small class="a-fhint">${t('trn.reg.refHint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="trn-edit-register-ok">${t('trn.reg.ok')}</button></footer></div></div>`;
      }
      function declineModal() {
        const M = D.modal; const r = train.request(M.id); if (!r) return '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('trn.dec.title')}</h2><p>${r.title} · ${nm(hr.emp(r.askedBy))}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody"><div class="a-frow"><label class="a-lab" for="dc-r"><b class="req">*</b> ${t('trn.dec.reason')}</label><textarea id="dc-r" class="a-field" rows="3" maxlength="160" data-dc="reason" placeholder="${t('trn.dec.ph')}">${M.reason}</textarea>${M.err ? html`<small class="a-ferr" data-err="reason">${t('trn.e.' + M.err)}</small>` : ''}<small class="a-fhint">${t('trn.dec.hint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="trn-approve-decline-ok">${t('trn.ask.decline')}</button></footer></div></div>`;
      }
      function confirmModal() {
        const M = D.modal; const r = train.request(M.id); if (!r) return '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('trn.cancel.title')}</h2><p>${t('trn.cancel.sub', { id: r.id })}</p></header>
          <div class="a-mbody"><p class="p-warnbox">${icon('warn', 16)} ${t('trn.cancel.msg', { n: r.trainees.length })}${r.payment === 'wallet' && r.spent ? ' ' + t('trn.cancel.refund') : ''}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('trn.cancel.keep')}</button><button type="button" class="a-btn bad" data-act="trn-edit-cancel-ok">${t('trn.bk.cancel')}</button></footer></div></div>`;
      }
      function modal() {
        const M = D.modal; if (!M) return ''; if (['slip', 'cancel', 'register', 'decline'].includes(M.k) && !train.request(M.id)) { D.modal = null; return ''; }
        return { detail: detailModal, book: bookModal, slip: slipModal, register: registerModal, decline: declineModal, cancel: confirmModal }[M.k]();
      }

      // ---------- data sources ----------
      function sourcesPage() {
        const A = train.meta(); if (!A) return html`<p class="p-warnbox" role="alert">${icon('warn', 16)} ${t('trn.nodata')}</p>`;
        const withFee = BS_ATLAS_COUNT('f'); const mapped = BS_ATLAS_COUNT('loc');
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('trn.src.title')}</h1><p class="a-sub">${t('trn.src.sub')}</p></div></div>
          ${train.stale() ? html`<p class="p-warnbox" role="alert">${icon('warn', 16)} ${t('trn.stale', { d: A.last })}</p>` : ''}
          <div class="dp-kpis">${[['trn.src.k.records', A.records, 'active'], ['trn.src.k.providers', A.providers.length, 'active'], ['trn.src.k.mapped', `${mapped} / ${A.records}`, 'requested'], ['trn.src.k.fee', `${withFee} / ${A.records}`, 'requested']].map(([lab, v, cls]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card tr-src"><h3 class="hr-h">${t('trn.src.snapshot')}</h3>
            <dl class="tr-dl"><dt>${t('trn.src.site')}</dt><dd><a class="a-link" href="${A.source}" target="_blank" rel="noopener noreferrer">${A.source} ↗</a></dd><dt>${t('trn.src.taken')}</dt><dd>${A.generated.replace('T', ' ')} (${t('trn.src.checked', { d: A.checked })})</dd><dt>${t('trn.src.window')}</dt><dd>${A.first} → ${A.last}</dd><dt>${t('trn.src.kept')}</dt><dd>${t('trn.src.keptN', { n: A.records, m: A.recordsInAtlas })}</dd></dl>
            <p class="mute">${A.note}</p>
            <h3 class="hr-h">${t('trn.src.limits')}</h3><ul class="dm-std">${(A.limits || []).map((l) => html`<li>${icon('warn', 13)} ${l}</li>`)}<li>${icon('warn', 13)} ${t('trn.src.seatsNote')}</li><li>${icon('warn', 13)} ${t('trn.src.feeNote')}</li></ul>
            <h3 class="hr-h">${t('trn.src.refresh')}</h3><p>${t('trn.src.refreshBody')}</p><pre class="tr-code-block">python tools/import-atlas.py --fetch</pre>
            <h3 class="hr-h">${t('trn.src.api')}</h3><p>${t('trn.src.apiBody')}</p><pre class="tr-code-block">GET  /api/courses?kw=&amp;lang=&amp;provider=&amp;from=&amp;maxFee=
GET  /api/intakes/{id}
GET  /api/locations
GET  /api/workers/{empNo}/suggestions
POST /api/enrolment-requests          {intakeId, trainees[], payment}
POST /api/enrolment-requests/{id}/approve | decline | register | confirm | complete | cancel</pre><p class="mute">docs/API-CONTRACT.md</p>
            <p class="l-audit">${icon('shield', 14)} ${t('trn.src.attr', { a: A.attribution || '' })}</p></section>
          <section class="a-card"><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('trn.src.provider')}</th><th>${t('trn.cmp.frameworks')}</th><th>${t('trn.cmp.coursesN0')}</th><th>${t('trn.cmp.site')}</th></tr></thead><tbody>${A.providers.map((p, i) => html`<tr><td><b>${provName(i)}</b></td><td class="mute" style="white-space:normal">${(p.frameworks || []).join(' · ') || '—'}</td><td>${train.providerStats(i).list.length}</td><td>${safeUrl(p.site) ? html`<a class="a-link" href="${p.site}" target="_blank" rel="noopener noreferrer">${t('trn.site')} ↗</a>` : '—'}</td></tr>`)}</tbody></table></div></section>`;
      }
      const BS_ATLAS_COUNT = (k) => { const A = train.meta(); return A ? A.intakes.filter((i) => (k === 'f' ? i.f != null : !!i[k])).length : 0; };

      function page() { if (D.tab === 'sources' && party() !== 'employer') D.tab = 'catalog'; return { catalog: catalogPage, matrix: matrixPage, centres: centresPage, compare: comparePage, advisor: advisorPage, requests: requestsPage, sources: sourcesPage }[D.tab](); }

      // ---------- actions ----------
      function openBook(intakeId, preset) {
        const back = D.modal && D.modal.k === 'detail' ? D.modal.groupId : '';
        const i = train.intake(intakeId); if (!i) { toast(t('trn.t.stale'), 'warn'); return; }
        const pre = (preset && preset.length ? preset : D.preset).filter((no) => { const e = hr.emp(no); return e && e.status === 'active' && canEmp(e); }).slice(0, 10);
        D.modal = { k: 'book', intakeId, back, f: { trainees: pre, payment: 'direct', override: false, note: '', q: '' }, errs: {} }; render();
      }
      /** closing the request dialog goes back to the course it was opened from */
      function closeModal() { const M = D.modal; D.modal = M && M.k === 'book' && M.back && !M.reqId ? { k: 'detail', groupId: M.back } : null; render(); }
      function exportCsv() {
        const rows = requestRows();
        download(`enrolment-requests-${today()}.csv`, csvOf([['ref', 'status', 'source', 'course', 'provider', 'venue', 'from', 'to', 'language', 'trainees', 'fee_each', 'payment', 'provider_ref', 'requested'], ...rows.map((r) => [r.id, r.status, r.source, r.title, r.provider, r.venue, r.start, r.end, r.lang, r.trainees.join(' '), r.fee == null ? '' : r.fee, r.payment, r.ref, r.at])]));
        toast(t('hr.toast.exported', { n: rows.length }), 'ok');
      }
      const ERR = { wallet: 'trn.e.wallet_short', state: 'trn.t.stale', missing: 'trn.t.stale', started: 'trn.t.started', overlap: 'trn.e.overlap', clash: 'trn.e.clash', emp: 'trn.e.emp', none: 'trn.e.none', note: 'trn.e.note', ref_len: 'trn.e.ref_len', note_len: 'trn.e.note_len' };

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.train'), act: 'noop' }, { text: t('trn.tab.' + D.tab) }]; }, page, modal,
        afterRender(v) { if (D.tab === 'centres') mountMap(v); },
        /** another module sends the user here (a permit's "book refresher", the wallet's shortcut): show the course with the people already chosen */
        onGo(p) { D.tab = 'catalog'; D.f = F0(); D.draft = F0(); D.preset = (p.trainees || []).slice(); D.modal = p.courseId && train.group(p.courseId) ? { k: 'detail', groupId: p.courseId } : null; },
        onTab() { D.modal = null; D.preset = []; },
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.dataset.f) { D.draft[el.dataset.f] = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value; return; }
          if (el.dataset.rq) { D.rqDraft[el.dataset.rq] = el.value; return; }
          if (el.dataset.mx) { D.mx[el.dataset.mx] = el.value; render(); return; }
          if (el.dataset.cf) { D.cf[el.dataset.cf] = el.value; D.sel = ''; render(); return; }
          if (M && M.k === 'register' && el.dataset.rg) { M.ref = el.value; return; }
          if (M && M.k === 'decline' && el.dataset.dc) { M.reason = el.value; return; }
          if (M && M.k === 'book' && el.dataset.bf) {
            const k = el.dataset.bf; const f = M.f;
            if (k === 'override') { f.override = el.checked; M.errs = {}; render(); return; }
            f[k] = el.value; if (k === 'q') { render(); const i = ctx.view().querySelector('[data-bf=q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } else if (k === 'note') { M.errs = {}; const btn = ctx.view().querySelector('[data-act=trn-new-ok],[data-act=trn-approve-ok]'); if (btn) render(); }
          }
        },
        onSubmit() { if (D.tab === 'requests') D.rq.kw = D.rqDraft.kw; else { D.f = { ...D.f, ...D.draft }; D.page = 1; } render(); },
        onEscape() { if (D.modal) { closeModal(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id; const M = D.modal; const p = party();
          const rq = id && train.request(id);
          if ((rq && !canTouch(rq)) || (['trn-new', 'trn-new-ok'].includes(a) && !can('create')) || (['trn-approve-yes', 'trn-approve-ok', 'trn-approve-decline', 'trn-approve-decline-ok', 'trn-edit-complete', 'trn-edit-confirm'].includes(a) && p !== 'employer')) { toast(t('pm.noOp'), 'warn'); return true; }
          switch (a) {
            case 'noop': break;
            case 'trn-reset': D.f = F0(); D.draft = F0(); D.page = 1; render(); break;
            case 'trn-page': D.page = +b.dataset.p; render(); break;
            case 'trn-detail': D.modal = { k: 'detail', groupId: id }; render(); break;
            case 'trn-centre': D.f = { ...F0(), locId: id }; D.draft = F0(); D.tab = 'catalog'; D.page = 1; render(); break;
            case 'trn-centre-clear': delete D.f.locId; D.page = 1; render(); break;
            case 'trn-loc': D.sel = D.sel === id ? '' : id; render(); { const loc = train.location(id); if (D.sel && loc) BS.map.slot('train').focus(loc.lat, loc.lng, 14); } break;
            case 'trn-prov': D.f = { ...F0(), provider: id }; D.draft = { ...D.f }; D.tab = 'catalog'; D.page = 1; render(); break;
            case 'trn-new': openBook(b.dataset.i, D.preset); break;
            case 'trn-m-toggle': { const f = M.f; if (f.trainees.includes(b.dataset.e)) f.trainees = f.trainees.filter((n) => n !== b.dataset.e); else if (f.trainees.length >= 10) { toast(t('trn.e.many'), 'warn'); break; } else f.trainees.push(b.dataset.e); M.errs = {}; render(); break; }
            case 'trn-m-swap': {
              const i = train.intake(M.intakeId); const s = train.suggest(b.dataset.e, i.d, M.f.trainees, canEmp); if (!s) { toast(t('trn.t.noSwap'), 'warn'); break; }
              M.f.trainees = M.f.trainees.map((n) => (n === b.dataset.e ? s.empNo : n)); toast(t('trn.t.swapped', { a: nm(hr.emp(b.dataset.e)), b: nm(s) }), 'ok'); render(); break;
            }
            case 'trn-m-drop': M.f.trainees = M.f.trainees.filter((n) => n !== b.dataset.e); render(); break;
            case 'trn-new-ok': {
              const f = M.f; const r = train.createRequest({ intakeId: M.intakeId, trainees: f.trainees, payment: f.payment, override: f.override, overrideNote: f.note }, P.currentId(), p === 'subcon' && org() ? org().id : '');
              if (!r.ok) { M.errs = r.errors; render(); break; }
              D.modal = null; D.preset = []; D.tab = 'requests'; D.rq = { kw: '', state: '' }; D.rqDraft = { kw: '' }; ctx.rerender(); toast(t('trn.t.requested', { id: r.request.id }), 'ok'); break;
            }
            case 'trn-approve-yes': {
              const r0 = train.request(id); if (r0.status !== 'asked') { toast(t('trn.t.stale'), 'warn'); break; }
              D.modal = { k: 'book', reqId: id, intakeId: r0.intakeId, f: { trainees: r0.trainees.slice(), payment: 'direct', override: false, note: '', q: '' }, errs: {} }; render(); break;
            }
            case 'trn-approve-ok': {
              const f = M.f; const r = train.approve(M.reqId, { payment: f.payment, override: f.override, overrideNote: f.note }, P.currentId());
              if (!r.ok) { if (r.errors) { M.errs = r.errors; render(); } else toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); break; }
              D.modal = null; render(); toast(t('trn.t.approved'), 'ok'); break;
            }
            case 'trn-approve-decline': D.modal = { k: 'decline', id, reason: '', err: '' }; render(); break;
            case 'trn-approve-decline-ok': { const r = train.decline(M.id, M.reason, P.currentId()); if (!r.ok) { if (r.error === 'note' || r.error === 'note_len') { M.err = r.error; render(); } else { D.modal = null; render(); toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); } break; } D.modal = null; render(); toast(t('trn.t.declined'), 'ok'); break; }
            case 'trn-edit-register': D.modal = { k: 'register', id, ref: '', err: '' }; render(); break;
            case 'trn-edit-register-ok': { const r = train.register(M.id, M.ref, P.currentId()); if (!r.ok) { if (r.error === 'ref_len') { M.err = 'ref_len'; render(); } else { D.modal = null; render(); toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); } break; } D.modal = null; render(); toast(t('trn.t.registered'), 'ok'); break; }
            case 'trn-edit-confirm': { const r = train.confirm(id, P.currentId()); if (!r.ok) { toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); break; } render(); toast(t('trn.t.confirmed'), 'ok'); break; }
            case 'trn-mx-prev': D.mx.start = hr.addDays(D.mx.start, -7) < today() ? today() : hr.addDays(D.mx.start, -7); render(); break;
            case 'trn-mx-next': D.mx.start = hr.addDays(D.mx.start, 7); render(); break;
            case 'trn-cmp': { const k = +id; const on = D.cmp.includes(k); if (on) { if (D.cmp.length > 1) D.cmp = D.cmp.filter((x) => x !== k); } else if (D.cmp.length >= 4) toast(t('trn.cmp.max'), 'warn'); else D.cmp = [...D.cmp, k]; render(); break; }
            case 'trn-adv': D.adv = b.dataset.k; render(); break;
            case 'trn-edit-swap': {
              const x = train.request(id); const s = train.suggest(b.dataset.e, x.dates, x.trainees, canEmp); if (!s) { toast(t('trn.t.noSwap'), 'warn'); break; }
              const r = train.setTrainees(id, x.trainees.map((n) => (n === b.dataset.e ? s.empNo : n)), P.currentId()); if (!r.ok) { toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); break; } render(); toast(t('trn.t.swapped', { a: nm(hr.emp(b.dataset.e)), b: nm(s) }), 'ok'); break;
            }
            case 'trn-edit-drop': { const x = train.request(id); const r = train.setTrainees(id, x.trainees.filter((n) => n !== b.dataset.e), P.currentId()); if (!r.ok) { toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); break; } render(); toast(t('trn.t.removed'), 'ok'); break; }
            case 'trn-alt': { const x = train.request(id); D.tab = 'catalog'; D.f = F0(); D.draft = F0(); D.preset = [b.dataset.e]; D.modal = { k: 'detail', groupId: x.groupId }; render(); break; }
            case 'trn-rqf': D.rq.state = b.dataset.s; render(); break;
            case 'trn-goto-catalog': D.tab = 'catalog'; render(); break;
            case 'trn-export': exportCsv(); break;
            case 'trn-slip': D.modal = { k: 'slip', id }; render(); break;
            case 'trn-print': window.print(); break;
            case 'trn-edit-complete': { const r = train.complete(id, P.currentId()); if (!r.ok) { toast(t(ERR[r.error] || 'trn.t.stale'), 'warn'); break; } render(); toast(t(r.issued.length ? 'trn.t.completedCert' : 'trn.t.completed', { n: r.issued.length }), 'ok'); break; }
            case 'trn-edit-cancel': D.modal = { k: 'cancel', id }; render(); break;
            case 'trn-edit-cancel-ok': { const r = train.cancel(M.id, P.currentId()); D.modal = null; render(); toast(t(r.ok ? 'trn.t.cancelled' : ERR[r.error] || 'trn.t.stale'), r.ok ? 'ok' : 'warn'); break; }
            case 'close-modal': closeModal(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.modal = null; D.tab = 'catalog'; D.f = F0(); D.draft = F0(); D.page = 1; D.mx = { groupId: 'cert:CSOC', start: today() }; D.cf = { groupId: '', lang: '' }; D.sel = ''; D.cmp = topProviders(); D.adv = ''; D.rq = { kw: '', state: '' }; D.rqDraft = { kw: '' }; D.preset = []; },
      };
    },
  });
})(window.BS);
