/* Admin: 转转乐 (spin & win) — the month's prize spend against its budget, the token and streak rules, the eight wheel slices with their odds and caps, referrals,
   each worker's tokens, and the artwork slots. Employer administrators only; every change is audited and never retroactive. */
(function (BS) {
  const { html, icon, raw } = BS;
  const P = BS.perm, hr = BS.hr, sp = BS.spin, wl = BS.wallet, WH = BS.spinWheel;
  const today = () => BS.fmt.now().slice(0, 10);
  const SIZE = 8;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const RF = ['', 'pending', 'rewarded', 'capped', 'void'];

  BS.registerAdmin({
    id: 'spin', nav: 'a.nav.spin', stores: [hr, sp, wl, BS.att],
    tabs: [{ id: 'report', k: 'sp.tab.report' }, { id: 'rules', k: 'sp.tab.rules' }, { id: 'prizes', k: 'sp.tab.prizes' }, { id: 'referrals', k: 'sp.tab.referrals' }, { id: 'workers', k: 'sp.tab.workers' }, { id: 'art', k: 'sp.tab.art' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const D = { tab: 'report', month: today().slice(0, 7), kw: '', draft: '', page: 1, modal: null, cfg: null, cfgErrs: {}, pz: null, pzMonthly: '', pzErrs: {}, rf: '', rfForm: { referrer: '', referred: '' }, rfErrs: {} };
      const can = (op) => P.can('spin', op);
      const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
      const money = (n) => 'S$ ' + Number(n).toFixed(2);
      const inScope = (no) => P.inScope(no);
      const accName = (id) => { const a = P.account(id); if (a) return z() ? a.name : a.nameEn || a.name; const e = hr.emp(id); return e ? nm(e) : id === 'system' ? t('ptw.sys') : String(id); };
      const pName = (p) => (z() ? p.zh : p.en) || t('sp.k.' + p.kind, { v: p.value });
      const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
      const people = () => { const kw = D.kw.trim().toLowerCase(); return hr.emps().filter((e) => e.status === 'active' && inScope(e.empNo) && (!kw || e.name.toLowerCase().includes(kw) || (e.nameEn || '').toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw))).sort((a, b) => sp.balance(b.empNo) - sp.balance(a.empNo) || a.empNo.localeCompare(b.empNo)); };
      const bar = (pct, warn) => html`<div class="sp-bar ${warn ? 'warn' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(2, pct)}%"></i></div>`;
      const E = (errs, k, extra) => (errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('sp.e.' + errs[k], extra)}</small>` : '');

      // ---------- report ----------
      function reportPage() {
        const R = sp.report(D.month); const odds = sp.odds(sp.prizes()); const exp = odds[0] ? odds[0].expected : 0; const cur = D.month === today().slice(0, 7); const over = R.budget > 0 && R.spent >= R.budget;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.rep.title')}</h1><p class="a-sub">${t('sp.rep.sub')}</p></div><div class="a-tbtns"><label class="a-in"><select data-m="month" aria-label="${t('sp.rep.month')}">${sp.months().map((m) => html`<option value="${m}" ${m === D.month ? 'selected' : ''}>${m}</option>`)}</select></label><button type="button" class="a-btn" data-act="sp-export">${icon('upload', 16)} ${t('hr.export')}</button></div></div>
          <section class="a-card sp-budget" data-role="budget"><div class="sp-budget-h"><div><small>${t('sp.rep.budget')}</small><b>${money(R.spent)} <i>/ ${money(R.budget)}</i></b></div><div class="sp-budget-r"><span class="a-tag ${over ? 'rejected' : R.pct >= 80 ? 'pending' : 'approved'}">${over ? t('sp.rep.used') : t('sp.rep.left', { n: money(R.remaining) })}</span></div></div>${bar(R.pct, R.pct >= 80)}
            ${over && cur ? html`<p class="p-warnbox" role="alert">${icon('warn', 16)} ${t('sp.rep.exhausted')}</p>` : ''}<small class="mute">${t('sp.rep.expect', { n: money(exp), s: exp > 0 ? Math.floor(R.remaining / exp) : '∞' })}</small></section>
          <div class="dp-kpis">${[['sp.rep.k.spins', R.spins, 'active', t('sp.rep.k.spinsSub', { n: R.tokensSpent })], ['sp.rep.k.earned', R.tokensEarned, 'granted', ['daily', 'streak', 'referral', 'adjust'].map((k) => `${t('sp.kind.' + k)} ${R.tokensByKind[k] || 0}`).join(' · ')], ['sp.rep.k.out', R.outstanding, 'requested', t('sp.rep.k.outSub')], ['sp.rep.k.avg', R.spins ? money(R.spent / R.spins) : '—', 'blocked', t('sp.rep.k.avgSub')]].map(([lab, v, cls, sub]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span><small class="mute">${sub}</small></div>`)}</div>
          <div class="sp-cols"><section class="a-card"><h3 class="hr-h">${t('sp.rep.byPrize')}</h3><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>#</th><th>${t('sp.p.prize')}</th><th>${t('sp.p.odds')}</th><th>${t('sp.rep.times')}</th><th>${t('sp.rep.cost')}</th></tr></thead><tbody>${R.byPrize.map((r, i) => html`<tr data-prize="${r.prize.id}"><td>${i + 1}</td><td><span class="sp-dot" style="background:${r.prize.color}"></span> <b>${pName(r.prize)}</b><small class="hr-sub">${t('sp.k.' + r.prize.kind + 'S')}</small></td><td>${odds[i].pct.toFixed(1)}%</td><td>${r.count}</td><td>${money(r.cost)}</td></tr>`)}</tbody></table></div></section>
            <section class="a-card"><h3 class="hr-h">${t('sp.rep.byWorker')}</h3>${R.workers.length ? R.workers.slice(0, 6).map((w) => html`<div class="sp-wk"><b>${nm(hr.emp(w.empNo))}</b> <span class="mute">${w.empNo}</span><span>${t('sp.rep.spinsN', { n: w.spins })} · ${money(w.cost)}</span></div>`) : html`<p class="a-fhint">${t('sp.rep.none')}</p>`}</section></div>
          <section class="a-card"><h3 class="hr-h">${t('sp.rep.recent')}</h3>${R.rows.length ? html`<div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('sp.rep.when')}</th><th>${t('dep.c.worker')}</th><th>${t('sp.p.prize')}</th><th>${t('sp.rep.cost')}</th><th>${t('sp.rep.ref')}</th></tr></thead><tbody>${R.rows.slice(0, 12).map((s) => { const p = sp.prize(s.prizeId); return html`<tr data-spin="${s.id}"><td class="mute">${s.at}</td><td><b>${nm(hr.emp(s.empNo))}</b><small class="hr-sub">${s.empNo}</small></td><td>${p ? pName(p) : s.prizeId}${s.code ? html` <code>${s.code}</code>` : ''}</td><td>${money(s.cost)}</td><td class="mute">${s.id}</td></tr>`; })}</tbody></table></div>` : html`<p class="a-fhint">${t('sp.rep.none')}</p>`}</section>
          <p class="l-audit">${icon('shield', 14)} ${t('sp.rep.note')}</p>`;
      }

      // ---------- rules ----------
      const draftCfg = () => { if (!D.cfg) D.cfg = clone(sp.config()); return D.cfg; };
      function rulesPage() {
        const c = draftCfg(); const Er = D.cfgErrs; const f = (k, label, extra = {}) => html`<div class="a-frow"><label class="a-lab" for="sc-${k}">${label}</label><input id="sc-${k}" class="a-field" type="${extra.type || 'number'}" ${extra.max ? 'max="' + extra.max + '"' : ''} min="${extra.min == null ? 0 : extra.min}" data-cf="${k}" value="${c[k]}">${E(Er, k)}${extra.hint ? html`<small class="a-fhint">${extra.hint}</small>` : ''}</div>`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.rules.title')}</h1><p class="a-sub">${t('sp.rules.sub')}</p></div></div>
          <section class="a-card dp-rules"><h3 class="hr-h">${icon('check', 16)} ${t('sp.rules.earn')}</h3><p class="a-fhint">${t('sp.rules.earnHint')}</p>
            <div class="p-two">${f('start', t('sp.rules.start'), { type: 'date', max: today(), hint: t('sp.rules.startHint') })}${f('daily', t('sp.rules.daily'), { min: 1 })}</div>
            <div class="p-two">${f('spinCost', t('sp.rules.cost'), { min: 1 })}<div></div></div>
            <h4 class="dp-h4">${t('sp.rules.streak')}</h4><p class="a-fhint">${t('sp.rules.streakHint')}</p>
            ${c.milestones.map((m, i) => html`<div class="sp-ms" data-ms="${i}"><label>${t('sp.rules.atDay')} <input type="number" min="2" max="365" data-cm="${i}:day" value="${m.day}" aria-label="${t('sp.rules.atDay')}"></label><label>+ <input type="number" min="1" max="20" data-cm="${i}:tokens" value="${m.tokens}" aria-label="${t('sp.rules.bonus')}"> ${t('sp.rules.tokens')}</label>${c.milestones.length > 1 ? html`<button type="button" class="a-link bad" data-act="sp-edit-msdel" data-i="${i}">${t('sp.rules.remove')}</button>` : ''}${E(Er, 'm' + i + 'd')}${E(Er, 'm' + i + 't')}</div>`)}
            ${E(Er, 'milestones')}${c.milestones.length < 6 ? html`<button type="button" class="a-btn sm" data-act="sp-edit-msadd">+ ${t('sp.rules.addMs')}</button>` : ''}
            <h4 class="dp-h4">${t('sp.rules.ref')}</h4><p class="a-fhint">${t('sp.rules.refHint')}</p>
            <div class="p-two">${f('refReferrer', t('sp.rules.refA'))}${f('refReferred', t('sp.rules.refB'))}</div><div class="p-two">${f('refCap', t('sp.rules.refCap'), { min: 1, hint: t('sp.rules.refCapHint') })}${f('refNewDays', t('sp.rules.refNew'), { min: 1, hint: t('sp.rules.refNewHint') })}</div>
            <div class="dp-actions"><button type="button" class="a-btn" data-act="sp-reset-rules">${t('a.f.reset')}</button><button type="button" class="a-btn primary" data-act="sp-update-rules">${t('sp.rules.save')}</button></div></section>
          <p class="l-audit">${icon('shield', 14)} ${t('sp.rules.note')}</p>`;
      }

      // ---------- prizes ----------
      const draftPz = () => { if (!D.pz) { D.pz = clone(sp.prizes()); D.pzMonthly = String(sp.budget().monthly); } return D.pz; };
      function prizesPage() {
        WH.probe(); const L = draftPz(); const Er = D.pzErrs; const valid = !Object.keys(sp.validatePrizes(L, D.pzMonthly)).length; const odds = valid ? sp.odds(L) : L.map((p) => ({ pct: 0, cost: sp.prizeCost(p), expected: 0 })); const exp = valid ? odds[0].expected : null; const monthly = Number(D.pzMonthly) || 0;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.pz.title')}</h1><p class="a-sub">${t('sp.pz.sub')}</p></div></div>
          <div class="sp-pz-top"><section class="a-card sp-pz-wheel"><div class="sp-wheel-box">${raw(WH.svg(L.map((p, i) => ({ ...p, zh: p.zh, en: p.en, color: sp.prizes()[i].color })), { id: 'sp-adm-rotor', lang: lang() }))}</div><small class="mute">${t('sp.pz.wheelHint')}</small></section>
            <section class="a-card"><div class="a-frow"><label class="a-lab" for="pz-m"><b class="req">*</b> ${t('sp.pz.monthly')}</label><input id="pz-m" class="a-field" type="number" min="0" step="10" data-pm="monthly" value="${D.pzMonthly}">${E(Er, 'monthly')}<small class="a-fhint">${t('sp.pz.monthlyHint')}</small></div>
              <div class="sp-pz-sum"><div><small>${t('sp.pz.expected')}</small><b>${exp == null ? '—' : money(exp)}</b></div><div><small>${t('sp.pz.afford')}</small><b>${exp ? Math.floor(monthly / exp) : exp === 0 ? '∞' : '—'}</b></div><div><small>${t('sp.pz.tw')}</small><b>${L.reduce((n, p) => n + (Number(p.weight) || 0), 0)}</b></div></div>${E(Er, 'total')}</section></div>
          <section class="a-card"><div class="a-tablewrap"><table class="a-table dp-table sp-pz"><thead><tr><th>#</th><th>${t('sp.p.kind')}</th><th>${t('sp.p.value')}</th><th>${t('sp.p.weight')}</th><th>${t('sp.p.odds')}</th><th>${t('sp.p.cap')}</th><th>${t('sp.p.cost')}</th><th>${t('sp.p.name')}</th></tr></thead><tbody>
            ${L.map((p, i) => html`<tr data-slice="${i}"><td><span class="sp-dot" style="background:${sp.prizes()[i].color}"></span> ${i + 1}</td>
              <td><select data-pz="${i}:kind" aria-label="${t('sp.p.kind')}">${sp.KINDS.map((k) => html`<option value="${k}" ${p.kind === k ? 'selected' : ''}>${t('sp.k.' + k + 'S')}</option>`)}</select>${E(Er, 'k' + i)}</td>
              <td>${p.kind === 'none' ? html`<span class="mute">—</span>` : html`<input type="number" min="0.5" step="${p.kind === 'points' || p.kind === 'spin' ? 1 : 0.5}" data-pz="${i}:value" value="${p.value}" aria-label="${t('sp.p.value')}">`}${E(Er, 'v' + i)}</td>
              <td><input type="number" min="0" step="1" data-pz="${i}:weight" value="${p.weight}" aria-label="${t('sp.p.weight')}">${E(Er, 'w' + i)}</td><td>${valid ? odds[i].pct.toFixed(1) + '%' : '—'}</td>
              <td><input type="number" min="0" max="20" data-pz="${i}:cap" value="${p.cap}" aria-label="${t('sp.p.cap')}">${E(Er, 'c' + i)}</td><td>${money(sp.prizeCost(p))}</td>
              <td class="sp-names"><input data-pz="${i}:zh" value="${p.zh}" maxlength="24" placeholder="中文" aria-label="${t('sp.p.name')} 中文"><input data-pz="${i}:en" value="${p.en}" maxlength="24" placeholder="English" aria-label="${t('sp.p.name')} English">${E(Er, 'n' + i)}</td></tr>`)}</tbody></table></div>
            <p class="a-fhint">${t('sp.pz.rules')}</p>${E(Er, 'count')}
            <div class="dp-actions"><button type="button" class="a-btn" data-act="sp-reset-prizes">${t('a.f.reset')}</button><button type="button" class="a-btn primary" data-act="sp-update-prizes">${t('sp.pz.save')}</button></div></section>
          <p class="l-audit">${icon('shield', 14)} ${t('sp.pz.note')}</p>`;
      }

      // ---------- referrals ----------
      function referralsPage() {
        const rows = sp.referrals().filter((r) => (inScope(r.referrer) || inScope(r.referred)) && (!D.rf || r.status === D.rf)); const cfg = sp.config(); const f = D.rfForm; const Er = D.rfErrs;
        const recent = hr.emps().filter((e) => e.status === 'active' && inScope(e.empNo)); const fresh = recent.filter((e) => e.joinDate >= hr.addDays(today(), -cfg.refNewDays) && !sp.referralOf(e.empNo));
        const cnt = (s) => sp.referrals().filter((r) => !s || r.status === s).length;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.rf.title')}</h1><p class="a-sub">${t('sp.rf.sub', { a: cfg.refReferrer, b: cfg.refReferred, c: cfg.refCap })}</p></div></div>
          ${can('create') ? html`<section class="a-card"><h3 class="hr-h">${t('sp.rf.record')}</h3><div class="p-two"><div class="a-frow"><label class="a-lab" for="rf-a"><b class="req">*</b> ${t('sp.rf.referrer')}</label><select id="rf-a" class="a-field" data-rf="referrer"><option value="">${t('dep.f.pick')}</option>${recent.map((e) => html`<option value="${e.empNo}" ${f.referrer === e.empNo ? 'selected' : ''}>${nm(e)} (${e.empNo})</option>`)}</select>${E(Er, 'referrer')}</div>
            <div class="a-frow"><label class="a-lab" for="rf-b"><b class="req">*</b> ${t('sp.rf.referred')}</label><select id="rf-b" class="a-field" data-rf="referred"><option value="">${t('dep.f.pick')}</option>${fresh.map((e) => html`<option value="${e.empNo}" ${f.referred === e.empNo ? 'selected' : ''}>${nm(e)} (${e.empNo}) · ${t('sp.rf.joined', { d: e.joinDate })}</option>`)}</select>${E(Er, 'referred', { n: cfg.refNewDays })}${fresh.length ? '' : html`<small class="a-fhint">${t('sp.rf.noFresh', { n: cfg.refNewDays })}</small>`}</div></div>
            <div class="dp-actions"><button type="button" class="a-btn primary" data-act="sp-new-referral">${t('sp.rf.add')}</button></div><small class="a-fhint">${t('sp.rf.hint', { n: cfg.refNewDays })}</small></section>` : ''}
          <section class="a-card"><div class="hr-chips pt-filters" role="group">${RF.map((s) => html`<button type="button" class="${D.rf === s ? 'on' : ''}" data-act="sp-rff" data-s="${s}">${s ? t('sp.rf.st.' + s) : t('dep.f.all')} (${cnt(s)})</button>`)}</div></section>
          ${rows.length ? html`<section class="a-card"><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('sp.rep.ref')}</th><th>${t('sp.rf.referrer')}</th><th>${t('sp.rf.referred')}</th><th>${t('sp.rf.at')}</th><th>${t('sp.rf.status')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead><tbody>${rows.map((r) => html`<tr data-ref="${r.id}"><td><b>${r.id}</b></td><td>${nm(hr.emp(r.referrer))}<small class="hr-sub">${r.referrer} · ${sp.code(r.referrer)}</small></td><td>${nm(hr.emp(r.referred))}<small class="hr-sub">${r.referred}</small></td><td>${r.at}</td>
            <td><span class="a-tag ${r.status === 'rewarded' ? 'approved' : r.status === 'pending' ? 'pending' : r.status === 'capped' ? 'rejected' : 'withdrawn'}">${t('sp.rf.st.' + r.status)}</span>${r.rewardedAt ? html`<small class="hr-sub">${t('sp.rf.paidOn', { d: r.rewardedAt })}</small>` : ''}${r.note ? html`<small class="hr-sub">${r.note}</small>` : ''}</td>
            <td class="c-act">${r.status === 'pending' && can('update') ? html`<button type="button" class="a-link bad" data-act="sp-edit-void" data-id="${r.id}">${t('sp.rf.void')}</button>` : ''}</td></tr>`)}</tbody></table></div></section>` : html`<section class="a-card"><div class="a-none"><p>${t('sp.rf.none')}</p></div></section>`}
          <p class="l-audit">${icon('shield', 14)} ${t('sp.rf.note')}</p>`;
      }

      // ---------- workers ----------
      function workersPage() {
        const all = people(); const pages = Math.max(1, Math.ceil(all.length / SIZE)); if (D.page > pages) D.page = pages; const slice = all.slice((D.page - 1) * SIZE, D.page * SIZE); const mo = today().slice(0, 7);
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.wk.title')}</h1><p class="a-sub">${t('sp.wk.sub')}</p></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off"><label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${D.draft}" placeholder="${t('wl.f.kw')}" aria-label="${t('wl.f.kw')}"></label><span class="a-fgrow"></span><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            ${slice.length ? html`<div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('dep.c.worker')}</th><th>${t('sp.wk.tokens')}</th><th>${t('sp.wk.streak')}</th><th>${t('sp.wk.today')}</th><th>${t('sp.wk.spins')}</th><th>${t('sp.wk.code')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead><tbody>${slice.map((e) => { const s = sp.streak(e.empNo); const td = sp.today(e.empNo); const n = sp.spins(e.empNo).filter((x) => x.month === mo).length;
              return html`<tr data-emp="${e.empNo}"><td><b>${nm(e)}</b><small class="hr-sub">${e.empNo}</small></td><td><b class="sp-tok">${sp.balance(e.empNo)}</b></td><td>${s.count}${s.next ? html` <small class="mute">${t('sp.wk.nextMs', { n: s.left, d: s.next.day })}</small>` : ''}</td>
                <td>${td.leave ? t('sp.wk.leave') : !td.scheduled ? t('sp.wk.rest') : td.earned ? html`<span class="a-tag approved">${t('sp.wk.earned')}</span>` : td.inDone ? html`<span class="a-tag pending">${t('sp.wk.in')}</span>` : html`<span class="a-tag withdrawn">${t('sp.wk.notyet')}</span>`}</td><td>${n}</td><td><code>${sp.code(e.empNo)}</code></td>
                <td class="c-act"><button type="button" class="a-link" data-act="sp-led" data-e="${e.empNo}">${t('sp.wk.ledger')}</button>${can('approve') ? html`<button type="button" class="a-link" data-act="sp-approve-adjust" data-e="${e.empNo}">${t('sp.wk.adjust')}</button>` : ''}</td></tr>`; })}</tbody></table></div>` : html`<div class="a-none"><p>${t('wl.none')}</p></div>`}
            <footer class="a-pager"><span>${t('wl.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${D.page === i + 1 ? 'on' : ''}" data-act="sp-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
      }

      // ---------- artwork ----------
      function artPage() {
        WH.probe(); const A = WH.ASSETS; const n = A.filter((a) => WH.have[a.file]).length;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sp.art.title')}</h1><p class="a-sub">${t('sp.art.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="sp-recheck">${icon('refresh', 16)} ${t('sp.art.recheck')}</button></div></div>
          <section class="a-card sp-art-how"><p>${t('sp.art.how', { dir: WH.DIR, n, m: A.length })}</p><ol><li>${t('sp.art.s1')}</li><li>${t('sp.art.s2')}</li><li>${t('sp.art.s3', { dir: WH.DIR })}</li><li>${t('sp.art.s4')}</li></ol><p class="a-fhint">${t('sp.art.style')}</p></section>
          <div class="sp-art">${A.map((a) => html`<article class="a-card sp-art-card" data-asset="${a.file}"><header><b><code>${a.file}</code></b><span class="a-tag ${WH.have[a.file] ? 'approved' : 'withdrawn'}">${WH.have[a.file] ? t('sp.art.loaded') : t('sp.art.coded')}</span></header>
            <p>${z() ? a.zh : a.en}</p><small class="mute">${t('sp.art.size', { s: a.size })} · ${t('sp.art.' + a.ratio)}</small>${WH.have[a.file] ? html`<img class="sp-art-prev" src="${WH.DIR + a.file}" alt="${a.file}">` : ''}
            <details><summary>${t('sp.art.prompt')}</summary><textarea readonly rows="6" class="a-field" aria-label="${t('sp.art.prompt')} ${a.file}">${a.prompt}</textarea><button type="button" class="a-btn sm" data-act="sp-copy" data-f="${a.file}">${icon('file', 14)} ${t('sp.art.copy')}</button></details></article>`)}</div>`;
      }

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      function ledgerModal() {
        const e = hr.emp(D.modal.e); const L = sp.ledger(D.modal.e).slice(0, 30); const s = sp.streak(D.modal.e);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>${head(t('sp.led.title', { n: nm(e) }), t('sp.led.sub', { b: sp.balance(D.modal.e), s: s.count }))}
          <div class="a-mbody">${L.length ? html`<div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('sp.rep.when')}</th><th>${t('sp.led.kind')}</th><th>${t('sp.led.tokens')}</th><th>${t('sp.led.ref')}</th><th>${t('sp.led.by')}</th></tr></thead><tbody>${L.map((x) => html`<tr><td class="mute">${x.at}</td><td>${t('sp.kind.' + x.kind)}</td><td><b class="${x.tokens > 0 ? 'sp-up' : 'sp-down'}">${x.tokens > 0 ? '+' : ''}${x.tokens}</b></td><td class="mute" style="white-space:normal">${x.ref}${x.kind === 'adjust' ? ' · ' + x.reason : ''}</td><td class="mute">${accName(x.by)}</td></tr>`)}</tbody></table></div>` : html`<p class="a-fhint">${t('sp.rep.none')}</p>`}</div>
          <footer><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }
      function adjustModal() {
        const M = D.modal; const e = hr.emp(M.e);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>${head(t('sp.adj.title'), `${nm(e)} · ${t('sp.adj.balance', { n: sp.balance(M.e) })}`)}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="aj-t"><b class="req">*</b> ${t('sp.adj.tokens')}</label><input id="aj-t" class="a-field" type="number" step="1" data-aj="tokens" value="${M.f.tokens}" placeholder="+2 / −1">${E(M.errs, 'tokens')}<small class="a-fhint">${t('sp.adj.hint')}</small></div>
            <div class="a-frow"><label class="a-lab" for="aj-r"><b class="req">*</b> ${t('sp.adj.reason')}</label><textarea id="aj-r" class="a-field" rows="2" maxlength="200" data-aj="reason" placeholder="${t('sp.adj.ph')}">${M.f.reason}</textarea>${E(M.errs, 'reason')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sp-approve-adjust-ok">${t('sp.adj.ok')}</button></footer></div></div>`;
      }
      function voidModal() {
        const M = D.modal;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>${head(t('sp.void.title'), M.id)}
          <div class="a-mbody"><div class="a-frow"><label class="a-lab" for="vd-r"><b class="req">*</b> ${t('sp.adj.reason')}</label><textarea id="vd-r" class="a-field" rows="2" maxlength="160" data-vd="reason">${M.reason}</textarea>${E(M.errs, 'reason')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="sp-edit-void-ok">${t('sp.rf.void')}</button></footer></div></div>`;
      }
      function modal() { const M = D.modal; if (!M) return ''; return { led: ledgerModal, adjust: adjustModal, void: voidModal }[M.k](); }
      function page() { return { report: reportPage, rules: rulesPage, prizes: prizesPage, referrals: referralsPage, workers: workersPage, art: artPage }[D.tab](); }
      const ERR = { missing: 'sp.t.stale', state: 'sp.t.stale', reason: 'sp.e.reason', reason_len: 'sp.e.reason_len' };
      const resetDrafts = () => { D.cfg = null; D.cfgErrs = {}; D.pz = null; D.pzErrs = {}; D.rfErrs = {}; };
      WH.onChange(() => { if (D.tab === 'art' || D.tab === 'prizes') render(); });
      sp.syncAll();

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.spin'), act: 'noop' }, { text: t('sp.tab.' + D.tab) }]; }, page, modal,
        onGo() { D.tab = 'report'; },
        onTab() { D.modal = null; resetDrafts(); sp.syncAll(); },
        onInput(e) {
          const el = e.target, M = D.modal;
          if (el.dataset.m === 'month') { D.month = el.value; render(); return; }
          if (el.dataset.f) { D.draft = el.value; return; }
          if (el.dataset.cf) { draftCfg()[el.dataset.cf] = el.value; D.cfgErrs = {}; return; }
          if (el.dataset.cm) { const [i, k] = el.dataset.cm.split(':'); draftCfg().milestones[+i][k] = el.value; D.cfgErrs = {}; return; }
          if (el.dataset.pm) { draftPz(); D.pzMonthly = el.value; D.pzErrs = {}; render(); const i = ctx.view().querySelector('[data-pm=monthly]'); if (i) i.focus(); return; }
          if (el.dataset.pz) { const [i, k] = el.dataset.pz.split(':'); const p = draftPz()[+i]; p[k] = el.value; D.pzErrs = {}; if (k === 'kind') { p.value = p.kind === 'none' ? 0 : p.kind === 'spin' ? 1 : p.kind === 'points' ? 10 : 2; }
            if (k === 'kind' || k === 'weight' || k === 'value') { const keep = el.dataset.pz; render(); const n = ctx.view().querySelector(`[data-pz="${keep}"]`); if (n && n.tagName === 'INPUT') { n.focus(); n.setSelectionRange && n.type === 'text' && n.setSelectionRange(n.value.length, n.value.length); } } return; }
          if (el.dataset.rf) { D.rfForm[el.dataset.rf] = el.value; D.rfErrs = {}; return; }
          if (M && M.k === 'adjust' && el.dataset.aj) { M.f[el.dataset.aj] = el.value; return; }
          if (M && M.k === 'void' && el.dataset.vd) { M.reason = el.value; }
        },
        onSubmit() { D.page = 1; D.kw = D.draft; render(); },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onStore() { render(); },
        onClick(a, b) {
          const id = b.dataset.id;
          switch (a) {
            case 'noop': break;
            case 'sp-export': { const R = sp.report(D.month); download(`spin-${D.month}.csv`, csvOf([['spin', 'at', 'emp', 'prize', 'kind', 'value', 'cost_sgd', 'tokens', 'odds_pct', 'code'], ...R.rows.map((s) => [s.id, s.at, s.empNo, s.prizeId, s.kind, s.value, s.cost, s.tokens, s.odds, s.code || ''])])); toast(t('hr.toast.exported', { n: R.rows.length }), 'ok'); break; }
            case 'sp-update-rules': { const r = sp.saveConfig(draftCfg()); if (!r.ok) { D.cfgErrs = r.errors; render(); toast(t('sp.t.fix'), 'warn'); break; } D.cfg = null; D.cfgErrs = {}; render(); toast(t('sp.t.rulesSaved'), 'ok'); break; }
            case 'sp-reset-rules': D.cfg = null; D.cfgErrs = {}; render(); break;
            case 'sp-edit-msadd': { const c = draftCfg(); const last = c.milestones[c.milestones.length - 1]; c.milestones.push({ day: Number(last.day) + 7, tokens: 1 }); D.cfgErrs = {}; render(); break; }
            case 'sp-edit-msdel': { const c = draftCfg(); c.milestones.splice(+b.dataset.i, 1); D.cfgErrs = {}; render(); break; }
            case 'sp-update-prizes': { const r = sp.savePrizes(draftPz(), D.pzMonthly); if (!r.ok) { D.pzErrs = r.errors; render(); toast(t('sp.t.fix'), 'warn'); break; } D.pz = null; D.pzErrs = {}; render(); toast(t('sp.t.prizesSaved'), 'ok'); break; }
            case 'sp-reset-prizes': D.pz = null; D.pzErrs = {}; render(); break;
            case 'sp-rff': D.rf = b.dataset.s; render(); break;
            case 'sp-new-referral': { const f = D.rfForm; const r = sp.recordReferral(f.referrer, f.referred, P.currentId()); if (!r.ok) { D.rfErrs = r.errors; render(); break; } D.rfForm = { referrer: '', referred: '' }; D.rfErrs = {}; render(); toast(t('sp.t.refRecorded'), 'ok'); break; }
            case 'sp-edit-void': D.modal = { k: 'void', id, reason: '', errs: {} }; render(); break;
            case 'sp-edit-void-ok': { const M = D.modal; const r = sp.voidReferral(M.id, M.reason, P.currentId()); if (!r.ok) { if (r.error === 'reason' || r.error === 'reason_len') { M.errs = { reason: r.error }; render(); } else { D.modal = null; render(); toast(t(ERR[r.error] || 'sp.t.stale'), 'warn'); } break; } D.modal = null; render(); toast(t('sp.t.refVoided'), 'ok'); break; }
            case 'sp-page': D.page = +b.dataset.p; render(); break;
            case 'sp-led': D.modal = { k: 'led', e: b.dataset.e }; render(); break;
            case 'sp-approve-adjust': D.modal = { k: 'adjust', e: b.dataset.e, f: { tokens: '', reason: '' }, errs: {} }; render(); break;
            case 'sp-approve-adjust-ok': { const M = D.modal; const r = sp.adjust(M.e, M.f.tokens, M.f.reason, P.currentId()); if (!r.ok) { M.errs = r.errors; render(); break; } D.modal = null; render(); toast(t('sp.t.adjusted'), 'ok'); break; }
            case 'sp-recheck': WH.probe(true); toast(t('sp.t.rechecked'), 'ok'); break;
            case 'sp-copy': { const asset = WH.ASSETS.find((x) => x.file === b.dataset.f); if (asset && navigator.clipboard) navigator.clipboard.writeText(asset.prompt).then(() => toast(t('sp.t.copied'), 'ok'), () => toast(t('sp.t.copyFail'), 'warn')); else toast(t('sp.t.copyFail'), 'warn'); break; }
            case 'close-modal': D.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { D.modal = null; D.tab = 'report'; D.month = today().slice(0, 7); D.kw = ''; D.draft = ''; D.page = 1; D.rf = ''; D.rfForm = { referrer: '', referred: '' }; resetDrafts(); },
      };
    },
  });
})(window.BS);
