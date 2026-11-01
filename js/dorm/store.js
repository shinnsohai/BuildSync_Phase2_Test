/* Dormitory hub: licensed dormitories with their beds, shuttles to worksites, and the bed leases foreign workers hold.
   An allocation puts named foreign workers on named free beds and goes to the operator as a request, with the MOM address declaration submitted at once.
   The operator confirms (simulated here) and sets the effective date: never earlier than the bed becomes available or the date asked for.
   Confirmation registers the declaration and updates the worker's residential address. Dormitories and bed inventory are generated; leases are saved. */
(function (BS) {
  const KEY = 'bs_dorm_proto_v1';
  const hr = BS.hr, bus = BS.bus;
  const listeners = new Set();
  let version = 0;
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const TERMS = [3, 6, 12];
  const LIVE = ['pending', 'confirmed'];

  // ---------- reference data (fictional names, generated bed inventory) ----------
  const DORMS = [
    { id: 'westfield', zh: '西城宿舍（大士）', en: 'Westfield Residence', operator: 'Westfield Dormitories Pte Ltd', cls: 'A', kind: 'pbd', beds: 1800, licence: 'DRM-2025-0182', region: 'west', addr: '12 Tuas South Avenue 4, Singapore 637651', lat: 1.2985, lng: 103.642, mrtKm: 3.8, base: 400, free: 62, amen: ['splitac', 'wifi', 'kitchen', 'mart', 'gym'], shuttles: [['bay', ['06:15', '06:45'], ['18:30', '19:15']], ['dockA', ['06:30', '07:00'], ['18:45', '19:30']]] },
    { id: 'northgate', zh: '北门宿舍（万礼）', en: 'Northgate Lodge', operator: 'Northgate Living Pte Ltd', cls: 'A', kind: 'pbd', beds: 3000, licence: 'DRM-2024-0451', region: 'north', addr: '34 Mandai Estate, Singapore 729940', lat: 1.4098, lng: 103.766, mrtKm: 4.5, base: 390, free: 70, amen: ['wifi', 'kitchen', 'mart', 'court', 'clinic'], shuttles: [['rvN', ['06:00', '06:40'], ['18:20', '19:00']]] },
    { id: 'kranji', zh: '克兰芝宿舍', en: 'Kranji Court', operator: 'Kranji Lodging Pte Ltd', cls: 'B', kind: 'fcd', beds: 600, licence: 'DRM-2023-0237', region: 'north', addr: '8 Kranji Way, Singapore 739432', lat: 1.4266, lng: 103.7339, mrtKm: 2.1, base: 360, free: 48, amen: ['wifi', 'kitchen', 'halal'], shuttles: [['bay', ['06:00', '06:30'], ['18:30', '19:10']]] },
    { id: 'pasir', zh: '巴西班让门宿舍', en: 'Pasir Gate Lodge', operator: 'Pasir Gate Housing Pte Ltd', cls: 'A', kind: 'pbd', beds: 1100, licence: 'DRM-2025-0319', region: 'south', addr: '5 Pasir Panjang Road, Singapore 118482', lat: 1.28, lng: 103.785, mrtKm: 1.2, base: 440, free: 55, amen: ['splitac', 'wifi', 'kitchen', 'mart', 'halal'], shuttles: [['dockA', ['06:45', '07:15'], ['18:00', '18:45']], ['a1', ['06:30', '07:00'], ['18:15', '19:00']], ['towerA', ['06:30', '07:00'], ['18:15', '19:00']]] },
    { id: 'kallang', zh: '加冷公寓宿舍', en: 'Kallang Residence', operator: 'Kallang Residential Pte Ltd', cls: 'B', kind: 'fcd', beds: 400, licence: 'DRM-2022-0108', region: 'central', addr: '21 Kallang Place, Singapore 339160', lat: 1.308, lng: 103.865, mrtKm: 0.6, base: 470, free: 40, amen: ['splitac', 'wifi', 'kitchen'], shuttles: [['a1', ['06:40', '07:10'], ['18:20', '19:00']], ['b2', ['06:40', '07:10'], ['18:20', '19:00']], ['towerA', ['06:45', '07:15'], ['18:30', '19:10']], ['towerB', ['06:45', '07:15'], ['18:30', '19:10']]] },
  ];
  // the inventory modelled for each dormitory: two blocks of five rooms of six beds; rooms alternate air-conditioned and fan
  function bedsOf(d) {
    const out = []; const t0 = today();
    ['A', 'B'].forEach((blk) => [1, 2, 3, 4, 5].forEach((n) => {
      const room = `${blk}-3${String(n).padStart(2, '0')}`; const ac = (n + (blk === 'A' ? 0 : 1)) % 2 === 1;
      'ABCDEF'.split('').forEach((l, i) => {
        const id = `${d.id}:${room}:${l}`; const h = hash(id); const lower = i % 2 === 0;
        const price = d.base + (ac ? 30 : 0) + (lower ? 20 : 0) + (blk === 'B' ? 10 : 0);
        const taken = h % 100 >= d.free; const wait = !taken && h % 9 === 0 ? [7, 14, 21][h % 3] : 0;
        out.push({ id, dormId: d.id, block: blk, room, bed: l, lower, ac, price, taken, from: wait ? hr.addDays(t0, wait) : t0 });
      });
    }));
    return out;
  }
  const BEDS = Object.fromEntries(DORMS.map((d) => [d.id, bedsOf(d)])); // availability dates are relative to the day the page loaded

  function seed() {
    const t0 = today(); const leases = []; let n = 0;
    const free = (dormId) => BEDS[dormId].filter((b) => !b.taken && b.from <= t0 && b.lower);
    const mk = (empNo, bed, status, effOff, reqOff, months, by) => {
      const rent = bed.price; const req = hr.addDays(t0, reqOff);
      leases.push({ id: 'DL-' + t0.slice(0, 4) + '-' + String(++n).padStart(4, '0'), batch: 'DB-' + String(n).padStart(3, '0'), dormId: bed.dormId, bedId: bed.id, empNo, rent, deposit: rent, months, from: req, effective: status === 'pending' ? null : hr.addDays(t0, effOff), status, ofwas: { ref: `OFWAS-${t0.slice(0, 4)}-${String(7000 + n)}`, status: status === 'pending' ? 'submitted' : 'registered', at: `${req} 10:00` }, orgId: '', by, at: `${req} 10:00`, endedAt: '', log: [{ at: `${req} 10:00`, by, type: 'requested', note: '' }, ...(status === 'confirmed' ? [{ at: `${hr.addDays(t0, effOff)} 09:00`, by: 'operator', type: 'confirmed', note: '' }] : [])] });
    };
    const wf = free('westfield');
    mk('SG-0301', wf[0], 'confirmed', -40, -45, 6, 'admin'); mk('BS10112', wf[1], 'confirmed', -40, -45, 6, 'admin'); mk('BS10117', wf[2], 'confirmed', -20, -25, 12, 'admin');
    mk('BS10721', free('pasir')[0], 'pending', 0, -1, 6, 'admin');
    return { v: 1, leases, n };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.leases) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const rad = (x) => (x * Math.PI) / 180;
  const DORM = {
    DORMS, TERMS, LIVE,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dorm(id) { return DORMS.find((d) => d.id === id) || null; },
    beds(dormId) { return BEDS[dormId] || []; },
    bed(id) { const [d] = String(id).split(':'); return (BEDS[d] || []).find((b) => b.id === id) || null; },
    leases() { return state.leases; },
    lease(id) { return state.leases.find((l) => l.id === id) || null; },
    liveLeaseOf(empNo) { return state.leases.find((l) => l.empNo === empNo && LIVE.includes(l.status)) || null; },
    /** pending → the operator has not answered; upcoming → confirmed for a later day; active → living there; ended / cancelled */
    phase(l) { if (l.status === 'confirmed') return l.effective > today() ? 'upcoming' : 'active'; return l.status; },
    leased(bedId) { return state.leases.some((l) => l.bedId === bedId && LIVE.includes(l.status)); },
    free(b) { return !b.taken && !this.leased(b.id); },
    freeBeds(dormId) { return this.beds(dormId).filter((b) => this.free(b)); },
    distanceKm(dormId, siteKey) { const d = this.dorm(dormId), s = hr.site(siteKey); if (!d || !s) return null; const a = Math.sin(rad(s.lat - d.lat) / 2) ** 2 + Math.cos(rad(d.lat)) * Math.cos(rad(s.lat)) * Math.sin(rad(s.lng - d.lng) / 2) ** 2; return Math.round(12742 * Math.asin(Math.sqrt(a)) * 10) / 10; },
    shuttleTo(dormId, siteKey) { const d = this.dorm(dormId); const r = d && d.shuttles.find((x) => x[0] === siteKey); return r ? { site: r[0], am: r[1], pm: r[2] } : null; },
    stats(empNos) {
      const set = empNos ? new Set(empNos) : null; const free = DORMS.flatMap((d) => this.freeBeds(d.id)); const housed = state.leases.filter((l) => LIVE.includes(l.status) && (!set || set.has(l.empNo)));
      return { vacant: free.length, avgRate: free.length ? Math.round(free.reduce((n, b) => n + b.price, 0) / free.length) : 0, housed: housed.length, registered: housed.filter((l) => l.ofwas.status === 'registered').length };
    },

    // ---------- allocation ----------
    /** items: [{bedId, empNo}], months, from (preferred move-in). Only foreign (FIN) workers, one live lease each, only free beds. */
    validate(d) {
      const e = {}; const items = d.items || [];
      if (!items.length) { e.items = 'none'; return e; }
      if (!TERMS.includes(Number(d.months))) e.months = 'months';
      const seen = new Set(), beds = new Set(); let minFrom = today();
      items.forEach((it, i) => {
        const b = this.bed(it.bedId); const emp = hr.emp(it.empNo);
        if (!b || !this.free(b)) e['bed' + i] = 'bed'; else { if (beds.has(b.id)) e['bed' + i] = 'bed'; beds.add(b.id); if (b.from > minFrom) minFrom = b.from; }
        if (!it.empNo) e['emp' + i] = 'emp_none'; else if (!emp || emp.status !== 'active' || emp.idType !== 'fin') e['emp' + i] = 'emp'; else if (this.liveLeaseOf(it.empNo)) e['emp' + i] = 'housed'; else if (seen.has(it.empNo)) e['emp' + i] = 'dup'; seen.add(it.empNo);
      });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.from || '')) e.from = 'date'; else if (d.from < today()) e.from = 'past'; else if (d.from > hr.addDays(today(), 90)) e.from = 'far';
      return e;
    },
    /** the earliest day the whole group can move in: the latest availability date among their beds */
    earliest(bedIds) { return bedIds.reduce((m, id) => { const b = this.bed(id); return b && b.from > m ? b.from : m; }, today()); },
    allocate(d, by, orgId) {
      const e = this.validate(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const who = by || me(); const at = stamp(); const batch = 'DB-' + String(state.n + 1).padStart(3, '0'); const out = [];
      d.items.forEach((it) => {
        const b = this.bed(it.bedId); const id = 'DL-' + today().slice(0, 4) + '-' + String(++state.n).padStart(4, '0');
        const l = { id, batch, dormId: b.dormId, bedId: b.id, empNo: it.empNo, rent: b.price, deposit: b.price, months: Number(d.months), from: d.from, effective: null, status: 'pending', ofwas: { ref: `OFWAS-${today().slice(0, 4)}-${String(7000 + state.n)}`, status: 'submitted', at }, orgId: orgId || '', by: who, at, endedAt: '', log: [{ at, by: who, type: 'requested', note: '' }] };
        state.leases.push(l); out.push(l);
      });
      const ok = save(); emit({ type: 'allocated', batch }); bus.emit('dorm.allocated', { batch, empNos: out.map((l) => l.empNo) }); return { ok: true, leases: out, persisted: ok };
    },
    /** the operator accepts (simulated): the effective date is the later of the asked date and the bed's availability, the declaration is registered, the address updated */
    confirm(id, by) {
      const l = this.lease(id); if (!l) return { ok: false, error: 'missing' }; if (l.status !== 'pending') return { ok: false, error: 'state', status: l.status };
      const b = this.bed(l.bedId); const eff = [l.from, b ? b.from : l.from, today()].sort().pop();
      l.status = 'confirmed'; l.effective = eff; l.ofwas.status = 'registered'; l.ofwas.at = stamp(); l.log.push({ at: stamp(), by: by || me(), type: 'confirmed', note: eff });
      const d = this.dorm(l.dormId); hr.setAddress(l.empNo, `${d.addr} (${b.room}, bed ${b.bed})`);
      const ok = save(); emit({ type: 'confirmed', id }); bus.emit('dorm.confirmed', { id, empNo: l.empNo }); return { ok: true, effective: eff, persisted: ok };
    },
    cancel(id, by) {
      const l = this.lease(id); if (!l) return { ok: false, error: 'missing' }; if (l.status !== 'pending') return { ok: false, error: 'state', status: l.status };
      l.status = 'cancelled'; l.endedAt = stamp(); l.ofwas.status = 'withdrawn'; l.log.push({ at: stamp(), by: by || me(), type: 'cancelled', note: '' }); const ok = save(); emit({ type: 'cancelled', id }); return { ok: true, persisted: ok };
    },
    /** a confirmed lease ends; the deposit is marked for refund. The notice must not be before the effective date. */
    end(id, date, by) {
      const l = this.lease(id); if (!l) return { ok: false, error: 'missing' }; if (l.status !== 'confirmed') return { ok: false, error: 'state', status: l.status };
      const day = date || today(); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: 'date' }; if (day < l.effective) return { ok: false, error: 'before_start' };
      l.status = 'ended'; l.endedAt = day; l.ofwas.status = 'closed'; l.log.push({ at: stamp(), by: by || me(), type: 'ended', note: day }); const ok = save(); emit({ type: 'ended', id }); bus.emit('dorm.ended', { id, empNo: l.empNo }); return { ok: true, persisted: ok };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  BS.dorm = DORM;
})(window.BS);
