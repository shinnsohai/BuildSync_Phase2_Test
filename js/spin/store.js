/* Spin & win: workers earn tokens by going to work and spend them on a wheel.
   A token is earned for each scheduled workday on which the worker punched in AND out (the attendance engine decides what a scheduled workday is: rest days, holidays
   and full-day leave are not scheduled, so they neither earn nor break a streak). A streak of consecutive scheduled workdays pays a bonus at the days the administrator sets.
   A friend recorded as referred earns tokens for both people when the friend completes a first worked day (the referrer's monthly cap applies).
   One spin costs tokens; the prize comes from 8 slices with weights, a per-worker monthly cap per prize and one monthly prize budget (S$). Prizes land in the rewards wallet.
   Nothing is edited: the token ledger and the spin history only grow. Days are processed once, in order, with the rules in force on that day (changing a rule is never retroactive). */
(function (BS) {
  const KEY = 'bs_spin_proto_v1';
  const hr = BS.hr, att = BS.att, wl = BS.wallet, bus = BS.bus;
  const listeners = new Set();
  let version = 0;
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const addDays = (d, n) => hr.addDays(d, n);
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const KINDS = ['points', 'course', 'cash', 'spin', 'none'];
  const SLICES = 8;
  const COLORS = ['#5058f2', '#e39824', '#17795c', '#d64545', '#7a4bd8', '#0b8fa8', '#c2478a', '#6b7280'];
  const money = (n) => Math.round(n * 100) / 100;
  const addMin = (s, n) => { const d = new Date(s); d.setMinutes(d.getMinutes() + n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

  function seedConfig(t0) {
    return { start: addDays(t0, -7), daily: 1, milestones: [{ day: 3, tokens: 1 }, { day: 7, tokens: 2 }, { day: 14, tokens: 3 }, { day: 30, tokens: 5 }], refReferrer: 3, refReferred: 2, refCap: 5, refNewDays: 45, spinCost: 1, lateDays: 14 };
  }
  function seedPrizes() {
    const p = (i, kind, value, weight, cap, zh, en) => ({ id: 'p' + i, kind, value, weight, cap, zh, en, img: `slice-${i}.png`, color: COLORS[i - 1] });
    return [p(1, 'points', 10, 25, 0, '10 积分', '10 points'), p(2, 'points', 20, 12, 0, '20 积分', '20 points'), p(3, 'points', 50, 4, 2, '50 积分', '50 points'), p(4, 'points', 200, 1, 1, '200 积分大奖', '200 points jackpot'),
      p(5, 'course', 3, 6, 2, '课程额度 S$3', 'Course credit S$3'), p(6, 'cash', 2, 5, 2, '现金券 S$2', 'Cash voucher S$2'), p(7, 'spin', 1, 10, 0, '再转一次', 'Bonus spin'), p(8, 'none', 0, 37, 0, '谢谢参与', 'Better luck next time')];
  }

  let state = null;
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.cfg && s.ledger) return s; } } catch (e) { /* fall through */ } return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load() || state; emit({ type: 'sync' }); } });

  const S = {
    KINDS, SLICES, COLORS,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    config() { return state.cfg; },
    prizes() { return state.prizes; },
    prize(id) { return state.prizes.find((p) => p.id === id) || null; },
    budget() { return state.budget; },
    ledger(empNo) { return (empNo ? state.ledger.filter((x) => x.empNo === empNo) : state.ledger.slice()).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },
    spins(empNo) { return (empNo ? state.spins.filter((x) => x.empNo === empNo) : state.spins.slice()).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },
    spinById(id) { return state.spins.find((x) => x.id === id) || null; },
    balance(empNo) { return state.ledger.reduce((n, x) => (x.empNo === empNo ? n + x.tokens : n), 0); },

    // ---------- earning tokens ----------
    _add(empNo, kind, tokens, f = {}) {
      const e = { id: 'T' + String(++state.n).padStart(5, '0'), empNo, kind, tokens, date: today(), at: stamp(), ref: '', reason: '', by: 'system', ...f };
      state.ledger.push(e); return e;
    },
    /** is this worker's day finished with both punches (the only thing that earns a token) */
    _complete(day) { return !!(day.expected && !day.leaveFull && day.inP && day.outP); },
    /** processes every day up to today that has not been processed yet, in order; returns true when something changed */
    sync(empNo) {
      const e = hr.emp(empNo); if (!e || e.status !== 'active' || !state) return false; const cfg = state.cfg; const t0 = today(); const now = att.now();
      const first = cfg.start > e.joinDate ? cfg.start : e.joinDate; let cur = state.cursor[empNo] || addDays(first, -1); let changed = false;
      const st = state.streak[empNo] || (state.streak[empNo] = { count: 0, last: '' });
      for (let d = addDays(cur, 1); d <= t0; d = addDays(d, 1)) {
        if (d < first) { cur = d; continue; }
        const day = att.day(empNo, d, now);
        if (!day.expected || day.leaveFull || day.status === 'rest' || day.status === 'none' || day.status === 'leave') { cur = d; continue; }   // not a scheduled workday: pauses the streak
        if (this._complete(day)) {
          this._add(empNo, 'daily', cfg.daily, { ref: d, date: d, reason: 'Daily check-in and check-out' }); st.count++; st.last = d;
          const m = cfg.milestones.find((x) => x.day === st.count); if (m) this._add(empNo, 'streak', m.tokens, { ref: String(st.count), date: d, reason: `${st.count}-day streak` });
          this._referralCheck(empNo, d); cur = d; changed = true; continue;
        }
        if (now > addMin(day.shiftEnd, att.LATE_OUT)) { st.count = 0; (state.missed[empNo] = state.missed[empNo] || []).push(d); cur = d; changed = true; continue; }   // the day is over and the punches are not both there
        break;   // the day is still open
      }
      state.cursor[empNo] = cur;
      // a missing punch fixed by the administrator within the window still earns that day's token (the streak is not repaired)
      (state.missed[empNo] || []).slice().forEach((d) => {
        if (d < addDays(t0, -cfg.lateDays)) { state.missed[empNo] = state.missed[empNo].filter((x) => x !== d); changed = true; return; }
        if (this._complete(att.day(empNo, d, now))) { this._add(empNo, 'daily', cfg.daily, { ref: d, date: d, reason: 'Daily token after a corrected punch', by: 'system' }); state.missed[empNo] = state.missed[empNo].filter((x) => x !== d); changed = true; }
      });
      return changed;
    },
    /** brings one worker up to date without announcing it (for a screen that is about to draw) */
    touch(empNo) { if (this.sync(empNo)) save(); },
    syncAll() { let any = false; hr.emps().forEach((e) => { if (this.sync(e.empNo)) any = true; }); if (any) { save(); emit({ type: 'sync-all' }); } return any; },
    streak(empNo) {
      const st = state.streak[empNo] || { count: 0, last: '' }; const ms = state.cfg.milestones; const next = ms.find((m) => m.day > st.count) || null;
      return { count: st.count, last: st.last, next, left: next ? next.day - st.count : 0, milestones: ms.map((m) => ({ ...m, reached: st.count >= m.day })) };
    },
    /** what today looks like for the phone: scheduled or not, punched in, punched out, token already earned */
    today(empNo) {
      const now = att.now(); const d = att.shiftFor(empNo, now) || now.slice(0, 10); const day = att.day(empNo, d, now);
      const earned = state.ledger.some((x) => x.empNo === empNo && x.kind === 'daily' && x.ref === d);
      return { date: d, scheduled: !!(day.expected && !day.leaveFull), leave: !!day.leaveFull, rest: !day.expected, inDone: !!day.inP, outDone: !!day.outP, earned, status: day.status };
    },

    // ---------- referrals ----------
    code(empNo) { return 'R' + hash('ref' + empNo).toString(36).toUpperCase().slice(0, 6).padEnd(6, '0'); },
    referrals(empNo) { return state.refs.filter((r) => !empNo || r.referrer === empNo).sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },
    referralOf(referred) { return state.refs.find((r) => r.referred === referred && r.status !== 'void') || null; },
    validateReferral(referrer, referred) {
      const e = {}; const a = hr.emp(referrer), b = hr.emp(referred);
      if (!a || a.status !== 'active') e.referrer = 'emp'; if (!b || b.status !== 'active') e.referred = 'emp';
      if (!e.referrer && !e.referred) {
        if (referrer === referred) e.referred = 'self';
        else if (this.referralOf(referred)) e.referred = 'already';
        else if (b.joinDate < addDays(today(), -state.cfg.refNewDays)) e.referred = 'old';
        else if (state.refs.some((r) => r.referrer === referred && r.referred === referrer && r.status !== 'void')) e.referred = 'circular';
      }
      return e;
    },
    recordReferral(referrer, referred, by) {
      const e = this.validateReferral(referrer, referred); if (Object.keys(e).length) return { ok: false, errors: e };
      const r = { id: 'RF-' + String(++state.rn).padStart(4, '0'), referrer, referred, at: today(), status: 'pending', rewardedAt: '', by: by || me() }; state.refs.push(r);
      this._referralCheck(referred, null); const ok = save(); emit({ type: 'referral', id: r.id }); bus.emit('spin.referral', { id: r.id, referrer, referred }); return { ok: true, referral: r, persisted: ok };
    },
    voidReferral(id, reason, by) {
      const r = state.refs.find((x) => x.id === id); if (!r) return { ok: false, error: 'missing' }; if (r.status !== 'pending') return { ok: false, error: 'state', status: r.status };
      const why = String(reason || '').trim(); if (why.length < 3) return { ok: false, error: 'reason' }; if (why.length > 160) return { ok: false, error: 'reason_len' };
      r.status = 'void'; r.note = why; r.voidBy = by || me(); const ok = save(); emit({ type: 'referral', id }); return { ok: true, persisted: ok };
    },
    /** called when `empNo` just completed a worked day (date) or a referral was just recorded: pays a pending referral once the friend has a worked day since it was recorded */
    _referralCheck(empNo, date) {
      const r = state.refs.find((x) => x.referred === empNo && x.status === 'pending'); if (!r) return;
      let day = date; if (!day) { const worked = state.ledger.filter((x) => x.empNo === empNo && x.kind === 'daily' && x.ref >= r.at).sort((a, b) => a.ref.localeCompare(b.ref))[0]; if (!worked) return; day = worked.ref; }
      if (day < r.at) return;
      const cfg = state.cfg; const month = day.slice(0, 7); const paidThisMonth = state.refs.filter((x) => x.referrer === r.referrer && x.status === 'rewarded' && x.rewardedAt.slice(0, 7) === month).length;
      this._add(empNo, 'referral', cfg.refReferred, { ref: r.id, date: day, reason: 'Joined through a friend: first worked day' });
      if (paidThisMonth >= cfg.refCap) r.status = 'capped'; else { r.status = 'rewarded'; this._add(r.referrer, 'referral', cfg.refReferrer, { ref: r.id, date: day, reason: 'A friend you invited completed a first worked day' }); }
      r.rewardedAt = day; bus.emit('spin.referral.paid', { id: r.id, status: r.status });
    },

    // ---------- the wheel ----------
    /** cost of a prize against the monthly budget, in S$ (points are valued at the cash rate) */
    prizeCost(p) { if (p.kind === 'points') return money(p.value * wl.rate().cash); if (p.kind === 'course' || p.kind === 'cash') return money(p.value); return 0; },
    spent(month) { return money(state.spins.filter((s) => s.month === month).reduce((n, s) => n + s.cost, 0)); },
    remaining(month) { return money(Math.max(0, state.budget.monthly - this.spent(month || today().slice(0, 7)))); },
    /** which slices can come up for this worker now, and why one cannot */
    eligibility(empNo, date) {
      const month = (date || today()).slice(0, 7); const left = this.remaining(month);
      return state.prizes.map((p, i) => {
        let why = ''; const cost = this.prizeCost(p);
        if (!(p.weight > 0)) why = 'weight'; else if (p.cap > 0 && state.spins.filter((s) => s.empNo === empNo && s.month === month && s.prizeId === p.id).length >= p.cap) why = 'cap'; else if (cost > 0 && cost > left + 1e-9) why = 'budget';
        return { prize: p, index: i, cost, why, ok: !why };
      });
    },
    /** spends the tokens, draws the slice, pays the prize into the wallet. opt.rng and opt.at are for tests and the seeded history */
    spin(empNo, opt = {}) {
      const e = hr.emp(empNo); if (!e || e.status !== 'active') return { ok: false, error: 'emp' };
      this.sync(empNo); const cost = state.cfg.spinCost; if (this.balance(empNo) < cost) return { ok: false, error: 'tokens' };
      const at = opt.at || stamp(); const date = at.slice(0, 10); const el = this.eligibility(empNo, date); const pool = el.filter((x) => x.ok); const total = pool.reduce((n, x) => n + x.prize.weight, 0);
      if (!pool.length) return { ok: false, error: 'nopool' };
      const rng = opt.rng || Math.random; let x = rng() * total; let pick = pool[pool.length - 1]; for (const c of pool) { if (x < c.prize.weight) { pick = c; break; } x -= c.prize.weight; }
      const p = pick.prize; const id = 'SP-' + date.slice(0, 4) + '-' + String(++state.sn).padStart(4, '0');
      this._add(empNo, 'spin', -cost, { ref: id, date, at, reason: 'Spin', by: empNo });
      const sp = { id, empNo, at, date, month: date.slice(0, 7), prizeId: p.id, index: pick.index, kind: p.kind, value: p.value, cost: pick.cost, tokens: cost, odds: money(p.weight / total * 100) };
      state.spins.push(sp);
      if (p.kind === 'points') wl.grant(empNo, { points: p.value, ref: id }, empNo);
      else if (p.kind === 'course') wl.grant(empNo, { cc: p.value, ref: id }, empNo);
      else if (p.kind === 'cash') { const r = wl.grant(empNo, { cash: p.value, ref: id }, empNo); if (r.ok) sp.code = r.entry.code; }
      else if (p.kind === 'spin') this._add(empNo, 'prize', p.value, { ref: id, date, at, reason: 'Bonus spin', by: 'system' });
      const ok = save(); emit({ type: 'spin', id, empNo }); bus.emit('spin.played', { id, empNo, kind: p.kind, value: p.value }); return { ok: true, spin: sp, prize: p, index: pick.index, balance: this.balance(empNo), persisted: ok };
    },
    /** administrator adds or removes tokens by hand, with a reason */
    adjust(empNo, tokens, reason, by) {
      const e = hr.emp(empNo); if (!e || e.status !== 'active') return { ok: false, errors: { empNo: 'emp' } }; const n = Number(tokens); const err = {};
      if (!Number.isInteger(n) || n === 0 || Math.abs(n) > 50) err.tokens = 'adjTokens'; else if (n < 0 && this.balance(empNo) + n < 0) err.tokens = 'below';
      const why = String(reason || '').trim(); if (why.length < 3) err.reason = 'reason'; else if (why.length > 200) err.reason = 'reason_len';
      if (Object.keys(err).length) return { ok: false, errors: err };
      const row = this._add(empNo, 'adjust', n, { reason: why, by: by || me() }); const ok = save(); emit({ type: 'adjust', empNo }); return { ok: true, entry: row, persisted: ok };
    },

    // ---------- the rules ----------
    validateConfig(d) {
      const e = {}; const int = (v, lo, hi) => Number.isInteger(Number(v)) && String(v).trim() !== '' && Number(v) >= lo && Number(v) <= hi;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.start || '')) e.start = 'date'; else if (d.start > today()) e.start = 'future';
      if (!int(d.daily, 1, 5)) e.daily = 'daily'; if (!int(d.spinCost, 1, 5)) e.spinCost = 'cost';
      if (!int(d.refReferrer, 0, 20)) e.refReferrer = 'tokens'; if (!int(d.refReferred, 0, 20)) e.refReferred = 'tokens'; if (!int(d.refCap, 1, 50)) e.refCap = 'cap'; if (!int(d.refNewDays, 1, 365)) e.refNewDays = 'days';
      const ms = d.milestones || []; if (!ms.length || ms.length > 6) e.milestones = 'count';
      ms.forEach((m, i) => { if (!int(m.day, 2, 365)) e['m' + i + 'd'] = 'day'; else if (i && Number(m.day) <= Number(ms[i - 1].day)) e['m' + i + 'd'] = 'order'; if (!int(m.tokens, 1, 20)) e['m' + i + 't'] = 'tokens'; });
      return e;
    },
    saveConfig(d) {
      const e = this.validateConfig(d); if (Object.keys(e).length) return { ok: false, errors: e };
      state.cfg = { start: d.start, daily: +d.daily, spinCost: +d.spinCost, refReferrer: +d.refReferrer, refReferred: +d.refReferred, refCap: +d.refCap, refNewDays: +d.refNewDays, lateDays: state.cfg.lateDays, milestones: d.milestones.map((m) => ({ day: +m.day, tokens: +m.tokens })) };
      const ok = save(); emit({ type: 'config' }); return { ok: true, persisted: ok };
    },
    validatePrizes(list, monthly) {
      const e = {}; if (!Array.isArray(list) || list.length !== SLICES) { e.count = 'count'; return e; }
      list.forEach((p, i) => {
        if (!KINDS.includes(p.kind)) e['k' + i] = 'kind'; const v = Number(p.value);
        if (p.kind === 'points' && !(Number.isInteger(v) && v >= 1 && v <= 2000)) e['v' + i] = 'points';
        else if ((p.kind === 'course' || p.kind === 'cash') && !(v >= 0.5 && v <= 100 && Math.round(v * 2) === v * 2)) e['v' + i] = 'money';
        else if (p.kind === 'spin' && !(Number.isInteger(v) && v >= 1 && v <= 3)) e['v' + i] = 'spins';
        const w = Number(p.weight); if (!(w >= 0 && w <= 1000) || String(p.weight).trim() === '') e['w' + i] = 'weight';
        const c = Number(p.cap); if (!(Number.isInteger(c) && c >= 0 && c <= 20)) e['c' + i] = 'cap';
        if (String(p.zh || '').length > 24 || String(p.en || '').length > 24) e['n' + i] = 'name';
      });
      if (!Object.keys(e).length) {
        const tot = list.reduce((n, p) => n + Number(p.weight), 0); if (!(tot > 0)) e.total = 'total';
        else if (!list.some((p) => (p.kind === 'none' || p.kind === 'spin') && Number(p.weight) > 0)) e.total = 'free';
      }
      const m = Number(monthly); if (!(m >= 0 && m <= 100000) || String(monthly).trim() === '') e.monthly = 'monthly';
      return e;
    },
    savePrizes(list, monthly) {
      const e = this.validatePrizes(list, monthly); if (Object.keys(e).length) return { ok: false, errors: e };
      state.prizes = list.map((p, i) => ({ id: state.prizes[i].id, kind: p.kind, value: p.kind === 'none' ? 0 : Number(p.value), weight: Number(p.weight), cap: Number(p.cap), zh: String(p.zh || '').trim(), en: String(p.en || '').trim(), img: state.prizes[i].img, color: state.prizes[i].color }));
      state.budget = { monthly: money(Number(monthly)) }; const ok = save(); emit({ type: 'prizes' }); return { ok: true, persisted: ok };
    },
    /** the chance of each slice and what one spin costs on average, from the weights (slices that cannot come up are not counted) */
    odds(list, empNo) {
      const el = list ? list.map((p, i) => ({ prize: p, index: i, cost: this.prizeCost(p), ok: Number(p.weight) > 0 })) : this.eligibility(empNo || '', today()); const tot = el.filter((x) => x.ok).reduce((n, x) => n + Number(x.prize.weight), 0);
      return el.map((x) => ({ ...x, pct: x.ok && tot ? Number(x.prize.weight) / tot * 100 : 0 })).map((x, _, a) => ({ ...x, expected: a.reduce((n, y) => n + y.pct / 100 * y.cost, 0) }));
    },
    expectedCost(list) { const o = this.odds(list); return o.length ? money(o[0].expected) : 0; },

    // ---------- the report ----------
    report(month) {
      const m = month || today().slice(0, 7); const rows = state.spins.filter((s) => s.month === m); const spent = money(rows.reduce((n, s) => n + s.cost, 0)); const budget = state.budget.monthly;
      const byPrize = state.prizes.map((p) => { const r = rows.filter((s) => s.prizeId === p.id); return { prize: p, count: r.length, cost: money(r.reduce((n, s) => n + s.cost, 0)) }; });
      const led = state.ledger.filter((x) => x.at.slice(0, 7) === m);   // by the day the token was issued
      const earned = led.filter((x) => x.tokens > 0 && x.kind !== 'prize').reduce((n, x) => n + x.tokens, 0); const byKind = {}; led.filter((x) => x.tokens > 0 && x.kind !== 'prize').forEach((x) => { byKind[x.kind] = (byKind[x.kind] || 0) + x.tokens; });
      const per = {}; rows.forEach((s) => { per[s.empNo] = per[s.empNo] || { empNo: s.empNo, spins: 0, cost: 0 }; per[s.empNo].spins++; per[s.empNo].cost = money(per[s.empNo].cost + s.cost); });
      return { month: m, budget, spent, remaining: money(Math.max(0, budget - spent)), pct: budget ? Math.min(100, Math.round(spent / budget * 100)) : 0, spins: rows.length, tokensEarned: earned, tokensByKind: byKind, tokensSpent: -led.filter((x) => x.kind === 'spin').reduce((n, x) => n + x.tokens, 0), outstanding: state.ledger.reduce((n, x) => n + x.tokens, 0), byPrize, workers: Object.values(per).sort((a, b) => b.cost - a.cost || b.spins - a.spins), rows: rows.slice().sort((a, b) => b.at.localeCompare(a.at)) };
    },
    months() { const set = new Set([today().slice(0, 7), ...state.spins.map((s) => s.month)]); return [...set].sort().reverse(); },
    reset() { seed(); save(); emit({ type: 'reset' }); },
  };
  BS.spin = S;

  function seed() {
    const t0 = today(); state = { v: 1, cfg: seedConfig(t0), prizes: seedPrizes(), budget: { monthly: 500 }, ledger: [], spins: [], cursor: {}, streak: {}, missed: {}, refs: [], n: 0, sn: 0, rn: 0 };
    // a friend of 张强 who joined recently; paid out when SG-0401 has a worked day since
    const ref = (a, b, off) => { const e = S.validateReferral(a, b); if (!Object.keys(e).length) state.refs.push({ id: 'RF-' + String(++state.rn).padStart(4, '0'), referrer: a, referred: b, at: addDays(t0, off), status: 'pending', rewardedAt: '', by: 'admin' }); };
    ref('SG-0312', 'SG-0401', -6);
    hr.emps().forEach((e) => S.sync(e.empNo));
    // some history so the report has something in it: two spins each for a few workers who have tokens
    let k = 0; hr.emps().forEach((e) => { if (k >= 6) return; if (S.balance(e.empNo) >= 2) { const rng = mulberry(hash('spin' + e.empNo)); for (let i = 0; i < 2; i++) S.spin(e.empNo, { rng, at: `${t0} ${i ? '07:40' : '07:05'}` }); k++; } });
  }
  state = load();
  if (!state) { seed(); save(); }
  // a punch or a correction on the attendance side can complete a day
  att.subscribe((ev) => { if (ev && (ev.type === 'punch' || ev.type === 'adjust') && ev.empNo && state) { if (S.sync(ev.empNo)) { save(); emit({ type: 'sync', empNo: ev.empNo }); } } });
})(window.BS);
