/* Worker app: 我的证书 — own certificates and the "certificate expiring" reminder detail. */
(function (BS) {
  const hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const L = (api, o) => (o ? (api.lang === 'zh' ? o.zh : o.en || o.zh) : '');
    const tname = (api, c) => L(api, hr.certType(c.type) || { zh: c.type, en: c.type });
    const tagCls = { ok: 'approved', perm: 'approved', soon: 'pending', expired: 'rejected' };
    const tag = (api, st) => api.html`<span class="w-tag ${tagCls[st]}">${api.t('hr.cert.' + st)}</span>`;
    const left = (api, c) => { const d = hr.certDays(c); return d == null ? api.t('w.cr.perm') : d < 0 ? api.t('w.cr.over', { n: -d }) : api.t('w.cr.left', { n: d }); };
    let announced = false;

    function list(api) {
      const { t, html, icon, header } = api; const all = hr.certsOf(me()).slice().sort((a, b) => (hr.certDays(a) ?? 1e9) - (hr.certDays(b) ?? 1e9));
      return html`
        ${header(t('w.cr.title'))}
        <div class="w-body">
          ${all.length ? all.map((c) => { const st = hr.certStatus(c); return html`<button type="button" class="w-card w-rec w-cert ${st}" data-act="cr-open" data-id="${c.id}">
            <div class="w-rec-top"><span class="w-ico-sq">${icon('cert', 18)}</span><b>${tname(api, c)}</b>${tag(api, st)}</div>
            <div class="w-kv"><span>${t('w.cr.d.no')}</span><b>${c.no}</b></div>
            <p class="w-pssub">${c.expiry ? t('w.cr.until', { d: c.expiry }) + ' · ' + left(api, c) : t('w.cr.perm')}${c.file ? '' : ' · ' + t('w.cr.noFile')}</p>${icon('right', 18, 'w-rec-go')}</button>`; })
            : html`<div class="w-empty">${icon('cert', 40)}<p>${t('w.cr.none')}</p></div>`}
        </div>`;
    }
    function detail(api) {
      const { t, html, icon, header } = api; const e = hr.emp(me()); const c = hr.certsOf(me()).find((x) => x.id === api.cur().id);
      if (!c) return html`${header(t('w.cr.d.head'))}<div class="w-body"><div class="w-empty"><p>${t('w.cr.none')}</p></div></div>`;
      const st = hr.certStatus(c); const d = hr.certDays(c); const row = (k, v) => html`<div class="w-row"><span>${k}</span><b>${v}</b></div>`;
      const title = st === 'soon' ? 'w.cr.d.soon' : st === 'expired' ? 'w.cr.d.expired' : 'w.cr.d.ok';
      const sub = st === 'soon' ? t('w.cr.d.left', { n: d }) : st === 'expired' ? t('w.cr.d.over', { n: -d }) : c.expiry ? t('w.cr.d.okSub', { d: c.expiry }) : t('w.cr.d.permSub');
      return html`
        ${header(t('w.cr.d.head'))}
        <div class="w-body">
          <section class="w-cert-hero ${st}"><span class="w-ico-sq lg">${icon(st === 'ok' || st === 'perm' ? 'check' : 'bell', 24)}</span><div><b>${t(title)}</b><small>${sub}</small></div>${tag(api, st)}</section>
          <section class="w-card w-list">
            ${row(t('w.cr.d.name'), tname(api, c))}${row(t('w.cr.d.no'), c.no)}${row(t('w.cr.d.holder'), L(api, { zh: e.name, en: e.nameEn }))}${row(t('w.cr.d.issued'), c.issued || '—')}${row(t('w.cr.d.expiry'), c.expiry || t('w.cr.perm'))}
            ${row(t('w.cr.d.remain'), d == null ? t('w.cr.perm') : d < 0 ? t('w.cr.d.dayOver') : t('w.cr.d.days', { n: d }))}${row(t('w.cr.d.status'), t('hr.cert.' + st))}</section>
          ${st === 'soon' || st === 'expired' ? html`<section class="w-card w-cert-act"><b>${icon('warn', 16)} ${t('w.cr.d.act')}</b><p>${t('w.cr.d.note')}</p></section>` : ''}
          <section class="w-card w-list">${row(t('w.cr.d.source'), t('w.cr.d.auto'))}</section>
        </div>`;
    }

    function announce(api) {
      const due = hr.dueReminders(me())[0]; if (!due) return;
      const name = tname(api, due.cert);
      api.showBanner({ kind: due.kind === 'expired' ? 'bad' : 'info', act: 'cr-open', id: due.cert.id, title: api.t(due.kind === 'expired' ? 'w.cr.nt.expired' : 'w.cr.nt.soon'), msg: due.kind === 'expired' ? api.t('w.cr.nt.msgOver', { n: name, d: -due.days }) : api.t('w.cr.nt.msg', { n: name, d: due.days }) });
    }

    return {
      stores: [hr],
      screens: { cert: list, 'cert-detail': detail },
      init(api) { if (!announced) { announced = true; setTimeout(() => announce(api), 900); } },
      onClick(a, b, api) {
        switch (a) {
          case 'open-cert': api.go([{ s: 'home' }, { s: 'cert' }]); return true;
          case 'cr-open': api.W.banner = null; api.push('cert-detail', { id: b.dataset.id }); return true;
        }
        return false;
      },
      onStore(evt, api) {
        if (evt.type === 'cert' && evt.empNo === me()) {
          const c = hr.certsOf(me()).find((x) => x.id === evt.id);
          if (c) { api.showBanner({ kind: 'ok', act: 'cr-open', id: c.id, title: api.t('w.cr.nt.updated'), msg: tname(api, c) }); return; }
        }
        api.render();
      },
    };
  })());
})(window.BS);
