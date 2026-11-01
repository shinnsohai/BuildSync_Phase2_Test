/* Salary templates (daily / monthly) incl. the overtime exchange mode, and the overtime calculator. */
(function (BS) {
  const KEY = 'bs_pay_proto_v1';
  const DAYS = ['weekday', 'sat', 'sun', 'special'];
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const r4 = (x) => Math.round((x + Number.EPSILON) * 1e4) / 1e4;
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const rule = (base, ot, mult) => ({ base, ot, mult });
  const baseRules = () => ({ weekday: rule(8, 2, 1.5), sat: rule(4, 4, 1.5), sun: rule(0, 8, 2), special: rule(0, 8, 2) });

  function seed() {
    return {
      v: 1,
      templates: [
        { id: 'tpl-daily', nameZh: '日薪模板', nameEn: 'Daily Pay Template', type: 'daily', stdHours: 8, otMode: 'pay', rules: baseRules(), active: true, linked: 86 },
        { id: 'tpl-260', nameZh: '月薪＋260小时门槛', nameEn: 'Monthly Pay + 260-hour Threshold', type: 'monthly', baseSalaryCents: 170000, threshold: 260, extraOtCents: null, rules: baseRules(), active: true, linked: 42 },
        { id: 'tpl-fixed', nameZh: '月薪＋固定加班时薪', nameEn: 'Monthly Pay + Fixed Overtime Rate', type: 'monthly', baseSalaryCents: 450000, threshold: 260, extraOtCents: 1200, rules: baseRules(), active: true, linked: 8 },
      ],
      ot: [],
    };
  }
  let state = load();
  function load() {
    try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.templates) return s; } } catch (e) { /* fall through */ }
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });
  const clone = (o) => JSON.parse(JSON.stringify(o));

  BS.pay = {
    DAYS,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    templates() { return state.templates; },
    template(id) { return state.templates.find((x) => x.id === id) || null; },
    entries() { return state.ot.slice().sort((a, b) => b.at.localeCompare(a.at)); },
    blankRules: baseRules,

    /** 'pay' | 'leave' — how this person's overtime is exchanged (monthly templates are always paid). */
    modeFor(empNo) {
      const p = BS.leave.person(empNo); const tpl = p && this.template(p.templateId);
      return tpl && tpl.type === 'daily' ? tpl.otMode : 'pay';
    },

    /** create (no id) or update. Returns {ok, tpl}. */
    save(tpl) {
      const t = clone(tpl);
      if (!t.id) { t.id = 'tpl-' + Date.now().toString(36); t.linked = 0; t.active = true; state.templates.push(t); }
      else { const i = state.templates.findIndex((x) => x.id === t.id); if (i < 0) return { ok: false, error: 'missing' }; t.linked = state.templates[i].linked; t.active = state.templates[i].active; state.templates[i] = t; }
      const ok = save(); emit({ type: 'saved', id: t.id });
      return { ok: true, tpl: t, persisted: ok };
    },
    remove(id) {
      const t = this.template(id); if (!t) return { ok: false, error: 'missing' };
      const bound = BS.leave.people().filter((p) => p.templateId === id).length;
      if (t.linked > 0 || bound > 0) return { ok: false, error: 'linked', n: Math.max(t.linked, bound) };
      state.templates = state.templates.filter((x) => x.id !== id); save(); emit({ type: 'removed', id });
      return { ok: true };
    },

    /** Pure calculation. worked = total hours worked that day; special = date matches an attendance-group special date. */
    calc(empNo, dateISO, worked, special) {
      const p = BS.leave.person(empNo); const tpl = p && this.template(p.templateId);
      if (!p || !tpl) return { ok: false, error: 'missing' };
      if (tpl.type !== 'daily') return { ok: false, error: 'monthly', tpl, person: p };
      const [y, m, d] = dateISO.split('-').map(Number); const wd = new Date(y, m - 1, d).getDay();
      const useSpecial = !!(special && tpl.rules.special);
      const dayType = useSpecial ? 'special' : wd === 0 ? 'sun' : wd === 6 ? 'sat' : 'weekday';
      const rl = tpl.rules[dayType];
      const baseHrs = Math.min(worked, rl.base);
      const otHrs = Math.min(Math.max(worked - rl.base, 0), rl.ot);
      const excess = Math.max(worked - rl.base - rl.ot, 0);
      const hourly = r4((p.rate / 100) / tpl.stdHours);
      const basePay = r4(baseHrs * hourly);
      const out = { ok: true, tpl, person: p, mode: tpl.otMode, dayType, rule: rl, specialIgnored: !!special && !tpl.rules.special, worked, baseHrs, otHrs, excess, hourly, basePay };
      if (tpl.otMode === 'pay') { out.otPay = r4(otHrs * hourly * rl.mult); out.total4 = r4(basePay + out.otPay); out.total2 = r2(out.total4); }
      else { out.otPay = 0; out.total4 = basePay; out.total2 = r2(basePay); out.creditHours = r2(otHrs); }
      return out;
    },

    /** Record overtime; in leave mode it credits the person's 调休 balance. */
    registerOvertime(empNo, dateISO, worked, special) {
      const c = this.calc(empNo, dateISO, worked, special);
      if (!c.ok) return c;
      if (c.mode === 'leave') {
        if (c.creditHours <= 0) return { ok: false, error: 'no_ot', calc: c };
        const r = BS.leave.creditOvertime(empNo, c.creditHours, { zh: `${dateISO} 加班 ${c.creditHours} 小时兑换调休`, en: `${c.creditHours}h overtime on ${dateISO} exchanged for time off` });
        if (!r.ok) return r;
      }
      state.ot.push({ id: 'ot' + Date.now().toString(36), empNo, date: dateISO, worked, dayType: c.dayType, mode: c.mode, otHrs: c.otHrs, creditHours: c.creditHours || 0, amount2: c.total2, otPay2: r2(c.otPay), at: BS.fmt.now() });
      state.ot = state.ot.slice(-30);
      save(); emit({ type: 'ot', empNo });
      return { ok: true, calc: c };
    },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
