/* Worker app: 转转乐 — tokens from going to work, the streak, the wheel, inviting friends and how it works. The prize is decided the moment the spin is pressed;
   the animation only shows where it lands. */
(function (BS) {
  const sp = BS.spin, hr = BS.hr, WH = BS.spinWheel;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const P = { rot: 0, spinning: false, result: null, copied: false };
    const money = (n) => 'S$ ' + Number(n).toFixed(2);
    const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const pName = (api, p) => (api.lang === 'zh' ? p.zh : p.en) || api.t('sp.k.' + p.kind, { v: p.value });
    const tokenIcon = (api, n) => (WH.have['token.png'] ? api.html`<img class="sp-token-img" src="${WH.DIR}token.png" alt="">` : api.html`<span class="sp-token">${api.icon('star', n || 18)}</span>`);

    function dayCard(api) {
      const { t, html, icon } = api; const d = sp.today(me());
      let cls = 'idle', icn = 'clock', msg = t('sp.w.today.todo'), act = true;
      if (d.leave) { cls = 'pause'; icn = 'cal'; msg = t('sp.w.today.leave'); act = false; }
      else if (!d.scheduled) { cls = 'pause'; icn = 'cal'; msg = t('sp.w.today.rest'); act = false; }
      else if (d.earned) { cls = 'done'; icn = 'check'; msg = t('sp.w.today.earned', { n: sp.config().daily }); act = false; }
      else if (d.inDone) { cls = 'half'; icn = 'clock'; msg = t('sp.w.today.out'); }
      return html`<section class="w-card sp-day ${cls}" data-role="today"><span class="sp-day-ic">${icon(icn, 20)}</span><div><b>${msg}</b><div class="sp-steps"><span class="${d.scheduled && d.inDone ? 'on' : ''}">${icon('check', 12)} ${t('sp.w.in')}</span><span class="${d.scheduled && d.outDone ? 'on' : ''}">${icon('check', 12)} ${t('sp.w.out')}</span></div></div>${act ? html`<button type="button" class="w-chip" data-act="open-att">${t('sp.w.goAtt')}</button>` : ''}</section>`;
    }
    function streakCard(api) {
      const { t, html } = api; const s = sp.streak(me()); const d = sp.today(me());
      return html`<section class="w-card sp-streak" data-role="streak"><div class="sp-streak-h"><div><small>${t('sp.w.streak')}</small><b>${t('sp.w.days', { n: s.count })}</b></div>${s.next ? html`<span class="w-chip">${t('sp.w.nextMs', { n: s.left, t: s.next.tokens })}</span>` : html`<span class="w-chip">${t('sp.w.allMs')}</span>`}</div>
        <div class="sp-ms-row">${s.milestones.map((m) => html`<span class="sp-ms-dot ${m.reached ? 'on' : ''}"><i>${m.reached ? '✓' : m.day}</i><small>${t('sp.w.msLabel', { d: m.day, n: m.tokens })}</small></span>`)}</div>
        <p class="w-note">${!d.scheduled ? t('sp.w.paused') : t('sp.w.streakHow')}</p></section>`;
    }
    function resultSheet(api) {
      const { t, html, icon } = api; const r = P.result; if (!r) return '';
      const p = r.prize; const lose = p.kind === 'none';
      const body = p.kind === 'points' ? t('sp.w.res.points', { n: p.value }) : p.kind === 'course' ? t('sp.w.res.course', { v: money(p.value) }) : p.kind === 'cash' ? t('sp.w.res.cash', { v: money(p.value), c: r.spin.code || '' }) : p.kind === 'spin' ? t('sp.w.res.spin', { n: p.value }) : t('sp.w.res.none');
      setTimeout(() => { const b = api.root.querySelector('.sp-result [data-act=sp-close]'); if (b) b.focus(); }, 0);
      return html`<div class="sp-result ${lose ? 'lose' : 'win'}" role="dialog" aria-modal="true" aria-labelledby="sp-res-t" data-role="result"><div class="sp-result-card">${!lose && WH.have['win-burst.png'] ? html`<img class="sp-burst" src="${WH.DIR}win-burst.png" alt="">` : ''}<span class="sp-result-ic">${icon(lose ? 'clock' : 'gift', 30)}</span><small>${t(lose ? 'sp.w.res.tryAgain' : 'sp.w.res.congrats')}</small><h2 id="sp-res-t">${pName(api, p)}</h2><p>${body}</p>
        ${p.kind === 'points' || p.kind === 'course' || p.kind === 'cash' ? html`<button type="button" class="w-btn ghost" data-act="sp-wallet">${t('sp.w.res.wallet')}</button>` : ''}<button type="button" class="w-btn primary" data-act="sp-close">${t('sp.w.res.ok')}</button></div></div>`;
    }
    function main(api) {
      const { t, html, icon, header } = api; sp.touch(me()); WH.probe(); const bal = sp.balance(me()); const cost = sp.config().spinCost; const hist = sp.ledger(me()).slice(0, 6);
      return html`
        ${header(t('sp.w.title'))}
        <div class="w-body w-sp ${WH.have['bg.png'] ? 'has-bg' : ''}" style="${WH.have['bg.png'] ? `background-image:url(${WH.DIR}bg.png)` : ''}">
          <section class="w-card sp-bal" data-role="balance">${tokenIcon(api, 26)}<div><small>${t('sp.w.balance')}</small><b data-role="tokens">${bal}</b></div><span class="w-chip">${t('sp.w.cost', { n: cost })}</span></section>
          ${dayCard(api)}${streakCard(api)}
          <section class="w-card sp-stage"><div class="sp-wheel-wrap">${BS.raw(WH.svg(sp.prizes(), { rot: P.rot, lang: api.lang }))}</div>
            <button type="button" class="w-btn primary sp-go" data-act="sp-spin" ${bal < cost || P.spinning ? 'disabled' : ''}>${P.spinning ? t('sp.w.spinning') : t('sp.w.spin', { n: cost })}</button>${bal < cost && !P.spinning ? html`<p class="w-note">${t('sp.w.noTokens')}</p>` : ''}</section>
          <div class="sp-links"><button type="button" class="w-card w-link" data-act="sp-invite">${icon('users', 20)}<span><b>${t('sp.w.invite')}</b><small>${t('sp.w.inviteSub', { a: sp.config().refReferrer })}</small></span>${icon('right', 18)}</button>
            <button type="button" class="w-card w-link" data-act="sp-rules">${icon('list', 20)}<span><b>${t('sp.w.rules')}</b></span>${icon('right', 18)}</button>
            <button type="button" class="w-card w-link" data-act="sp-wallet">${icon('wallet', 20)}<span><b>${t('sp.w.wallet')}</b></span>${icon('right', 18)}</button></div>
          <div class="w-sec"><h2>${t('sp.w.recent')}</h2></div>
          ${hist.length ? hist.map((x) => html`<div class="w-card sp-row" data-led="${x.id}"><div><b>${t('sp.kind.' + x.kind)}</b><small>${x.date}${x.kind === 'daily' ? ' · ' + x.ref : ''}</small></div><span class="${x.tokens > 0 ? 'up' : 'down'}">${x.tokens > 0 ? '+' : ''}${x.tokens}</span></div>`) : html`<p class="w-note">${t('sp.w.none')}</p>`}
        </div>${resultSheet(api)}`;
    }
    function invite(api) {
      const { t, html, icon, header } = api; const code = sp.code(me()); const cfg = sp.config(); const mine = sp.referrals(me());
      return html`
        ${header(t('sp.w.invite'))}
        <div class="w-body w-sp">
          <section class="w-card sp-code" data-role="code"><small>${t('sp.w.myCode')}</small><b>${code}</b><button type="button" class="w-btn primary" data-act="sp-copy">${icon('file', 16)} ${P.copied ? t('sp.w.copied') : t('sp.w.copy')}</button></section>
          <section class="w-card sp-how"><b>${t('sp.w.refHow')}</b><ol><li>${t('sp.w.ref1')}</li><li>${t('sp.w.ref2', { code })}</li><li>${t('sp.w.ref3', { a: cfg.refReferrer, b: cfg.refReferred })}</li></ol><small>${t('sp.w.refCap', { n: cfg.refCap })}</small></section>
          <div class="w-sec"><h2>${t('sp.w.myRefs')}</h2></div>
          ${mine.length ? mine.map((r) => { const e = hr.emp(r.referred); return html`<div class="w-card sp-row" data-ref="${r.id}"><div><b>${e ? (api.lang === 'zh' ? e.name : e.nameEn || e.name) : r.referred}</b><small>${t('sp.rf.at')}: ${r.at}</small></div><span class="w-tag ${r.status === 'rewarded' ? 'approved' : r.status === 'pending' ? 'pending' : r.status === 'capped' ? 'rejected' : 'withdrawn'}">${t('sp.w.rf.' + r.status)}</span></div>`; }) : html`<div class="w-empty">${icon('users', 40)}<p>${t('sp.w.noRefs')}</p></div>`}
          <p class="w-note">${icon('warn', 14)} ${t('sp.w.refProto')}</p>
        </div>`;
    }
    function rules(api) {
      const { t, html, header } = api; const cfg = sp.config(); const el = sp.eligibility(me());
      return html`
        ${header(t('sp.w.rules'))}
        <div class="w-body w-sp">
          <section class="w-card sp-how"><b>${t('sp.w.r.earn')}</b><ul><li>${t('sp.w.r.daily', { n: cfg.daily })}</li><li>${t('sp.w.r.sched')}</li><li>${t('sp.w.r.streak')}<ul>${cfg.milestones.map((m) => html`<li>${t('sp.w.r.ms', { d: m.day, n: m.tokens })}</li>`)}</ul></li><li>${t('sp.w.r.refs', { a: cfg.refReferrer, b: cfg.refReferred, c: cfg.refCap })}</li><li>${t('sp.w.r.cost', { n: cfg.spinCost })}</li></ul></section>
          <section class="w-card sp-how"><b>${t('sp.w.r.prizes')}</b>${el.map((x) => html`<div class="sp-prize ${x.ok ? '' : 'out'}" data-slice="${x.index}"><span class="sp-dot" style="background:${x.prize.color}"></span><span>${pName(api, x.prize)}</span>${x.ok ? '' : html`<small>${t('sp.w.r.out.' + x.why)}</small>`}</div>`)}<small>${t('sp.w.r.fair')}</small></section>
        </div>`;
    }

    function startSpin(api) {
      if (P.spinning) return;
      const r = sp.spin(me());
      if (!r.ok) { api.toast(api.t(r.error === 'tokens' ? 'sp.w.noTokens' : 'sp.e.' + r.error), 'warn'); return; }
      const from = P.rot; const to = WH.target(from, r.index); P.rot = to; P.spinning = true; P.pending = r;
      const el = api.root.querySelector('#sp-rotor'); const ms = reduced() ? 400 : 4200;
      if (el) { el.style.transition = 'none'; el.style.transform = `rotate(${from}deg)`; void el.getBoundingClientRect(); el.style.transition = `transform ${ms}ms cubic-bezier(.12,.62,.12,1)`; el.style.transform = `rotate(${to}deg)`; }
      const btn = api.root.querySelector('.sp-go'); if (btn) { btn.disabled = true; btn.textContent = api.t('sp.w.spinning'); }
      setTimeout(() => { P.spinning = false; P.result = r; api.render(); }, ms + 150);
    }

    return {
      init(api) { api.root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && P.result) { P.result = null; api.render(); } }); },
      stores: [sp, BS.att, hr],
      screens: { spin: main, 'spin-invite': invite, 'spin-rules': rules },
      onStore(evt, api) { if (P.spinning) return; if (!api.root.querySelector('.w-view.s-spin, .w-view.s-spin-invite, .w-view.s-spin-rules')) return; api.render(); },
      onClick(a, b, api) {
        switch (a) {
          case 'open-spin': P.result = null; P.spinning = false; api.go([{ s: 'home' }, { s: 'spin' }]); return true;
          case 'sp-spin': startSpin(api); return true;
          case 'sp-close': P.result = null; api.render(); return true;
          case 'sp-invite': P.copied = false; api.push('spin-invite', {}); return true;
          case 'sp-rules': api.push('spin-rules', {}); return true;
          case 'sp-wallet': P.result = null; api.go([{ s: 'home' }, { s: 'wallet' }]); return true;
          case 'sp-copy': { const code = sp.code(me()); const done = () => { P.copied = true; api.render(); }; if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done(); return true; }
        }
        return false;
      },
    };
  })());
})(window.BS);
