/* Leave quotas: people, per-year balances, and the change log. Shared by the admin quota page,
   leave requests (consume / refund on approve / cancel), overtime conversion and the worker app. */
(function (BS) {
  const KEY = 'bs_leave_proto_v3';
  const YEAR = 2026, YEARS = [2026, 2025];
  const TYPES = ['annual', 'personal', 'sick', 'toil'];       // toil = time off in lieu (overtime exchanged for leave)
  const UNIT = { annual: 'day', personal: 'day', sick: 'day', toil: 'hour' };
  const STEP = 0.5, MAX_AMOUNT = 365;
  const listeners = new Set();
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const r3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000;
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });

  const PRJ = BS.hrSeed.PRJ;
  const CARRY = { 'BS10086': { annual: 3, sick: 1 } };            // from the change-log design (2025 → 2026)

  function seed() {
    const q26 = {}, q25 = {}, last = {}, log = [];
    let n = 0;
    const L = (o) => log.push({ id: 'L' + String(++n).padStart(3, '0'), year: YEAR, unit: o.type === 'toil' ? 'hour' : 'day', by: 'admin', ...o });
    BS.hrSeed.ROWS.forEach((row) => {
      const empNo = row[0], qs = row[7], lastAdj = row[8];
      const carry = CARRY[empNo] || {};
      q26[empNo] = { toil: { total: 0, left: 0 } }; q25[empNo] = { toil: { total: 0, left: 0 } };
      ['annual', 'personal', 'sick'].forEach((ty, i) => {
        q26[empNo][ty] = { total: qs[i][0], left: qs[i][1] };
        const c = carry[ty] || 0;
        q25[empNo][ty] = { total: qs[i][0] - c, left: c };
      });
      last[empNo] = lastAdj;
      Object.keys(carry).forEach((ty) => L({ empNo, at: '2026-01-01T00:00:00', type: ty, kind: 'carry', before: null, delta: carry[ty], after: q26[empNo][ty].total,
        beforeText: { zh: `2025剩余${carry[ty]}天`, en: `2025 left ${carry[ty]}d` }, afterText: { zh: `2026总额${q26[empNo][ty].total}天`, en: `2026 total ${q26[empNo][ty].total}d` },
        by: 'system', note: { zh: `2025年度剩余${carry[ty]}天自动顺延至2026年度`, en: `${carry[ty]} day(s) left in 2025 carried over to 2026` } }));
    });
    // the three manual adjustments shown in the log design for 陈浩, plus one plausible entry for five others
    L({ empNo: 'BS10086', at: '2026-09-15T09:30:00', type: 'annual', kind: 'manual', before: 6, delta: 1, after: 7, note: '项目调配补充额度' });
    L({ empNo: 'BS10086', at: '2026-09-15T09:28:00', type: 'personal', kind: 'manual', before: 5, delta: 2, after: 7, note: '临时补充额度' });
    L({ empNo: 'BS10086', at: '2026-06-18T16:20:00', type: 'sick', kind: 'manual', before: 8, delta: -1, after: 7, note: '额度纠正' });
    BS.hrSeed.ROWS.slice(1, 6).forEach((row) => {
      L({ empNo: row[0], at: row[8], type: 'personal', kind: 'manual', before: row[7][1][0] - 1, delta: 1, after: row[7][1][0], note: '额度补充' });
    });
    return { v: 3, quotas: { 2026: q26, 2025: q25 }, last, log };
  }

  let peopleCache = null, peopleVer = -1;
  let state = load();
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 3 && s.quotas) return s; } } catch (e) { /* fall through */ }
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });
  const nextLogId = () => 'L' + String(state.log.reduce((m, l) => Math.max(m, +l.id.slice(1)), 0) + 1).padStart(3, '0');

  BS.leave = {
    YEAR, YEARS, TYPES, UNIT, STEP, MAX_AMOUNT, PRJ,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** roster as seen by the leave / pay modules (adapter over the personnel store) */
    people() {
      if (!peopleCache || peopleVer !== BS.hr.version()) {
        const un = { zh: '待分配项目', en: 'Unassigned' };
        peopleCache = BS.hr.emps().map((e) => { const a = e.assigns[0]; const pr = a && BS.hr.project(a.projectKey);
          return { empNo: e.empNo, name: e.name, nameEn: e.nameEn, phone: BS.hr.maskPhone(e.phone), status: e.status, templateId: e.templateId, rate: e.rateCents,
            project: pr ? { zh: pr.zh, en: pr.en } : un, company: e.employer, site: a ? BS.hr.site(a.siteKey) : { zh: '—', en: '—' }, projectKey: a ? a.projectKey : '' }; });
        peopleVer = BS.hr.version();
      }
      return peopleCache;
    },
    person(empNo) { return this.people().find((p) => p.empNo === empNo) || null; },
    quota(empNo, year = YEAR) {
      const y = state.quotas[year] = state.quotas[year] || {};
      if (!y[empNo] && BS.hr.emp(empNo)) y[empNo] = year === YEAR ? { annual: { total: 5, left: 5 }, personal: { total: 5, left: 5 }, sick: { total: 10, left: 10 }, toil: { total: 0, left: 0 } } : { annual: { total: 0, left: 0 }, personal: { total: 0, left: 0 }, sick: { total: 0, left: 0 }, toil: { total: 0, left: 0 } };
      return y[empNo] || null;
    },
    lastAdjust(empNo) { return state.last[empNo] || null; },
    log(empNo, year = YEAR) { return state.log.filter((l) => l.empNo === empNo && l.year === year).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },

    /** Manual adjustment for one or many people (all-or-nothing). mode: 'add' | 'deduct'. Current year only. */
    adjust({ empNos, type, mode, amount, reason }) {
      const amt = Number(amount);
      if (!TYPES.includes(type)) return { ok: false, error: 'type' };
      if (!(amt > 0)) return { ok: false, error: 'amount' };
      if (amt > MAX_AMOUNT) return { ok: false, error: 'max' };
      if (Math.round(amt * 100) % Math.round(STEP * 100) !== 0) return { ok: false, error: 'step' };
      const why = String(reason || '').trim();
      if (!why) return { ok: false, error: 'reason' };
      if (why.length > 200) return { ok: false, error: 'reason_len' };
      if (!empNos.length) return { ok: false, error: 'nobody' };
      const signed = mode === 'deduct' ? -amt : amt;
      const short = empNos.filter((e) => { const q = this.quota(e); return !q || r3(q[type].left + signed) < 0; });
      if (short.length) return { ok: false, error: 'insufficient', empNos: short };
      const at = BS.fmt.now();
      empNos.forEach((e) => {
        const c = this.quota(e)[type];
        const before = c.total; c.total = r3(c.total + signed); c.left = r3(c.left + signed);
        state.log.push({ id: nextLogId(), empNo: e, year: YEAR, at, type, kind: 'manual', before, delta: signed, after: c.total, unit: UNIT[type], by: 'admin', note: why });
        state.last[e] = at;
      });
      const ok = save(); emit({ type: 'adjusted', empNos, leaveType: type, delta: signed });
      return { ok: true, persisted: ok };
    },

    /** Overtime exchanged for leave time (hours, 1:1). Called from the overtime-registration flow. */
    creditOvertime(empNo, hours, note) {
      const h = r2(hours); const q = this.quota(empNo);
      if (!q) return { ok: false, error: 'missing' };
      if (!(h > 0)) return { ok: false, error: 'amount' };
      const c = q.toil; const before = c.total; c.total = r2(c.total + h); c.left = r2(c.left + h);
      state.log.push({ id: nextLogId(), empNo, year: YEAR, at: BS.fmt.now(), type: 'toil', kind: 'overtime', before, delta: h, after: c.total, unit: 'hour', by: 'system', note });
      const ok = save(); emit({ type: 'ot-credited', empNos: [empNo], leaveType: 'toil', delta: h });
      return { ok: true, persisted: ok };
    },

    /** Approved leave uses up remaining quota (amount in the type's unit); a cancelled approved leave gives it back.
        Log entries show before/after *remaining* (basis 'left'). */
    consume(empNo, type, amount, note) { return this._move(empNo, type, -Math.abs(amount), note); },
    refund(empNo, type, amount, note) { return this._move(empNo, type, Math.abs(amount), note); },
    _move(empNo, type, signed, note) {
      const q = this.quota(empNo); if (!q) return { ok: false, error: 'missing' };
      const c = q[type]; const before = c.left; const after = r3(before + signed);
      if (after < 0) return { ok: false, error: 'insufficient', left: before };
      c.left = Math.min(after, c.total);   // a refund never lifts remaining above the year's total
      state.log.push({ id: nextLogId(), empNo, year: YEAR, at: BS.fmt.now(), type, kind: 'leave', basis: 'left', before, delta: signed, after, unit: UNIT[type], by: 'system', note });
      const ok = save(); emit({ type: signed < 0 ? 'consumed' : 'refunded', empNos: [empNo], leaveType: type, delta: signed });
      return { ok: true, persisted: ok };
    },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
