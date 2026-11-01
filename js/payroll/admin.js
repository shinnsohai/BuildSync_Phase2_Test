/* Admin: 薪资发放 → 工资单 (generate, verify, dispute handling, pay) */
(function (BS) {
  const { html, icon, fmt } = BS;
  const pr = BS.payroll, hr = BS.hr;
  const money = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signed = (n) => (n >= 0 ? '+ ' : '− ') + money(Math.abs(n));
  const today = () => fmt.now().slice(0, 10);
  const F0 = () => ({ kw: '', month: pr.months()[0] || today().slice(0, 7), projectKey: '', status: '' });

  BS.payParts = BS.payParts || {};
  BS.payParts.slips = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const V = { draft: F0(), applied: F0(), page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const nameOf = (e) => (lang() === 'zh' ? e.name : e.nameEn || e.name);
    const empOf = (s) => hr.emp(s.empNo);
    const userL = (s) => (s.userStatus === 'pending' && pr.reconfirm(s) ? t('ps.u.reconfirm') : t('ps.u.' + s.userStatus));
    const userTag = (s) => html`<span class="a-tag ps-u-${s.userStatus}">${userL(s)}</span>`;
    const payTag = (s) => html`<span class="a-tag ps-p-${s.payStatus}">${t('ps.p.' + s.payStatus)}</span>`;
    const unitPrice = (s) => (s.daily ? `${money(s.hourly)} / ${t('ps.hour')}` : t('ps.monthly', { v: money(s.rate) }));
    const rows = () => { const a = V.applied; const kw = a.kw.trim().toLowerCase(); return BS.perm.scoped(pr.slips(), (s) => s.empNo).filter((s) => { const e = empOf(s); return e && (!kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw)) && (!a.month || s.month === a.month) && (!a.projectKey || s.projectKey === a.projectKey) && (!a.status || s.userStatus === a.status); }); };

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 10)); if (V.page > pages) V.page = pages; const slice = all.slice((V.page - 1) * 10, V.page * 10); const d = V.draft;
      const inMonth = BS.perm.scoped(pr.slips(), (s) => s.empNo).filter((s) => !V.applied.month || s.month === V.applied.month);
      const waiting = inMonth.filter((s) => s.userStatus === 'pending' && s.payStatus === 'verified').length, conf = inMonth.filter((s) => s.userStatus === 'confirmed').length, dis = inMonth.filter((s) => s.userStatus === 'disputed').length, unver = inMonth.filter((s) => s.payStatus === 'unverified').length;
      const rate = inMonth.length ? Math.round((conf / inMonth.length) * 1000) / 10 : 0;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('ps.title')}</h1><p class="a-sub">${t('ps.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn" data-act="ps-export">${icon('upload', 16)} ${t('p.export')}</button>${unver ? html`<button type="button" class="a-btn primary-o" data-act="ps-verify-all">${icon('check', 16)} ${t('ps.verifyAll', { n: unver })}</button>` : ''}<button type="button" class="a-btn primary" data-act="ps-gen">${icon('refresh', 16)} ${t('ps.gen')}</button></div></div>
        <div class="st-cards ps-cards">
          <div class="st-card"><small>${t('ps.c.total')}</small><b>${inMonth.length}</b><span>${t('ps.c.totalSub')}${unver ? ' · ' + t('ps.c.unver', { n: unver }) : ''}</span></div>
          <div class="st-card"><small>${t('ps.u.pending')}</small><b>${waiting}</b><span>${t('ps.c.waiting')}</span></div>
          <div class="st-card add"><small>${t('ps.u.confirmed')}</small><b>${conf}</b><span>${t('ps.c.rate', { r: rate })}</span></div>
          <div class="st-card off"><small>${t('ps.u.disputed')}</small><b>${dis}</b><span>${t('ps.c.dispSub')}</span></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('at.dt.kw')}" aria-label="${t('at.dt.kw')}"></label>
            <label class="a-in"><span class="a-in-l">${t('ps.month')}</span><input type="month" data-f="month" value="${d.month}" max="${today().slice(0, 7)}"></label>
            <label class="a-in"><select data-f="projectKey" aria-label="${t('lv.d.project')}"><option value="">${t('lv.d.project')}</option>${hr.projects().map((p) => html`<option value="${p.key}" ${d.projectKey === p.key ? 'selected' : ''}>${loc(p)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('ps.confirmState')}"><option value="">${t('ps.confirmState')}</option>${['pending', 'confirmed', 'disputed'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('ps.u.' + k)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="ps-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table ps-table"><thead><tr>${['person', 'month', 'gross', 'net', 'rate', 'base', 'ot', 'user', 'pay'].map((c) => html`<th class="${['gross', 'net'].includes(c) ? 'c-amount' : ''}">${t('ps.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((s) => html`<tr><td><b>${nameOf(empOf(s))}</b><small class="hr-sub">${s.empNo}</small></td><td class="mute">${s.month}</td><td class="c-amount">${money(s.gross)}</td><td class="c-amount"><b>${money(s.net)}</b></td><td>${unitPrice(s)}</td><td>${t('ps.hours', { n: fmt.num(s.baseHours) })}</td><td>${t('ps.hours', { n: fmt.num(s.otHours) })}${s.otMode === 'leave' && s.otHours ? html` <em class="p-chip leave">${t('ps.toil')}</em>` : ''}</td><td>${userTag(s)}</td><td>${payTag(s)}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="ps-view" data-id="${s.id}">${t('t.s.view')}</button>${s.payStatus === 'unverified' ? html`<button type="button" class="a-link" data-act="ps-verify" data-id="${s.id}">${t('ps.act.verify')}</button>` : ''}${s.payStatus === 'processing' ? html`<button type="button" class="a-link" data-act="ps-resolve" data-id="${s.id}">${t('ps.act.adjust')}</button>` : ''}${s.payStatus === 'payable' ? html`<button type="button" class="a-link ok" data-act="ps-pay" data-id="${s.id}">${t('ps.act.pay')}</button>` : ''}</td></tr>`)
              : html`<tr><td colspan="10" class="a-none">${icon('wallet', 32)}<p>${t('ps.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('ps.count', { n: all.length })}</span><nav aria-label="${t('a.pager')}"><button type="button" data-act="ps-page" data-p="${V.page - 1}" ${V.page <= 1 ? 'disabled' : ''}>‹</button>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${V.page === i + 1 ? 'on' : ''}" data-act="ps-page" data-p="${i + 1}">${i + 1}</button>`)}<button type="button" data-act="ps-page" data-p="${V.page + 1}" ${V.page >= pages ? 'disabled' : ''}>›</button></nav></footer></section>`;
    }

    // ---------- dialogs ----------
    const breakdown = (s, o = {}) => {
      const kv = (k, v, cls = '') => html`<div class="ps-kv ${cls}"><dt>${k}</dt><dd>${v}</dd></div>`;
      return html`<dl class="ps-dl">
        ${kv(t('ps.d.rate'), s.daily ? `${money(s.hourly)} / ${t('ps.hour')} · ${t('ps.hours', { n: fmt.num(s.baseHours) })}` : `${t('ps.monthly', { v: money(s.rate) })} · ${t('ps.hours', { n: fmt.num(s.baseHours) })}`)}
        ${kv(t('ps.d.base'), money(s.base + s.paidLeave) + (s.paidLeave ? ` (${t('ps.d.incl', { v: money(s.paidLeave), h: fmt.num(s.paidLeaveHours) })})` : ''))}
        ${kv(t('ps.d.ot'), s.otMode === 'leave' && s.daily ? `${t('ps.hours', { n: fmt.num(s.otHours) })} · ${t('ps.d.toilNote', { n: fmt.num(s.toilHours) })}` : `${t('ps.hours', { n: fmt.num(s.otHours) })} · ${money(s.ot)}${s.locked ? ' · ' + t('ps.d.locked') : ''}`)}
        ${o.editable ? html`<div class="ps-kv"><dt>${t('ps.d.incentive')}</dt><dd><span class="a-field l-amt ps-in"><span>+ S$</span><input data-ps="incentive" inputmode="decimal" value="${o.f.incentive}"></span></dd></div>` : kv(t('ps.d.incentive'), '+ ' + money(s.incentive))}
        ${kv(t('ps.d.gross'), money(s.gross), 'tot')}
        ${kv(t('ps.d.leave'), '− ' + money(s.leaveDeduct) + (s.unpaidLeaveHours ? ` (${t('ps.d.unpaidH', { n: fmt.num(s.unpaidLeaveHours) })})` : ''))}
        ${kv(t('ps.d.cpf'), '− ' + money(s.cpf) + (s.cpfRate ? ` (${s.cpfRate}%)` : ` (${t('ps.d.noCpf')})`))}
        ${o.editable ? html`<div class="ps-kv"><dt>${t('ps.d.other')}</dt><dd><span class="a-field l-amt ps-in"><span>− S$</span><input data-ps="other" inputmode="decimal" value="${o.f.other}"></span></dd></div>` : kv(t('ps.d.other'), '− ' + money(s.other))}
        ${kv(t('ps.d.net'), html`<b data-role="net">${money(s.net)}</b>`, 'tot big')}</dl>`;
    };
    const who = (s) => html`<dl class="a-sum"><div><dt>${t('hr.col.person')}</dt><dd>${nameOf(empOf(s))}（${s.empNo}）</dd></div><div><dt>${t('ps.month')}</dt><dd>${t('ps.monthLbl', { y: s.month.slice(0, 4), m: +s.month.slice(5) })}</dd></div></dl>`;
    function viewModal() {
      const s = pr.slip(V.modal.id); if (!s) return '';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('ps.d.title')}</h2><p>${t('lv.rv.ro')} · ${nameOf(empOf(s))} · ${s.month}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><div class="ps-st">${userTag(s)} ${payTag(s)}${s.paidAt ? html`<small>${t('ps.d.paidAt', { d: s.paidAt })}</small>` : s.confirmedAt ? html`<small>${t('ps.d.confAt', { d: s.confirmedAt })}</small>` : ''}</div>
          ${s.dispute ? html`<div class="ps-disp"><b>${icon('warn', 16)} ${t('ps.d.dispute', { k: t('ps.dt.' + s.dispute.type) })}</b><p>${s.dispute.note}</p><small>${s.dispute.at}</small></div>` : ''}
          ${breakdown(s)}
          ${s.adjustments.length ? html`<h3 class="hr-h">${t('ps.d.adjLog')}</h3>${s.adjustments.map((a) => html`<div class="hr-cert ro"><div class="hr-cert-h"><b>${t('ps.d.adjBy')}</b><span class="mute">${a.at}</span></div><p style="margin:0">${a.note}</p>${a.dispute ? html`<small class="a-fhint">${t('ps.d.disputeWas', { n: a.dispute.note })}</small>` : ''}<small class="a-fhint">${t('ps.d.delta', { v: signed(a.delta), n: money(a.net) })}</small></div>`)}` : ''}
          <p class="a-fhint">${t('ps.d.exportNote')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button><button type="button" class="a-btn" data-act="ps-pdf">${t('ps.d.pdf')}</button>
          ${s.payStatus === 'unverified' ? html`<button type="button" class="a-btn primary" data-act="ps-verify" data-id="${s.id}">${t('ps.act.verify')}</button>` : s.payStatus === 'processing' ? html`<button type="button" class="a-btn primary" data-act="ps-resolve" data-id="${s.id}">${t('ps.act.adjust')}</button>` : s.payStatus === 'payable' ? html`<button type="button" class="a-btn primary" data-act="ps-pay" data-id="${s.id}">${t('ps.act.pay')}</button>` : ''}</footer></div></div>`;
    }
    function verifyModal() {
      const M = V.modal; const s = pr.slip(M.id); if (!s) return ''; const cur = M.preview || s;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('ps.v.title')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">${who(s)}${breakdown(cur, { editable: true, f: M.f })}${M.err ? html`<small class="a-ferr">${t('ps.e.' + M.err)}</small>` : ''}<p class="l-audit">${icon('shield', 14)} ${t('ps.v.note')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ps-verify-ok">${t('ps.v.ok')}</button></footer></div></div>`;
    }
    function resolveModal() {
      const M = V.modal; const s = pr.slip(M.id); if (!s) return ''; const cur = M.preview || s; const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('ps.e.' + M.errs[k])}</small>` : '');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('ps.r.title')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">${who(s)}
          ${s.dispute ? html`<div class="ps-disp"><b>${icon('warn', 16)} ${t('ps.d.dispute', { k: t('ps.dt.' + s.dispute.type) })}</b><p>${s.dispute.note}</p></div>` : ''}
          ${breakdown(cur, { editable: true, f: M.f })}
          <div class="a-frow"><label class="a-lab" for="ps-add">${t('ps.r.addOt')}</label><div class="a-field l-amt"><input id="ps-add" data-ps="addOt" inputmode="decimal" value="${M.f.addOt}" placeholder="0"><span>${t('p.m.hours')}</span></div><small class="a-fhint">${t('ps.r.addOtHint')}</small>${E('amount')}</div>
          <div class="a-frow"><label class="a-lab" for="ps-note"><b class="req">*</b> ${t('ps.r.note')}</label><textarea id="ps-note" class="a-field" data-ps="note" rows="3" maxlength="200" placeholder="${t('ps.r.notePh')}">${M.f.note}</textarea>${E('note')}</div>
          <p class="ps-delta" data-role="delta">${t('ps.r.delta', { v: signed(cur.net - s.net) })}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ps-resolve-ok">${t('ps.r.ok')}</button></footer></div></div>`;
    }
    function payModal() {
      const s = pr.slip(V.modal.id); if (!s) return '';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop><header><h2>${t('ps.pay.title')}</h2><p>${t('p.m.sub')}</p></header>
        <div class="a-mbody"><div class="ps-amt">${money(s.net)}</div><p>${t('ps.pay.msg', { n: nameOf(empOf(s)), y: s.month.slice(0, 4), m: +s.month.slice(5) })}</p><p class="a-fhint">${t('ps.pay.status')}<br>${t('ps.pay.note')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ps-pay-ok">${t('ps.act.pay')}</button></footer></div></div>`;
    }
    function genModal() {
      const M = V.modal; const pv = /^\d{4}-\d{2}$/.test(M.month) && M.month <= today().slice(0, 7) ? pr.preview(M.month) : null;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('ps.g.title')}</h2><p>${t('ps.g.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab" for="ps-gm">${t('ps.month')}</label><input id="ps-gm" type="month" class="a-field" data-ps="gmonth" value="${M.month}" max="${today().slice(0, 7)}"></div>
          <div data-role="gprev">${pv ? html`<dl class="a-sum"><div><dt>${t('ps.g.make')}</dt><dd>${pv.make}</dd></div><div><dt>${t('ps.g.refresh')}</dt><dd>${pv.refresh}</dd></div><div><dt>${t('ps.g.keep')}</dt><dd>${pv.keep}</dd></div></dl>${M.month === today().slice(0, 7) ? html`<p class="p-warnbox">${icon('warn', 16)} ${t('ps.g.partial')}</p>` : ''}` : html`<p class="a-fhint">${t('ps.g.pick')}</p>`}</div>
          <p class="l-audit">${icon('shield', 14)} ${t('ps.g.note')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ps-gen-ok" ${pv && (pv.make || pv.refresh) ? '' : 'disabled'}>${t('ps.g.ok')}</button></footer></div></div>`;
    }
    const recalcPreview = (M) => { const s = pr.slip(M.id); M.preview = pr.calc(s.empNo, s.month, { incentive: M.f.incentive || 0, other: M.f.other || 0, addOt: (s.addOtHours || 0) + (Number(M.f.addOt) || 0) }); };
    function exportCsv() {
      const all = rows(); const head = ['id', 'empNo', 'name', 'month', 'gross', 'leaveDeduct', 'cpf', 'other', 'net', 'userStatus', 'payStatus'];
      const body = all.map((s) => [s.id, s.empNo, empOf(s).name, s.month, s.gross, s.leaveDeduct, s.cpf, s.other, s.net, s.userStatus, s.payStatus]);
      const csv = '﻿' + [head, ...body].map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `payslips-${V.applied.month || 'all'}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    const num = (v) => { let s = String(v).replace(/[^\d.]/g, ''); const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2); return s.replace(/^0+(?=\d)/, '').slice(0, 7); };

    return {
      tab: 'slips', crumbs() { return [{ text: t('a.nav.pay'), act: 'noop' }, { text: t('p.tab.slips') }]; }, page,
      modal() { const M = V.modal; return !M ? '' : M.k === 'view' ? viewModal() : M.k === 'verify' ? verifyModal() : M.k === 'resolve' ? resolveModal() : M.k === 'pay' ? payModal() : genModal(); },
      afterRender(v) { const M = V.modal; if (M && !M.focused) { M.focused = true; const el = v.querySelector(M.k === 'verify' ? '[data-ps=incentive]' : M.k === 'resolve' ? '#ps-add' : M.k === 'gen' ? '#ps-gm' : '.a-modal .a-x'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = V.modal, view = ctx.view();
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; return; }
        if (!M || !el.dataset.ps) return; const k = el.dataset.ps;
        if (k === 'gmonth') { M.month = el.value; M.focused = false; render(); return; }
        if (M.k === 'verify' || M.k === 'resolve') {
          if (k === 'note') { M.f.note = el.value; if (M.errs && M.errs.note) { M.errs.note = null; view.querySelectorAll('[data-err=note]').forEach((n) => n.remove()); } return; }
          const v = num(el.value); if (v !== el.value) el.value = v; M.f[k] = v; if (M.errs) M.errs.amount = null; M.err = null; recalcPreview(M);
          const net = view.querySelector('[data-role=net]'); if (net) net.textContent = money(M.preview.net); const gr = view.querySelector('.ps-kv.tot dd'); if (gr) gr.textContent = money(M.preview.gross);
          const dl = view.querySelector('[data-role=delta]'); if (dl) dl.textContent = t('ps.r.delta', { v: signed(M.preview.net - pr.slip(M.id).net) });
        }
      },
      onSubmit() { V.applied = { ...V.draft }; V.page = 1; render(); }, onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id, M = V.modal;
        switch (a) {
          case 'noop': break;
          case 'ps-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break;
          case 'ps-page': { const p = +b.dataset.p; if (p >= 1) { V.page = p; render(); } break; }
          case 'ps-view': V.modal = { k: 'view', id }; render(); break;
          case 'ps-pdf': toast(t('p.toast.inert')); break;
          case 'ps-export': exportCsv(); break;
          case 'ps-gen': V.modal = { k: 'gen', month: V.applied.month || today().slice(0, 7) }; render(); break;
          case 'ps-gen-ok': { const r = pr.generate(M.month); V.modal = null; if (r.ok) { V.draft.month = V.applied.month = M.month; V.page = 1; } render(); toast(r.ok ? t('ps.toast.gen', { a: r.made, b: r.refreshed, c: r.kept }) : t('ps.e.month'), r.ok ? 'ok' : 'warn'); break; }
          case 'ps-verify': { const s = pr.slip(id); V.modal = { k: 'verify', id, f: { incentive: String(s.incentive || ''), other: String(s.other || '') }, err: null }; recalcPreview(V.modal); render(); break; }
          case 'ps-verify-ok': { const r = pr.verify(M.id, { incentive: M.f.incentive || 0, other: M.f.other || 0 }); if (!r.ok) { M.err = r.error === 'amount' ? 'amount' : 'state'; render(); break; } V.modal = null; render(); toast(t('ps.toast.verified'), 'ok'); break; }
          case 'ps-verify-all': { const ids = rows().filter((s) => s.payStatus === 'unverified').map((s) => s.id); const r = pr.verifyAll(ids); render(); toast(t('ps.toast.verifiedN', { n: r.n }), 'ok'); break; }
          case 'ps-resolve': { const s = pr.slip(id); V.modal = { k: 'resolve', id, errs: {}, f: { incentive: String(s.incentive || ''), other: String(s.other || ''), addOt: '', note: '' } }; recalcPreview(V.modal); render(); break; }
          case 'ps-resolve-ok': { const r = pr.resolve(M.id, { addOt: M.f.addOt, incentive: M.f.incentive || 0, other: M.f.other || 0, note: M.f.note }); if (!r.ok) { M.errs = {}; if (r.error === 'note' || r.error === 'note_len') M.errs.note = r.error; else M.errs.amount = 'amount'; render(); break; } V.modal = null; render(); toast(t('ps.toast.resolved', { v: signed(r.delta) }), 'ok'); break; }
          case 'ps-pay': V.modal = { k: 'pay', id }; render(); break;
          case 'ps-pay-ok': { const r = pr.pay(M.id); V.modal = null; render(); toast(r.ok ? t('ps.toast.paid') : t('ps.e.state'), r.ok ? 'ok' : 'warn'); break; }
          case 'close-modal': V.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { V.draft = F0(); V.applied = F0(); V.page = 1; V.modal = null; },
    };
  };
})(window.BS);
