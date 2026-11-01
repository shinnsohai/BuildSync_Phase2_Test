/* Skill Passport: the worker's own profile for employers, modelled on the EZJOB Skill Passport (profile header, skill matrix, physical readiness, work history, certifications,
   work demonstrations, AI competency match) and its five-step editor. Who owns what: name, country, trades and the certificates on file come from the company's personnel record
   and are only shown here (certificates there are "verified"); everything else the worker writes themself and is "self-declared". Nothing here changes the personnel record. */
(function (BS) {
  const KEY = 'bs_passport_proto_v1';
  const hr = BS.hr;
  const listeners = new Set();
  let version = 0;
  const today = () => BS.fmt.now().slice(0, 10);
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const p = (id, zh, en) => ({ id, zh, en });
  /** industry sector → skill group → skills (a starting taxonomy: the live site's list replaces it when the two are joined) */
  const TAX = [
    { id: 'building', zh: '建筑与施工', en: 'Building & Construction', groups: [
      { id: 'weld', zh: '焊接（FCAW/SMAW）', en: 'Welding (FCAW/SMAW)', skills: [p('w6g', '6G 管焊', '6G Pipe Welding'), p('wst', '结构钢焊接', 'Structural Steel'), p('wtig', '氩弧焊（GTAW）', 'TIG Welding (GTAW)')] },
      { id: 'mat', zh: '物料搬运', en: 'Material Handling', skills: [p('mcr', '桥式起重机操作', 'Overhead Crane Operation'), p('mrg', '吊装与捆扎', 'Rigging & Slinging'), p('mfk', '叉车（平衡重式）', 'Forklift (Counterbalance)')] },
      { id: 'scaf', zh: '脚手架', en: 'Scaffolding', skills: [p('ser', '搭设与拆除', 'Erect & Dismantle'), p('sin', '脚手架检查', 'Scaffold Inspection')] },
      { id: 'conc', zh: '混凝土与模板', en: 'Concrete & Formwork', skills: [p('cfw', '模板木工', 'Formwork Carpentry'), p('crb', '钢筋绑扎', 'Rebar Fixing'), p('ccp', '混凝土浇筑', 'Concrete Placing')] },
      { id: 'wah', zh: '高处作业', en: 'Work at Height', skills: [p('hhr', '安全带使用与救援', 'Harness Use & Rescue'), p('hms', '移动脚手架', 'Mobile Scaffold')] },
    ] },
    { id: 'pcm', zh: '流程、海事与化工', en: 'Process, Marine & Chemical (PCM)', groups: [
      { id: 'pipe', zh: '管道', en: 'Piping', skills: [p('pfit', '管道安装', 'Pipe Fitting'), p('pfab', '管道预制', 'Pipe Fabrication'), p('phyd', '水压试验协助', 'Hydrotest Assistance')] },
      { id: 'pweld', zh: '焊接', en: 'Welding', skills: [p('p6g', '6G 管焊', '6G Pipe Welding'), p('pss', '不锈钢氩弧焊', 'Stainless TIG')] },
      { id: 'conf', zh: '密闭空间', en: 'Confined Space', skills: [p('cen', '进入与监护', 'Entry & Standby'), p('cgt', '气体检测', 'Gas Testing')] },
    ] },
    { id: 'semi', zh: '半导体与电子', en: 'Semiconductor & Electronics', groups: [
      { id: 'clean', zh: '洁净室', en: 'Cleanroom', skills: [p('kgw', '洁净室着装与规范', 'Gowning & Protocols'), p('kin', '洁净室安装', 'Cleanroom Installation')] },
      { id: 'uhp', zh: '超高纯管道', en: 'UHP Piping', skills: [p('uor', '轨道焊', 'Orbital Welding'), p('uin', '管道安装', 'Piping Installation')] },
      { id: 'asm', zh: '电子装配', en: 'Electronics Assembly', skills: [p('eso', '焊接（IPC）', 'Soldering (IPC)'), p('ehw', '线束装配', 'Cable Harness')] },
    ] },
    { id: 'power', zh: '发电与公用事业', en: 'Power Generation & Utilities', groups: [
      { id: 'elec', zh: '电气', en: 'Electrical', skills: [p('lv', '低压布线', 'LV Wiring'), p('hv', '高压电缆接头', 'HV Cable Jointing'), p('sw', '开关柜', 'Switchgear')] },
      { id: 'mech', zh: '机械', en: 'Mechanical', skills: [p('tur', '汽轮机对中', 'Turbine Alignment'), p('boi', '锅炉维护', 'Boiler Maintenance')] },
    ] },
    { id: 'soft', zh: '软技能与电脑', en: 'Soft Skills & Computer Literacy', groups: [
      { id: 'lang', zh: '语言', en: 'Language', skills: [p('en', '基础安全英语', 'Basic Safety English'), p('zh', '华语沟通', 'Mandarin Communication')] },
      { id: 'comp', zh: '电脑与手机', en: 'Computer & Mobile', skills: [p('off', '基础办公软件', 'Basic Office Software'), p('app', '手机应用', 'Mobile Apps')] },
      { id: 'lead', zh: '班组沟通', en: 'Team Communication', skills: [p('tbm', '班前会讲解', 'Toolbox Briefing'), p('tl', '带班', 'Team Lead')] },
    ] },
  ];
  const BLOOD = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
  const HOSTS = /^https:\/\/(www\.|m\.|vm\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch)\//i;
  const MAX = { certs: 10, history: 8, skills: 12 };

  const blank = () => ({ photo: '', bio: '', hostYears: '', height: '', weight: '', colorBlind: 'no', blood: '', totalYears: '', skills: [], relocation: false, immediate: false, videos: { intro: '', demo: '' }, cv: null, certs: [], history: [], tests: { heavy: 'pending', audio: 'pending' }, step: 1, done: false, updatedAt: '' });
  function seed() {
    const me = blank(); Object.assign(me, { bio: '8 years on high-rise sites. I supervise formwork and make sure the crew follows the lifting plan every day.', hostYears: 8, height: 172, weight: 70, blood: 'O+', totalYears: 8, relocation: false, immediate: false, done: true, updatedAt: today(),
      skills: [{ sector: 'building', group: 'conc', skill: 'cfw', primary: true }, { sector: 'building', group: 'wah', skill: 'hhr' }, { sector: 'building', group: 'mat', skill: 'mrg' }, { sector: 'soft', group: 'lead', skill: 'tbm' }],
      tests: { heavy: 'cleared', audio: 'pending' },
      history: [{ id: 'h1', company: 'Raffles Place Integrated Project', role: 'Formwork supervisor', from: 2022, to: '', text: 'Supervises a crew of 14 on levels 20 to 38. Zero lost-time incidents in the last 18 months.' }, { id: 'h2', company: 'Marina Bay Residences', role: 'Senior carpenter', from: 2018, to: 2022, text: 'Formwork for podium and tower slabs; trained five new workers.' }] });
    return { v: 1, byEmp: { 'SG-0312': me } };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.byEmp) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const find = (sector, group, skill) => { const s = TAX.find((x) => x.id === sector); const g = s && s.groups.find((x) => x.id === group); const k = g && g.skills.find((x) => x.id === skill); return k ? { sector: s, group: g, skill: k } : null; };
  const num = (v) => (v === '' || v == null ? NaN : Number(v));
  const text = (v, n) => String(v || '').trim().slice(0, n);

  const PP = {
    TAX, BLOOD, MAX,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    find,
    get(empNo) { return state.byEmp[empNo] || (state.byEmp[empNo] = blank()); },
    /** checks the fields of one editor step; returns { field: code } */
    validate(step, d) {
      const e = {};
      if (step === 1) {
        if (String(d.bio || '').length > 300) e.bio = 'bio';
        const hy = num(d.hostYears); if (d.hostYears !== '' && !(Number.isInteger(hy) && hy >= 0 && hy <= 60)) e.hostYears = 'years';
        const h = num(d.height); if (d.height !== '' && !(h >= 100 && h <= 230)) e.height = 'height'; const w = num(d.weight); if (d.weight !== '' && !(w >= 30 && w <= 200)) e.weight = 'weight';
        if (!['no', 'yes'].includes(d.colorBlind)) e.colorBlind = 'cb'; if (d.blood && !BLOOD.includes(d.blood)) e.blood = 'blood';
      } else if (step === 2) {
        const ty = num(d.totalYears); if (d.totalYears !== '' && !(Number.isInteger(ty) && ty >= 0 && ty <= 60)) e.totalYears = 'years';
        if ((d.skills || []).length > MAX.skills) e.skills = 'many';
      } else if (step === 3) {
        ['intro', 'demo'].forEach((k) => { const v = String((d.videos || {})[k] || '').trim(); if (v && (v.length > 300 || !HOSTS.test(v))) e[k] = 'link'; });
      }
      return e;
    },
    /** saves the fields of one step (after validate) and moves the editor on */
    saveStep(empNo, step, d) {
      const e = this.validate(step, d); if (Object.keys(e).length) return { ok: false, errors: e };
      const pr = this.get(empNo);
      if (step === 1) Object.assign(pr, { bio: text(d.bio, 300), hostYears: d.hostYears === '' ? '' : Number(d.hostYears), height: d.height === '' ? '' : Number(d.height), weight: d.weight === '' ? '' : Number(d.weight), colorBlind: d.colorBlind, blood: d.blood || '' });
      else if (step === 2) Object.assign(pr, { totalYears: d.totalYears === '' ? '' : Number(d.totalYears), relocation: !!d.relocation, immediate: !!d.immediate });
      else if (step === 3) pr.videos = { intro: text(d.videos.intro, 300), demo: text(d.videos.demo, 300) };
      pr.step = Math.min(5, step + 1); pr.updatedAt = today(); const ok = save(); emit({ type: 'step', empNo }); return { ok: true, persisted: ok };
    },
    finish(empNo) { const pr = this.get(empNo); pr.done = true; pr.step = 1; pr.updatedAt = today(); const ok = save(); emit({ type: 'done', empNo }); return { ok: true, persisted: ok }; },
    setPhoto(empNo, dataUrl) { this.get(empNo).photo = dataUrl; const ok = save(); emit({ type: 'photo', empNo }); return { ok, persisted: ok }; },
    setCv(empNo, file) { this.get(empNo).cv = file ? { name: String(file.name).slice(0, 80), size: file.size } : null; const ok = save(); emit({ type: 'cv', empNo }); return { ok: true, persisted: ok }; },
    /** the first skill added is the primary one; the primary can be changed */
    addSkills(empNo, sector, group, ids) {
      const pr = this.get(empNo); let n = 0;
      for (const id of ids) { if (!find(sector, group, id)) continue; if (pr.skills.some((s) => s.skill === id && s.group === group && s.sector === sector)) continue; if (pr.skills.length >= MAX.skills) return { ok: false, error: 'many' }; pr.skills.push({ sector, group, skill: id, primary: !pr.skills.length }); n++; }
      if (!n) return { ok: false, error: 'none' }; const ok = save(); emit({ type: 'skills', empNo }); return { ok: true, added: n, persisted: ok };
    },
    removeSkill(empNo, sector, group, id) { const pr = this.get(empNo); const was = pr.skills.find((s) => s.skill === id && s.group === group && s.sector === sector); pr.skills = pr.skills.filter((s) => s !== was); if (was && was.primary && pr.skills[0]) pr.skills[0].primary = true; const ok = save(); emit({ type: 'skills', empNo }); return { ok: true, persisted: ok }; },
    setPrimary(empNo, sector, group, id) { const pr = this.get(empNo); pr.skills.forEach((s) => { s.primary = s.skill === id && s.group === group && s.sector === sector; }); const ok = save(); emit({ type: 'skills', empNo }); return { ok: true, persisted: ok }; },
    validateCert(d) {
      const e = {}; const name = String(d.name || '').trim(); if (name.length < 2) e.name = 'name'; else if (name.length > 60) e.name = 'name_len';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expiry || '') || d.expiry < '1990-01-01' || d.expiry > '2100-12-31') e.expiry = 'date';
      if (d.file && d.file.size > 2 * 1024 * 1024) e.file = 'size'; return e;
    },
    addCert(empNo, d) { const e = this.validateCert(d); const pr = this.get(empNo); if (!Object.keys(e).length && pr.certs.length >= MAX.certs) e.name = 'many'; if (Object.keys(e).length) return { ok: false, errors: e }; pr.certs.push({ id: 'c' + Date.now().toString(36), name: text(d.name, 60), expiry: d.expiry, file: d.file ? { name: String(d.file.name).slice(0, 80), size: d.file.size } : null }); const ok = save(); emit({ type: 'cert', empNo }); return { ok: true, persisted: ok }; },
    removeCert(empNo, id) { const pr = this.get(empNo); pr.certs = pr.certs.filter((c) => c.id !== id); const ok = save(); emit({ type: 'cert', empNo }); return { ok: true, persisted: ok }; },
    validateHistory(d) {
      const e = {}; if (!String(d.company || '').trim()) e.company = 'company'; else if (String(d.company).length > 80) e.company = 'long'; if (!String(d.role || '').trim()) e.role = 'role'; else if (String(d.role).length > 60) e.role = 'long';
      const y = Number(today().slice(0, 4)); const f = num(d.from), t = num(d.to);
      if (!(Number.isInteger(f) && f >= 1970 && f <= y)) e.from = 'year'; if (d.to !== '' && d.to != null) { if (!(Number.isInteger(t) && t >= 1970 && t <= y)) e.to = 'year'; else if (!e.from && t < f) e.to = 'order'; }
      if (String(d.text || '').length > 300) e.text = 'long'; return e;
    },
    addHistory(empNo, d) { const e = this.validateHistory(d); const pr = this.get(empNo); if (!Object.keys(e).length && pr.history.length >= MAX.history) e.company = 'many'; if (Object.keys(e).length) return { ok: false, errors: e }; pr.history.push({ id: 'h' + Date.now().toString(36), company: text(d.company, 80), role: text(d.role, 60), from: Number(d.from), to: d.to === '' || d.to == null ? '' : Number(d.to), text: text(d.text, 300) }); pr.history.sort((a, b) => (b.to === '' ? 9999 : b.to) - (a.to === '' ? 9999 : a.to) || b.from - a.from); const ok = save(); emit({ type: 'history', empNo }); return { ok: true, persisted: ok }; },
    removeHistory(empNo, id) { const pr = this.get(empNo); pr.history = pr.history.filter((h) => h.id !== id); const ok = save(); emit({ type: 'history', empNo }); return { ok: true, persisted: ok }; },

    // ---------- what the view shows ----------
    primary(empNo) { const s = this.get(empNo).skills.find((x) => x.primary); return s ? find(s.sector, s.group, s.skill) : null; },
    /** certificates on the personnel record (verified) and those the worker added (self-declared), with their state */
    certs(empNo) {
      const e = hr.emp(empNo); const out = [];
      (e ? e.certs : []).forEach((c) => { const ty = hr.certType(c.type); out.push({ id: 'hr:' + c.id, zh: ty ? ty.zh : c.type, en: ty ? ty.en : c.type, no: c.no || '', expiry: c.expiry || '', status: hr.certStatus(c), verified: true }); });
      this.get(empNo).certs.forEach((c) => { const d = Math.round((new Date(c.expiry + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5); out.push({ id: c.id, zh: c.name, en: c.name, no: '', expiry: c.expiry, status: d < 0 ? 'expired' : d <= hr.SOON_DAYS ? 'soon' : 'ok', verified: false, file: c.file }); });
      return out.sort((a, b) => (+(a.status === 'expired') - +(b.status === 'expired')) || a.expiry.localeCompare(b.expiry));
    },
    /** how complete the profile is, and what is missing */
    completeness(empNo) {
      const pr = this.get(empNo); const parts = [['photo', 10, !!pr.photo], ['bio', 10, pr.bio.length >= 20], ['body', 10, pr.height !== '' && pr.weight !== ''], ['skills', 20, pr.skills.length > 0], ['years', 5, pr.totalYears !== ''], ['videos', 10, !!(pr.videos.intro || pr.videos.demo)], ['cv', 10, !!pr.cv], ['certs', 10, this.certs(empNo).length > 0], ['history', 15, pr.history.length > 0]];
      return { pct: parts.reduce((n, x) => (x[2] ? n + x[1] : n), 0), missing: parts.filter((x) => !x[2]).map((x) => x[0]) };
    },
    /** six scores 0–100 for the competency chart (a simple formula in the prototype; the live site's model replaces it) */
    radar(empNo) {
      const pr = this.get(empNo); const cs = this.certs(empNo); const ok = cs.filter((c) => c.status !== 'expired').length; const yrs = Number(pr.totalYears) || 0; const tests = [this.tests(empNo).color, pr.tests.heavy, pr.tests.audio].filter((s) => ['passed', 'cleared'].includes(s)).length;
      const soft = pr.skills.filter((s) => s.sector === 'soft').length; const tech = pr.skills.filter((s) => s.sector !== 'soft').length;
      const c = (n) => Math.max(0, Math.min(100, Math.round(n)));
      return [['tech', c(tech * 25)], ['safety', c(cs.length ? ok / cs.length * 100 : 0)], ['exp', c(yrs * 9)], ['docs', this.completeness(empNo).pct], ['phys', c(tests / 3 * 100)], ['comm', c(soft * 50 + (pr.bio.length >= 20 ? 25 : 0) + (pr.videos.intro ? 25 : 0))]];
    },
    /** physical readiness: colour-blindness is what the worker answered; the others are recorded by the company's medical screening */
    tests(empNo) { const pr = this.get(empNo); return { color: pr.colorBlind === 'no' ? 'passed' : 'review', heavy: pr.tests.heavy, audio: pr.tests.audio }; },
    shareText(empNo, lang) {
      const e = hr.emp(empNo); const pr = this.get(empNo); const k = this.primary(empNo); const z = lang === 'zh'; const cs = this.certs(empNo).filter((c) => c.status !== 'expired');
      return [`${z ? e.name : e.nameEn || e.name} — ${k ? (z ? k.skill.zh : k.skill.en) : ''}`.trim(), pr.totalYears !== '' ? `${pr.totalYears} ${z ? '年经验' : 'years experience'}` : '', cs.length ? `${z ? '有效证书' : 'Valid certificates'}: ${cs.map((c) => (z ? c.zh : c.en)).join(', ')}` : ''].filter(Boolean).join('\n');
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  BS.passport = PP;
})(window.BS);
