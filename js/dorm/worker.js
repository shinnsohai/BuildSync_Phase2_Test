/* Worker app: 我的住宿 — the worker's own dormitory bed, where it is on the map relative to the worksite, and the shuttle times.
   Nothing here is editable by the worker; beds are allocated by the employer in the dormitory hub. */
(function (BS) {
  const dm = BS.dorm, hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const P = { as: '' };
    const me = () => P.as || BS.ME.empNo;
    const money = (n) => 'S$ ' + Number(n).toFixed(2);

    function main(api) {
      const { t, html, icon, header } = api; const z = api.lang === 'zh'; const emp = hr.emp(me()); const l = dm.liveLeaseOf(me());
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
          <div class="w-trn-map w-dm-map" data-map-slot="dorm-w" aria-label="${t('w.dm.map')}"></div>
          <section class="w-card w-dm-row"><span class="w-ico-sq">${icon('pin', 18)}</span><div><small>${t('w.dm.site')}</small><b>${site ? (z ? site.zh : site.en) : t('w.dm.nosite')}</b>${km != null ? html`<small>${t('dm.km', { n: km })}</small>` : ''}</div></section>
          ${sh ? html`<section class="w-card w-dm-shuttle"><b>${icon('clock', 14)} ${t('w.dm.shuttle')}</b><div class="w-dm-times"><div><small>${t('dm.am')}</small><span>${sh[1].join(' · ')}</span></div><div><small>${t('dm.pm')}</small><span>${sh[2].join(' · ')}</span></div></div></section>` : html`<p class="w-note">${icon('warn', 14)} ${t('w.dm.noShuttle')}</p>`}
          <section class="w-card w-dm-row"><span class="w-ico-sq">${icon('wallet', 18)}</span><div><small>${t('w.dm.rent')}</small><b>${money(l.rent)} / ${t('dm.month')}</b><small>${t('w.dm.deposit', { n: money(l.deposit) })}</small></div></section>
          <p class="w-note">${icon('shield', 14)} ${t('w.dm.ofwas', { r: l.ofwas.ref })}</p>
          ${demoBar}
        </div>`;
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
