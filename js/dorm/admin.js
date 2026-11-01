/* Admin: 宿舍床位 — find beds across licensed dormitories, allocate foreign workers to beds, follow the leases and the MOM address declarations.
   Employer administrators house people in their data scope; a subcontractor houses its own workers only. */
(function (BS) {
  const { html, icon } = BS;
  const P = BS.perm, hr = BS.hr, dm = BS.dorm;
  const today = () => BS.fmt.now().slice(0, 10);
  const money = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
  const F0 = () => ({ kw: '', region: '', site: '', room: '', now: false, ac: false, shuttle: false, budget: 600 });

  BS.registerAdmin({
    id: 'dorm', nav: 'a.nav.dorm', stores: [hr, dm],
    tabs: [{ id: 'find', k: 'dm.tab.find' }, { id: 'leases', k: 'dm.tab.leases' }, { id: 'standards', k: 'dm.tab.standards' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const D = { tab: 'find', f: F0(), kw: '', sel: '', pick: [], modal: null, ls: '', view: 'list', sites: true };
      const party = () => P.party(); const org = () => P.orgOf(P.current()); const can = (op) => P.can('dorm', op);
      const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
      const dName = (d) => (z() ? d.zh : d.en);
      const siteName = (k) => { const s = hr.site(k); return s ? (z() ? s.zh : s.en) : k; };
      const accName = (id) => { const a = P.account(id); return a ? (z() ? a.name : a.nameEn || a.name) : id === 'operator' ? t('dm.operator') : String(id); };
      const canEmp = (e) => (party() === 'employer' ? P.inScopeEmp(e) : !!org() && BS.dep.subconOf(e) === org().id);
      const myLeases = () => dm.leases().filter((l) => (party() === 'employer' ? P.inScope(l.empNo) : !!org() && l.orgId === org().id));
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

      // ---------- search ----------
      const matches = (b) => { const f = D.f; return dm.free(b) && b.price <= f.budget && (!f.ac || b.ac) && (!f.now || b.from <= today()) && (!f.room || (f.room === 'ac' ? b.ac : !b.ac)); };
      function results() {
        const f = D.f, kw = f.kw.trim().toLowerCase();
        return dm.DORMS.filter((d) => (!f.region || d.region === f.region) && (!kw || d.en.toLowerCase().includes(kw) || d.zh.includes(kw) || d.operator.toLowerCase().includes(kw) || d.addr.toLowerCase().includes(kw)) && (!f.shuttle || (f.site ? d.shuttles.some((s) => s[0] === f.site) : d.shuttles.length > 0)))
          .map((d) => ({ d, beds: dm.beds(d.id).filter(matches) })).filter((x) => x.beds.length)
          .sort((a, b) => (f.site ? dm.distanceKm(a.d.id, f.site) - dm.distanceKm(b.d.id, f.site) : b.beds.length - a.beds.length));
      }
      const range = (beds) => { const p = beds.map((b) => b.price); const lo = Math.min(...p), hi = Math.max(...p); return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`; };

      function findPage() {
        const res = results(); const f = D.f; if (!res.some((x) => x.d.id === D.sel)) { D.sel = res[0] ? res[0].d.id : ''; D.pick = []; }
        const st = dm.stats(myLeases().map((l) => l.empNo)); const sel = res.find((x) => x.d.id === D.sel);
        const sites = hr.sites().filter((s) => s.active); const pct = st.housed ? Math.round((st.registered / st.housed) * 100) : 100;
        const tog = (k, label, ic) => html`<label class="dm-tog ${f[k] ? 'on' : ''}"><input type="checkbox" data-f="${k}" ${f[k] ? 'checked' : ''}> ${ic ? icon(ic, 14) : ''} ${label}</label>`;
        const listSec = html`<section class="dm-list"><p class="mute dm-count">${t('dm.avail', { n: res.length })}</p>
            ${res.length ? res.map(({ d, beds }) => html`<article class="a-card dm-card ${d.id === D.sel ? 'sel' : ''}" data-dorm="${d.id}"><div class="dm-ch"><span class="a-tag sub-upcoming">${t('trn.region.' + d.region)}</span><b>${t('dm.beds', { n: beds.length })}</b></div>
              <h3 class="pt-title">${dName(d)}</h3><p class="mute">${icon('pin', 12)} ${d.addr}</p><p class="dm-rate"><small class="mute">${t('dm.monthly')}</small> <b>${range(beds)}</b></p>
              ${f.site ? html`<p class="mute">${dm.shuttleTo(d.id, f.site) ? html`<span class="dm-yes">${icon('check', 12)} ${t('dm.shuttleTo', { s: siteName(f.site) })}</span>` : t('dm.noShuttle')} · ${t('dm.km', { n: dm.distanceKm(d.id, f.site) })}</p>` : html`<p class="mute">${d.shuttles.length ? t('dm.shuttlesN', { n: d.shuttles.length }) : t('dm.noShuttle')} · ${t('dm.mrt', { n: d.mrtKm })}</p>`}
              <button type="button" class="a-btn ${d.id === D.sel ? 'primary' : ''} sm" data-act="dm-inspect" data-id="${d.id}">${t('dm.inspect')} ›</button></article>`) : html`<section class="a-card"><div class="a-none"><p>${t('dm.none')}</p></div></section>`}</section>`;
        const detSec = html`<section class="dm-detail">${sel ? detail(sel.d, sel.beds) : html`<section class="a-card"><div class="a-none"><p>${t('dm.pickOne')}</p></div></section>`}</section>`;
        return html`
          <section class="dm-hero"><div><span class="wl-eyebrow">${icon('home', 13)} ${t('dm.hero.kicker')}</span><h1>${t('dm.hero.title')}</h1><p>${t('dm.hero.body')}</p></div>
            <div class="dm-stats">${[['dm.s.vacant', st.vacant.toLocaleString('en-US'), t('dm.s.ready')], ['dm.s.rate', money(st.avgRate), t('dm.s.rateSub')], ['dm.s.housed', t('dm.s.workers', { n: st.housed }), ''], ['dm.s.ofwas', pct + '%', t('dm.s.registered', { a: st.registered, b: st.housed })]].map(([lab, v, sub]) => html`<div><small>${t(lab)}</small><b>${v}</b><span>${sub}</span></div>`)}</div></section>
          <section class="a-card dm-filters"><form class="a-filters" autocomplete="off"><label class="a-in a-search">${icon('search', 16)}<input data-fkw value="${D.kw}" placeholder="${t('dm.f.kw')}" aria-label="${t('dm.f.kw')}"></label>
              <label class="a-in"><select data-f="region" aria-label="${t('dm.f.region')}"><option value="">${t('dm.f.allRegion')}</option>${['west', 'central', 'north', 'south'].map((k) => html`<option value="${k}" ${f.region === k ? 'selected' : ''}>${t('trn.region.' + k)}</option>`)}</select></label>
              <label class="a-in"><select data-f="site" aria-label="${t('dm.f.site')}"><option value="">${t('dm.f.anySite')}</option>${sites.map((s) => html`<option value="${s.key}" ${f.site === s.key ? 'selected' : ''}>${siteName(s.key)}</option>`)}</select></label>
              <label class="a-in"><select data-f="room" aria-label="${t('dm.f.room')}"><option value="">${t('dm.f.allRooms')}</option><option value="ac" ${f.room === 'ac' ? 'selected' : ''}>${t('dm.room.ac')}</option><option value="fan" ${f.room === 'fan' ? 'selected' : ''}>${t('dm.room.fan')}</option></select></label>
              <span class="a-fgrow"></span><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="dm-togs">${tog('now', t('dm.f.now'), 'clock')}${tog('ac', t('dm.f.ac'))}${tog('shuttle', t('dm.f.shuttle'), 'pin')}<span class="dm-view" role="group" aria-label="${t('dm.view.label')}"><button type="button" class="${D.view === 'list' ? 'on' : ''}" data-act="dm-view" data-v="list" aria-pressed="${D.view === 'list' ? 'true' : 'false'}">${icon('list', 14)} ${t('dm.view.list')}</button><button type="button" class="${D.view === 'map' ? 'on' : ''}" data-act="dm-view" data-v="map" aria-pressed="${D.view === 'map' ? 'true' : 'false'}">${icon('pin', 14)} ${t('dm.view.map')}</button></span>${D.view === 'map' ? html`<label class="dm-tog ${D.sites ? 'on' : ''}"><input type="checkbox" data-sites ${D.sites ? 'checked' : ''}> ${t('dm.map.sites')}</label>` : ''}<label class="dm-budget">${t('dm.f.budget')}: <b>${money(f.budget)}</b><input type="range" min="300" max="700" step="10" data-f="budget" value="${f.budget}" aria-label="${t('dm.f.budget')}"></label></div></section>
          ${D.view === 'map' ? html`<div class="dm-maprow"><div class="dm-mapcol"><div class="dm-mapslot" data-map-slot="dorm"></div></div>${listSec}</div>${detSec}` : html`<div class="dm-cols">${listSec}${detSec}</div>`}
          <p class="l-audit">${icon('shield', 14)} ${t('dm.proto')}</p>`;
      }
      function detail(d, matching) {
        const free = dm.freeBeds(d.id).length; const rooms = [...new Set(dm.beds(d.id).map((b) => b.room))]; const ok = new Set(matching.map((b) => b.id)); const picked = D.pick.filter((id) => dm.free(dm.bed(id)));
        return html`<article class="a-card dm-det" data-detail="${d.id}"><header class="dm-dh"><div><span class="a-tag approved">${t('dm.cls.' + d.cls)}</span> <code class="tr-code">${d.licence}</code><h2>${dName(d)}</h2><p class="mute">${t('dm.operatedBy')} <b>${d.operator}</b></p></div><div class="dm-open"><small class="mute">${t('dm.instant')}</small><b>${t('dm.beds', { n: free })}</b><small class="mute">${t('dm.deposit', { n: 1 })}</small></div></header>
          <div class="dm-shuttles"><b>${icon('pin', 14)} ${t('dm.shuttles')}</b> <span class="a-tag approved">${t('dm.inLease')}</span>${d.shuttles.length ? html`<div class="dm-routes">${d.shuttles.map(([k, am, pm]) => html`<div class="dm-route ${D.f.site === k ? 'hit' : ''}"><b>${siteName(k)}</b><small>${t('dm.km', { n: dm.distanceKm(d.id, k) })}</small><span>${t('dm.am')}: ${am.join(' / ')}</span><span>${t('dm.pm')}: ${pm.join(' / ')}</span></div>`)}</div>` : html`<p class="mute">${t('dm.noShuttle')}</p>`}</div>
          <div class="tr-amen">${d.amen.map((a) => html`<span>✓ ${t('dm.am.' + a)}</span>`)}</div>
          <h3 class="hr-h">${t('dm.matrix')} <small class="mute">${t('dm.matrixSub', { n: rooms.length })}</small></h3>
          <div class="dm-matrix">${['A', 'B'].map((blk) => html`<h4 class="dp-h4">${t('dm.block', { b: blk })}</h4>${[...new Set(dm.beds(d.id).filter((b) => b.block === blk).map((b) => b.room))].map((room) => { const bs = dm.beds(d.id).filter((b) => b.room === room); const ac = bs[0].ac;
              return html`<div class="dm-room" data-room="${room}"><div class="dm-room-h"><b>${room}</b><span class="a-tag ${ac ? 'approved' : 'withdrawn'}">${t(ac ? 'dm.room.ac' : 'dm.room.fan')}</span></div><div class="dm-beds">${bs.map((b) => { const f = dm.free(b); const on = D.pick.includes(b.id);
                return html`<button type="button" class="dm-bed ${f ? '' : 'taken'} ${on ? 'on' : ''} ${f && !ok.has(b.id) ? 'dim' : ''}" data-act="dm-pick" data-b="${b.id}" ${f ? '' : 'disabled'} aria-pressed="${on ? 'true' : 'false'}" title="${f ? '' : t('dm.taken')}"><b>${b.bed}</b><small>${t(b.lower ? 'dm.lower' : 'dm.upper')}</small><em>${f ? money(b.price) : '—'}</em>${f && b.from > today() ? html`<i>${b.from.slice(5)}</i>` : ''}</button>`; })}</div></div>`; })}`)}</div>
          <footer class="dm-foot"><span>${picked.length ? t('dm.picked', { n: picked.length, r: money(picked.reduce((n, id) => n + dm.bed(id).price, 0)) }) : t('dm.pickHint')}</span>${can('create') && picked.length ? html`<button type="button" class="a-btn primary" data-act="dm-new">${icon('users', 16)} ${t('dm.allocate')}</button>` : ''}</footer></article>`;
      }

      // ---------- leases ----------
      function leasesPage() {
        const all = myLeases(); const rows = all.filter((l) => !D.ls || (D.ls === 'active' ? ['upcoming', 'active'].includes(dm.phase(l)) : dm.phase(l) === D.ls)).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
        const cnt = (k) => all.filter((l) => !k || (k === 'active' ? ['upcoming', 'active'].includes(dm.phase(l)) : dm.phase(l) === k)).length;
        const st = dm.stats(all.map((l) => l.empNo));
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('dm.ls.title')}</h1><p class="a-sub">${t('dm.ls.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="dm-export">${icon('upload', 16)} ${t('hr.export')}</button></div></div>
          <div class="dp-kpis">${[['dm.k.housed', st.housed, 'active'], ['dm.k.pending', all.filter((l) => l.status === 'pending').length, 'requested'], ['dm.k.registered', st.registered, 'granted'], ['dm.k.rent', money(all.filter((l) => l.status === 'confirmed').reduce((n, l) => n + l.rent, 0)), 'active']].map(([lab, v, cls]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card pt-bar"><div class="hr-chips pt-filters" role="group">${['', 'pending', 'active', 'ended', 'cancelled'].map((k) => html`<button type="button" class="${D.ls === k ? 'on' : ''}" data-act="dm-lf" data-k="${k}" aria-pressed="${D.ls === k ? 'true' : 'false'}">${k ? t('dm.ph.' + k) : t('dep.f.all')} (${cnt(k)})</button>`)}</div></section>
          <section class="a-card"><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('dm.c.worker')}</th><th>${t('dm.c.bed')}</th><th>${t('dm.c.rent')}</th><th>${t('dm.c.term')}</th><th>${t('dm.c.move')}</th><th>${t('dm.c.ofwas')}</th><th>${t('dm.c.status')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${rows.length ? rows.map((l) => { const e = hr.emp(l.empNo); const d = dm.dorm(l.dormId); const b = dm.bed(l.bedId); const ph = dm.phase(l);
              return html`<tr data-lease="${l.id}"><td><b>${nm(e)}</b><small class="hr-sub">${l.empNo} · ${e ? e.idMask : ''}</small></td><td><b>${dName(d)}</b><small class="hr-sub">${b.room} · ${b.bed} (${t(b.lower ? 'dm.lower' : 'dm.upper')})</small></td><td>${money(l.rent)} <small class="hr-sub">${t('dm.deposit2', { n: money(l.deposit) })}</small></td><td>${t('dm.months', { n: l.months })}</td>
                <td>${l.effective || html`<span class="mute">${t('dm.asked', { d: l.from })}</span>`}</td><td><span class="a-tag ${l.ofwas.status === 'registered' ? 'approved' : l.ofwas.status === 'submitted' ? 'pending' : 'withdrawn'}">${t('dm.of.' + l.ofwas.status)}</span><small class="hr-sub">${l.ofwas.ref}</small></td>
                <td><span class="a-tag ${{ pending: 'pending', upcoming: 'sub-upcoming', active: 'approved', ended: 'withdrawn', cancelled: 'withdrawn' }[ph]}">${t('dm.ph.' + ph)}</span></td>
                <td class="c-act"><button type="button" class="a-link" data-act="dm-slip" data-id="${l.id}">${t('dm.slip')}</button>${l.status === 'pending' && party() === 'employer' && can('approve') ? html`<button type="button" class="a-link ok" data-act="dm-approve-confirm" data-id="${l.id}" title="${t('dm.confirmHint')}">${t('dm.confirm')}</button>` : ''}${l.status === 'pending' && can('update') ? html`<button type="button" class="a-link bad" data-act="dm-edit-cancel" data-id="${l.id}">${t('dm.cancel')}</button>` : ''}${l.status === 'confirmed' && can('update') ? html`<button type="button" class="a-link bad" data-act="dm-edit-end" data-id="${l.id}">${t('dm.end')}</button>` : ''}</td></tr>`; }) : html`<tr><td colspan="8" class="a-none"><p>${t('dm.ls.none')}</p></td></tr>`}</tbody></table></div></section>`;
      }

      // ---------- standards ----------
      function standardsPage() {
        const groups = [['licence', ['lic1', 'lic2', 'lic3']], ['space', ['sp1', 'sp2', 'sp3']], ['health', ['hl1', 'hl2', 'hl3']], ['safety', ['sf1', 'sf2', 'sf3']], ['transport', ['tr1', 'tr2']]];
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('dm.std.title')}</h1><p class="a-sub">${t('dm.std.sub')}</p></div></div>
          <section class="a-card dp-rules"><p class="a-fhint">${icon('warn', 12)} ${t('dm.std.note')}</p>${dm.DORMS.map((d) => html`<div class="dp-rule"><b>${dName(d)}</b><span class="a-tag approved">${t('dm.cls.' + d.cls)}</span><span class="mute">${t('dm.std.kind.' + d.kind)} · ${t('dm.std.beds', { n: d.beds.toLocaleString('en-US') })} · <code>${d.licence}</code></span></div>`)}</section>
          <div class="tr-grid">${groups.map(([g, items]) => html`<section class="a-card dp-rules"><h3 class="hr-h">${t('dm.std.g.' + g)}</h3><ul class="dm-std">${items.map((k) => html`<li>✓ ${t('dm.std.i.' + k)}</li>`)}</ul></section>`)}</div>`;
      }
      /** pins for the dormitories that match the filters (the number is their free beds), the worksites, and the shuttle routes of the chosen dormitory */
      function mountMap(v) {
        const host = v.querySelector('[data-map-slot=dorm]'); if (!host) return; const slotObj = BS.map.slot('dorm'); slotObj.mount(host);
        const res = results(); const f = D.f; const pins = res.map(({ d, beds }) => ({ id: d.id, kind: 'dorm', lat: d.lat, lng: d.lng, count: beds.length, label: `${dName(d)} · ${t('dm.beds', { n: beds.length })}`, selected: d.id === D.sel }));
        if (D.sites) hr.sites().filter((s) => s.active && s.lat != null).forEach((s) => pins.push({ id: 'site:' + s.key, kind: 'site', lat: s.lat, lng: s.lng, short: s.code.split('-').pop().slice(0, 4), label: `${siteName(s.key)} (${s.code})`, selected: f.site === s.key }));
        const sel = dm.dorm(D.sel); const lines = [];
        if (sel && res.some((x) => x.d.id === sel.id)) sel.shuttles.forEach(([k, am, pm]) => { const s = hr.site(k); if (s) lines.push({ from: [sel.lat, sel.lng], to: [s.lat, s.lng], strong: f.site === k, label: `${dName(sel)} → ${siteName(k)} · ${t('dm.km', { n: dm.distanceKm(sel.id, k) })} · ${am[0]}` }); });
        slotObj.set({ pins, lines, lang: lang(), fitText: t('dm.map.fit'), fitKey: res.map((x) => x.d.id).join(',') + '|' + f.site + '|' + D.sites,
          legend: [{ cls: 'dorm', text: t('dm.map.leg.dorm') }, { cls: 'sel', text: t('dm.map.leg.sel') }, ...(D.sites ? [{ cls: 'site', text: t('dm.map.leg.site') }] : []), { cls: 'line', text: t('dm.map.leg.line') }],
          onSelect: (ids) => { const id = ids[0]; if (String(id).startsWith('site:')) { D.f.site = String(id).slice(5); D.pick = []; render(); return; } D.sel = id; D.pick = []; render(); const card = ctx.view().querySelector(`[data-dorm="${id}"]`); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } });
      }
      const page = () => (D.tab === 'leases' ? leasesPage() : D.tab === 'standards' ? standardsPage() : findPage());

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('dm.e.' + M.errs[k])}${k === 'from' && M.errs[k] === 'before' ? ' ' + M.min : ''}</small>` : '');
      function allocModal() {
        const M = D.modal; const f = M.f; const d = dm.dorm(M.dormId); const items = M.beds.map((id) => dm.bed(id)); const min = dm.earliest(M.beds);
        const housedNow = new Set(f.workers.filter(Boolean));
        const pool = hr.emps().filter((e) => e.status === 'active' && e.idType === 'fin' && canEmp(e) && !dm.liveLeaseOf(e.empNo));
        const rent = items.reduce((n, b) => n + b.price, 0);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('dm.m.title'), `${dName(d)} · ${d.licence}`)}
          <div class="a-mbody l-form"><h3 class="hr-h">${t('dm.m.match')}</h3>
            ${items.map((b, i) => html`<div class="dm-match" data-bedrow="${b.id}"><div><b>${b.room} — ${t('dm.m.bed')} ${b.bed} (${t(b.lower ? 'dm.lower' : 'dm.upper')})</b><small class="mute">${money(b.price)} / ${t('dm.month')}${b.from > today() ? ' · ' + t('dm.from', { d: b.from }) : ''}</small></div>
              <div><select class="a-field" data-m="w:${i}" aria-label="${t('dm.c.worker')}"><option value="">${t('dep.f.pick')}</option>${pool.map((e) => html`<option value="${e.empNo}" ${f.workers[i] === e.empNo ? 'selected' : ''} ${housedNow.has(e.empNo) && f.workers[i] !== e.empNo ? 'disabled' : ''}>${nm(e)} (${e.empNo})</option>`)}</select>${E(M, 'emp' + i)}${E(M, 'bed' + i)}</div></div>`)}
            ${E(M, 'items')}${pool.length ? '' : html`<p class="a-fhint">${t('dm.m.noPool')}</p>`}
            <h3 class="hr-h">${t('dm.m.lease')}</h3>
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="dm-from"><b class="req">*</b> ${t('dm.m.from')}</label><input id="dm-from" type="date" class="a-field" data-m="from" value="${f.from}" min="${today()}">${E(M, 'from')}<small class="a-fhint">${t('dm.m.fromHint', { d: min })}</small></div>
              <div class="a-frow"><label class="a-lab" for="dm-months"><b class="req">*</b> ${t('dm.m.term')}</label><select id="dm-months" class="a-field" data-m="months">${dm.TERMS.map((n) => html`<option value="${n}" ${String(f.months) === String(n) ? 'selected' : ''}>${t('dm.months', { n })}${n === 6 ? ' · ' + t('dm.rec') : ''}</option>`)}</select>${E(M, 'months')}</div></div>
            <div class="dm-sum"><div><small>${t('dm.m.rent')}</small><b>${money(rent)}</b></div><div><small>${t('dm.m.deposit')}</small><b>${money(rent)}</b></div><div><small>${t('dm.m.eff')}</small><b>${f.from && f.from > min ? f.from : min}</b></div></div>
            <p class="dm-ofwas">${icon('shield', 16)} <span><b>${t('dm.m.ofwas')}</b> ${t('dm.m.ofwasBody')}</span></p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="dm-new-ok">${icon('check', 16)} ${t('dm.m.confirm')}</button></footer></div></div>`;
      }
      function slipModal() {
        const l = dm.lease(D.modal.id); if (!l) return ''; const e = hr.emp(l.empNo); const d = dm.dorm(l.dormId); const b = dm.bed(l.bedId);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('dm.slip.title'), l.ofwas.ref)}
          <div class="a-mbody"><div class="tr-pass-h"><div><small class="mute">${t('dm.slip.kicker')}</small><h3 class="pt-title">${nm(e)}</h3><p class="mute">${e.idMask} · ${e.wpNo || ''}</p></div><div class="tr-qrbox">${BS.qrSvg(l.ofwas.ref)}<code>${l.ofwas.ref}</code><small class="mute">${t('dm.slip.scan')}</small></div></div>
            <dl class="a-dl lv-dl"><div><dt>${t('dm.slip.addr')}</dt><dd>${dName(d)}, ${d.addr} (${b.room}, ${b.bed})</dd></div><div><dt>${t('dm.slip.lic')}</dt><dd>${d.licence} · ${d.operator}</dd></div><div><dt>${t('dm.c.move')}</dt><dd>${l.effective || t('dm.asked', { d: l.from })}</dd></div><div><dt>${t('dm.c.ofwas')}</dt><dd><span class="a-tag ${l.ofwas.status === 'registered' ? 'approved' : 'pending'}">${t('dm.of.' + l.ofwas.status)}</span></dd></div></dl>
            <h3 class="hr-h">${t('dep.d.log')}</h3><ol class="dp-log">${l.log.map((x) => html`<li><b>${t('dm.log.' + x.type)}</b> <span class="mute">${x.at} · ${accName(x.by)}</span>${x.note ? html`<small>${x.note}</small>` : ''}</li>`)}</ol></div>
          <footer><button type="button" class="a-btn" data-act="dm-print">${icon('file', 14)} ${t('trn.pass.print')}</button><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }
      function endModal() {
        const M = D.modal; const l = dm.lease(M.id); if (!l) return ''; const e = hr.emp(l.empNo);
        const cancel = M.k === 'cancel';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t(cancel ? 'dm.cancel.title' : 'dm.end.title'), `${nm(e)} · ${l.id}`)}
          <div class="a-mbody l-form"><p class="p-warnbox">${icon('warn', 16)} ${t(cancel ? 'dm.cancel.msg' : 'dm.end.msg', { d: money(l.deposit) })}</p>${cancel ? '' : html`<div class="a-frow"><label class="a-lab" for="dm-end"><b class="req">*</b> ${t('dm.end.date')}</label><input id="dm-end" type="date" class="a-field" data-m="date" value="${M.f.date}">${E(M, 'date')}</div>`}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="${cancel ? 'dm-edit-cancel-ok' : 'dm-edit-end-ok'}">${t(cancel ? 'dm.cancel' : 'dm.end')}</button></footer></div></div>`;
      }
      function modal() { const M = D.modal; if (!M) return ''; if (M.id && !dm.lease(M.id)) { D.modal = null; return ''; } return M.k === 'alloc' ? allocModal() : M.k === 'slip' ? slipModal() : endModal(); }

      function exportCsv() {
        const rows = myLeases(); download(`bed-leases-${today()}.csv`, csvOf([['id', 'empNo', 'name', 'dormitory', 'room', 'bed', 'rent', 'deposit', 'months', 'move_in', 'ofwas', 'status'], ...rows.map((l) => { const e = hr.emp(l.empNo), b = dm.bed(l.bedId); return [l.id, l.empNo, e ? e.nameEn || e.name : '', dm.dorm(l.dormId).en, b.room, b.bed, l.rent, l.deposit, l.months, l.effective || '', l.ofwas.ref + ' ' + l.ofwas.status, dm.phase(l)]; })]));
        toast(t('hr.toast.exported', { n: rows.length }), 'ok');
      }
      const ERR = { state: 'dm.t.stale', missing: 'dm.t.stale', date: 'dm.e.date', before_start: 'dm.e.before_start' };

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.dorm'), act: 'noop' }, { text: t('dm.tab.' + D.tab) }]; }, page, modal,
        onTab() { D.modal = null; },
        afterRender(v) { if (D.tab === 'find' && D.view === 'map') mountMap(v); },
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.hasAttribute('data-fkw')) { D.kw = el.value; return; }
          if (el.hasAttribute('data-sites')) { D.sites = el.checked; render(); return; }
          if (el.dataset.f) { const k = el.dataset.f; if (k === 'budget') return; D.f[k] = el.type === 'checkbox' ? el.checked : el.value; D.pick = []; render(); return; }
          if (M && el.dataset.m) {
            const k = el.dataset.m; if (k.startsWith('w:')) { M.f.workers[+k.slice(2)] = el.value; M.errs = {}; render(); return; }
            M.f[k] = el.value; M.errs = {}; if (k === 'months') render();
          }
        },
        onChange(e) { const el = e.target; if (el.dataset && el.dataset.f === 'budget') { D.f.budget = +el.value; D.pick = []; render(); } },
        onSubmit() { D.f.kw = D.kw; D.pick = []; render(); },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id; const M = D.modal; const p = party(); const l = id && dm.lease(id);
          if ((l && !myLeases().some((x) => x.id === l.id)) || (a === 'dm-approve-confirm' && p !== 'employer')) { D.modal = null; toast(t('pm.noOp'), 'warn'); render(); return true; }
          switch (a) {
            case 'noop': break;
            case 'dm-inspect': D.sel = id; D.pick = []; render(); { const d0 = dm.dorm(id); if (D.view === 'map' && d0) BS.map.slot('dorm').focus(d0.lat, d0.lng, 14); } break;
            case 'dm-view': D.view = b.dataset.v; render(); break;
            case 'dm-pick': { const bid = b.dataset.b; D.pick = D.pick.includes(bid) ? D.pick.filter((x) => x !== bid) : [...D.pick, bid]; render(); break; }
            case 'dm-new': D.modal = { k: 'alloc', dormId: D.sel, beds: D.pick.filter((x) => dm.free(dm.bed(x))), f: { workers: [], from: dm.earliest(D.pick), months: '6' }, errs: {}, min: dm.earliest(D.pick) }; D.modal.f.workers = D.modal.beds.map(() => ''); render(); break;
            case 'dm-new-ok': {
              const f = M.f; const items = M.beds.map((bid, i) => ({ bedId: bid, empNo: f.workers[i] })); const r = dm.allocate({ items, months: f.months, from: f.from }, P.currentId(), p === 'subcon' && org() ? org().id : '');
              if (!r.ok) { const er = { ...r.errors }; if (er.from === 'date' || er.from === 'past' || er.from === 'far') { /* keep */ } M.errs = er; render(); break; }
              D.modal = null; D.pick = []; D.tab = 'leases'; D.ls = ''; ctx.rerender(); toast(t('dm.t.allocated', { n: r.leases.length }), 'ok'); break;
            }
            case 'dm-lf': D.ls = b.dataset.k; render(); break;
            case 'dm-slip': D.modal = { k: 'slip', id }; render(); break;
            case 'dm-print': window.print(); break;
            case 'dm-export': exportCsv(); break;
            case 'dm-approve-confirm': { const r = dm.confirm(id); if (!r.ok) { toast(t(ERR[r.error] || 'dm.t.stale'), 'warn'); break; } render(); toast(t('dm.t.confirmed', { d: r.effective }), 'ok'); break; }
            case 'dm-edit-cancel': D.modal = { k: 'cancel', id, f: {}, errs: {} }; render(); break;
            case 'dm-edit-cancel-ok': { const r = dm.cancel(M.id); D.modal = null; render(); toast(t(r.ok ? 'dm.t.cancelled' : 'dm.t.stale'), r.ok ? 'ok' : 'warn'); break; }
            case 'dm-edit-end': D.modal = { k: 'end', id, f: { date: today() }, errs: {} }; render(); break;
            case 'dm-edit-end-ok': { const r = dm.end(M.id, M.f.date); if (!r.ok) { if (r.error === 'date' || r.error === 'before_start') { M.errs = { date: r.error }; render(); break; } D.modal = null; render(); toast(t('dm.t.stale'), 'warn'); break; } D.modal = null; render(); toast(t('dm.t.ended'), 'ok'); break; }
            case 'close-modal': D.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.tab = 'find'; D.f = F0(); D.kw = ''; D.sel = ''; D.pick = []; D.modal = null; D.ls = ''; D.view = 'list'; D.sites = true; },
      };
    },
  });
})(window.BS);
