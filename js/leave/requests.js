/* Leave requests: apply → pending → approved / rejected / withdrawn. Approval consumes quota (see BS.leave.consume);
   cancelling an approved leave that hasn't started gives it back. */
(function (BS) {
  const KEY = 'bs_leave_req_proto_v1';
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const pad = (n) => String(n).padStart(2, '0');
  const r3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000;

  // Working window: 08:00–17:00 with a 12:00–13:00 break = 8 h per calendar day (weekends count; no attendance-group calendar yet).
  const WORK = [8 * 60, 17 * 60], BREAK = [12 * 60, 13 * 60], DAY_H = 8, MAX_DAYS = 60, BACKDATE_DAYS = 7;
  const toMin = (hhmm) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
  function winMinutes(from, to) {
    const a = Math.max(from, WORK[0]), b = Math.min(to, WORK[1]); if (b <= a) return 0;
    let m = b - a; const la = Math.max(a, BREAK[0]), lb = Math.min(b, BREAK[1]); if (lb > la) m -= lb - la; return m;
  }
  const dayOf = (iso) => iso.slice(0, 10);
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return iso(x); };
  const valid = (s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s || '') && !isNaN(parse(s.slice(0, 10)));

  /** hours of leave between two 'YYYY-MM-DDTHH:mm' stamps */
  function hoursBetween(start, end) {
    if (!valid(start) || !valid(end) || end <= start) return 0;
    let mins = 0; const s = dayOf(start), e = dayOf(end);
    for (let d = s, guard = 0; d <= e && guard < 400; d = addDays(d, 1), guard++) {
      const from = d === s ? toMin(start.slice(11)) : 0; const to = d === e ? toMin(end.slice(11)) : 24 * 60;
      mins += winMinutes(from, to);
    }
    return r3(mins / 60);
  }
  // quota units: day-types are in days, toil in hours
  const need = (type, hours) => (BS.leave.UNIT[type] === 'hour' ? hours : r3(hours / DAY_H));

  let state = load();
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && Array.isArray(s.reqs)) return s; } } catch (e) { /* fall through */ }
    return { v: 1, reqs: seedReqs() };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  function snap(p) { return { name: p.name, nameEn: p.nameEn, company: p.company, project: p.project, projectKey: p.projectKey, site: p.site }; }
  function nextId(at) {
    const day = at.slice(0, 10).replace(/-/g, ''); let max = 0;
    state.reqs.forEach((r) => { const m = new RegExp('^LV-' + day + '-(\\d+)$').exec(r.id); if (m) max = Math.max(max, +m[1]); });
    return `LV-${day}-${pad(max + 1).padStart(3, '0')}`;
  }
  const ACTIVE = (r) => r.status === 'pending' || r.status === 'approved';

  function seedReqs() {
    const today = BS.fmt.now().slice(0, 10); const out = [];
    const SUP = { role: 'supervisor', name: BS.ME.name }, ADM = { role: 'admin', name: 'admin' };
    // [empNo, type, startOffset, startTime, endOffset, endTime, status, submittedOffset, reviewText, reviewBy]
    const S = [
      ['BS10110', 'annual', 4, '08:00', 5, '17:00', 'pending', -2],
      ['BS10111', 'annual', 4, '08:00', 6, '17:00', 'approved', -6, '同意，已完成排班核对。', ADM],
      ['BS10112', 'personal', 3, '08:00', 4, '17:00', 'pending', -1],
      ['BS10113', 'sick', 4, '08:00', 4, '17:00', 'approved', -3, '同意', ADM],
      ['BS10114', 'annual', 4, '08:00', 5, '17:00', 'approved', -5, '同意', ADM],
      ['BS10115', 'personal', 4, '13:00', 4, '17:00', 'pending', -1],
      ['BS10116', 'annual', 9, '08:00', 13, '17:00', 'approved', -8, '同意', ADM],
      ['BS10117', 'personal', 10, '08:00', 13, '17:00', 'approved', -7, '同意', ADM],
      ['SG-0401', 'annual', 13, '08:00', 15, '17:00', 'pending', -1],
      ['SG-0288', 'annual', 2, '08:00', 3, '17:00', 'pending', -2],
      ['SG-0301', 'personal', -3, '14:00', -3, '17:00', 'rejected', -5, '项目当日人手不足，请调整日期。', { role: 'supervisor', name: 'Lim Wei Ming' }],
      ['BS10110', 'sick', -2, '08:00', -2, '17:00', 'approved', -3, '同意，请做好工作交接。', { role: 'supervisor', name: 'Lim Wei Ming' }],
      ['BS10456', 'annual', -10, '08:00', -9, '17:00', 'approved', -14, '同意', ADM],
      ['SG-0312', 'annual', 12, '08:00', 13, '17:00', 'pending', -1],
      ['SG-0312', 'sick', -12, '08:00', -12, '17:00', 'approved', -13, '同意', ADM],
      ['SG-0312', 'personal', -21, '14:00', -21, '17:00', 'rejected', -22, '项目当日人手不足，请调整日期。', SUP],
    ];
    S.forEach(([empNo, type, so, st, eo, et, status, sub, text, by]) => {
      const p = BS.leave.person(empNo); if (!p) return;
      const start = `${addDays(today, so)}T${st}`, end = `${addDays(today, eo)}T${et}`;
      const at = `${addDays(today, sub)}T09:${pad(10 + out.length)}`;
      const r = { id: '', empNo, applicant: snap(p), type, start, end, hours: hoursBetween(start, end), reason: type === 'sick' ? '身体不适，前往诊所检查。' : '家庭事务，需要请假。', submittedAt: at + ':00', submittedBy: { role: 'worker', name: p.name }, status, review: null, resubmitOf: null, log: [{ type: 'submitted', at: at + ':00' }] };
      if (text) { const rat = `${addDays(at.slice(0, 10), 1)}T10:${pad(15 + out.length)}:00`; r.review = { by, at: rat, text }; r.log.push({ type: status, at: rat, text }); }
      out.push(r);
    });
    out.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    out.forEach((r) => { r.id = nextIdFor(out, r.submittedAt); });
    return out;
  }
  function nextIdFor(list, at) {
    const day = at.slice(0, 10).replace(/-/g, ''); let max = 0;
    list.forEach((r) => { const m = new RegExp('^LV-' + day + '-(\\d+)$').exec(r.id || ''); if (m) max = Math.max(max, +m[1]); });
    return `LV-${day}-${pad(max + 1).padStart(3, '0')}`;
  }

  /** '2 天（16 小时）' / '4 小时' — whole-day-or-more shows days; long adds the hours */
  function dur(hours, lang, long) {
    const n = (x) => String(+Number(x).toFixed(3));
    if (hours >= DAY_H) { const d = hours / DAY_H; return long ? BS.t(lang, 'lv.dur.daysH', { n: n(d), h: n(hours) }) : BS.t(lang, 'lv.dur.days', { n: n(d) }); }
    return BS.t(lang, 'lv.dur.hours', { n: n(hours) });
  }

  BS.leaveReq = {
    DAY_H, MAX_DAYS, BACKDATE_DAYS, hoursBetween, need, addDays, dayOf, dur,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state.reqs; },
    get(id) { return state.reqs.find((r) => r.id === id) || null; },
    mine(empNo) { return state.reqs.filter((r) => r.empNo === empNo).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id)); },
    covering(day) { return state.reqs.filter((r) => r.status !== 'withdrawn' && dayOf(r.start) <= day && day <= dayOf(r.end)); },
    /** requests from a project that a supervisor may review (never their own) */
    forSupervisor(projectKey, selfEmp) { return state.reqs.filter((r) => r.applicant.projectKey === projectKey && r.empNo !== selfEmp && r.status !== 'withdrawn').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id)); },
    /** quota left for a type minus what is already reserved by the person's pending requests */
    available(empNo, type, excludeId) {
      const q = BS.leave.quota(empNo); if (!q) return 0;
      const held = state.reqs.filter((r) => r.empNo === empNo && r.type === type && r.status === 'pending' && r.id !== excludeId).reduce((s, r) => s + need(type, r.hours), 0);
      return r3(q[type].left - held);
    },
    overlap(empNo, start, end, excludeId) { return state.reqs.find((r) => r.empNo === empNo && ACTIVE(r) && r.id !== excludeId && r.start < end && start < r.end) || null; },
    startedAlready(r) { return r.start <= BS.fmt.now().slice(0, 16); },

    /** by: {role:'worker'|'admin', name}. Validates in the order the form shows fields. */
    create({ empNo, type, start, end, reason, by, resubmitOf }) {
      const p = BS.leave.person(empNo);
      if (!p || p.status !== 'active') return { ok: false, error: 'person' };
      if (!BS.leave.TYPES.includes(type)) return { ok: false, error: 'type' };
      if (!valid(start) || !valid(end)) return { ok: false, error: 'dates' };
      if (end <= start) return { ok: false, error: 'range' };
      const hours = hoursBetween(start, end);
      if (hours <= 0) return { ok: false, error: 'zero' };
      if (state.reqs && (parse(dayOf(end)) - parse(dayOf(start))) / 864e5 > MAX_DAYS) return { ok: false, error: 'long', max: MAX_DAYS };
      const why = String(reason || '').trim();
      if (!why) return { ok: false, error: 'reason' };
      if (why.length > 200) return { ok: false, error: 'reason_len' };
      const today = BS.fmt.now().slice(0, 10);
      const earliest = by.role === 'worker' ? addDays(today, type === 'sick' ? -BACKDATE_DAYS : 0) : null;
      if (earliest && dayOf(start) < earliest) return { ok: false, error: 'past', earliest };
      const clash = this.overlap(empNo, start, end);
      if (clash) return { ok: false, error: 'overlap', other: clash.id };
      const avail = this.available(empNo, type); const n = need(type, hours);
      if (n > avail) return { ok: false, error: 'quota', available: Math.max(avail, 0), need: n };
      const at = BS.fmt.now();
      const r = { id: nextId(at), empNo, applicant: snap(p), type, start, end, hours, reason: why, submittedAt: at, submittedBy: by, status: 'pending', review: null, resubmitOf: resubmitOf || null, log: [{ type: 'submitted', at, by }] };
      state.reqs.push(r); const ok = save(); emit({ type: 'created', id: r.id, empNo });
      return { ok: true, req: r, persisted: ok };
    },

    /** Applicant cancels: a pending request, or an approved one that hasn't started (quota is given back). */
    withdraw(id) {
      const r = this.get(id); if (!r) return { ok: false, error: 'missing' };
      if (r.status === 'pending') { /* fine */ }
      else if (r.status === 'approved') {
        if (this.startedAlready(r)) return { ok: false, error: 'started' };
        BS.leave.refund(r.empNo, r.type, need(r.type, r.hours), { zh: `撤销请假 ${r.id}，额度已返还`, en: `Cancelled leave ${r.id}; quota returned` });
        r.cancelledApproved = true;
      } else return { ok: false, error: 'not_active', status: r.status };
      const at = BS.fmt.now(); r.status = 'withdrawn'; r.log.push({ type: 'withdrawn', at, afterApproval: !!r.cancelledApproved });
      save(); emit({ type: 'withdrawn', id, empNo: r.empNo });
      return { ok: true };
    },

    /** action 'approve' | 'reject'; by {role:'admin'|'supervisor', name}. Re-checks status and quota at decision time. */
    decide(id, action, { comment = '', by }) {
      const r = this.get(id); if (!r) return { ok: false, error: 'missing' };
      if (r.status !== 'pending') return { ok: false, error: 'not_pending', status: r.status };
      if (by.role === 'supervisor' && r.empNo === BS.ME.empNo) return { ok: false, error: 'self' };
      const text = String(comment || '').trim();
      if (text.length > 200) return { ok: false, error: 'too_long' };
      if (action === 'reject' && !text) return { ok: false, error: 'reason_required' };
      if (action === 'approve') {
        const n = need(r.type, r.hours);
        const m = BS.leave.consume(r.empNo, r.type, n, { zh: `请假 ${r.id} 已批准，扣减额度`, en: `Leave ${r.id} approved; quota used` });
        if (!m.ok) return { ok: false, error: 'insufficient', left: m.left, need: n };
      }
      const at = BS.fmt.now();
      r.status = action === 'approve' ? 'approved' : 'rejected'; r.review = { by, at, text };
      r.log.push({ type: r.status, at, text, by });
      save(); emit({ type: r.status, id, empNo: r.empNo });
      return { ok: true };
    },

    reset() { state = { v: 1, reqs: seedReqs() }; save(); emit({ type: 'reset' }); },
  };
})(window.BS);
