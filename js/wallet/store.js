/* Incentives and wallets: one append-only ledger of reward points per worker.
   Points are awarded for good conduct and deducted for bad; a deduction tied to a corrective course is reversed when the worker completes that course.
   Points can be redeemed two ways: as a cash voucher at the cash rate, or as course credit at the (higher) upskilling rate, which pays for training bookings.
   Nothing is edited: a reversal, a refund and a redemption are new entries pointing at what they undo or use. Rates are effective-dated rule versions.
   The ledger is separate from payroll: no entry here changes a wage or a payslip. */
(function (BS) {
  const KEY = 'bs_wallet_proto_v1';
  const hr = BS.hr, bus = BS.bus;
  const listeners = new Set();
  let version = 0;
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const money = (n) => Math.round(n * 100) / 100;
  const MAX_POINTS = 2000, STEP = 100;

  function seed() {
    const t0 = today(); const d = (n) => hr.addDays(t0, n);
    const rules = [
      { id: 'punct', kind: 'award', zh: '整周准时到岗', en: 'On time all week', points: 50, on: true },
      { id: 'attend', kind: 'award', zh: '当月全勤', en: 'Full attendance this month', points: 200, on: true },
      { id: 'hazard', kind: 'award', zh: '安全之星：发现并上报隐患', en: 'Hazard star: reported an unsafe condition', points: 400, on: true },
      { id: 'zeroinc', kind: 'award', zh: '零事故里程碑', en: 'Zero-incident milestone', points: 250, on: true },
      { id: 'trained', kind: 'award', zh: '完成培训课程（自动）', en: 'Completed a training course (automatic)', points: 100, on: true },
      { id: 'late', kind: 'deduct', zh: '无故迟到', en: 'Unexcused late arrival', points: 50, on: true },
      { id: 'absent', kind: 'deduct', zh: '旷工', en: 'Absent without notice', points: 100, on: true },
      { id: 'unsafe', kind: 'deduct', zh: '不安全行为', en: 'Unsafe act observed', points: 150, on: true },
    ];
    const rates = [{ from: '2026-01-01', cash: 0.1, course: 0.2 }];
    let n = 0; const ledger = [];
    const add = (empNo, off, kind, f) => ledger.push({ id: 'L' + String(++n).padStart(4, '0'), empNo, kind, points: 0, cash: 0, cc: 0, wallet: '', ruleId: '', reason: '', ref: '', corrective: '', reversedBy: '', by: 'admin', date: d(off), at: `${d(off)} 09:30`, rate: 0, code: '', ...f });
    const aw = (e, off, rule, why) => { const r = rules.find((x) => x.id === rule); add(e, off, 'award', { points: r.points, ruleId: rule, reason: why || r.en, by: 'ops01' }); };
    const dd = (e, off, rule, why, corrective) => { const r = rules.find((x) => x.id === rule); add(e, off, 'deduct', { points: -r.points, ruleId: rule, reason: why || r.en, corrective: corrective || '', by: 'ops01' }); };
    aw('SG-0312', -12, 'hazard', 'Hazard Star: unsafe gas cylinder storage reported'); aw('SG-0312', -5, 'attend'); aw('SG-0312', -3, 'punct'); dd('SG-0312', -2, 'late', 'Unexcused late site reporting'); add('SG-0312', -1, 'redeem', { points: -100, wallet: 'cash', cash: 10, rate: 0.1, code: 'V-CASH-4821', reason: 'Cash voucher', by: 'SG-0312' });
    aw('BS10086', -10, 'zeroinc', 'Zero incident monthly rigging milestone'); aw('BS10086', -6, 'attend'); aw('BS10086', -3, 'punct');
    aw('BS10213', -9, 'attend'); aw('BS10213', -7, 'hazard'); add('BS10213', -4, 'redeem', { points: -200, wallet: 'course', cc: 40, rate: 0.2, reason: 'Course credit', by: 'BS10213' });
    aw('BS10110', -20, 'punct'); aw('BS10110', -15, 'attend'); dd('BS10110', -8, 'unsafe', 'Observed working without a harness', 'CSOC');
    aw('BS10114', -14, 'attend'); dd('BS10114', -9, 'unsafe', 'Unsafe lifting practice at the loading bay', 'CSOC');
    aw('BS10116', -11, 'hazard'); aw('BS10116', -4, 'zeroinc');
    return { v: 1, rules, rates, ledger, n };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.ledger) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const text = (v, max) => String(v || '').trim().slice(0, max);
  const W = {
    MAX_POINTS, STEP,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    rules() { return state.rules; },
    rule(id) { return state.rules.find((r) => r.id === id) || null; },
    rates() { return state.rates; },
    /** the rate version in force on a day: the latest one that has started */
    rate(date) { const day = date || today(); return state.rates.filter((r) => r.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0] || state.rates[0]; },
    ledger(empNo) { return (empNo ? state.ledger.filter((x) => x.empNo === empNo) : state.ledger.slice()).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },
    entry(id) { return state.ledger.find((x) => x.id === id) || null; },
    /** the reason of an entry in the viewer's language: system-written wording is translated, free text typed by a person is shown as typed */
    reasonText(x, t, zh) {
      const rule = x.ruleId && this.rule(x.ruleId);
      if (x.kind === 'win') return t('wl.rs.win', { ref: x.ref });
      if (x.kind === 'award' && /^SP-/.test(x.ref)) return t('wl.rs.spinPts', { ref: x.ref });
      if (x.kind === 'redeem') return t(x.wallet === 'cash' ? 'wl.route.cashPlain' : 'wl.route.coursePlain');
      if (x.kind === 'spend') return t('wl.rs.spend'); if (x.kind === 'refund') return t('wl.rs.refund');
      if (x.kind === 'reversal') { const m = /\(((?:BK|TR)-[^)]+)\)/.exec(x.reason); return m ? t('wl.rs.corrective', { id: m[1] }) : x.reason === 'Deduction reversed' ? t('wl.rs.reversed') : x.reason; }
      if (rule && (x.reason === rule.en || x.reason.startsWith(rule.en + ' ('))) { const m = /\(((?:BK|TR)-[^)]+)\)$/.exec(x.reason); return (zh ? rule.zh : rule.en) + (m ? ` (${m[1]})` : ''); }
      return x.reason;
    },

    // ---------- balances ----------
    points(empNo) { return state.ledger.reduce((n, x) => (x.empNo === empNo ? n + x.points : n), 0); },
    /** course credit in S$: what course redemptions added, less what bookings used (plus refunds) */
    credit(empNo) { return money(state.ledger.reduce((n, x) => (x.empNo === empNo ? n + x.cc : n), 0)); },
    cashIssued(empNo) { return money(state.ledger.reduce((n, x) => (x.empNo === empNo ? n + x.cash : n), 0)); },
    /** what a points balance is worth today on each route */
    worth(points, date) { const r = this.rate(date); return { cash: money(points * r.cash), course: money(points * r.course), rate: r }; },
    holders() { return [...new Set(state.ledger.map((x) => x.empNo))]; },
    openDeductions(empNo) { return state.ledger.filter((x) => x.kind === 'deduct' && !x.reversedBy && (!empNo || x.empNo === empNo)); },
    summary(empNos) {
      const set = empNos ? new Set(empNos) : null; const rows = state.ledger.filter((x) => !set || set.has(x.empNo)); const pool = rows.reduce((n, x) => n + x.points, 0); const w = this.worth(pool);
      return { pool, cash: w.cash, course: w.course, reversed: rows.filter((x) => x.kind === 'reversal').length, credit: money(rows.reduce((n, x) => n + x.cc, 0)), people: new Set(rows.map((x) => x.empNo)).size };
    },

    // ---------- writing the ledger ----------
    _add(empNo, kind, f) {
      const e = { id: 'L' + String(++state.n).padStart(4, '0'), empNo, kind, points: 0, cash: 0, cc: 0, wallet: '', ruleId: '', reason: '', ref: '', corrective: '', reversedBy: '', by: me(), date: today(), at: stamp(), rate: 0, code: '', ...f };
      state.ledger.push(e); return e;
    },
    _done(e, type) { const ok = save(); emit({ type, id: e.id, empNo: e.empNo }); bus.emit('wallet.entry', { id: e.id, empNo: e.empNo, kind: e.kind, points: e.points }); return { ok: true, entry: e, persisted: ok }; },
    validateMove(empNo, d, kind) {
      const e = {}; const emp = hr.emp(empNo); if (!emp || emp.status !== 'active') e.empNo = 'emp';
      const rule = d.ruleId ? this.rule(d.ruleId) : null; if (d.ruleId && (!rule || !rule.on || rule.kind !== kind)) e.ruleId = 'rule';
      const pts = Number(d.points); if (!Number.isInteger(pts) || pts < 1 || pts > MAX_POINTS) e.points = 'points';
      const why = text(d.reason, 200); if (!rule && !why) e.reason = 'reason'; else if (why && why.length < 3) e.reason = 'reason_len';
      if (kind === 'deduct' && !e.empNo && !e.points && pts > this.points(empNo)) e.points = 'insufficient';
      if (kind === 'deduct' && d.corrective && !(BS.train && BS.train.certGroup(d.corrective))) e.corrective = 'course';
      return e;
    },
    award(empNo, d, by) {
      const e = this.validateMove(empNo, d, 'award'); if (Object.keys(e).length) return { ok: false, errors: e };
      const rule = d.ruleId ? this.rule(d.ruleId) : null;
      return this._done(this._add(empNo, 'award', { points: Number(d.points), ruleId: d.ruleId || '', reason: text(d.reason, 200) || (rule ? rule.en : ''), by: by || me() }), 'award');
    },
    deduct(empNo, d, by) {
      const e = this.validateMove(empNo, d, 'deduct'); if (Object.keys(e).length) return { ok: false, errors: e };
      const rule = d.ruleId ? this.rule(d.ruleId) : null;
      return this._done(this._add(empNo, 'deduct', { points: -Number(d.points), ruleId: d.ruleId || '', reason: text(d.reason, 200) || (rule ? rule.en : ''), corrective: d.corrective || '', by: by || me() }), 'deduct');
    },
    /** gives back a deduction (a new positive entry); each deduction can be reversed once */
    reverse(id, why, by) {
      const x = this.entry(id); if (!x || x.kind !== 'deduct') return { ok: false, error: 'missing' }; if (x.reversedBy) return { ok: false, error: 'already' };
      const r = this._add(x.empNo, 'reversal', { points: -x.points, ref: x.id, ruleId: x.ruleId, reason: text(why, 200) || 'Deduction reversed', by: by || me() }); x.reversedBy = r.id; return this._done(r, 'reverse');
    },
    /** turns points into value on one of two routes. cash: a voucher worth points × cash rate; course: credit worth points × course rate (the 2× boost) */
    redeem(empNo, wallet, points, by) {
      const emp = hr.emp(empNo); if (!emp || emp.status !== 'active') return { ok: false, errors: { empNo: 'emp' } };
      if (!['cash', 'course'].includes(wallet)) return { ok: false, errors: { wallet: 'wallet' } };
      const pts = Number(points); if (!Number.isInteger(pts) || pts < STEP || pts % STEP !== 0 || pts > MAX_POINTS * 10) return { ok: false, errors: { points: 'step' } };
      if (pts > this.points(empNo)) return { ok: false, errors: { points: 'insufficient' } };
      const rate = this.rate(); const value = money(pts * (wallet === 'cash' ? rate.cash : rate.course));
      const code = wallet === 'cash' ? `V-CASH-${String(1000 + Math.floor(Math.random() * 9000))}` : '';
      return this._done(this._add(empNo, 'redeem', { points: -pts, wallet, cash: wallet === 'cash' ? value : 0, cc: wallet === 'course' ? value : 0, rate: wallet === 'cash' ? rate.cash : rate.course, code, reason: wallet === 'cash' ? 'Cash voucher' : 'Course credit', by: by || me() }), 'redeem');
    },
    /** an enrolment request uses course credit (one entry per trainee); a cancelled or changed request gives it back */
    spend(empNo, amount, ref, by) { if (this.credit(empNo) + 1e-9 < amount) return { ok: false, error: 'credit' }; return this._done(this._add(empNo, 'spend', { cc: -money(amount), wallet: 'course', ref, reason: 'Training booking', by: by || me() }), 'spend'); },
    refund(empNo, amount, ref, by) { return this._done(this._add(empNo, 'refund', { cc: money(amount), wallet: 'course', ref, reason: 'Booking cancelled or roster changed', by: by || me() }), 'refund'); },

    /** a prize from the spin-and-win wheel: points (an award), or cash voucher / course credit (a win). Not a rule, so it does not need one. */
    grant(empNo, d, by) {
      const emp = hr.emp(empNo); if (!emp || emp.status !== 'active') return { ok: false, error: 'emp' }; const ref = d.ref || '';
      if (d.points > 0) return this._done(this._add(empNo, 'award', { points: Math.round(d.points), ref, reason: `Spin & win (${ref})`, by: by || me() }), 'award');
      if (d.cc > 0) return this._done(this._add(empNo, 'win', { cc: money(d.cc), wallet: 'course', ref, reason: 'Spin & win', by: by || me() }), 'win');
      if (d.cash > 0) return this._done(this._add(empNo, 'win', { cash: money(d.cash), wallet: 'cash', ref, code: `V-WIN-${String(1000 + Math.floor(Math.random() * 9000))}`, reason: 'Spin & win', by: by || me() }), 'win');
      return { ok: false, error: 'nothing' };
    },

    // ---------- rules and rates ----------
    saveRules(list) {
      const e = {}; list.forEach((r, i) => { const p = Number(r.points); if (!Number.isInteger(p) || p < 1 || p > MAX_POINTS) e['p' + i] = 'points'; });
      if (Object.keys(e).length) return { ok: false, errors: e };
      list.forEach((r) => { const x = this.rule(r.id); if (x) { x.points = Number(r.points); x.on = !!r.on; } }); const ok = save(); emit({ type: 'rules' }); return { ok: true, persisted: ok };
    },
    validateRate(d) {
      const e = {}; const last = state.rates.slice().sort((a, b) => b.from.localeCompare(a.from))[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.from || '')) e.from = 'date'; else if (d.from < today()) e.from = 'past'; else if (d.from <= last.from) e.from = 'later';
      const c = Number(d.cash), k = Number(d.course); if (!(c >= 0.01 && c <= 1)) e.cash = 'cash'; if (!(k >= 0.01 && k <= 2)) e.course = 'course_rate'; else if (!e.cash && k < c) e.course = 'lower';
      return e;
    },
    addRate(d) { const e = this.validateRate(d); if (Object.keys(e).length) return { ok: false, errors: e }; state.rates.push({ from: d.from, cash: Math.round(Number(d.cash) * 1000) / 1000, course: Math.round(Number(d.course) * 1000) / 1000 }); const ok = save(); emit({ type: 'rate' }); return { ok: true, persisted: ok }; },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  BS.wallet = W;

  // a completed course earns points, and reverses the deductions that named it as the corrective training
  bus.on('training.completed', (ev) => {
    const { id, certTypes, empNos } = ev.payload; const rule = W.rule('trained'); let changed = false;
    (empNos || []).forEach((no) => {
      if (rule && rule.on && !state.ledger.some((x) => x.kind === 'award' && x.ruleId === 'trained' && x.ref === id && x.empNo === no)) { W._add(no, 'award', { points: rule.points, ruleId: 'trained', ref: id, reason: `${rule.en} (${id})`, by: 'system' }); changed = true; }
      W.openDeductions(no).filter((x) => x.corrective && (certTypes || []).includes(x.corrective)).forEach((x) => { const r = W._add(no, 'reversal', { points: -x.points, ref: x.id, ruleId: x.ruleId, reason: `Corrective training completed (${id})`, by: 'system' }); x.reversedBy = r.id; changed = true; bus.emit('wallet.entry', { id: r.id, empNo: no, kind: 'reversal', points: r.points }); });
    });
    if (changed) { save(); emit({ type: 'auto' }); }
  });
})(window.BS);
