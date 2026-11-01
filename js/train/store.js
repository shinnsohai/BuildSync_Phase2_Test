/* Training hub on the Course Atlas snapshot (data/atlas.js, made by tools/import-atlas.py).
   Course Atlas lists real providers' intakes crawled from their own pages: dates, venue, language, a published fee when one could be read, a seat number the provider
   reported on the day it was crawled, and the link where registration happens. It is not a booking system, so BuildSync does not pretend to hold seats:
   an enrolment REQUEST is recorded here (who, which intake, the clash check, who approved, how it is paid), the employer registers on the provider's page, and then
   marks it registered, confirmed and completed. A worker can ask for a course from the phone; the employer approves or declines.
   Conflict advisor: approved or pending leave, another open request, an open work permit on any of the course dates.
   A completed course renews the certificate it issues, which the compliance engine and the permits then see. Requests are saved; the catalogue is the snapshot. */
(function (BS) {
  const KEY = 'bs_train_proto_v2';
  const hr = BS.hr, bus = BS.bus;
  const A = window.BS_ATLAS || null;
  const listeners = new Set();
  let version = 0;
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const me = () => (BS.perm && BS.perm.currentId()) || 'system';
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const addDays = (d, n) => hr.addDays(d, n);
  const SDF_RATE = 0.7;    // the share of a fee the skills grant is assumed to cover; an estimate, not a quote
  const PAYMENTS = ['direct', 'wallet'];
  const OPEN = ['requested', 'registered', 'confirmed'];
  const CERT_YEARS = { CSOC: 3, 'WORK-HEIGHT': 2, CRANE: 3, WELDER: 2 };   // how long a certificate renewed by a completed course lasts
  const normLang = (l) => (l === 'Mandarin' ? 'Chinese' : l || '');
  const LANG_OF_COUNTRY = { bd: 'Bengali', in: 'Tamil', cn: 'Mandarin', mm: 'Burmese', my: 'Malay', sg: 'English' };

  // ---------- the snapshot, indexed once ----------
  const INT = (A ? A.intakes : []).map((i) => ({ ...i, start: i.d[0], end: i.d[i.d.length - 1] }));
  const BY_ID = new Map(INT.map((i) => [i.id, i]));
  const GROUPS = A ? A.groups : []; const G_BY = new Map(GROUPS.map((g) => [g.id, g]));
  const PROV = A ? A.providers : []; const LOCS = A ? A.locations : []; const L_BY = new Map(LOCS.map((l) => [l.id, l]));
  const shortName = (n) => n.replace(/\s+(Pte\.?\s*Ltd\.?|Private Limited)$/i, '').replace(/\s+/g, ' ').trim();

  function seed() {
    const t0 = today(); const requests = []; let n = 0;
    const pick = (cert, minOff, lang) => INT.filter((i) => (G_BY.get(i.g) || {}).cert === cert && i.start >= addDays(t0, minOff) && (!lang || i.l === lang)).sort((a, b) => a.start.localeCompare(b.start) || String(b.f != null).localeCompare(String(a.f != null)))[0];
    const mk = (intake, trainees, status, extra = {}) => {
      if (!intake) return; const id = `TR-${t0.slice(0, 4)}-${String(++n).padStart(4, '0')}`; const at = `${addDays(t0, -1)} 10:20`;
      requests.push({ id, ...snap(intake), trainees, status, source: extra.source || 'admin', askedBy: extra.askedBy || '', requestedBy: extra.by || 'admin', orgId: '', payment: 'direct', override: null, ref: extra.ref || '', note: extra.note || '', at, results: [],
        log: [{ at, by: extra.askedBy || 'admin', type: extra.source === 'worker' ? 'asked' : 'requested', note: '' }, ...(['registered', 'confirmed'].includes(status) ? [{ at, by: 'admin', type: 'registered', note: extra.ref || '' }] : []), ...(status === 'confirmed' ? [{ at, by: 'admin', type: 'confirmed', note: '' }] : [])] });
    };
    mk(pick('CSOC', 2, 'English') || pick('CSOC', 2), ['BS10110', 'BS10114'], 'registered', { ref: 'PROVIDER-REF-1' });
    mk(pick('WORK-HEIGHT', 3), ['BS10213'], 'confirmed', { ref: 'PROVIDER-REF-2' });
    const fork = INT.filter((i) => /Forklift/i.test(i.t) && !/Refresher/i.test(i.t) && i.l === 'English' && i.loc && i.start >= addDays(t0, 3)).sort((a, b) => a.start.localeCompare(b.start))[0]; mk(fork, ['SG-0312'], 'asked', { source: 'worker', askedBy: 'SG-0312', note: 'I would like to learn to drive the forklift.' });
    return { v: 1, requests, short: { 'SG-0312': [] }, n };
  }
  /** what a request keeps of its intake, so it still reads correctly after a newer snapshot replaces the old one */
  function snap(i) { const g = G_BY.get(i.g) || {}; return { intakeId: i.id, groupId: i.g, title: g.cert ? g.title : i.t, rawTitle: i.t, cert: g.cert || '', provider: (PROV[i.p] || {}).name || '', venue: i.v || '', locId: i.loc || '', dates: i.d.slice(), start: i.start, end: i.end, time: i.tm, lang: i.l, fee: i.f, bookingUrl: i.u, checked: i.ck }; }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.requests) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const TRAIN = {
    PAYMENTS, OPEN, SDF_RATE, CERT_YEARS,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // ---------- the snapshot ----------
    has() { return !!A && INT.length > 0; },
    meta() { return A; },
    /** true when every date in the snapshot is already past: the catalogue would be empty until it is imported again */
    stale() { return this.has() && A.last < today(); },
    providers() { return PROV; }, provider(i) { return PROV[i] || null; }, providerName(i) { return PROV[i] ? shortName(PROV[i].name) : ''; },
    locations() { return LOCS; }, location(id) { return L_BY.get(id) || null; },
    groups() { return GROUPS; }, group(id) { return G_BY.get(id) || null; },
    intake(id) { return BY_ID.get(id) || null; },
    /** upcoming intakes (not yet finished) matching the filters: groupId, provider (index), locId, lang, from (first date on or after), to, maxFee, availableOnly, kw, scope ('construction' | 'pcm'), certOnly, unmapped */
    intakes(f = {}) {
      const t0 = today(); const kw = (f.kw || '').trim().toLowerCase();
      return INT.filter((i) => (f.past || i.end >= t0) && (!f.groupId || i.g === f.groupId) && (f.provider == null || f.provider === '' || i.p === +f.provider) && (!f.locId || i.loc === f.locId) && (!f.lang || this.sameLang(i.l, f.lang))
        && (!f.from || i.start >= f.from) && (!f.to || i.start <= f.to) && (!f.maxFee || (i.f != null && i.f <= +f.maxFee)) && (!f.availableOnly || i.a === 'available') && (!f.scope || (i.sc || '').split(',').includes(f.scope))
        && (!f.certOnly || (G_BY.get(i.g) || {}).cert) && (!kw || i.t.toLowerCase().includes(kw) || (PROV[i.p].name || '').toLowerCase().includes(kw) || (i.v || '').toLowerCase().includes(kw)) && (!f.unmapped || !i.loc))
        .sort((a, b) => a.start.localeCompare(b.start) || a.t.localeCompare(b.t));
    },
    languages() { return [...new Set(INT.map((i) => normLang(i.l)).filter(Boolean))].sort(); },
    /** courses with the number of matching upcoming intakes, most intakes first; certificate-renewing courses are not hidden by the order */
    catalogue(f) {
      const by = new Map(); this.intakes(f).forEach((i) => { let e = by.get(i.g); if (!e) { e = { group: G_BY.get(i.g), intakes: [] }; by.set(i.g, e); } e.intakes.push(i); });
      return [...by.values()].filter((e) => e.group).sort((a, b) => (+!!b.group.cert - +!!a.group.cert) || b.intakes.length - a.intakes.length);
    },
    feeRange(list) { const f = list.map((i) => i.f).filter((x) => x != null); return f.length ? [Math.min(...f), Math.max(...f)] : null; },
    /** employer rate after the grant, labelled an estimate: the real grant depends on the employer, the trainee and the course */
    estimate(fee) { return fee == null ? null : { net: Math.round(fee * (1 - SDF_RATE) * 100) / 100, saved: Math.round(fee * SDF_RATE * 100) / 100, rate: SDF_RATE }; },
    spanText(i) { return i.d.length > 1 ? `${i.d[0]} → ${i.d[i.d.length - 1]}` : i.d[0]; },
    certGroup(cert) { return GROUPS.find((g) => g.cert === cert) || null; },
    /** the course that renews a certificate type, with its soonest intake */
    courseForCert(type) { const g = this.certGroup(type); return g ? { ...g, id: g.id } : null; },
    languageFor(emp) { return LANG_OF_COUNTRY[emp.country] || 'English'; },
    /** Mandarin and Chinese are the same medium for a worker; providers write it both ways */
    sameLang(a, b) { return normLang(a) === normLang(b); },

    // ---------- clashes ----------
    clashes(empNo, dates, excludeId) {
      const out = []; const from = dates[0], to = dates[dates.length - 1];
      const lv = BS.leaveReq && BS.leaveReq.overlap(empNo, `${from}T00:00`, `${to}T23:59`); if (lv) out.push({ kind: 'leave', ref: lv.id, status: lv.status, from: lv.start.slice(0, 10), to: lv.end.slice(0, 10) });
      state.requests.filter((r) => r.id !== excludeId && OPEN.includes(r.status) && r.trainees.includes(empNo) && r.dates.some((d) => dates.includes(d))).forEach((r) => out.push({ kind: 'training', ref: r.id, from: r.start, to: r.end }));
      if (BS.ptw) BS.ptw.all().filter((p) => ['approved', 'active'].includes(p.status) && p.team.includes(empNo) && dates.includes(p.date)).forEach((p) => out.push({ kind: 'permit', ref: p.id, from: p.date, to: p.date }));
      return out;
    },
    analyse(dates, empNos, excludeId) {
      const byEmp = {}; let any = false, hard = false;
      empNos.forEach((no) => { const c = this.clashes(no, dates, excludeId); byEmp[no] = c; if (c.length) any = true; if (c.some((x) => x.kind === 'training')) hard = true; });
      return { byEmp, any, hard, overridable: any && !hard };
    },
    suggest(empNo, dates, exclude, allowed) {
      const e = hr.emp(empNo); const trade = e && e.trades[0];
      return hr.emps().filter((x) => x.status === 'active' && !exclude.includes(x.empNo) && (!allowed || allowed(x)) && !this.clashes(x.empNo, dates).length).sort((a, c) => (+c.trades.includes(trade) - +a.trades.includes(trade)) || a.empNo.localeCompare(c.empNo))[0] || null;
    },
    conflicts() {
      const out = [];
      state.requests.filter((r) => OPEN.includes(r.status) && r.end >= today()).forEach((r) => r.trainees.forEach((no) => this.clashes(no, r.dates, r.id).forEach((c) => out.push({ requestId: r.id, empNo: no, ...c, overridden: !!(r.override && r.override.empNos.includes(no)) }))));
      return out;
    },

    // ---------- requests ----------
    requests() { return state.requests; },
    request(id) { return state.requests.find((r) => r.id === id) || null; },
    pendingFor(empNo, certType) { return state.requests.find((r) => OPEN.includes(r.status) && r.end >= today() && r.cert === certType && r.trainees.includes(empNo)) || null; },
    asksOf(empNo) { return state.requests.filter((r) => r.askedBy === empNo || r.trainees.includes(empNo)).sort((a, b) => b.at.localeCompare(a.at)); },
    validate(d, by, id) {
      const e = {}; const i = this.intake(d.intakeId) || (id && this.request(id)); const who = by || me();
      if (!i) { e.intake = 'intake'; return e; }
      const start = i.start; if (!id && start < today()) e.intake = 'past';
      const t = d.trainees || [];
      if (!t.length) e.trainees = 'none'; else if (t.length > 10) e.trainees = 'many'; else if (new Set(t).size !== t.length) e.trainees = 'dup'; else if (t.some((no) => { const x = hr.emp(no); return !x || x.status !== 'active'; })) e.trainees = 'emp';
      if (!PAYMENTS.includes(d.payment)) e.payment = 'payment';
      else if (d.payment === 'wallet') {
        if (i.f == null && i.fee == null) e.payment = 'wallet_nofee';
        else if (BS.wallet && t.length) { const need = this.estimate(i.f != null ? i.f : i.fee).net; const short = t.filter((no) => BS.wallet.credit(no) + 1e-9 < need); if (short.length) { e.payment = 'wallet_short'; e._short = short; } }
      }
      if (!e.trainees) {
        const dates = i.d || i.dates; const a = this.analyse(dates, t, id);
        if (a.hard) e.trainees = 'overlap';
        else if (a.any) { if (!d.override) e.trainees = 'clash'; else if (!(BS.perm && BS.perm.can('train', 'approve') && BS.perm.party() === 'employer')) e.override = 'denied'; else if (String(d.overrideNote || '').trim().length < 10) e.override = 'note'; }
      }
      void who; return e;
    },
    _log(r, type, by, note) { r.log.push({ at: stamp(), by: by || me(), type, note: note || '' }); },
    _spend(r, by) { if (r.payment === 'wallet' && BS.wallet) { const each = this.estimate(r.fee).net; r.trainees.forEach((no) => BS.wallet.spend(no, each, r.id, by)); r.spent = each; } },
    _refund(r, by) { if (r.payment === 'wallet' && r.spent && BS.wallet) { r.trainees.forEach((no) => BS.wallet.refund(no, r.spent, r.id, by)); r.spent = 0; } },
    /** the employer (or a subcontractor) asks for a course for named workers */
    createRequest(d, by, orgId) {
      const e = this.validate(d, by); if (Object.keys(e).length) return { ok: false, errors: e };
      const i = this.intake(d.intakeId); const who = by || me(); const a = this.analyse(i.d, d.trainees); const id = `TR-${today().slice(0, 4)}-${String(++state.n).padStart(4, '0')}`; const at = stamp();
      const r = { id, ...snap(i), trainees: d.trainees.slice(), status: 'requested', source: 'admin', askedBy: '', requestedBy: who, orgId: orgId || '', payment: d.payment, override: a.any ? { by: who, note: String(d.overrideNote).trim().slice(0, 200), at, empNos: Object.keys(a.byEmp).filter((k) => a.byEmp[k].length) } : null, ref: '', note: String(d.note || '').trim().slice(0, 200), at, results: [], log: [] };
      this._log(r, 'requested', who); if (r.override) this._log(r, 'overridden', who, r.override.note); state.requests.push(r); this._spend(r, who);
      const ok = save(); emit({ type: 'requested', id }); bus.emit('training.requested', { id, empNos: r.trainees, groupId: r.groupId }); return { ok: true, request: r, persisted: ok };
    },
    /** a worker asks from the phone; nothing is decided or paid yet */
    ask(empNo, intakeId, note, by) {
      const emp = hr.emp(empNo); const i = this.intake(intakeId); if (!emp || emp.status !== 'active') return { ok: false, error: 'emp' }; if (!i) return { ok: false, error: 'intake' }; if (i.start < today()) return { ok: false, error: 'past' };
      if (state.requests.some((r) => ['asked', ...OPEN].includes(r.status) && r.trainees.includes(empNo) && r.groupId === i.g && r.end >= today())) return { ok: false, error: 'already' };
      const id = `TR-${today().slice(0, 4)}-${String(++state.n).padStart(4, '0')}`; const r = { id, ...snap(i), trainees: [empNo], status: 'asked', source: 'worker', askedBy: empNo, requestedBy: by || empNo, orgId: '', payment: 'direct', override: null, ref: '', note: String(note || '').trim().slice(0, 200), at: stamp(), results: [], log: [] };
      this._log(r, 'asked', by || empNo, r.note); state.requests.push(r); const ok = save(); emit({ type: 'asked', id }); bus.emit('training.asked', { id, empNo }); return { ok: true, request: r, persisted: ok };
    },
    /** the employer accepts a worker's ask; clashes are checked again and can be overridden in writing like any request */
    approve(id, d, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (r.status !== 'asked') return { ok: false, error: 'state', status: r.status };
      const i = this.intake(r.intakeId) || r; const data = { intakeId: r.intakeId, trainees: r.trainees, payment: (d && d.payment) || 'direct', override: d && d.override, overrideNote: d && d.overrideNote };
      const e = this.validate(data, by, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const who = by || me(); const a = this.analyse(r.dates, r.trainees, id); r.payment = data.payment; r.status = 'requested'; r.requestedBy = who;
      if (a.any) { r.override = { by: who, note: String(data.overrideNote).trim().slice(0, 200), at: stamp(), empNos: Object.keys(a.byEmp).filter((k) => a.byEmp[k].length) }; this._log(r, 'overridden', who, r.override.note); }
      this._log(r, 'approved', who); this._spend(r, who); void i; const ok = save(); emit({ type: 'approved', id }); bus.emit('training.requested', { id, empNos: r.trainees, groupId: r.groupId }); return { ok: true, persisted: ok };
    },
    decline(id, reason, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (r.status !== 'asked') return { ok: false, error: 'state', status: r.status };
      const why = String(reason || '').trim(); if (!why) return { ok: false, error: 'note' }; if (why.length > 160) return { ok: false, error: 'note_len' };
      r.status = 'declined'; this._log(r, 'declined', by, why); const ok = save(); emit({ type: 'declined', id }); bus.emit('training.declined', { id, empNo: r.askedBy }); return { ok: true, persisted: ok };
    },
    /** the registration was made on the provider's page; ref is whatever reference the provider gave */
    register(id, ref, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (r.status !== 'requested') return { ok: false, error: 'state', status: r.status };
      const f = String(ref || '').trim(); if (f.length > 60) return { ok: false, error: 'ref_len' };
      r.status = 'registered'; r.ref = f; this._log(r, 'registered', by, f); const ok = save(); emit({ type: 'registered', id }); bus.emit('training.registered', { id }); return { ok: true, persisted: ok };
    },
    confirm(id, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (r.status !== 'registered') return { ok: false, error: 'state', status: r.status };
      r.status = 'confirmed'; this._log(r, 'confirmed', by); const ok = save(); emit({ type: 'confirmed', id }); bus.emit('training.confirmed', { id }); return { ok: true, persisted: ok };
    },
    /** change who is on a request that has not started (swap or remove a worker) */
    setTrainees(id, list, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (!OPEN.includes(r.status) || r.start <= today()) return { ok: false, error: 'state' };
      if (!list.length) return { ok: false, error: 'none' }; if (new Set(list).size !== list.length || list.some((no) => { const x = hr.emp(no); return !x || x.status !== 'active'; })) return { ok: false, error: 'emp' };
      const added = list.filter((no) => !r.trainees.includes(no)), gone = r.trainees.filter((no) => !list.includes(no));
      const a = this.analyse(r.dates, added, id); if (a.hard) return { ok: false, error: 'overlap' }; if (a.any && !r.override) return { ok: false, error: 'clash' };
      if (r.payment === 'wallet' && BS.wallet && r.spent) { if (added.some((no) => BS.wallet.credit(no) + 1e-9 < r.spent)) return { ok: false, error: 'wallet' }; gone.forEach((no) => BS.wallet.refund(no, r.spent, id, by)); added.forEach((no) => BS.wallet.spend(no, r.spent, id, by)); }
      const was = r.trainees; r.trainees = list.slice(); if (r.override) r.override.empNos = r.override.empNos.filter((n) => list.includes(n)); this._log(r, 'roster', by, `${was.join(',')} → ${list.join(',')}`);
      const ok = save(); emit({ type: 'roster', id }); return { ok: true, persisted: ok };
    },
    cancel(id, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (!['asked', ...OPEN].includes(r.status)) return { ok: false, error: 'state' }; if (r.status !== 'asked' && r.start <= today()) return { ok: false, error: 'started' };
      this._refund(r, by); r.status = 'cancelled'; this._log(r, 'cancelled', by); const ok = save(); emit({ type: 'cancelled', id }); bus.emit('training.cancelled', { id }); return { ok: true, persisted: ok };
    },
    /** the provider reports results (simulated: everyone passes); a course that renews a certificate gives each trainee a new expiry from today */
    complete(id, by) {
      const r = this.request(id); if (!r) return { ok: false, error: 'missing' }; if (!['registered', 'confirmed'].includes(r.status)) return { ok: false, error: 'state', status: r.status };
      const t0 = today(); const issued = [], issues = []; r.results = r.trainees.map((no) => ({ empNo: no, result: 'passed' }));
      const years = CERT_YEARS[r.cert];
      if (r.cert && years) {
        const exp = (() => { const d = new Date(t0 + 'T00:00:00'); d.setFullYear(d.getFullYear() + years); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
        r.trainees.forEach((no) => {
          const e = hr.emp(no); const cur = e.certs.find((x) => x.type === r.cert); const d = { empNo: no, type: r.cert, no: `${r.cert}-${r.id.slice(-4)}-${no}`, issued: t0, expiry: exp, permanent: false, file: null };
          const res = cur ? hr.updateCert(no, cur.id, d) : hr.addCert(d); if (res.ok) issued.push(no); else issues.push({ empNo: no, errors: res.errors });
        });
      }
      r.status = 'completed'; this._log(r, 'completed', by, issued.length ? `${r.cert}: ${issued.join(',')}` : '');
      const ok = save(); emit({ type: 'completed', id }); bus.emit('training.completed', { id, groupId: r.groupId, certTypes: r.cert ? [r.cert] : [], empNos: r.trainees, certified: issued }); return { ok: true, issued, issues, persisted: ok };
    },

    // ---------- the worker's side ----------
    shortlist(empNo) { return (state.short[empNo] || []).slice(); },
    toggleShort(empNo, groupId) { const s = state.short[empNo] || (state.short[empNo] = []); const i = s.indexOf(groupId); if (i >= 0) s.splice(i, 1); else s.push(groupId); save(); emit({ type: 'short', empNo }); return i < 0; },
    /** courses that renew what this person is missing or about to lose: an expired or soon-to-expire certificate, or a required one never held */
    suggestFor(empNo, horizon = 90) {
      const e = hr.emp(empNo); if (!e) return []; const out = []; const lang = this.languageFor(e); const need = new Map();
      e.certs.forEach((c) => { const d = hr.certDays(c); if (d != null && d <= horizon) need.set(c.type, d < 0 ? 'expired' : 'soon'); });
      (BS.comp ? BS.comp.rules().base.certs.filter((c) => c.on) : []).forEach((c) => { if (!e.certs.some((x) => x.type === c.type)) need.set(c.type, 'missing'); });
      need.forEach((why, cert) => { const g = this.certGroup(cert); if (!g) return; const list = this.intakes({ groupId: g.id }); if (!list.length) return; const soon = addDays(today(), 2); const score = (i) => (this.sameLang(i.l, lang) ? 8 : 0) + (i.start >= soon ? 4 : 0) + (i.loc ? 2 : 0) + (i.f != null ? 1 : 0); const best = list.slice().sort((a, b) => score(b) - score(a) || a.start.localeCompare(b.start))[0]; out.push({ cert, why, group: g, intake: best, count: list.length }); });
      return out.sort((a, b) => ['expired', 'missing', 'soon'].indexOf(a.why) - ['expired', 'missing', 'soon'].indexOf(b.why));
    },
    /** locations with a count of the given intakes, and how many have no mapped venue */
    mapPlaces(list) {
      const by = new Map(); let unmapped = 0; list.forEach((i) => { if (!i.loc) { unmapped++; return; } by.set(i.loc, (by.get(i.loc) || 0) + 1); });
      return { places: [...by.entries()].map(([id, n]) => ({ loc: L_BY.get(id), count: n })).filter((x) => x.loc), unmapped };
    },
    providerStats(pi, f = {}) {
      const list = this.intakes({ ...f, provider: pi }); const fees = this.feeRange(list); const locs = new Set(list.map((i) => i.loc).filter(Boolean));
      return { list, courses: new Set(list.map((i) => i.g)).size, langs: [...new Set(list.map((i) => i.l).filter(Boolean))], fees, withFee: list.filter((i) => i.f != null).length, locs: [...locs].map((id) => L_BY.get(id)), venueless: list.filter((i) => !i.loc).length, next: list[0] || null, available: list.filter((i) => i.a === 'available').length, checked: list.reduce((m, i) => (i.ck > m ? i.ck : m), '') };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  BS.train = TRAIN;
})(window.BS);
