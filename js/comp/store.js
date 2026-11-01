/* Compliance engine: answers "can this person work on site today?" from documents and certificates held in the personnel master.
   Pure derivation: nothing about an individual is stored here, only the rule table. When the answer for a person changes, 'compliance.changed' goes on the bus.
   Phase 2 modules (permits to work, gate, bookings) ask this engine instead of re-reading passports and certificates themselves. */
(function (BS) {
  const KEY = 'bs_comp_proto_v1';
  const hr = BS.hr;
  const listeners = new Set();
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const today = () => BS.fmt.now().slice(0, 10);
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const daysTo = (date, from) => Math.round((parse(date) - parse(from)) / 86400000);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');

  // the kinds of work a permit can be issued for; each can demand certificates on top of the base requirements
  const PERMIT_TYPES = [
    { id: 'hot_work', zh: '动火作业', en: 'Hot work (welding / cutting)' },
    { id: 'work_height', zh: '高处作业（>2 米）', en: 'Work at height (>2 m)' },
    { id: 'heavy_lift', zh: '重型吊装', en: 'Heavy lifting' },
    { id: 'confined_space', zh: '密闭空间作业', en: 'Confined space' },
    { id: 'general', zh: '一般作业', en: 'General works' },
  ];

  function seed() {
    return {
      v: 1, updatedAt: '2026-08-12 09:00',
      base: { passport: { on: true, soonDays: 60 }, pass: { on: true, soonDays: 30 }, certs: [{ type: 'CSOC', on: true, soonDays: 30 }] },
      permits: { hot_work: ['WELDER'], work_height: ['WORK-HEIGHT'], heavy_lift: ['CRANE'], confined_space: [], general: [] },
    };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.base && s.permits) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); refresh(); } });

  /** one document check: no date → missing; before the date → expired; within soonDays → soon */
  function check(kind, expiry, soonDays, date, extra) {
    if (!expiry) return { bad: { kind, status: 'missing', ...extra } };
    const days = daysTo(expiry, date);
    if (days < 0) return { bad: { kind, status: 'expired', expiry, days, ...extra } };
    if (days <= soonDays) return { warn: { kind, status: 'soon', expiry, days, ...extra } };
    return {};
  }

  const COMP = {
    PERMIT_TYPES,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    rules() { return state; },
    permitType(id) { return PERMIT_TYPES.find((p) => p.id === id) || null; },
    /** certificate codes a permit type demands, besides the base requirements */
    permitCerts(id) { return (state.permits[id] || []).slice(); },

    /** opts: { date, permit: permit type id, leaveBlocks: treat approved/pending leave on the day as a reason }
        → { ok, reasons: [{kind, status, type?, ref?, expiry?, days?}], warnings: [same], onLeave: request|null }
        kind: inactive | passport | pass | cert | leave. ok means no reason; warnings are documents about to lapse. */
    fit(emp, opts = {}) {
      const date = opts.date || today(); const reasons = [], warnings = []; if (!emp) return { ok: false, reasons: [{ kind: 'inactive', status: 'missing' }], warnings, onLeave: null };
      const put = (r) => { if (r.bad) reasons.push(r.bad); if (r.warn) warnings.push(r.warn); };
      if (emp.status !== 'active') reasons.push({ kind: 'inactive', status: 'expired' });
      if (emp.idType === 'fin') {
        const b = state.base;
        if (b.passport.on) put(check('passport', emp.passportExpiry, b.passport.soonDays, date, { ref: emp.passportNo || '' }));
        if (b.pass.on) put(check('pass', emp.passExpiry, b.pass.soonDays, date, { ref: emp.wpNo || '', passType: emp.passType || '' }));
      }
      const need = [...state.base.certs.filter((c) => c.on).map((c) => [c.type, c.soonDays]), ...(opts.permit ? this.permitCerts(opts.permit).map((c) => [c, hr.SOON_DAYS]) : [])];
      const seen = new Set();
      need.forEach(([type, soon]) => {
        if (seen.has(type)) return; seen.add(type);
        const c = emp.certs.find((x) => x.type === type);
        put(c ? check('cert', c.expiry || '9999-12-31', soon, date, { type, ref: c.no }) : { bad: { kind: 'cert', status: 'missing', type } });
      });
      const lv = BS.leaveReq && BS.leaveReq.overlap(emp.empNo, `${date}T00:00`, `${date}T23:59`) || null;
      if (lv && opts.leaveBlocks) reasons.push({ kind: 'leave', status: lv.status, ref: lv.id });
      return { ok: reasons.length === 0, reasons, warnings, onLeave: lv };
    },
    /** 'blocked' | 'soon' | 'ok' — what a badge shows */
    status(emp, opts) { const f = this.fit(emp, opts); return !f.ok ? 'blocked' : f.warnings.length ? 'soon' : 'ok'; },
    /** the people on the roster with their result, active people only unless all=true */
    scan(opts = {}) { return hr.emps().filter((e) => opts.all || e.status === 'active').map((e) => ({ emp: e, fit: this.fit(e, opts) })); },
    summary(opts) { const s = this.scan(opts); return { total: s.length, ok: s.filter((x) => x.fit.ok && !x.fit.warnings.length).length, soon: s.filter((x) => x.fit.ok && x.fit.warnings.length).length, blocked: s.filter((x) => !x.fit.ok).length }; },

    // ---------- rule table ----------
    validateBase(d) {
      const e = {}; const days = (v) => Number.isInteger(v) && v >= 0 && v <= 365;
      if (!days(d.passport.soonDays)) e.passport = 'days'; if (!days(d.pass.soonDays)) e.pass = 'days';
      const seen = new Set();
      d.certs.forEach((c, i) => { if (!hr.certType(c.type)) e['cert' + i] = 'type'; else if (seen.has(c.type)) e['cert' + i] = 'dup'; else if (!days(c.soonDays)) e['cert' + i] = 'days'; seen.add(c.type); });
      return e;
    },
    /** d: { passport:{on,soonDays}, pass:{on,soonDays}, certs:[{type,on,soonDays}] } */
    saveBase(d) {
      const e = this.validateBase(d); if (Object.keys(e).length) return { ok: false, errors: e };
      state.base = { passport: { on: !!d.passport.on, soonDays: d.passport.soonDays }, pass: { on: !!d.pass.on, soonDays: d.pass.soonDays }, certs: d.certs.map((c) => ({ type: c.type, on: !!c.on, soonDays: c.soonDays })) };
      state.updatedAt = stamp(); const ok = save(); emit({ type: 'base' }); refresh(); return { ok: true, persisted: ok };
    },
    savePermit(id, certs) {
      if (!this.permitType(id)) return { ok: false, error: 'permit' };
      if (certs.some((c) => !hr.certType(c)) || new Set(certs).size !== certs.length) return { ok: false, error: 'cert' };
      state.permits[id] = certs.slice(); state.updatedAt = stamp(); const ok = save(); emit({ type: 'permit', id }); refresh(); return { ok: true, persisted: ok };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); last = null; refresh(true); },
  };
  BS.comp = COMP;

  // ---------- change detection: tell the bus when a person flips between fit and not fit ----------
  let last = null;   // empNo → 'ok' | 'soon' | 'blocked'
  function refresh(silent) {
    const now = {}; COMP.scan({ all: true }).forEach(({ emp, fit }) => { now[emp.empNo] = { s: !fit.ok ? 'blocked' : fit.warnings.length ? 'soon' : 'ok', fit }; });
    if (last && !silent) Object.entries(now).forEach(([no, x]) => { const was = last[no]; if (was != null && was !== x.s) BS.bus.emit('compliance.changed', { empNo: no, from: was, to: x.s, ok: x.s !== 'blocked', reasons: x.fit.reasons }); });
    last = Object.fromEntries(Object.entries(now).map(([k, v]) => [k, v.s]));
  }
  COMP.refresh = () => refresh();
  refresh(true);
  hr.subscribe((ev) => { if (ev && (ev.type === 'reset' || ev.type === 'sync')) { refresh(ev.type === 'reset'); return; } refresh(); });
  if (BS.leaveReq) BS.leaveReq.subscribe(() => emit({ type: 'leave' }));
})(window.BS);
