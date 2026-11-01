/* Permit to Work: permits for a kind of high-risk work on a site, with the team assigned to it, and the hard stop.
   Hard stop: while an approved or running permit has a worker who fails the compliance check for that kind of work (expired passport, work pass or certificate,
   no longer deployed on the site, blocked at the gate), the whole permit is under a stop-work order. It lifts by itself once everyone passes again.
   Only a certificate problem can be overridden, by someone with approval rights, with a written reason, for one day. Nothing else can: replace the worker or fix the document.
   Flow: requested → approved ("ready") → active ("in progress") → closed; requested may be rejected, anything open may be cancelled. */
(function (BS) {
  const KEY = 'bs_ptw_proto_v1';
  const hr = BS.hr, dep = BS.dep, comp = BS.comp, bus = BS.bus;
  const listeners = new Set();
  let version = 0;
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s));
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const SHIFTS = { day: ['08:00', '18:00'], night: ['20:00', '06:00'] };
  const OPEN = ['requested', 'approved', 'active'];

  function seed() {
    const t0 = today(); const d = (n) => hr.addDays(t0, n);
    const mk = (n, type, title, projectKey, siteKey, mainconId, subconId, off, shift, ra, assessor, team, status, by, extra = {}) => ({
      id: `PTW-${t0.slice(0, 4)}-${String(n).padStart(3, '0')}`, type, title, projectKey, siteKey, mainconId, subconId, date: d(off), shift, raRef: ra, assessor, team, status, stop: null,
      requestedBy: by, requestedAt: `${d(Math.min(off, 0) - 1)} 15:10`, lastInspected: extra.inspected || '', closedAt: extra.closedAt || '',
      log: [{ at: `${d(Math.min(off, 0) - 1)} 15:10`, by, type: 'requested', note: '' }, ...(status !== 'requested' ? [{ at: `${d(Math.min(off, 0) - 1)} 17:30`, by: 'admin', type: 'approved', note: '' }] : []), ...(status === 'active' || status === 'closed' ? [{ at: `${d(off)} 08:05`, by: 'main01', type: 'started', note: '' }] : []), ...(status === 'closed' ? [{ at: `${d(off)} 18:10`, by: 'main01', type: 'closed', note: '' }] : [])],
    });
    const permits = [
      mk(41, 'work_height', 'Perimeter scaffold erection (above 6 m)', 'maritime', 'a1', 'c9', 'c5', 0, 'day', 'RA-MS-2026-WAH04', 'BS10456', ['BS10086', 'BS10213'], 'active', 'sub01', { inspected: `${t0} 07:45` }),
      mk(42, 'hot_work', 'Loading bay steel cutting and welding', 'jurong', 'bay', 'c10', 'c6', 0, 'day', 'RA-JH-2026-HW09', 'BS10456', ['BS10721', 'SG-0301'], 'active', 'sub02', { inspected: `${t0} 08:15` }),
      mk(43, 'general', 'Zone B2 formwork preparation', 'maritime', 'b2', 'c9', 'c5', 1, 'day', 'RA-MS-2026-GN11', 'BS10456', ['BS10110', 'BS10111'], 'approved', 'sub01', { inspected: `${t0} 16:20` }),
      mk(44, 'confined_space', 'Drainage chamber inspection', 'jurong', 'bay', 'c10', 'c6', 2, 'night', 'RA-JH-2026-CS03', 'BS10456', ['BS10112'], 'requested', 'sub02'),
      mk(45, 'general', 'Hoarding installation', 'maritime', 'a1', 'c9', 'c5', -1, 'day', 'RA-MS-2026-GN07', 'BS10456', ['BS10086'], 'closed', 'sub01', { inspected: `${d(-1)} 07:50`, closedAt: `${d(-1)} 18:10` }),
    ];
    return { v: 1, permits, n: 45 };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.permits) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const note = (v, max = 200) => String(v || '').trim().slice(0, max);
  const PTW = {
    SHIFTS, OPEN,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state.permits; },
    get(id) { return state.permits.find((p) => p.id === id) || null; },
    evalDate(p) { const t0 = today(); return p.date > t0 ? p.date : t0; },
    hours(p) { return SHIFTS[p.shift] || SHIFTS.day; },

    // ---------- state ----------
    canOverride(p) { return !!(p.stop && p.stop.workers.length && p.stop.workers.every((w) => w.reasons.every((r) => r.kind === 'cert'))); },
    overrideActive(p) { const o = p.stop && p.stop.override; return !!o && o.date === today() && this.canOverride(p); },
    stopped(p) { return !!p.stop && !this.overrideActive(p); },
    /** requested | rejected | cancelled | closed | stopped | ready | inprogress */
    state(p) { if (!['approved', 'active'].includes(p.status)) return p.status; if (this.stopped(p)) return 'stopped'; return p.status === 'active' ? 'inprogress' : 'ready'; },

    /** the check behind everything: each assigned worker against the compliance rules for this kind of work, their deployment on the site and the gate */
    check(p) {
      const date = this.evalDate(p);
      const workers = p.team.map((no) => {
        const e = hr.emp(no); const reasons = [], warnings = [];
        const f = comp.fit(e, { date, permit: p.type }); reasons.push(...f.reasons); warnings.push(...f.warnings);
        let d = null;
        if (p.mainconId) {
          d = dep.list({ empNo: no }).find((x) => x.mainconId === p.mainconId && x.siteKey === p.siteKey && x.status === 'accepted' && dep.phase(x, date) === 'active') || null;
          if (!d) reasons.push({ kind: 'deployment', status: 'missing' }); else if (d.block) reasons.push({ kind: 'gate', status: 'blocked', reason: d.block.reason, by: d.block.by });
        }
        return { empNo: no, ok: reasons.length === 0, reasons, warnings, dep: d && d.id };
      });
      return { date, ok: workers.every((w) => w.ok), workers };
    },
    /** people who could be put on a permit: deployed on that main contractor's site (or assigned to the site when there is none) and passing the check for the type of work */
    candidates({ mainconId, siteKey, subconId, type, date, exclude = [] }) {
      const day = date || today();
      return hr.emps().filter((e) => e.status === 'active' && !exclude.includes(e.empNo) && (!subconId || dep.subconOf(e) === subconId)).map((e) => {
        let ok = true; const reasons = [];
        if (mainconId) { const d = dep.list({ empNo: e.empNo }).find((x) => x.mainconId === mainconId && x.siteKey === siteKey && x.status === 'accepted' && dep.phase(x, day) === 'active'); if (!d) return null; if (d.block) { ok = false; reasons.push({ kind: 'gate', status: 'blocked', reason: d.block.reason }); } }
        else if (!e.assigns.some((a) => a.siteKey === siteKey)) return null;
        const f = comp.fit(e, { date: day, permit: type }); reasons.push(...f.reasons);
        return { emp: e, ok: ok && f.ok, reasons, warnings: f.warnings };
      }).filter(Boolean).sort((a, b) => (b.ok - a.ok) || a.emp.empNo.localeCompare(b.emp.empNo));
    },
    counts(list) {
      const open = list.filter((p) => OPEN.includes(p.status)); const st = list.map((p) => this.state(p));
      const bad = new Set(); list.filter((p) => ['approved', 'active'].includes(p.status) && p.stop).forEach((p) => p.stop.workers.forEach((w) => bad.add(w.empNo)));
      return { open: open.length, stopped: st.filter((s) => s === 'stopped').length, inprogress: st.filter((s) => s === 'inprogress').length, ready: st.filter((s) => s === 'ready').length, requested: st.filter((s) => s === 'requested').length, closed: list.filter((p) => ['closed', 'cancelled', 'rejected'].includes(p.status)).length, badWorkers: bad.size };
    },

    // ---------- the hard stop ----------
    /** re-evaluates every approved or running permit: opens a stop-work order on the first failure, refreshes it while it lasts, lifts it when everyone passes */
    recheck(silent) {
      let changed = false;
      state.permits.filter((p) => ['approved', 'active'].includes(p.status)).forEach((p) => {
        const res = this.check(p); const bad = res.workers.filter((w) => !w.ok).map((w) => ({ empNo: w.empNo, reasons: w.reasons }));
        if (bad.length && !p.stop) {
          p.stop = { at: stamp(), date: res.date, workers: bad, override: null }; p.log.push({ at: p.stop.at, by: 'system', type: 'stopped', note: `${bad.length}` }); changed = true;
          if (!silent) bus.emit('ptw.suspended', { id: p.id, workers: bad.map((w) => w.empNo) });
        } else if (bad.length) {
          if (JSON.stringify(p.stop.workers) !== JSON.stringify(bad)) { p.stop.workers = bad; changed = true; }
        } else if (p.stop) {
          p.stop = null; p.log.push({ at: stamp(), by: 'system', type: 'resumed', note: '' }); changed = true;
          if (!silent) bus.emit('ptw.resumed', { id: p.id });
        }
      });
      if (changed) { save(); emit({ type: 'recheck' }); }
      return changed;
    },

    // ---------- create / validate ----------
    nextId() { return `PTW-${today().slice(0, 4)}-${String(state.n + 1).padStart(3, '0')}`; },
    validate(d) {
      const e = {};
      if (!comp.permitType(d.type)) e.type = 'type';
      const title = note(d.title, 120); if (!title) e.title = 'title'; else if (title.length < 3 || title.length > 80) e.title = 'title_len';
      const pj = hr.project(d.projectKey); const st = hr.site(d.siteKey);
      if (!pj || hr.projectStatus(pj) === 'done') e.projectKey = 'project'; else if (!st || st.projectKey !== d.projectKey || !st.active) e.siteKey = 'site';
      if (d.mainconId) { const c = hr.company(d.mainconId); if (!c || c.type !== 'main' || !c.active) e.mainconId = 'main'; }
      if (d.subconId) { const c = hr.company(d.subconId); if (!c || c.type !== 'sub' || !c.active) e.subconId = 'sub'; }
      if (!validDate(d.date)) e.date = 'date'; else if (d.date < today()) e.date = 'past'; else if (d.date > hr.addDays(today(), 60)) e.date = 'far';
      if (!SHIFTS[d.shift]) e.shift = 'shift';
      const ra = note(d.raRef, 40); if (!ra) e.raRef = 'ra'; else if (!/^[A-Za-z0-9][A-Za-z0-9\-_/.]{3,29}$/.test(ra)) e.raRef = 'ra_fmt';
      const as = hr.emp(d.assessor); if (!as || as.status !== 'active' || !['safety', 'supervisor'].includes(as.role)) e.assessor = 'assessor';
      const team = d.team || [];
      if (!team.length) e.team = 'team'; else if (team.length > 10) e.team = 'team_many'; else if (new Set(team).size !== team.length) e.team = 'team_dup';
      else if (!e.type && !e.date && !e.siteKey) {
        const cands = this.candidates({ mainconId: d.mainconId, siteKey: d.siteKey, subconId: d.subconId, type: d.type, date: d.date });
        const bad = team.find((no) => { const c = cands.find((x) => x.emp.empNo === no); return !c || !c.ok; }); if (bad) { e.team = cands.some((x) => x.emp.empNo === bad) ? 'team_unfit' : 'team_site'; e._worker = bad; }
      }
      return e;
    },
    create(d, by) {
      const e = this.validate(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const who = by || me(); const at = stamp(); const id = this.nextId(); state.n++;
      const p = { id, type: d.type, title: note(d.title, 80), projectKey: d.projectKey, siteKey: d.siteKey, mainconId: d.mainconId || '', subconId: d.subconId || '', date: d.date, shift: d.shift, raRef: note(d.raRef, 40), assessor: d.assessor, team: d.team.slice(), status: 'requested', stop: null, requestedBy: who, requestedAt: at, lastInspected: '', closedAt: '', log: [{ at, by: who, type: 'requested', note: '' }] };
      state.permits.push(p); const ok = save(); emit({ type: 'created', id }); bus.emit('ptw.created', { id, type: p.type }); return { ok: true, permit: p, persisted: ok };
    },

    // ---------- flow ----------
    _move(id, from, to, evt, by, text, extra) {
      const p = this.get(id); if (!p) return { ok: false, error: 'missing' }; if (!from.includes(p.status)) return { ok: false, error: 'state', status: p.status };
      p.status = to; p.log.push({ at: stamp(), by: by || me(), type: evt, note: text || '' }); if (extra) extra(p);
      const ok = save(); emit({ type: evt, id }); bus.emit('ptw.' + evt, { id }); return { ok: true, permit: p, persisted: ok };
    },
    /** approving or starting needs everyone on the team to pass today's check: an unfit team cannot be waved through */
    approve(id, by) {
      const p = this.get(id); if (!p) return { ok: false, error: 'missing' }; if (p.status !== 'requested') return { ok: false, error: 'state', status: p.status };
      const res = this.check(p); if (!res.ok) return { ok: false, error: 'not_fit', workers: res.workers.filter((w) => !w.ok) };
      return this._move(id, ['requested'], 'approved', 'approved', by, '', (x) => { x.lastInspected = stamp(); });
    },
    reject(id, text, by) { const why = note(text, 200); if (!why) return { ok: false, error: 'note' }; return this._move(id, ['requested'], 'rejected', 'rejected', by, why); },
    start(id, by) {
      const p = this.get(id); if (!p) return { ok: false, error: 'missing' }; if (p.status !== 'approved') return { ok: false, error: 'state', status: p.status };
      if (p.date > today()) return { ok: false, error: 'not_today' };
      if (this.stopped(p)) return { ok: false, error: 'stopped' };
      const res = this.check(p); if (!res.ok && !this.overrideActive(p)) return { ok: false, error: 'not_fit', workers: res.workers.filter((w) => !w.ok) };
      return this._move(id, ['approved'], 'active', 'started', by, '', (x) => { x.lastInspected = stamp(); });
    },
    close(id, text, by) { return this._move(id, ['active'], 'closed', 'closed', by, note(text), (x) => { x.closedAt = stamp(); x.stop = null; }); },
    cancel(id, text, by) { const why = note(text, 200); if (!why) return { ok: false, error: 'note' }; return this._move(id, OPEN, 'cancelled', 'cancelled', by, why, (x) => { x.stop = null; }); },

    /** puts another worker in place of one on an open permit; the replacement has to pass the check for this kind of work */
    swap(id, outNo, inNo, by) {
      const p = this.get(id); if (!p) return { ok: false, error: 'missing' }; if (!OPEN.includes(p.status)) return { ok: false, error: 'state', status: p.status };
      if (!p.team.includes(outNo)) return { ok: false, error: 'not_in_team' };
      const c = this.candidates({ mainconId: p.mainconId, siteKey: p.siteKey, subconId: p.subconId, type: p.type, date: this.evalDate(p) }).find((x) => x.emp.empNo === inNo);
      if (!c || p.team.includes(inNo)) return { ok: false, error: 'candidate' }; if (!c.ok) return { ok: false, error: 'unfit', reasons: c.reasons };
      p.team = p.team.map((n) => (n === outNo ? inNo : n)); p.log.push({ at: stamp(), by: by || me(), type: 'swapped', note: `${outNo} → ${inNo}` });
      const ok = save(); emit({ type: 'swapped', id }); bus.emit('ptw.swapped', { id, out: outNo, in: inNo }); this.recheck(); return { ok: true, persisted: ok };
    },
    /** a written override of a certificate stop, valid for today only; passports, work passes, deployments and gate blocks cannot be overridden */
    override(id, text, by) {
      const p = this.get(id); if (!p) return { ok: false, error: 'missing' }; if (!p.stop) return { ok: false, error: 'not_stopped' };
      if (!this.canOverride(p)) return { ok: false, error: 'not_overridable' };
      const why = note(text, 200); if (why.length < 10) return { ok: false, error: 'note' };
      p.stop.override = { by: by || me(), note: why, at: stamp(), date: today() }; p.log.push({ at: p.stop.override.at, by: p.stop.override.by, type: 'overridden', note: why });
      const ok = save(); emit({ type: 'overridden', id }); bus.emit('ptw.overridden', { id }); return { ok: true, persisted: ok };
    },
    /** renew one document of a worker (the "quick renew" on a stopped permit). doc: { kind: 'passport'|'pass'|'cert', type?, expiry, no?, issued? } */
    renew(empNo, doc) {
      const e = hr.emp(empNo); if (!e) return { ok: false, errors: { expiry: 'missing' } };
      if (doc.kind === 'passport' || doc.kind === 'pass') { const r = hr.setDocExpiry(empNo, doc.kind, doc.expiry, doc.no); return r.ok ? r : { ok: false, errors: r.errors.date ? { expiry: r.errors.date } : r.errors }; }
      if (doc.expiry <= today()) return { ok: false, errors: { expiry: 'past' } };
      const cur = e.certs.find((c) => c.type === doc.type);
      const d = { empNo, type: doc.type, no: note(doc.no, 40) || (cur && cur.no) || '', issued: doc.issued || (cur && cur.issued) || '', expiry: doc.expiry, permanent: false, file: null };
      if (cur && cur.expiry && doc.expiry <= cur.expiry) return { ok: false, errors: { expiry: 'not_later' } };
      const r = cur ? hr.updateCert(empNo, cur.id, d) : hr.addCert(d); return r.ok ? r : { ok: false, errors: r.errors };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); PTW.recheck(true); },
  };
  BS.ptw = PTW;

  // anything that can change a worker's standing re-checks the open permits
  ['compliance.*', 'deployment.*', 'employee.*', 'cert.*', 'master.changed'].forEach((pat) => bus.on(pat, () => PTW.recheck()));
  comp.subscribe((ev) => { if (ev && ev.type !== 'leave') PTW.recheck(); });
  PTW.recheck(true);
})(window.BS);
