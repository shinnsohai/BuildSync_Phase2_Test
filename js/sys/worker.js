/* Worker app: 设置 — agreements and about pages written in 内容配置 (系统与三方配置). */
(function (BS) {
  const sy = BS.sys;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const pick = (api, c, k) => (api.lang === 'zh' ? c[k + 'Zh'] : c[k + 'En']);
    const DOCS = ['privacy', 'terms', 'about'];

    function main(api) {
      const { t, html, icon } = api; const docs = DOCS.map((id) => sy.live(id)).filter(Boolean);
      return html`
        <div class="w-body">
          <div class="w-hero"><h1>${t('w.set.title')}</h1></div>
          <div class="w-sec"><h2>${t('w.set.legal')}</h2></div>
          <section class="w-card w-list">${docs.length ? docs.map((c) => html`<button type="button" class="w-row w-set-row" data-act="set-doc" data-id="${c.id}"><span>${pick(api, c, 'title')}</span><small>${c.version}</small>${icon('right', 16)}</button>`) : html`<p class="w-sub">${t('w.set.none')}</p>`}
            <div class="w-row"><span>${t('w.set.version')}</span><b>Phase 2 prototype</b></div></section>
          <p class="w-note info">${icon('globe', 16)} ${t('w.set.langNote')}</p>
        </div>
        ${api.tabbar('w.tab.set')}`;
    }
    function doc(api) {
      const { t, html, header, icon } = api; const c = sy.live(api.cur().id);
      if (!c) return html`${header(t('w.set.title'))}<div class="w-body"><div class="w-empty">${icon('file', 40)}<p>${t('w.set.none')}</p></div></div>`;
      return html`
        ${header(pick(api, c, 'title'))}
        <div class="w-body"><article class="w-card w-notice"><h2>${pick(api, c, 'title')}</h2><p class="w-notice-meta">${c.version} · ${t('w.set.updated', { d: c.updatedAt })}</p><div class="w-notice-body">${BS.raw(BS.notice.clean(pick(api, c, 'body')))}</div></article></div>`;
    }
    return {
      stores: [sy],
      screens: { set: main, 'set-doc': doc },
      onClick(a, b, api) {
        if (a === 'open-set') { api.go([{ s: 'home' }, { s: 'set' }]); return true; }
        if (a === 'set-doc') { api.push('set-doc', { id: b.dataset.id }); return true; }
        return false;
      },
    };
  })());
})(window.BS);
