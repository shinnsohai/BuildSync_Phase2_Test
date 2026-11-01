/* Admin module: 请假管理 → 请假额度汇总 (quota table, adjust / batch adjust, change log). */
(function (BS) {
  const { html, icon, fmt } = BS;
  const leave = BS.leave;
  const PAGE = 10;
  const DEFAULTS = { kw: '', type: '', status: 'active', year: String(leave.YEAR) };

  const num = (n) => String(+Number(n).toFixed(3));
  BS.fmt.num = num;
  BS.txt = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.zh : v);   // string or {zh,en}

  BS.leaveParts = BS.leaveParts || {};
  BS.leaveParts.quota = function (ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
      const L = { tab: 'quota', draft: { ...DEFAULTS }, applied: { ...DEFAULTS }, page: 1, sel: new Set(), modal: null };
      const lang = () => ctx.lang();
      const nameOf = (p) => (lang() === 'zh' ? p.name : p.nameEn || p.name);
      const typeName = (k) => t('l.type.' + k);
      const unitWord = (k) => t('l.unit.' + leave.UNIT[k]);
      const amt = (v, k) => `${num(v)}${lang() === 'zh' ? '' : ' '}${unitWord(k)}`;
      const signed = (v, k) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}${lang() === 'zh' ? '' : ' '}${unitWord(k)}`;
      const editable = () => +L.applied.year === leave.YEAR;

      function rows() {
        const f = L.applied, kw = f.kw.trim().toLowerCase();
        return leave.people().filter((p) => BS.perm.inScope(p.empNo)).filter((p) => {
          if (f.status && p.status !== f.status) return false;
          if (kw && !(p.name.toLowerCase().includes(kw) || p.nameEn.toLowerCase().includes(kw) || p.empNo.toLowerCase().includes(kw) || p.phone.replace(/\D/g, '').includes(kw.replace(/\D/g, '') || '\u0000'))) return false;
          return !!leave.quota(p.empNo, +f.year);
        });
      }

      // ---------- page ----------
      function cell(p, k) {
        const c = leave.quota(p.empNo, +L.applied.year)[k];
        return html`<td class="c-q"><span class="q-total">${t('l.total')} ${amt(c.total, k)}</span><span class="q-left ${c.left === 0 ? 'zero' : ''}">${t('l.left')} <b>${num(c.left)}</b> ${unitWord(k)}</span></td>`;
      }
      function page() {
        const all = rows(); const pages = Math.max(1, Math.ceil(all.length / PAGE));
        if (L.page > pages) L.page = pages;
        const slice = all.slice((L.page - 1) * PAGE, L.page * PAGE);
        const cols = L.applied.type ? [L.applied.type] : leave.TYPES;
        const d = L.draft; const ed = editable();
        const allSel = slice.length && slice.every((p) => L.sel.has(p.empNo));
        return html`
          <h1 class="a-h1">${t('l.title')}</h1>
          <p class="a-sub">${t('l.sub')}</p>
          <section class="a-card">
            <div class="a-bulk"><span class="a-selcount">${t('l.selected', { n: L.sel.size })}</span>
              <button type="button" class="a-btn primary-o" data-act="batch" ${L.sel.size && ed ? '' : 'disabled'} title="${ed ? '' : t('l.readonly')}">${icon('users', 16)} ${t('l.batch')}</button></div>
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('l.f.kw')}" aria-label="${t('l.f.kw')}"></label>
              <label class="a-in"><span class="a-in-l">${t('l.f.type')}</span><select data-f="type"><option value="">${t('l.f.all')}</option>${leave.TYPES.map((k) => html`<option value="${k}" ${d.type === k ? 'selected' : ''}>${typeName(k)}</option>`)}</select></label>
              <label class="a-in"><span class="a-in-l">${t('l.f.status')}</span><select data-f="status"><option value="active" ${d.status === 'active' ? 'selected' : ''}>${t('l.s.active')}</option><option value="disabled" ${d.status === 'disabled' ? 'selected' : ''}>${t('l.s.disabled')}</option><option value="" ${d.status === '' ? 'selected' : ''}>${t('l.f.all')}</option></select></label>
              <label class="a-in"><span class="a-in-l">${t('l.f.year')}</span><select data-f="year">${leave.YEARS.map((y) => html`<option value="${y}" ${d.year === String(y) ? 'selected' : ''}>${y}</option>`)}</select></label>
              <span class="a-fgrow"></span>
              <button type="button" class="a-btn" data-act="reset">${t('a.f.reset')}</button>
              <button type="submit" class="a-btn primary">${t('a.f.query')}</button>
            </form>
            ${ed ? '' : html`<p class="a-banner">${icon('warn', 16)} ${t('l.readonly')}</p>`}
            <div class="a-tablewrap"><table class="a-table l-table">
              <thead><tr><th class="c-sel"><input type="checkbox" data-act="sel-all" ${allSel ? 'checked' : ''} ${ed && slice.length ? '' : 'disabled'} aria-label="${t('l.selAll')}"></th><th>${t('l.col.person')}</th><th>${t('a.col.emp')}</th><th>${t('l.col.phone')}</th>${cols.map((k) => html`<th>${typeName(k)}</th>`)}<th>${t('l.col.last')}</th><th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((p) => html`
                <tr class="${L.sel.has(p.empNo) ? 'sel' : ''}">
                  <td class="c-sel"><input type="checkbox" data-act="sel" data-id="${p.empNo}" ${L.sel.has(p.empNo) ? 'checked' : ''} ${ed ? '' : 'disabled'} aria-label="${nameOf(p)}"></td>
                  <td><span class="l-person"><i class="l-av">${nameOf(p).slice(0, 1)}</i><b>${nameOf(p)}</b>${p.status === 'disabled' ? html`<em class="l-off">${t('l.s.disabled')}</em>` : ''}</span></td>
                  <td class="mute">${p.empNo}</td><td class="mute">${p.phone}</td>
                  ${cols.map((k) => cell(p, k))}
                  <td class="mute">${leave.lastAdjust(p.empNo) ? fmt.dt(leave.lastAdjust(p.empNo)) : '—'}</td>
                  <td class="c-act"><button type="button" class="a-link" data-act="adjust" data-id="${p.empNo}" ${ed ? '' : 'disabled'}>${t('l.act.adjust')}</button><button type="button" class="a-link" data-act="log" data-id="${p.empNo}">${t('l.act.log')}</button></td>
                </tr>`) : html`<tr><td colspan="${cols.length + 6}" class="a-none">${icon('users', 32)}<p>${t('l.none')}</p></td></tr>`}</tbody>
            </table></div>
            <footer class="a-pager"><span>${t('a.total', { n: all.length })} · ${t('a.perPage', { n: PAGE })}</span>
              <nav aria-label="${t('a.pager')}"><button type="button" data-act="page" data-p="${L.page - 1}" ${L.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
              ${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${L.page === i + 1 ? 'on' : ''}" data-act="page" data-p="${i + 1}" aria-current="${L.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`)}
              <button type="button" data-act="page" data-p="${L.page + 1}" ${L.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
          </section>`;
      }

      // ---------- dialogs ----------
      function errLine(k) { const e = L.modal.errs[k]; return e ? html`<small class="a-ferr" data-err="${k}">${t(e.k, e.p)}</small>` : ''; }

      function adjustModal() {
        const M = L.modal; const people = M.empNos.map((e) => leave.person(e)); const single = people.length === 1;
        const k = M.type; const u = k ? unitWord(k) : '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${single ? t('l.m.title') : t('l.m.batchTitle')}</h2><p>${t('l.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody l-form">
            <div class="a-frow"><label class="a-lab">${t('l.m.emp')}</label>
              ${single ? html`<div class="l-ro">${nameOf(people[0])} / ${people[0].empNo}</div>` : html`<div class="l-chips">${people.map((p) => html`<span>${nameOf(p)}</span>`)}</div><small class="a-fhint">${t('l.m.batchN', { n: people.length })}</small>`}</div>
            <div class="a-frow"><label class="a-lab" for="l-type"><b class="req">*</b> ${t('l.m.type')}</label>
              <select id="l-type" class="a-field" data-m="type"><option value="">${t('l.m.typePh')}</option>${leave.TYPES.map((x) => html`<option value="${x}" ${k === x ? 'selected' : ''}>${typeName(x)}${leave.UNIT[x] === 'hour' ? ' (' + t('l.unit.hour') + ')' : ''}</option>`)}</select>
              ${M.errs.type ? errLine('type') : k ? '' : html`<small class="a-fhint">${t('l.m.typeFirst')}</small>`}</div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('l.m.mode')}</label>
              <div class="l-radio" role="radiogroup">${['add', 'deduct'].map((x) => html`<label class="${M.mode === x ? 'on' : ''}"><input type="radio" name="l-mode" data-m="mode" value="${x}" ${M.mode === x ? 'checked' : ''}>${t('l.m.' + x)}</label>`)}</div></div>
            <div class="a-frow"><label class="a-lab" for="l-amt"><b class="req">*</b> ${k && leave.UNIT[k] === 'hour' ? t('l.m.hours') : t('l.m.days')}</label>
              <div class="a-field l-amt"><input id="l-amt" data-m="amount" inputmode="decimal" autocomplete="off" value="${M.amount}" placeholder="0.5"><span>${u}</span></div>
              ${M.errs.amount ? errLine('amount') : html`<small class="a-fhint">${t('l.m.amtHint', { step: leave.STEP, u: u || t('l.unit.day') })}</small>`}</div>
            ${single ? html`<div class="l-calc"><div><span>${t('l.m.cur')}</span><b>${k ? amt(leave.quota(people[0].empNo)[k].left, k) : '—'}</b></div><i>→</i><div><span>${t('l.m.after')}</span><b data-role="after">${afterText(people)}</b></div></div>`
              : html`<div class="l-calc batch" data-role="short">${shortText(people)}</div>`}
            <div class="a-frow"><label class="a-lab" for="l-why"><b class="req">*</b> ${t('l.m.reason')}</label>
              <textarea id="l-why" class="a-field" data-m="reason" rows="3" maxlength="200" placeholder="${t('l.m.reasonPh')}">${M.reason}</textarea>
              <div class="a-hint">${M.errs.reason ? errLine('reason') : html`<span></span>`}<span data-role="count">${M.reason.length} / 200</span></div></div>
            <p class="l-audit">${icon('shield', 14)} ${t('l.m.audit')}</p>
          </div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="confirm-adjust">${t('l.m.confirm')}</button></footer>
        </div></div>`;
      }
      function deltaOf(M) { const a = Number(M.amount); return a > 0 ? (M.mode === 'deduct' ? -a : a) : 0; }
      function afterText(people) {
        const M = L.modal; if (!M.type) return '—';
        const left = leave.quota(people[0].empNo)[M.type].left; const d = deltaOf(M); const after = Math.round((left + d) * 100) / 100;
        return after < 0 ? `${num(after)} ${unitWord(M.type)} ⚠` : amt(after, M.type);
      }
      function shortText(people) {
        const M = L.modal; if (!M.type) return t('l.m.pickType');
        const d = deltaOf(M); if (!d) return t('l.m.batchIdle', { n: people.length });
        const bad = people.filter((p) => Math.round((leave.quota(p.empNo)[M.type].left + d) * 100) / 100 < 0);
        return bad.length ? t('l.m.batchShort', { names: bad.map(nameOf).join('、') }) : t('l.m.batchOk', { n: people.length, v: signed(d, M.type) });
      }

      function logModal() {
        const M = L.modal; const p = leave.person(M.empNo); const yr = +L.applied.year;
        const all = leave.log(M.empNo, yr); const list = M.f === 'all' ? all : all.filter((x) => x.kind === M.f);
        const by = (x) => (x.by === 'system' ? t('l.by.system') : t('l.by.admin'));
        const kind = (x) => t('l.kind.' + x.kind);
        const val = (x, side) => { const o = side === 'before' ? (x.before == null ? BS.txt(x.beforeText, lang()) : amt(x.before, x.type)) : (x.after == null ? '' : x.afterText ? BS.txt(x.afterText, lang()) : amt(x.after, x.type)); return x.basis === 'left' ? html`${o} <small class="mute">${t('l.log.left')}</small>` : o; };
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          <header><h2 id="a-mt">${t('l.log.title')}</h2><p>${t('l.log.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
          <div class="a-mbody">
            <dl class="a-sum l-sum4"><div><dt>${t('l.m.emp')}</dt><dd>${nameOf(p)}</dd></div><div><dt>${t('a.col.emp')}</dt><dd>${p.empNo}</dd></div><div><dt>${t('l.col.phone')}</dt><dd>${p.phone}</dd></div><div><dt>${t('l.f.year')}</dt><dd>${yr}</dd></div></dl>
            <div class="l-ftabs" role="tablist">${['all', 'manual', 'carry', 'overtime', 'leave'].map((f) => html`<button type="button" role="tab" aria-selected="${M.f === f ? 'true' : 'false'}" class="${M.f === f ? 'on' : ''}" data-act="log-f" data-f="${f}">${f === 'all' ? t('l.f.all') : t('l.kind.' + f)}</button>`)}</div>
            <div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr>${['at', 'type', 'kind', 'before', 'delta', 'after', 'by', 'note'].map((c) => html`<th>${t('l.log.' + c)}</th>`)}</tr></thead>
              <tbody>${list.length ? list.map((x) => html`<tr><td class="mute">${fmt.dt(x.at)}</td><td>${typeName(x.type)}</td><td><span class="l-kind ${x.kind}">${kind(x)}</span></td><td>${val(x, 'before')}</td><td class="l-delta ${x.delta < 0 ? 'neg' : 'pos'}">${signed(x.delta, x.type)}</td><td>${val(x, 'after')}</td><td>${by(x)}</td><td class="l-note">${BS.txt(x.note, lang())}</td></tr>`)
                : html`<tr><td colspan="8" class="a-none">${t('l.log.none')}</td></tr>`}</tbody></table></div>
            <p class="a-fhint l-logfoot">${t('l.log.hint')}</p>
          </div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('l.log.close')}</button></footer>
        </div></div>`;
      }

      // ---------- actions ----------
      function openAdjust(empNos) {
        L.modal = { k: 'adjust', empNos, type: '', mode: 'add', amount: '', reason: '', errs: {}, refocus: null };
        render();
      }
      function confirmAdjust() {
        const M = L.modal; M.errs = {};
        if (!M.type) M.errs.type = { k: 'l.e.type' };
        const a = Number(M.amount);
        if (!M.amount || !(a > 0)) M.errs.amount = { k: 'l.e.amount' };
        else if (a > leave.MAX_AMOUNT) M.errs.amount = { k: 'l.e.max', p: { n: leave.MAX_AMOUNT } };
        else if (Math.round(a * 100) % Math.round(leave.STEP * 100)) M.errs.amount = { k: 'l.e.step', p: { step: leave.STEP } };
        if (!M.reason.trim()) M.errs.reason = { k: 'l.e.reason' };
        if (Object.keys(M.errs).length) { render(); return; }
        const r = leave.adjust({ empNos: M.empNos, type: M.type, mode: M.mode, amount: a, reason: M.reason });
        if (!r.ok) {
          if (r.error === 'insufficient') M.errs.amount = { k: 'l.e.short', p: { names: r.empNos.map((e) => nameOf(leave.person(e))).join('、') } };
          else M.errs.amount = { k: 'l.e.generic' };
          render(); return;
        }
        const who = M.empNos.length === 1 ? nameOf(leave.person(M.empNos[0])) : t('l.m.batchN', { n: M.empNos.length });
        const msg = t('l.toast.adjusted', { who, type: typeName(M.type), v: signed(M.mode === 'deduct' ? -a : a, M.type) });
        L.modal = null; M.empNos.forEach((e) => L.sel.delete(e));
        render(); toast(msg, 'ok');
        if (!r.persisted) toast(t('l.toast.notSaved'), 'warn');
      }

      return {
        tab: 'quota',
        crumbs() { return [{ text: t('a.nav.leave'), act: 'noop' }, { text: t('l.tab.quota') }]; },
        page,
        modal() { return !L.modal ? '' : L.modal.k === 'log' ? logModal() : adjustModal(); },
        afterRender(view) {
          const M = L.modal; if (!M || M.k !== 'adjust') return;
          if (M.refocus) { const el = view.querySelector(`[data-m=${M.refocus}]`); if (el) el.focus(); M.refocus = null; }
          else if (!M.focused) { const el = view.querySelector('#l-type'); if (el) el.focus(); M.focused = true; }
        },
        onInput(e) {
          const el = e.target, view = ctx.view();
          if (el.dataset.f) { L.draft[el.dataset.f] = el.value; return; }
          const M = L.modal; const m = el.dataset.m; if (!M || !m) return;
          if (m === 'type' || m === 'mode') { M[m] = el.value; M.errs = {}; M.refocus = m; if (m === 'type') M.amount = M.amount; render(); return; }
          if (m === 'amount') {
            let v = el.value.replace(/[^\d.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
            v = v.replace(/^0+(?=\d)/, '').slice(0, 7); if (v !== el.value) el.value = v;
            M.amount = v; if (M.errs.amount) { M.errs.amount = null; const s = view.querySelector('[data-err=amount]'); if (s) s.remove(); }
            const people = M.empNos.map((x) => leave.person(x));
            const a = view.querySelector('[data-role=after]'); if (a) { a.textContent = afterText(people); a.classList.toggle('bad', a.textContent.includes('⚠')); }
            const s = view.querySelector('[data-role=short]'); if (s) s.textContent = shortText(people);
          } else if (m === 'reason') {
            M.reason = el.value; if (M.errs.reason) { M.errs.reason = null; const s = view.querySelector('[data-err=reason]'); if (s) s.remove(); }
            const c = view.querySelector('[data-role=count]'); if (c) c.textContent = `${el.value.length} / 200`;
          }
        },
        onSubmit() { L.applied = { ...L.draft }; L.page = 1; L.sel.clear(); render(); },
        onEscape() { if (L.modal) { L.modal = null; render(); return true; } return false; },
        onStore() { if (L.modal && L.modal.k === 'adjust') { /* keep dialog, live numbers refresh on next input */ } render(); },
        onClick(a, b) {
          const id = b.dataset.id;
          switch (a) {
            case 'noop': break;
            case 'reset': L.draft = { ...DEFAULTS }; L.applied = { ...DEFAULTS }; L.page = 1; L.sel.clear(); render(); break;
            case 'page': { const p = +b.dataset.p; if (p >= 1) { L.page = p; render(); } break; }
            case 'sel': if (L.sel.has(id)) L.sel.delete(id); else L.sel.add(id); render(); break;
            case 'sel-all': { const slice = rows().slice((L.page - 1) * PAGE, L.page * PAGE); const every = slice.every((p) => L.sel.has(p.empNo)); slice.forEach((p) => (every ? L.sel.delete(p.empNo) : L.sel.add(p.empNo))); render(); break; }
            case 'adjust': openAdjust([id]); break;
            case 'batch': if (L.sel.size) openAdjust([...L.sel]); break;
            case 'log': L.modal = { k: 'log', empNo: id, f: 'all' }; render(); break;
            case 'log-f': L.modal.f = b.dataset.f; render(); break;
            case 'close-modal': L.modal = null; render(); break;
            case 'confirm-adjust': confirmAdjust(); break;
            default: return false;
          }
          return true;
        },
        reset() { L.draft = { ...DEFAULTS }; L.applied = { ...DEFAULTS }; L.page = 1; L.sel.clear(); L.modal = null; },
      };
  };
})(window.BS);
