/* Deployments: a subcontractor's worker placed on a main contractor's site for a period.
   The worker stays one record in the personnel master (BS.hr); a deployment only says where, for whom, from when to when, and whether the gate lets them in.
   Status flow: requested → accepted | rejected; accepted → ended. "Active" is derived from the dates. The gate answer is derived from the compliance engine plus a manual block. */
(function (BS) {
  const KEY = 'bs_dep_proto_v2';
  const hr = BS.hr;
  const listeners = new Set();
  let version = 0;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return iso(x); };
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && iso(parse(s)) === s;
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); if (BS.bus && e.id) BS.bus.emit('deployment.changed', { id: e.id, empNo: e.empNo, change: e.type }); };

  function seed() {
    const t0 = today(); const d = (n) => addDays(t0, n);
    // empNo, subcon, maincon, project, site, from, to, status, extra
    const rows = [
      ['BS10086', 'c5', 'c9', 'maritime', 'a1', -90, null, 'accepted'], ['BS10213', 'c5', 'c9', 'maritime', 'a1', -60, null, 'accepted'], ['BS10110', 'c5', 'c9', 'maritime', 'b2', -45, null, 'accepted'],
      ['BS10721', 'c6', 'c10', 'jurong', 'bay', -30, null, 'accepted'], ['BS10112', 'c6', 'c10', 'jurong', 'bay', -20, null, 'accepted'], ['SG-0301', 'c6', 'c10', 'jurong', 'bay', -15, null, 'accepted'],
      ['BS10113', 'c5', 'c9', 'maritime', 'a1', 3, null, 'requested'], ['BS10111', 'c5', 'c9', 'maritime', 'b2', -80, null, 'accepted', { block: { by: 'main01', reason: 'Repeated late arrival', at: `${d(-6)} 07:45` } }],
      ['BS10117', 'c6', 'c10', 'jurong', 'bay', -120, -40, 'ended'], ['BS10903', 'c6', 'c10', 'jurong', 'bay', -10, null, 'rejected', { note: 'No headcount on this package' }],
      ['BS10116', 'c5', 'c9', 'maritime', 'b2', -10, null, 'accepted'], ['BS09872', 'c6', 'c10', 'jurong', 'bay', -12, null, 'accepted'],
    ];
    const deps = rows.map(([empNo, subconId, mainconId, projectKey, siteKey, from, to, status, extra = {}], i) => {
      const id = 'DP-' + String(i + 1).padStart(4, '0'); const f = d(from);
      const log = [{ at: `${f} 09:00`, by: 'subcon', type: 'requested', note: '' }];
      if (status === 'accepted' || status === 'ended') log.push({ at: `${f} 14:00`, by: 'maincon', type: 'accepted', note: '' });
      if (status === 'ended') log.push({ at: `${d(to)} 17:00`, by: 'subcon', type: 'ended', note: '' });
      if (status === 'rejected') log.push({ at: `${f} 15:00`, by: 'maincon', type: 'rejected', note: extra.note || '' });
      return { id, empNo, subconId, mainconId, projectKey, siteKey, from: f, to: to == null ? null : d(to), status, rfid: status === 'accepted' || status === 'ended' ? `RFID-${mainconId === 'c9' ? 'PM' : 'HL'}-${String(100 + i)}` : '', block: extra.block || null, requestedBy: 'subcon', requestedAt: `${f} 09:00`, log };
    });
    return { v: 1, deps, n: deps.length };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.deps) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const LIVE = ['requested', 'accepted'];
  const DEP = {
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state.deps; },
    get(id) { return state.deps.find((x) => x.id === id) || null; },
    forEmp(empNo) { return state.deps.filter((x) => x.empNo === empNo); },
    /** the subcontractor company a worker belongs to: the 'sub' company whose name is the worker's employer */
    subconOf(emp) { const c = emp && hr.companies().find((x) => x.type === 'sub' && (x.name === emp.employer.zh || (x.nameEn && x.nameEn === emp.employer.en))); return c ? c.id : null; },
    /** requested | scheduled | active | ended | rejected, from the stored status and the dates */
    phase(x, date) {
      const t0 = date || today();
      if (x.status === 'requested' || x.status === 'rejected') return x.status;
      if (x.status === 'ended' || (x.to && x.to < t0)) return 'ended';
      return x.from > t0 ? 'scheduled' : 'active';
    },
    /** the deployment a worker is working under on a day, if any */
    activeFor(empNo, date) { return state.deps.find((x) => x.empNo === empNo && this.phase(x, date) === 'active') || null; },
    /** the gate: granted | blocked | none (not deployed on that day). A block by the main contractor and a failed compliance check both close it. */
    gate(x, date) {
      const ph = this.phase(x, date);
      if (ph !== 'active') return { state: 'none', phase: ph, reasons: [] };
      const reasons = []; if (x.block) reasons.push({ kind: 'manual', by: x.block.by, reason: x.block.reason, at: x.block.at });
      const f = BS.comp.fit(hr.emp(x.empNo), { date }); reasons.push(...f.reasons);
      return { state: reasons.length ? 'blocked' : 'granted', phase: ph, reasons, warnings: f.warnings };
    },
    counts(filter = {}) {
      const rows = this.list(filter); const g = rows.map((x) => this.gate(x));
      return { total: rows.length, active: rows.filter((x) => this.phase(x) === 'active').length, requested: rows.filter((x) => x.status === 'requested').length, blocked: g.filter((x) => x.state === 'blocked').length, granted: g.filter((x) => x.state === 'granted').length };
    },
    /** filter: {subconId, mainconId, status (stored), phase, empNo} */
    list(f = {}) { return state.deps.filter((x) => (!f.subconId || x.subconId === f.subconId) && (!f.mainconId || x.mainconId === f.mainconId) && (!f.status || x.status === f.status) && (!f.phase || this.phase(x) === f.phase) && (!f.empNo || x.empNo === f.empNo)).sort((a, b) => b.from.localeCompare(a.from) || b.id.localeCompare(a.id)); },
    mainContractors() { return hr.companies().filter((c) => c.type === 'main' && c.active); },
    subcontractors() { return hr.companies().filter((c) => c.type === 'sub' && c.active); },

    validate(d, id) {
      const e = {}; const emp = hr.emp(d.empNo); const sub = hr.company(d.subconId); const main = hr.company(d.mainconId);
      if (!emp || emp.status !== 'active') e.empNo = 'emp';
      else if (!sub || sub.type !== 'sub' || !sub.active) e.subconId = 'sub';
      else if (this.subconOf(emp) !== d.subconId) e.empNo = 'not_theirs';
      if (!sub || sub.type !== 'sub' || !sub.active) e.subconId = e.subconId || 'sub';
      if (!main || main.type !== 'main' || !main.active) e.mainconId = 'main';
      const pj = hr.project(d.projectKey); const st = hr.site(d.siteKey);
      if (!pj || hr.projectStatus(pj) === 'done') e.projectKey = 'project'; else if (!st || st.projectKey !== d.projectKey || !st.active) e.siteKey = 'site';
      if (!validDate(d.from)) e.from = 'from'; else if (d.from < addDays(today(), -365)) e.from = 'from_old';
      if (d.to) { if (!validDate(d.to)) e.to = 'to'; else if (validDate(d.from) && d.to < d.from) e.to = 'to_before'; }
      if (!e.empNo && !e.from && !e.to) {
        const end = d.to || '9999-12-31';
        const clash = state.deps.find((x) => x.id !== id && x.empNo === d.empNo && LIVE.includes(x.status) && x.from <= end && d.from <= (x.to || '9999-12-31') && this.phase(x) !== 'ended');
        if (clash) { e.empNo = 'overlap'; e._with = clash.id; }
      }
      return e;
    },
    /** the subcontractor asks for a worker to be placed on a main contractor's site */
    request(d, by) {
      const e = this.validate(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const id = 'DP-' + String(++state.n).padStart(4, '0'); const at = stamp(); const who = by || me();
      const x = { id, empNo: d.empNo, subconId: d.subconId, mainconId: d.mainconId, projectKey: d.projectKey, siteKey: d.siteKey, from: d.from, to: d.to || null, status: 'requested', rfid: '', block: null, requestedBy: who, requestedAt: at, log: [{ at, by: who, type: 'requested', note: '' }] };
      state.deps.push(x); const ok = save(); emit({ type: 'requested', id, empNo: x.empNo }); return { ok: true, dep: x, persisted: ok };
    },
    accept(id, by) {
      const x = this.get(id); if (!x) return { ok: false, error: 'missing' }; if (x.status !== 'requested') return { ok: false, error: 'not_requested', status: x.status };
      x.status = 'accepted'; x.rfid = x.rfid || `RFID-${x.mainconId === 'c9' ? 'PM' : 'HL'}-${String(100 + state.deps.indexOf(x))}`; x.log.push({ at: stamp(), by: by || me(), type: 'accepted', note: '' });
      const ok = save(); emit({ type: 'accepted', id, empNo: x.empNo }); return { ok: true, persisted: ok };
    },
    reject(id, note, by) {
      const x = this.get(id); if (!x) return { ok: false, error: 'missing' }; if (x.status !== 'requested') return { ok: false, error: 'not_requested', status: x.status };
      const why = String(note || '').trim(); if (!why) return { ok: false, error: 'note' }; if (why.length > 120) return { ok: false, error: 'note_len' };
      x.status = 'rejected'; x.log.push({ at: stamp(), by: by || me(), type: 'rejected', note: why }); const ok = save(); emit({ type: 'rejected', id, empNo: x.empNo }); return { ok: true, persisted: ok };
    },
    /** ends an accepted deployment from the given day (default today); it cannot end before it started */
    end(id, date, by) {
      const x = this.get(id); if (!x) return { ok: false, error: 'missing' }; if (x.status !== 'accepted') return { ok: false, error: 'not_accepted', status: x.status };
      const day = date || today(); if (!validDate(day)) return { ok: false, error: 'date' }; if (day < x.from) return { ok: false, error: 'before_start' };
      x.status = 'ended'; x.to = day; x.log.push({ at: stamp(), by: by || me(), type: 'ended', note: day }); const ok = save(); emit({ type: 'ended', id, empNo: x.empNo }); return { ok: true, persisted: ok };
    },
    /** the main contractor closes the gate for one worker, with a reason */
    block(id, reason, by) {
      const x = this.get(id); if (!x) return { ok: false, error: 'missing' }; if (x.status !== 'accepted') return { ok: false, error: 'not_accepted', status: x.status };
      const why = String(reason || '').trim(); if (!why) return { ok: false, error: 'note' }; if (why.length > 120) return { ok: false, error: 'note_len' };
      const who = by || me(); x.block = { by: who, reason: why, at: stamp() }; x.log.push({ at: x.block.at, by: who, type: 'blocked', note: why }); const ok = save(); emit({ type: 'blocked', id, empNo: x.empNo }); return { ok: true, persisted: ok };
    },
    unblock(id, by) {
      const x = this.get(id); if (!x) return { ok: false, error: 'missing' }; if (!x.block) return { ok: false, error: 'not_blocked' };
      x.block = null; x.log.push({ at: stamp(), by: by || me(), type: 'unblocked', note: '' }); const ok = save(); emit({ type: 'unblocked', id, empNo: x.empNo }); return { ok: true, persisted: ok };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  BS.dep = DEP;
})(window.BS);
