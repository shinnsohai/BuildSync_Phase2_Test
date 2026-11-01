/* Attendance: groups (shift rules), punches, the per-day evaluation engine, admin adjustments and seeded history. */
(function (BS) {
  const KEY = 'bs_att_proto_v1';
  const GRACE = 5;                 // minutes of tolerance for late / early (from the designs' samples: 08:04 normal, 08:17 late 17 min)
  const EARLY_IN = 120, LATE_OUT = 240;   // how early a punch-in / how late a punch-out is still attributed to a shift (minutes)
  const SEED_DAYS = 100;
  const listeners = new Set();
  const pad = (n) => String(n).padStart(2, '0');
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return iso(x); };
  const ms = (s) => new Date(s).getTime();
  const diffMin = (a, b) => Math.round((ms(a) - ms(b)) / 60000);
  const hm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
  const tmin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
  const addMin = (s, n) => { const d = new Date(s); d.setMinutes(d.getMinutes() + n); return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
  const rnd = (n, unit, dir) => (!unit || unit <= 1 ? n : dir === 'down' ? Math.floor(n / unit) * unit : dir === 'up' ? Math.ceil(n / unit) * unit : Math.round(n / unit) * unit);
  const real = () => BS.fmt.now().slice(0, 16);

  const day = (start, end, brk = 'auto') => ({ on: true, start, end, brk, brkFrom: '12:00', brkTo: '13:00', brkMin: 60 });
  function seedGroups() {
    return [
      { id: 'g-day1', nameZh: '白班一组', nameEn: 'Day Shift Group 1', projectKey: 'raffles', siteKey: 'towerA', days: { weekday: day('08:00', '17:00'), sat: { ...day('08:00', '12:00', 'none') }, sun: { ...day('08:00', '17:00'), on: false }, special: { ...day('09:00', '18:00'), on: false, dates: [] } }, round: { unit: 15, dir: 'nearest' } },
      { id: 'g-day2', nameZh: '白班二组', nameEn: 'Day Shift Group 2', projectKey: 'raffles', siteKey: 'towerB', days: { weekday: day('08:00', '17:00', 'fixed'), sat: day('08:00', '17:00', 'fixed'), sun: { ...day('08:00', '17:00'), on: false }, special: { ...day('09:00', '18:00'), on: false, dates: [] } }, round: { unit: 5, dir: 'down' } },
      { id: 'g-night', nameZh: '夜班一组', nameEn: 'Night Shift Group 1', projectKey: 'maritime', siteKey: 'a1', days: { weekday: day('22:00', '06:00', 'none'), sat: { ...day('22:00', '06:00', 'none'), on: false }, sun: { ...day('22:00', '06:00', 'none'), on: false }, special: { ...day('22:00', '06:00', 'none'), on: false, dates: [] } }, round: { unit: 1, dir: 'nearest' } },
      { id: 'g-m2', nameZh: '白班三组', nameEn: 'Day Shift Group 3', projectKey: 'maritime', siteKey: 'b2', days: { weekday: day('08:00', '17:00', 'fixed'), sat: day('08:00', '12:00', 'none'), sun: { ...day('08:00', '17:00'), on: false }, special: { ...day('09:00', '18:00'), on: false, dates: [] } }, round: { unit: 15, dir: 'nearest' } },
      { id: 'g-flex', nameZh: '机动考勤组', nameEn: 'Flexible Group', projectKey: 'jurong', siteKey: 'bay', days: { weekday: day('08:00', '17:00'), sat: day('08:00', '12:00', 'none'), sun: { ...day('08:00', '17:00'), on: false }, special: { ...day('09:00', '18:00'), on: false, dates: [] } }, round: { unit: 30, dir: 'down' } },
    ];
  }

  let punchSeq = 0; const pid = () => 'p' + (++punchSeq).toString(36) + Math.random().toString(36).slice(2, 5);
  function seedPunches(groups) {
    const out = []; const t0 = real().slice(0, 10); const nowStr = real();
    BS.hr.emps().forEach((e) => {
      if (!e.assigns.length) return; const g = groups.find((x) => x.projectKey === e.assigns[0].projectKey && x.siteKey === e.assigns[0].siteKey); if (!g) return;
      for (let i = SEED_DAYS; i >= 0; i--) {
        const d = addDays(t0, -i); const pl = planOf(g, d); if (!pl) continue;
        if (d < e.joinDate || (e.disabledAt && d > e.disabledAt.slice(0, 10))) continue;
        const r = mulberry(hash(e.empNo + d)); const sStart = `${d}T${pl.p.start}`; const cross = tmin(pl.p.end) <= tmin(pl.p.start); const sEnd = `${cross ? addDays(d, 1) : d}T${pl.p.end}`;
        // skip days fully covered by approved leave (seeded requests)
        if (leaveOverlap(e.empNo, sStart, sEnd) >= diffMin(sEnd, sStart)) continue;
        const roll = r();
        if (roll < 0.012) continue;                                               // absent
        let inMin = -Math.floor(r() * 9) + 3, outMin = Math.floor(r() * 21), geoIn = 'in', geoOut = 'in', skipOut = false;
        if (roll < 0.06) inMin = 8 + Math.floor(r() * 28);                        // late
        else if (roll < 0.09) outMin = -(12 + Math.floor(r() * 48));              // early
        else if (roll < 0.115) skipOut = true;                                    // missing out
        else if (roll < 0.135) geoIn = 'out';                                     // outside fence
        else if (roll < 0.30 && pl.type === 'weekday') outMin = 60 + Math.floor(r() * 120);   // overtime
        const inAt = addMin(sStart, inMin), outAt = addMin(sEnd, outMin);
        if (inAt > nowStr) continue;
        out.push({ id: pid(), empNo: e.empNo, shiftDate: d, type: 'in', at: inAt, geo: geoIn, valid: true, src: 'seed' });
        if (!skipOut && outAt <= nowStr) out.push({ id: pid(), empNo: e.empNo, shiftDate: d, type: 'out', at: outAt, geo: geoOut, valid: true, src: 'seed' });
      }
    });
    return out;
  }
  function seed() {
    const groups = seedGroups(); state = { v: 1, groups, punches: [], adjusts: [] }; // planOf needs groups only; leaveOverlap reads leaveReq
    state.punches = seedPunches(groups); return state;
  }

  let state = null;
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.groups) return s; } } catch (e) { /* fall through */ } return null; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) {
      state.punches = state.punches.filter((p) => p.shiftDate >= addDays(real().slice(0, 10), -35)); try { localStorage.setItem(KEY, JSON.stringify(state)); BS.warnStorage && BS.warnStorage(); return true; } catch (e2) { return false; }
    }
  }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load() || state; emit({ type: 'sync' }); } });

  /** plan for a date: {type, p} or null (rest). type is 'special' when the date is listed in the group's special dates. */
  function planOf(g, date) {
    const sp = g.days.special; if (sp && sp.on && (sp.dates || []).includes(date)) return { type: 'special', p: sp };
    const wd = parse(date).getDay(); const type = wd === 0 ? 'sun' : wd === 6 ? 'sat' : 'weekday'; const p = g.days[type];
    return p && p.on ? { type, p } : null;
  }
  /** minutes of approved leave overlapping [a,b] */
  function leaveOverlap(empNo, a, b) {
    if (!BS.leaveReq) return 0; let total = 0; const rs = BS.leaveReq.all().filter((r) => r.empNo === empNo && r.status === 'approved' && r.start < b && a < r.end).sort((x, y) => x.start.localeCompare(y.start)); let cursor = a;
    rs.forEach((r) => { const s = r.start > cursor ? r.start : cursor; const e2 = r.end < b ? r.end : b; if (e2 > s) { total += diffMin(e2, s); cursor = e2; } }); return total;
  }

  BS.att = {
    GRACE, EARLY_IN, LATE_OUT, addDays, hm,
    sim: { time: '', geo: 'in', face: 'ok' },                    // prototype-only controls on the phone
    now() { return this.sim.time ? `${real().slice(0, 10)}T${this.sim.time}` : real(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    groups() { return state.groups; },
    group(id) { return state.groups.find((g) => g.id === id) || null; },
    groupOf(emp) { const a = emp.assigns[0]; return a ? state.groups.find((g) => g.projectKey === a.projectKey && g.siteKey === a.siteKey) || null : null; },
    punches() { return state.punches; },
    adjusts(empNo, date) { return state.adjusts.filter((a) => a.empNo === empNo && a.shiftDate === date).sort((a, b) => b.at.localeCompare(a.at)); },
    planOf,

    // ---------- group CRUD ----------
    validateGroup(d, id) {
      const e = {}; if (!String(d.nameZh || '').trim()) e.nameZh = 'nameZh'; if (!String(d.nameEn || '').trim()) e.nameEn = 'nameEn';
      if (!d.projectKey) e.projectKey = 'project'; if (!d.siteKey) e.siteKey = 'site';
      else if (state.groups.some((g) => g.id !== id && g.projectKey === d.projectKey && g.siteKey === d.siteKey)) e.siteKey = 'site_dup';
      if (state.groups.some((g) => g.id !== id && g.nameZh === String(d.nameZh).trim())) e.nameZh = 'name_dup';
      ['weekday', 'sat', 'sun', 'special'].forEach((k) => {
        const p = d.days[k]; if (!p.on) return;
        if (!/^\d{2}:\d{2}$/.test(p.start || '') || !/^\d{2}:\d{2}$/.test(p.end || '')) { e['days.' + k] = 'time'; return; }
        if (p.start === p.end) { e['days.' + k] = 'same'; return; }
        const len = (tmin(p.end) - tmin(p.start) + 1440) % 1440; if (len > 16 * 60) { e['days.' + k] = 'long'; return; }
        if (p.brk !== 'none') { if (!/^\d{2}:\d{2}$/.test(p.brkFrom || '') || !/^\d{2}:\d{2}$/.test(p.brkTo || '') || !(+p.brkMin > 0) || +p.brkMin > 180) e['days.' + k] = 'brk'; else if (+p.brkMin > len) e['days.' + k] = 'brk_long'; }
        if (k === 'special' && !(p.dates || []).length) e['days.special'] = 'dates';
      });
      if (![1, 5, 15, 30].includes(+d.round.unit)) e.round = 'round';
      return e;
    },
    saveGroup(d, id) {
      const e = this.validateGroup(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const clean = JSON.parse(JSON.stringify(d)); clean.round.unit = +clean.round.unit; ['weekday', 'sat', 'sun', 'special'].forEach((k) => { clean.days[k].brkMin = +clean.days[k].brkMin; });
      let g = id && this.group(id); if (g) Object.assign(g, clean, { id }); else { g = { ...clean, id: 'g-' + Date.now().toString(36) }; state.groups.push(g); }
      const ok = save(); emit({ type: 'group', id: g.id }); return { ok: true, group: g, persisted: ok };
    },
    groupUsers(id) { const g = this.group(id); return g ? BS.hr.emps().filter((e) => e.status === 'active' && e.assigns[0] && e.assigns[0].projectKey === g.projectKey && e.assigns[0].siteKey === g.siteKey).length : 0; },
    removeGroup(id) { const n = this.groupUsers(id); if (n) return { ok: false, error: 'used', n }; state.groups = state.groups.filter((g) => g.id !== id); save(); emit({ type: 'group', id }); return { ok: true }; },

    // ---------- evaluation ----------
    /** expected attendance + evaluated state of one employee on one shift date */
    day(empNo, date, nowStr) {
      const now = nowStr || this.now(); const e = BS.hr.emp(empNo); const g = e && this.groupOf(e);
      const base = { empNo, date, group: g, expected: false, status: 'none' };
      if (!e || !g) return base; const pl = planOf(g, date); if (!pl) return { ...base, status: 'rest' };
      if (date < e.joinDate || (e.leaveDate && date > e.leaveDate) || (e.disabledAt && date > e.disabledAt.slice(0, 10))) return { ...base, status: 'none' };
      const cross = tmin(pl.p.end) <= tmin(pl.p.start); const sStart = `${date}T${pl.p.start}`; const sEnd = `${cross ? addDays(date, 1) : date}T${pl.p.end}`; const shiftMin = diffMin(sEnd, sStart);
      const leaveMin = leaveOverlap(empNo, sStart, sEnd);
      const rec = state.punches.filter((p) => p.empNo === empNo && p.shiftDate === date && p.at <= now);   // punches after `now` (simulated clock) haven't happened yet
      const ins = rec.filter((p) => p.type === 'in' && p.valid), outs = rec.filter((p) => p.type === 'out' && p.valid);
      const inP = ins.sort((a, b) => b.at.localeCompare(a.at))[0] || null, outP = outs.sort((a, b) => b.at.localeCompare(a.at))[0] || null;
      const out = { ...base, expected: true, plan: pl, type: pl.type, shiftStart: sStart, shiftEnd: sEnd, cross, shiftMin, leaveMin, inP, outP, invalid: rec.filter((p) => !p.valid), punches: rec.slice().sort((a, b) => a.at.localeCompare(b.at)), flags: [] };
      if (leaveMin >= shiftMin - 1) { out.status = 'leave'; out.leaveFull = true; return out; }
      const future = now < addMin(sStart, -EARLY_IN);
      // sign-in
      if (inP) { const late = diffMin(inP.at, sStart); out.inState = late > GRACE ? 'late' : 'ok'; out.lateMin = late > GRACE ? late : 0; if (inP.geo === 'out') out.flags.push('outsideIn'); }
      else out.inState = now > addMin(sStart, GRACE) ? (now >= sEnd ? 'missing' : 'pending') : 'pending';
      // sign-out
      if (outP) { const early = diffMin(sEnd, outP.at); out.outState = early > GRACE ? 'early' : 'ok'; out.earlyMin = early > GRACE ? early : 0; if (outP.geo === 'out') out.flags.push('outsideOut'); }
      else out.outState = now >= sEnd ? 'missing' : 'notyet';
      if (!inP && !outP && now < sStart) { out.status = future ? 'future' : 'pending'; return out; }
      if (out.inState === 'missing' || out.outState === 'missing') out.status = 'missing';
      else if (out.flags.length) out.status = 'outside';
      else if (out.inState === 'late') out.status = 'late';
      else if (out.outState === 'early') out.status = 'early';
      else if (!inP) out.status = 'pending';
      else out.status = 'normal';
      // worked time: sign-out - sign-in - break - leave, rounded by the group rule
      if (inP && outP && outP.at > inP.at) {
        const raw = diffMin(outP.at, inP.at); let brk = 0; const p = pl.p;
        if (p.brk === 'fixed') brk = raw >= +p.brkMin ? +p.brkMin : 0;
        else if (p.brk === 'auto') { const bs = `${date}T${p.brkFrom}`, be = `${date}T${p.brkTo}`; const a = inP.at > bs ? inP.at : bs, b = outP.at < be ? outP.at : be; brk = b > a ? Math.min(diffMin(b, a), +p.brkMin) : 0; }
        const lv = leaveOverlap(empNo, inP.at, outP.at); out.rawMin = raw; out.breakMin = brk; out.workMin = Math.max(0, rnd(raw - brk - lv, g.round.unit, g.round.dir));
      } else out.workMin = 0;
      return out;
    },
    /** employees expected on a date, evaluated */
    daily(date, filters = {}) {
      return BS.hr.emps().map((e) => this.day(e.empNo, date)).filter((d) => d.expected && (!filters.projectKey || (d.group && d.group.projectKey === filters.projectKey)) && (!filters.siteKey || (d.group && d.group.siteKey === filters.siteKey)) && (!filters.groupId || (d.group && d.group.id === filters.groupId)));
    },
    monthly(month, filters = {}) {
      const days = []; for (let d = `${month}-01`; d.slice(0, 7) === month; d = addDays(d, 1)) days.push(d); const t0 = real().slice(0, 10);
      return BS.hr.emps().map((e) => {
        const list = days.filter((d) => d <= t0).map((d) => this.day(e.empNo, d)).filter((x) => x.expected);
        const c = { empNo: e.empNo, month, expected: list.length, normal: 0, late: 0, early: 0, missing: 0, outside: 0, leave: 0, pending: 0, hours: 0, days: list };
        list.forEach((x) => { if (c[x.status] != null) c[x.status]++; c.hours += (x.workMin || 0) / 60; });
        return c;
      }).filter((c) => c.expected > 0).filter((c) => { const e = BS.hr.emp(c.empNo); const g = this.groupOf(e); return (!filters.projectKey || (g && g.projectKey === filters.projectKey)) && (!filters.siteKey || (g && g.siteKey === filters.siteKey)); });
    },

    // ---------- punching ----------
    /** which shift (date) a punch at `at` belongs to, or null */
    shiftFor(empNo, at) {
      const e = BS.hr.emp(empNo); const g = e && this.groupOf(e); if (!g) return null;
      for (const d of [at.slice(0, 10), addDays(at.slice(0, 10), -1)]) {
        const pl = planOf(g, d); if (!pl) continue; const cross = tmin(pl.p.end) <= tmin(pl.p.start); const s = `${d}T${pl.p.start}`, en = `${cross ? addDays(d, 1) : d}T${pl.p.end}`;
        if (at >= addMin(s, -EARLY_IN) && at <= addMin(en, LATE_OUT)) return d;
      } return null;
    },
    /** the shift the phone should show right now: today's, or yesterday's if its window is still open */
    currentShift(empNo, nowStr) { const n = nowStr || this.now(); return this.shiftFor(empNo, n) || this.nextShift(empNo, n); },
    /** first shift (today or later) that has not finished yet, for showing "next shift" on the phone */
    nextShift(empNo, n) {
      const e = BS.hr.emp(empNo); const g = e && this.groupOf(e); if (!g) return null;
      for (let i = 0; i < 9; i++) { const d = addDays(n.slice(0, 10), i); const pl = planOf(g, d); if (!pl) continue; const cross = tmin(pl.p.end) <= tmin(pl.p.start); const en = `${cross ? addDays(d, 1) : d}T${pl.p.end}`; if (addMin(en, LATE_OUT) >= n) return d; }
      return null;
    },

    punch(empNo, type, { geo = 'in', face = true, src = 'worker', at } = {}) {
      const e = BS.hr.emp(empNo); if (!e || e.status !== 'active') return { ok: false, error: 'disabled' };
      const when = at || this.now(); const d = this.shiftFor(empNo, when); if (!d) return { ok: false, error: 'no_shift' };
      const cur = this.day(empNo, d, when); if (cur.leaveFull) return { ok: false, error: 'on_leave' };
      if (!face) return { ok: false, error: 'face' };
      // the site's own rules: a stopped site takes no punches, and some sites do not accept punches outside the fence
      const site = src === 'worker' && e.assigns[0] ? BS.hr.site(e.assigns[0].siteKey) : null;
      if (site && !site.active) return { ok: false, error: 'site_off' };
      if (site && geo === 'out' && !site.allowOutside) return { ok: false, error: 'outside_denied' };
      const rec = state.punches.filter((p) => p.empNo === empNo && p.shiftDate === d && p.valid && p.type === type);
      if (type === 'in' && rec.length) return { ok: false, error: 'already_in' };
      if (type === 'out' && cur.inP && when <= cur.inP.at) return { ok: false, error: 'before_in' };
      const p = { id: pid(), empNo, shiftDate: d, type, at: when, geo, valid: true, src, face: true };
      let replaced = null; if (type === 'out' && rec.length) { replaced = rec[0]; replaced.valid = false; replaced.replacedBy = p.id; }
      state.punches.push(p); const ok = save(); emit({ type: 'punch', empNo, date: d });
      return { ok: true, punch: p, replaced: !!replaced, day: this.day(empNo, d, when), persisted: ok };
    },
    /** admin correction: new sign-in and/or sign-out time (full 'YYYY-MM-DDTHH:mm'); old punches stay but are marked invalid */
    adjust(empNo, date, { inAt, outAt, reason, by = 'admin' }) {
      const why = String(reason || '').trim(); if (!why) return { ok: false, error: 'reason' }; if (why.length > 200) return { ok: false, error: 'reason_len' };
      const cur = this.day(empNo, date); if (!cur.expected) return { ok: false, error: 'none' };
      const okT = (s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s || '');
      const nIn = inAt || (cur.inP && cur.inP.at), nOut = outAt || (cur.outP && cur.outP.at);
      if ((inAt && !okT(inAt)) || (outAt && !okT(outAt))) return { ok: false, error: 'time' };
      if (nIn && nOut && nOut <= nIn) return { ok: false, error: 'order' };
      const changes = []; const at = BS.fmt.now().slice(0, 16).replace('T', ' ');
      const apply = (type, newAt, curP, label) => { if (!newAt || (curP && curP.at === newAt)) return; if (curP) { curP.valid = false; curP.note = 'adjusted'; } const p = { id: pid(), empNo, shiftDate: date, type, at: newAt, geo: 'in', valid: true, src: 'admin', face: true }; state.punches.push(p); changes.push({ field: label, from: curP ? curP.at : null, to: newAt }); };
      apply('in', inAt, cur.inP, 'in'); apply('out', outAt, cur.outP, 'out');
      if (!changes.length) return { ok: false, error: 'nochange' };
      state.adjusts.push({ id: 'a' + Date.now().toString(36), empNo, shiftDate: date, at, by, reason: why, changes });
      const ok = save(); emit({ type: 'adjust', empNo, date }); return { ok: true, persisted: ok, day: this.day(empNo, date) };
    },

    /** what the day would look like with these sign-in / sign-out times (nothing is saved) */
    preview(empNo, date, { inAt, outAt }) {
      const keep = state.punches; const copy = keep.map((p) => ({ ...p }));
      const swap = (type, at) => { if (!at) return; copy.forEach((p) => { if (p.empNo === empNo && p.shiftDate === date && p.type === type && p.valid) p.valid = false; }); copy.push({ id: 'tmp', empNo, shiftDate: date, type, at, geo: 'in', valid: true, src: 'admin' }); };
      swap('in', inAt); swap('out', outAt); state.punches = copy;
      try { return this.day(empNo, date); } finally { state.punches = keep; }
    },

    reset() { seed(); save(); emit({ type: 'reset' }); },
    init() { state = load(); if (!state) { seed(); save(); } },
  };
  // seeding needs the roster and leave requests, so initialise lazily on first use after those stores exist
  BS.att.init();
})(window.BS);
