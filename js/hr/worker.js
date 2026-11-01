/* Worker app: a disabled employee sees an "account disabled" screen (the roster's 停用 takes effect immediately). */
(function (BS) {
  (BS.workerExt = BS.workerExt || []).push({
    stores: [BS.hr],
    gate(api) {
      const e = BS.hr.emp(BS.ME.empNo); if (!e || e.status !== 'disabled') return null;
      const { t, html, icon } = api;
      return html`<div class="w-gate"><span class="w-gate-ic">${icon('user', 34)}</span><h1>${t('hr.gate.disabled')}</h1><p>${t('hr.gate.msg')}</p><button type="button" class="w-btn primary" data-act="gate-contact">${t('w.gate.contact')}</button><small>${t('w.gate.proto')}</small></div>`;
    },
  });
})(window.BS);
