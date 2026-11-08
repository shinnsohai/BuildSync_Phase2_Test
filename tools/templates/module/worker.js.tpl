// @ts-check
/* The phone screens of __EN__: the home tile opens a list of what is assigned to the signed-in worker, who can mark an item done.
   The tile itself (icon, label, act) is declared in the manifest; this file answers its `act` and draws the screen. */
(function (BS) {
  const sdk = BS.sdk; const mod = () => BS.__ID__;

  /** @param {BuiltSync.PhoneApi} api */
  function screen(api) {
    const { t, html, icon, header } = api; const me = sdk.me().empNo; const items = mod().mine(me);
    return html`
      ${header(t('__ID__.mine'))}
      <div class="w-body">
        ${items.length ? items.map((x) => html`<section class="w-card __ID__-item ${x.status}" data-item="${x.id}">
          <b>${x.title}</b>${x.note ? html`<p class="w-note">${x.note}</p>` : ''}
          <div class="__ID__-meta"><span>${x.due ? t('__ID__.dueOn', { d: x.due }) : ''}</span>${mod().isLate(x) ? html`<span class="__ID__-late">${t('__ID__.late')}</span>` : ''}<span class="w-tag ${x.status === 'done' ? 'approved' : 'pending'}">${t('__ID__.status.' + x.status)}</span></div>
          ${x.status === 'open' ? html`<button type="button" class="w-btn primary" data-act="__ID__-done" data-id="${x.id}">${icon('check', 16)} ${t('__ID__.done')}</button>` : ''}
        </section>`) : html`<div class="w-empty">${icon('list', 40)}<p>${t('__ID__.mineNone')}</p></div>`}
      </div>`;
  }

  sdk.phone.extend({
    stores: [{ subscribe: (fn) => mod().subscribe(fn) }],             // the screen repaints when the data changes
    screens: { '__ID__': screen },
    onClick(act, el, api) {
      switch (act) {
        case 'open-__ID__': api.go([{ s: 'home' }, { s: '__ID__' }]); return true;
        case '__ID__-done': { const r = mod().setStatus(el.dataset.id || '', 'done', sdk.me().empNo); if (!r.ok) api.toast(api.t('__ID__.e.' + (r.error === 'missing' ? 'missing' : 'denied')), 'warn'); else api.toast(api.t('__ID__.saved'), 'ok'); api.render(); return true; }
        default: return false;
      }
    },
  });
})(window.BS);
