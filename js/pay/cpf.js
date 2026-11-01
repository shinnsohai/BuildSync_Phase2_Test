/* Admin: 薪资发放 → 公积金扣除规则 (citizen / PR tables, edit, bulk edit, default PR rule, adjustment log, deduction preview) + module wrapper. */
(function (BS) {
  const { html, icon, fmt } = BS;
  const cpf = BS.cpf, leave = BS.leave;
  const money = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money4 = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const pct = (n) => `${+Number(n).toFixed(2)}%`;
  const rateStr = (v) => { let s = String(v).replace(/[^\d.]/g, ''); const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2); return s.replace(/^0+(?=\d)/, '').slice(0, 5); };

  BS.payParts = BS.payParts || {};
  BS.payParts.cpf = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
    const lang = () => ctx.lang();
    const C = { group: 'citizen', modal: null, bulk: null, calc: { empNo: BS.ME.empNo, month: BS.fmt.now().slice(0, 7), wage: '2800' } };
    const today = () => BS.fmt.now().slice(0, 10);
    const pName = (p) => (lang() === 'zh' ? p.name : p.nameEn || p.name);
    const bandL = (b) => t('c.band.' + b);
    const ruleLabel = (r) => (r.group === 'pr' ? `${t('c.stage.' + r.stage)} · ${bandL(r.band)}` : bandL(r.band));
    const byL = (k) => (k === 'system' ? t('l.by.system') : t('lv.by.admin'));

    // ---------- page ----------
    function page() {
      const g = C.group; const rules = cpf.rules(g); const bulk = C.bulk; const defId = cpf.defaultId();
      const th = g === 'pr' ? ['stage', 'band', 'rate', 'default', 'eff'] : ['band', 'rate', 'eff'];
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('c.title')}</h1><p class="a-sub">${t('c.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn" data-act="cpf-log">${icon('clock', 16)} ${t('c.log')}</button>
            ${bulk ? '' : html`<button type="button" class="a-btn primary" data-act="cpf-bulk">${icon('list', 16)} ${t('c.edit')}</button>`}</div></div>
        <section class="a-card">
          <div class="c-tabs"><div class="l-ftabs" role="tablist">${['citizen', 'pr'].map((k) => html`<button type="button" role="tab" aria-selected="${g === k ? 'true' : 'false'}" class="${g === k ? 'on' : ''}" data-act="cpf-group" data-g="${k}" ${bulk ? 'disabled' : ''}>${t('c.g.' + k)}</button>`)}</div></div>
          <p class="a-banner c-note">${icon('shield', 16)} ${t('c.note.' + g)}</p>
          <div class="a-tablewrap"><table class="a-table c-table">
            <thead><tr>${th.map((c) => html`<th class="${c === 'rate' ? 'c-amount' : ''} ${c === 'default' ? 'c-sel' : ''}">${t('c.col.' + c)}</th>`)}${bulk ? '' : html`<th class="c-act">${t('a.col.act')}</th>`}</tr></thead>
            <tbody>${rules.map((r) => { const cur = cpf.current(r); const pend = cpf.pending(r); return html`<tr>
              ${g === 'pr' ? html`<td><b>${t('c.stage.' + r.stage)}</b></td>` : ''}<td>${bandL(r.band)}</td>
              <td class="c-amount">${bulk ? html`<span class="c-rin"><input data-b="${r.id}" inputmode="decimal" value="${bulk.rates[r.id]}" aria-label="${ruleLabel(r)}" class="${bulk.errs[r.id] ? 'err' : ''}">%</span>` : html`<b>${pct(cur.rate)}</b>`}
                ${pend.length && !bulk ? html`<small class="c-pend">${t('c.pending', { r: pct(pend[0].rate), d: pend[0].effective })}</small>` : ''}</td>
              ${g === 'pr' ? html`<td class="c-sel"><input type="checkbox" data-act="cpf-default" data-id="${r.id}" ${defId === r.id ? 'checked' : ''} ${bulk ? 'disabled' : ''} aria-label="${t('c.col.default')}: ${ruleLabel(r)}"></td>` : ''}
              <td class="mute">${cur.effective}</td>
              ${bulk ? '' : html`<td class="c-act"><button type="button" class="a-link" data-act="cpf-edit" data-id="${r.id}">${t('p.edit')}</button></td>`}</tr>`; })}</tbody>
          </table></div>
          ${bulk ? bulkBar() : ''}
          <footer class="a-pager"><span>${t('c.count', { n: rules.length })}</span><span class="a-fhint">${t('c.foot.' + g)}</span></footer>
        </section>
        ${calcCard()}`;
    }
    function bulkBar() {
      const b = C.bulk; const e = b.errs;
      return html`<div class="c-bulk"><div class="p-two"><div class="a-frow"><label class="a-lab" for="cb-d">${t('c.m.eff')}</label><input id="cb-d" type="date" class="a-field" data-bv="effective" value="${b.effective}">${e._effective ? html`<small class="a-ferr">${t('c.e.' + e._effective)}</small>` : ''}</div>
        <div class="a-frow"><label class="a-lab" for="cb-r"><b class="req">*</b> ${t('c.m.reason')}</label><input id="cb-r" class="a-field" data-bv="reason" maxlength="100" value="${b.reason}">${e._reason ? html`<small class="a-ferr">${t('c.e.' + e._reason)}</small>` : ''}</div></div>
        ${Object.keys(e).some((k) => k[0] !== '_') ? html`<small class="a-ferr">${t('c.e.rowErrors')}</small>` : ''}
        <div class="c-bulk-btns"><small class="a-fhint">${t('c.bulk.hint')}</small><span><button type="button" class="a-btn" data-act="cpf-bulk-cancel">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="cpf-bulk-save">${t('p.m.save')}</button></span></div></div>`;
    }

    // ---------- preview ----------
    function calcCard() {
      const K = C.calc; const people = leave.people().filter((p) => p.status === 'active' && cpf.profile(p.empNo));
      return html`<section class="a-card a-pad c-calc"><h2 class="a-h2">${icon('wallet', 18)} ${t('c.calc.title')} <em class="a-demo">${t('p.demo')}</em></h2><small class="a-fhint">${t('c.calc.sub')}</small>
        <div class="p-three c-calc-f"><div class="a-frow"><label class="a-lab" for="cc-e">${t('p.ot.emp')}</label><select id="cc-e" class="a-field" data-c="empNo">${people.map((p) => { const pr = cpf.profile(p.empNo); return html`<option value="${p.empNo}" ${K.empNo === p.empNo ? 'selected' : ''}>${pName(p)} · ${t('c.id.' + pr.idType)}</option>`; })}</select></div>
          <div class="a-frow"><label class="a-lab" for="cc-m">${t('c.calc.month')}</label><input id="cc-m" type="month" class="a-field" data-c="month" value="${K.month}"></div>
          <div class="a-frow"><label class="a-lab" for="cc-w">${t('c.calc.wage')}</label><div class="a-field l-amt"><span>S$</span><input id="cc-w" data-c="wage" inputmode="decimal" value="${K.wage}"></div></div></div>
        <div data-role="calc">${calcResult()}</div></section>`;
    }
    function calcResult() {
      const K = C.calc; if (!/^\d{4}-\d{2}$/.test(K.month) || !/^\d+(\.\d{1,2})?$/.test(K.wage)) return html`<p class="a-fhint">${t('c.calc.fill')}</p>`;
      const r = cpf.match(K.empNo, K.month + '-01', K.wage); if (!r.ok) return html`<p class="p-warnbox">${icon('warn', 16)} ${t('c.calc.noprofile')}</p>`;
      const p = r.profile;
      if (!r.applies) return html`<div class="p-calc"><div class="p-calc-h"><span class="p-chip">${t('c.id.fin')}</span></div><p class="a-fhint" style="margin:0">${t('c.calc.fin')}</p></div>`;
      return html`<div class="p-calc">
        <div class="p-calc-h"><span class="p-chip ${r.idType === 'pr' ? 'leave' : 'pay'}">${t('c.id.' + r.idType)}</span><b>${t('c.calc.age', { n: r.age })}</b>${r.idType === 'pr' ? html`<small>${t('c.calc.prSince', { d: p.prSince, s: t('c.stage.' + r.stage) })}</small>` : ''}</div>
        <dl><div><dt>${t('c.calc.rule')}${r.how === 'default' ? html`<small>${t('c.calc.viaDefault')}</small>` : ''}</dt><dd>${ruleLabel(r.rule)}</dd></div>
          <div><dt>${t('c.col.rate')}<small>${t('c.calc.effFrom', { d: r.version.effective })}</small></dt><dd>${pct(r.rate)}</dd></div>
          <div><dt>${t('c.calc.gross')}</dt><dd>${money(K.wage)}</dd></div>
          <div><dt>${t('c.calc.ded')}<small>${t('c.calc.round')}</small></dt><dd>− ${money4(r.deduct4)}</dd></div>
          <div class="tot"><dt>${t('c.calc.net')}</dt><dd>${money(r.net)}</dd></div></dl></div>`;
    }

    // ---------- dialogs ----------
    function editModal() {
      const M = C.modal; const r = cpf.rule(M.id); if (!r) return ''; const cur = cpf.current(r); const e = M.errs; const pend = cpf.pending(r);
      const E = (k) => (e[k] ? html`<small class="a-ferr" data-err="${k}">${t('c.e.' + e[k])}</small>` : '');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('c.m.title')}</h2><p>${t('c.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <dl class="a-sum">${r.group === 'pr' ? html`<div><dt>${t('c.col.stage')}</dt><dd>${t('c.stage.' + r.stage)}</dd></div>` : ''}<div><dt>${t('c.col.band')}</dt><dd>${bandL(r.band)}</dd></div><div><dt>${t('c.m.curRate')}</dt><dd>${pct(cur.rate)}</dd></div><div><dt>${t('c.m.status')}</dt><dd><span class="a-tag approved">${t('c.status.on')}</span>${pend.length ? html` <span class="a-tag sub-upcoming">${t('c.pending', { r: pct(pend[0].rate), d: pend[0].effective })}</span>` : ''}</dd></div></dl>
          <div class="a-frow"><label class="a-lab" for="cp-r"><b class="req">*</b> ${t('c.col.rate')}</label><div class="a-field l-amt"><input id="cp-r" data-m="rate" inputmode="decimal" value="${M.f.rate}"><span>%</span></div>${E('rate')}</div>
          ${r.group === 'pr' ? html`<label class="p-check"><input type="checkbox" data-m="isDefault" ${M.f.isDefault ? 'checked' : ''}> ${t('c.m.setDefault')}</label><small class="a-fhint" style="margin-top:-8px">${t('c.m.defaultHint')}</small>` : ''}
          <div class="a-frow"><label class="a-lab" for="cp-d">${t('c.m.eff')}</label><input id="cp-d" type="date" class="a-field" data-m="effective" value="${M.f.effective}" min="${cur.effective > today().slice(0, 8) + '01' ? cur.effective : today().slice(0, 8) + '01'}">${E('effective')}<small class="a-fhint">${t('c.m.effHint')}</small></div>
          <div class="a-frow"><label class="a-lab" for="cp-w"><b class="req">*</b> ${t('c.m.reason')}</label><input id="cp-w" class="a-field" data-m="reason" maxlength="100" value="${M.f.reason}">${E('reason')}<small class="a-fhint">${t('c.m.recordHint')}</small></div>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="cpf-save">${t('c.m.save')}</button></footer></div></div>`;
    }
    function logModal() {
      const log = cpf.log();
      const what = (x) => (x.kind === 'rate' ? t('c.log.rate') : x.kind === 'default_on' ? t('c.log.on') : t('c.log.off'));
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('c.log')}</h2><p>${t('c.log.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr>${['at', 'rule', 'kind', 'change', 'eff', 'by', 'reason'].map((c) => html`<th>${t('c.log.col.' + c)}</th>`)}</tr></thead>
          <tbody>${log.length ? log.map((x) => { const r = cpf.rule(x.ruleId); return html`<tr><td class="mute">${x.at}</td><td>${r ? html`${t('c.g.' + r.group)} · ${ruleLabel(r)}` : '—'}</td><td><span class="l-kind ${x.kind === 'rate' ? '' : 'overtime'}">${what(x)}</span></td>
            <td>${x.kind === 'rate' ? html`${pct(x.before)} → <b>${pct(x.after)}</b>` : '—'}</td><td>${x.effective}</td><td>${byL(x.by)}</td><td class="l-note">${x.reason || '—'}</td></tr>`; }) : html`<tr><td colspan="7" class="a-none">${t('c.log.none')}</td></tr>`}</tbody></table></div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('l.log.close')}</button></footer></div></div>`;
    }

    function openEdit(id) {
      const r = cpf.rule(id); const cur = cpf.current(r);
      C.modal = { k: 'edit', id, errs: {}, f: { rate: String(cur.rate), effective: cur.effective < today().slice(0, 8) + '01' ? today() : cur.effective, reason: t('c.m.reasonDefault'), isDefault: cpf.defaultId() === id } };
      render();
    }
    function save() {
      const M = C.modal; const r = cpf.update(M.id, M.f);
      if (!r.ok) { M.errs = r.errors; render(); return; }
      C.modal = null; render(); toast(t('c.toast.saved'), 'ok');
    }
    function bulkSave() {
      const b = C.bulk; b.errs = {};
      const items = cpf.rules(C.group).map((r) => ({ id: r.id, rate: b.rates[r.id] }));
      if (!b.reason.trim()) b.errs._reason = 'reason'; else if (b.reason.trim().length > 100) b.errs._reason = 'reason_len';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.effective)) b.errs._effective = 'effective';
      if (Object.keys(b.errs).length) { render(); return; }
      const r = cpf.bulkUpdate(items, b.effective, b.reason);
      if (!r.ok) { Object.entries(r.errors).forEach(([id, e]) => { if (e.rate) b.errs[id] = e.rate; if (e.effective) b.errs._effective = e.effective; if (e.reason) b.errs._reason = e.reason; }); render(); return; }
      C.bulk = null; render(); toast(r.n ? t('c.toast.bulk', { n: r.n }) : t('c.toast.nochange'), r.n ? 'ok' : 'warn');
    }

    return {
      tab: 'cpf',
      crumbs() { return [{ text: t('a.nav.pay'), act: 'noop' }, { text: t('p.tab.cpf') }]; },
      page,
      modal() { const M = C.modal; return !M ? '' : M.k === 'edit' ? editModal() : logModal(); },
      afterRender(view) { const M = C.modal; if (!M || M.focused) return; M.focused = true; const el = view.querySelector(M.k === 'edit' ? '#cp-r' : '.a-modal .a-x'); if (el) { el.focus(); if (el.select) el.select(); } },
      onInput(e) {
        const el = e.target, view = ctx.view(), M = C.modal;
        if (el.dataset.c) { // preview inputs
          const k = el.dataset.c; let v = el.value; if (k === 'wage') { v = v.replace(/[^\d.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2); v = v.slice(0, 9); if (v !== el.value) el.value = v; }
          C.calc[k] = v; const box = view.querySelector('[data-role=calc]'); if (box) box.innerHTML = calcResult().s; return;
        }
        if (el.dataset.b && C.bulk) { const v = rateStr(el.value); if (v !== el.value) el.value = v; C.bulk.rates[el.dataset.b] = v; if (C.bulk.errs[el.dataset.b]) { delete C.bulk.errs[el.dataset.b]; el.classList.remove('err'); } return; }
        if (el.dataset.bv && C.bulk) { C.bulk[el.dataset.bv] = el.value; const k = '_' + el.dataset.bv; if (C.bulk.errs[k]) { delete C.bulk.errs[k]; el.closest('.a-frow').querySelector('.a-ferr')?.remove(); } return; }
        if (M && M.k === 'edit' && el.dataset.m) {
          const k = el.dataset.m;
          if (k === 'isDefault') { M.f.isDefault = el.checked; return; }
          let v = el.value; if (k === 'rate') { v = rateStr(v); if (v !== el.value) el.value = v; }
          M.f[k] = v; if (M.errs[k]) { M.errs[k] = null; view.querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
        }
      },
      onEscape() { if (C.modal) { C.modal = null; render(); return true; } if (C.bulk) { C.bulk = null; render(); return true; } return false; },
      onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id;
        switch (a) {
          case 'noop': break;
          case 'cpf-group': C.group = b.dataset.g; render(); break;
          case 'cpf-edit': openEdit(id); break;
          case 'cpf-save': save(); break;
          case 'cpf-log': C.modal = { k: 'log' }; render(); break;
          case 'cpf-default': { const on = b.checked; const r = cpf.setDefault(id, on, t(on ? 'c.reason.defOn' : 'c.reason.defOff')); toast(t(on ? 'c.toast.defOn' : 'c.toast.defOff'), 'ok'); if (!r.ok) render(); break; }
          case 'cpf-bulk': { const rates = {}; cpf.rules(C.group).forEach((r) => { rates[r.id] = String(cpf.current(r).rate); }); const ms = today().slice(0, 8) + '01'; C.bulk = { rates, effective: today() >= ms ? today() : ms, reason: t('c.m.reasonDefault'), errs: {} }; render(); break; }
          case 'cpf-bulk-cancel': C.bulk = null; render(); break;
          case 'cpf-bulk-save': bulkSave(); break;
          case 'close-modal': C.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { C.group = 'citizen'; C.modal = null; C.bulk = null; C.calc = { empNo: BS.ME.empNo, month: BS.fmt.now().slice(0, 7), wage: '2800' }; },
    };
  };

  // ---------- 薪资发放 module wrapper ----------
  BS.registerAdmin({
    id: 'pay', nav: 'a.nav.pay', stores: [BS.pay, BS.leave, BS.cpf, BS.payroll, BS.hr, BS.att],
    tabs: [{ id: 'slips', k: 'p.tab.slips' }, { id: 'tpl', k: 'p.tab.tpl' }, { id: 'cpf', k: 'p.tab.cpf' }],
    create(ctx) {
      const parts = { slips: BS.payParts.slips(ctx), tpl: BS.payParts.tpl(ctx), cpf: BS.payParts.cpf(ctx) };
      let tab = 'slips'; const cur = () => parts[tab];
      return {
        get tab() { return tab; },
        set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v),
        onInput: (e) => cur().onInput && cur().onInput(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: (evt) => ctx.rerender(evt), onClick: (a, b, e) => cur().onClick(a, b, e),
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'slips'; },
      };
    },
  });
})(window.BS);
