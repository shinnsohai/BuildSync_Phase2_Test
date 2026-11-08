/* Kanban Chat: the site chat (rooms, messages, photos, voice and video tiles, quick tags), the Kanban cards the crawler turns messages into, and the daily EHS digest.
   Rooms are the attendance groups already in BuiltSync (their crew, project and site), plus custom rooms; the six chat roles are derived from the personnel record (assignment role, trade)
   with a few demo overrides. The "AI crawler" and the digest are rule-based stand-ins that produce the specification's JSON (see docs/KANBAN-CHAT.md for the one function a real LLM replaces).
   A card's history and every message are append-only; a safety hazard reported through the chat can flag the permit for that site and earn the reporter the existing hazard-star points. */
(function (BS) {
  const KEY = 'bs_kchat_proto_v1';
  const hr = BS.hr, att = BS.att, bus = BS.bus;
  const listeners = new Set();
  let version = 0;
  const today = () => BS.fmt.now().slice(0, 10);
  const nowStr = () => BS.fmt.now().slice(0, 16);
  const addDays = (d, n) => hr.addDays(d, n);
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const pad = (n, w = 4) => String(n).padStart(w, '0');

  const ROLES = ['KANBAN_OWNER', 'SUPERVISOR', 'SAFETY_OFFICER', 'QUALITY_CONTROL', 'SCHEDULER', 'WORKER'];
  const CATS = ['Safety', 'Progress', 'Quality', 'Material'];
  const PRI = ['Low', 'Medium', 'High', 'Critical'];
  const COLS = ['Backlog', 'Pending_Review', 'In_Progress', 'Resolved'];
  const TRADES = ['Civil', 'Architecture', 'Structure', 'Mechanical', 'Piping', 'Exhaust', 'Chiller', 'Electrical', 'Scaffolding', 'Fire_Protection'];
  const ROLE_OF_CAT = { Safety: 'SAFETY_OFFICER', Quality: 'QUALITY_CONTROL', Material: 'SCHEDULER', Progress: 'SUPERVISOR' };
  /** the specification's permission matrix */
  const ALLOW = { send: ROLES, tag: ROLES, read: ROLES, move: ROLES.filter((r) => r !== 'WORKER'), create: ROLES.filter((r) => r !== 'WORKER'), delete: ['KANBAN_OWNER', 'SUPERVISOR'], consolidate: ['KANBAN_OWNER', 'SUPERVISOR', 'SAFETY_OFFICER'], digest: ['KANBAN_OWNER', 'SUPERVISOR', 'SAFETY_OFFICER'], groups: ['KANBAN_OWNER'], members: ['KANBAN_OWNER', 'SUPERVISOR'] };
  const can = (role, action) => (ALLOW[action] || []).includes(role);

  // ---------- the crawler: message → card (the specification's JSON) ----------
  const R = {
    crit: /fell|falling|fall from|electrocut|shock|collapse|on fire|\bfire\b|injur|bleed|unconscious|trapped|gas leak|触电|坠落|倒塌|着火|受伤|昏倒|被困|漏电/i,
    safe: /harness|ppe|helmet|hard hat|unanchored|not anchored|exposed|open edge|no guard|guardrail|leak|sparks?|unsafe|hazard|near miss|isolat|lock-?out|live wire|loose|scaffold|no belt|no harness|without harness|安全带|安全帽|没戴|没挂|没系|挂带|பெல்ட்|পড়ে|漏水|积水|临边|护栏|松动|隐患|未固定|পানি|হেলমেট|கம்பி/i,
    water: /water|leak|puddle|漏水|积水|পানি/i, elec: /electric|panel|\bdb\b|socket|cable|distribution board|配电箱|电箱|插座|电缆/i,
    qual: /honeycomb|crack|slump|misalign|defect|out of tolerance|rework|non-?conform|蜂窝|裂缝|偏位|不合格|返工|误差/i,
    mat: /deliver|arriv|shortage|short of|\bshort\b|delay|\blate\b|truck|out of stock|not yet|cement|rebar order|缺料|到货|到不了|送货|延误|延迟|没到|晚点|水泥/i,
    prog: /\b(done|complete[d]?|finished|poured|installed|erected|handed over|handover|signed off)\b|完成|浇筑完|安装完|已装|验收|做完|结束|இன்று வேலை முடிந்தது|কাজ শেষ/i,
    none: /\b(no|not any|without any)\s+(issues?|problems?|hazards?|defects?|leaks?|damage)\b|all (good|clear|ok|okay)\b|没有问题|没问题|一切正常|无异常|没有异常/i,
    ask: /^(is|are|was|were|did|do|does|can|could|will|when|where|who|why|how|any)\b[^]*\?\s*$|[?？]\s*$/i, praise: /great job|good job|well done|nicely done|done well|thank|appreciate|做得好|干得好|辛苦了/i,
    casual: /^(ok|okay|copy|noted|roger|thanks|thank you|good morning|morning|lunch|bye|yes|no|👍|收到|好的|早|谢谢|午饭|知道了)[\s!.。！]*$/i,
    struct: /column|slab|beam|柱|梁|板|base|foundation/i,
  };
  const LOCRX = [/(?:level|lvl|l)\s?-?\d+[a-z]?(?:\s+(?:east|west|north|south)\s+corridor)?/i, /(?:riser room|shaft|zone|core wall|block|tower|room)\s?#?[a-z0-9]+/i, /(?:east|west|north|south)\s+(?:corridor|wing|side)/i, /[A-Z]\d?\s?区[^，。,.\s]{0,6}/, /[一二三四五六七八九十\d]+[楼层]/, /[A-Z]\d{1,2}\b/];
  /** what the crawler would return for this message; ctx.room supplies the default location */
  function analyse(text, tag, ctx = {}) {
    const raw = String(text || '').trim(); const bare = raw.replace(/#\w+/g, '').trim(); const out = { is_kanban_item: false, title: '', category: 'Progress', priority: 'Low', assigned_role: 'SUPERVISOR', recommended_column: 'Backlog', location_tag: '', action_summary: '', summaryKey: '', reasons: [], conf: 0 };
    const media = ctx.media ? ctx.media.type : '';
    if (!bare && !tag && !media) return out;
    if (R.casual.test(bare) && !tag) return out;
    if (R.none.test(bare) && !tag) { out.reasons.push('no_issue'); return out; }
    if ((R.ask.test(bare) || R.praise.test(bare)) && !tag && !R.crit.test(bare)) { out.reasons.push(R.ask.test(bare) ? 'question' : 'praise'); return out; }
    let cat = tag && CATS.includes(tag) ? tag : '';
    if (!cat) { if (R.crit.test(bare) || R.safe.test(bare)) cat = 'Safety'; else if (R.qual.test(bare)) cat = 'Quality'; else if (R.mat.test(bare)) cat = 'Material'; else if (R.prog.test(bare)) cat = 'Progress'; }
    if (!cat) return out;
    out.is_kanban_item = true; out.category = cat; out.assigned_role = ROLE_OF_CAT[cat]; out.conf = tag ? 0.95 : /[஀-௿ঀ-৿]/.test(bare) ? 0.5 : 0.8;
    let pri = 'Medium', col = 'Pending_Review';
    if (cat === 'Safety') { const wet = R.water.test(bare) && R.elec.test(bare); pri = R.crit.test(bare) || wet ? 'Critical' : 'High'; col = 'Pending_Review'; if (wet) out.reasons.push('wet_electrical'); }
    else if (cat === 'Quality') { pri = R.struct.test(bare) ? 'High' : 'Medium'; col = 'Pending_Review'; }
    else if (cat === 'Material') { pri = 'Medium'; col = 'Pending_Review'; }
    else { pri = 'Low'; col = R.prog.test(bare) ? 'Resolved' : 'In_Progress'; }
    out.priority = pri; out.recommended_column = col;
    let loc = ''; for (const rx of LOCRX) { const m = bare.match(rx); if (m) { loc = m[0].trim(); break; } }
    out.location_tag = loc || (ctx.room ? ctx.room.locText : ''); out.summaryKey = cat.toLowerCase();
    out.title = (bare || ({ image: 'Photo', video: 'Video', voice: 'Voice memo' }[media] || cat)).replace(/\s+/g, ' ').replace(/^[^\w一-鿿ঀ-৿஀-௿]+/, ''); if (out.title.length > 60) out.title = out.title.slice(0, 57).trimEnd() + '…';
    out.action_summary = { Safety: 'Safety officer to inspect the area, stop the task if the hazard is not controlled, and confirm the fix.', Quality: 'QC to inspect, record the non-conformance and decide the rectification.', Material: 'Scheduler to confirm the delivery time and re-plan the affected work.', Progress: 'Supervisor to confirm the work and update the plan.' }[cat];
    return out;
  }

  // ---------- seed ----------
  const mins = (n) => { const d = new Date(BS.fmt.now()); d.setMinutes(d.getMinutes() - n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const defaultSettings = () => ({ required: true, categories: { Safety: true, Quality: true, Material: false, Progress: false }, min: 1, noteRequired: false, safetyManagersOnly: true, noSelfClose: true,
    sla: { Critical: 4, High: 12, Medium: 72, Low: 168 }, ownerMin: 30, escalate: { l1: 100, l2: 150 }, capture: 'critical', geo: 'flag', tagLimit: 3, rewardCap: 2, pairLimit: 2, spotRate: 25, permitHold: true,
    pinned: ['height', 'electric', 'ppe'], timemark: { on: true, tpl: 'site', userChange: true, require: false, color: 'amber', title: '', fields: { time: true, date: true, address: true, coord: false, name: true, code: true, content: true, verified: true } } });
  function seed() {
    const S = { settings: defaultSettings(), v: 1, meta: {}, custom: [], appointments: [], demo: { pos: 'onsite' }, msgs: [], cards: [], digests: [], reads: {}, n: { m: 0, c: 0, d: 0, a: 0 } };
    S.meta = {
      'g:g-day1': { trade: 'Structure', building: 'Tower A', level: 'Level 3', room: 'Riser Room 3A', zone: 'East Corridor', subcon: 'Huadong Construction Labour Pte. Ltd.' },
      'g:g-day2': { trade: 'Architecture', building: 'Tower B', level: 'Level 5', room: 'Lobby', zone: 'Zone B', subcon: 'Direct Site Force' },
      'g:g-night': { trade: 'Electrical', building: 'Block A1', level: 'Level 2', room: 'Switch Room', zone: 'Zone A', subcon: 'Huadong Construction Labour Pte. Ltd.' },
      'g:g-m2': { trade: 'Civil', building: 'Block B2', level: 'Level 2', room: 'Main Slab', zone: 'Column C4', subcon: 'Huadong Construction Labour Pte. Ltd.' },
      'g:g-flex': { trade: 'Piping', building: 'Loading Bay', level: 'Ground', room: 'Pipe Rack', zone: 'Bay 2', subcon: 'Xincheng Engineering Subcontracting Pte. Ltd.' },
    };
    S.custom = [{ id: 'c:lift', nameZh: '吊装与索具专班', nameEn: 'Lifting & Rigging Team', projectKey: 'raffles', siteKey: 'towerA', members: ['BS10116', 'SG-0312', 'BS09872', 'SG-0288'], trade: 'Scaffolding', building: 'Tower A', level: 'Level 3', room: 'Core', zone: 'Shaft #2', subcon: 'Direct Site Force' }];
    const msg = (room, by, text, o = {}) => { const id = 'M' + pad(++S.n.m); S.msgs.push({ id, roomId: room, senderNo: by, text, lang: o.lang || 'en', tr: o.tr || null, media: o.media || null, tag: o.tag || '', cardId: '', crawled: o.crawled !== false, status: 'read', at: mins(o.ago || 5) }); return id; };
    const card = (mid, o = {}) => {
      const m = S.msgs.find((x) => x.id === mid); const room = m.roomId; const a = analyse(m.text, m.tag, { media: m.media, room: { locText: '' } });
      const c = { id: 'KC-' + pad(++S.n.c), roomId: room, originMsgId: mid, title: a.title, category: a.category, priority: o.priority || a.priority, status: o.status || a.recommended_column, role: a.assigned_role, loc: a.location_tag, summaryKey: a.summaryKey, summary: '', assignedTo: o.assignedTo || '', by: 'ai', at: m.at, upd: o.upd || m.at, history: [{ at: m.at, by: 'crawler', from: '', to: o.status || a.recommended_column, note: '' }], permitId: '', awarded: false, closure: o.closure || null, dupOf: '' };
      const g = att.groups().find((x) => 'g:' + x.id === room); const t0 = today();
      if (g && BS.ptw && c.category === 'Safety' && ['High', 'Critical'].includes(c.priority)) { const pm = BS.ptw.all().find((x) => ['approved', 'active'].includes(x.status) && x.siteKey === g.siteKey && x.projectKey === g.projectKey && x.date >= t0 && x.date <= addDays(t0, 1)); if (pm) c.permitId = pm.id; }
      S.cards.push(c); m.cardId = c.id; return c;
    };
    // Tower A day crew
    msg('g:g-day1', 'BS10116', 'Morning. Tower A L3 curtain-wall lift starts 10am, riggers please confirm.', { tr: { zh: '早上好。塔楼 A 三楼幕墙吊装上午 10 点开始，吊装工请确认。' }, ago: 1620 });
    msg('g:g-day1', 'BS10115', 'ok copy', { tr: { zh: '收到' }, ago: 1610 });
    const m3 = msg('g:g-day1', 'BS10115', 'Level 3 east corridor, two guys working at the open edge with no harness. Please check.', { tr: { zh: '三楼东走廊，两个人在临边作业，没有系安全带。请去看看。' }, tag: 'Safety', media: { type: 'image', name: 'IMG_2041.jpg', data: '' }, ago: 1380 }); card(m3, { status: 'In_Progress', assignedTo: 'SG-0312', upd: mins(1300) });
    const m4 = msg('g:g-day1', 'BS10116', 'Panel lift on L3 done, all 6 panels installed.', { tr: { zh: '三楼板块吊装完成，6 块板全部安装好。' }, ago: 320 }); card(m4, { status: 'Resolved' });
    const m5 = msg('g:g-day1', 'SG-0288', '四楼的水泥到不了，卡车晚点，下午2点才到。', { lang: 'zh', tr: { en: 'The cement for level 4 will not arrive; the truck is late, now 2pm.' }, ago: 95 }); card(m5);
    msg('g:g-day1', 'SG-0312', 'Safety first: everyone re-check harness anchor points before the 2pm pour.', { tr: { zh: '安全第一：下午 2 点浇筑前，大家再检查一遍安全带挂点。' }, ago: 40, crawled: true });
    // Tower B
    msg('g:g-day2', 'SG-0401', 'Level 5 lobby tiling started, 40% done.', { tr: { zh: '五楼大堂贴砖已开始，完成约 40%。' }, ago: 200, crawled: false });
    // Night crew
    const n1 = msg('g:g-night', 'BS10110', 'A1 区二层配电箱下面有积水，好像漏水了。', { lang: 'zh', tr: { en: 'There is water under the distribution board on A1 level 2, it looks like a leak.' }, media: { type: 'image', name: 'IMG_8812.jpg', data: '' }, ago: 70, tag: 'Safety' }); card(n1);
    const n2 = msg('g:g-night', 'BS10113', '配电箱已经检查完了，没有问题。', { lang: 'zh', tr: { en: 'The distribution board check is finished, no problem found.' }, ago: 460 }); card(n2, { status: 'Resolved', closure: { by: 'BS10113', byRole: 'QUALITY_CONTROL', at: mins(450), note: 'All breakers checked, no leaks', evidence: [{ type: 'image', name: 'IMG_8820.jpg', data: '', src: 'upload' }] } });
    msg('g:g-night', 'BS10114', 'Ok', { tr: { zh: '好' }, ago: 455 });
    // B2
    const b1 = msg('g:g-m2', 'BS10111', 'Column C4 on level 2 has honeycomb at the base, about 30cm wide. Need QC to look.', { tr: { zh: '二层 C4 柱底有蜂窝，约 30 厘米宽，需要质检来看看。' }, tag: 'Quality', media: { type: 'image', name: 'IMG_3306.jpg', data: '' }, ago: 260 }); card(b1);
    msg('g:g-m2', 'BS10456', 'Noted, I will check after lunch.', { tr: { zh: '知道了，午饭后我去看。' }, ago: 240 });
    // Flexible group (some messages not yet crawled)
    msg('g:g-flex', 'BS09872', 'Welding spools for the bay pipe rack arrived, 12 of 20. The rest is short.', { tr: { zh: '码头管架的焊接管段到了 12 根（共 20 根），其余的缺货。' }, ago: 150, crawled: false });
    msg('g:g-flex', 'SG-0301', 'இன்று வேலை முடிந்தது', { lang: 'ta', tr: { en: 'Today’s work is finished.', zh: '今天的工作完成了。' }, ago: 55, crawled: false });
    msg('g:g-flex', 'BS10112', 'সিঁড়িতে পানি পড়ছে', { lang: 'bn', tr: { en: 'Water is leaking onto the stairs.', zh: '楼梯上在漏水。' }, media: { type: 'voice', name: 'voice.m4a', dur: '0:07' }, ago: 30, crawled: false });
    // custom room
    msg('c:lift', 'SG-0312', 'Lift plan for tomorrow: need 1 rigger and 1 signalman at Shaft #2.', { tr: { zh: '明天的吊装计划：2 号井需要 1 名吊装工和 1 名信号工。' }, ago: 180 });
    msg('c:lift', 'BS10116', 'Signalman: only Ravi is free tomorrow.', { tr: { zh: '信号工：明天只有 Ravi 有空。' }, ago: 170 });
    return S;
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.msgs) { const dd = defaultSettings(); s.settings = { ...dd, ...(s.settings || {}), categories: { ...dd.categories, ...((s.settings || {}).categories || {}) }, sla: { ...dd.sla, ...((s.settings || {}).sla || {}) }, escalate: { ...dd.escalate, ...((s.settings || {}).escalate || {}), }, timemark: { ...dd.timemark, ...((s.settings || {}).timemark || {}), fields: { ...dd.timemark.fields, ...(((s.settings || {}).timemark || {}).fields || {}) } }, pinned: Array.isArray((s.settings || {}).pinned) ? s.settings.pinned : dd.pinned }; return s; } } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });
  /** photos are the only heavy thing kept: keep the newest ones, drop the pixels of the rest */
  function trimMedia() { const all = [...state.msgs.filter((m) => m.media && m.media.data).map((m) => ({ at: m.at, o: m.media })), ...state.cards.filter((c) => c.closure).flatMap((c) => c.closure.evidence.filter((e) => e.data).map((e) => ({ at: c.closure.at, o: e })))].sort((a, b) => a.at.localeCompare(b.at)); all.slice(0, Math.max(0, all.length - 16)).forEach((x) => { x.o.data = ''; }); }

  const roomMeta = (id) => state.meta[id] || {};
  const K = {
    ROLES, CATS, PRI, COLS, TRADES, can, analyse,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // ---------- people and roles ----------
    /** the best chat role a person holds today: an active appointment (safety officer, QC, scheduler) or supervisor by assignment; nobody becomes a safety officer by trade alone */
    roleOfEmp(empNo) { const r = this.activeRoles(empNo); return r[0] || 'WORKER'; },
    /** the chat role of an administrator account */
    roleOfAccount(acct) { const r = acct && BS.perm.roleOf(acct); const code = r ? r.code : ''; return code === 'SUPER_ADMIN' ? 'KANBAN_OWNER' : code === 'PROJECT_ADMIN' ? 'SUPERVISOR' : 'WORKER'; },
    senderOf(no) {
      if (String(no).startsWith('acct:')) { const a = BS.perm.account(no.slice(5)); return { no, name: a ? a.name : no, nameEn: a ? a.nameEn || a.name : no, role: this.roleOfAccount(a), admin: true }; }
      const e = hr.emp(no); return { no, name: e ? e.name : no, nameEn: e ? e.nameEn || e.name : no, role: this.roleOfEmp(no), admin: false };
    },
    people() { return hr.emps().filter((e) => e.status === 'active'); },

    // ---------- rooms ----------
    rooms() {
      const out = att.groups().map((g) => ({ id: 'g:' + g.id, kind: 'group', groupId: g.id, nameZh: g.nameZh, nameEn: g.nameEn, projectKey: g.projectKey, siteKey: g.siteKey, ...roomMeta('g:' + g.id) }));
      state.custom.forEach((c) => out.push({ ...c, kind: 'custom' })); return out;
    },
    room(id) { return this.rooms().find((r) => r.id === id) || null; },
    members(roomId) {
      const r = this.room(roomId); if (!r) return [];
      if (r.kind === 'custom') return r.members.map((no) => hr.emp(no)).filter((e) => e && e.status === 'active');
      return hr.emps().filter((e) => e.status === 'active' && att.groupOf(e) && att.groupOf(e).id === r.groupId);
    },
    isMember(roomId, empNo) { return this.members(roomId).some((e) => e.empNo === empNo); },
    roomsOf(empNo) { return this.rooms().filter((r) => this.isMember(r.id, empNo)); },
    /** subcontractor of a room: stored, else the company most of the crew works for */
    subconOf(room) { return room.subcon || ((this.members(room.id)[0] || {}).employer || {}).en || ''; },
    updateRoom(id, d, role) {
      if (!can(role, 'groups')) return { ok: false, error: 'denied' }; const r = this.room(id); if (!r) return { ok: false, error: 'missing' };
      const e = {}; if (!TRADES.includes(d.trade)) e.trade = 'trade'; ['building', 'level', 'room', 'zone', 'subcon'].forEach((k) => { const v = String(d[k] || '').trim(); if (v.length > 60) e[k] = 'long'; });
      if (Object.keys(e).length) return { ok: false, errors: e }; const meta = { trade: d.trade, building: String(d.building || '').trim(), level: String(d.level || '').trim(), room: String(d.room || '').trim(), zone: String(d.zone || '').trim(), subcon: String(d.subcon || '').trim() };
      if (r.kind === 'custom') Object.assign(state.custom.find((c) => c.id === id), meta); else state.meta[id] = { ...roomMeta(id), ...meta };
      const ok = save(); emit({ type: 'room', id }); return { ok: true, persisted: ok };
    },
    createRoom(d, role) {
      if (!can(role, 'groups')) return { ok: false, error: 'denied' }; const e = {};
      const zh = String(d.nameZh || '').trim(), en = String(d.nameEn || '').trim(); if (!zh && !en) e.name = 'name'; if (zh.length > 40 || en.length > 60) e.name = 'long';
      if (!hr.project(d.projectKey)) e.projectKey = 'project'; const mem = (d.members || []).filter((no) => hr.emp(no)); if (!mem.length) e.members = 'members'; else if (mem.length > 30) e.members = 'many'; if (!TRADES.includes(d.trade)) e.trade = 'trade';
      if (Object.keys(e).length) return { ok: false, errors: e };
      const id = 'c:' + Date.now().toString(36); state.custom.push({ id, nameZh: zh || en, nameEn: en || zh, projectKey: d.projectKey, siteKey: d.siteKey || '', members: [...new Set(mem)], trade: d.trade, building: String(d.building || '').trim(), level: String(d.level || '').trim(), room: String(d.room || '').trim(), zone: String(d.zone || '').trim(), subcon: String(d.subcon || '').trim() });
      const ok = save(); emit({ type: 'room', id }); return { ok: true, id, persisted: ok };
    },
    setMembers(id, list, role, actorNo) {
      const r = this.room(id); if (!r || r.kind !== 'custom') return { ok: false, error: 'group' };
      if (!can(role, 'members') || (role === 'SUPERVISOR' && !r.members.includes(actorNo))) return { ok: false, error: 'denied' }; const mem = [...new Set(list.filter((no) => hr.emp(no)))]; if (!mem.length) return { ok: false, error: 'members' };
      state.custom.find((c) => c.id === id).members = mem; const ok = save(); emit({ type: 'room', id }); return { ok: true, persisted: ok };
    },
    /** who is on leave or has not shown up today, for the room header */
    attendanceToday(roomId) {
      const d = today(); let leave = 0, absent = 0, sched = 0; const now = att.now();
      this.members(roomId).forEach((e) => { const x = att.day(e.empNo, d, now); if (!x.expected) return; sched++; if (x.leaveFull) leave++; else if (x.status === 'missing' || (x.status === 'pending' && x.inState === 'missing')) absent++; });
      return { sched, leave, absent };
    },

    // ---------- messages ----------
    messages(roomId) { return state.msgs.filter((m) => m.roomId === roomId).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)); },
    message(id) { return state.msgs.find((m) => m.id === id) || null; },
    /** the last thing a person said (room notices do not count) */
    lastMessage(roomId) { const l = this.messages(roomId).filter((m) => !m.sys); return l[l.length - 1] || null; },
    unread(roomId, who) { const seen = (state.reads[who] || {})[roomId] || ''; return state.msgs.filter((m) => m.roomId === roomId && m.senderNo !== who && m.at > seen).length; },
    markRead(roomId, who) { const all = this.messages(roomId); const last = all[all.length - 1]; if (!last) return; state.reads[who] = state.reads[who] || {}; if (state.reads[who][roomId] === last.at) return; state.reads[who][roomId] = last.at; save(); emit({ type: 'read', roomId }); },
    /** the live badge on the send button */
    detect(text, tag, media) { return analyse(text, tag, { media }); },
    send(roomId, senderNo, d, actor) {
      const room = this.room(roomId); if (!room) return { ok: false, error: 'room' };
      const s = this.senderOf(senderNo); if (!can(s.role, 'send')) return { ok: false, error: 'denied' };
      if (!s.admin && !this.isMember(roomId, senderNo)) return { ok: false, error: 'member' };
      const text = String(d.text || '').trim(); if (!text && !d.media) return { ok: false, error: 'empty' }; if (text.length > 1000) return { ok: false, error: 'long' };
      const tag = d.tag && CATS.includes(d.tag) ? d.tag : '';
      const lang = d.lang || (/[一-鿿]/.test(text) ? 'zh' : /[ঀ-৿]/.test(text) ? 'bn' : /[஀-௿]/.test(text) ? 'ta' : 'en'); const m = { id: 'M' + pad(++state.n.m), roomId, senderNo, text, lang, tr: null, media: d.media ? this._cleanMedia(d.media, senderNo, roomId) : null, replyTo: this._replyOk(d.replyTo, roomId), tag, cardId: '', crawled: false, status: 'sent', at: nowStr() };
      state.msgs.push(m); trimMedia(); let card = null; if (d.autoCrawl !== false) { const r = this.crawl(m.id, actor || { role: s.role, no: senderNo }, true); card = r.card || null; }
      const ok = save(); emit({ type: 'message', id: m.id, roomId }); bus.emit('kchat.message', { id: m.id, roomId, senderNo, cardId: m.cardId });
      setTimeout(() => this._tick(m.id, 'delivered'), 900); setTimeout(() => this._tick(m.id, 'read'), 2600);
      return { ok: true, message: m, card, persisted: ok };
    },
    _tick(id, st) { const m = this.message(id); if (!m || m.status === 'read') return; m.status = st; save(); emit({ type: 'tick', id }); },
    /** run the crawler on one message: makes a card when it is actionable; holds it for a person when it cannot be read or the sender is over the hourly limit */
    crawl(id, actor, silent) {
      const m = this.message(id); if (!m) return { ok: false, error: 'missing' }; if (m.cardId) return { ok: true, card: this.card(m.cardId), already: true }; if (m.held) return { ok: true, card: null, held: m.held.why };
      const room = this.room(m.roomId); const a = analyse(m.text, m.tag, { media: m.media, room: { locText: room ? [room.building, room.level, room.zone].filter(Boolean).join(' • ') : '' } }); m.crawled = true;
      const hold = this._holdReason(m, a);
      if (hold) { m.held = { why: hold, at: nowStr() }; if (hold === 'rate') this._note({ roomId: m.roomId, id: '' }, 'held', m.senderNo, {}); if (this._model && hold !== 'rate') this.askModel(m.id); if (!silent) { save(); emit({ type: 'crawl', id }); } return { ok: true, card: null, held: hold, analysis: a }; }
      if (!a.is_kanban_item) { if (!silent) { save(); emit({ type: 'crawl', id }); } return { ok: true, card: null, analysis: a }; }
      return this._fromAnalysis(m, a, room, { silent });
    },
    /** the one place a card is made from an analysis (rules, a tap report, a person's decision in triage, or a model) */
    _fromAnalysis(m, a, room, o = {}) {
      let col = a.recommended_column; let closure = null; const photo = m.media && m.media.type === 'image';
      if (col === 'Resolved') { if (this.needsEvidenceFor(a.category) && !photo) col = 'In_Progress'; else closure = { by: m.senderNo, byRole: this.senderOf(m.senderNo).role, at: m.at, note: '', evidence: photo ? [{ ...this.evidenceOfMessage(m), name: m.media.name }] : [], flags: [], auto: true }; }
      const c = { id: 'KC-' + pad(++state.n.c), roomId: m.roomId, originMsgId: m.id, title: a.title, category: a.category, priority: a.priority, status: col, role: a.assigned_role, loc: a.location_tag, summaryKey: a.summaryKey, summary: '', assignedTo: '', ownerAt: '', by: 'ai', via: o.model ? 'model' : o.reviewedBy ? 'review' : m.tap ? 'tap' : 'rules', conf: a.conf != null ? a.conf : 1, hazard: a.hazard || m.tap || '', flags: a.conf != null && a.conf < 0.6 ? ['lowconf'] : [], esc: [], spot: null, at: m.at, upd: nowStr(), history: [{ at: nowStr(), by: o.reviewedBy || (o.model ? 'model' : 'crawler'), from: '', to: col, note: col !== a.recommended_column ? 'needs closure evidence' : '' }], permitId: '', awarded: false, closure, dupOf: '' };
      const dup = state.cards.slice().reverse().find((x) => x.roomId === c.roomId && x.category === c.category && x.status !== 'Resolved' && x.loc && c.loc && x.loc.toLowerCase() === c.loc.toLowerCase() && x.at >= mins(1440)); if (dup) c.dupOf = dup.id;
      this._permit(c, room); this._autoOwner(c); state.cards.push(c); m.cardId = c.id;
      if (!o.silent) { save(); emit({ type: 'card', id: c.id }); } bus.emit('kchat.card.created', { id: c.id, category: c.category, priority: c.priority, roomId: c.roomId }); return { ok: true, card: c, analysis: a };
    },
    /** crawl every message nobody has looked at yet (managers only); returns how many cards came out */
    consolidate(actor, roomId) {
      if (!can(actor.role, 'consolidate')) return { ok: false, error: 'denied' }; const list = state.msgs.filter((m) => !m.crawled && (!roomId || m.roomId === roomId)); let cards = 0;
      list.forEach((m) => { const r = this.crawl(m.id, actor, true); if (r.card && !r.already) cards++; }); const ok = save(); emit({ type: 'consolidate' }); return { ok: true, scanned: list.length, cards, persisted: ok };
    },
    uncrawled(roomId) { return state.msgs.filter((m) => !m.crawled && (!roomId || m.roomId === roomId)).length; },

    // ---------- cards ----------
    cards(f = {}) {
      return state.cards.filter((c) => (!f.roomId || c.roomId === f.roomId) && (!f.category || c.category === f.category) && (!f.status || c.status === f.status) && (!f.rooms || f.rooms.includes(c.roomId)) && (!f.kw || (c.title + ' ' + c.loc).toLowerCase().includes(f.kw.toLowerCase())))
        .sort((a, b) => PRI.indexOf(b.priority) - PRI.indexOf(a.priority) || b.upd.localeCompare(a.upd) || b.id.localeCompare(a.id));
    },
    card(id) { return state.cards.find((c) => c.id === id) || null; },
    openCount(roomId) { return state.cards.filter((c) => c.roomId === roomId && c.status !== 'Resolved').length; },
    /** link a Safety card of high priority to the permit running at the room's site now or tomorrow */
    _permit(c, room) {
      if (c.category !== 'Safety' || !['High', 'Critical'].includes(c.priority) || !room || !BS.ptw) return;
      const t0 = today(); const p = BS.ptw.all().find((x) => ['approved', 'active'].includes(x.status) && x.siteKey === room.siteKey && x.projectKey === room.projectKey && x.date >= t0 && x.date <= addDays(t0, 1)); if (p) c.permitId = p.id;
    },
    permitCards(permitId) { return state.cards.filter((c) => c.permitId === permitId && c.status !== 'Resolved'); },
    validateCard(d) {
      const e = {}; const t = String(d.title || '').trim(); if (t.length < 3) e.title = 'title'; else if (t.length > 60) e.title = 'title_len';
      if (!CATS.includes(d.category)) e.category = 'category'; if (!PRI.includes(d.priority)) e.priority = 'priority'; if (!this.room(d.roomId)) e.roomId = 'room'; if (!ROLES.includes(d.role)) e.role = 'role';
      if (String(d.loc || '').length > 80) e.loc = 'long'; if (String(d.summary || '').length > 300) e.summary = 'long'; return e;
    },
    createCard(d, actor) {
      if (!can(actor.role, 'create')) return { ok: false, error: 'denied' }; const e = this.validateCard(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const room = this.room(d.roomId); const c = { id: 'KC-' + pad(++state.n.c), roomId: d.roomId, originMsgId: '', title: String(d.title).trim(), category: d.category, priority: d.priority, status: COLS.includes(d.status) ? d.status : 'Pending_Review', role: d.role, loc: String(d.loc || '').trim() || [room.building, room.level, room.zone].filter(Boolean).join(' • '), summaryKey: '', summary: String(d.summary || '').trim(), assignedTo: '', ownerAt: '', esc: [], flags: [], spot: null, by: 'manual', createdBy: actor.no || actor.role, at: nowStr(), upd: nowStr(), history: [{ at: nowStr(), by: actor.no || actor.role, from: '', to: COLS.includes(d.status) ? d.status : 'Pending_Review', note: '' }], permitId: '', awarded: false };
      this._permit(c, room); this._autoOwner(c); state.cards.push(c); const ok = save(); emit({ type: 'card', id: c.id }); bus.emit('kchat.card.created', { id: c.id, category: c.category, priority: c.priority, roomId: c.roomId }); return { ok: true, card: c, persisted: ok };
    },
    /** to: a column name, or 'next' / 'prev' */
    moveCard(id, to, actor) {
      if (!can(actor.role, 'move')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' };
      const i = COLS.indexOf(c.status); const j = to === 'next' ? i + 1 : to === 'prev' ? i - 1 : COLS.indexOf(to); if (j < 0 || j >= COLS.length) return { ok: false, error: 'edge' }; if (j === i) return { ok: false, error: 'same' };
      if (COLS[j] === 'Resolved') return this.closeCard(id, { evidence: [], note: '' }, actor);
      const from = c.status; c.status = COLS[j]; c.upd = nowStr(); c.history.push({ at: nowStr(), by: actor.no || actor.role, from, to: c.status, note: from === 'Resolved' ? 'reopened' : '' });
      if (from === 'Resolved' && c.closure) { (c.reopened = c.reopened || []).push(c.closure); c.closure = null; }
      const award = 0; if (c.status === 'In_Progress' && !c.assignedTo && actor.no) { c.assignedTo = actor.no; c.ownerAt = nowStr(); } if (c.status === 'In_Progress' || from === 'Resolved') this._sys(c, from === 'Resolved' ? 'reopened' : 'started', actor);
      const ok = save(); emit({ type: 'card', id }); bus.emit('kchat.card.moved', { id, from, to: c.status }); return { ok: true, card: c, awarded: award, persisted: ok };
    },
    // ---------- closing a card: the evidence flow ----------
    settings() { return state.settings; },
    needsEvidenceFor(category) { return !!(state.settings.required && state.settings.categories[category]); },
    needsEvidence(c) { return this.needsEvidenceFor(c.category); },
    saveSettings(d, role) {
      if (!can(role, 'groups')) return { ok: false, error: 'denied' }; const e = {}; const min = Number(d.min); if (!(Number.isInteger(min) && min >= 1 && min <= 3)) e.min = 'min';
      const cats = {}; CATS.forEach((c) => { cats[c] = !!(d.categories || {})[c]; }); if (d.required && !CATS.some((c) => cats[c])) e.categories = 'none';
      const int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
      const sla = {}; PRI.forEach((p) => { const n = int((d.sla || {})[p], 1, 720); if (n == null) e['sla' + p] = 'sla'; else sla[p] = n; });
      if (!e.slaCritical && !e.slaHigh && !(sla.Critical <= sla.High)) e.slaCritical = 'sla_order'; if (!e.slaHigh && !e.slaMedium && !(sla.High <= sla.Medium)) e.slaHigh = 'sla_order'; if (!e.slaMedium && !e.slaLow && !(sla.Medium <= sla.Low)) e.slaMedium = 'sla_order';
      const ownerMin = int(d.ownerMin, 5, 240); if (ownerMin == null) e.ownerMin = 'owner'; const l1 = int((d.escalate || {}).l1, 50, 300), l2 = int((d.escalate || {}).l2, 50, 600); if (l1 == null) e.l1 = 'esc'; if (l2 == null) e.l2 = 'esc'; else if (l1 != null && l2 <= l1) e.l2 = 'esc_order';
      if (!['off', 'critical', 'high'].includes(d.capture)) e.capture = 'enum'; if (!['off', 'flag', 'block'].includes(d.geo)) e.geo = 'enum';
      const tagLimit = int(d.tagLimit, 0, 20); if (tagLimit == null) e.tagLimit = 'limit'; const rewardCap = int(d.rewardCap, 0, 20); if (rewardCap == null) e.rewardCap = 'limit'; const pairLimit = int(d.pairLimit, 0, 10); if (pairLimit == null) e.pairLimit = 'limit'; const spotRate = int(d.spotRate, 0, 100); if (spotRate == null) e.spotRate = 'rate';
      if (this.validateExtras) this.validateExtras(d, e);
      if (Object.keys(e).length) return { ok: false, errors: e };
      state.settings = { ...state.settings, ...(this.cleanExtras ? this.cleanExtras(d) : {}), required: !!d.required, categories: cats, min, noteRequired: !!d.noteRequired, safetyManagersOnly: !!d.safetyManagersOnly, noSelfClose: !!d.noSelfClose, sla, ownerMin, escalate: { l1, l2 }, capture: d.capture, geo: d.geo, tagLimit, rewardCap, pairLimit, spotRate, permitHold: !!d.permitHold }; const ok = save(); emit({ type: 'settings' }); return { ok: true, persisted: ok };
    },
    /** photos posted in the room lately: the worker's own proof of the fix can be picked as the closing evidence */
    /** only photos posted after the card was raised, and never the photo that reported the problem (that is the "before", not the proof) */
    recentPhotos(roomId, card) { return state.msgs.filter((m) => m.roomId === roomId && m.media && m.media.type === 'image' && !m.sys && !m.fwd && (!card || (m.at >= card.at && m.id !== card.originMsgId))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8); },
    /** a notice in the room, so the person who reported it sees the card was taken up, closed or reopened */
    _sys(c, type, actor) {
      const m = { id: 'M' + pad(++state.n.m), roomId: c.roomId, senderNo: actor.no || 'system', text: '', lang: 'en', tr: null, media: type === 'closed' && c.closure && c.closure.evidence.find((x) => x.type === 'image') ? { ...c.closure.evidence.find((x) => x.type === 'image'), type: 'image' } : null, sys: { type, card: c.id }, tag: '', cardId: c.id, crawled: true, status: 'read', at: nowStr() };
      state.msgs.push(m);
    },
    assignCard(id, empNo, actor) {
      if (!can(actor.role, 'move')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' }; if (empNo && !String(empNo).startsWith('acct:') && !this.eligibleOwners(c.roomId).some((e) => e.empNo === empNo)) return { ok: false, error: 'member' };
      c.assignedTo = empNo || ''; c.ownerAt = empNo ? nowStr() : ''; c.upd = nowStr(); c.history.push({ at: nowStr(), by: actor.no || actor.role, from: c.status, to: c.status, note: empNo ? 'assigned ' + empNo : 'unassigned' }); const ok = save(); emit({ type: 'card', id }); return { ok: true, persisted: ok };
    },
    updateCard(id, d, actor) {
      if (!can(actor.role, 'move')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' }; const e = this.validateCard({ ...c, ...d }); if (Object.keys(e).length) return { ok: false, errors: e };
      ['title', 'category', 'priority', 'role', 'loc', 'summary'].forEach((k) => { if (d[k] != null) c[k] = typeof d[k] === 'string' ? d[k].trim() : d[k]; }); c.upd = nowStr(); c.history.push({ at: nowStr(), by: actor.no || actor.role, from: c.status, to: c.status, note: 'edited' });
      const ok = save(); emit({ type: 'card', id }); return { ok: true, card: c, persisted: ok };
    },
    deleteCard(id, actor) {
      if (!can(actor.role, 'delete')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' }; state.cards = state.cards.filter((x) => x.id !== id); state.msgs.forEach((m) => { if (m.cardId === id) m.cardId = ''; });
      const ok = save(); emit({ type: 'card', id }); bus.emit('kchat.card.deleted', { id }); return { ok: true, persisted: ok };
    },

    // ---------- the daily EHS digest ----------
    toolbox(c) { const t = (c.title + ' ' + c.summary).toLowerCase(); if (/harness|edge|fall|安全带|临边/.test(t)) return 'harness'; if (/water|leak|electric|panel|配电箱|漏水|积水|পানি/.test(t)) return 'electrical_water'; if (/ppe|helmet|安全帽|没戴|হেলমেট/.test(t)) return 'ppe'; if (/rebar|exposed|scaffold/.test(t)) return 'edge_protection'; return 'general'; },
    digest(opts, actor) {
      if (!can(actor.role, 'digest')) return { ok: false, error: 'denied' }; const date = opts.date || today(); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) return { ok: false, error: 'date' };
      const rooms = opts.roomId ? [this.room(opts.roomId)].filter(Boolean) : this.rooms(); if (!rooms.length) return { ok: false, error: 'room' }; const ids = rooms.map((r) => r.id);
      const msgs = state.msgs.filter((m) => ids.includes(m.roomId) && m.at.slice(0, 10) === date); const created = state.cards.filter((c) => ids.includes(c.roomId) && c.at.slice(0, 10) === date);
      const open = state.cards.filter((c) => ids.includes(c.roomId) && c.status !== 'Resolved'); const resolved = state.cards.filter((c) => ids.includes(c.roomId) && c.status === 'Resolved' && c.upd.slice(0, 10) === date);
      const crit = open.filter((c) => c.category === 'Safety' && c.priority === 'Critical').length; const high = open.filter((c) => c.category === 'Safety' && c.priority === 'High').length; const other = open.filter((c) => c.category !== 'Safety').length;
      const topics = [...new Set([...open, ...created].filter((c) => c.category === 'Safety').map((c) => this.toolbox(c)))]; if (open.some((c) => c.category === 'Quality')) topics.push('qc'); if (open.some((c) => c.category === 'Material')) topics.push('material'); if (!topics.length) topics.push('general');
      let leave = 0, absent = 0; rooms.forEach((r) => { const a = this.attendanceToday(r.id); leave += a.leave; absent += a.absent; });
      const d = { id: 'DG-' + pad(++state.n.d), date, roomId: opts.roomId || '', generatedAt: nowStr(), by: actor.no || actor.role, stats: { rooms: rooms.length, messages: msgs.length, created: created.length, incidents: created.filter((c) => c.category === 'Safety').length, critical: crit, high, resolved: resolved.length, closedEv: resolved.filter((c) => c.closure && c.closure.evidence.length).length, open: open.length, index: Math.max(0, 100 - crit * 20 - high * 10 - other * 3), leave, absent, late: open.filter((c) => this.late().includes(c)).length, unowned: open.filter((c) => ['High', 'Critical'].includes(c.priority) && !c.assignedTo).length, spot: this.spotQueue().filter((c) => ids.includes(c.roomId)).length, held: this.triage().filter((m) => ids.includes(m.roomId)).length, mttc: (() => { const m = this.metrics({ days: 30, roomId: opts.roomId || '' }); return { median: m.crit.median, n: m.crit.n, target: m.crit.target }; })() },
        safety: open.filter((c) => c.category === 'Safety').map((c) => c.id), quality: open.filter((c) => c.category === 'Quality').map((c) => c.id), material: open.filter((c) => c.category === 'Material').map((c) => c.id), progress: resolved.map((c) => c.id), topics: [...new Set(topics)] };
      state.digests.unshift(d); state.digests = state.digests.slice(0, 20); const ok = save(); emit({ type: 'digest', id: d.id }); return { ok: true, digest: d, persisted: ok };
    },
    digests() { return state.digests; },
    digestById(id) { return state.digests.find((x) => x.id === id) || null; },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  K._i = { state: () => state, save, emit, trim: trimMedia, sys: (c, t, a) => K._sys(c, t, a) };
  BS.kchat = K;
})(window.BS);
