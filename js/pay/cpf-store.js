/* CPF (公积金) employee-deduction rules for citizens and permanent residents: effective-dated versions, one optional PR default,
   an adjustment log, and the matcher that picks the rule for a person and month. Employee share only. */
(function (BS) {
  const KEY = 'bs_cpf_proto_v1';
  const BANDS = ['le55', '55_60', '60_65', '65_70', 'gt70'];
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const pad = (n) => String(n).padStart(2, '0');
  const r4 = (x) => Math.round((x + Number.EPSILON) * 1e4) / 1e4;
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && iso(parse(s)) === s;
  const today = () => BS.fmt.now().slice(0, 10);
  const monthStart = () => today().slice(0, 8) + '01';

  const def = (group, stage, band, rate) => ({ id: `${group[0]}-${stage || 'x'}-${band}`, group, stage, band, versions: [{ rate, effective: '2026-01-01', by: 'system', reason: '', at: '2026-01-01 00:00' }] });
  function seed() {
    const rules = [
      def('citizen', null, 'le55', 20), def('citizen', null, '55_60', 18), def('citizen', null, '60_65', 12.5), def('citizen', null, '65_70', 7.5), def('citizen', null, 'gt70', 5),
      def('pr', 'y1', 'all', 5), def('pr', 'y2', 'all', 15), def('pr', 'y3', 'le55', 20), def('pr', 'y3', '55_60', 18), def('pr', 'y3', '60_65', 12.5), def('pr', 'y3', '65_70', 7.5), def('pr', 'y3', 'gt70', 5),
    ];
    return { v: 1, rules, defaultId: null, log: [] };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.rules) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  function ageAt(dob, date) { const b = parse(dob), d = parse(date); let a = d.getFullYear() - b.getFullYear(); if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--; return a; }
  function bandOf(age) { return age <= 55 ? 'le55' : age <= 60 ? '55_60' : age <= 65 ? '60_65' : age <= 70 ? '65_70' : 'gt70'; }
  function prStage(since, date) { const s = parse(since), d = parse(date); const months = (d.getFullYear() - s.getFullYear()) * 12 + d.getMonth() - s.getMonth() - (d.getDate() < s.getDate() ? 1 : 0); return months < 12 ? 'y1' : months < 24 ? 'y2' : 'y3'; }

  BS.cpf = {
    BANDS, ageAt, bandOf, prStage,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    rules(group) { return state.rules.filter((r) => r.group === group); },
    rule(id) { return state.rules.find((r) => r.id === id) || null; },
    defaultId() { return state.defaultId; },
    log() { return state.log.slice().sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)); },
    profile(empNo) { const e = BS.hr.emp(empNo); return e ? { idType: e.idType, dob: e.dob, prSince: e.prSince || null } : null; },
    /** version in force on a date (latest with effective <= date); falls back to the earliest */
    versionAt(rule, date) { const v = rule.versions.filter((x) => x.effective <= date).sort((a, b) => b.effective.localeCompare(a.effective))[0]; return v || rule.versions[0]; },
    current(rule) { return this.versionAt(rule, today()); },
    pending(rule) { return rule.versions.filter((x) => x.effective > today()).sort((a, b) => a.effective.localeCompare(b.effective)); },

    /** Edit one rule. d: {rate, effective, reason, isDefault?}. Effective date can't precede the version in force, or the first day of this month (closed months are locked). */
    validate(rule, d) {
      const e = {}; const cur = this.current(rule);
      if (!/^\d+(\.\d{1,2})?$/.test(String(d.rate)) || Number(d.rate) > 50) e.rate = 'rate';
      if (!validDate(d.effective)) e.effective = 'effective';
      else if (d.effective < cur.effective) e.effective = 'before_cur';
      else if (d.effective < monthStart()) e.effective = 'locked';
      const why = String(d.reason || '').trim(); if (!why) e.reason = 'reason'; else if (why.length > 100) e.reason = 'reason_len';
      return e;
    },
    update(id, d, by = 'admin') {
      const rule = this.rule(id); if (!rule) return { ok: false, errors: { rate: 'missing' } };
      const e = this.validate(rule, d); if (Object.keys(e).length) return { ok: false, errors: e };
      const cur = this.current(rule); const rate = Number(d.rate); const wantDefault = rule.group === 'pr' ? !!d.isDefault : false;
      const rateChanged = rate !== cur.rate;   // a new effective date alone doesn't create a version
      const defChanged = rule.group === 'pr' && wantDefault !== (state.defaultId === id);
      if (!rateChanged && !defChanged) return { ok: false, errors: { rate: 'nochange' } };
      const at = BS.fmt.now().slice(0, 16).replace('T', ' '); const why = String(d.reason).trim();
      if (rateChanged) {
        // same effective date as the version in force = correction in place; later = new version
        const same = rule.versions.find((v) => v.effective === d.effective);
        const before = cur.rate;
        if (same) { same.rate = rate; same.reason = why; same.by = by; same.at = at; } else rule.versions.push({ rate, effective: d.effective, by, reason: why, at });
        rule.versions.sort((a, b) => a.effective.localeCompare(b.effective));
        state.log.push({ id: 'C' + String(state.log.length + 1).padStart(4, '0'), at, ruleId: id, kind: 'rate', before, after: rate, effective: d.effective, by, reason: why });
      }
      if (defChanged) this._setDefault(wantDefault ? id : null, why, by, at);
      const ok = save(); emit({ type: 'updated', id }); return { ok: true, persisted: ok };
    },
    _setDefault(id, why, by, at) {
      const prev = state.defaultId; state.defaultId = id;
      state.log.push({ id: 'C' + String(state.log.length + 1).padStart(4, '0'), at: at || BS.fmt.now().slice(0, 16).replace('T', ' '), ruleId: id || prev, kind: id ? 'default_on' : 'default_off', prevId: prev, effective: today(), by, reason: why });
    },
    /** table checkbox: tick one PR rule as the default, or untick it */
    setDefault(id, on, reason, by = 'admin') {
      const rule = id && this.rule(id); if (id && (!rule || rule.group !== 'pr')) return { ok: false };
      const target = on ? id : null; if (state.defaultId === target) return { ok: true };
      this._setDefault(target, reason || '', by); const ok = save(); emit({ type: 'default', id }); return { ok: true, persisted: ok };
    },
    /** edit several rules with one effective date + reason; all-or-nothing */
    bulkUpdate(items, effective, reason, by = 'admin') {
      const errors = {};
      const changed = (it) => { const r = this.rule(it.id); return r && Number(it.rate) !== this.current(r).rate; };
      items.filter(changed).forEach((it) => { const r = this.rule(it.id); const e = this.validate(r, { rate: it.rate, effective, reason }); if (Object.keys(e).length) errors[it.id] = e; });
      if (Object.keys(errors).length) return { ok: false, errors };
      let n = 0; items.filter(changed).forEach((it) => { const res = this.update(it.id, { rate: it.rate, effective, reason, isDefault: state.defaultId === it.id }, by); if (res.ok) n++; });
      return { ok: true, n };
    },

    /** Which rule applies to this person in the month of `date`, and what is deducted from `wage` (employee share). */
    match(empNo, date, wage) {
      const p = this.profile(empNo); if (!p) return { ok: false, error: 'profile' };
      if (p.idType === 'fin') return { ok: true, applies: false, idType: 'fin', profile: p };
      const age = ageAt(p.dob, date); const band = bandOf(age); let rule, how, stage = null;
      if (p.idType === 'citizen') { rule = state.rules.find((r) => r.group === 'citizen' && r.band === band); how = 'age'; }
      else {
        stage = prStage(p.prSince, date);
        const def = state.defaultId && this.rule(state.defaultId);
        if (def) { rule = def; how = 'default'; } else { rule = state.rules.find((r) => r.group === 'pr' && r.stage === stage && (stage !== 'y3' || r.band === band)); how = stage === 'y3' ? 'stage_age' : 'stage'; }
      }
      const v = this.versionAt(rule, date); const rate = v.rate;
      const raw = r4(Number(wage) * rate / 100);
      return { ok: true, applies: true, idType: p.idType, profile: p, age, band, stage, rule, how, version: v, rate, deduct4: raw, deduct: r2(raw), net: r2(Number(wage) - r2(raw)) };
    },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
