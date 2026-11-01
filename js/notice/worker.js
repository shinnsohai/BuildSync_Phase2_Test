/* Worker app: 广播 — announcements sent to this person, unread marks, and the announcement detail. */
(function (BS) {
  const nt = BS.notice;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const pick = (api, a, k) => (api.lang === 'zh' ? a[k + 'Zh'] : a[k + 'En']);
    const sender = (api, a) => (api.lang === 'zh' ? a.sender.zh : a.sender.en);
    const stamp = (a) => a.sentAt.slice(5, 16).replace('T', ' ');

    function list(api) {
      const { t, html, icon } = api; const all = nt.mine(me()); const unread = nt.unread(me());
      return html`
        <div class="w-body w-bc">
          <div class="w-hero w-bc-hero"><h1>${t('w.bc.title')}</h1><button type="button" class="w-textbtn" data-act="bc-readall" ${unread ? '' : 'disabled'}>${t('w.bc.readAll')}</button></div>
          <div class="w-sec"><h2>${t('w.bc.latest')}</h2><span>${all.length}</span></div>
          ${all.length ? all.map((a) => { const un = !nt.isRead(me(), a.id); return html`<button type="button" class="w-card w-bc-item ${un ? 'unread' : ''}" data-act="bc-open" data-id="${a.id}">
            <span class="w-ico-sq">${icon('mega', 18)}</span><span class="w-bc-main"><b>${pick(api, a, 'title')}${un ? html`<i class="w-bc-dot" aria-label="${t('w.bc.nt')}"></i>` : ''}</b><small>${nt.plain(pick(api, a, 'body')).slice(0, 70)}</small><em>${sender(api, a)} · ${stamp(a)}</em></span></button>`; })
            : html`<div class="w-empty">${icon('mega', 40)}<p>${t('w.bc.none')}</p></div>`}
        </div>
        ${api.tabbar('w.tab.bc')}`;
    }
    function detail(api) {
      const { t, html, header, icon } = api; const a = nt.get(api.cur().id);
      if (!a || !a.recipients.includes(me()) || a.status === 'scheduled') return html`${header(t('w.bc.d.title'))}<div class="w-body"><div class="w-empty">${icon('mega', 40)}<p>${t('w.bc.none')}</p></div></div>`;
      return html`
        ${header(t('w.bc.d.title'))}
        <div class="w-body">
          <article class="w-card w-notice"><span class="w-tag approved">${t('w.bc.d.title')}</span><h2>${pick(api, a, 'title')}</h2>
            <p class="w-notice-meta">${t('w.bc.d.by')} · ${sender(api, a)}<br>${t('w.bc.d.at')} · ${a.sentAt.slice(0, 16).replace('T', ' ')}</p>
            <div class="w-notice-body">${BS.raw(nt.clean(pick(api, a, 'body')))}</div></article>
        </div>`;
    }

    return {
      stores: [nt],
      screens: { bc: list, 'bc-detail': detail },
      onClick(a, b, api) {
        switch (a) {
          case 'open-bc': api.go([{ s: 'home' }, { s: 'bc' }]); return true;
          case 'bc-open': api.W.banner = null; nt.markRead(me(), b.dataset.id); api.push('bc-detail', { id: b.dataset.id }); return true;
          case 'bc-readall': nt.markAll(me()); api.toast(api.t('w.bc.allRead'), 'ok'); return true;
        }
        return false;
      },
      onStore(evt, api) {
        if (evt.type === 'sent') { const a = nt.get(evt.id); if (a && a.recipients.includes(me())) { api.showBanner({ kind: 'info', act: 'bc-open', id: a.id, title: api.t('w.bc.nt'), msg: pick(api, a, 'title') }); return; } }
        api.render();
      },
    };
  })());
})(window.BS);
