/* Worker app: 我的住宿 — the worker's own dormitory bed, where it is on the map relative to the worksite, and the shuttle times.
   Nothing here is editable by the worker; beds are allocated by the employer in the dormitory hub. */
(function (BS) {
  const dm = BS.dorm, hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const P = { as: '' };
    const me = () => P.as || BS.ME.empNo;
    const money = (n) => 'S$ ' + Number(n).toFixed(2);

    // ---------- a shared room: our own workers and people from other companies ----------
    const FOREIGN = [['Rahim M.', 'bd', 'Welder'], ['Kumar S.', 'in', 'Scaffolder'], ['Nguyen V.', 'vn', 'Pipefitter'], ['Aung T.', 'mm', 'Rigger'], ['Hasan A.', 'bd', 'Electrician'], ['Li J.', 'cn', 'Carpenter'], ['Zaw M.', 'mm', 'Welder'], ['Ravi P.', 'in', 'Fitter']];
    const OTHER_CO = ['Sentosa Steelworks Pte Ltd', 'Lion City Piling Pte Ltd', 'Marina Rigging Services Pte Ltd', 'Eastbay Scaffolding Pte Ltd', 'Tuas MEP Engineering Pte Ltd'];
    const hashOf = (s) => { let h = 7; for (const c of String(s)) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
    /** a bed for a worker who has none, so the shared-room screen can be shown: a free bed in the room where our own workers already live */
    function sampleLease(empNo) {
      const live = dm.leases().filter((x) => dm.LIVE.includes(x.status) && x.dormId === 'westfield')[0];
      const room = live ? dm.bed(live.bedId).room : null; const beds = dm.beds('westfield');
      const free = (b) => !b.taken && !dm.leased(b.id); const bed = beds.find((b) => b.room === room && free(b)) || beds.find((b) => free(b) && b.lower); if (!bed) return null;
      return { id: 'sample', dormId: 'westfield', bedId: bed.id, empNo, rent: bed.price, deposit: bed.price, months: 6, effective: hr.addDays(BS.fmt.now().slice(0, 10), -12), status: 'confirmed', ofwas: { ref: 'OFWAS-SAMPLE' }, sample: true };
    }
    const person = (b, empNo, kind, since) => { const e = hr.emp(empNo); return { bed: b, kind, name: e ? e.name : empNo, nameEn: e ? e.nameEn || e.name : empNo, co: e ? e.employer : { zh: '', en: '' }, trade: e && e.trades[0] ? hr.trade(e.trades[0]) : null, country: e ? e.country : '', since }; };
    /** everyone in the room: our workers from their leases, beds taken by other operators' tenants as fictional people from other companies, and what is empty */
    function roommates(l) {
      const me0 = dm.bed(l.bedId); const beds = dm.beds(l.dormId).filter((b) => b.room === me0.room);
      return beds.map((b) => {
        if (b.id === l.bedId) return person(b, l.empNo, 'me', l.effective);
        const ls = dm.leases().find((x) => x.bedId === b.id && dm.LIVE.includes(x.status));
        if (ls) return person(b, ls.empNo, 'ours', ls.effective || ls.from);
        if (b.taken || l.sample) { const h = hashOf(b.id); const f = FOREIGN[h % FOREIGN.length]; const co = OTHER_CO[(h >> 3) % OTHER_CO.length]; return { bed: b, kind: 'other', name: f[0], nameEn: f[0], co: { zh: co, en: co }, tradeText: f[2], country: f[1], since: hr.addDays(BS.fmt.now().slice(0, 10), -(30 + h % 300)) }; }
        return { bed: b, kind: 'empty' };
      });
    }
    const RULES = ['quiet', 'cook', 'clean', 'visitors', 'key'];

    function main(api) {
      const { t, html, icon, header } = api; const z = api.lang === 'zh'; const emp = hr.emp(me()); let l = dm.liveLeaseOf(me()); if (!l && !P.as) l = sampleLease(me());
      const demo = dm.leases().filter((x) => dm.LIVE.includes(x.status)).slice(0, 4);
      const demoBar = P.as || !l ? html`<section class="w-card w-dm-demo"><small>${icon('refresh', 12)} ${t('w.dm.demo')}</small><div class="w-trn-chips">${P.as ? html`<button type="button" data-act="dm-as" data-e="">${t('w.dm.back')}</button>` : ''}${demo.map((x) => { const e = hr.emp(x.empNo); return html`<button type="button" class="${P.as === x.empNo ? 'on' : ''}" data-act="dm-as" data-e="${x.empNo}">${e ? (z ? e.name : e.nameEn || e.name) : x.empNo}</button>`; })}</div></section>` : '';
      if (!l) return html`${header(t('w.dm.title'))}<div class="w-body"><div class="w-empty">${icon('home', 40)}<p>${t('w.dm.none')}</p><small>${t('w.dm.noneSub')}</small></div>${demoBar}</div>`;
      const d = dm.dorm(l.dormId); const b = dm.bed(l.bedId); const phase = dm.phase(l); const siteKey = emp && emp.assigns[0] && emp.assigns[0].siteKey; const site = siteKey && hr.site(siteKey);
      const sh = d.shuttles.find(([k]) => k === siteKey); const km = site ? dm.distanceKm(d.id, siteKey) : null;
      setTimeout(() => mountMap(api, d, site, sh), 0);
      return html`
        ${header(t('w.dm.title'))}
        <div class="w-body w-dm">
          <section class="w-card w-dm-hero"><span class="w-tag ${phase === 'active' ? 'approved' : 'pending'}">${t('w.dm.ph.' + phase)}</span><b>${z ? d.zh : d.en}</b><small>${d.addr}</small>
            <div class="w-dm-bed"><div><small>${t('w.dm.room')}</small><b>${b ? b.room : '—'}</b></div><div><small>${t('w.dm.bed')}</small><b>${b ? b.bed + ' · ' + t(b.lower ? 'dm.lower' : 'dm.upper') : '—'}</b></div><div><small>${t('w.dm.from')}</small><b>${l.effective || t('w.dm.pending')}</b></div></div></section>
          ${l.sample ? html`<p class="w-note info" data-role="sample">${icon('warn', 14)} ${t('w.dm.sample')}</p>` : ''}
          ${roomCard(api, l, b)}
          <div class="w-trn-map w-dm-map" data-map-slot="dorm-w" aria-label="${t('w.dm.map')}"></div>
          <section class="w-card w-dm-row"><span class="w-ico-sq">${icon('pin', 18)}</span><div><small>${t('w.dm.site')}</small><b>${site ? (z ? site.zh : site.en) : t('w.dm.nosite')}</b>${km != null ? html`<small>${t('dm.km', { n: km })}</small>` : ''}</div></section>
          ${sh ? html`<section class="w-card w-dm-shuttle"><b>${icon('clock', 14)} ${t('w.dm.shuttle')}</b><div class="w-dm-times"><div><small>${t('dm.am')}</small><span>${sh[1].join(' · ')}</span></div><div><small>${t('dm.pm')}</small><span>${sh[2].join(' · ')}</span></div></div></section>` : html`<p class="w-note">${icon('warn', 14)} ${t('w.dm.noShuttle')}</p>`}
          <section class="w-card w-dm-row"><span class="w-ico-sq">${icon('wallet', 18)}</span><div><small>${t('w.dm.rent')}</small><b>${money(l.rent)} / ${t('dm.month')}</b><small>${t('w.dm.deposit', { n: money(l.deposit) })}</small></div></section>
          <p class="w-note">${icon('shield', 14)} ${t('w.dm.ofwas', { r: l.ofwas.ref })}</p>
          ${demoBar}
        </div>`;
    }
    function roomCard(api, l, b) {
      const { t, html, icon } = api; const z = api.lang === 'zh'; const people = roommates(l); const d = dm.dorm(l.dormId); const mine = hr.emp(l.empNo); const myCo = mine ? (z ? mine.employer.zh : mine.employer.en) : '';
      const cos = [...new Set(people.filter((x) => x.kind !== 'empty').map((x) => (z ? x.co.zh : x.co.en)))]; const others = cos.filter((c) => c !== myCo).length; const empty = people.filter((x) => x.kind === 'empty').length;
      return html`<section class="w-card w-dm-room" data-role="room"><div class="w-dm-room-h"><b>${icon('users', 16)} ${t('w.dm.roommates')}</b><span class="w-tag ${others ? 'pending' : 'approved'}">${others ? t('w.dm.mixed', { n: cos.length }) : t('w.dm.sameCo')}</span></div>
        <small class="w-dm-sub">${t('w.dm.roomFacts', { r: b.room, n: people.length, ac: t(b.ac ? 'w.dm.ac' : 'w.dm.fan'), e: empty })}</small>
        <div class="w-dm-people">${people.map((p) => (p.kind === 'empty' ? html`<div class="w-dm-p empty" data-bed="${p.bed.bed}"><i class="w-av">·</i><div><b>${t('w.dm.emptyBed')}</b><small>${p.bed.bed} · ${t(p.bed.lower ? 'dm.lower' : 'dm.upper')}</small></div></div>`
          : html`<div class="w-dm-p ${p.kind}" data-bed="${p.bed.bed}"><i class="w-av">${(z ? p.name : p.nameEn).slice(0, 1)}</i><div><b>${z ? p.name : p.nameEn}${p.kind === 'me' ? html` <em>${t('w.dm.you')}</em>` : ''}</b><small>${z ? p.co.zh : p.co.en}</small><small>${p.trade ? (z ? p.trade.zh : p.trade.en) : p.tradeText || ''}${p.country && hr.COUNTRIES[p.country] ? ' · ' + hr.COUNTRIES[p.country][z ? 0 : 1] : ''} · ${t('w.dm.since', { d: p.since })}</small></div><span class="w-dm-bn">${p.bed.bed}<small>${t(p.bed.lower ? 'dm.lower' : 'dm.upper')}</small></span></div>`))}</div>
        <p class="w-note">${icon('shield', 14)} ${t('w.dm.privacy')}</p>
        <div class="w-dm-rules"><b>${t('w.dm.rules')}</b><ul>${RULES.map((k) => html`<li>${t('w.dm.rule.' + k)}</li>`)}</ul></div>
        <div class="w-dm-contact"><span>${icon('user', 14)} ${t('w.dm.manager')}</span><b>${d.operator}</b><small>${t('w.dm.hours')}</small></div></section>`;
    }
    function mountMap(api, d, site, sh) {
      const host = api.root.querySelector('[data-map-slot=dorm-w]'); if (!host) return; const s = BS.map.slot('dorm-w'); s.mount(host); const z = api.lang === 'zh';
      const pins = [{ id: d.id, kind: 'dorm', lat: d.lat, lng: d.lng, count: 1, label: z ? d.zh : d.en, selected: true }];
      if (site && site.lat != null) pins.push({ id: 'site:' + site.key, kind: 'site', lat: site.lat, lng: site.lng, short: site.code.split('-').pop().slice(0, 4), label: `${z ? site.zh : site.en} (${site.code})`, selected: true });
      const lines = site && site.lat != null && sh ? [{ from: [d.lat, d.lng], to: [site.lat, site.lng], strong: true, label: `${z ? d.zh : d.en} → ${z ? site.zh : site.en}` }] : [];
      s.set({ pins, lines, lang: api.lang, fitText: api.t('dm.map.fit'), fitKey: d.id + '|' + (site ? site.key : ''), legend: [{ cls: 'dorm', text: api.t('w.dm.leg.dorm') }, ...(site ? [{ cls: 'site', text: api.t('dm.map.leg.site') }] : [])], onSelect: () => {} });
    }
    return {
      stores: [dm, hr],
      screens: { 'dorm-my': main },
      onClick(a, b, api) {
        if (a === 'open-dorm') { P.as = ''; api.go([{ s: 'home' }, { s: 'dorm-my' }]); return true; }
        if (a === 'dm-as') { P.as = b.dataset.e; api.render(); return true; }
        return false;
      },
    };
  })());
})(window.BS);
