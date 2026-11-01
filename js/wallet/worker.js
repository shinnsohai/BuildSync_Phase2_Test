/* Worker app: 积分钱包 — own points, what they are worth as a cash voucher or as course credit, history, and redeeming. */
(function (BS) {
  const wl = BS.wallet;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const money = (n) => 'S$ ' + Number(n).toFixed(2);
    const P = { wallet: 'course', pts: wl.STEP };
    const pts = (n) => (n > 0 ? '+' : '') + n.toLocaleString('en-US');

    function main(api) {
      const { t, html, icon, header } = api; const bal = wl.points(me()); const w = wl.worth(bal); const cr = wl.credit(me()); const hist = wl.ledger(me()).slice(0, 15);
      return html`
        ${header(t('w.wl.title'))}
        <div class="w-body">
          <section class="w-card w-wl-hero"><small>${t('w.wl.balance')}</small><b>${bal.toLocaleString('en-US')}<i> pts</i></b><p>${t('w.wl.rate', { c: w.rate.cash, k: w.rate.course })}</p></section>
          <div class="w-wl-routes">
            <button type="button" class="w-card w-wl-route" data-act="wl-open" data-w="cash" ${bal < wl.STEP ? 'disabled' : ''}><span class="w-ico-sq">${icon('wallet', 18)}</span><small>${t('w.wl.cash')}</small><b>${money(w.cash)}</b><em>${t('w.wl.redeemCash')}</em></button>
            <button type="button" class="w-card w-wl-route boost" data-act="wl-open" data-w="course" ${bal < wl.STEP ? 'disabled' : ''}><span class="w-ico-sq">${icon('cert', 18)}</span><small>${t('w.wl.course')} <i>2×</i></small><b>${money(w.course)}</b><em>${t('w.wl.redeemCourse')}</em></button></div>
          ${cr > 0 ? html`<section class="w-card w-wl-credit">${icon('check', 16)} <span>${t('w.wl.credit')}: <b>${money(cr)}</b><small>${t('w.wl.creditHint')}</small></span></section>` : ''}
          <h3 class="w-wl-h">${t('w.wl.history')}</h3>
          ${hist.length ? hist.map((x) => html`<div class="w-card w-wl-row ${x.kind}"><div><b>${wl.reasonText(x, t, api.lang === 'zh')}</b><small>${x.date}${x.code ? ' · ' + x.code : ''}${x.kind === 'spend' || x.kind === 'refund' ? ' · ' + money(Math.abs(x.cc)) : ''}</small></div><span class="${x.points > 0 || x.kind === 'win' ? 'up' : x.points < 0 ? 'down' : ''}">${x.points ? pts(x.points) : x.kind === 'win' ? '+' + money(x.cash || x.cc) : '—'}</span></div>`) : html`<div class="w-empty">${icon('wallet', 40)}<p>${t('w.wl.none')}</p></div>`}
        </div>`;
    }
    function redeem(api) {
      const { t, html, icon, header } = api; const bal = wl.points(me()); const max = Math.floor(bal / wl.STEP) * wl.STEP; if (P.pts > max) P.pts = Math.max(wl.STEP, max); const w = wl.worth(P.pts);
      return html`
        ${header(t('w.wl.redeemTitle'))}
        <div class="w-body">
          <section class="w-card w-wl-hero small"><small>${t('w.wl.balance')}</small><b>${bal.toLocaleString('en-US')}<i> pts</i></b></section>
          <div class="w-seg" role="radiogroup">${['cash', 'course'].map((k) => html`<button type="button" class="${P.wallet === k ? 'on' : ''}" data-act="wl-pick" data-w="${k}" aria-pressed="${P.wallet === k ? 'true' : 'false'}">${t('w.wl.' + k)}</button>`)}</div>
          <section class="w-card w-wl-step"><button type="button" data-act="wl-step" data-d="-1" aria-label="−" ${P.pts <= wl.STEP ? 'disabled' : ''}>−</button><div><b>${P.pts}</b><small>pts</small></div><button type="button" data-act="wl-step" data-d="1" aria-label="+" ${P.pts + wl.STEP > max ? 'disabled' : ''}>+</button></section>
          <section class="w-card w-wl-get"><small>${t('w.wl.youGet')}</small><b>${money(P.wallet === 'cash' ? w.cash : w.course)}</b><p>${t(P.wallet === 'cash' ? 'w.wl.getCash' : 'w.wl.getCourse')}</p></section>
          <button type="button" class="w-btn primary" data-act="wl-confirm" ${max < wl.STEP ? 'disabled' : ''}>${t('w.wl.confirm')}</button>
        </div>`;
    }

    return {
      stores: [wl],
      screens: { wallet: main, 'wallet-redeem': redeem },
      onClick(a, b, api) {
        switch (a) {
          case 'open-wl': api.go([{ s: 'home' }, { s: 'wallet' }]); return true;
          case 'wl-open': P.wallet = b.dataset.w; P.pts = wl.STEP; api.push('wallet-redeem', {}); return true;
          case 'wl-pick': P.wallet = b.dataset.w; api.render(); return true;
          case 'wl-step': { const max = Math.floor(wl.points(me()) / wl.STEP) * wl.STEP; P.pts = Math.min(max, Math.max(wl.STEP, P.pts + (+b.dataset.d) * wl.STEP)); api.render(); return true; }
          case 'wl-confirm': {
            const r = wl.redeem(me(), P.wallet, P.pts, me());
            if (!r.ok) { api.toast(api.t('w.wl.e.' + (Object.values(r.errors)[0] || 'step')), 'warn'); return true; }
            api.go([{ s: 'home' }, { s: 'wallet' }]); api.toast(P.wallet === 'cash' ? api.t('w.wl.t.cash', { c: r.entry.code }) : api.t('w.wl.t.course', { v: money(r.entry.cc) }), 'ok'); return true;
          }
        }
        return false;
      },
    };
  })());
})(window.BS);
