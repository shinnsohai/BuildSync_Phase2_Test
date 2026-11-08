/* Tenants and their subscriptions (seats, price, period, renewal and seat-change history) + derived user provisioning data. */
(function (BS) {
  const KEY = 'bs_tenant_proto_v7';
  const SOON_DAYS = 30;                       // "即将到期" = ends within this many days
  const MAX_SEATS = 100000, MAX_PRICE_CENTS = 100000000, MAX_YEARS = 10;
  const listeners = new Set();
  const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } });
  const pad = (n) => String(n).padStart(2, '0');
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return iso(x); };
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && iso(parse(s)) === s;
  const today = () => BS.fmt.now().slice(0, 10);
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // [id, customerId, name, account, status, createdAt, total, active, color]   (first six follow the tenant-list design)
  const TENANTS = [
    ['ten-xinghan', 'TEN-00012', '星瀚建设 Pte. Ltd.', 'xinghan.admin', 'active', '2026-01-10 09:20', 286, 274, 0],
    ['ten-yuanchuan', 'TEN-00027', '远川工程有限公司', 'yuanchuan.ops', 'disabled', '2025-11-05 14:32', 154, 131, 1],
    ['ten-huazhu', 'TEN-00034', '华筑劳务集团', 'huazhu.admin', 'active', '2026-02-18 10:08', 318, 310, 2],
    ['ten-lioncityworks', 'TEN-00049', 'Lion City Works', 'lioncity.hr', 'disabled', '2025-12-22 16:40', 96, 79, 3],
    ['ten-xinyu', 'TEN-00063', '新域设施管理', 'xinyu.admin', 'disabled', '2026-03-06 11:15', 210, 179, 4],
    ['ten-tuojian', 'TEN-00077', '拓建工程服务', 'tuojian.ops', 'disabled', '2026-04-12 08:55', 128, 122, 5],
    // tenants named in the subscription-record design
    ['ten-lioncity', 'TEN-00128', 'Lion City Engineering', 'lioncityeng.admin', 'active', '2024-10-22 15:30', 94, 86, 6],
    ['ten-vertex', 'TEN-00206', 'Vertex Build Solutions', 'vertex.admin', 'active', '2026-10-02 10:00', 52, 48, 7],
    ['ten-harbour', 'TEN-00241', 'HarbourWorks Construction', 'harbour.admin', 'active', '2024-11-01 09:00', 210, 196, 0],
    ['ten-greenspan', 'TEN-00272', 'GreenSpan Contractors', 'greenspan.ops', 'active', '2026-09-28 13:45', 40, 36, 2],
    ['ten-meridian', 'TEN-00281', 'Meridian M&E Services', 'meridian.admin', 'disabled', '2025-09-25 11:20', 130, 118, 1],
    ['ten-northlink', 'TEN-00285', 'NorthLink Civil Pte Ltd', 'northlink.ops', 'disabled', '2026-07-20 16:05', 24, 20, 4],
  ];
  // [tenantId, priceCents, seats, start, end, cancelledAt]  — dates are absolute (YYYY-MM-DD) or offsets from today ('+7' / '-23')
  const SUBS = [
    ['ten-xinghan', 59900, 300, '2026-01-10', '2027-12-31'], ['ten-yuanchuan', 29900, 160, '2025-09-21', '2026-09-20'], ['ten-huazhu', 59900, 330, '2026-02-18', '2028-03-15'],
    ['ten-lioncityworks', 29900, 100, '2025-09-01', '2026-08-31'], ['ten-xinyu', 59900, 220, '2026-03-06', '2027-06-30'], ['ten-tuojian', 29900, 130, '2026-04-12', '2027-01-15'],
    ['ten-lioncity', 129900, 120, '-23', '+60'], ['ten-vertex', 59900, 60, '+8', '+37'], ['ten-harbour', 1299000, 220, '-359', '+7'],
    ['ten-greenspan', 29900, 50, '-23', '+90'], ['ten-meridian', 599000, 140, '-389', '-24'], ['ten-northlink', 29900, 30, '-84', '-53', 'cancel'],
  ];
  const off = (v) => (/^[+-]\d+$/.test(v) ? addDays(today(), +v) : v);

  // Phase 2 modules a subscription can include. 'ready' ones exist in the prototype; the rest are listed so the tenant screen shows the roadmap.
  // Phase 1 modules (people, attendance, payroll, leave ...) are part of every subscription.
  const MODULES = [
    { id: 'dep', zh: '部署与合规', en: 'Deployments & compliance', ready: true },
    { id: 'ptw', zh: '工作许可（PTW）', en: 'Permit to Work', ready: true },
    { id: 'train', zh: '培训中心预订', en: 'Training hub', ready: true },
    { id: 'wallet', zh: '激励与钱包', en: 'Incentives & wallets', ready: true },
    { id: 'dorm', zh: '宿舍床位', en: 'Dormitory hub', ready: true },
    { id: 'spin', zh: '转转乐', en: 'Spin & win', ready: true },
    { id: 'kchat', zh: '现场群聊看板', en: 'Site chat & Kanban', ready: true },
  ];
  const DEFAULT_MODULES = { 'ten-xinghan': ['dep', 'ptw', 'train', 'wallet', 'dorm', 'spin', 'kchat'], 'ten-huazhu': ['dep', 'ptw', 'train', 'wallet', 'dorm', 'spin', 'kchat'] };

  function seed() {
    const tenants = TENANTS.map(([id, customerId, name, account, status, createdAt, total, active, color]) => ({ id, customerId, name, account, status, createdAt, total, active, color, logo: null, modules: (DEFAULT_MODULES[id] || []).slice() }));
    const subs = SUBS.map(([tenantId, priceCents, seats, s, e, cancel]) => ({ tenantId, priceCents, seats, start: off(s), end: off(e), cancelledAt: cancel ? addDays(off(e), -10) + ' 10:00' : null, note: '', renewals: [], seatLog: [] }));
    const lc = subs.find((x) => x.tenantId === 'ten-lioncity');
    lc.renewals = [
      { at: '2026-10-18 14:20', from: '2026-10-31', to: '2027-10-31', by: 'admin', note: '年度续约' },
      { at: '2025-10-20 09:35', from: '2025-10-31', to: '2026-10-31', by: 'admin', note: '年度续约' },
      { at: '2024-10-22 16:08', from: '2024-10-31', to: '2025-10-31', by: 'ops', note: '首次续约' },
    ];
    lc.seatLog = [
      { at: '2026-10-18 15:05', before: 100, after: 120, by: 'admin', note: '' },
      { at: '2026-08-12 10:30', before: 80, after: 100, by: 'ops', note: '' },
      { at: '2026-04-03 11:46', before: 100, after: 80, by: 'admin', note: '' },
    ];
    return { v: 1, tenants, subs };
  }

  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.tenants) { s.tenants.forEach((t) => { if (!Array.isArray(t.modules)) t.modules = (DEFAULT_MODULES[t.id] || []).slice(); }); return s; } } } catch (e) { /* fall through */ } return seed(); }
  function save() {
    const attempt = () => localStorage.setItem(KEY, JSON.stringify(state));
    try { attempt(); return true; } catch (e) { state.tenants.forEach((t) => { t.logo = null; }); try { attempt(); BS.warnStorage && BS.warnStorage(); return true; } catch (e2) { return false; } }
  }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); usersCache = null; emit({ type: 'sync' }); } });

  // ---------- derived user provisioning data (deterministic, not stored) ----------
  const SUR = [['陈', 'Chen'], ['李', 'Li'], ['王', 'Wang'], ['张', 'Zhang'], ['林', 'Lin'], ['赵', 'Zhao'], ['刘', 'Liu'], ['周', 'Zhou'], ['吴', 'Wu'], ['黄', 'Huang'], ['孙', 'Sun'], ['许', 'Xu']];
  const GIV = [['建国', 'Jianguo'], ['明', 'Ming'], ['强', 'Qiang'], ['颖', 'Ying'], ['晓雨', 'Xiaoyu'], ['磊', 'Lei'], ['洋', 'Yang'], ['莉', 'Li'], ['伟', 'Wei'], ['海', 'Hai'], ['峰', 'Feng'], ['玲', 'Ling'], ['浩', 'Hao'], ['敏', 'Min'], ['杰', 'Jie'], ['娜', 'Na']];
  let usersCache = null;
  function users() {
    if (usersCache) return usersCache;
    const t0 = today(); const out = [];
    state.tenants.forEach((tn, ti) => {
      const r = mulberry(1000 + ti * 77); const prefix = tn.account.split('.')[0].slice(0, 6);
      for (let i = 0; i < tn.total; i++) {
        const active = i < tn.active; const s = SUR[Math.floor(r() * SUR.length)], g = GIV[Math.floor(r() * GIV.length)];
        const recent = r() < 0.07; const openedOff = recent ? -Math.floor(r() * 30) : -(30 + Math.floor(r() * 700));
        const opened = addDays(t0, openedOff);
        let disabled = null;
        if (!active) { const back = r() < 0.4 ? Math.floor(r() * Math.min(30, -openedOff)) : Math.floor(r() * Math.max(1, -openedOff)); disabled = addDays(t0, -Math.min(back, -openedOff)); if (disabled < opened) disabled = opened; }
        out.push({ tenantId: tn.id, name: s[0] + g[0], nameEn: `${g[1]} ${s[1]}`, account: `${prefix}${String(i + 1).padStart(3, '0')}`, opened, status: active ? 'active' : 'disabled', disabled });
      }
    });
    usersCache = out; return out;
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const lc = (s) => String(s || '').trim().toLowerCase();

  BS.tenant = {
    SOON_DAYS, MAX_SEATS, MAX_PRICE_CENTS, MAX_YEARS, addDays,
    ME_TENANT: 'ten-xinghan',
    MODULES,
    /** is a Phase 2 module part of the tenant's subscription? Anything that is not a Phase 2 module is always on. */
    hasModule(tenantId, moduleId) { if (!MODULES.some((m) => m.id === moduleId)) return true; const t = this.tenant(tenantId); return !!t && t.modules.includes(moduleId); },
    /** the signed-in organisation's entitlement: a disabled tenant or an unusable subscription gives no Phase 2 modules */
    entitled(moduleId, tenantId) { const id = tenantId || this.ME_TENANT; return this.hasModule(id, moduleId) && this.access(id).ok; },
    setModules(tenantId, ids) {
      const t = this.tenant(tenantId); if (!t) return { ok: false, error: 'missing' };
      const list = [...new Set(ids)]; if (list.some((m) => !MODULES.some((x) => x.id === m))) return { ok: false, error: 'module' };
      if (list.some((m) => !t.modules.includes(m) && !MODULES.find((x) => x.id === m).ready)) return { ok: false, error: 'not_ready' };
      t.modules = MODULES.filter((m) => list.includes(m.id)).map((m) => m.id); const ok = save(); emit({ type: 'modules', id: tenantId }); return { ok: true, persisted: ok };
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    tenants() { return state.tenants; },
    tenant(id) { return state.tenants.find((t) => t.id === id) || null; },
    subs() { return state.subs; },
    sub(tenantId) { return state.subs.find((s) => s.tenantId === tenantId) || null; },
    users() { return users(); },

    /** 待生效 / 生效中 / 即将到期 / 已到期 / 已退订 — derived from dates (cancel wins) */
    subStatus(sub) {
      if (!sub) return 'none'; if (sub.cancelledAt) return 'cancelled';
      const t0 = today();
      if (sub.start > t0) return 'upcoming'; if (sub.end < t0) return 'expired';
      return sub.end <= addDays(t0, SOON_DAYS) ? 'soon' : 'active';
    },
    daysLeft(sub) { return Math.round((parse(sub.end) - parse(today())) / 864e5); },
    used(tenantId) { const t = this.tenant(tenantId); return t ? t.active : 0; },

    /** Why a tenant's staff can or can't use the app right now. */
    access(tenantId) {
      const t = this.tenant(tenantId); if (!t) return { ok: true };
      if (t.status === 'disabled') return { ok: false, reason: 'tenant_disabled' };
      const st = this.subStatus(this.sub(tenantId));
      if (st === 'expired' || st === 'cancelled' || st === 'upcoming') return { ok: false, reason: 'sub_' + st };
      return { ok: true };
    },

    // ----- tenants
    validateTenant(d, id) {
      const e = {}; const name = String(d.name || '').trim(), acc = String(d.account || '').trim();
      if (!name) e.name = 'name'; else if (name.length > 60) e.name = 'name_len';
      else if (state.tenants.some((t) => t.id !== id && lc(t.name) === lc(name))) e.name = 'name_dup';
      if (!acc) e.account = 'account'; else if (!/^[a-zA-Z0-9._-]{3,30}$/.test(acc)) e.account = 'account_fmt';
      else if (state.tenants.some((t) => t.id !== id && lc(t.account) === lc(acc))) e.account = 'account_dup';
      const pw = d.password || '';
      if (!id && !pw) e.password = 'pw';
      if (pw && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))) e.password = 'pw_fmt';
      if (!['active', 'disabled'].includes(d.status)) e.status = 'status';
      return e;
    },
    /** d: {name, account, password, status, logo}. The prototype never stores the password. */
    saveTenant(d, id) {
      const e = this.validateTenant(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      let t;
      if (id) { t = this.tenant(id); if (!t) return { ok: false, errors: { name: 'missing' } }; }
      else {
        const n = state.tenants.reduce((m, x) => Math.max(m, +x.customerId.slice(4)), 0) + 1;
        t = { id: 'ten-' + Date.now().toString(36), customerId: 'TEN-' + String(n).padStart(5, '0'), createdAt: BS.fmt.now().slice(0, 16).replace('T', ' '), total: 0, active: 0, color: state.tenants.length % 8, logo: null };
        state.tenants.push(t);
      }
      t.name = d.name.trim(); t.account = d.account.trim(); t.status = d.status; if (d.logo !== undefined) t.logo = d.logo;
      if (!Array.isArray(t.modules)) t.modules = []; if (Array.isArray(d.modules)) t.modules = MODULES.filter((m) => d.modules.includes(m.id) && (m.ready || t.modules.includes(m.id))).map((m) => m.id);
      const ok = save(); usersCache = null; emit({ type: id ? 'tenant-saved' : 'tenant-created', id: t.id });
      return { ok: true, tenant: t, persisted: ok };
    },
    setStatus(id, status) {
      const t = this.tenant(id); if (!t) return { ok: false };
      t.status = status; save(); emit({ type: 'tenant-status', id, status }); return { ok: true };
    },

    // ----- subscriptions
    validateSub(d) {
      const e = {};
      const t = this.tenant(d.tenantId);
      if (!t) e.tenantId = 'tenant'; else if (this.sub(d.tenantId)) e.tenantId = 'exists';
      if (!/^\d+$/.test(String(d.seats)) || +d.seats < 1 || +d.seats > MAX_SEATS) e.seats = 'seats';
      else if (t && +d.seats < t.active) e.seats = 'seats_used';
      if (!/^\d+(\.\d{1,2})?$/.test(String(d.price)) || !(Number(d.price) > 0) || Math.round(Number(d.price) * 100) > MAX_PRICE_CENTS) e.price = 'price';
      if (!validDate(d.start)) e.start = 'start';
      if (!validDate(d.end)) e.end = 'end'; else if (validDate(d.start) && d.end < d.start) e.end = 'end_before';
      else if (validDate(d.start) && d.end > addDays(d.start, 365 * MAX_YEARS)) e.end = 'end_long';
      return e;
    },
    createSub(d, by = 'admin') {
      const e = this.validateSub(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const s = { tenantId: d.tenantId, priceCents: Math.round(Number(d.price) * 100), seats: +d.seats, start: d.start, end: d.end, cancelledAt: null, note: String(d.note || '').trim(), renewals: [], seatLog: [] };
      state.subs.push(s); const ok = save(); emit({ type: 'sub-created', id: d.tenantId });
      return { ok: true, sub: s, persisted: ok };
    },
    /** Extend the end date. After expiry/cancellation the new end must be in the future; renewing a cancelled subscription reactivates it. */
    renew(tenantId, newEnd, note, by = 'admin') {
      const s = this.sub(tenantId); if (!s) return { ok: false, error: 'missing' };
      if (!validDate(newEnd)) return { ok: false, error: 'date' };
      const floor = s.cancelledAt || s.end < today() ? today() : s.end;
      if (newEnd <= floor) return { ok: false, error: 'not_later', floor };
      if (newEnd > addDays(s.start, 365 * MAX_YEARS)) return { ok: false, error: 'too_long' };
      if (String(note || '').length > 200) return { ok: false, error: 'note_len' };
      const was = this.subStatus(s);
      s.renewals.unshift({ at: BS.fmt.now().slice(0, 16).replace('T', ' '), from: s.end, to: newEnd, by, note: String(note || '').trim() });
      s.end = newEnd; s.cancelledAt = null;
      const ok = save(); emit({ type: 'renewed', id: tenantId, was }); return { ok: true, persisted: ok, was };
    },
    adjustSeats(tenantId, newSeats, note, by = 'admin') {
      const s = this.sub(tenantId), t = this.tenant(tenantId); if (!s || !t) return { ok: false, error: 'missing' };
      const st = this.subStatus(s); if (st === 'expired' || st === 'cancelled') return { ok: false, error: 'inactive', status: st };
      if (!/^\d+$/.test(String(newSeats)) || +newSeats < 1 || +newSeats > MAX_SEATS) return { ok: false, error: 'seats' };
      if (+newSeats === s.seats) return { ok: false, error: 'same' };
      if (+newSeats < t.active) return { ok: false, error: 'below_used', used: t.active };
      if (String(note || '').length > 200) return { ok: false, error: 'note_len' };
      s.seatLog.unshift({ at: BS.fmt.now().slice(0, 16).replace('T', ' '), before: s.seats, after: +newSeats, by, note: String(note || '').trim() });
      s.seats = +newSeats; const ok = save(); emit({ type: 'seats', id: tenantId }); return { ok: true, persisted: ok };
    },
    cancelSub(tenantId) {
      const s = this.sub(tenantId); if (!s) return { ok: false };
      const st = this.subStatus(s); if (st === 'expired' || st === 'cancelled') return { ok: false, error: 'inactive', status: st };
      s.cancelledAt = BS.fmt.now().slice(0, 16).replace('T', ' '); save(); emit({ type: 'cancelled', id: tenantId }); return { ok: true };
    },

    reset() { state = seed(); usersCache = null; save(); emit({ type: 'reset' }); },
  };
})(window.BS);
