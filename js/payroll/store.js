/* Payslips: generated from attendance + the employee's salary template + approved leave + CPF rules.
   Lifecycle: generated (待核对) → verified by admin (已核对, visible to the worker) → worker confirms (待发放) or disputes (处理中)
   → admin adjusts (back to verified, worker re-confirms) → admin marks paid (已发放). */
(function (BS) {
  const KEY = 'bs_payroll_proto_v1';
  const PAID_LEAVE = ['annual', 'sick', 'toil'];       // personal leave is unpaid
  const MONTHLY_DAY_HOURS = 176;                       // 22 days × 8 h, for deducting unpaid leave from a monthly salary
  const DISPUTE_TYPES = ['hours', 'deduction', 'other'];
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const r4 = (x) => Math.round((x + Number.EPSILON) * 1e4) / 1e4;
  const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => BS.fmt.now().slice(0, 10);
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return `${m}-${pad(new Date(y, mo, 0).getDate())}`; };
  const addMonths = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };

  let state = null;
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.slips) return s; } } catch (e) { /* fall through */ } return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load() || state; emit({ type: 'sync' }); } });

  const slipId = (month, empNo) => `PS-${month.replace('-', '')}-${empNo}`;
  const leaveHoursIn = (empNo, month, types) => {
    const a = `${month}-01T00:00`, b = `${monthEnd(month)}T23:59`; let h = 0;
    BS.leaveReq.all().filter((r) => r.empNo === empNo && r.status === 'approved' && types.includes(r.type) && r.start < b && a < r.end).forEach((r) => { h += BS.leaveReq.hoursBetween(r.start > a ? r.start : a, r.end < b ? r.end : b); });
    return h;
  };

  BS.payroll = {
    DISPUTE_TYPES,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    slips() { return state.slips; },
    slip(id) { return state.slips.find((s) => s.id === id) || null; },
    mine(empNo) { return state.slips.filter((s) => s.empNo === empNo && s.payStatus !== 'unverified').sort((a, b) => b.month.localeCompare(a.month)); },
    months() { return [...new Set(state.slips.map((s) => s.month))].sort().reverse(); },
    /** a slip the admin has adjusted after a dispute and sent back for the worker to confirm again */
    reconfirm(s) { return s.userStatus === 'pending' && s.adjustments.length > 0; },

    /** Pure calculation from attendance, template, leave and CPF. extra: {incentive, other, addOt} overrides for adjustments. */
    calc(empNo, month, extra = {}) {
      const e = BS.hr.emp(empNo); const tpl = e && BS.pay.template(e.templateId); if (!e || !tpl) return null;
      const daily = tpl.type === 'daily'; const rate = e.rateCents / 100; const std = daily ? tpl.stdHours || 8 : 8; const hourly = daily ? r4(rate / std) : r4(rate / MONTHLY_DAY_HOURS);
      let base = 0, ot = 0, baseH = 0, otH = 0, worked = 0, days = 0, toil = 0, totalH = 0; const t0 = today();
      for (let d = `${month}-01`; d <= monthEnd(month) && d <= t0; d = BS.att.addDays(d, 1)) {
        const x = BS.att.day(empNo, d); if (!x.expected || !x.workMin) continue;
        const rule = tpl.rules[x.type] || tpl.rules.weekday; const h = x.workMin / 60; days++; totalH += h;
        const b = Math.min(h, rule.base), o = Math.min(Math.max(h - rule.base, 0), rule.ot); baseH += b; otH += o;
        if (daily) { base += b * hourly; if (tpl.otMode === 'pay') ot += o * hourly * rule.mult; else toil += o; }
      }
      let leaveDeduct = 0, paidLeave = 0; const paidLeaveH = leaveHoursIn(empNo, month, PAID_LEAVE), unpaidH = leaveHoursIn(empNo, month, ['personal']);
      let locked = false;
      if (daily) paidLeave = paidLeaveH * hourly;
      else {
        base = rate; leaveDeduct = unpaidH * hourly; const thr = tpl.threshold || 260; locked = totalH < thr;
        if (!locked) { const otRate = tpl.extraOtCents ? tpl.extraOtCents / 100 : r4(rate / thr) * 1.5; ot = otH * otRate; } else ot = 0;
      }
      let addOtPay = 0, addOtH = Number(extra.addOt) || 0;
      if (addOtH > 0) { const m = (tpl.rules.weekday || {}).mult || 1.5; if (daily && tpl.otMode === 'leave') toil += addOtH; else addOtPay = addOtH * (daily ? hourly : r4(rate / (tpl.threshold || 260))) * m; }
      ot += addOtPay; otH += addOtH;
      const incentive = Number(extra.incentive) || 0, other = Number(extra.other) || 0;
      const gross4 = r4(base + ot + paidLeave + incentive); const cpfBase = Math.max(0, gross4 - leaveDeduct); let cpfRate = 0, cpf4 = 0;
      if (e.cpfOn && e.idType !== 'fin') { const m = BS.cpf.match(empNo, `${month}-01`, cpfBase); if (m.ok && m.applies) { cpfRate = m.rate; cpf4 = m.deduct4; } }
      const net4 = r4(gross4 - leaveDeduct - cpf4 - other);
      return { empNo, month, templateId: tpl.id, daily, otMode: daily ? tpl.otMode : 'pay', hourly, rate, baseHours: r2(baseH), otHours: r2(otH), workHours: r2(totalH), days, paidLeaveHours: r2(paidLeaveH), unpaidLeaveHours: r2(unpaidH), toilHours: r2(toil), locked,
        base: r2(base), ot: r2(ot), paidLeave: r2(paidLeave), incentive: r2(incentive), leaveDeduct: r2(leaveDeduct), cpfRate, cpf: r2(cpf4), other: r2(other), gross: r2(gross4), net: r2(net4), gross4, net4 };
    },
    /** generate (or refresh) slips for a month; slips already verified or later are kept. */
    generate(month, { seedStatus } = {}) {
      if (!/^\d{4}-\d{2}$/.test(month) || month > today().slice(0, 7)) return { ok: false, error: 'month' };
      const made = [], refreshed = [], kept = [];
      BS.hr.emps().forEach((e, i) => {
        const c = this.calc(e.empNo, month); if (!c || (!c.days && !c.paidLeaveHours)) return;
        const id = slipId(month, e.empNo); const cur = this.slip(id);
        if (cur && cur.payStatus !== 'unverified') { kept.push(id); return; }
        const incentive = cur ? cur.incentive : 0, other = cur ? cur.other : 0;
        const full = incentive || other ? this.calc(e.empNo, month, { incentive, other }) : c;
        const rec = { id, empNo: e.empNo, month, projectKey: e.assigns[0] ? e.assigns[0].projectKey : '', ...full, userStatus: 'pending', payStatus: 'unverified', generatedAt: stamp(), verifiedAt: null, confirmedAt: null, paidAt: null, dispute: null, adjustments: [], toilCredited: 0 };
        if (cur) { Object.assign(cur, rec); refreshed.push(id); } else { state.slips.push(rec); made.push(id); }
      });
      state.slips.sort((a, b) => b.month.localeCompare(a.month) || a.empNo.localeCompare(b.empNo));
      const ok = save(); emit({ type: 'generated', month }); return { ok: true, made: made.length, refreshed: refreshed.length, kept: kept.length, persisted: ok };
    },
    preview(month) { let make = 0, refresh = 0, keep = 0; BS.hr.emps().forEach((e) => { const c = this.calc(e.empNo, month); if (!c || (!c.days && !c.paidLeaveHours)) return; const cur = this.slip(slipId(month, e.empNo)); if (!cur) make++; else if (cur.payStatus === 'unverified') refresh++; else keep++; }); return { make, refresh, keep }; },

    /** admin: 核对. Optional incentive / other deduction can be set before verification. */
    verify(id, { incentive, other } = {}) {
      const s = this.slip(id); if (!s) return { ok: false, error: 'missing' }; if (s.payStatus !== 'unverified') return { ok: false, error: 'state', status: s.payStatus };
      const inc = incentive == null || incentive === '' ? s.incentive : Number(incentive), oth = other == null || other === '' ? s.other : Number(other);
      if (!(inc >= 0 && inc <= 100000) || !(oth >= 0 && oth <= 100000)) return { ok: false, error: 'amount' };
      if (inc !== s.incentive || oth !== s.other) Object.assign(s, this.calc(s.empNo, s.month, { incentive: inc, other: oth }));
      s.payStatus = 'verified'; s.verifiedAt = stamp(); s.verifiedAt0 = s.verifiedAt;
      if (s.otMode === 'leave' && s.toilHours > 0 && !s.toilCredited) { const r = BS.leave.creditOvertime(s.empNo, s.toilHours, { zh: `${s.month} 加班 ${s.toilHours} 小时兑换调休（工资单 ${s.id}）`, en: `${s.toilHours}h overtime of ${s.month} exchanged for time off (payslip ${s.id})` }); if (r.ok) s.toilCredited = s.toilHours; }
      const ok = save(); emit({ type: 'verified', id, empNo: s.empNo }); return { ok: true, persisted: ok };
    },
    verifyAll(ids) { let n = 0; ids.forEach((id) => { const s = this.slip(id); if (s && s.payStatus === 'unverified' && this.verify(id).ok) n++; }); return { ok: true, n }; },

    /** worker: 确认无误 */
    confirm(id, empNo) {
      const s = this.slip(id); if (!s || s.empNo !== empNo) return { ok: false, error: 'missing' };
      if (s.userStatus !== 'pending' || s.payStatus !== 'verified') return { ok: false, error: 'state', status: s.userStatus };
      s.userStatus = 'confirmed'; s.payStatus = 'payable'; s.confirmedAt = stamp(); const ok = save(); emit({ type: 'confirmed', id, empNo }); return { ok: true, persisted: ok };
    },
    /** worker: 有异议 */
    dispute(id, empNo, { type, note }) {
      const s = this.slip(id); if (!s || s.empNo !== empNo) return { ok: false, error: 'missing' };
      if (s.userStatus !== 'pending' || s.payStatus !== 'verified') return { ok: false, error: 'state', status: s.userStatus };
      if (!DISPUTE_TYPES.includes(type)) return { ok: false, error: 'type' };
      const n = String(note || '').trim(); if (n.length < 5) return { ok: false, error: 'note' }; if (n.length > 200) return { ok: false, error: 'note_len' };
      s.userStatus = 'disputed'; s.payStatus = 'processing'; s.dispute = { type, note: n, at: stamp() }; const ok = save(); emit({ type: 'disputed', id, empNo }); return { ok: true, persisted: ok };
    },
    /** admin: 处理工资异议 → adjust amounts, send back to the worker to re-confirm */
    resolve(id, { addOt, incentive, other, note }) {
      const s = this.slip(id); if (!s) return { ok: false, error: 'missing' }; if (s.payStatus !== 'processing') return { ok: false, error: 'state', status: s.payStatus };
      const add = Number(addOt) || 0, inc = incentive === '' || incentive == null ? s.incentive : Number(incentive), oth = other === '' || other == null ? s.other : Number(other);
      if (!(add >= 0 && add <= 200) || !(inc >= 0 && inc <= 100000) || !(oth >= 0 && oth <= 100000)) return { ok: false, error: 'amount' };
      const why = String(note || '').trim(); if (!why) return { ok: false, error: 'note' }; if (why.length > 200) return { ok: false, error: 'note_len' };
      const before = s.net; const next = this.calc(s.empNo, s.month, { incentive: inc, other: oth, addOt: add + (s.addOtHours || 0) });
      const hadAdd = (s.addOtHours || 0) + add; const toilExtra = next.toilHours - (s.toilHours || 0);
      Object.assign(s, next); s.addOtHours = hadAdd;
      if (s.otMode === 'leave' && toilExtra > 0) { const r = BS.leave.creditOvertime(s.empNo, toilExtra, { zh: `异议处理补计加班 ${toilExtra} 小时兑换调休（${s.id}）`, en: `Extra ${toilExtra}h overtime from dispute handling exchanged for time off (${s.id})` }); if (r.ok) s.toilCredited = (s.toilCredited || 0) + toilExtra; }
      s.adjustments.push({ at: stamp(), by: 'admin', note: why, addOt: add, delta: r2(s.net - before), net: s.net, dispute: s.dispute });
      s.dispute = null; s.userStatus = 'pending'; s.payStatus = 'verified'; s.verifiedAt0 = stamp();
      const ok = save(); emit({ type: 'resolved', id, empNo: s.empNo }); return { ok: true, delta: r2(s.net - before), persisted: ok };
    },
    /** admin: 确认发放 (only after the worker confirmed) */
    pay(id) {
      const s = this.slip(id); if (!s) return { ok: false, error: 'missing' }; if (s.userStatus !== 'confirmed' || s.payStatus !== 'payable') return { ok: false, error: 'state', status: s.payStatus };
      s.payStatus = 'paid'; s.paidAt = stamp(); const ok = save(); emit({ type: 'paid', id, empNo: s.empNo }); return { ok: true, persisted: ok };
    },

    // ---------- seed ----------
    seed() {
      state = { v: 1, slips: [] }; const t0 = today(); const cur = t0.slice(0, 7); const m1 = addMonths(cur, -1), m2 = addMonths(cur, -2);
      this.generate(m2); this.generate(m1);
      const ME = BS.ME.empNo; const emps = BS.hr.emps();
      state.slips.forEach((s) => {
        const r = mulberry(hash(s.id)); const i = emps.findIndex((e) => e.empNo === s.empNo);
        if (r() < 0.22) { const inc = [100, 150, 200, 300][Math.floor(r() * 4)]; Object.assign(s, this.calc(s.empNo, s.month, { incentive: inc, other: 0 })); }
        else if (r() < 0.12) { const oth = [20, 35, 50][Math.floor(r() * 3)]; Object.assign(s, this.calc(s.empNo, s.month, { incentive: 0, other: oth })); }
      });
      state.slips.forEach((s) => {
        const i = emps.findIndex((e) => e.empNo === s.empNo); const old = s.month === m2;
        const verify = () => { s.payStatus = 'verified'; s.verifiedAt = s.verifiedAt0 = `${s.month === m2 ? m1 : cur}-03 10:${pad(i % 50)}`; };
        if (old) { verify(); s.userStatus = 'confirmed'; s.payStatus = 'paid'; s.confirmedAt = `${m1}-05 09:${pad(10 + (i % 40))}`; s.paidAt = `${m1}-08 15:00`; return; }
        if (s.empNo === ME) { verify(); return; }                                        // the phone user has a payslip waiting to be confirmed
        const k = i % 7;
        if (k === 0) return;                                                             // left unverified
        verify();
        if (k === 3 || k === 6) { s.userStatus = 'confirmed'; s.payStatus = 'payable'; s.confirmedAt = `${cur}-05 09:${pad(10 + (i % 40))}`; }
        if (k === 4) { s.userStatus = 'disputed'; s.payStatus = 'processing'; s.dispute = { type: 'hours', note: '加班时长与实际不符，实际加班比工资条多约 2 小时，请核对考勤记录。', at: `${cur}-04 11:20` }; }
        if (k === 5) { s.userStatus = 'confirmed'; s.payStatus = 'paid'; s.confirmedAt = `${cur}-04 08:45`; s.paidAt = `${cur}-06 16:30`; }
      });
      save(); emit({ type: 'seed' });
    },
    reset() { this.seed(); },
    init() { state = load(); if (!state) this.seed(); },
  };
  BS.payroll.init();
})(window.BS);
