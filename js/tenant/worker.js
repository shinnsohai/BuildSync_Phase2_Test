/* Worker app: when the user's tenant is disabled or its subscription is not valid, the app shows a "service paused" screen.
   (Assumption — the designs don't describe what workers see; remove this file to drop the behaviour.) */
(function (BS) {
  (BS.workerExt = BS.workerExt || []).push({
    stores: [BS.tenant],
    gate(api) {
      const a = BS.tenant.access(BS.tenant.ME_TENANT); if (a.ok) return null;
      const { t, html, icon } = api; const x = BS.tenant.tenant(BS.tenant.ME_TENANT);
      return html`<div class="w-gate"><span class="w-gate-ic">${icon('shield', 34)}</span><h1>${t('w.gate.' + a.reason)}</h1><p>${t('w.gate.msg', { name: x.name })}</p>
        <button type="button" class="w-btn primary" data-act="gate-contact">${t('w.gate.contact')}</button><small>${t('w.gate.proto')}</small></div>`;
    },
    onClick(a, b, api) { if (a === 'gate-contact') { api.toast(api.t('w.gate.toast'), 'warn'); return true; } return false; },
  });
})(window.BS);
