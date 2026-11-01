/* Personnel: the employee master shared by roster, leave, CPF, attendance and payroll. Also trades and projects. */
(function (BS) {
  const KEY = 'bs_hr_proto_v6';
  const S = BS.hrSeed;
  const ROLES = ['worker', 'supervisor', 'safety'];
  const CLIENTS = ['BuiltSync Workforce Pte. Ltd.', 'Marina Bay Pte. Ltd.', 'Raffles Developments Pte. Ltd.'];
  const PCPS = ['A区', 'B区', 'C区'];
  const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,19}$/;
  BS.prjTag = (st) => ({ running: 'approved', upcoming: 'sub-upcoming', delayed: 'pending', done: 'withdrawn' }[st] || 'withdrawn');
  const listeners = new Set();
  const pad = (n) => String(n).padStart(2, '0');
  const parse = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
  const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const addDays = (d, n) => { const x = parse(d); x.setDate(x.getDate() + n); return iso(x); };
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && iso(parse(s)) === s;
  const today = () => BS.fmt.now().slice(0, 10);
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  let version = 0;

  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
  const maskId = (s) => `${s[0]}****${s.slice(5)}`;
  const maskBank = (digits) => `•••• ${digits.slice(-4)}`;
  const maskPhone = (p) => `${String(p).slice(0, 4)}****`;
  const PASS_TYPES = ['WP', 'SP', 'EP'];   // Work Permit, S Pass, Employment Pass
  const clientFor = (prj) => (prj === 'maritime' ? CLIENTS[1] : prj === 'raffles' ? CLIENTS[2] : CLIENTS[0]);

  function mkEmp(r) {
    const [empNo, zh, en, phone, status, templateId, rateCents, , , prj, co, site, idType, dob, prSince, role, tenantId, trades, country, bank, joinDate] = r;
    const h = hash(empNo); const L = idType === 'fin' ? 'GFM'[h % 3] : 'ST'[h % 2]; const digits = String(1000000 + (h % 8999999)).slice(0, 7);
    return {
      empNo, name: zh, nameEn: en, phone: String(phone), account: en.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, ''),
      idType, idMask: maskId(`${L}${digits}${'ABCDEFGHIZJ'[h % 11]}`), bank, bankMask: maskBank(String(1000 + (h % 8999))),
      country, address: `${10 + (h % 80)} ${['Raffles Quay', 'Jurong Gateway Rd', 'Marina Blvd', 'Tuas Ave 3'][h % 4]}, Singapore ${String(40000 + (h % 9000)).padStart(6, '0')}`,
      wpNo: idType === 'fin' ? `WP-2025-${String(h % 999999).padStart(6, '0')}` : '', client: clientFor(prj), employer: S.CO[co], pcp: PCPS[h % 3],
      dob, prSince: prSince || null, role, cpfOn: idType !== 'fin', tenantId, secondedFrom: null,
      trades: trades.slice(), templateId, rateCents, joinDate, leaveDate: '', status, disabledAt: status === 'disabled' ? '2026-08-31 18:20' : null,
      assigns: [{ projectKey: prj, siteKey: site, role }], note: '', certs: [],
      // identity documents: only foreign (FIN) workers carry a passport and a work pass whose expiry matters to compliance
      passType: idType === 'fin' ? PASS_TYPES[h % 3] : '', passExpiry: idType === 'fin' ? addDays(today(), 120 + (h % 500)) : '',
      passportNo: idType === 'fin' ? `${'EKGP'[h % 4]}${String(1000000 + ((h >> 3) % 8999999)).slice(0, 7)}` : '', passportExpiry: idType === 'fin' ? addDays(today(), 300 + (h % 1200)) : '',
    };
  }
  function seed() {
    const t0 = today();
    const prj = (key, code, names, company, country, city, contact, address, start, end, done) => ({ key, code, ...names, company, country, city, contact, address, start, end, done: !!done, doneAt: done ? '2026-04-02 10:15' : null, sites: [] });
    const projects = [
      prj('raffles', 'PRJ-001', S.PRJ.raffles, S.CO.east, 'sg', 'Singapore', 'Daniel Tan', '1 Raffles Place, Singapore 048616', '2026-01-01', '2027-12-31'),
      prj('maritime', 'PRJ-002', S.PRJ.maritime, S.CO.east, 'sg', 'Singapore', 'Lim Wei Jie', '8 Marina Boulevard, Singapore 018981', '2025-06-01', '2027-06-30'),
      prj('jurong', 'PRJ-003', S.PRJ.jurong, S.CO.newcity, 'sg', 'Singapore', 'Ahmad Rahman', '1 Jurong Gateway Rd, Singapore 608549', '2025-09-01', '2027-03-31'),
      prj('riverside', 'PRJ-004', { zh: '滨江建造中心', en: 'Riverside Build Centre' }, S.CO.newcity, 'sg', 'Singapore', 'Priya Nair', '3 River Valley Rd, Singapore 179024', addDays(t0, 60), addDays(t0, 760)),
      prj('olddock', 'PRJ-005', { zh: 'Old Dock 改造一期', en: 'Old Dock Refurbishment I' }, S.CO.east, 'sg', 'Singapore', 'Tan Boon Huat', '10 Pasir Panjang Rd, Singapore 117438', '2024-03-01', '2026-07-31'),
      prj('harbour', 'PRJ-006', { zh: 'Harbourfront 裙楼一期', en: 'Harbourfront Podium Phase 1' }, S.CO.east, 'sg', 'Singapore', 'Grace Ong', '1 HarbourFront Walk, Singapore 098585', '2024-08-01', '2026-03-31', true),
      prj('johor', 'PRJ-007', { zh: 'Iskandar 物流中心', en: 'Iskandar Logistics Hub' }, S.CO.newcity, 'my', 'Johor Bahru', 'Hafiz Ismail', 'Jalan Kolam Ayer, 80300 Johor Bahru', addDays(t0, 30), addDays(t0, 540)),
    ];
    // key, code, zh, en, project, address, lat, lng, radius (m), allow punching outside the fence, active
    const st = (key, code, zh, en, projectKey, address, lat, lng, radius, allowOutside, active = true) => ({ key, code, zh, en, projectKey, address, lat, lng, radius, allowOutside, active, updatedAt: '2026-08-12 09:20' });
    const sites = [
      st('towerA', 'RP-TA', 'Tower A', 'Tower A', 'raffles', '1 Raffles Place, Singapore 048616', 1.2840, 103.8515, 300, true),
      st('towerB', 'RP-TB', 'Tower B', 'Tower B', 'raffles', '5 Raffles Place, Singapore 048618', 1.2846, 103.8522, 300, true),
      st('a1', 'MS-A1', 'A1 主体结构区', 'A1 Main Structure', 'maritime', '8 Marina Boulevard, Singapore 018981', 1.2806, 103.8546, 500, false),
      st('b2', 'MS-B2', 'B2 工区', 'Zone B2', 'maritime', '12 Marina Boulevard, Singapore 018982', 1.2812, 103.8554, 400, true),
      st('bay', 'JH-BAY', 'Loading Bay', 'Loading Bay', 'jurong', '1 Jurong Gateway Rd, Singapore 608549', 1.3330, 103.7436, 250, false),
      st('rvN', 'RS-N', '北区场地', 'North Lot', 'riverside', '3 River Valley Rd, Singapore 179024', 1.2905, 103.8422, 300, true),
      st('rvY', 'RS-Y', '暂存场地', 'Staging Yard', 'riverside', '9 River Valley Rd, Singapore 179023', 1.2911, 103.8431, 200, true),
      st('dockA', 'OD-1', '1 号棚', 'Shed 1', 'olddock', '10 Pasir Panjang Rd, Singapore 117438', 1.2763, 103.7970, 350, true),
      st('dockB', 'OD-2', '2 号棚', 'Shed 2', 'olddock', '12 Pasir Panjang Rd, Singapore 117439', 1.2768, 103.7978, 350, true, false),
      st('hbA', 'HF-1', '裙楼 A 区', 'Podium Zone A', 'harbour', '1 HarbourFront Walk, Singapore 098585', 1.2652, 103.8222, 400, true, false),
      st('jbA', 'IL-1', '主厂区', 'Main Yard', 'johor', 'Jalan Kolam Ayer, 80300 Johor Bahru', 1.4655, 103.7578, 500, true),
    ];
    // type, name (zh / main), English name, UEN, contact, phone, email, bank, account, registered address, active
    const co = (id, type, name, nameEn, uen, contact, phone, email, bank, bankNo, address, active = true) => ({ id, type, name, nameEn, uen, contact, phone, email, bank, bankMask: bankNo ? maskBank(bankNo) : '', address, card: null, active, updatedAt: '2026-08-12 09:20' });
    const companies = [
      co('c1', 'client', '中城建设集团', 'ZhongCheng Construction Group', '201912345K', '林海', '+8613900008021', 'lin.hai@zhongcheng.example', 'DBS Bank · Raffles Place Branch', '0721234567', '10 Anson Road, #20-01, Singapore 079903'),
      co('c2', 'client', CLIENTS[1], CLIENTS[1], '201533210D', 'Kelvin Ho', '+6567001122', 'kelvin.ho@marinabay.example', 'OCBC Bank · Marina Branch', '5011223344', '8 Marina Boulevard, #05-01, Singapore 018981'),
      co('c3', 'client', CLIENTS[2], CLIENTS[2], '200812345R', 'Sarah Lim', '+6562334455', 'sarah.lim@raffles-dev.example', 'UOB · Raffles Place Branch', '3059988776', '1 Raffles Place, #30-00, Singapore 048616'),
      co('c4', 'client', CLIENTS[0], CLIENTS[0], '202301234B', 'Daniel Teo', '+6561239988', 'ops@builtsync.example', 'DBS Bank · Tampines Branch', '0039911223', '20 Tampines Industrial Ave 1, Singapore 528715'),
      co('c5', 'sub', S.CO.east.zh, S.CO.east.en, '202034567N', '周建', '+8613812341234', 'zhou.jian@huadong.example', 'DBS Bank · Jurong Branch', '0457788990', '3 Jurong West Street 41, Singapore 649413'),
      co('c6', 'sub', S.CO.newcity.zh, S.CO.newcity.en, '201845678H', 'Wong Kai Ming', '+6568765432', 'wong@xincheng.example', 'UOB · Woodlands Branch', '4521098765', '60 Woodlands Industrial Park E1, Singapore 757718'),
      co('c7', 'sub', 'Global Works Pte. Ltd.', 'Global Works Pte. Ltd.', '', 'Alex', '+6581234567', 'alex@globalworks.example', '', '', '12 Tuas South Ave 6, Singapore 637025'),
      co('c9', 'main', 'Pinnacle Main Contractors Pte. Ltd.', 'Pinnacle Main Contractors Pte. Ltd.', '200612345K', 'Gerald Ng', '+6563456789', 'gerald.ng@pinnacle-mc.example', 'DBS Bank · Robinson Branch', '0033445566', '2 Robinson Road, #12-00, Singapore 048543'),
      co('c10', 'main', 'Harbourline Civil Pte. Ltd.', 'Harbourline Civil Pte. Ltd.', '201098765M', 'Nurul Huda', '+6567788990', 'nurul@harbourline.example', 'UOB · Harbourfront Branch', '3011223399', '1 HarbourFront Avenue, #08-02, Singapore 098632'),
      co('c8', 'sub', 'Old Harbour Services Pte. Ltd.', 'Old Harbour Services Pte. Ltd.', '200145678M', 'Murali S.', '+6564778899', 'murali@oldharbour.example', 'OCBC Bank · Pasir Panjang Branch', '5019900123', '10 Pasir Panjang Rd, #02-11, Singapore 117438', false),
    ];
    const certTypes = [
      ['CSOC', '建筑业安全入门课程 CSOC', 'Construction Safety Orientation Course (CSOC)', [90, 30, 7]],
      ['WORK-HEIGHT', '高处作业证', 'Working at Height', [90, 30, 7]], ['SAFETY-C', '安全员C证', 'Safety Officer C', [60, 30, 7]], ['ELECTRICIAN', '电工证', 'Electrician', [90, 30, 7]],
      ['WELDER', '焊工证', 'Welder', [90, 30, 7]], ['CRANE', '吊装证', 'Rigger / Signalman', [60, 30, 7]],
    ].map(([code, zh, en, reminders]) => ({ code, zh, en, reminders, active: true, updatedAt: '2026-08-12 09:20' }));
    // empNo: [type, number, issued (days from today), expires (days from today, null = permanent), file name]
    const CERT_SEED = {
      BS10110: [['WORK-HEIGHT', 'GA-2025-1882', -540, 15, 'GA-2025-1882.jpg'], ['SAFETY-C', 'AQ-C-2361', -300, 540, 'AQ-C-2361.pdf']],
      BS10086: [['WORK-HEIGHT', 'GA-2026-0412', -90, 400, 'GA-2026-0412.jpg']],
      BS10213: [['WORK-HEIGHT', 'GA-2025-7731', -700, 25, 'GA-2025-7731.pdf']],
      BS09872: [['WELDER', 'WD-2026-0098', -160, 200, 'WD-2026-0098.jpg'], ['WORK-HEIGHT', 'GA-2024-5510', -800, -40, 'GA-2024-5510.jpg']],
      BS10456: [['SAFETY-C', 'AQ-C-8972', -300, 700, 'AQ-C-8972.pdf']],
      BS10721: [['WELDER', 'WD-2026-0310', -200, 120, 'WD-2026-0310.jpg'], ['ELECTRICIAN', 'DG-2026-1180', -60, 60, 'DG-2026-1180.jpg']],
      BS10903: [['WORK-HEIGHT', 'GA-2026-1999', -30, 300, '']],
      'SG-0312': [['WORK-HEIGHT', 'GA-2023-0818', -1130, 28, 'GA-2023-0818.jpg'], ['SAFETY-C', 'AQ-C-0312', -400, null, 'AQ-C-0312.pdf']],
      BS10113: [['ELECTRICIAN', 'DG-2019-2201', -1900, -86, 'DG-2019-2201.jpg']],
      BS10116: [['CRANE', 'RG-2026-0455', -320, 45, 'RG-2026-0455.pdf'], ['WELDER', 'WD-2025-3320', -120, 365, 'WD-2025-3320.jpg']],
      'SG-0288': [['ELECTRICIAN', 'DG-2025-4402', -700, 10, 'DG-2025-4402.pdf']],
    };
    let certN = 0;
    const emps = S.ROWS.map(mkEmp);
    // two recent joiners, so "new staff" audiences (surveys) are not empty
    [['SG-0401', -12], ['BS10115', -25]].forEach(([no, d]) => { const x = emps.find((e) => e.empNo === no); if (x) x.joinDate = addDays(t0, d); });
    emps.forEach((e) => { e.certs = (CERT_SEED[e.empNo] || []).map(([type, no, iss, exp, file]) => ({ id: 'cr' + (++certN), type, no, issued: addDays(t0, iss), expiry: exp == null ? null : addDays(t0, exp), file, fileSize: file ? 180000 + certN * 7331 : 0 })); });
    // every worker holds a CSOC; four are left to show the compliance states (expired, expiring, none)
    const CSOC = { BS10110: -12, BS10116: 22, BS10114: null, 'SG-0301': -60 };
    emps.forEach((e) => { if (CSOC[e.empNo] === null) return; const exp = CSOC[e.empNo] != null ? CSOC[e.empNo] : 200 + (hash(e.empNo) % 500); e.certs.push({ id: 'cr' + (++certN), type: 'CSOC', no: `CSOC-${e.empNo}`, issued: addDays(t0, exp - 1095), expiry: addDays(t0, exp), file: '', fileSize: 0 }); });
    // a few foreign workers with a document problem
    const DOC = { BS10721: { passExpiry: addDays(t0, -20) }, 'SG-0401': { passportExpiry: addDays(t0, -35) }, BS10112: { passportExpiry: addDays(t0, 20) }, BS10117: { passExpiry: addDays(t0, 12) } };
    emps.forEach((e) => { if (DOC[e.empNo] && e.idType === 'fin') Object.assign(e, DOC[e.empNo]); });
    return {
      v: 5, projects, sites, companies, certTypes, emps,
      trades: S.TRADES.map(([code, zh, en], i) => ({ code, zh, en, active: true, note: '', updatedAt: `08-${pad(12 - i)} 09:20` })),
    };
  }

  // a project's `sites` (keys) is derived from the site table, so it can never disagree with it
  function reindex(s) { s.projects.forEach((p) => { p.sites = s.sites.filter((x) => x.projectKey === p.key).map((x) => x.key); }); return s; }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 5 && s.emps && s.sites && s.companies && s.certTypes) return reindex(s); } } catch (e) { /* fall through */ } return reindex(seed()); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const lc = (s) => String(s || '').trim().toLowerCase();
  const ageAt = (dob, date) => { const b = parse(dob), d = parse(date); let a = d.getFullYear() - b.getFullYear(); if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--; return a; };

  BS.hr = {
    ROLES, CLIENTS, PCPS, PASS_TYPES, COUNTRIES: S.COUNTRIES, addDays, ageAt, maskPhone,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emps() { return state.emps; },
    emp(empNo) { return state.emps.find((e) => e.empNo === empNo) || null; },
    projects() { return state.projects; },
    project(key) { return state.projects.find((p) => p.key === key) || null; },
    site(key) { return state.sites.find((s) => s.key === key) || null; },
    sites() { return state.sites; },
    /** keys of a project's sites; activeOnly leaves out stopped ones (what pickers should offer) */
    projectSites(projectKey, activeOnly) { return state.sites.filter((s) => s.projectKey === projectKey && (!activeOnly || s.active)).map((s) => s.key); },
    /** done is set by hand; the other three follow the dates: not started, in progress, past its end date (delayed) */
    projectStatus(p) { if (p.done) return 'done'; const t0 = today(); return t0 < p.start ? 'upcoming' : t0 > p.end ? 'delayed' : 'running'; },
    /** can people be put on this project: not finished and at least one working site */
    assignable(p) { return this.projectStatus(p) !== 'done' && this.projectSites(p.key, true).length > 0; },
    primary(e) { return e.assigns[0] || null; },
    assignedCount(projectKey) { return state.emps.filter((e) => e.assigns.some((a) => a.projectKey === projectKey)).length; },

    // ---------- projects ----------
    nextProjectCode() { const m = state.projects.reduce((n, p) => { const x = /^PRJ-(\d+)$/.exec(p.code); return x ? Math.max(n, +x[1]) : n; }, 0); return 'PRJ-' + String(m + 1).padStart(3, '0'); },
    validateProject(d, key) {
      const e = {}; const zh = String(d.zh || '').trim(), en = String(d.en || '').trim(), code = String(d.code || '').trim().toUpperCase();
      if (!zh) e.zh = 'zh'; else if (zh.length > 60) e.zh = 'zh_len';
      if (en.length > 100) e.en = 'en_len';
      if (!code) e.code = 'code'; else if (!CODE_RE.test(code)) e.code = 'code_fmt'; else if (state.projects.some((p) => p.key !== key && p.code === code)) e.code = 'code_dup';
      if (!S.COUNTRIES[d.country]) e.country = 'country';
      const city = String(d.city || '').trim(); if (!city) e.city = 'city'; else if (city.length > 40) e.city = 'city_len';
      const ct = String(d.contact || '').trim(); if (!ct) e.contact = 'contact'; else if (ct.length > 40) e.contact = 'contact_len';
      const ad = String(d.address || '').trim(); if (!ad) e.address = 'address'; else if (ad.length > 120) e.address = 'address_len';
      if (!validDate(d.start)) e.start = 'start'; if (!validDate(d.end)) e.end = 'end'; else if (validDate(d.start) && d.end < d.start) e.end = 'end_before';
      return e;
    },
    saveProject(d, key) {
      const e = this.validateProject(d, key); if (Object.keys(e).length) return { ok: false, errors: e };
      const zh = d.zh.trim(); const fields = { zh, en: (d.en || '').trim() || zh, code: d.code.trim().toUpperCase(), country: d.country, city: d.city.trim(), contact: d.contact.trim(), address: d.address.trim(), start: d.start, end: d.end };
      let p = key && this.project(key);
      if (p) Object.assign(p, fields);
      else {
        let k = fields.code.toLowerCase().replace(/[^a-z0-9]/g, ''); while (this.project(k)) k += 'x';
        p = { key: k, company: null, done: false, doneAt: null, sites: [], ...fields }; state.projects.push(p);
      }
      const ok = save(); emit({ type: 'project', key: p.key }); return { ok: true, project: p, persisted: ok };
    },
    /** what finishing a project leaves behind, shown in the confirmation */
    projectImpact(key) { return { people: state.emps.filter((x) => x.status === 'active' && x.assigns.some((a) => a.projectKey === key)).length, sites: state.sites.filter((s) => s.projectKey === key && s.active).length }; },
    completeProject(key) {
      const p = this.project(key); if (!p) return { ok: false, error: 'missing' }; if (p.done) return { ok: false, error: 'already' };
      p.done = true; p.doneAt = BS.fmt.now().slice(0, 16).replace('T', ' '); save(); emit({ type: 'project', key }); return { ok: true };
    },
    /** only a delayed project can be given a new end date; it has to move forward and reach today or later */
    extendProject(key, newEnd) {
      const p = this.project(key); if (!p) return { ok: false, error: 'missing' };
      if (this.projectStatus(p) !== 'delayed') return { ok: false, error: 'not_delayed' };
      if (!validDate(newEnd)) return { ok: false, error: 'date' };
      if (newEnd <= p.end) return { ok: false, error: 'not_later' };
      if (newEnd < today()) return { ok: false, error: 'past' };
      const days = Math.round((parse(newEnd) - parse(p.end)) / 86400000); p.end = newEnd; save(); emit({ type: 'project', key }); return { ok: true, days };
    },

    // ---------- sites ----------
    siteUsage(key) {
      const people = state.emps.filter((x) => x.assigns.some((a) => a.siteKey === key)).length;
      const groups = BS.att ? BS.att.groups().filter((g) => g.siteKey === key).length : 0;
      return { people, groups, used: people + groups > 0 };
    },
    validateSite(d, key) {
      const e = {}; const cur = key ? this.site(key) : null; const code = String(d.code || '').trim().toUpperCase();
      const pj = this.project(d.projectKey);
      if (!d.projectKey || !pj) e.projectKey = 'project';
      else if (cur && cur.projectKey !== d.projectKey && this.siteUsage(key).used) e.projectKey = 'project_locked';
      else if (pj.done && (!cur || cur.projectKey !== d.projectKey)) e.projectKey = 'project_done';
      if (!code) e.code = 'code'; else if (!CODE_RE.test(code)) e.code = 'code_fmt'; else if (state.sites.some((s) => s.key !== key && s.code === code)) e.code = 'code_dup';
      const zh = String(d.zh || '').trim(); if (!zh) e.zh = 'zh'; else if (zh.length > 30) e.zh = 'zh_len';
      if (String(d.en || '').trim().length > 60) e.en = 'en_len';
      const ad = String(d.address || '').trim(); if (!ad) e.address = 'address'; else if (ad.length > 120) e.address = 'address_len';
      const num = (v) => (String(v).trim() === '' ? NaN : Number(v));
      const lat = num(d.lat), lng = num(d.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) e.lat = 'lat'; if (!Number.isFinite(lng) || lng < -180 || lng > 180) e.lng = 'lng';
      const r = num(d.radius); if (!Number.isInteger(r) || r < 50 || r > 5000) e.radius = 'radius';
      if (d.active && cur && !cur.active && pj && pj.done) e.active = 'project_done';
      return e;
    },
    saveSite(d, key) {
      const e = this.validateSite(d, key); if (Object.keys(e).length) return { ok: false, errors: e };
      const zh = d.zh.trim(); const stamp = BS.fmt.now().slice(0, 16).replace('T', ' ');
      const fields = { code: d.code.trim().toUpperCase(), zh, en: (d.en || '').trim() || zh, projectKey: d.projectKey, address: d.address.trim(), lat: +(+d.lat).toFixed(6), lng: +(+d.lng).toFixed(6), radius: +d.radius, allowOutside: !!d.allowOutside, active: !!d.active, updatedAt: stamp };
      let s = key && this.site(key);
      if (s) Object.assign(s, fields);
      else { let k = fields.code.toLowerCase().replace(/[^a-z0-9]/g, ''); while (this.site(k)) k += 'x'; s = { key: k, ...fields }; state.sites.push(s); }
      reindex(state); const ok = save(); emit({ type: 'site', key: s.key }); return { ok: true, site: s, persisted: ok };
    },
    setSiteActive(key, active) {
      const s = this.site(key); if (!s) return { ok: false, error: 'missing' }; const pj = this.project(s.projectKey);
      if (active && pj && pj.done) return { ok: false, error: 'project_done' };
      s.active = !!active; s.updatedAt = BS.fmt.now().slice(0, 16).replace('T', ' '); save(); emit({ type: 'site', key }); return { ok: true };
    },
    /** a site that people or attendance groups still point at cannot be deleted; stop it instead */
    deleteSite(key) {
      const s = this.site(key); if (!s) return { ok: false, error: 'missing' };
      const u = this.siteUsage(key); if (u.used) return { ok: false, error: 'used', ...u };
      state.sites = state.sites.filter((x) => x.key !== key); reindex(state); save(); emit({ type: 'site', key }); return { ok: true };
    },

    // ---------- trades ----------
    trades() { return state.trades; },
    trade(code) { return state.trades.find((t) => t.code === code) || null; },
    tradeCount(code) { return state.emps.filter((e) => e.trades.includes(code)).length; },
    saveTrade(d, code) {
      const e = {}; const c = String(d.code || '').trim().toUpperCase();
      if (!String(d.zh || '').trim()) e.zh = 'zh'; if (!String(d.en || '').trim()) e.en = 'en';
      if (!/^[A-Z][A-Z0-9_]{1,19}$/.test(c)) e.code = 'code_fmt'; else if (state.trades.some((t) => t.code === c && t.code !== code)) e.code = 'code_dup';
      if (String(d.note || '').length > 100) e.note = 'note';
      if (Object.keys(e).length) return { ok: false, errors: e };
      const stamp = BS.fmt.now().slice(5, 16).replace('T', ' ');
      let t = code && this.trade(code);
      if (t) { if (c !== code) state.emps.forEach((x) => { x.trades = x.trades.map((k) => (k === code ? c : k)); }); Object.assign(t, { code: c, zh: d.zh.trim(), en: d.en.trim(), active: !!d.active, note: d.note || '', updatedAt: stamp }); }
      else { t = { code: c, zh: d.zh.trim(), en: d.en.trim(), active: !!d.active, note: d.note || '', updatedAt: stamp }; state.trades.push(t); }
      const ok = save(); emit({ type: 'trade', code: c }); return { ok: true, persisted: ok };
    },

    // ---------- clients and subcontractors ----------
    companies() { return state.companies; },
    company(id) { return state.companies.find((c) => c.id === id) || null; },
    /** names offered in the roster's client list: active clients only */
    clientNames() { return state.companies.filter((c) => c.type === 'client' && c.active).map((c) => c.name); },
    /** phone as shown in lists: country code and the first and last digits only */
    maskIntlPhone(p) {
      const s = String(p || ''); if (!/^\+\d+$/.test(s)) return s || '—';
      const cc = ['880', '65', '86', '60', '91', '95', '62', '63', '44', '1'].find((x) => s.slice(1).startsWith(x)) || s.slice(1, 3); const rest = s.slice(1 + cc.length);
      return `+${cc} ${rest.length >= 10 ? rest.slice(0, 3) + '****' + rest.slice(-4) : rest.slice(0, 1) + '****' + rest.slice(-3)}`;
    },
    companyUsage(id) {
      const c = this.company(id); if (!c) return { people: 0, projects: 0, deps: 0, used: false };
      const people = state.emps.filter((e) => e.client === c.name || e.employer.zh === c.name || (c.nameEn && e.employer.en === c.nameEn)).length;
      const projects = state.projects.filter((p) => p.company && p.company.zh === c.name).length;
      const deps = BS.dep ? BS.dep.all().filter((x) => x.subconId === id || x.mainconId === id).length : 0;
      return { people, projects, deps, used: people + projects + deps > 0 };
    },
    validateCompany(d, id) {
      const e = {}; const cur = id ? this.company(id) : null;
      const name = String(d.name || '').trim(); if (!name) e.name = 'name'; else if (name.length > 80) e.name = 'name_len'; else if (state.companies.some((c) => c.id !== id && lc(c.name) === lc(name))) e.name = 'name_dup';
      if (String(d.nameEn || '').trim().length > 80) e.nameEn = 'name_len';
      if (!['client', 'sub', 'main'].includes(d.type)) e.type = 'type';
      const uen = String(d.uen || '').replace(/\s+/g, '').toUpperCase();
      if (!uen) { if (d.type === 'client') e.uen = 'uen'; } else if (!/^[A-Z0-9]{8,20}$/.test(uen)) e.uen = 'uen_fmt'; else if (state.companies.some((c) => c.id !== id && c.uen === uen)) e.uen = 'uen_dup';
      const ct = String(d.contact || '').trim(); if (!ct) e.contact = 'contact'; else if (ct.length > 40) e.contact = 'contact_len';
      const ph = String(d.phone || '').replace(/[\s()-]/g, ''); if (ph && !/^\+\d{7,15}$/.test(ph)) e.phone = 'phone';
      const em = String(d.email || '').trim(); if (em && (em.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))) e.email = 'email';
      if (String(d.bank || '').trim().length > 80) e.bank = 'bank_len';
      const bn = this.normBank(d.bankNo); if (bn && !(cur && bn === this.normBank(cur.bankMask)) && !/^\d{6,20}$/.test(bn)) e.bankNo = 'bank_no';
      if (bn && !String(d.bank || '').trim()) e.bank = 'bank_need';
      const ad = String(d.address || '').trim(); if (!ad) e.address = 'address'; else if (ad.length > 120) e.address = 'address_len';
      if (d.card && (!/\.(pdf|jpe?g)$/i.test(d.card.name) || d.card.size > 10 * 1024 * 1024)) e.card = d.card.size > 10 * 1024 * 1024 ? 'card_size' : 'card_type';
      return e;
    },
    saveCompany(d, id) {
      const e = this.validateCompany(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const cur = id ? this.company(id) : null; const bn = this.normBank(d.bankNo);
      const f = { type: d.type, name: d.name.trim(), nameEn: (d.nameEn || '').trim() || d.name.trim(), uen: String(d.uen || '').replace(/\s+/g, '').toUpperCase(), contact: d.contact.trim(), phone: String(d.phone || '').replace(/[\s()-]/g, ''), email: (d.email || '').trim(),
        bank: (d.bank || '').trim(), bankMask: !bn ? '' : cur && bn === this.normBank(cur.bankMask) ? cur.bankMask : maskBank(bn), address: d.address.trim(), card: d.card ? { name: d.card.name, size: d.card.size } : null, active: d.active !== false, updatedAt: BS.fmt.now().slice(0, 16).replace('T', ' ') };
      let c = cur;
      if (c) {
        // people and projects refer to a company by name, so a rename has to follow them
        if (c.name !== f.name) { state.emps.forEach((x) => { if (x.client === c.name) x.client = f.name; if (x.employer.zh === c.name) x.employer = { zh: f.name, en: f.nameEn }; }); state.projects.forEach((p) => { if (p.company && p.company.zh === c.name) p.company = { zh: f.name, en: f.nameEn }; }); }
        Object.assign(c, f);
      } else { c = { id: 'c' + (state.companies.reduce((n, x) => Math.max(n, +x.id.slice(1) || 0), 0) + 1), ...f }; state.companies.push(c); }
      const ok = save(); emit({ type: 'company', id: c.id }); return { ok: true, company: c, persisted: ok };
    },
    deleteCompany(id) {
      const c = this.company(id); if (!c) return { ok: false, error: 'missing' };
      const u = this.companyUsage(id); if (u.used) return { ok: false, error: 'used', ...u };
      state.companies = state.companies.filter((x) => x.id !== id); save(); emit({ type: 'company', id }); return { ok: true };
    },

    // ---------- certificates ----------
    SOON_DAYS: 30,
    certTypes() { return state.certTypes; },
    certType(code) { return state.certTypes.find((x) => x.code === code) || null; },
    certTypeUsage(code) { return state.emps.reduce((n, e) => n + e.certs.filter((c) => c.type === code).length, 0); },
    newCertId() { return 'cr' + (state.emps.reduce((n, e) => e.certs.reduce((m, c) => Math.max(m, +String(c.id || '').slice(2) || 0), n), 0) + 1); },
    certsOf(empNo) { const e = this.emp(empNo); return e ? e.certs : []; },
    /** whole days until a certificate expires (negative once past); null for a permanent one */
    certDays(c) { return c.expiry ? Math.round((parse(c.expiry) - parse(today())) / 86400000) : null; },
    certStatus(c) { const d = this.certDays(c); return d == null ? 'perm' : d < 0 ? 'expired' : d <= this.SOON_DAYS ? 'soon' : 'ok'; },
    /** reminders the person is currently owed: the closest reminder node already passed, or "expired" */
    dueReminders(empNo) {
      return this.certsOf(empNo).map((c) => {
        const d = this.certDays(c); const ty = this.certType(c.type); if (d == null || !ty) return null;
        if (d < 0) return { cert: c, kind: 'expired', days: d };
        const node = ty.reminders.filter((n) => n >= d).sort((a, b) => a - b)[0]; return node != null ? { cert: c, kind: 'soon', node, days: d } : null;
      }).filter(Boolean).sort((a, b) => a.days - b.days);
    },
    validateCert(d, ctx = {}) {
      const e = {}; const { empNo, certId } = ctx; const adding = !certId;
      if (adding) {
        const h = this.emp(d.empNo); if (!h || h.status !== 'active') e.empNo = 'holder';
        const ty = this.certType(d.type); if (!ty || !ty.active) e.type = 'type'; else if (h && h.certs.some((c) => c.type === d.type)) e.type = 'type_dup';
      }
      const no = String(d.no || '').trim(); const type = adding ? d.type : (this.certsOf(empNo).find((c) => c.id === certId) || {}).type;
      if (!no) e.no = 'no'; else if (no.length > 40) e.no = 'no_len'; else if (state.emps.some((x) => x.certs.some((c) => c.id !== certId && c.type === type && c.no.toLowerCase() === no.toLowerCase()))) e.no = 'no_dup';
      if (d.issued && !validDate(d.issued)) e.issued = 'issued'; else if (d.issued && d.issued > today()) e.issued = 'issued_future';
      if (!d.permanent) { if (!validDate(d.expiry)) e.expiry = 'expiry'; else if (d.issued && validDate(d.issued) && d.expiry < d.issued) e.expiry = 'expiry_before'; }
      if (d.file) { if (!/\.(pdf|jpe?g|png)$/i.test(d.file.name)) e.file = 'file_type'; else if (d.file.size > 10 * 1024 * 1024) e.file = 'file_size'; }
      return e;
    },
    addCert(d) {
      const e = this.validateCert(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const h = this.emp(d.empNo); const c = { id: this.newCertId(), type: d.type, no: d.no.trim(), issued: d.issued || '', expiry: d.permanent ? null : d.expiry, file: d.file ? d.file.name : '', fileSize: d.file ? d.file.size : 0 };
      h.certs.push(c); const ok = save(); emit({ type: 'cert', empNo: h.empNo, id: c.id }); return { ok: true, cert: c, persisted: ok };
    },
    /** replaces this one certificate's details; a new file replaces the old attachment */
    updateCert(empNo, certId, d) {
      const c = this.certsOf(empNo).find((x) => x.id === certId); if (!c) return { ok: false, errors: { no: 'missing' } };
      const e = this.validateCert(d, { empNo, certId }); if (Object.keys(e).length) return { ok: false, errors: e };
      Object.assign(c, { no: d.no.trim(), issued: d.issued || '', expiry: d.permanent ? null : d.expiry }); if (d.file) { c.file = d.file.name; c.fileSize = d.file.size; }
      const ok = save(); emit({ type: 'cert', empNo, id: certId }); return { ok: true, cert: c, persisted: ok };
    },
    validateCertType(d, code) {
      const e = {}; const c = String(d.code || '').trim().toUpperCase();
      if (!String(d.zh || '').trim()) e.zh = 'zh'; else if (d.zh.trim().length > 30) e.zh = 'zh_len'; if (String(d.en || '').trim().length > 60) e.en = 'en_len';
      if (!c) e.code = 'code'; else if (!/^[A-Z][A-Z0-9_-]{1,29}$/.test(c)) e.code = 'code_fmt'; else if (state.certTypes.some((x) => x.code === c && x.code !== code)) e.code = 'code_dup';
      const r = d.reminders || [];
      if (!r.length) e.reminders = 'none'; else if (r.length > 6) e.reminders = 'many'; else if (r.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) e.reminders = 'range'; else if (new Set(r).size !== r.length) e.reminders = 'dup';
      return e;
    },
    saveCertType(d, code) {
      const e = this.validateCertType(d, code); if (Object.keys(e).length) return { ok: false, errors: e };
      const f = { code: d.code.trim().toUpperCase(), zh: d.zh.trim(), en: (d.en || '').trim() || d.zh.trim(), reminders: d.reminders.slice().sort((a, b) => b - a), active: d.active !== false, updatedAt: BS.fmt.now().slice(0, 16).replace('T', ' ') };
      let ty = code && this.certType(code);
      if (ty) { if (f.code !== code) state.emps.forEach((x) => x.certs.forEach((c) => { if (c.type === code) c.type = f.code; })); Object.assign(ty, f); } else { ty = f; state.certTypes.push(ty); }
      const ok = save(); emit({ type: 'certType', code: ty.code }); return { ok: true, certType: ty, persisted: ok };
    },

    // ---------- employees ----------
    nextEmpNo() { const m = state.emps.reduce((n, e) => { const x = /^BS(\d+)$/.exec(e.empNo); return x ? Math.max(n, +x[1]) : n; }, 10000); return 'BS' + (m + 1); },
    normId(raw) { return String(raw || '').replace(/\s+/g, '').toUpperCase(); },
    normBank(raw) { return String(raw || '').replace(/[\s-]/g, ''); },
    normPhone(raw) { return String(raw || '').replace(/[\s+()-]/g, ''); },

    /** d: form values. For edit, idNo/bankNo may still be the masked text (= unchanged). Returns {field: errorKey}. */
    validate(d, empNo) {
      const e = {}; const cur = empNo ? this.emp(empNo) : null;
      if (!String(d.name || '').trim()) e.name = 'name'; else if (d.name.trim().length > 40) e.name = 'name_len';
      const ph = this.normPhone(d.phone); if (!/^\d{8,15}$/.test(ph)) e.phone = 'phone'; else if (state.emps.some((x) => x.empNo !== empNo && this.normPhone(x.phone) === ph)) e.phone = 'phone_dup';
      const acc = String(d.account || '').trim();
      if (!acc) e.account = 'account'; else if (!/^[a-zA-Z0-9._@-]{3,40}$/.test(acc)) e.account = 'account_fmt'; else if (state.emps.some((x) => x.empNo !== empNo && lc(x.account) === lc(acc))) e.account = 'account_dup';
      const pw = d.password || '';
      if (!empNo && !pw) e.password = 'pw'; if (pw && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))) e.password = 'pw_fmt';
      const id = this.normId(d.idNo);
      if (cur && id === cur.idMask.toUpperCase()) { /* unchanged */ }
      else if (!id) e.idNo = 'id'; else if (!/^[STFGM]\d{7}[A-Z]$/.test(id)) e.idNo = 'id_fmt';
      else if ((d.idType === 'fin') !== /^[FGM]/.test(id)) e.idNo = 'id_type';
      else if (state.emps.some((x) => x.empNo !== empNo && x.idMask === maskId(id))) e.idNo = 'id_dup';
      if (!String(d.bank || '').trim()) e.bank = 'bank';
      const bn = this.normBank(d.bankNo);
      if (cur && bn === this.normBank(cur.bankMask)) { /* unchanged */ } else if (!/^\d{6,20}$/.test(bn)) e.bankNo = 'bank_no';
      if (!d.country) e.country = 'country';
      if (d.idType === 'fin' && !String(d.wpNo || '').trim()) e.wpNo = 'wp';
      if (!String(d.employer || '').trim()) e.employer = 'employer';
      if (d.passType && !PASS_TYPES.includes(d.passType)) e.passType = 'pass_type';
      if (d.passExpiry && !validDate(d.passExpiry)) e.passExpiry = 'pass_exp';
      if (String(d.passportNo || '').trim() && !/^[A-Za-z0-9]{6,12}$/.test(String(d.passportNo).trim())) e.passportNo = 'pp_no';
      if (d.passportExpiry && !validDate(d.passportExpiry)) e.passportExpiry = 'pp_exp';
      if (!validDate(d.dob)) e.dob = 'dob'; else if (d.dob > today() || ageAt(d.dob, today()) < 16 || ageAt(d.dob, today()) > 80) e.dob = 'dob_range';
      if (d.idType === 'pr') { if (!validDate(d.prSince)) e.prSince = 'pr'; else if (d.prSince > today()) e.prSince = 'pr_future'; else if (validDate(d.dob) && d.prSince < d.dob) e.prSince = 'pr_dob'; }
      if (!ROLES.includes(d.role)) e.role = 'role';
      if (d.cpfOn && d.idType === 'fin') e.cpfOn = 'cpf_fin';
      if (!d.templateId) e.templateId = 'tpl';
      if (!(d.trades || []).length) e.trades = 'trades';
      if (!validDate(d.joinDate)) e.joinDate = 'join'; if (d.leaveDate) { if (!validDate(d.leaveDate)) e.leaveDate = 'leave'; else if (validDate(d.joinDate) && d.leaveDate < d.joinDate) e.leaveDate = 'leave_before'; }
      if (!(Number(d.rate) > 0) || Number(d.rate) > 100000) e.rate = 'rate';
      if (String(d.note || '').length > 200) e.note = 'note';
      return e;
    },
    _build(d, base) {
      const id = this.normId(d.idNo); const bn = this.normBank(d.bankNo);
      return {
        name: d.name.trim(), nameEn: (d.nameEn || '').trim() || base.nameEn || d.name.trim(), phone: this.normPhone(d.phone), account: d.account.trim(),
        idType: d.idType, idMask: /\*/.test(id) ? base.idMask : maskId(id), bank: d.bank.trim(), bankMask: /^•/.test(bn) ? base.bankMask : maskBank(bn),
        country: d.country, address: (d.address || '').trim(), wpNo: (d.wpNo || '').trim(), client: (d.client || '').trim(),
        employer: base.employer && base.employer.zh === d.employer.trim() ? base.employer : { zh: d.employer.trim(), en: d.employerEn || d.employer.trim() },
        passType: d.idType === 'fin' ? d.passType || '' : '', passExpiry: d.idType === 'fin' ? d.passExpiry || '' : '',
        passportNo: d.idType === 'fin' ? String(d.passportNo || '').trim().toUpperCase() : '', passportExpiry: d.idType === 'fin' ? d.passportExpiry || '' : '',
        pcp: d.pcp || '', dob: d.dob, prSince: d.idType === 'pr' ? d.prSince : null, role: d.role, cpfOn: !!d.cpfOn, trades: (d.trades || []).slice(), templateId: d.templateId,
        rateCents: Math.round(Number(d.rate) * 100), joinDate: d.joinDate, leaveDate: d.leaveDate || '', status: d.status === 'disabled' ? 'disabled' : 'active',
        assigns: (d.assigns || []).map((a) => ({ projectKey: a.projectKey, siteKey: a.siteKey, role: a.role || d.role })), note: (d.note || '').trim(),
        certs: (d.certs || []).filter((c) => c.type || c.no).map((c) => ({ id: c.id || this.newCertId(), type: c.type, no: c.no, issued: c.issued, expiry: c.permanent ? null : c.expiry || null, file: c.file || '', fileSize: c.file ? c.fileSize || 0 : 0 })),
      };
    },
    create(d) {
      const e = this.validate(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const emp = Object.assign({ empNo: this.nextEmpNo(), tenantId: d.tenantId || BS.tenant.ME_TENANT, secondedFrom: null, disabledAt: null, createdBy: BS.perm ? BS.perm.currentId() : null }, this._build(d, {}));
      if (emp.status === 'disabled') emp.disabledAt = BS.fmt.now().slice(0, 16).replace('T', ' ');
      state.emps.push(emp); const ok = save(); emit({ type: 'created', empNo: emp.empNo }); return { ok: true, emp, persisted: ok };
    },
    update(empNo, d) {
      const cur = this.emp(empNo); if (!cur) return { ok: false, errors: { name: 'missing' } };
      const e = this.validate(d, empNo); if (Object.keys(e).length) return { ok: false, errors: e };
      const was = cur.status; const next = this._build(d, cur); Object.assign(cur, next);
      if (was === 'active' && cur.status === 'disabled') cur.disabledAt = BS.fmt.now().slice(0, 16).replace('T', ' '); if (cur.status === 'active') cur.disabledAt = null;
      const ok = save(); emit({ type: 'updated', empNo }); return { ok: true, emp: cur, persisted: ok };
    },
    setStatus(empNo, status) {
      const e = this.emp(empNo); if (!e) return { ok: false };
      e.status = status; e.disabledAt = status === 'disabled' ? BS.fmt.now().slice(0, 16).replace('T', ' ') : null;
      save(); emit({ type: 'status', empNo, status }); return { ok: true };
    },
    second(empNo, tenantId) {
      const e = this.emp(empNo); const t = BS.tenant.tenant(tenantId); if (!e || !t) return { ok: false, error: 'tenant' };
      if (e.tenantId === tenantId) return { ok: false, error: 'same' };
      e.secondedFrom = e.secondedFrom || e.tenantId; e.tenantId = tenantId; if (e.secondedFrom === tenantId) e.secondedFrom = null;
      save(); emit({ type: 'second', empNo }); return { ok: true };
    },
    /** a renewed passport or work pass: only the expiry (and optionally the number) changes. kind: 'passport' | 'pass'. The new date must be in the future and later than the old one. */
    setDocExpiry(empNo, kind, date, ref) {
      const e = this.emp(empNo); if (!e) return { ok: false, errors: { date: 'missing' } };
      if (e.idType !== 'fin' || !['passport', 'pass'].includes(kind)) return { ok: false, errors: { kind: 'kind' } };
      const field = kind === 'passport' ? 'passportExpiry' : 'passExpiry';
      if (!validDate(date)) return { ok: false, errors: { date: 'date' } };
      if (date <= today()) return { ok: false, errors: { date: 'past' } };
      if (e[field] && date <= e[field]) return { ok: false, errors: { date: 'not_later' } };
      const no = String(ref || '').trim(); if (kind === 'passport' && no && !/^[A-Za-z0-9]{6,12}$/.test(no)) return { ok: false, errors: { ref: 'pp_no' } };
      e[field] = date; if (kind === 'passport' && no) e.passportNo = no.toUpperCase();
      const ok = save(); emit({ type: 'updated', empNo }); return { ok: true, persisted: ok };
    },
    /** a worker's residential address changes (for instance a dormitory move); length checked like the roster form */
    setAddress(empNo, address) {
      const e = this.emp(empNo); if (!e) return { ok: false, errors: { address: 'missing' } }; const a = String(address || '').trim(); if (a.length > 120) return { ok: false, errors: { address: 'address_len' } };
      e.address = a; const ok = save(); emit({ type: 'updated', empNo }); return { ok: true, persisted: ok };
    },
    setProjectRole(empNo, projectKey, role) {
      const e = this.emp(empNo); const a = e && e.assigns.find((x) => x.projectKey === projectKey); if (!a || !ROLES.includes(role)) return { ok: false };
      a.role = role; save(); emit({ type: 'assign', empNo }); return { ok: true };
    },
    assignTo(empNo, projectKey, siteKey, role) {
      const e = this.emp(empNo); if (!e) return { ok: false };
      const a = e.assigns.find((x) => x.projectKey === projectKey); if (a) { a.siteKey = siteKey; if (role) a.role = role; } else e.assigns.push({ projectKey, siteKey, role: role || e.role });
      save(); emit({ type: 'assign', empNo }); return { ok: true };
    },

    // ---------- import ----------
    IMPORT_COLS: ['name', 'phone', 'account', 'idNo', 'idType', 'dob', 'prSince', 'bank', 'bankNo', 'country', 'role', 'employer', 'trades', 'template', 'rate', 'joinDate', 'project', 'site', 'cpf', 'wpNo', 'client'],
    /** rows: array of objects keyed by IMPORT_COLS (strings). Returns [{n, d, errors:[{col,key,p}]}]; n = spreadsheet row number. */
    checkImport(rows, targetProject) {
      const seenAcc = new Set(), seenPhone = new Set(), seenId = new Set(); const out = [];
      const typeMap = { 外籍: 'fin', 外籍员工: 'fin', fin: 'fin', foreign: 'fin', 公民: 'citizen', citizen: 'citizen', pr: 'pr', 永久居民: 'pr' };
      const roleMap = { 工人: 'worker', worker: 'worker', 主管: 'supervisor', supervisor: 'supervisor', 安全员: 'safety', safety: 'safety' };
      const yes = (v) => ['是', 'y', 'yes', 'true', '1', '缴纳'].includes(lc(v)); const no = (v) => ['否', 'n', 'no', 'false', '0', '不缴纳', ''].includes(lc(v));
      const countryByName = (v) => Object.entries(S.COUNTRIES).find(([k, n]) => lc(v) === k || lc(v) === lc(n[0]) || lc(v) === lc(n[1]));
      rows.forEach((r, i) => {
        const errors = []; const bad = (col, key, p) => errors.push({ col, key, p });
        const g = (k) => String(r[k] == null ? '' : r[k]).trim();
        const d = { name: g('name'), phone: g('phone'), account: g('account'), password: 'Imported1', idNo: g('idNo'), idType: typeMap[lc(g('idType'))] || '', dob: g('dob'), prSince: g('prSince'), bank: g('bank'), bankNo: g('bankNo'), role: roleMap[lc(g('role'))] || (g('role') ? '' : 'worker'),
          employer: g('employer'), wpNo: g('wpNo'), client: g('client') || CLIENTS[0], status: 'active', joinDate: g('joinDate'), leaveDate: '', note: '', assigns: [] };
        if (!d.idType) bad('idType', 'hr.imp.idType');
        const c = countryByName(g('country')); if (c) d.country = c[0]; else bad('country', 'hr.imp.country');
        if (g('role') && !d.role) bad('role', 'hr.imp.role');
        const tp = BS.pay.templates().find((t) => lc(t.nameZh) === lc(g('template')) || lc(t.nameEn) === lc(g('template')) || t.id === g('template')); if (tp) d.templateId = tp.id; else bad('template', 'hr.imp.template');
        const trs = g('trades').split(/[\/、,，;；]/).map((x) => x.trim()).filter(Boolean); d.trades = [];
        trs.forEach((x) => { const t = state.trades.find((y) => lc(y.zh) === lc(x) || lc(y.en) === lc(x) || y.code === x.toUpperCase()); if (t) d.trades.push(t.code); else bad('trades', 'hr.imp.trade', { v: x }); });
        const rate = g('rate'); d.rate = rate === '' ? (tp && tp.type === 'monthly' ? (tp.baseSalaryCents || 0) / 100 : 120) : rate;
        const cpfv = g('cpf'); d.cpfOn = cpfv === '' ? d.idType !== 'fin' : yes(cpfv) ? true : no(cpfv) ? false : (bad('cpf', 'hr.imp.cpf'), false);
        const pj = targetProject ? this.project(targetProject) : (g('project') ? state.projects.find((p) => lc(p.zh) === lc(g('project')) || lc(p.en) === lc(g('project')) || p.code === g('project').toUpperCase()) : null);
        if (g('project') || targetProject) {
          if (!pj) bad('project', 'hr.imp.project'); else {
            const live = this.projectSites(pj.key, true);
            const sk = g('site') ? live.find((k) => { const x = this.site(k); return lc(x.zh) === lc(g('site')) || lc(x.en) === lc(g('site')) || x.code.toLowerCase() === lc(g('site')) || k === g('site'); }) : live[0];
            if (this.projectStatus(pj) === 'done') bad('project', 'hr.imp.projectDone');
            else if (!sk) bad('site', 'hr.imp.site'); else d.assigns.push({ projectKey: pj.key, siteKey: sk, role: d.role || 'worker' });
          }
        }
        const v = this.validate(d); // field-level checks reuse the form rules
        Object.entries(v).forEach(([f, k]) => { if (f === 'password' || f === 'templateId' || f === 'trades' || f === 'country' || f === 'rate') { if (f === 'rate') bad('rate', 'hr.imp.rate'); return; } bad(f, 'hr.e.' + k); });
        // duplicates inside the file
        const acc = lc(d.account), ph = this.normPhone(d.phone), idn = this.normId(d.idNo);
        if (acc) { if (seenAcc.has(acc)) bad('account', 'hr.imp.dupFile'); seenAcc.add(acc); } if (ph) { if (seenPhone.has(ph)) bad('phone', 'hr.imp.dupFile'); seenPhone.add(ph); } if (idn) { if (seenId.has(idn)) bad('idNo', 'hr.imp.dupFile'); seenId.add(idn); }
        out.push({ n: i + 2, d, errors });
      });
      return out;
    },
    commitImport(checked) {
      if (checked.some((r) => r.errors.length)) return { ok: false };
      const made = []; checked.forEach((r) => { const res = this.create(r.d); if (res.ok) made.push(res.emp.empNo); });
      emit({ type: 'import', n: made.length }); return { ok: true, n: made.length, empNos: made };
    },

    reset() { state = reindex(seed()); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
