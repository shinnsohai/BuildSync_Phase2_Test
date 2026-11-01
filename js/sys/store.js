/* System & third-party configuration: third-party services, phone-number regions (fixed), the phone's agreement / about content, and the base dictionaries. */
(function (BS) {
  const KEY = 'bs_sys_proto_v1';
  const listeners = new Set();
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const clean = (s) => String(s == null ? '' : s).trim();
  const maskKey = (k) => `•••• ${String(k).slice(-4)}`;

  // fixed reference data, shown read-only
  const REGIONS = [
    ['中国', 'China', '+86', 11, 'zh', true], ['新加坡', 'Singapore', '+65', 8, 'en', true], ['马来西亚', 'Malaysia', '+60', '9–10', 'en', true], ['澳大利亚', 'Australia', '+61', 9, 'en', true],
    ['印度', 'India', '+91', 10, 'en', true], ['孟加拉国', 'Bangladesh', '+880', 10, 'en', true], ['缅甸', 'Myanmar', '+95', '8–10', 'en', true], ['印度尼西亚', 'Indonesia', '+62', '9–12', 'en', true], ['菲律宾', 'Philippines', '+63', 10, 'en', true], ['泰国', 'Thailand', '+66', 9, 'en', false],
  ].map(([zh, en, code, digits, lang, sms]) => ({ zh, en, code, digits, lang, sms }));

  const SVC_FIELDS = { map: ['projectId', 'apiKey'], sms: ['accessKey', 'secret', 'senderId'], file: ['bucket', 'endpoint', 'accessKey', 'secret'] };
  const SECRET = new Set(['apiKey', 'secret', 'accessKey']);

  const dictItem = (id, zh, en, code, parent, sort, status = 'active', key) => ({ id, zh, en, code, parent: parent || '', sort, status, key: key || '' });
  function seed() {
    const t0 = BS.fmt.now().slice(0, 10); const day = (n) => BS.hr.addDays(t0, n);
    const countries = [['sg', '新加坡', 'Singapore', 'SGP'], ['cn', '中国', 'China', 'CHN'], ['my', '马来西亚', 'Malaysia', 'MYS'], ['in', '印度', 'India', 'IND'], ['bd', '孟加拉国', 'Bangladesh', 'BGD'], ['mm', '缅甸', 'Myanmar', 'MMR'], ['id', '印度尼西亚', 'Indonesia', 'IDN'], ['ph', '菲律宾', 'Philippines', 'PHL']];
    return {
      v: 1, n: 100,
      services: [
        { id: 'map', zh: 'Google Maps', en: 'Google Maps', type: 'map', config: { projectId: 'builtsync-prod-2026' }, secrets: { apiKey: maskKey('AIzaSyD-demo-3f2a') }, secretOk: true, enabled: true, lastTestAt: `${day(-2)} 09:12`, lastResult: 'ok' },
        { id: 'sms', zh: '国际短信服务', en: 'International SMS', type: 'sms', config: { senderId: 'BuiltSync' }, secrets: { accessKey: maskKey('AKIA-demo-77C1'), secret: maskKey('secret-demo-9d40') }, secretOk: true, enabled: true, lastTestAt: `${day(-2)} 09:16`, lastResult: 'ok' },
        { id: 'file', zh: '对象存储', en: 'Object storage', type: 'file', config: { bucket: 'builtsync-files-sg', endpoint: 'https://s3.ap-southeast-1.example.com' }, secrets: { accessKey: maskKey('AKIA-demo-51B8'), secret: maskKey('secret-demo-0e12') }, secretOk: true, enabled: true, lastTestAt: `${day(-3)} 16:20`, lastResult: 'ok' },
      ],
      contents: [
        { id: 'privacy', type: 'agreement', titleZh: '隐私协议', titleEn: 'Privacy Policy', version: 'V1.2', status: 'published', updatedAt: `${day(-14)} 11:22`, bodyZh: '<h2>我们如何使用你的信息</h2><p>BuiltSync 仅为考勤、薪资、请假和证书管理等工作用途处理你的个人信息，并采取合理措施保护这些信息。</p><ul><li>NRIC / FIN、银行账号等敏感信息仅以脱敏形式展示；</li><li>定位和人脸信息只在打卡时使用；</li><li>未经你同意，不会向无关第三方提供你的信息。</li></ul>', bodyEn: '<h2>How we use your information</h2><p>BuiltSync processes your personal data only for work purposes such as attendance, payroll, leave and certificates, and protects it with reasonable measures.</p><ul><li>Sensitive data such as NRIC / FIN and bank accounts are shown masked;</li><li>Location and face data are used only when you punch;</li><li>Your data is not shared with unrelated third parties without your consent.</li></ul>' },
        { id: 'terms', type: 'agreement', titleZh: '用户协议', titleEn: 'Terms of Use', version: 'V1.2', status: 'published', updatedAt: `${day(-14)} 11:26`, bodyZh: '<h2>使用须知</h2><p>请使用本人账号登录，并如实提交考勤、请假和报销信息。</p><ol><li>不得代他人打卡；</li><li>发现账号异常请立即联系管理员；</li><li>违反规定可能导致账号被停用。</li></ol>', bodyEn: '<h2>Terms</h2><p>Sign in with your own account and submit attendance, leave and claims truthfully.</p><ol><li>Do not punch for someone else;</li><li>Tell your administrator at once if your account looks wrong;</li><li>Breaking the rules may lead to the account being disabled.</li></ol>' },
        { id: 'about', type: 'product', titleZh: '关于我们', titleEn: 'About Us', version: 'V1.0', status: 'published', updatedAt: `${day(-16)} 16:42`, bodyZh: '<p>BuiltSync 是面向建筑与工程现场的人员管理平台，覆盖考勤、薪资、请假、证书和安全提醒。</p>', bodyEn: '<p>BuiltSync is a workforce platform for construction and engineering sites, covering attendance, payroll, leave, certificates and safety reminders.</p>' },
        { id: 'unassigned', type: 'hint', titleZh: '待分配提示', titleEn: 'Awaiting assignment', version: 'V1.0', status: 'published', updatedAt: `${day(-16)} 16:50`, bodyZh: '<p>你的账号还没有分配到项目。请联系公司管理员为你分配项目和工区，分配后即可使用考勤等功能。</p>', bodyEn: '<p>Your account has not been assigned to a project yet. Please ask your company administrator to assign a project and site; attendance and other features unlock afterwards.</p>' },
      ],
      dicts: {
        country: countries.map(([key, zh, en, code], i) => dictItem('c' + key, zh, en, code, '', i + 1, 'active', key)),
        city: [dictItem('t1', '新加坡市区', 'Singapore City', 'SG-SG', 'sg', 1), dictItem('t2', '裕廊', 'Jurong', 'SG-JUR', 'sg', 2), dictItem('t3', '新山', 'Johor Bahru', 'MY-JHB', 'my', 3), dictItem('t4', '北京', 'Beijing', 'CN-BJ', 'cn', 4), dictItem('t5', '上海', 'Shanghai', 'CN-SH', 'cn', 5)],
        companyType: [dictItem('u1', '客户', 'Client', 'CLIENT', '', 1), dictItem('u2', '分包商', 'Subcontractor', 'SUB', '', 2)],
        roundUnit: [dictItem('o1', '1 分钟', '1 minute', 'R1', '', 1), dictItem('o2', '5 分钟', '5 minutes', 'R5', '', 2), dictItem('o3', '15 分钟', '15 minutes', 'R15', '', 3), dictItem('o4', '30 分钟', '30 minutes', 'R30', '', 4)],
        templateType: [dictItem('p1', '日薪', 'Daily rate', 'DAILY', '', 1), dictItem('p2', '月薪', 'Monthly salary', 'MONTHLY', '', 2)],
        pcp: [dictItem('q1', 'A区', 'Zone A', 'PCP-A', '', 1), dictItem('q2', 'B区', 'Zone B', 'PCP-B', '', 2), dictItem('q3', 'C区', 'Zone C', 'PCP-C', '', 3)],
      },
    };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.services) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); applyDicts(); emit({ type: 'sync' }); } });

  /** pushes the country and PCP dictionaries into the lists the personnel forms read, in place so every holder of the list sees it */
  function applyDicts() {
    const C = BS.hr.COUNTRIES; Object.keys(C).forEach((k) => delete C[k]);
    state.dicts.country.slice().sort((a, b) => a.sort - b.sort).forEach((x) => { C[x.key] = [x.zh, x.en]; });
    const P = BS.hr.PCPS; P.length = 0; state.dicts.pcp.filter((x) => x.status === 'active').sort((a, b) => a.sort - b.sort).forEach((x) => P.push(x.zh));
  }

  const DICTS = [
    { id: 'country', wired: true }, { id: 'city', wired: false, parent: 'country' }, { id: 'companyType', wired: false }, { id: 'roundUnit', wired: false }, { id: 'templateType', wired: false }, { id: 'pcp', wired: true },
  ];

  BS.sys = {
    REGIONS, DICTS, SVC_FIELDS, SECRET,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    regions() { return REGIONS; },

    // ---------- third-party services ----------
    services() { return state.services; },
    service(id) { return state.services.find((s) => s.id === id) || null; },
    serviceOn(type) { const s = state.services.find((x) => x.type === type); return !!(s && s.enabled); },
    validateService(d, id) {
      const s = this.service(id); const e = {}; const f = SVC_FIELDS[s.type];
      f.forEach((k) => {
        const v = clean(d[k]);
        if (SECRET.has(k)) { const cur = s.secrets[k]; if (v === cur && cur) return; if (!v) e[k] = 'req'; else if (v.length < 8 || v.length > 128) e[k] = 'secret_len'; }
        else if (!v) e[k] = 'req'; else if (v.length > 120) e[k] = 'len'; else if (k === 'endpoint' && !/^https?:\/\/[^\s/]+\.[^\s]+$/.test(v)) e[k] = 'url'; else if (k === 'senderId' && !/^[A-Za-z0-9 ]{3,11}$/.test(v)) e[k] = 'sender';
      });
      return e;
    },
    saveService(id, d) {
      const s = this.service(id); if (!s) return { ok: false, error: 'missing' };
      const e = this.validateService(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      let changed = false; let secretOk = s.secretOk;
      SVC_FIELDS[s.type].forEach((k) => {
        const v = clean(d[k]);
        if (SECRET.has(k)) { if (v !== s.secrets[k]) { s.secrets[k] = maskKey(v); changed = true; if (/bad|invalid|wrong/i.test(v) || v.length < 12) secretOk = false; else secretOk = true; } }
        else if (v !== s.config[k]) { s.config[k] = v; changed = true; }
      });
      if (changed) { s.secretOk = secretOk; s.lastResult = null; s.lastTestAt = ''; s.enabled = false; } // changed settings must be tested again before the service is switched back on
      const ok = save(); emit({ type: 'service', id }); return { ok: true, changed, persisted: ok };
    },
    /** simulated connection test: succeeds when the settings are complete and the keys look valid */
    testService(id) {
      const s = this.service(id); if (!s) return { ok: false, error: 'missing' };
      const complete = SVC_FIELDS[s.type].every((k) => (SECRET.has(k) ? s.secrets[k] : s.config[k]));
      const ok = complete && s.secretOk; s.lastTestAt = stamp(); s.lastResult = ok ? 'ok' : 'fail'; s.failWhy = ok ? '' : complete ? 'auth' : 'incomplete';
      save(); emit({ type: 'service', id }); return { ok: true, result: s.lastResult, why: s.failWhy };
    },
    setServiceEnabled(id, on) {
      const s = this.service(id); if (!s) return { ok: false, error: 'missing' };
      if (on && s.lastResult !== 'ok') return { ok: false, error: 'untested' };
      s.enabled = !!on; save(); emit({ type: 'service', id }); return { ok: true };
    },

    // ---------- agreements / about / hint ----------
    contents() { return state.contents; },
    content(id) { return state.contents.find((c) => c.id === id) || null; },
    live(id) { const c = this.content(id); return c && c.status === 'published' ? c : null; },
    validateContent(d) {
      const e = {}; const plain = (h) => BS.notice.plain(h);
      if (!clean(d.titleZh)) e.titleZh = 'titleZh'; else if (clean(d.titleZh).length > 40) e.titleZh = 'title_len'; if (!clean(d.titleEn)) e.titleEn = 'titleEn'; else if (clean(d.titleEn).length > 80) e.titleEn = 'title_len';
      if (!plain(d.bodyZh)) e.bodyZh = 'bodyZh'; else if (plain(d.bodyZh).length > 20000) e.bodyZh = 'body_len'; if (!plain(d.bodyEn)) e.bodyEn = 'bodyEn'; else if (plain(d.bodyEn).length > 40000) e.bodyEn = 'body_len';
      if (!/^V\d{1,3}\.\d{1,3}$/.test(clean(d.version))) e.version = 'version';
      if (!['published', 'draft'].includes(d.status)) e.status = 'status';
      return e;
    },
    saveContent(id, d) {
      const c = this.content(id); if (!c) return { ok: false, error: 'missing' };
      const e = this.validateContent(d); if (Object.keys(e).length) return { ok: false, errors: e };
      Object.assign(c, { titleZh: clean(d.titleZh), titleEn: clean(d.titleEn), bodyZh: BS.notice.clean(d.bodyZh), bodyEn: BS.notice.clean(d.bodyEn), version: clean(d.version), status: d.status, updatedAt: stamp() });
      const ok = save(); emit({ type: 'content', id }); return { ok: true, persisted: ok };
    },

    // ---------- dictionaries ----------
    /** country keys a form may offer: the enabled ones, plus the one already chosen */
    countryKeys(current) { return state.dicts.country.slice().sort((a, b) => a.sort - b.sort).filter((x) => x.status === 'active' || x.key === current).map((x) => x.key); },
    dictItems(type) { return state.dicts[type].slice().sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)); },
    dictItem(type, id) { return state.dicts[type].find((x) => x.id === id) || null; },
    /** how many records still point at a dictionary item (then it can only be stopped, not deleted) */
    dictUsage(type, id) {
      const x = this.dictItem(type, id); if (!x) return 0; const hr = BS.hr;
      if (type === 'country') return hr.emps().filter((e) => e.country === x.key).length + hr.projects().filter((p) => p.country === x.key).length + state.dicts.city.filter((c) => c.parent === x.key).length;
      if (type === 'city') return hr.projects().filter((p) => p.city === x.en || p.city === x.zh).length;
      if (type === 'pcp') return hr.emps().filter((e) => e.pcp === x.zh).length;
      if (type === 'companyType') return hr.companies().filter((c) => c.type === x.code.toLowerCase()).length;
      if (type === 'roundUnit') return BS.att.groups().filter((g) => 'R' + g.round.unit === x.code).length;
      if (type === 'templateType') return BS.pay.templates().filter((tp) => tp.type.toUpperCase() === x.code).length;
      return 0;
    },
    validateDict(type, d, id) {
      const e = {}; const items = state.dicts[type];
      if (!clean(d.zh)) e.zh = 'zh'; else if (clean(d.zh).length > 30) e.zh = 'zh_len'; else if (items.some((x) => x.id !== id && x.zh === clean(d.zh))) e.zh = 'zh_dup';
      if (!clean(d.en)) e.en = 'en'; else if (clean(d.en).length > 60) e.en = 'en_len';
      const code = clean(d.code).toUpperCase(); if (!code) e.code = 'code'; else if (!/^[A-Z0-9][A-Z0-9_-]{1,19}$/.test(code)) e.code = 'code_fmt'; else if (items.some((x) => x.id !== id && x.code === code)) e.code = 'code_dup';
      if (type === 'city' && !state.dicts.country.some((c) => c.key === d.parent)) e.parent = 'parent';
      const n = Number(d.sort); if (!Number.isInteger(n) || n < 1 || n > 999) e.sort = 'sort';
      if (!['active', 'disabled'].includes(d.status)) e.status = 'status';
      return e;
    },
    saveDict(type, d, id) {
      const e = this.validateDict(type, d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const f = { zh: clean(d.zh), en: clean(d.en), code: clean(d.code).toUpperCase(), parent: type === 'city' ? d.parent : '', sort: Number(d.sort), status: d.status };
      let x = id && this.dictItem(type, id);
      if (x) {
        // a renamed PCP operator is renamed on the people who have it
        if (type === 'pcp' && x.zh !== f.zh) BS.hr.emps().forEach((p) => { if (p.pcp === x.zh) p.pcp = f.zh; });
        Object.assign(x, f);
      } else { x = { id: 'd' + ++state.n, key: type === 'country' ? f.code.toLowerCase() : '', ...f }; state.dicts[type].push(x); }
      applyDicts(); const ok = save(); emit({ type: 'dict', dict: type, id: x.id }); return { ok: true, item: x, persisted: ok };
    },
    deleteDict(type, id) {
      const x = this.dictItem(type, id); if (!x) return { ok: false, error: 'missing' };
      const n = this.dictUsage(type, id); if (n) return { ok: false, error: 'used', n };
      state.dicts[type] = state.dicts[type].filter((y) => y.id !== id); applyDicts(); save(); emit({ type: 'dict', dict: type, id }); return { ok: true };
    },

    reset() { state = seed(); applyDicts(); save(); emit({ type: 'reset' }); },
    init() { applyDicts(); },
  };
  BS.sys.init();
})(window.BS);
