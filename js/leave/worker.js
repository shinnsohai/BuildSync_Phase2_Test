/* Worker app: 请假 — balances, apply, records, detail (withdraw / reapply) and the supervisor approval screens. */
(function (BS) {
  const leave = BS.leave, req = BS.leaveReq;
  const ORDER = ['annual', 'sick', 'personal', 'toil'];

  (BS.workerExt = BS.workerExt || []).push((function () {
    const A = { draft: null, errs: {}, filter: 'all', supOnlyPending: false, supText: '', supErr: null, supFor: null };
    const me = () => BS.ME.empNo;
    const today = () => BS.fmt.now().slice(0, 10);
    const newDraft = (from) => {
      const d = req.addDays(today(), 1);
      if (from) return { type: from.type, startDate: from.start.slice(0, 10) >= today() ? from.start.slice(0, 10) : d, startTime: from.start.slice(11), endDate: from.end.slice(0, 10) >= today() ? from.end.slice(0, 10) : d, endTime: from.end.slice(11), reason: from.reason, resubmitOf: from.id };
      return { type: 'annual', startDate: d, startTime: '08:00', endDate: d, endTime: '17:00', reason: '', resubmitOf: null };
    };
    const hoursOf = (d) => req.hoursBetween(`${d.startDate}T${d.startTime}`, `${d.endDate}T${d.endTime}`);
    const loc = (api, o) => (o ? (api.lang === 'zh' ? o.zh : o.en || o.zh) : '');
    const nameOf = (api, a) => (api.lang === 'zh' ? a.name : a.nameEn || a.name);
    const byLabel = (api, by) => (!by ? '' : by.role === 'admin' ? api.t('lv.by.admin') : api.t('lv.by.sup', { name: by.name }));
    const stTag = (api, s) => api.html`<span class="w-tag ${s}">${api.t('lv.st.' + s)}</span>`;
    const range = (r) => `${r.start.slice(5, 10)} ${r.start.slice(11, 16)} – ${r.end.slice(5, 10)} ${r.end.slice(11, 16)}`;
    const day = (iso, lang) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d} ${BS.t(lang, 'lv.mon.' + m).slice(0, 3)} ${y}`; };
    const isSup = () => true;                        // the signed-in worker is also a project supervisor in this prototype
    const supList = () => req.forSupervisor(leave.person(me()).projectKey, me());
    const pendingForMe = () => supList().filter((r) => r.status === 'pending');

    function balanceCards(api, avail) {
      const { t, html, fmt } = api; const q = leave.quota(me());
      const toilOn = q.toil.total > 0 || (BS.pay && BS.pay.modeFor(me()) === 'leave');
      const types = ORDER.filter((k) => k !== 'toil' || toilOn);
      return { toilOn, node: html`<div class="w-bal" tabindex="0" aria-label="${t('w.lv.balance')}">${types.map((k) => { const v = avail ? req.available(me(), k) : q[k].left; return html`
        <article class="w-balcard ${k}"><small>${t('l.type.' + k)}</small><b>${fmt.num(Math.max(v, 0))}<em>${t('l.unit.' + leave.UNIT[k])}</em></b><span>${t('l.total')} ${fmt.num(q[k].total)} ${t('l.unit.' + leave.UNIT[k])}</span></article>`; })}</div>` };
    }

    // ---------- home ----------
    function home(api) {
      const { t, html, icon, header, fmt } = api;
      const bal = balanceCards(api, false);
      const now = BS.fmt.now().slice(0, 16);
      const on = req.mine(me()).find((r) => r.status === 'approved' && r.start <= now && now <= r.end);
      const recent = req.mine(me()).filter((r) => r.status !== 'withdrawn').slice(0, 3);
      const pend = pendingForMe().length;
      return html`
        ${header(t('w.lv.title'))}
        <div class="w-body">
          <div class="w-sec"><h2>${t('w.lv.balance')}</h2><span>${t('w.lv.swipe')}</span></div>
          ${bal.node}
          ${bal.toilOn ? html`<p class="w-note info">${icon('clock', 16)} ${t('w.lv.toilNote')}</p>` : ''}
          <section class="w-card w-state ${on ? 'off' : ''}"><span class="w-ico-sq">${icon(on ? 'cal' : 'check', 18)}</span><div><small>${t('w.lv.state')}</small><b>${on ? t('w.lv.onLeave') : t('w.lv.working')}</b>${on ? html`<small>${on.start.slice(0, 10)} → ${on.end.slice(0, 10)} · ${req.dur(on.hours, api.lang)}</small>` : ''}</div></section>
          <button type="button" class="w-btn primary" data-act="lv-apply">${t('w.lv.apply')}</button>
          ${isSup() ? html`<button type="button" class="w-card w-link" data-act="lv-sup">${icon('users', 20)}<span><b>${t('w.lv.approve')}</b><small>${t('w.lv.approveSub')}</small></span>${pend ? html`<em class="w-pill">${t('w.lv.pendingN', { n: pend })}</em>` : ''}${icon('right', 18)}</button>` : ''}
          <div class="w-sec"><h2>${t('w.lv.recent')}</h2><button type="button" class="w-textbtn" data-act="lv-records">${t('w.lv.all')}</button></div>
          ${recent.length ? recent.map((r) => reqCard(api, r)) : html`<div class="w-empty">${icon('cal', 36)}<p>${t('w.lv.none')}</p></div>`}
        </div>`;
    }
    function reqCard(api, r, act = 'lv-open') {
      const { t, html, icon } = api;
      return html`<button type="button" class="w-card w-rec" data-act="${act}" data-id="${r.id}">
        <div class="w-rec-top"><span class="w-ico-sq">${icon('cal', 18)}</span><b>${t('l.type.' + r.type)}</b>${stTag(api, r.status)}</div>
        <div class="w-kv"><span>${t('w.lv.dates')}</span><b>${range(r)}</b></div><div class="w-kv"><span>${t('w.lv.dur')}</span><b>${req.dur(r.hours, api.lang)}</b></div>${icon('right', 18, 'w-rec-go')}</button>`;
    }

    // ---------- apply ----------
    function apply(api) {
      const { t, html, icon, header, fmt } = api; const d = A.draft; const e = A.errs;
      const h = hoursOf(d); const bal = balanceCards(api, true);
      const types = ORDER.filter((k) => k !== 'toil' || bal.toilOn);
      const E = (k) => (e[k] ? html`<small class="w-err" data-err="${k}">${t(e[k].k, e[k].p)}</small>` : '');
      return html`
        ${header(t('w.lv.applyTitle'))}
        <div class="w-body w-form">
          <div><div class="w-sec"><h2>${t('w.lv.avail')}</h2></div>${bal.node}</div>
          ${d.resubmitOf ? html`<p class="w-note info">${icon('refresh', 16)} ${t('w.lv.resub', { id: d.resubmitOf })}</p>` : ''}
          <div class="w-field ${e.type ? 'err' : ''}"><label>${t('lv.d.type')}</label>
            <div class="w-seg" role="radiogroup">${types.map((k) => html`<button type="button" role="radio" aria-checked="${d.type === k ? 'true' : 'false'}" class="${d.type === k ? 'on' : ''}" data-act="lv-type" data-v="${k}">${t('l.type.' + k)}</button>`)}</div>${E('type')}</div>
          <div class="w-field ${e.range ? 'err' : ''}"><label>${t('w.lv.startAt')}</label>
            <div class="w-dt"><input type="date" class="w-input" data-lv="startDate" value="${d.startDate}" aria-label="${t('w.lv.startAt')}"><input type="time" class="w-input" data-lv="startTime" value="${d.startTime}" step="900" aria-label="${t('w.lv.startAt')}"></div></div>
          <div class="w-field ${e.range ? 'err' : ''}"><label>${t('w.lv.endAt')}</label>
            <div class="w-dt"><input type="date" class="w-input" data-lv="endDate" value="${d.endDate}" aria-label="${t('w.lv.endAt')}"><input type="time" class="w-input" data-lv="endTime" value="${d.endTime}" step="900" aria-label="${t('w.lv.endAt')}"></div>${E('range')}</div>
          <div class="w-field ${e.dur ? 'err' : ''}"><label>${t('lv.d.dur')}</label>
            <div class="w-input w-auto"><b data-role="dur">${h > 0 ? req.dur(h, api.lang, true) : '—'}</b><small>${t('w.lv.auto')}</small></div>${E('dur')}</div>
          <div class="w-field ${e.reason ? 'err' : ''}"><label for="lv-why">${t('lv.d.reason')}</label>
            <textarea id="lv-why" class="w-input" data-lv="reason" rows="3" maxlength="200" placeholder="${t('w.lv.reasonPh')}">${d.reason}</textarea>${E('reason')}</div>
        </div>
        <footer class="w-foot"><button type="button" class="w-btn primary" data-act="lv-submit">${t('w.lv.submit')}</button></footer>`;
    }

    // ---------- records & detail ----------
    function records(api) {
      const { t, html, icon, header } = api;
      const all = req.mine(me()); const list = A.filter === 'all' ? all : all.filter((r) => r.status === A.filter);
      return html`
        ${header(t('w.lv.recTitle'), { right: html`<button type="button" class="w-plus" data-act="lv-apply" aria-label="${t('w.lv.apply')}">${icon('plus', 22)}</button>` })}
        <div class="w-body">
          <div class="w-filters" role="tablist">${['all', 'pending', 'approved', 'rejected'].map((f) => html`<button type="button" role="tab" aria-selected="${A.filter === f ? 'true' : 'false'}" class="${A.filter === f ? 'on' : ''}" data-act="lv-filter" data-f="${f}">${f === 'all' ? t('w.rec.all') : t('lv.st.' + f)}</button>`)}</div>
          ${list.length ? list.map((r) => reqCard(api, r)) : html`<div class="w-empty">${icon('cal', 36)}<p>${t('w.lv.none')}</p></div>`}
        </div>`;
    }
    function detail(api) {
      const { t, html, icon, header, fmt } = api;
      const r = req.get(api.cur().id);
      if (!r) return html`${header(t('w.lv.detTitle'))}<div class="w-body"><div class="w-empty"><p>${t('w.lv.missing')}</p></div></div>`;
      const s = r.status; const rv = r.review; const started = req.startedAlready(r);
      const ic = { pending: 'clock', approved: 'check', rejected: 'x', withdrawn: 'refresh' }[s];
      const wasApproved = s === 'withdrawn' && r.log.some((l) => l.afterApproval);
      return html`
        ${header(t('w.lv.detTitle'))}
        <div class="w-body">
          <section class="w-hero-card ${s}"><span class="w-hero-ic">${icon(ic, 26)}</span><div><b>${t('w.lv.h.' + s)}</b><p>${s === 'pending' ? t('w.lv.s.pending', { at: fmt.dt(r.submittedAt) }) : t('w.lv.s.' + s)}</p></div>${stTag(api, s)}</section>
          <section class="w-card w-list">
            <div class="w-row"><span>${t('lv.d.type')}</span><b>${t('l.type.' + r.type)}</b></div>
            <div class="w-row"><span>${t('lv.d.start')}</span><b>${r.start.replace('T', ' ')}</b></div>
            <div class="w-row"><span>${t('lv.d.end')}</span><b>${r.end.replace('T', ' ')}</b></div>
            <div class="w-row"><span>${t('lv.d.dur')}</span><b>${req.dur(r.hours, api.lang, true)}</b></div>
            <div class="w-row"><span>${t('w.det.at')}</span><b>${fmt.dt(r.submittedAt)}</b></div>
            <div class="w-row"><span>${t('lv.d.reason')}</span><b class="note">${r.reason}</b></div>
          </section>
          ${s === 'pending' ? html`<section class="w-card"><h3>${t('w.det.progress')}</h3><ol class="w-steps"><li class="done"><i>${icon('check', 12)}</i><div><b>${t('w.lv.p.sub')}</b><small>${fmt.dt(r.submittedAt)}</small></div></li><li class="now"><i></i><div><b>${t('w.lv.p.wait')}</b><small>${t('w.det.p.cur')}</small></div></li></ol></section>
            <p class="w-note">${icon('bell', 16)} ${t('w.lv.pendingNote')}</p>` : ''}
          ${rv ? html`<section class="w-card w-list">
              <div class="w-row"><span>${t('w.det.result')}</span><b class="res ${s === 'rejected' ? 'rejected' : 'approved'}">${t('lv.st.' + (s === 'withdrawn' ? 'approved' : s))}</b></div>
              <div class="w-row"><span>${t('w.det.by')}</span><b>${byLabel(api, rv.by)}</b></div>
              <div class="w-row"><span>${t('w.det.rat')}</span><b>${fmt.dt(rv.at)}</b></div>
              ${rv.by && s === 'rejected' ? html`<div class="w-reason"><span>${t('w.lv.rejReason')}</span><p>${rv.text}</p></div>` : html`<div class="w-row"><span>${t('w.det.comment')}</span><b>${rv.text || '—'}</b></div>`}</section>` : ''}
          ${s === 'approved' ? html`<p class="w-note ok">${icon('check', 16)} ${started ? t('w.lv.effective') : t('w.lv.effectiveFuture')}</p>` : ''}
          ${s === 'withdrawn' ? html`<p class="w-note">${icon('refresh', 16)} ${wasApproved ? t('w.lv.cancelledNote') : t('w.lv.withdrawnNote')}</p>` : ''}
        </div>
        <footer class="w-foot">
          ${s === 'pending' ? html`<button type="button" class="w-btn danger-o" data-act="lv-withdraw" data-id="${r.id}">${t('w.lv.withdraw')}</button>` : ''}
          ${s === 'approved' && !started ? html`<button type="button" class="w-btn danger-o" data-act="lv-withdraw" data-id="${r.id}">${t('w.lv.cancelLeave')}</button>` : ''}
          ${s === 'rejected' || s === 'withdrawn' ? html`<button type="button" class="w-btn primary" data-act="lv-reapply" data-id="${r.id}">${t('w.lv.reapply')}</button>` : ''}
        </footer>`;
    }

    // ---------- supervisor ----------
    function sup(api) {
      const { t, html, icon, header } = api; const all = supList(); const pend = all.filter((r) => r.status === 'pending');
      const list = A.supOnlyPending ? pend : all;
      return html`
        ${header(t('w.lv.approve'))}
        <div class="w-body">
          <section class="w-card"><div class="w-sup-h"><b>${t('w.lv.supTitle')}</b></div>
            <div class="w-chips"><span class="w-chip">${t('w.lv.proj')}${loc(api, leave.person(me()).project)}</span><span class="w-chip">${t('w.lv.time')}</span></div>
            <button type="button" class="w-prior ${A.supOnlyPending ? 'on' : ''}" data-act="lv-sup-filter">${icon('bell', 16)} <b>${t('w.lv.waiting', { n: pend.length })}</b><span>${A.supOnlyPending ? t('w.lv.showAll') : t('w.lv.prior')} ›</span></button></section>
          <div class="w-sec"><h2>${t('w.lv.supRecords')}</h2><span>${t('w.lv.total', { n: list.length })}</span></div>
          ${list.length ? list.map((r) => html`<div class="w-card w-rec w-sup">
            <button type="button" class="w-sup-hit" data-act="lv-sup-open" data-id="${r.id}" aria-label="${nameOf(api, r.applicant)}"></button>
            <div class="w-rec-top"><i class="w-av">${nameOf(api, r.applicant).slice(0, 1)}</i><b>${nameOf(api, r.applicant)} · ${t('l.type.' + r.type)}</b><span class="w-role">${t('w.lv.worker')}</span>${stTag(api, r.status)}</div>
            <small class="w-sub">${loc(api, r.applicant.project)}</small>
            <div class="w-kv"><span>${range(r)}</span><b>${req.dur(r.hours, api.lang)}</b></div>
            ${r.status === 'pending' ? html`<div class="w-btns"><button type="button" class="w-btn ghost sm" data-act="lv-sup-open" data-id="${r.id}" data-reject="1">${t('w.lv.rejectBtn')}</button><button type="button" class="w-btn primary sm" data-act="lv-sup-approve" data-id="${r.id}">${t('w.lv.approveBtn')}</button></div>`
              : html`<div class="w-sup-foot"><span>${r.review ? t('w.lv.decidedAt', { at: r.review.at.slice(5, 10) + ' ' + r.review.at.slice(11, 16), s: t('lv.st.' + r.status) }) : ''}</span><em>${t('w.lv.viewDetail')} ›</em></div>`}</div>`)
            : html`<div class="w-empty">${icon('check', 36)}<p>${t('w.lv.supNone')}</p></div>`}
        </div>`;
    }
    /** Leave Check on the phone: the verdict, the reason, the findings and who could cover (the questions are on the admin tab) */
    function checkCard(api, r) {
      const { t, html, icon } = api; const chk = BS.leaveCheck; if (!chk) return ''; const a = chk.analyse(r.id); if (!a) return ''; const z = api.lang === 'zh'; const L = chk.lead(a, t, z);
      const tone = { 0: 'ok', 1: 'ok', 2: 'warn', 3: 'bad' }[a.level]; const names = Object.entries(a.candidates).filter(([, l]) => l.length).map(([ro, l]) => `${t('lc.role.' + ro)}: ` + l.map((c) => { const e = BS.hr.emp(c.empNo); return e ? (z ? e.name : e.nameEn || e.name) : c.empNo; }).join('、'));
      return html`<section class="w-card w-lc ${tone}" data-role="leave-check"><div class="w-lc-h"><span class="w-lc-ai">${icon('star', 12)} ${t('lc.ai')}</span><b>${L.title}</b></div><p>${L.sentence}</p><p class="w-lc-adv">${L.advice}</p>
        ${names.length ? html`<small>${t('lc.cover')}: ${names.join(' · ')}</small>` : ''}<small class="w-lc-foot">${t('w.lc.more')}</small></section>`;
    }
    function supDetail(api) {
      const { t, html, icon, header, fmt } = api; const r = req.get(api.cur().id);
      if (!r) return html`${header(t('w.lv.supDetTitle'))}<div class="w-body"><div class="w-empty"><p>${t('w.lv.missing')}</p></div></div>`;
      const a = r.applicant; const s = r.status; const rv = r.review;
      return html`
        ${header(t('w.lv.supDetTitle'))}
        <div class="w-body">
          <section class="w-card w-person"><i class="w-av lg">${nameOf(api, a).slice(0, 1)}</i><div><b>${nameOf(api, a)}</b><small>${t('w.lv.worker')} · ${loc(api, a.site)}</small></div>${stTag(api, s)}</section>
          <section class="w-card w-list">
            <div class="w-row"><span>${t('lv.d.type')}</span><b>${t('l.type.' + r.type)}</b></div>
            <div class="w-row"><span>${t('w.lv.relProject')}</span><b>${loc(api, a.project)}</b></div>
            <div class="w-row"><span>${t('lv.d.site')}</span><b>${loc(api, a.site)}</b></div>
            <div class="w-row"><span>${t('lv.d.start')}</span><b>${r.start.replace('T', ' ')}</b></div>
            <div class="w-row"><span>${t('lv.d.end')}</span><b>${r.end.replace('T', ' ')}</b></div>
            <div class="w-row"><span>${t('lv.d.dur')}</span><b>${req.dur(r.hours, api.lang, true)}</b></div>
            <div class="w-row"><span>${t('w.det.at')}</span><b>${fmt.dt(r.submittedAt)}</b></div>
            <div class="w-row"><span>${t('lv.d.reason')}</span><b class="note">${r.reason}</b></div></section>
          ${s === 'pending' ? checkCard(api, r) : ''}
          ${s === 'pending' ? html`<div class="w-field ${A.supErr ? 'err' : ''}"><label for="lv-sc">${t('w.lv.opinion')} <i>${t('w.lv.opinionHint')}</i></label>
              <textarea id="lv-sc" class="w-input" data-lv="supText" rows="3" maxlength="200" placeholder="${t('w.lv.opinionPh')}">${A.supText}</textarea>${A.supErr ? html`<small class="w-err">${t(A.supErr.k, A.supErr.p)}</small>` : ''}</div>`
            : rv ? html`<section class="w-card w-list"><div class="w-row"><span>${t('w.det.result')}</span><b class="res ${s === 'rejected' ? 'rejected' : 'approved'}">${t('lv.st.' + s)}</b></div><div class="w-row"><span>${t('w.det.by')}</span><b>${byLabel(api, rv.by)}</b></div><div class="w-row"><span>${t('w.det.rat')}</span><b>${fmt.dt(rv.at)}</b></div><div class="w-row"><span>${t('w.det.comment')}</span><b>${rv.text || '—'}</b></div></section>
              <p class="w-note ok">${icon('check', 16)} ${t('w.lv.supDone')}</p>` : ''}
        </div>
        ${s === 'pending' ? html`<footer class="w-foot w-two"><button type="button" class="w-btn ghost" data-act="lv-sup-reject" data-id="${r.id}">${t('w.lv.rejectBtn')}</button><button type="button" class="w-btn primary" data-act="lv-sup-approve" data-id="${r.id}">${t('w.lv.approveBtn')}</button></footer>` : ''}`;
    }

    // ---------- actions ----------
    function submit(api) {
      const d = A.draft; A.errs = {}; const { t, fmt } = api;
      const r = req.create({ empNo: me(), type: d.type, start: `${d.startDate}T${d.startTime}`, end: `${d.endDate}T${d.endTime}`, reason: d.reason, by: { role: 'worker', name: BS.ME.name }, resubmitOf: d.resubmitOf });
      if (!r.ok) {
        const m = {
          range: ['range', 'lv.e.range'], dates: ['range', 'lv.e.dates'], zero: ['dur', 'lv.e.zero'], long: ['range', 'lv.e.long', { n: r.max }], reason: ['reason', 'lv.e.reason'], reason_len: ['reason', 'lv.e.reasonLen'],
          past: ['range', 'lv.e.past', { d: r.earliest }], overlap: ['dur', 'lv.e.overlap', { id: r.other }], quota: ['type', 'lv.e.quota', { have: fmt.num(r.available || 0), need: fmt.num(r.need || 0) }],
        }[r.error] || ['type', 'lv.e.generic'];
        A.errs[m[0]] = { k: m[1], p: m[2] }; api.render(); const f = api.root.querySelector('.w-field.err'); if (f) f.scrollIntoView({ block: 'center' }); return;
      }
      A.draft = newDraft(); A.filter = 'all';
      api.go([{ s: 'home' }, { s: 'leave' }, { s: 'lv-records' }, { s: 'lv-detail', id: r.req.id }]);
      api.toast(r.persisted ? t('w.lv.toast.submitted') : t('w.toast.notSaved'), r.persisted ? 'ok' : 'warn');
    }
    function supDecide(api, id, action, comment) {
      const r = req.decide(id, action, { comment, by: { role: 'supervisor', name: BS.ME.name } });
      if (!r.ok) {
        const e = r.error === 'reason_required' ? { k: 'lv.e.rejectReason' } : r.error === 'not_pending' ? { k: 'lv.e.notPending', p: { s: api.t('lv.st.' + (r.status || 'withdrawn')) } }
          : r.error === 'insufficient' ? { k: 'lv.e.insufficient', p: { left: api.fmt.num(r.left), need: api.fmt.num(r.need) } } : { k: 'lv.e.generic' };
        A.supErr = e; api.render(); if (r.error !== 'reason_required') api.toast(api.t(e.k, e.p), 'warn'); return false;
      }
      A.supText = ''; A.supErr = null;
      api.toast(api.t(action === 'approve' ? 'w.lv.toast.approved' : 'w.lv.toast.rejected'), 'ok'); api.render(); return true;
    }

    return {
      stores: [leave, req, BS.pay],
      init(api) {
        A.draft = newDraft();
        const onField = (e) => {
          const el = e.target; const k = el.dataset && el.dataset.lv; if (!k) return;
          if (k === 'supText') { A.supText = el.value; if (A.supErr) { A.supErr = null; const f = el.closest('.w-field'); if (f) { f.classList.remove('err'); const s = f.querySelector('.w-err'); if (s) s.remove(); } } return; }
          A.draft[k] = el.value; A.errs = {};
          api.root.querySelectorAll('.w-field.err').forEach((f) => f.classList.remove('err')); api.root.querySelectorAll('[data-err]').forEach((n) => n.remove());
          if (k === 'startDate' && (!A.draft.endDate || A.draft.endDate < el.value)) { A.draft.endDate = el.value; const ed = api.root.querySelector('[data-lv=endDate]'); if (ed) ed.value = el.value; }
          const h = hoursOf(A.draft); const d = api.root.querySelector('[data-role=dur]'); if (d) d.textContent = h > 0 ? req.dur(h, api.lang, true) : '—';
        };
        api.root.addEventListener('input', onField);
      },
      screens: { leave: home, 'lv-apply': apply, 'lv-records': records, 'lv-detail': detail, 'lv-sup': sup, 'lv-supd': supDetail },
      onClick(a, b, api) {
        const id = b.dataset.id;
        switch (a) {
          case 'open-leave': case 'leave-open': api.go([{ s: 'home' }, { s: 'leave' }]); return true;
          case 'lv-apply': A.draft = A.draft && A.draft.resubmitOf ? A.draft : newDraft(); A.errs = {}; api.push('lv-apply'); return true;
          case 'lv-records': A.filter = 'all'; api.push('lv-records'); return true;
          case 'lv-filter': A.filter = b.dataset.f; api.render(); return true;
          case 'lv-open': api.W.banner = null; api.push('lv-detail', { id }); return true;
          case 'lv-type': A.draft.type = b.dataset.v; A.errs = {}; api.render(); return true;
          case 'lv-submit': submit(api); return true;
          case 'lv-withdraw': {
            const r = req.get(id); if (!r) return true; const approved = r.status === 'approved';
            api.W.sheet = { k: 'confirm', title: api.t(approved ? 'w.lv.cancelTitle' : 'w.lv.wdTitle'), msg: api.t(approved ? 'w.lv.cancelMsg' : 'w.lv.wdMsg'), ok: api.t(approved ? 'w.lv.cancelLeave' : 'w.lv.withdraw'), danger: true, then: () => {
              const x = req.withdraw(id);
              if (x.ok) api.toast(api.t(approved ? 'w.lv.toast.cancelled' : 'w.lv.toast.withdrawn')); else api.toast(api.t(x.error === 'started' ? 'w.lv.e.started' : 'lv.e.notPending', { s: api.t('lv.st.' + (x.status || 'withdrawn')) }), 'warn');
              api.render();
            } };
            api.render(); return true;
          }
          case 'lv-reapply': { const r = req.get(id); if (!r) return true; A.draft = newDraft(r); A.errs = {}; api.go([{ s: 'home' }, { s: 'leave' }, { s: 'lv-apply' }]); return true; }
          case 'lv-sup': A.supOnlyPending = false; api.push('lv-sup'); return true;
          case 'lv-sup-filter': A.supOnlyPending = !A.supOnlyPending; api.render(); return true;
          case 'lv-sup-open': A.supText = ''; A.supErr = null; api.W.banner = null; api.push('lv-supd', { id }); if (b.dataset.reject) { A.supErr = { k: 'lv.e.rejectReason' }; api.render(); const t = api.root.querySelector('#lv-sc'); if (t) t.focus(); } return true;
          case 'lv-sup-approve': { const ok = supDecide(api, id, 'approve', A.supText || api.t('lv.defaultComment')); return true; }
          case 'lv-sup-reject': if (!A.supText.trim()) { A.supErr = { k: 'lv.e.rejectReason' }; api.render(); const t = api.root.querySelector('#lv-sc'); if (t) t.focus(); } else supDecide(api, id, 'reject', A.supText); return true;
          case 'leave-inert': api.toast(api.t('w.lv.inert')); return true;
        }
        return false;
      },
      onStore(evt, api) {
        const { t, fmt } = api;
        const quotaMine = evt.empNos && evt.empNos.includes(me());
        if (quotaMine && (evt.type === 'adjusted' || evt.type === 'ot-credited')) {
          const k = evt.leaveType; const d = evt.delta; const val = `${d > 0 ? '+' : '−'}${fmt.num(Math.abs(d))} ${t('l.unit.' + leave.UNIT[k])}`;
          api.showBanner({ kind: 'info', act: 'leave-open', title: t(evt.type === 'adjusted' ? 'w.lv.nt.adjusted' : 'w.lv.nt.toil'), msg: `${t('l.type.' + k)} ${val}` }); return;
        }
        const r = evt.id && req.get(evt.id);
        if (r && (evt.type === 'approved' || evt.type === 'rejected') && r.empNo === me()) {
          api.showBanner({ kind: evt.type === 'approved' ? 'ok' : 'bad', act: 'lv-open', id: r.id, title: t(evt.type === 'approved' ? 'w.lv.nt.approved' : 'w.lv.nt.rejected'), msg: `${t('l.type.' + r.type)} · ${r.start.slice(5, 10)} → ${r.end.slice(5, 10)}` }); return;
        }
        if (r && evt.type === 'created' && r.empNo !== me() && r.applicant.projectKey === leave.person(me()).projectKey && r.status === 'pending') {
          api.showBanner({ kind: 'info', act: 'lv-sup', title: t('w.lv.nt.new'), msg: `${api.lang === 'zh' ? r.applicant.name : r.applicant.nameEn || r.applicant.name} · ${t('l.type.' + r.type)}` }); return;
        }
        api.render();
      },
    };
  })());
})(window.BS);
