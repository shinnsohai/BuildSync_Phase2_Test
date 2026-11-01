/* Worker app: 工资 — payslip list, detail, confirm, dispute. */
(function (BS) {
  const pr = BS.payroll;
  const money = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signed = (n) => (n >= 0 ? '+' : '−') + money(Math.abs(n));
  const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`; };

  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const P = { tab: 'pending', type: 'hours', note: '', err: null };
    const me = () => BS.ME.empNo;
    const label = (s) => (s.userStatus === 'disputed' ? 'review' : s.userStatus === 'pending' ? (pr.reconfirm(s) ? 'reconfirm' : 'pending') : s.payStatus === 'paid' ? 'paid' : 'confirmed');
    const tagCls = { pending: 'pending', reconfirm: 'pending', review: 'withdrawn', confirmed: 'approved', paid: 'approved' };
    const tag = (api, s) => api.html`<span class="w-tag ${tagCls[label(s)]}">${api.t('w.ps.st.' + label(s))}</span>`;
    const deductions = (s) => s.leaveDeduct + s.cpf + s.other;

    function list(api) {
      const { t, html, icon, header } = api; const all = pr.mine(me());
      const pend = all.filter((s) => s.userStatus !== 'confirmed'), done = all.filter((s) => s.userStatus === 'confirmed');
      const shown = P.tab === 'pending' ? pend : done;
      return html`
        ${header(t('w.ps.title'))}
        <div class="w-body">
          <div class="w-filters" role="tablist"><button type="button" role="tab" aria-selected="${P.tab === 'pending' ? 'true' : 'false'}" class="${P.tab === 'pending' ? 'on' : ''}" data-act="ps-tab" data-v="pending">${t('w.ps.tabPending', { n: pend.length })}</button><button type="button" role="tab" aria-selected="${P.tab === 'done' ? 'true' : 'false'}" class="${P.tab === 'done' ? 'on' : ''}" data-act="ps-tab" data-v="done">${t('w.ps.tabDone', { n: done.length })}</button></div>
          ${shown.length ? shown.map((s) => { const lk = s.userStatus === 'disputed'; const inner = html`
              <div class="w-rec-top"><span class="w-ico-sq">${icon('wallet', 18)}</span><b>${t('w.ps.cardTitle', { y: s.month.slice(0, 4), m: +s.month.slice(5) })}</b>${tag(api, s)}</div>
              <div class="w-kv"><span>${t('w.ps.net')}</span><b class="amt">${money(s.net)}</b></div>
              <p class="w-pssub">${lk ? t('w.ps.locked') : label(s) === 'reconfirm' ? t('w.ps.handled') : s.payStatus === 'paid' ? t('w.ps.paidAt', { d: s.paidAt }) : s.userStatus === 'confirmed' ? t('w.ps.confirmedAt', { d: s.confirmedAt }) : t('w.ps.sum', { d: s.days, o: api.fmt.num(s.otHours), x: money(deductions(s)) })}</p>${lk ? '' : icon('right', 18, 'w-rec-go')}`;
            return lk ? html`<div class="w-card w-rec w-ps locked">${inner}</div>` : html`<button type="button" class="w-card w-rec w-ps" data-act="ps-open" data-id="${s.id}">${inner}</button>`; }) : html`<div class="w-empty">${icon('wallet', 40)}<p>${t('w.ps.none')}</p></div>`}
        </div>`;
    }
    function detail(api) {
      const { t, html, icon, header, fmt } = api; const s = pr.slip(api.cur().id);
      if (!s || s.empNo !== me()) return html`${header(t('w.ps.dTitle'))}<div class="w-body"><div class="w-empty"><p>${t('w.ps.eState')}</p></div></div>`;
      const lk = label(s); const adj = s.adjustments[s.adjustments.length - 1]; const row = (k, v, cls = '') => html`<div class="w-row"><span>${k}</span><b class="${cls}">${v}</b></div>`;
      return html`
        ${header(t('w.ps.dTitle'))}
        <div class="w-body">
          <section class="w-ps-hero"><div><small>${t('w.ps.cardTitle', { y: s.month.slice(0, 4), m: +s.month.slice(5) })}</small><b>${money(s.net)}</b></div>${tag(api, s)}</section>
          <section class="w-card w-list">
            ${row(t('w.ps.period', { a: `${s.month}-01`, b: monthEnd(s.month) }), '')}
            ${row(t('w.ps.rate'), `${s.daily ? money(s.hourly) + ' / ' + t('ps.hour') : t('ps.monthly', { v: money(s.rate) })} · ${t('ps.hours', { n: fmt.num(s.baseHours) })}`)}
            ${row(t('w.ps.ot'), s.otMode === 'leave' && s.daily ? t('w.ps.toil', { n: fmt.num(s.otHours) }) : `${t('ps.hours', { n: fmt.num(s.otHours) })} · ${money(s.ot)}`)}
            ${row(t('ps.d.incentive'), '+ ' + money(s.incentive))}
            ${row(t('w.ps.gross'), money(s.gross), 'amt')}
            ${row(t('ps.d.leave'), '− ' + money(s.leaveDeduct))}${row(t('ps.d.cpf'), '− ' + money(s.cpf))}${row(t('ps.d.other'), '− ' + money(s.other))}
            ${row(t('w.ps.net'), money(s.net), 'amt big')}</section>
          ${lk === 'reconfirm' && adj ? html`<p class="w-note info">${icon('bell', 16)} ${t('w.ps.resolved', { n: adj.note })} ${t('w.ps.resolvedDelta', { v: signed(adj.delta) })}</p>` : ''}
          ${lk === 'pending' ? html`<p class="w-note">${icon('shield', 16)} ${t('w.ps.checkNote')}</p>` : ''}
          ${lk === 'review' && s.dispute ? html`<section class="w-card"><h3>${t('w.ps.reviewTitle')}</h3><p class="w-sub">${t('w.ps.dtype')}：${t('ps.dt.' + s.dispute.type)}</p><p class="w-sub">${t('w.ps.feedback', { n: s.dispute.note })}</p><small class="w-sub">${t('w.ps.submittedAt', { d: s.dispute.at })}</small>
            <ol class="w-steps"><li class="done"><i>${icon('check', 12)}</i><div><b>${t('w.ps.step1')}</b></div></li><li class="now"><i></i><div><b>${t('w.ps.step2')}</b></div></li><li><i></i><div><b>${t('w.ps.step3')}</b></div></li></ol></section>` : ''}
          ${lk === 'confirmed' || lk === 'paid' ? html`<p class="w-note ok">${icon('check', 16)} ${t('w.ps.confirmedNote', { d: s.confirmedAt })}${s.paidAt ? ' ' + t('w.ps.paidNote', { d: s.paidAt }) : ''}</p>` : ''}
        </div>
        <footer class="w-foot ${lk === 'pending' || lk === 'reconfirm' ? 'w-two' : ''}">
          ${lk === 'pending' || lk === 'reconfirm' ? html`<button type="button" class="w-btn ghost" data-act="ps-dispute" data-id="${s.id}">${t('w.ps.dispute')}</button><button type="button" class="w-btn primary" data-act="ps-confirm" data-id="${s.id}">${t('w.ps.ok')}</button>` : lk === 'confirmed' || lk === 'paid' ? html`<button type="button" class="w-btn ghost" data-act="ps-export">${t('w.ps.export')}</button>` : ''}
        </footer>`;
    }
    function dispute(api) {
      const { t, html, icon, header } = api; const s = pr.slip(api.cur().id); if (!s) return html`${header(t('w.ps.fTitle'))}<div class="w-body"></div>`;
      return html`
        ${header(t('w.ps.fTitle'))}
        <div class="w-body w-form">
          <section class="w-card w-list"><div class="w-row"><span>${t('w.ps.fMonth')}</span><b>${t('w.ps.cardTitle', { y: s.month.slice(0, 4), m: +s.month.slice(5) })}</b></div><div class="w-row"><span>${t('w.ps.fNet')}</span><b class="amt">${money(s.net)}</b></div></section>
          <div class="w-field"><label>${t('w.ps.fType')}</label><div class="w-seg" role="radiogroup">${pr.DISPUTE_TYPES.map((k) => html`<button type="button" role="radio" aria-checked="${P.type === k ? 'true' : 'false'}" class="${P.type === k ? 'on' : ''}" data-act="ps-type" data-v="${k}">${t('ps.dt.' + k)}</button>`)}</div></div>
          <div class="w-field ${P.err ? 'err' : ''}"><label for="ps-note">${t('w.ps.fNote')}</label><textarea id="ps-note" class="w-input" data-ps="note" rows="4" maxlength="200" placeholder="${t('w.ps.fNotePh')}">${P.note}</textarea>${P.err ? html`<small class="w-err" data-err="1">${t(P.err)}</small>` : ''}</div>
        </div>
        <footer class="w-foot"><button type="button" class="w-btn primary" data-act="ps-submit" data-id="${s.id}">${t('w.ps.fSubmit')}</button></footer>`;
    }
    function confirmSheet(api, s) {
      const { t, html } = api;
      return () => html`<h2>${t('w.ps.cTitle')}</h2><p class="w-sheet-sub">${t('w.ps.cMsg')}</p>
        <dl class="w-sheet-dl"><div><dt>${t('w.ps.cardTitle', { y: s.month.slice(0, 4), m: +s.month.slice(5) })}</dt><dd>${money(s.net)}</dd></div></dl>
        <div class="w-btns"><button type="button" class="w-btn ghost" data-act="close-sheet">${t('common.cancel')}</button><button type="button" class="w-btn primary" data-act="ps-confirm-ok" data-id="${s.id}">${t('w.ps.cOk')}</button></div>`;
    }

    return {
      stores: [pr],
      screens: { pay: list, 'pay-detail': detail, 'pay-dispute': dispute },
      init(api) { api.root.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.ps === 'note') { P.note = el.value; if (P.err) { P.err = null; const f = el.closest('.w-field'); if (f) { f.classList.remove('err'); const x = f.querySelector('.w-err'); if (x) x.remove(); } } } }); },
      onClick(a, b, api) {
        const id = b.dataset.id;
        switch (a) {
          case 'open-pay': P.tab = 'pending'; api.go([{ s: 'home' }, { s: 'pay' }]); return true;
          case 'ps-tab': P.tab = b.dataset.v; api.render(); return true;
          case 'ps-open': api.W.banner = null; api.push('pay-detail', { id }); return true;
          case 'ps-dispute': P.type = 'hours'; P.note = ''; P.err = null; api.push('pay-dispute', { id }); return true;
          case 'ps-type': P.type = b.dataset.v; api.render(); return true;
          case 'ps-submit': {
            const r = pr.dispute(id, me(), { type: P.type, note: P.note });
            if (!r.ok) { if (r.error === 'note' || r.error === 'note_len') { P.err = 'w.ps.eNote'; api.render(); } else { api.toast(api.t('w.ps.eState'), 'warn'); api.go([{ s: 'home' }, { s: 'pay' }]); } return true; }
            api.go([{ s: 'home' }, { s: 'pay' }, { s: 'pay-detail', id }]); api.toast(api.t('w.ps.toast.disputed'), 'ok'); return true;
          }
          case 'ps-confirm': { const s = pr.slip(id); api.W.sheet = { k: 'html', render: confirmSheet(api, s) }; api.render(); return true; }
          case 'ps-confirm-ok': { api.W.sheet = null; const r = pr.confirm(id, me()); api.render(); api.toast(r.ok ? api.t('w.ps.toast.confirmed') : api.t('w.ps.eState'), r.ok ? 'ok' : 'warn'); return true; }
          case 'ps-export': api.toast(api.t('p.toast.inert')); return true;
        }
        return false;
      },
      onStore(evt, api) {
        const s = evt.id && pr.slip(evt.id);
        if (s && s.empNo === me()) {
          if (evt.type === 'verified') { api.showBanner({ kind: 'info', act: 'ps-open', id: s.id, title: api.t('w.ps.nt.new'), msg: api.t('w.ps.cardTitle', { y: s.month.slice(0, 4), m: +s.month.slice(5) }) + ' · ' + money(s.net) }); return; }
          if (evt.type === 'resolved') { api.showBanner({ kind: 'info', act: 'ps-open', id: s.id, title: api.t('w.ps.handledBanner'), msg: api.t('w.ps.resolvedDelta', { v: signed(s.adjustments[s.adjustments.length - 1].delta) }) }); return; }
          if (evt.type === 'paid') { api.showBanner({ kind: 'ok', act: 'ps-open', id: s.id, title: api.t('w.ps.nt.paid'), msg: money(s.net) }); return; }
        }
        api.render();
      },
    };
  })());
})(window.BS);
