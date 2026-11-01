/* Permissions: admin roles (pages, operations, data scope), admin accounts, and the signed-in administrator the dashboard checks against. */
(function (BS) {
  const KEY = 'bs_perm_proto_v8';
  const listeners = new Set();
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const clean = (s) => String(s == null ? '' : s).trim();
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };

  const OPS = ['view', 'create', 'update', 'delete', 'export', 'approve'];
  // every page module of the dashboard and which of the six operations make sense on it
  const PAGES = [
    ['stats', ['view', 'export']], ['people', ['view', 'create', 'update', 'delete', 'export']], ['prj', ['view', 'create', 'update', 'delete', 'export']], ['co', ['view', 'create', 'update', 'delete', 'export']],
    ['cert', ['view', 'create', 'update', 'export']], ['att', ['view', 'create', 'update', 'delete', 'export']], ['pay', ['view', 'create', 'update', 'delete', 'export', 'approve']], ['leave', ['view', 'create', 'update', 'export', 'approve']],
    ['notice', ['view', 'create', 'delete', 'export']], ['survey', ['view', 'create', 'update', 'delete', 'export']], ['content', ['view', 'create', 'update', 'delete']], ['audit', ['view', 'export']],
    ['perm', ['view', 'create', 'update', 'delete']], ['tenant', ['view', 'create', 'update', 'delete', 'export']], ['reimb', ['view', 'export', 'approve']], ['sys', ['view', 'create', 'update', 'delete', 'export']],
    ['dep', ['view', 'create', 'update', 'delete', 'export', 'approve']], ['ptw', ['view', 'create', 'update', 'delete', 'export', 'approve']],
    ['train', ['view', 'create', 'update', 'delete', 'export', 'approve']], ['wallet', ['view', 'create', 'update', 'export', 'approve']],
    ['dorm', ['view', 'create', 'update', 'export', 'approve']], ['spin', ['view', 'create', 'update', 'export', 'approve']],
  ].map(([id, ops]) => ({ id, ops }));
  const NAV_TO_PAGE = { 'a.nav.stats': 'stats', 'a.nav.people': 'people', 'a.nav.projects': 'prj', 'a.nav.clients': 'co', 'a.nav.certs': 'cert', 'a.nav.att': 'att', 'a.nav.pay': 'pay', 'a.nav.leave': 'leave', 'a.nav.notice': 'notice', 'a.nav.survey': 'survey', 'a.nav.content': 'content', 'a.nav.audit': 'audit', 'a.nav.perm': 'perm', 'a.nav.tenant': 'tenant', 'a.nav.reimb': 'reimb', 'a.nav.sys': 'sys', 'a.nav.dep': 'dep', 'a.nav.ptw': 'ptw', 'a.nav.train': 'train', 'a.nav.wallet': 'wallet', 'a.nav.dorm': 'dorm', 'a.nav.spin': 'spin' };
  // pages that belong to a Phase 2 module: shown only to tenants whose subscription includes the module
  const MODULE_PAGES = ['dep', 'ptw', 'train', 'wallet', 'dorm', 'spin'];
  // who is looking: the employer's own administrators, or an organisation outside it
  const PARTIES = ['employer', 'subcon', 'maincon', 'training_centre', 'dorm_operator'];
  const EXTERNAL = { subcon: 'sub', maincon: 'main' };   // party -> the company type its accounts must belong to
  // field groups of an employee record, and which groups each party may see
  const FIELD_GROUPS = {
    identity: ['empNo', 'name', 'nameEn', 'country', 'trades', 'idType', 'idMask', 'status'], pass: ['passType', 'passExpiry', 'wpNo', 'passportNo', 'passportExpiry', 'certs'], org: ['employer'],
    wage: ['templateId', 'rateCents', 'cpfOn'], bank: ['bank', 'bankMask'], contact: ['phone', 'address', 'account'],
    personal: ['dob', 'prSince', 'role', 'note', 'joinDate', 'leaveDate', 'disabledAt', 'secondedFrom', 'tenantId', 'pcp', 'client', 'assigns', 'createdBy'],
  };
  const VISIBLE = { employer: Object.keys(FIELD_GROUPS), subcon: Object.keys(FIELD_GROUPS), maincon: ['identity', 'pass', 'org'], training_centre: ['identity'], dorm_operator: ['identity'] };
  const allOps = () => Object.fromEntries(PAGES.map((p) => [p.id, p.ops.slice()]));
  const pick = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v === '*' ? PAGES.find((p) => p.id === k).ops.slice() : v]));

  function seed() {
    const role = (id, code, name, nameEn, desc, pages, ops, scope, status = 'active', system = false, party = 'employer') => ({ id, code, name, nameEn, desc, status, pages, ops, scope, system, party, updatedAt: '2026-08-10 15:20' });
    const roles = [
      { ...role('r1', 'SUPER_ADMIN', '超级管理员', 'Super administrator', '拥有全部页面、操作与数据', PAGES.map((p) => p.id), allOps(), { kind: 'all', projects: [] }, 'active', true), updatedAt: '2026-08-12 09:00' },
      role('r2', 'PROJECT_ADMIN', '项目管理员', 'Project administrator', '管理所属项目的人员、考勤与请假', ['stats', 'people', 'prj', 'co', 'cert', 'att', 'leave', 'notice', 'dep', 'ptw', 'train', 'wallet', 'dorm', 'spin'],
        pick({ stats: ['view', 'export'], people: ['view', 'create', 'update', 'export'], prj: ['view', 'update'], co: ['view'], cert: ['view', 'create', 'update', 'export'], att: ['view', 'update', 'export'], leave: ['view', 'update', 'export', 'approve'], notice: ['view', 'create'], dep: ['view', 'create', 'update', 'export', 'approve'], ptw: ['view', 'create', 'update', 'export', 'approve'], train: ['view', 'create', 'update', 'export', 'approve'], wallet: ['view', 'create', 'update', 'export', 'approve'], dorm: ['view', 'create', 'update', 'export', 'approve'], spin: ['view', 'create', 'update', 'export', 'approve'] }), { kind: 'projects', projects: ['raffles', 'maritime'] }),
      role('r3', 'FINANCE_ADMIN', '财务管理员', 'Finance administrator', '核对并发放工资、审核报销', ['stats', 'pay', 'reimb', 'wallet'], pick({ stats: ['view', 'export'], pay: ['view', 'update', 'export', 'approve'], reimb: ['view', 'export', 'approve'], wallet: ['view', 'export', 'approve'] }), { kind: 'company', projects: [] }),
      role('r4', 'HR_ADMIN', '人事专员', 'HR officer', '维护人员档案、证书与请假额度', ['people', 'cert', 'att', 'leave', 'survey', 'dep', 'ptw', 'train', 'wallet', 'dorm', 'spin'], pick({ people: ['view', 'create', 'update', 'delete', 'export'], cert: ['view', 'create', 'update', 'export'], att: ['view', 'export'], leave: ['view', 'update', 'export'], survey: ['view', 'create', 'update'], dep: ['view', 'export'], ptw: ['view', 'export'], train: ['view', 'export'], wallet: ['view', 'export'], dorm: ['view', 'export'], spin: ['view', 'export'] }), { kind: 'all', projects: [] }),
      role('r5', 'SUBCON_USER', '分包商用户', 'Subcontractor user', '分包商：查看自己的工人、申请部署到总包商工地', ['dep', 'ptw', 'train', 'dorm'], { dep: ['view', 'create', 'update'], ptw: ['view', 'create', 'update'], train: ['view', 'create', 'update'], dorm: ['view', 'create', 'update'] }, { kind: 'company', projects: [] }, 'active', false, 'subcon'),
      role('r6', 'MAINCON_USER', '总包商用户', 'Main contractor user', '总包商：确认分包商工人上场、管理闸机准入（不可见工资）', ['dep', 'ptw'], { dep: ['view', 'update', 'approve', 'export'], ptw: ['view', 'update', 'approve', 'export'] }, { kind: 'company', projects: [] }, 'active', false, 'maincon'),
    ];
    const t0 = BS.fmt.now().slice(0, 10); const day = (n) => BS.hr.addDays(t0, n);
    const acct = (id, name, nameEn, phone, roleId, status, last, ip) => ({ id, name, nameEn, phone, roleId, status, lastLogin: last, ip, pwAt: '2026-07-01 09:00' });
    const accounts = [
      acct('admin', '系统管理员', 'System Administrator', '91230001', 'r1', 'active', `${day(0)} 09:02`, '127.0.0.1'), acct('ops01', '张经理', 'Manager Zhang', '91230002', 'r2', 'active', `${day(-1)} 08:40`, '10.0.0.26'),
      { ...acct('finance01', '刘会计', 'Accountant Liu', '91230003', 'r3', 'active', `${day(-1)} 17:15`, '10.0.0.31'), companyId: 'c5' }, acct('hr01', '王人事', 'HR Officer Wang', '91230004', 'r4', 'active', `${day(-2)} 15:30`, '10.0.0.28'),
      acct('old01', '前任管理员', 'Former administrator', '91230005', 'r2', 'disabled', `${day(-40)} 10:12`, '10.0.0.9'),
      { ...acct('sub01', '华东劳务 周经理', 'Huadong Labour - Manager Zhou', '91230006', 'r5', 'active', `${day(-1)} 10:05`, '203.0.113.21'), companyId: 'c5' },
      { ...acct('sub02', '新城分包 黄主管', 'Xincheng Subcon - Supervisor Wong', '91230007', 'r5', 'active', `${day(-3)} 16:20`, '203.0.113.34'), companyId: 'c6' },
      { ...acct('main01', 'Pinnacle 项目协调员', 'Pinnacle - Site coordinator', '91230008', 'r6', 'active', `${day(0)} 07:30`, '198.51.100.12'), companyId: 'c9' },
    ];
    return { v: 1, roles, accounts, current: 'admin', n: 7 };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.roles) { s.roles.forEach((r) => { if (!r.party) r.party = 'employer'; }); return s; } } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  // which operation a dashboard button performs, judged from its data-act name (a prototype convention; a real build would use explicit permission codes)
  const OP_RULES = [['export', /export/], ['delete', /(^|-)(del|delete|rm|remove)(-|$)/], ['approve', /(^|-)(approve|reject|verify|decide)(-|$)/], ['create', /(^|-)(new|add|create)(-|$)/], ['update', /(^|-)(edit|upd|update)(-|$)/]];

  BS.perm = {
    OPS, PAGES, NAV_TO_PAGE, PARTIES, EXTERNAL, FIELD_GROUPS, VISIBLE, MODULE_PAGES,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    roles() { return state.roles; },
    role(id) { return state.roles.find((r) => r.id === id) || null; },
    accounts() { return state.accounts; },
    account(id) { return state.accounts.find((a) => a.id === id) || null; },
    currentId() { return state.current; },
    current() { return this.account(state.current); },
    adminCount(roleId) { return state.accounts.filter((a) => a.roleId === roleId).length; },
    pageDef(id) { return PAGES.find((p) => p.id === id); },

    // ---------- checks ----------
    /** the role an account acts under, only while both account and role are enabled */
    roleOf(a) { const r = a && a.status === 'active' ? this.role(a.roleId) : null; return r && r.status === 'active' ? r : null; },
    /** a Phase 2 page also needs the tenant's subscription to include its module */
    entitled(pageId) { return !MODULE_PAGES.includes(pageId) || BS.tenant.entitled(pageId); },
    canPage(pageId, accountId) { const r = this.roleOf(this.account(accountId || state.current)); return !!r && r.pages.includes(pageId) && this.entitled(pageId); },
    can(pageId, op, accountId) { const r = this.roleOf(this.account(accountId || state.current)); return !!r && r.pages.includes(pageId) && this.entitled(pageId) && (r.ops[pageId] || []).includes(op); },
    firstPage() { const r = this.roleOf(this.current()); return r ? PAGES.find((p) => r.pages.includes(p.id) && this.entitled(p.id)) : null; },
    /** the operation a button stands for, or null when it is not one of the six */
    opOf(act) { const m = OP_RULES.find(([, re]) => re.test(act)); return m ? m[0] : null; },
    /** true when the signed-in administrator may press this button on this page */
    guard(pageId, act) { const op = this.opOf(act); return !op || this.can(pageId, op); },
    scopeKind(role) { return role.scope.kind; },

    // ---------- party types and field visibility ----------
    /** which kind of organisation an account acts for; set on its role */
    partyOf(a) { const r = this.roleOf(a); return r ? r.party || 'employer' : 'employer'; },
    party() { return this.partyOf(this.current()); },
    /** the company an external account belongs to (null for the employer's own staff) */
    orgOf(a) { return this.partyOf(a) === 'employer' ? null : this.companyOf(a); },
    /** the employee record as that party may see it: only the permitted field groups are copied, the rest is absent.
        _hidden lists the groups left out, so a screen can show "confidential" instead of an empty cell. */
    project(party, emp) {
      if (!emp) return null; const groups = VISIBLE[party] || VISIBLE.training_centre; const out = {};
      groups.forEach((g) => FIELD_GROUPS[g].forEach((f) => { if (f in emp) out[f] = emp[f]; }));
      out._party = party; out._hidden = Object.keys(FIELD_GROUPS).filter((g) => !groups.includes(g)); return out;
    },
    /** may this account see this employee? A subcontractor sees its own workers, a main contractor those deployed to it. */
    partyCanSee(a, emp) {
      const p = this.partyOf(a); if (!emp) return false; if (p === 'employer') return this.inScopeEmp(emp);
      const org = this.companyOf(a); if (!org) return false;
      if (p === 'subcon') return BS.dep.subconOf(emp) === org.id;
      if (p === 'maincon') return BS.dep.all().some((x) => x.empNo === emp.empNo && x.mainconId === org.id && x.status !== 'rejected');
      return false;
    },

    // ---------- data scope ----------
    /** modules whose lists are cut down to the role's data scope */
    SCOPED: ['people', 'prj', 'att', 'pay', 'leave', 'cert', 'survey', 'reimb', 'wallet', 'dorm', 'spin', 'dep', 'ptw', 'train'],
    scope() { const r = this.roleOf(this.current()); return r ? r.scope : { kind: 'none', projects: [] }; },
    /** the company an account belongs to (for the 所属公司 scope), as a name that matches people's client / employer */
    companyOf(a) { const c = a && a.companyId && BS.hr.company(a.companyId); return c || null; },
    /** may the signed-in administrator see this employee's records? */
    inScopeEmp(e) {
      if (!e) return false; const sc = this.scope(); const me = this.current();
      if (sc.kind === 'all') return true;
      if (me && e.createdBy === me.id) return true; // what an administrator created stays visible to them, whatever the scope
      if (sc.kind === 'projects') return e.assigns.some((a) => sc.projects.includes(a.projectKey));
      if (sc.kind === 'company') { const c = this.companyOf(me); return !!c && (e.client === c.name || e.employer.zh === c.name || (!!c.nameEn && e.employer.en === c.nameEn)); }
      if (sc.kind === 'self') return !!me && e.createdBy === me.id;
      return false;
    },
    inScope(empNo) { return this.inScopeEmp(BS.hr.emp(empNo)); },
    /** may the signed-in administrator see this project (and its sites)? */
    inScopeProject(key) {
      const sc = this.scope(); if (sc.kind === 'all') return true; if (sc.kind === 'projects') return sc.projects.includes(key);
      if (sc.kind === 'company') return BS.hr.emps().some((e) => e.assigns.some((a) => a.projectKey === key) && this.inScopeEmp(e));
      return false;
    },
    /** keeps the items whose employee (empNo of each item) is in scope */
    scoped(list, empNoOf) { return this.scope().kind === 'all' ? list : list.filter((x) => this.inScope(empNoOf(x))); },
    scopeActive() { return this.scope().kind !== 'all'; },

    // ---------- roles ----------
    validateRole(d, id) {
      const e = {}; const cur = id ? this.role(id) : null;
      const n = clean(d.name); if (!n) e.name = 'name'; else if (n.length > 20) e.name = 'name_len'; else if (state.roles.some((r) => r.id !== id && r.name === n)) e.name = 'name_dup';
      const en = clean(d.nameEn); if (en.length > 40) e.nameEn = 'en_len';
      if (clean(d.desc).length > 100) e.desc = 'desc_len';
      if (d.party != null && !PARTIES.includes(d.party)) e.party = 'party'; else if (cur && d.party != null && d.party !== (cur.party || 'employer') && (cur.system || this.adminCount(id))) e.party = cur.system ? 'system' : 'party_used';
      if (!['active', 'disabled'].includes(d.status)) e.status = 'status'; else if (cur && cur.system && d.status === 'disabled') e.status = 'system';
      else if (cur && d.status === 'disabled' && this.current() && this.current().roleId === id) e.status = 'self';
      return e;
    },
    saveRole(d, id) {
      const e = this.validateRole(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      let r = id && this.role(id);
      if (r) Object.assign(r, { name: clean(d.name), nameEn: clean(d.nameEn) || clean(d.name), desc: clean(d.desc), status: d.status, party: d.party || r.party || 'employer', updatedAt: stamp() });
      else {
        let code = (clean(d.nameEn) || 'ROLE').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24); if (!/^[A-Z]/.test(code)) code = 'ROLE_' + code; while (state.roles.some((x) => x.code === code)) code += '_' + ++state.n;
        r = { id: 'r' + ++state.n, code, name: clean(d.name), nameEn: clean(d.nameEn) || clean(d.name), desc: clean(d.desc), status: d.status, pages: [], ops: {}, scope: { kind: d.party && d.party !== 'employer' ? 'company' : 'all', projects: [] }, system: false, party: d.party || 'employer', updatedAt: stamp() }; state.roles.push(r);
      }
      const ok = save(); emit({ type: 'role', id: r.id }); return { ok: true, role: r, persisted: ok };
    },
    /** d: { pages: [ids], ops: {page: [ops]}, scope: {kind, projects} }; operations of pages that are not granted are dropped */
    savePermissions(id, d) {
      const r = this.role(id); if (!r) return { ok: false, error: 'missing' }; if (r.system) return { ok: false, error: 'system' };
      const e = {}; const pages = d.pages.filter((p) => PAGES.some((x) => x.id === p));
      if (!['all', 'company', 'projects', 'self'].includes(d.scope.kind)) e.scope = 'scope'; else if (d.scope.kind === 'projects' && !(d.scope.projects || []).length) e.scope = 'projects';
      if (Object.keys(e).length) return { ok: false, errors: e };
      const ops = {}; pages.forEach((p) => { const def = this.pageDef(p); ops[p] = (d.ops[p] || []).filter((o) => def.ops.includes(o)); });
      r.pages = pages; r.ops = ops; r.scope = { kind: d.scope.kind, projects: d.scope.kind === 'projects' ? d.scope.projects.slice() : [] }; r.updatedAt = stamp();
      const ok = save(); emit({ type: 'role', id }); return { ok: true, persisted: ok };
    },
    deleteRole(id) {
      const r = this.role(id); if (!r) return { ok: false, error: 'missing' }; if (r.system) return { ok: false, error: 'system' };
      if (this.current() && this.current().roleId === id) return { ok: false, error: 'self' };
      const n = this.adminCount(id); state.accounts.forEach((a) => { if (a.roleId === id) a.roleId = null; });
      state.roles = state.roles.filter((x) => x.id !== id); save(); emit({ type: 'role', id }); return { ok: true, orphaned: n };
    },

    // ---------- accounts ----------
    validateAccount(d, id) {
      const e = {}; const cur = id ? this.account(id) : null;
      const a = clean(d.id); if (!cur) { if (!a) e.id = 'id'; else if (!/^[a-z][a-z0-9_.]{2,19}$/.test(a)) e.id = 'id_fmt'; else if (state.accounts.some((x) => x.id === a)) e.id = 'id_dup'; }
      const pw = d.password || ''; if (!cur && !pw) e.password = 'pw'; if (pw && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))) e.password = 'pw_fmt';
      const n = clean(d.name); if (!n) e.name = 'name'; else if (n.length > 30) e.name = 'name_len';
      const ph = clean(d.phone).replace(/[\s+()-]/g, ''); if (ph && !/^\d{8,15}$/.test(ph)) e.phone = 'phone';
      if (!d.roleId || !this.role(d.roleId)) e.roleId = 'role'; else if (this.role(d.roleId).status !== 'active' && !(cur && cur.roleId === d.roleId)) e.roleId = 'role_off';
      if (!['active', 'disabled'].includes(d.status)) e.status = 'status';
      if (d.companyId && !BS.hr.company(d.companyId)) e.companyId = 'company';
      else { const r = this.role(d.roleId); if (r && r.scope.kind === 'company' && !d.companyId) e.companyId = 'company_need'; }
      { const r = this.role(d.roleId); const need = r && EXTERNAL[r.party]; if (need) { const c = d.companyId && BS.hr.company(d.companyId); if (!d.companyId) e.companyId = 'company_need'; else if (c && c.type !== need) e.companyId = 'company_type'; } }
      if (cur && cur.id === state.current) { if (d.status === 'disabled') e.status = 'self'; else if (d.roleId !== cur.roleId) e.roleId = 'self'; }
      if (cur && d.status === 'disabled' && this.isLastSuper(cur.id)) e.status = 'last_super';
      if (cur && d.roleId !== cur.roleId && this.isLastSuper(cur.id)) e.roleId = 'last_super';
      return e;
    },
    isLastSuper(id) { const a = this.account(id); const r = a && this.role(a.roleId); return !!(r && r.system && a.status === 'active' && state.accounts.filter((x) => x.status === 'active' && x.roleId === r.id).length === 1); },
    saveAccount(d, id) {
      const e = this.validateAccount(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const f = { name: clean(d.name), nameEn: clean(d.nameEn) || clean(d.name), phone: clean(d.phone).replace(/[\s+()-]/g, ''), roleId: d.roleId, status: d.status, companyId: d.companyId || '' };
      let a = id && this.account(id); if (a) { Object.assign(a, f); if (d.password) a.pwAt = stamp(); } else { a = { id: clean(d.id), ...f, lastLogin: '', ip: '10.0.0.' + (10 + (hash(clean(d.id)) % 200)), pwAt: stamp() }; state.accounts.push(a); }
      const ok = save(); emit({ type: 'account', id: a.id }); return { ok: true, account: a, persisted: ok };
    },
    /** gives a temporary password once; only the time of the reset is kept */
    resetPassword(id) { const a = this.account(id); if (!a) return { ok: false, error: 'missing' }; const pw = 'Tmp-' + (100000 + Math.floor(Math.random() * 900000)) + 'a'; a.pwAt = stamp(); save(); emit({ type: 'account', id }); return { ok: true, password: pw }; },
    /** prototype stand-in for logging in: the dashboard then behaves as that administrator */
    signInAs(id) {
      const a = this.account(id); if (!a) return { ok: false, error: 'missing' }; if (!this.roleOf(a)) return { ok: false, error: a.status !== 'active' ? 'disabled' : 'norole' };
      state.current = id; a.lastLogin = stamp(); save(); emit({ type: 'signin', id }); return { ok: true };
    },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
