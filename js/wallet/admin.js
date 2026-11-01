/* Admin: 激励与钱包 — each worker's reward points, what they are worth as a cash voucher or as course credit, the audit ledger (rewards, deductions, reversals, redemptions),
   and the rule table (earning rules, effective-dated conversion rates). Employer administrators only. */
(function (BS) {
  const { html, icon } = BS;
  const P = BS.perm, hr = BS.hr, wl = BS.wallet;
  const today = () => BS.fmt.now().slice(0, 10);
  const SIZE = 6, LED = 12;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const FILTERS = ['', 'award', 'deduct', 'reversal', 'redeem', 'win'];

  BS.registerAdmin({
    id: 'wallet', nav: 'a.nav.wallet', stores: [hr, wl, BS.train],
    tabs: [{ id: 'wallets', k: 'wl.tab.wallets' }, { id: 'rules', k: 'wl.tab.rules' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const D = { tab: 'wallets', kw: '', draft: '', led: '', page: 1, more: false, modal: null, rules: null, rate: { from: '', cash: '', course: '' }, rateErrs: {} };
      const can = (op) => P.can('wallet', op);
      const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
      const money = (n) => 'S$ ' + Number(n).toFixed(2);
      const pts = (n) => (n > 0 ? '+' : '') + n.toLocaleString('en-US');
      const tradeName = (c) => { const x = hr.trade(c); return x ? (z() ? x.zh : x.en) : c; };
      const accName = (id) => { const a = P.account(id); if (a) return z() ? a.name : a.nameEn || a.name; const e = hr.emp(id); return e ? nm(e) : id === 'system' ? t('ptw.sys') : String(id); };
      const ruleName = (id) => { const r = wl.rule(id); return r ? (z() ? r.zh : r.en) : ''; };
      const courseName = (id) => (BS.train && BS.train.certGroup(id) ? t('trn.certName.' + id) : id);
      const inScope = (no) => P.inScope(no);
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

      const people = () => {
        const kw = D.kw.trim().toLowerCase();
        return hr.emps().filter((e) => e.status === 'active' && inScope(e.empNo) && (!kw || e.name.toLowerCase().includes(kw) || (e.nameEn || '').toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw)))
          .sort((a, b) => (wl.points(b.empNo) - wl.points(a.empNo)) || a.empNo.localeCompare(b.empNo));
      };
      const ledger = () => wl.ledger().filter((x) => inScope(x.empNo) && (!D.led || (D.led === 'redeem' ? ['redeem', 'spend', 'refund'].includes(x.kind) : x.kind === D.led)));

      // ---------- main page ----------
      function entryRow(x) {
        const e = hr.emp(x.empNo); const money1 = x.kind === 'redeem' || x.kind === 'win' ? (x.wallet === 'cash' ? `${money(x.cash)} ${t('wl.voucher')} ${x.code}` : `${money(x.cc)} ${t('wl.credit')}`) : x.kind === 'spend' ? `${money(-x.cc)} ${t('wl.fromCredit', { ref: x.ref })}` : x.kind === 'refund' ? `${money(x.cc)} ${t('wl.backCredit', { ref: x.ref })}` : '';
        const cls = x.kind === 'award' || x.kind === 'reversal' || x.kind === 'win' ? 'up' : x.kind === 'deduct' ? 'down' : 'flat';
        return html`<article class="wl-ent ${x.kind}" data-entry="${x.id}"><div class="wl-ent-main"><div><b>${nm(e)}</b> <span class="mute">· ${x.date}</span></div><p>${wl.reasonText(x, t, z())}${x.ruleId ? html` <span class="a-tag sub-upcoming">${ruleName(x.ruleId)}</span>` : ''}</p>
          <small class="mute">${t('wl.by')}: ${accName(x.by)}${money1 ? ' · ' + money1 : ''}</small>
          ${x.kind === 'deduct' ? (x.reversedBy ? html`<small class="wl-rev">${icon('check', 12)} ${t('wl.reversed', { id: x.reversedBy })}</small>` : html`<small class="wl-rev open">${icon('refresh', 12)} ${x.corrective ? t('wl.reversible', { c: courseName(x.corrective) }) : t('wl.reversibleManual')}${can('approve') ? html` <button type="button" class="a-link" data-act="wl-approve-reverse" data-id="${x.id}">${t('wl.reverse')}</button>` : ''}</small>`) : ''}
          ${x.kind === 'reversal' ? html`<small class="wl-rev">${t('wl.reverses', { id: x.ref })}</small>` : ''}</div>
          <span class="wl-pts ${cls}">${x.points ? pts(x.points) + ' pts' : '—'}</span></article>`;
      }
      function walletsPage() {
        const all = people(); const pages = Math.max(1, Math.ceil(all.length / SIZE)); if (D.page > pages) D.page = pages; const slice = all.slice((D.page - 1) * SIZE, D.page * SIZE);
        const scope = hr.emps().filter((e) => inScope(e.empNo)).map((e) => e.empNo); const sm = wl.summary(scope); const rate = wl.rate();
        const led = ledger(); const shown = D.more ? led : led.slice(0, LED);
        return html`
          <section class="wl-hero"><div><span class="wl-eyebrow">${icon('check', 13)} ${t('wl.hero.kicker')}</span><h1>${t('wl.hero.title')}</h1><p>${t('wl.hero.body')}</p></div>
            ${BS.perm.canPage('train') ? html`<button type="button" class="a-btn" data-act="wl-go-train">${icon('cap', 16)} ${t('wl.hero.btn')}</button>` : ''}</section>
          <div class="dp-kpis">${[['wl.k.pool', sm.pool.toLocaleString('en-US') + ' pts', 'active', t('wl.k.poolSub', { n: sm.people })], ['wl.k.cash', money(sm.cash), 'granted', t('wl.k.cashSub', { r: rate.cash })], ['wl.k.course', money(sm.course), 'requested', t('wl.k.courseSub', { r: rate.course })], ['wl.k.reversed', String(sm.reversed), 'blocked', t('wl.k.reversedSub')]].map(([lab, v, cls, sub]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span><small class="mute">${sub}</small></div>`)}</div>
          <div class="wl-cols">
            <section class="a-card wl-emps"><header class="wl-h"><div><h3>${t('wl.emps.title')}</h3><p class="mute">${t('wl.emps.sub')}</p></div><button type="button" class="a-btn" data-act="wl-export">${icon('upload', 16)} ${t('hr.export')}</button></header>
              <form class="a-filters" autocomplete="off"><label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${D.draft}" placeholder="${t('wl.f.kw')}" aria-label="${t('wl.f.kw')}"></label><span class="a-fgrow"></span><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
              ${slice.length ? slice.map((e) => { const p = wl.points(e.empNo); const w = wl.worth(p); const cr = wl.credit(e.empNo);
                return html`<article class="wl-emp" data-emp="${e.empNo}"><div class="wl-emp-h"><span class="l-av">${nm(e).slice(0, 1)}</span><div><b>${nm(e)}</b> <span class="mute">${e.empNo}</span><br><small class="mute">${e.trades.map(tradeName).join('、')}</small></div><span class="wl-bal"><b>${p.toLocaleString('en-US')}</b> pts</span></div>
                  <div class="wl-vals"><span>${icon('wallet', 14)} ${t('wl.cash')}: <b>${money(w.cash)}</b></span><span>${icon('cap', 14)} ${t('wl.course')}: <b>${money(w.course)}</b></span>${cr > 0 ? html`<span class="wl-cred">${t('wl.creditHeld')}: <b>${money(cr)}</b></span>` : ''}</div>
                  <div class="wl-acts">${can('create') ? html`<button type="button" class="a-btn sm" data-act="wl-new-award" data-e="${e.empNo}">+ ${t('wl.award')}</button>` : ''}${can('update') ? html`<button type="button" class="a-btn sm bad" data-act="wl-edit-deduct" data-e="${e.empNo}">${t('wl.deduct')}</button>` : ''}${can('approve') ? html`<button type="button" class="a-btn sm primary" data-act="wl-approve-redeem" data-e="${e.empNo}" ${p < wl.STEP ? 'disabled' : ''}>${t('wl.redeem')}</button>` : ''}</div></article>`; })
                : html`<div class="a-none"><p>${t('wl.none')}</p></div>`}
              <footer class="a-pager"><span>${t('wl.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${D.page === i + 1 ? 'on' : ''}" data-act="wl-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>
            <section class="a-card wl-led"><header class="wl-h"><div><h3>${t('wl.led.title')}</h3><p class="mute">${t('wl.led.sub')}</p></div></header>
              <div class="hr-chips pt-filters" role="group">${FILTERS.map((k) => html`<button type="button" class="${D.led === k ? 'on' : ''}" data-act="wl-led" data-k="${k}" aria-pressed="${D.led === k ? 'true' : 'false'}">${t(k ? 'wl.led.' + k : 'dep.f.all')}</button>`)}</div>
              <div class="wl-ents">${shown.length ? shown.map(entryRow) : html`<p class="a-fhint">${t('wl.led.none')}</p>`}</div>
              ${led.length > LED ? html`<button type="button" class="a-btn sm" data-act="wl-more">${D.more ? t('wl.led.less') : t('wl.led.more', { n: led.length - LED })}</button>` : ''}</section></div>
          <p class="l-audit">${icon('shield', 14)} ${t('wl.proto')}</p>`;
      }

      // ---------- rules ----------
      const draftRules = () => { if (!D.rules) D.rules = clone(wl.rules()).map((r) => ({ ...r, errs: null })); return D.rules; };
      function rulesPage() {
        const R = draftRules(); const rate = wl.rate(); const rs = wl.rates().slice().sort((a, b) => b.from.localeCompare(a.from)); const E = D.rateErrs;
        const err = (k) => (E[k] ? html`<small class="a-ferr">${t('wl.e.' + E[k])}</small>` : '');
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('wl.rules.title')}</h1><p class="a-sub">${t('wl.rules.sub')}</p></div></div>
          <section class="a-card dp-rules"><h3 class="hr-h">${t('wl.rules.earn')}</h3>
            ${['award', 'deduct'].map((k) => html`<h4 class="dp-h4">${t('wl.rules.' + k)}</h4>${R.map((r, i) => (r.kind === k ? html`<div class="dp-rule" data-rule="${r.id}"><label class="p-check"><input type="checkbox" data-wr="${i}:on" ${r.on ? 'checked' : ''}> ${z() ? r.zh : r.en}</label><label class="dp-days">${k === 'award' ? '+' : '−'} <input type="number" min="1" max="${wl.MAX_POINTS}" data-wr="${i}:points" value="${r.points}" aria-label="${t('wl.rules.pts')}"> pts</label>${r.errs ? html`<small class="a-ferr">${t('wl.e.points')}</small>` : ''}</div>` : ''))}`)}
            <div class="dp-actions"><button type="button" class="a-btn primary" data-act="wl-update-rules">${t('wl.rules.save')}</button></div></section>
          <section class="a-card dp-rules"><h3 class="hr-h">${t('wl.rates.title')}</h3><p class="a-fhint">${t('wl.rates.hint')}</p>
            <div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('wl.rates.from')}</th><th>${t('wl.rates.cash')}</th><th>${t('wl.rates.course')}</th><th>${t('wl.rates.mult')}</th><th></th></tr></thead><tbody>${rs.map((r) => html`<tr><td>${r.from}</td><td>S$ ${r.cash.toFixed(3)}</td><td>S$ ${r.course.toFixed(3)}</td><td>× ${(r.course / r.cash).toFixed(1)}</td><td>${r === rate ? html`<span class="a-tag approved">${t('wl.rates.now')}</span>` : r.from > today() ? html`<span class="a-tag pending">${t('wl.rates.future')}</span>` : html`<span class="a-tag withdrawn">${t('wl.rates.old')}</span>`}</td></tr>`)}</tbody></table></div>
            <div class="p-three wl-rateform"><div class="a-frow"><label class="a-lab" for="wr-from">${t('wl.rates.from')}</label><input id="wr-from" type="date" class="a-field" data-wrate="from" value="${D.rate.from}">${err('from')}</div>
              <div class="a-frow"><label class="a-lab" for="wr-cash">${t('wl.rates.cash')}</label><input id="wr-cash" class="a-field" inputmode="decimal" data-wrate="cash" value="${D.rate.cash}" placeholder="0.10">${err('cash')}</div>
              <div class="a-frow"><label class="a-lab" for="wr-course">${t('wl.rates.course')}</label><input id="wr-course" class="a-field" inputmode="decimal" data-wrate="course" value="${D.rate.course}" placeholder="0.20">${err('course')}</div></div>
            <div class="dp-actions"><button type="button" class="a-btn" data-act="wl-new-rate">${icon('plus', 16)} ${t('wl.rates.add')}</button></div></section>`;
      }
      const page = () => (D.tab === 'rules' ? rulesPage() : walletsPage());

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('wl.e.' + M.errs[k])}</small>` : '');
      function moveModal() {
        const M = D.modal; const e = hr.emp(M.e); const f = M.f; const bal = wl.points(M.e); const n = Number(f.points) || 0; const after = bal + (M.kind === 'award' ? n : -n);
        const rules = wl.rules().filter((r) => r.kind === M.kind && r.on);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('wl.m.' + M.kind), `${nm(e)} · ${e.empNo} · ${t('wl.m.balance', { n: bal })}`)}
          <div class="a-mbody l-form">
            <div class="a-frow"><label class="a-lab" for="wm-rule">${t('wl.m.rule')}</label><select id="wm-rule" class="a-field" data-wm="ruleId"><option value="">${t('wl.m.custom')}</option>${rules.map((r) => html`<option value="${r.id}" ${f.ruleId === r.id ? 'selected' : ''}>${z() ? r.zh : r.en} (${r.points} pts)</option>`)}</select>${E(M, 'ruleId')}</div>
            <div class="a-frow"><label class="a-lab" for="wm-pts"><b class="req">*</b> ${t('wl.m.points')}</label><input id="wm-pts" type="number" min="1" max="${wl.MAX_POINTS}" class="a-field" data-wm="points" value="${f.points}">${E(M, 'points')}<small class="a-fhint">${t('wl.m.after', { n: after.toLocaleString('en-US') })}</small></div>
            <div class="a-frow"><label class="a-lab" for="wm-why">${f.ruleId ? '' : html`<b class="req">*</b> `}${t('wl.m.reason')}</label><textarea id="wm-why" class="a-field" data-wm="reason" rows="2" maxlength="200" placeholder="${t('wl.m.reasonPh')}">${f.reason}</textarea>${E(M, 'reason')}</div>
            ${M.kind === 'deduct' ? html`<div class="a-frow"><label class="a-lab" for="wm-cor">${t('wl.m.corrective')}</label><select id="wm-cor" class="a-field" data-wm="corrective"><option value="">${t('wl.m.noCorrective')}</option>${Object.keys(BS.train.CERT_YEARS).filter((k) => BS.train.certGroup(k)).map((k) => html`<option value="${k}" ${f.corrective === k ? 'selected' : ''}>${courseName(k)}</option>`)}</select><small class="a-fhint">${t('wl.m.correctiveHint')}</small>${E(M, 'corrective')}</div>` : ''}
            ${E(M, 'empNo')}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn ${M.kind === 'deduct' ? 'bad' : 'primary'}" data-act="${M.kind === 'award' ? 'wl-new-award-ok' : 'wl-edit-deduct-ok'}">${t('wl.m.' + M.kind + 'Ok')}</button></footer></div></div>`;
      }
      function redeemModal() {
        const M = D.modal; const e = hr.emp(M.e); const f = M.f; const bal = wl.points(M.e); const n = Number(f.points) || 0; const w = wl.worth(n);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('wl.m.redeem'), `${nm(e)} · ${e.empNo} · ${t('wl.m.balance', { n: bal })}`)}
          <div class="a-mbody l-form"><div class="wl-routes" role="radiogroup">${['cash', 'course'].map((k) => html`<label class="wl-route ${f.wallet === k ? 'on' : ''}"><input type="radio" name="wm-wallet" data-wm="wallet" value="${k}" ${f.wallet === k ? 'checked' : ''}><span><b>${t('wl.route.' + k)}</b><small>${t('wl.route.' + k + 'Sub', { r: w.rate[k] })}</small><em>${money(k === 'cash' ? w.cash : w.course)}</em></span></label>`)}</div>
            <div class="a-frow"><label class="a-lab" for="wm-rp"><b class="req">*</b> ${t('wl.m.redeemPts')}</label><input id="wm-rp" type="number" min="${wl.STEP}" step="${wl.STEP}" class="a-field" data-wm="points" value="${f.points}">${E(M, 'points')}<small class="a-fhint">${t('wl.m.redeemHint', { s: wl.STEP })}</small></div>${E(M, 'wallet')}${E(M, 'empNo')}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="wl-approve-redeem-ok">${t('wl.m.redeemOk', { v: money(f.wallet === 'cash' ? w.cash : w.course) })}</button></footer></div></div>`;
      }
      function reverseModal() {
        const M = D.modal; const x = wl.entry(M.id); if (!x) return ''; const e = hr.emp(x.empNo);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('wl.rv.title'), `${nm(e)} · ${x.id}`)}
          <div class="a-mbody l-form"><p>${t('wl.rv.msg', { n: -x.points, r: wl.reasonText(x, t, z()) })}</p><div class="a-frow"><label class="a-lab" for="wm-rvw">${t('wl.m.reason')}</label><input id="wm-rvw" class="a-field" data-wm="reason" maxlength="120" value="${M.f.reason}" placeholder="${t('wl.rv.ph')}"></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="wl-approve-reverse-ok">${t('wl.reverse')}</button></footer></div></div>`;
      }
      function modal() { const M = D.modal; if (!M) return ''; if (M.id && !wl.entry(M.id)) { D.modal = null; return ''; } return M.k === 'move' ? moveModal() : M.k === 'redeem' ? redeemModal() : reverseModal(); }

      const ERRMAP = { missing: 'wl.t.stale', already: 'wl.t.already' };
      function result(r, okMsg, M) {
        if (r.ok) { D.modal = null; render(); toast(t(okMsg), 'ok'); return true; }
        if (r.errors) { M.errs = r.errors; render(); return false; }
        D.modal = null; render(); toast(t(ERRMAP[r.error] || 'wl.t.stale'), 'warn'); return false;
      }
      function exportCsv() {
        const led = ledger(); download(`wallet-ledger-${today()}.csv`, csvOf([['id', 'date', 'empNo', 'name', 'kind', 'points', 'cash_sgd', 'course_credit_sgd', 'reason', 'by'], ...led.map((x) => [x.id, x.date, x.empNo, (hr.emp(x.empNo) || {}).nameEn || '', x.kind, x.points, x.cash, x.cc, x.reason, x.by])]));
        toast(t('hr.toast.exported', { n: led.length }), 'ok');
      }

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.wallet'), act: 'noop' }, { text: t('wl.tab.' + D.tab) }]; }, page, modal,
        onTab() { D.modal = null; D.rules = null; },
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.dataset.f) { D.draft = el.value; return; }
          if (el.dataset.wr) { const R = draftRules(); const [i, k] = el.dataset.wr.split(':'); R[+i][k] = k === 'on' ? el.checked : el.value; R[+i].errs = null; return; }
          if (el.dataset.wrate) { D.rate[el.dataset.wrate] = el.value; D.rateErrs = {}; return; }
          if (M && el.dataset.wm) {
            const k = el.dataset.wm; M.f[k] = el.value; if (M.errs && M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
            if (M.k === 'move' && k === 'ruleId') { const r = wl.rule(el.value); if (r) M.f.points = String(r.points); render(); }
            else if ((M.k === 'move' && k === 'points') || (M.k === 'redeem' && ['points', 'wallet'].includes(k))) { const keep = el.id; render(); const i = keep && ctx.view().querySelector('#' + keep); if (i && el.type !== 'radio') { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (err) { /* number input */ } } }
          }
        },
        onSubmit() { D.kw = D.draft; D.page = 1; render(); },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id, no = b.dataset.e; const M = D.modal;
          switch (a) {
            case 'noop': break;
            case 'wl-page': D.page = +b.dataset.p; render(); break;
            case 'wl-led': D.led = b.dataset.k; D.more = false; render(); break;
            case 'wl-more': D.more = !D.more; render(); break;
            case 'wl-export': exportCsv(); break;
            case 'wl-go-train': if (!ctx.go('train', {})) toast(t('pm.noOp'), 'warn'); break;
            case 'wl-new-award': D.modal = { k: 'move', kind: 'award', e: no, f: { ruleId: '', points: '', reason: '', corrective: '' }, errs: {} }; render(); break;
            case 'wl-edit-deduct': D.modal = { k: 'move', kind: 'deduct', e: no, f: { ruleId: '', points: '', reason: '', corrective: '' }, errs: {} }; render(); break;
            case 'wl-new-award-ok': result(wl.award(M.e, M.f), 'wl.t.awarded', M); break;
            case 'wl-edit-deduct-ok': result(wl.deduct(M.e, M.f), 'wl.t.deducted', M); break;
            case 'wl-approve-redeem': D.modal = { k: 'redeem', e: no, f: { wallet: 'course', points: String(Math.min(wl.points(no), wl.STEP)) }, errs: {} }; render(); break;
            case 'wl-approve-redeem-ok': { const r = wl.redeem(M.e, M.f.wallet, M.f.points); if (r.ok) { D.modal = null; render(); toast(t(r.entry.wallet === 'cash' ? 'wl.t.voucher' : 'wl.t.credit', { c: r.entry.code, v: money(r.entry.cash || r.entry.cc) }), 'ok'); } else { M.errs = r.errors; render(); } break; }
            case 'wl-approve-reverse': D.modal = { k: 'reverse', id, f: { reason: '' }, errs: {} }; render(); break;
            case 'wl-approve-reverse-ok': result(wl.reverse(M.id, M.f.reason), 'wl.t.reversed', M); break;
            case 'wl-update-rules': { const R = draftRules(); const r = wl.saveRules(R); if (!r.ok) { Object.keys(r.errors).forEach((k) => { R[+k.slice(1)].errs = true; }); render(); break; } D.rules = null; render(); toast(t('wl.t.rules'), 'ok'); break; }
            case 'wl-new-rate': { const r = wl.addRate(D.rate); if (!r.ok) { D.rateErrs = r.errors; render(); break; } D.rate = { from: '', cash: '', course: '' }; D.rateErrs = {}; render(); toast(t('wl.t.rate'), 'ok'); break; }
            case 'close-modal': D.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.tab = 'wallets'; D.kw = ''; D.draft = ''; D.led = ''; D.page = 1; D.more = false; D.modal = null; D.rules = null; D.rate = { from: '', cash: '', course: '' }; D.rateErrs = {}; },
      };
    },
  });
})(window.BS);
