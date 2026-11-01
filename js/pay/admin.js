/* Admin module: 薪资发放 → 薪资模板 (list, create/edit with overtime exchange mode, delete, overtime registration demo). */
(function (BS) {
  const { html, icon, fmt } = BS;
  const pay = BS.pay, leave = BS.leave;
  const PAGE = 10;
  const FILTERS = { kw: '', type: '', status: '' };
  const money = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money4 = (n) => 'S$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const numStr = (n) => (n == null ? '' : String(n));

  BS.payParts = BS.payParts || {};
  BS.payParts.tpl = function (ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
      const P = { tab: 'tpl', draft: { ...FILTERS }, applied: { ...FILTERS }, page: 1, modal: null };
      const lang = () => ctx.lang();
      const tplName = (x) => (lang() === 'zh' ? x.nameZh : x.nameEn || x.nameZh);
      const pName = (p) => (lang() === 'zh' ? p.name : p.nameEn || p.name);
      const dayLabel = (k) => t('p.day.' + k);

      // ---------- list ----------
      function baseText(x) { return x.type === 'daily' ? t('p.base.daily', { h: x.stdHours }) : t('p.base.monthly', { v: money(x.baseSalaryCents / 100).replace('.00', '') }); }
      function ruleText(x) {
        if (x.type === 'daily' && x.otMode === 'leave') return html`<span class="p-chip leave">${icon('clock', 13)} ${t('p.rule.leave')}</span>`;
        if (x.type === 'monthly') return x.extraOtCents ? t('p.rule.fixed', { v: money(x.extraOtCents / 100).replace('.00', '') }) : t('p.rule.gate');
        const r = x.rules; return t('p.rule.pay', { a: r.weekday.mult, b: r.sat.mult, c: r.sun.mult });
      }
      function rows() {
        const f = P.applied, kw = f.kw.trim().toLowerCase();
        return pay.templates().filter((x) => (!kw || x.nameZh.toLowerCase().includes(kw) || (x.nameEn || '').toLowerCase().includes(kw)) && (!f.type || x.type === f.type) && (!f.status || (f.status === 'on') === x.active));
      }
      function page() {
        const all = rows(); const pages = Math.max(1, Math.ceil(all.length / PAGE)); if (P.page > pages) P.page = pages;
        const slice = all.slice((P.page - 1) * PAGE, P.page * PAGE); const d = P.draft;
        const log = pay.entries().slice(0, 6);
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('p.title')}</h1><p class="a-sub">${t('p.sub')}</p></div>
            <div class="a-tbtns"><button type="button" class="a-btn primary-o" data-act="ot-open">${icon('clock', 16)} ${t('p.ot.open')}</button><button type="button" class="a-btn" data-act="inert-btn">${icon('upload', 16)} ${t('p.export')}</button><button type="button" class="a-btn primary" data-act="tpl-new">${icon('plus', 16)} ${t('p.new')}</button></div></div>
          <section class="a-card">
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('p.f.name')}" aria-label="${t('p.f.name')}"></label>
              <label class="a-in"><select data-f="type" aria-label="${t('p.col.type')}"><option value="">${t('p.col.type')}</option><option value="daily" ${d.type === 'daily' ? 'selected' : ''}>${t('p.type.daily')}</option><option value="monthly" ${d.type === 'monthly' ? 'selected' : ''}>${t('p.type.monthly')}</option></select></label>
              <label class="a-in"><select data-f="status" aria-label="${t('p.col.status')}"><option value="">${t('p.col.status')}</option><option value="on" ${d.status === 'on' ? 'selected' : ''}>${t('p.on')}</option><option value="off" ${d.status === 'off' ? 'selected' : ''}>${t('p.off')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
            </form>
            <div class="a-tablewrap"><table class="a-table">
              <thead><tr>${['name', 'linked', 'type', 'base', 'rule', 'status'].map((c) => html`<th>${t('p.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((x) => html`<tr>
                <td><b>${tplName(x)}</b></td><td>${t('p.people', { n: x.linked })}</td><td>${t('p.type.' + x.type)}</td><td>${baseText(x)}</td><td>${ruleText(x)}</td>
                <td><span class="a-tag ${x.active ? 'approved' : 'withdrawn'}">${x.active ? t('p.on') : t('p.off')}</span></td>
                <td class="c-act"><button type="button" class="a-link" data-act="inert-btn">${t('p.import')}</button><button type="button" class="a-link" data-act="tpl-edit" data-id="${x.id}">${t('p.edit')}</button><button type="button" class="a-link bad" data-act="tpl-del" data-id="${x.id}">${t('p.del')}</button></td></tr>`)
                : html`<tr><td colspan="7" class="a-none">${icon('wallet', 32)}<p>${t('p.none')}</p></td></tr>`}</tbody>
            </table></div>
            <footer class="a-pager"><span>${t('p.count', { n: all.length, p: P.page, pages })}</span><span></span></footer>
          </section>
          <section class="a-card a-pad p-ledger"><h2 class="a-h2">${icon('clock', 18)} ${t('p.ledger')} <em class="a-demo">${t('p.demo')}</em></h2>
            ${log.length ? html`<div class="a-tablewrap"><table class="a-table"><thead><tr>${['at', 'emp', 'date', 'day', 'worked', 'result'].map((c) => html`<th>${t('p.lg.' + c)}</th>`)}</tr></thead><tbody>${log.map((e) => { const pp = leave.person(e.empNo); return html`<tr><td class="mute">${fmt.dt(e.at)}</td><td><b>${pp ? pName(pp) : e.empNo}</b></td><td>${e.date}</td><td>${dayLabel(e.dayType)}</td><td>${fmt.num(e.worked)} h</td>
              <td>${e.mode === 'leave' ? html`<span class="p-chip leave">${t('p.lg.toil', { h: fmt.num(e.creditHours) })}</span>` : html`<span class="p-chip pay">${t('p.lg.pay', { v: money(e.otPay2) })}</span>`}</td></tr>`; })}</tbody></table></div>` : html`<p class="a-fhint">${t('p.ledger.none')}</p>`}
          </section>`;
      }

      // ---------- template editor ----------
      function draftFrom(x) {
        const rules = {};
        pay.DAYS.forEach((k) => { const r = x ? x.rules[k] : null; rules[k] = r ? { base: numStr(r.base), ot: numStr(r.ot), mult: numStr(r.mult) } : (k === 'special' ? { base: '', ot: '', mult: '' } : { base: '', ot: '', mult: '' }); });
        const blank = pay.blankRules();
        if (!x) pay.DAYS.forEach((k) => { rules[k] = { base: numStr(blank[k].base), ot: numStr(blank[k].ot), mult: numStr(blank[k].mult) }; });
        return {
          id: x ? x.id : null, nameZh: x ? x.nameZh : '', nameEn: x ? x.nameEn : '', type: x ? x.type : 'daily', stdHours: x ? numStr(x.stdHours || 8) : '8',
          otMode: x && x.otMode ? x.otMode : 'pay', baseSalary: x && x.baseSalaryCents ? String(x.baseSalaryCents / 100) : '1700', threshold: x && x.threshold ? String(x.threshold) : '260',
          extraOt: x && x.extraOtCents ? String(x.extraOtCents / 100) : '', rules, linked: x ? x.linked : 0, orig: x ? x.otMode || 'pay' : 'pay',
        };
      }
      const getP = (o, path) => path.split('.').reduce((a, k) => (a ? a[k] : undefined), o);
      const setP = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
      const isNum = (s) => s !== '' && /^\d+(\.\d{1,4})?$/.test(s);

      function validate(D) {
        const e = {};
        if (!D.nameZh.trim()) e.nameZh = 'p.e.name';
        if (!D.nameEn.trim()) e.nameEn = 'p.e.nameEn';
        const leaveMode = D.type === 'daily' && D.otMode === 'leave';
        if (D.type === 'daily') { if (!isNum(D.stdHours) || +D.stdHours <= 0 || +D.stdHours > 24) e.stdHours = 'p.e.std'; }
        else {
          if (!isNum(D.baseSalary) || +D.baseSalary <= 0 || +D.baseSalary > 100000) e.baseSalary = 'p.e.salary';
          if (!/^\d+$/.test(D.threshold) || +D.threshold < 1 || +D.threshold > 744) e.threshold = 'p.e.threshold';
          if (D.extraOt !== '' && (!isNum(D.extraOt) || +D.extraOt > 999)) e.extraOt = 'p.e.extra';
        }
        pay.DAYS.forEach((k) => {
          const r = D.rules[k]; const blank = !r.base && !r.ot && !r.mult;
          if (k === 'special' && blank) return;
          if (k === 'special' && leaveMode && !r.base && !r.ot) return;
          if (!isNum(r.base) || +r.base > 24 || !isNum(r.ot) || +r.ot > 24) { e['rules.' + k] = 'p.e.hours'; return; }
          if (+r.base + +r.ot > 24) { e['rules.' + k] = 'p.e.sum'; return; }
          if (!leaveMode && (!isNum(r.mult) || +r.mult < 1 || +r.mult > 5)) e['rules.' + k] = 'p.e.mult';
        });
        return e;
      }
      function toTemplate(D) {
        const rules = {};
        pay.DAYS.forEach((k) => {
          const r = D.rules[k];
          if (k === 'special' && !r.base && !r.ot && !r.mult) { rules[k] = null; return; }
          rules[k] = { base: +r.base, ot: +r.ot, mult: r.mult === '' ? 1 : +r.mult };
        });
        const tpl = { id: D.id, nameZh: D.nameZh.trim(), nameEn: D.nameEn.trim(), type: D.type, rules };
        if (D.type === 'daily') { tpl.stdHours = +D.stdHours; tpl.otMode = D.otMode; }
        else { tpl.baseSalaryCents = Math.round(+D.baseSalary * 100); tpl.threshold = +D.threshold; tpl.extraOtCents = D.extraOt === '' ? null : Math.round(+D.extraOt * 100); }
        return tpl;
      }

      function ferr(D, k) { return D.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t(D.errs[k])}</small>` : ''; }
      function tplModal() {
        const M = P.modal; const D = M.d; const daily = D.type === 'daily'; const leaveMode = daily && D.otMode === 'leave';
        const cols = leaveMode ? ['base', 'ot'] : ['base', 'ot', 'mult'];
        const edit = !!D.id;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${edit ? t('p.m.edit') : t('p.m.new')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody l-form p-form">
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="p-nz"><b class="req">*</b> ${t('p.m.nameZh')}</label><input id="p-nz" class="a-field" data-p="nameZh" value="${D.nameZh}" maxlength="40" placeholder="${t('p.m.nameZhPh')}">${ferr(D, 'nameZh')}</div>
              <div class="a-frow"><label class="a-lab" for="p-ne"><b class="req">*</b> ${t('p.m.nameEn')}</label><input id="p-ne" class="a-field" data-p="nameEn" value="${D.nameEn}" maxlength="60" placeholder="Enter salary template name">${ferr(D, 'nameEn')}</div></div>
            <div class="a-frow"><label class="a-lab">${t('p.m.type')}</label>
              <div class="l-radio" role="radiogroup">${['daily', 'monthly'].map((x) => html`<label class="${D.type === x ? 'on' : ''} ${edit ? 'locked' : ''}"><input type="radio" name="p-type" data-p="type" value="${x}" ${D.type === x ? 'checked' : ''} ${edit ? 'disabled' : ''}>${t('p.type.' + x)}</label>`)}</div></div>
            ${daily ? html`
              <div class="p-two"><div class="a-frow"><label class="a-lab">${t('p.m.salary')}</label><div class="a-field ro">${t('p.m.byBinding')}</div></div>
                <div class="a-frow"><label class="a-lab" for="p-std">${t('p.m.std')}</label><div class="a-field l-amt"><input id="p-std" data-p="stdHours" inputmode="decimal" value="${D.stdHours}"><span>${t('p.m.hours')}</span></div>${ferr(D, 'stdHours')}</div></div>
              <small class="a-fhint">${t('p.m.formula')}</small>
              <div class="a-frow p-mode"><label class="a-lab">${t('p.m.exchange')}</label>
                <div class="l-radio" role="radiogroup">${['pay', 'leave'].map((x) => html`<label class="${D.otMode === x ? 'on' : ''}"><input type="radio" name="p-mode" data-p="otMode" value="${x}" ${D.otMode === x ? 'checked' : ''}>${t('p.mode.' + x)}</label>`)}</div>
                <small class="a-fhint">${t('p.mode.hint.' + D.otMode)}</small></div>`
              : html`
              <div class="p-three"><div class="a-frow"><label class="a-lab" for="p-bs"><b class="req">*</b> ${t('p.m.basic')}</label><div class="a-field l-amt"><span>S$</span><input id="p-bs" data-p="baseSalary" inputmode="decimal" value="${D.baseSalary}"><span>${t('p.m.perMonth')}</span></div>${ferr(D, 'baseSalary')}</div>
                <div class="a-frow"><label class="a-lab" for="p-th"><b class="req">*</b> ${t('p.m.threshold')}</label><div class="a-field l-amt"><input id="p-th" data-p="threshold" inputmode="numeric" value="${D.threshold}"><span>${t('p.m.hours')}</span></div>${ferr(D, 'threshold')}</div>
                <div class="a-frow"><label class="a-lab" for="p-ex">${t('p.m.extra')}</label><div class="a-field l-amt"><span>S$</span><input id="p-ex" data-p="extraOt" inputmode="decimal" value="${D.extraOt}" placeholder="—"><span>${t('p.m.perHour')}</span></div>${ferr(D, 'extraOt')}</div></div>
              <small class="a-fhint">${t('p.m.monthlyHint')}</small>
              <p class="p-locknote">${icon('shield', 14)} ${t('p.m.monthlyNoLeave')}</p>`}
            <h3 class="p-h3">${t('p.m.rules')}</h3><small class="a-fhint">${t(leaveMode ? 'p.m.rulesHintLeave' : 'p.m.rulesHint')}</small>
            <table class="p-rules"><thead><tr><th>${t('p.m.dayCat')}</th>${cols.map((c) => html`<th>${t('p.m.col.' + c)}</th>`)}</tr></thead>
              <tbody>${pay.DAYS.map((k) => html`<tr class="${D.errs['rules.' + k] ? 'err' : ''}"><th scope="row">${dayLabel(k)}${k === 'special' ? html`<em>${t('p.m.optional')}</em>` : ''}</th>
                ${cols.map((c) => html`<td><div class="p-cell"><input data-p="rules.${k}.${c}" inputmode="decimal" value="${getP(D, 'rules.' + k + '.' + c)}" aria-label="${dayLabel(k)} ${t('p.m.col.' + c)}"><span>${c === 'mult' ? t('p.m.times') : t('p.m.hours')}</span></div></td>`)}</tr>
                ${D.errs['rules.' + k] ? html`<tr class="p-errrow"><td colspan="${cols.length + 1}">${ferr(D, 'rules.' + k)}</td></tr>` : ''}`)}</tbody></table>
            <small class="a-fhint">${t('p.m.specialHint')}</small>
            <p class="l-audit">${icon('shield', 14)} ${t(leaveMode ? 'p.m.noteLeave' : 'p.m.notePay')}</p>
          </div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="tpl-save">${edit ? t('p.m.save') : t('p.m.create')}</button></footer>
        </div></div>${M.confirm ? modeConfirm(D) : ''}`;
      }
      function modeConfirm(D) {
        return html`<div class="a-scrim top" data-act="confirm-no"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop>
          <header><h2>${t('p.c.title')}</h2><p>${t('p.c.msg', { n: D.linked, from: t('p.mode.' + D.orig), to: t('p.mode.' + D.otMode) })}</p></header>
          <div class="a-mbody"><p class="p-warnbox">${icon('warn', 16)} ${t(D.otMode === 'leave' ? 'p.c.toLeave' : 'p.c.toPay')}</p></div>
          <footer><button type="button" class="a-btn" data-act="confirm-no">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="confirm-yes">${t('p.c.ok')}</button></footer></div></div>`;
      }
      function delModal() {
        const x = pay.template(P.modal.id); if (!x) return '';
        const bound = Math.max(x.linked, leave.people().filter((p) => p.templateId === x.id).length);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop>
          <header><h2>${t('p.d.title')}</h2><p>${bound ? t('p.d.blocked', { name: tplName(x), n: bound }) : t('p.d.msg', { name: tplName(x) })}</p></header>
          <footer><button type="button" class="a-btn" data-act="close-modal">${bound ? t('common.close') : t('common.cancel')}</button>${bound ? '' : html`<button type="button" class="a-btn bad" data-act="del-yes">${t('p.d.ok')}</button>`}</footer></div></div>`;
      }

      // ---------- overtime registration (demo) ----------
      function otPreview() {
        const M = P.modal; const w = Number(M.worked);
        if (!M.date || !(w > 0) || w > 24) return html`<p class="a-fhint">${t('p.ot.fill')}</p>`;
        const c = pay.calc(M.empNo, M.date, w, M.special);
        if (!c.ok) return html`<p class="p-warnbox">${icon('warn', 16)} ${c.error === 'monthly' ? t('p.ot.monthly', { name: tplName(c.tpl), h: c.tpl.threshold }) : t('p.ot.missing')}</p>`;
        const r = c.rule; const leaveMode = c.mode === 'leave';
        const q = leave.quota(c.person.empNo).toil;
        return html`
          <div class="p-calc">
            <div class="p-calc-h"><span class="p-chip ${c.mode}">${t('p.mode.' + c.mode)}</span><b>${tplName(c.tpl)}</b><small>${dayLabel(c.dayType)} · ${t('p.ot.rule', { b: r.base, o: r.ot })}${leaveMode ? '' : ' · ×' + r.mult}</small></div>
            ${c.specialIgnored ? html`<p class="a-fhint">${t('p.ot.noSpecial')}</p>` : ''}
            <dl>
              <div><dt>${t('p.ot.base', { h: fmt.num(c.baseHrs) })}</dt><dd>${money4(c.basePay)}</dd></div>
              ${leaveMode ? html`<div><dt>${t('p.ot.otLeave', { h: fmt.num(c.otHrs) })}</dt><dd class="leave">+${fmt.num(c.creditHours)} ${t('l.unit.hour')} ${t('l.type.toil')}</dd></div>`
                : html`<div><dt>${t('p.ot.otPay', { h: fmt.num(c.otHrs), m: r.mult })}</dt><dd>${money4(c.otPay)}</dd></div>`}
              ${c.excess > 0 ? html`<div class="warn"><dt>${t('p.ot.excess', { h: fmt.num(c.excess) })}</dt><dd>—</dd></div>` : ''}
              <div class="tot"><dt>${t('p.ot.total')}<small>${t('p.ot.round')}</small></dt><dd>${money(c.total2)}</dd></div>
              ${leaveMode ? html`<div class="tot2"><dt>${t('p.ot.toilBal')}</dt><dd>${fmt.num(q.left)} → <b>${fmt.num(q.left + c.creditHours)}</b> ${t('l.unit.hour')}</dd></div>` : ''}
            </dl></div>`;
      }
      function otModal() {
        const M = P.modal; const people = leave.people().filter((p) => p.status === 'active');
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('p.ot.title')} <em class="a-demo">${t('p.demo')}</em></h2><p>${t('p.ot.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody l-form">
            <div class="a-frow"><label class="a-lab" for="p-emp">${t('p.ot.emp')}</label><select id="p-emp" class="a-field" data-o="empNo">${people.map((p) => html`<option value="${p.empNo}" ${M.empNo === p.empNo ? 'selected' : ''}>${pName(p)} · ${p.empNo} · ${tplName(pay.template(p.templateId))}</option>`)}</select></div>
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="p-date">${t('p.ot.date')}</label><input id="p-date" type="date" class="a-field" data-o="date" value="${M.date}"></div>
              <div class="a-frow"><label class="a-lab" for="p-wk">${t('p.ot.worked')}</label><div class="a-field l-amt"><input id="p-wk" data-o="worked" inputmode="decimal" value="${M.worked}"><span>${t('p.m.hours')}</span></div></div></div>
            <label class="p-check"><input type="checkbox" data-o="special" ${M.special ? 'checked' : ''}> ${t('p.ot.special')}</label>
            <div data-role="preview">${otPreview()}</div>
            ${M.err ? html`<small class="a-ferr">${t(M.err)}</small>` : ''}
          </div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ot-confirm">${t('p.ot.confirm')}</button></footer>
        </div></div>`;
      }

      // ---------- actions ----------
      function saveTpl() {
        const M = P.modal; const D = M.d; D.errs = validate(D);
        if (Object.keys(D.errs).length) { render(); return; }
        if (D.id && D.type === 'daily' && D.otMode !== D.orig && D.linked > 0 && !M.confirm) { M.confirm = true; render(); return; }
        const r = pay.save(toTemplate(D));
        P.modal = null; render();
        toast(t(D.id ? 'p.toast.saved' : 'p.toast.created', { name: D.nameZh.trim() }), 'ok');
        if (r.ok && !r.persisted) toast(t('l.toast.notSaved'), 'warn');
      }
      function confirmOt() {
        const M = P.modal; M.err = null; const w = Number(M.worked);
        if (!M.date || !(w > 0) || w > 24) { M.err = 'p.ot.e.input'; render(); return; }
        const r = pay.registerOvertime(M.empNo, M.date, w, M.special);
        if (!r.ok) { M.err = r.error === 'monthly' ? 'p.ot.e.monthly' : r.error === 'no_ot' ? 'p.ot.e.none' : 'p.ot.e.fail'; render(); return; }
        const c = r.calc; const name = pName(c.person); P.modal = null; render();
        toast(c.mode === 'leave' ? t('p.toast.toil', { name, h: fmt.num(c.creditHours) }) : t('p.toast.pay', { name, v: money(c.total2) }), 'ok');
      }

      return {
        tab: 'tpl',
        crumbs() { return [{ text: t('a.nav.pay'), act: 'noop' }, { text: t('p.tab.tpl') }]; },
        page,
        modal() { const M = P.modal; return !M ? '' : M.k === 'tpl' ? tplModal() : M.k === 'del' ? delModal() : otModal(); },
        afterRender(view) {
          const M = P.modal; if (!M || M.focused) return; M.focused = true;
          const el = view.querySelector(M.k === 'tpl' ? '#p-nz' : M.k === 'ot' ? '#p-wk' : '.a-modal button'); if (el) el.focus();
        },
        onInput(e) {
          const el = e.target, view = ctx.view(); const M = P.modal;
          if (el.dataset.f) { P.draft[el.dataset.f] = el.value; return; }
          if (M && M.k === 'tpl' && el.dataset.p) {
            const path = el.dataset.p; const D = M.d;
            if (path === 'type' || path === 'otMode') { D[path] = el.value; D.errs = {}; render(); return; }
            let v = el.value;
            if (path !== 'nameZh' && path !== 'nameEn') { v = v.replace(/[^\d.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, ''); v = v.slice(0, 9); if (v !== el.value) el.value = v; }
            setP(D, path, v);
            if (D.errs[path] || D.errs[path.split('.').slice(0, 2).join('.')]) { delete D.errs[path]; delete D.errs[path.split('.').slice(0, 2).join('.')]; view.querySelectorAll(`[data-err="${path}"], [data-err="${path.split('.').slice(0, 2).join('.')}"]`).forEach((n) => n.closest('.p-errrow') ? n.closest('.p-errrow').remove() : n.remove()); view.querySelectorAll('.p-rules tr.err').forEach((r) => { if (!r.nextElementSibling || !r.nextElementSibling.classList.contains('p-errrow')) r.classList.remove('err'); }); }
          } else if (M && M.k === 'ot' && el.dataset.o) {
            const k = el.dataset.o;
            if (k === 'special') M.special = el.checked;
            else if (k === 'worked') { let v = el.value.replace(/[^\d.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2); v = v.slice(0, 5); if (v !== el.value) el.value = v; M.worked = v; }
            else M[k] = el.value;
            const box = view.querySelector('[data-role=preview]'); if (box) box.innerHTML = otPreview().s;
          }
        },
        onSubmit() { P.applied = { ...P.draft }; P.page = 1; render(); },
        onEscape() { if (P.modal) { if (P.modal.confirm) P.modal.confirm = false; else P.modal = null; render(); return true; } return false; },
        onStore(evt) { if (P.modal && P.modal.k === 'ot') { render(); return; } render(); },
        onClick(a, b) {
          const id = b.dataset.id;
          switch (a) {
            case 'noop': break;
            case 'inert-btn': toast(t('p.toast.inert')); break;
            case 'reset': P.draft = { ...FILTERS }; P.applied = { ...FILTERS }; P.page = 1; render(); break;
            case 'tpl-new': P.modal = { k: 'tpl', d: { ...draftFrom(null), errs: {} } }; render(); break;
            case 'tpl-edit': P.modal = { k: 'tpl', d: { ...draftFrom(pay.template(id)), errs: {} } }; render(); break;
            case 'tpl-save': saveTpl(); break;
            case 'tpl-del': P.modal = { k: 'del', id }; render(); break;
            case 'del-yes': { const r = pay.remove(P.modal.id); P.modal = null; render(); toast(r.ok ? t('p.toast.deleted') : t('p.d.blocked', { name: '', n: r.n }), r.ok ? 'ok' : 'warn'); break; }
            case 'confirm-yes': saveTpl(); break;
            case 'confirm-no': if (P.modal) P.modal.confirm = false; render(); break;
            case 'ot-open': { const first = leave.people().find((p) => p.status === 'active' && BS.pay.modeFor(p.empNo) && pay.template(p.templateId)); P.modal = { k: 'ot', empNo: leave.person(BS.ME.empNo) ? BS.ME.empNo : first.empNo, date: BS.fmt.now().slice(0, 10), worked: '10', special: false, err: null }; render(); break; }
            case 'ot-confirm': confirmOt(); break;
            case 'close-modal': P.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { P.draft = { ...FILTERS }; P.applied = { ...FILTERS }; P.page = 1; P.modal = null; },
      };
  };
})(window.BS);
