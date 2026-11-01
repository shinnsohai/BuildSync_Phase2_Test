/* Admin: 请假管理 → 请假审批 (month calendar, day list, approve / reject, add leave on behalf of an employee). */
(function (BS) {
  const { html, icon, fmt } = BS;
  const leave = BS.leave, req = BS.leaveReq;
  const FILTERS = { name: '', project: '', type: '', status: '', applied: '' };
  const MAX_CHIPS = 4;
  const pad = fmt.pad;
  const ADMIN = { role: 'admin', name: 'admin' };

  BS.leaveParts = BS.leaveParts || {};
  BS.leaveParts.approve = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
    const lang = () => ctx.lang();
    const today = () => fmt.now().slice(0, 10);
    const V = { y: +today().slice(0, 4), m: +today().slice(5, 7), draft: { ...FILTERS }, applied: { ...FILTERS }, modal: null, picker: null };

    const nameOf = (a) => (lang() === 'zh' ? a.name : a.nameEn || a.name);
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const typeName = (k) => t('l.type.' + k);
    const stTag = (s) => html`<span class="a-tag ${s}">${t('lv.st.' + s)}</span>`;
    const byLabel = (by) => (!by ? '' : by.role === 'admin' ? t('lv.by.admin') : t('lv.by.sup', { name: by.name }));
    const dur = (h, long) => req.dur(h, lang(), long);
    const range = (r) => `${r.start.slice(5, 10)} ${r.start.slice(11, 16)} — ${r.end.slice(5, 10)} ${r.end.slice(11, 16)}`;
    const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
    const dayTitle = (d) => {
      const [y, m, dd] = d.split('-').map(Number); const wd = new Date(y, m - 1, dd).getDay();
      return lang() === 'zh' ? t('lv.dayTitle', { y, m, d: dd, w: t('lv.wd.' + wd) }) : `${t('lv.wd.' + wd)}, ${dd} ${t('lv.mon.' + m)} ${y}`;
    };
    const monthTitle = (y, m) => (lang() === 'zh' ? t('lv.monthTitle', { y, m }) : `${t('lv.mon.' + m)} ${y}`);

    // ---------- data ----------
    function matches(r) {
      const f = V.applied; const nm = f.name.trim().toLowerCase();
      if (r.status === 'withdrawn' || !BS.perm.inScope(r.empNo)) return false;
      if (nm && !(r.applicant.name.toLowerCase().includes(nm) || (r.applicant.nameEn || '').toLowerCase().includes(nm) || r.empNo.toLowerCase().includes(nm))) return false;
      if (f.project && r.applicant.projectKey !== f.project) return false;
      if (f.type && r.type !== f.type) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.applied && r.submittedAt.slice(0, 10) !== f.applied) return false;
      return true;
    }
    const onDay = (day) => req.covering(day).filter(matches).sort((a, b) => ['pending', 'approved', 'rejected'].indexOf(a.status) - ['pending', 'approved', 'rejected'].indexOf(b.status) || a.start.localeCompare(b.start));

    // ---------- calendar ----------
    function cells() {
      const first = new Date(V.y, V.m - 1, 1); const start = new Date(V.y, V.m - 1, 1 - first.getDay());
      const last = new Date(V.y, V.m, 0); const total = Math.ceil((first.getDay() + last.getDate()) / 7) * 7;
      return Array.from({ length: total }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { iso: ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()), d: d.getDate(), other: d.getMonth() + 1 !== V.m }; });
    }
    function page() {
      const d = V.draft; const td = today(); const all = cells();
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('lv.title')}</h1><p class="a-sub">${t('lv.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn" data-act="lv-inert">${icon('upload', 16)} ${t('p.export')}</button><button type="button" class="a-btn primary" data-act="lv-add">${icon('plus', 16)} ${t('lv.add')}</button></div></div>
        <section class="a-card">
          <div class="cal-bar">
            <button type="button" class="a-btn" data-act="m-today">${t('lv.today')}</button>
            <button type="button" class="cal-nav" data-act="m-prev" aria-label="${t('a.prev')}">${icon('back', 16)}</button>
            <button type="button" class="cal-title" data-act="m-picker" aria-haspopup="dialog" aria-expanded="${V.picker ? 'true' : 'false'}">${monthTitle(V.y, V.m)} ${icon('down', 14)}</button>
            <button type="button" class="cal-nav" data-act="m-next" aria-label="${t('a.next')}">${icon('right', 16)}</button>
            <span class="a-fgrow"></span>
            <span class="cal-legend"><i class="approved"></i>${t('lv.st.approved')}<i class="pending"></i>${t('lv.st.pending')}<i class="rejected"></i>${t('lv.st.rejected')}</span>
            ${V.picker ? picker() : ''}
          </div>
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="name" value="${d.name}" placeholder="${t('lv.f.name')}" aria-label="${t('lv.f.name')}"></label>
            <label class="a-in"><select data-f="project" aria-label="${t('lv.f.project')}"><option value="">${t('lv.f.project')}</option>${Object.entries(leave.PRJ).map(([k, v]) => html`<option value="${k}" ${d.project === k ? 'selected' : ''}>${loc(v)}</option>`)}</select></label>
            <label class="a-in"><select data-f="type" aria-label="${t('lv.f.type')}"><option value="">${t('lv.f.type')}</option>${leave.TYPES.map((k) => html`<option value="${k}" ${d.type === k ? 'selected' : ''}>${typeName(k)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('lv.f.status')}"><option value="">${t('lv.f.status')}</option>${['pending', 'approved', 'rejected'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('lv.st.' + k)}</option>`)}</select></label>
            <label class="a-in"><span class="a-in-l">${t('lv.f.applied')}</span><input type="date" data-f="applied" value="${d.applied}"></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="lv-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
          </form>
          <p class="cal-hint">${t('lv.hint', { n: MAX_CHIPS })}</p>
          <div class="cal-wrap"><div class="cal" role="grid" aria-label="${monthTitle(V.y, V.m)}">
            ${[0, 1, 2, 3, 4, 5, 6].map((w) => html`<div class="cal-wd" role="columnheader">${t('lv.wd.' + w)}</div>`)}
            ${all.map((c) => {
              const rs = onDay(c.iso); const shown = rs.slice(0, MAX_CHIPS);
              return html`<button type="button" role="gridcell" class="cal-cell ${c.other ? 'other' : ''} ${c.iso === td ? 'today' : ''} ${V.sel === c.iso ? 'sel' : ''}" data-act="lv-day" data-d="${c.iso}" aria-label="${dayTitle(c.iso)}, ${t('lv.n', { n: rs.length })}">
                <span class="cal-d"><b>${c.d}</b>${rs.length ? html`<em>${t('lv.n', { n: rs.length })}</em>` : ''}</span>
                ${shown.map((r) => html`<span class="cal-chip ${r.status}"><b>${nameOf(r.applicant)}</b>${typeName(r.type)}</span>`)}
                ${rs.length > MAX_CHIPS ? html`<span class="cal-more">${t('lv.more', { n: rs.length - MAX_CHIPS })}</span>` : ''}
              </button>`;
            })}
          </div></div>
        </section>`;
    }

    function picker() {
      const P = V.picker; const first = new Date(P.y, P.m - 1, 1); const start = new Date(P.y, P.m - 1, 1 - first.getDay());
      const total = Math.ceil((first.getDay() + new Date(P.y, P.m, 0).getDate()) / 7) * 7; const td = today();
      return html`<div class="cal-pop" role="dialog" aria-label="${t('lv.pick')}">
        <div class="cal-pop-h"><button type="button" data-act="pk-prev" aria-label="${t('a.prev')}">${icon('back', 14)}</button><b>${monthTitle(P.y, P.m)}</b><button type="button" data-act="pk-next" aria-label="${t('a.next')}">${icon('right', 14)}</button></div>
        <div class="cal-pop-g">${[0, 1, 2, 3, 4, 5, 6].map((w) => html`<i>${t('lv.wds.' + w)}</i>`)}
          ${Array.from({ length: total }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const iso = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
            return html`<button type="button" class="${d.getMonth() + 1 !== P.m ? 'other' : ''} ${iso === td ? 'today' : ''} ${iso === P.sel ? 'sel' : ''}" data-act="pk-day" data-d="${iso}">${d.getDate()}</button>`; })}</div>
        <div class="cal-pop-f"><span>${P.sel ? t('lv.selected', { d: P.sel }) : ''}</span><button type="button" data-act="m-today">${t('lv.backToday')}</button></div></div>`;
    }

    // ---------- dialogs ----------
    function infoGrid(r) {
      const a = r.applicant;
      return html`<dl class="a-dl lv-dl">
        <div><dt>${t('lv.d.applicant')}</dt><dd>${nameOf(a)}</dd></div><div><dt>${t('lv.d.company')}</dt><dd>${loc(a.company)}</dd></div>
        <div><dt>${t('lv.d.project')}</dt><dd>${loc(a.project)}</dd></div><div><dt>${t('lv.d.site')}</dt><dd>${loc(a.site)}</dd></div>
        <div><dt>${t('lv.d.type')}</dt><dd>${typeName(r.type)}</dd></div><div><dt>${t('lv.d.dur')}</dt><dd>${dur(r.hours, true)}</dd></div>
        <div><dt>${t('lv.d.start')}</dt><dd>${r.start.replace('T', ' ')}</dd></div><div><dt>${t('lv.d.end')}</dt><dd>${r.end.replace('T', ' ')}</dd></div>
        <div class="wide"><dt>${t('lv.d.reason')}</dt><dd>${r.reason}</dd></div>
        <div><dt>${t('lv.d.by')}</dt><dd>${r.submittedBy && r.submittedBy.role === 'admin' ? t('lv.d.byAdmin') : nameOf(a)} · ${fmt.dt(r.submittedAt)}</dd></div>
        ${r.resubmitOf ? html`<div><dt>${t('lv.d.resub')}</dt><dd>${r.resubmitOf}</dd></div>` : ''}
      </dl>`;
    }

    function dayModal() {
      const M = V.modal; const rs = onDay(M.day); const n = (s) => rs.filter((r) => r.status === s).length;
      const multi = rs.some((r) => r.start.slice(0, 10) !== r.end.slice(0, 10));
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${dayTitle(M.day)}</h2><p>${t('lv.day.sub', { n: rs.length })}${multi ? t('lv.day.multi') : ''}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody">
          ${rs.length ? html`
            <div class="lv-listhead"><b>${t('lv.day.list', { n: rs.length })}</b><span>${t('lv.day.stats', { a: n('pending'), b: n('approved'), c: n('rejected') })}</span></div>
            <ul class="lv-list">${rs.map((r) => html`<li class="${M.rejectId === r.id ? 'rej' : ''}">
              <div class="lv-row"><i class="l-av">${nameOf(r.applicant).slice(0, 1)}</i>
                <div class="lv-main"><div class="lv-line"><b>${nameOf(r.applicant)}</b><span class="lv-type ${r.type}">${typeName(r.type)}</span>${stTag(r.status)}</div>
                  <small>${loc(r.applicant.company)} · ${loc(r.applicant.project)} · ${loc(r.applicant.site)}</small>
                  <small class="lv-when">${range(r)} · ${dur(r.hours)}</small>
                  ${M.errId === r.id && M.err ? html`<small class="a-ferr">${t(M.err.k, M.err.p)}</small>` : ''}</div>
                <div class="lv-acts"><button type="button" class="a-link" data-act="lv-open" data-id="${r.id}">${t('lv.act.detail')}</button>
                  ${r.status === 'pending' ? html`<button type="button" class="a-link bad" data-act="lv-reject" data-id="${r.id}">${t('a.act.reject')}</button><button type="button" class="a-link ok" data-act="lv-approve" data-id="${r.id}">${t('a.act.approve')}</button>` : ''}</div></div>
              ${M.rejectId === r.id ? html`<div class="lv-reject"><label class="a-lab" for="lv-rj"><b class="req">*</b> ${t('lv.rej.label')}</label>
                <textarea id="lv-rj" class="a-field" data-x="reject" rows="2" maxlength="200" placeholder="${t('lv.rej.ph')}">${M.rejectText}</textarea>
                <div class="a-hint"><span>${t('lv.rej.hint')}</span><span class="lv-rbtns"><button type="button" class="a-btn" data-act="lv-reject-cancel">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="lv-reject-ok" ${M.rejectText.trim() ? '' : 'disabled'}>${t('a.m.confirmReject')}</button></span></div></div>` : ''}
            </li>`)}</ul>`
          : html`<div class="a-none lv-empty">${icon('cal', 36)}<b>${t('lv.day.none')}</b><p>${t('lv.day.noneHint')}</p></div>`}
        </div>
        <footer><button type="button" class="a-btn" data-act="lv-add" data-d="${M.day}">${icon('plus', 16)} ${t('lv.add')}</button><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer>
      </div></div>`;
    }

    function reviewModal() {
      const M = V.modal; const r = req.get(M.id); if (!r) return '';
      const pending = r.status === 'pending';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${pending ? t('lv.rv.title') : t('lv.rv.detail')}</h2><p>${pending ? t('lv.rv.sub') : t('lv.rv.detailSub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody">
          <h3 class="lv-h3">${icon('clip', 16)} ${t('lv.rv.info')} <em class="a-demo">${t('lv.rv.ro')}</em></h3>
          ${infoGrid(r)}
          <dl class="a-dl lv-dl lv-dec">
            ${pending ? html`<div><dt>${t('lv.rv.approver')}</dt><dd>${t('lv.rv.me')}</dd></div><div><dt>${t('lv.rv.state')}</dt><dd>${stTag(r.status)}</dd></div>`
              : html`<div><dt>${t('lv.rv.result')}</dt><dd>${stTag(r.status)}</dd></div><div><dt>${t('lv.rv.approver')}</dt><dd>${r.review ? byLabel(r.review.by) : '—'}</dd></div>
                ${r.review ? html`<div><dt>${t('lv.rv.at')}</dt><dd>${fmt.dt(r.review.at)}</dd></div>` : ''}
                <div class="wide"><dt>${r.status === 'rejected' ? t('lv.rv.reasonOut') : t('lv.rv.comment')}</dt><dd>${r.review && r.review.text ? r.review.text : (r.status === 'withdrawn' ? t('lv.rv.withdrawn') : '—')}</dd></div>`}
          </dl>
          ${pending ? html`<div class="a-frow"><label class="a-lab" for="lv-cm">${t('lv.rv.comment')} <span class="a-fhint">${t('lv.rv.commentHint')}</span></label>
            <textarea id="lv-cm" class="a-field" data-x="comment" rows="3" maxlength="200" placeholder="${t('lv.rv.commentPh')}">${M.text}</textarea>
            ${M.err ? html`<small class="a-ferr">${t(M.err.k, M.err.p)}</small>` : ''}</div>` : ''}
        </div>
        <footer>${M.fromDay ? html`<button type="button" class="a-btn" data-act="lv-back">${t('lv.rv.back')}</button>` : html`<button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button>`}
          ${pending ? html`<button type="button" class="a-btn bad" data-act="lv-rv-reject">${t('lv.rv.reject')}</button><button type="button" class="a-btn primary" data-act="lv-rv-approve">${t('lv.rv.approve')}</button>` : html`<span class="a-closed-pill">${t('lv.rv.done')}</span>`}</footer>
      </div></div>`;
    }

    // ---- add leave on behalf of an employee
    function addModal() {
      const F = V.modal.f; const p = leave.person(F.empNo); const people = leave.people().filter((x) => x.status === 'active');
      const hours = (F.startDate && F.endDate) ? req.hoursBetween(`${F.startDate}T${F.startTime}`, `${F.endDate}T${F.endTime}`) : 0;
      const avail = p ? req.available(p.empNo, F.type) : 0;
      const typeOpts = leave.TYPES.filter((k) => k !== 'toil' || (p && leave.quota(p.empNo).toil.left > 0));
      const e = V.modal.errs;
      const E = (k) => (e[k] ? html`<small class="a-ferr" data-err="${k}">${t(e[k].k, e[k].p)}</small>` : '');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('lv.add')}</h2><p>${t('lv.add.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <div class="a-frow"><label class="a-lab">${t('lv.add.by')}</label><div class="l-ro">${t('lv.rv.me')}</div></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="lv-emp"><b class="req">*</b> ${t('lv.add.emp')}</label>
              <select id="lv-emp" class="a-field" data-a="empNo">${people.map((x) => html`<option value="${x.empNo}" ${F.empNo === x.empNo ? 'selected' : ''}>${nameOf(x)} · ${x.empNo}</option>`)}</select>${E('empNo')}</div>
            <div class="a-frow"><label class="a-lab">${t('lv.d.company')}</label><div class="a-field ro">${p ? loc(p.company) : t('lv.add.auto')}</div></div></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('lv.d.project')}</label><div class="a-field ro">${p ? loc(p.project) : '—'}</div></div>
            <div class="a-frow"><label class="a-lab">${t('lv.d.site')}</label><div class="a-field ro">${p ? loc(p.site) : '—'}</div></div></div>
          <div class="a-frow"><label class="a-lab" for="lv-ty"><b class="req">*</b> ${t('lv.d.type')}</label>
            <select id="lv-ty" class="a-field" data-a="type">${typeOpts.map((k) => html`<option value="${k}" ${F.type === k ? 'selected' : ''}>${typeName(k)}</option>`)}</select>
            <small class="a-fhint">${t('lv.add.avail', { v: fmt.num(Math.max(avail, 0)), u: t('l.unit.' + leave.UNIT[F.type]) })}</small>${E('type')}</div>
          <div class="p-two"><div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('lv.d.start')}</label><div class="lv-dt"><input type="date" class="a-field" data-a="startDate" value="${F.startDate}" aria-label="${t('lv.d.start')}"><input type="time" class="a-field" data-a="startTime" value="${F.startTime}" step="900" aria-label="${t('lv.d.start')}"></div></div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('lv.d.end')}</label><div class="lv-dt"><input type="date" class="a-field" data-a="endDate" value="${F.endDate}" aria-label="${t('lv.d.end')}"><input type="time" class="a-field" data-a="endTime" value="${F.endTime}" step="900" aria-label="${t('lv.d.end')}"></div></div></div>
          ${E('range')}
          <div class="a-frow"><label class="a-lab">${t('lv.d.dur')}</label><div class="a-field ro" data-role="dur">${hours > 0 ? dur(hours, true) : t('lv.add.durHint')}</div>${E('dur')}</div>
          <div class="a-frow"><label class="a-lab" for="lv-why"><b class="req">*</b> ${t('lv.d.reason')}</label>
            <textarea id="lv-why" class="a-field" data-a="reason" rows="3" maxlength="200" placeholder="${t('lv.add.reasonPh')}">${F.reason}</textarea>${E('reason')}</div>
          <p class="l-audit">${icon('shield', 14)} ${t('lv.add.note')}</p>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="lv-add-ok">${t('lv.add.submit')}</button></footer>
      </div></div>`;
    }

    // ---------- actions ----------
    const ERR = {
      person: ['lv.e.person'], type: ['lv.e.type'], dates: ['lv.e.dates'], range: ['lv.e.range'], zero: ['lv.e.zero'], reason: ['lv.e.reason'], reason_len: ['lv.e.reasonLen'],
    };
    function decideErr(r) {
      if (r.error === 'not_pending') return { k: 'lv.e.notPending', p: { s: t('lv.st.' + (r.status || 'withdrawn')) } };
      if (r.error === 'insufficient') return { k: 'lv.e.insufficient', p: { left: fmt.num(r.left), need: fmt.num(r.need) } };
      if (r.error === 'reason_required') return { k: 'lv.e.rejectReason' };
      return { k: 'lv.e.generic' };
    }
    function decide(id, action, comment, from) {
      const r = req.decide(id, action, { comment, by: ADMIN });
      const M = V.modal;
      if (!r.ok) {
        const err = decideErr(r);
        if (M) { M.err = err; M.errId = id; }
        render(); if (r.error === 'not_pending' || r.error === 'insufficient') toast(t(err.k, err.p), 'warn'); return false;
      }
      toast(t(action === 'approve' ? 'lv.toast.approved' : 'lv.toast.rejected', { name: nameOf(req.get(id).applicant) }), 'ok');
      if (from === 'review') V.modal = V.modal.fromDay ? { k: 'day', day: V.modal.fromDay, rejectId: null, rejectText: '' } : null;
      else if (M && M.k === 'day') { M.rejectId = null; M.rejectText = ''; M.err = null; M.errId = null; }
      render(); return true;
    }
    function openAdd(day) {
      const base = day || today(); const first = leave.people().find((x) => x.status === 'active');
      V.modal = { k: 'add', errs: {}, f: { empNo: first.empNo, type: 'annual', startDate: base, startTime: '08:00', endDate: base, endTime: '17:00', reason: '' } };
      render();
    }
    function submitAdd() {
      const M = V.modal; const F = M.f; M.errs = {};
      const r = req.create({ empNo: F.empNo, type: F.type, start: `${F.startDate}T${F.startTime}`, end: `${F.endDate}T${F.endTime}`, reason: F.reason, by: { role: 'admin', name: t('lv.rv.me') } });
      if (!r.ok) {
        if (r.error === 'overlap') M.errs.dur = { k: 'lv.e.overlap', p: { id: r.other } };
        else if (r.error === 'quota') M.errs.type = { k: 'lv.e.quota', p: { have: fmt.num(r.available), need: fmt.num(r.need) } };
        else if (r.error === 'long') M.errs.range = { k: 'lv.e.long', p: { n: r.max } };
        else if (r.error === 'reason' || r.error === 'reason_len') M.errs.reason = { k: ERR[r.error][0] };
        else if (r.error === 'range' || r.error === 'dates') M.errs.range = { k: ERR[r.error][0] };
        else if (r.error === 'zero') M.errs.dur = { k: 'lv.e.zero' };
        else M.errs.type = { k: (ERR[r.error] || ['lv.e.generic'])[0] };
        render(); return;
      }
      const day = F.startDate; V.modal = null;
      const d = new Date(day); V.y = +day.slice(0, 4); V.m = +day.slice(5, 7);
      render(); toast(t('lv.toast.added', { name: nameOf(r.req.applicant), id: r.req.id }), 'ok');
    }
    const shift = (o, n) => { let y = o.y, m = o.m + n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } o.y = y; o.m = m; };

    return {
      tab: 'approve',
      crumbs() { return [{ text: t('a.nav.leave'), act: 'noop' }, { text: t('l.tab.approve') }]; },
      page,
      modal() { const M = V.modal; return !M ? '' : M.k === 'day' ? dayModal() : M.k === 'review' ? reviewModal() : addModal(); },
      afterRender(view) {
        const M = V.modal; if (!M || M.focused) return; M.focused = true;
        const el = view.querySelector(M.k === 'review' ? '#lv-cm' : M.k === 'add' ? '#lv-emp' : '.a-modal .a-x'); if (el) el.focus();
      },
      onInput(e) {
        const el = e.target, view = ctx.view(); const M = V.modal;
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; return; }
        if (!M) return;
        if (el.dataset.x === 'reject' && M.k === 'day') { M.rejectText = el.value; const b = view.querySelector('[data-act=lv-reject-ok]'); if (b) b.disabled = !el.value.trim(); }
        else if (el.dataset.x === 'comment' && M.k === 'review') { M.text = el.value; if (M.err) { M.err = null; const s = view.querySelector('.a-ferr'); if (s) s.remove(); } }
        else if (el.dataset.a && M.k === 'add') {
          const k = el.dataset.a; M.f[k] = el.value; M.errs = {};
          view.querySelectorAll('.a-ferr').forEach((n) => n.remove());
          if (k === 'empNo') { const p = leave.person(el.value); const ok = ['annual', 'personal', 'sick'].includes(M.f.type) || (p && leave.quota(p.empNo).toil.left > 0); if (!ok) M.f.type = 'annual'; render(); return; }
          if (k === 'type') { render(); return; }
          if (k === 'startDate' && (!M.f.endDate || M.f.endDate < el.value)) { M.f.endDate = el.value; const ed = view.querySelector('[data-a=endDate]'); if (ed) ed.value = el.value; }
          const h = (M.f.startDate && M.f.endDate) ? req.hoursBetween(`${M.f.startDate}T${M.f.startTime}`, `${M.f.endDate}T${M.f.endTime}`) : 0;
          const d = view.querySelector('[data-role=dur]'); if (d) d.textContent = h > 0 ? dur(h, true) : t('lv.add.durHint');
        }
      },
      onSubmit() { V.applied = { ...V.draft }; render(); },
      onEscape() {
        if (V.picker) { V.picker = null; render(); return true; }
        if (V.modal) { if (V.modal.k === 'review' && V.modal.fromDay) V.modal = { k: 'day', day: V.modal.fromDay, rejectId: null, rejectText: '' }; else V.modal = null; render(); return true; }
        return false;
      },
      onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id, M = V.modal;
        switch (a) {
          case 'noop': break;
          case 'lv-inert': toast(t('p.toast.inert')); break;
          case 'lv-reset': V.draft = { ...FILTERS }; V.applied = { ...FILTERS }; render(); break;
          case 'm-today': V.y = +today().slice(0, 4); V.m = +today().slice(5, 7); V.picker = null; render(); break;
          case 'm-prev': shift(V, -1); V.picker = null; render(); break;
          case 'm-next': shift(V, 1); V.picker = null; render(); break;
          case 'm-picker': V.picker = V.picker ? null : { y: V.y, m: V.m, sel: null }; render(); break;
          case 'pk-prev': shift(V.picker, -1); render(); break;
          case 'pk-next': shift(V.picker, 1); render(); break;
          case 'pk-day': V.picker = null; V.y = +b.dataset.d.slice(0, 4); V.m = +b.dataset.d.slice(5, 7); V.sel = b.dataset.d; V.modal = { k: 'day', day: b.dataset.d, rejectId: null, rejectText: '' }; render(); break;
          case 'lv-day': V.picker = null; V.sel = b.dataset.d; V.modal = { k: 'day', day: b.dataset.d, rejectId: null, rejectText: '' }; render(); break;
          case 'lv-add': V.picker = null; openAdd(b.dataset.d || (M && M.k === 'day' ? M.day : null)); break;
          case 'lv-add-ok': submitAdd(); break;
          case 'lv-open': V.modal = { k: 'review', id, text: '', err: null, fromDay: M && M.k === 'day' ? M.day : null }; render(); break;
          case 'lv-back': V.modal = { k: 'day', day: M.fromDay, rejectId: null, rejectText: '' }; render(); break;
          case 'lv-approve': decide(id, 'approve', t('lv.defaultComment'), 'day'); break;
          case 'lv-reject': M.rejectId = id; M.rejectText = ''; M.err = null; render(); { const x = ctx.view().querySelector('#lv-rj'); if (x) x.focus(); } break;
          case 'lv-reject-cancel': M.rejectId = null; M.rejectText = ''; render(); break;
          case 'lv-reject-ok': decide(M.rejectId, 'reject', M.rejectText, 'day'); break;
          case 'lv-rv-approve': decide(M.id, 'approve', M.text || t('lv.defaultComment'), 'review'); break;
          case 'lv-rv-reject': if (!M.text.trim()) { M.err = { k: 'lv.e.rejectReason' }; render(); const x = ctx.view().querySelector('#lv-cm'); if (x) x.focus(); } else decide(M.id, 'reject', M.text, 'review'); break;
          case 'close-modal': V.modal = null; V.picker = null; render(); break;
          default: if (V.picker && !b.closest('.cal-pop')) { V.picker = null; } return false;
        }
        return true;
      },
      reset() { V.y = +today().slice(0, 4); V.m = +today().slice(5, 7); V.draft = { ...FILTERS }; V.applied = { ...FILTERS }; V.modal = null; V.picker = null; V.sel = null; },
    };
  };
})(window.BS);
