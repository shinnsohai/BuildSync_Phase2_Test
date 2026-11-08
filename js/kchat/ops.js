/* Site chat: the accountability layer on top of the chat and the Kanban cards.
   What it adds, and why (see docs/KANBAN-CHAT-TRIAL.md for the problems it answers):
   1  Ownership    every card gets a named owner (auto-picked from the appointed officer or supervisor who is not on leave), a due time by priority, and escalation when time runs out
   2  Proof        closing evidence is checked: taken after the report, not the "before" photo, not used before, camera-only for the priority the owner chooses, taken on site (site fence from Sites)
   3  Intake       a per-person limit on new cards per hour, a triage inbox for messages the crawler cannot read (other scripts, voice), reject-with-reason, a tap-driven report in four languages
   4  Rewards      hazard-star points need evidence, are capped per week, are blocked for a repeating reporter/closer pair, and a sample of closures goes to a second person who can claw them back
   5  Appointments safety officer / QC / scheduler are formal records (person, scope, dates, reference, certificate), not a guess from the trade
   6  One life cycle a Critical safety card open at a site puts that site's permits on hold (Permit to Work reads kchat.permitHoldCards)
   7  Measure      the median time from a Critical report to an evidenced closure, against the owner's target
   Everything here is rules over the stored cards; a real backend repeats each check on the server (the browser cannot be trusted with photo time or position). */
(function (BS) {
  const K = BS.kchat, I = K._i, hr = BS.hr, att = BS.att, bus = BS.bus;
  const S = () => I.state();
  const H = 3600000;
  const p2 = (n) => String(n).padStart(2, '0');
  const fmtAt = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const toMs = (at) => Date.parse(String(at).slice(0, 16) + ':00');
  const nowMs = () => Date.parse(BS.fmt.now());
  const nowStr = () => BS.fmt.now().slice(0, 16);
  const today = () => BS.fmt.now().slice(0, 10);
  const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
  const pctile = (a, q) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
  const pc = (n, d) => (d ? Math.round((n / d) * 100) : null);
  const ROLE_OF_CAT = { Safety: 'SAFETY_OFFICER', Quality: 'QUALITY_CONTROL', Material: 'SCHEDULER', Progress: 'SUPERVISOR' };
  const APPT_ROLES = ['SAFETY_OFFICER', 'QUALITY_CONTROL', 'SCHEDULER'];
  const MGR = ['KANBAN_OWNER', 'SUPERVISOR', 'SAFETY_OFFICER'];
  const wallet = () => BS.modules.api('wallet');   // optional: hazard-star points are skipped when the wallet module is absent

  /** the tap-driven report: language-free tiles, so a worker never has to write English or Chinese for the system to understand */
  const HAZARDS = [
    { id: 'height', cat: 'Safety', pri: 'High', ic: '⛑️', zh: '临边 / 没系安全带', en: 'Open edge / no harness', ta: 'விளிம்பு / பாதுகாப்பு பெல்ட் இல்லை', bn: 'খোলা কিনারা / সেফটি বেল্ট নেই' },
    { id: 'electric', cat: 'Safety', pri: 'Critical', ic: '⚡', zh: '漏电 / 电线外露 / 电箱进水', en: 'Live wire / wet electrical', ta: 'திறந்த மின்கம்பி / ஈரமான மின்சாரம்', bn: 'খোলা তার / ভেজা বিদ্যুৎ' },
    { id: 'fire', cat: 'Safety', pri: 'Critical', ic: '🔥', zh: '着火 / 动火 / 煤气味', en: 'Fire / hot work / gas smell', ta: 'தீ / வெல்டிங் / எரிவாயு வாசனை', bn: 'আগুন / ওয়েল্ডিং / গ্যাসের গন্ধ' },
    { id: 'injury', cat: 'Safety', pri: 'Critical', ic: '🚑', zh: '有人受伤', en: 'Someone is hurt', ta: 'யாருக்கோ காயம்', bn: 'কেউ আহত হয়েছে' },
    { id: 'falling', cat: 'Safety', pri: 'High', ic: '📦', zh: '物体坠落风险', en: 'Falling object risk', ta: 'பொருள் விழும் அபாயம்', bn: 'জিনিস পড়ার ঝুঁকি' },
    { id: 'ppe', cat: 'Safety', pri: 'High', ic: '🦺', zh: '没戴安全帽 / 防护', en: 'No helmet / PPE', ta: 'ஹெல்மெட் / PPE இல்லை', bn: 'হেলমেট / পিপিই নেই' },
    { id: 'trip', cat: 'Safety', pri: 'Medium', ic: '🚧', zh: '滑倒 / 绊倒 / 通道堵塞', en: 'Slip, trip, blocked path', ta: 'வழுக்கல் / தடை', bn: 'পিছল / পথ বন্ধ' },
    { id: 'lift', cat: 'Safety', pri: 'High', ic: '🏗️', zh: '吊装 / 起重问题', en: 'Crane or lifting problem', ta: 'கிரேன் / தூக்கும் பிரச்சினை', bn: 'ক্রেন / উত্তোলনের সমস্যা' },
    { id: 'quality', cat: 'Quality', pri: 'Medium', ic: '🧱', zh: '质量缺陷', en: 'Quality defect', ta: 'தரக் குறைபாடு', bn: 'মানের ত্রুটি' },
    { id: 'material', cat: 'Material', pri: 'Medium', ic: '🚚', zh: '缺料 / 到货延误', en: 'Material short or late', ta: 'பொருள் பற்றாக்குறை / தாமதம்', bn: 'মালের ঘাটতি / দেরি' },
    { id: 'done', cat: 'Progress', pri: 'Low', ic: '✅', zh: '工作完成', en: 'Work finished', ta: 'வேலை முடிந்தது', bn: 'কাজ শেষ' },
  ];
  const UNCOVERED = /[஀-௿ঀ-৿؀-ۿ฀-๿က-႟]/;

  // ---------- geometry and picture helpers ----------
  const metres = (a, b) => { const R = 6371000; const rad = (x) => (x * Math.PI) / 180; const dLa = rad(b.lat - a.lat), dLn = rad(b.lng - a.lng); const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLn / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(h))); };
  const ham = (a, b) => { let n = 0; for (let i = 0; i < 16; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } } return n; };
  const near = (a, b) => !!(a && b && /^[0-9a-f]{16}$/.test(a) && /^[0-9a-f]{16}$/.test(b) && ham(a, b) <= 6);

  Object.assign(K, {
    HAZARDS, APPT_ROLES,
    near, metres,
    /** a 64-bit average hash of an image or canvas: the same scene re-saved or re-sized stays close, so a recycled picture is caught even when the file differs */
    aHash(img) {
      try { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; const g = []; for (let i = 0; i < 64; i++) g.push(d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11); const m = g.reduce((s, v) => s + v, 0) / 64; let out = ''; for (let i = 0; i < 64; i += 4) out += ((g[i] > m ? 8 : 0) + (g[i + 1] > m ? 4 : 0) + (g[i + 2] > m ? 2 : 0) + (g[i + 3] > m ? 1 : 0)).toString(16); return out; } catch (e) { return ''; }
    },

    // =====================================================================
    // 5  APPOINTMENTS: who is a safety officer, QC or scheduler is a record
    // =====================================================================
    appointments() { return S().appointments.slice().sort((a, b) => b.from.localeCompare(a.from) || a.id.localeCompare(b.id)); },
    appointment(id) { return S().appointments.find((a) => a.id === id) || null; },
    /** active | upcoming | ended | expired | suspended (a safety officer whose Safety Officer C certificate has lapsed) */
    apptStatus(a) {
      const t0 = today(); if (a.ended) return 'ended'; if (a.to < t0) return 'expired'; if (a.from > t0) return 'upcoming';
      if (a.role === 'SAFETY_OFFICER' && !this.hasCert(a.empNo)) return 'suspended'; return 'active';
    },
    hasCert(empNo) { return hr.certsOf(empNo).some((c) => c.type === 'SAFETY-C' && hr.certStatus(c) !== 'expired'); },
    /** the chat roles a person holds today: active appointments, plus supervisor from the assignment */
    activeRoles(empNo) {
      const out = new Set(); S().appointments.forEach((a) => { if (a.empNo === empNo && this.apptStatus(a) === 'active') out.add(a.role); });
      const e = hr.emp(empNo); if (e && (e.assigns[0] || {}).role === 'supervisor') out.add('SUPERVISOR');
      return [...out].sort((a, b) => K.ROLES.indexOf(a) - K.ROLES.indexOf(b));
    },
    /** does one of the person's active appointments cover this room's project and site? */
    covers(empNo, roomId, role) {
      const r = typeof roomId === 'string' ? this.room(roomId) : roomId; if (!r) return false;
      return S().appointments.some((a) => a.empNo === empNo && (!role || a.role === role) && this.apptStatus(a) === 'active' && a.projectKey === r.projectKey && (!a.siteKey || a.siteKey === r.siteKey));
    },
    /** employee numbers appointed to a role for this room, whether or not they are in the chat room */
    appointedFor(role, room) { const r = typeof room === 'string' ? this.room(room) : room; return [...new Set(S().appointments.filter((a) => a.role === role && r && this.covers(a.empNo, r, role)).map((a) => a.empNo))]; },
    validateAppointment(d) {
      const e = {}; const emp = hr.emp(d.empNo); if (!emp || emp.status !== 'active') e.empNo = 'emp';
      if (!APPT_ROLES.includes(d.role)) e.role = 'role'; const p = hr.project(d.projectKey); if (!p) e.projectKey = 'project'; else if (d.siteKey && !(p.sites || []).includes(d.siteKey)) e.siteKey = 'site';
      const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s)); if (!ok(d.from)) e.from = 'date'; if (!ok(d.to)) e.to = 'date'; if (!e.from && !e.to) { if (d.to < d.from) e.to = 'order'; else if (Date.parse(d.to) - Date.parse(d.from) > 366 * 86400000) e.to = 'long'; }
      const ref = String(d.ref || '').trim(); if (ref.length < 3 || ref.length > 40) e.ref = 'ref';
      if (!e.empNo && !e.role && d.role === 'SAFETY_OFFICER' && !this.hasCert(d.empNo)) e.empNo = 'cert';
      if (!Object.keys(e).length && S().appointments.some((a) => a.empNo === d.empNo && a.role === d.role && a.projectKey === d.projectKey && (a.siteKey || '') === (d.siteKey || '') && !a.ended && a.to >= d.from && a.from <= d.to)) e.empNo = 'dup';
      return e;
    },
    appoint(d, actor) {
      if (!K.can(actor.role, 'groups')) return { ok: false, error: 'denied' }; const e = this.validateAppointment(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const a = { id: 'AP-' + String(++S().n.a).padStart(3, '0'), empNo: d.empNo, role: d.role, projectKey: d.projectKey, siteKey: d.siteKey || '', from: d.from, to: d.to, ref: String(d.ref).trim(), by: actor.no || actor.role, at: nowStr(), ended: '' };
      S().appointments.push(a); const ok = I.save(); I.emit({ type: 'appointment', id: a.id }); return { ok: true, appointment: a, persisted: ok };
    },
    endAppointment(id, reason, actor) {
      if (!K.can(actor.role, 'groups')) return { ok: false, error: 'denied' }; const a = this.appointment(id); if (!a || a.ended) return { ok: false, error: 'missing' }; const why = String(reason || '').trim(); if (why.length < 5 || why.length > 200) return { ok: false, error: 'reason' };
      a.ended = nowStr(); a.endedBy = actor.no || actor.role; a.endReason = why; const ok = I.save(); I.emit({ type: 'appointment', id }); return { ok: true, persisted: ok };
    },

    // =====================================================================
    // 1  OWNERSHIP, DUE TIME, ESCALATION
    // =====================================================================
    slaHours(c) { return S().settings.sla[c.priority] || 168; },
    dueAt(c) { return fmtAt(toMs(c.at) + this.slaHours(c) * H); },
    /** where a card stands against its time: ok | soon | overdue | esc2 (second escalation) | met | missed */
    sla(c) {
      const st = S().settings; const open = c.status !== 'Resolved'; const total = this.slaHours(c) * H; const end = open ? nowMs() : toMs((c.closure && c.closure.at) || c.upd); const used = end - toMs(c.at); const per = (used / total) * 100;
      const state = !open ? (used <= total ? 'met' : 'missed') : per >= st.escalate.l2 ? 'esc2' : per >= st.escalate.l1 ? 'overdue' : per >= 75 ? 'soon' : 'ok';
      const unowned = open && ['High', 'Critical'].includes(c.priority) && !c.assignedTo && nowMs() - toMs(c.at) > st.ownerMin * 60000;
      return { state, due: this.dueAt(c), hours: this.slaHours(c), leftMs: total - (nowMs() - toMs(c.at)), pct: Math.round(per), unowned };
    },
    supervisorOf(roomId) { const m = this.members(roomId).find((e) => this.roleOfEmp(e.empNo) === 'SUPERVISOR'); return m ? m.empNo : ''; },
    eligibleOwners(roomId) {
      const r = this.room(roomId); const set = new Set(); this.members(roomId).forEach((e) => { if (this.roleOfEmp(e.empNo) !== 'WORKER') set.add(e.empNo); });
      APPT_ROLES.forEach((role) => this.appointedFor(role, r).forEach((no) => set.add(no))); return [...set].map((no) => hr.emp(no)).filter(Boolean);
    },
    _onLeave(no) { try { return !!att.day(no, today(), att.now()).leaveFull; } catch (e) { return false; } },
    /** the named person for a new card: the appointed officer for its kind of problem (not on leave, fewest open cards), else a supervisor of the room */
    _autoOwner(c) {
      if (c.assignedTo) return; const room = this.room(c.roomId); if (!room) return; const role = c.role || ROLE_OF_CAT[c.category];
      let pool = APPT_ROLES.includes(role) ? this.appointedFor(role, room) : []; const sup = this.members(room.id).filter((e) => this.roleOfEmp(e.empNo) === 'SUPERVISOR').map((e) => e.empNo);
      pool = pool.filter((no) => !this._onLeave(no)); if (!pool.length) pool = sup.filter((no) => !this._onLeave(no)); if (!pool.length && c.category === 'Safety') pool = this.appointedFor('SAFETY_OFFICER', room).filter((no) => !this._onLeave(no)); if (!pool.length) return;
      const load = (no) => S().cards.filter((x) => x.status !== 'Resolved' && x.assignedTo === no).length; pool.sort((a, b) => load(a) - load(b) || a.localeCompare(b));
      c.assignedTo = pool[0]; c.ownerAt = nowStr(); c.autoOwner = true;
    },
    /** the room notice for escalations; `who` is an employee number or a role code */
    _note(c, type, no, extra) {
      const m = { id: 'M' + String(++S().n.m).padStart(4, '0'), roomId: c.roomId, senderNo: no || 'system', text: '', lang: 'en', tr: null, media: null, sys: { type, card: c.id, ...(extra || {}) }, tag: '', cardId: c.id, crawled: true, status: 'read', at: nowStr() }; S().msgs.push(m); return m;
    },
    /** run on load and every minute: escalate cards that are unowned too long or past their due time (once per level) */
    sweep() {
      let changed = false; const st = S().settings;
      S().cards.filter((c) => c.status !== 'Resolved').forEach((c) => {
        const s = this.sla(c); const have = new Set((c.esc || []).map((e) => e.why)); const need = [];
        if (s.unowned) need.push(['unowned', 1]); if (s.state === 'overdue' || s.state === 'esc2') need.push(['overdue', 1]); if (s.state === 'esc2') need.push(['overdue2', 2]);
        need.forEach(([why, level]) => {
          if (have.has(why)) return; const sup = this.supervisorOf(c.roomId); const to = level === 2 || !sup || sup === c.assignedTo ? 'KANBAN_OWNER' : sup;
          (c.esc = c.esc || []).push({ level, why, at: nowStr(), to }); c.history.push({ at: nowStr(), by: 'system', from: c.status, to: c.status, note: `escalated L${level} ${why}` });
          this._note(c, why === 'unowned' ? 'unowned' : level === 2 ? 'esc2' : 'esc1', to === 'KANBAN_OWNER' ? 'system' : to, { who: to, hours: this.slaHours(c) }); changed = true; bus.emit('kchat.card.escalated', { id: c.id, level, why });
        });
      });
      if (changed) { I.save(); I.emit({ type: 'sla' }); } return changed;
    },
    /** open cards that are past their time or unowned, for the board and digest */
    late() { return S().cards.filter((c) => c.status !== 'Resolved').filter((c) => { const s = this.sla(c); return s.unowned || s.state === 'overdue' || s.state === 'esc2'; }); },

    // =====================================================================
    // 2  PROOF
    // =====================================================================
    /** where a person is when a photo is taken. A prototype aid: "Where am I" in the persona sheet sets it (on site, 2 km away, no signal). A real app reads the phone's GPS. */
    position(no, roomId) {
      const mode = (S().demo || {}).pos || 'onsite'; if (String(no).startsWith('acct:')) return null; const room = this.room(roomId); const site = room && hr.site(room.siteKey); if (!site || mode === 'none') return null;
      if (mode === 'off') return { lat: +(site.lat + 0.018).toFixed(5), lng: +site.lng.toFixed(5), acc: 15 };
      let h = 0; String(no).split('').forEach((ch) => { h = (h * 31 + ch.charCodeAt(0)) % 997; }); const d = (site.radius * 0.35) / 111000; return { lat: +(site.lat + (h % 7 - 3) * d / 3).toFixed(5), lng: +(site.lng + (h % 5 - 2) * d / 2).toFixed(5), acc: 8 };
    },
    demoPos() { return (S().demo || {}).pos || 'onsite'; },
    setDemoPos(p) { if (!['onsite', 'off', 'none'].includes(p)) return { ok: false }; S().demo = { pos: p }; I.save(); I.emit({ type: 'demo' }); return { ok: true }; },
    needCamera(c) { const st = S().settings; return this.needsEvidence(c) && ((st.capture === 'critical' && c.priority === 'Critical') || (st.capture === 'high' && ['High', 'Critical'].includes(c.priority))); },
    evidenceOfMessage(m) { const md = (m && m.media) || {}; return { type: 'image', name: md.name, data: md.data, msgId: m.id, src: 'chat', takenAt: md.takenAt || m.at, geo: md.geo || null, hash: md.hash || '', cam: !!md.cam, tm: md.tm || null }; },
    _cleanEvidence(list, actor, roomId) {
      return (Array.isArray(list) ? list : []).slice(0, 5).map((x) => {
        const type = x.type === 'file' ? 'file' : 'image'; const name = String(x.name || '').trim().slice(0, 80); if (!name) return null;
        const m = x.msgId ? this.message(x.msgId) : null; if (x.msgId && !(m && m.media && m.media.type === 'image')) return null; if (m) return { ...this.evidenceOfMessage(m), name: m.media.name, size: 0 };
        const src = ['camera', 'gallery', 'upload'].includes(x.src) ? x.src : 'upload'; const data = type === 'image' && typeof x.data === 'string' && (x.data === '' || x.data.startsWith('data:image/')) ? x.data : '';
        const takenAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(x.takenAt || '') ? String(x.takenAt).slice(0, 16) : (src === 'camera' ? nowStr() : ''); const hash = /^[0-9a-f]{16}$/.test(x.hash || '') ? x.hash : '';
        const gi = x.geo && Number.isFinite(+x.geo.lat) && Number.isFinite(+x.geo.lng) ? { lat: +x.geo.lat, lng: +x.geo.lng, acc: Number(x.geo.acc) || 0 } : null; const geo = type === 'image' && src !== 'upload' && actor ? (src === 'camera' && gi ? gi : this.position(actor.no, roomId)) : null;
        return { type, name, data, size: Number(x.size) || 0, msgId: '', src, takenAt, geo, hash, cam: src === 'camera' && type === 'image', tm: src === 'camera' && type === 'image' ? this._cleanTm(x.tm) : null };
      }).filter(Boolean);
    },
    /** the checks on one piece of evidence: errors refuse the closing, flags are kept on the closure and send it to the spot-check list */
    proofOf(c, x) {
      const st = S().settings; const room = this.room(c.roomId); const errors = [], flags = []; const geoMode = st.geo;
      if (x.type === 'image') {
        if (x.takenAt && toMs(x.takenAt) < toMs(c.at) - 60000) errors.push('stale');
        const origin = c.originMsgId ? this.message(c.originMsgId) : null; const oh = origin && origin.media && origin.media.hash;
        if ((x.msgId && origin && x.msgId === origin.id) || (x.hash && oh && near(x.hash, oh))) errors.push('before');
        if (S().cards.some((o) => o.id !== c.id && o.closure && o.closure.evidence.some((y) => (x.msgId && y.msgId === x.msgId) || (x.data && y.data === x.data) || near(x.hash, y.hash)))) errors.push('reused');
        if (this.needCamera(c) && !x.cam) errors.push('camera');
        const tmc = st.timemark; if (tmc && tmc.on && tmc.require && !x.tm) errors.push('timemark'); if (x.tm && this.verifyMedia(x) === false) flags.push('tmbad');
        if (!x.cam && x.src === 'gallery') flags.push('gallery');
        if (geoMode !== 'off') { const site = room && hr.site(room.siteKey); if (site) { if (!x.geo) flags.push('nogeo'); else if (metres(x.geo, site) > site.radius + (x.geo.acc || 0)) flags.push('far'); } }
      } else { flags.push('unverifiable'); if (this.needCamera(c)) errors.push('camera'); }
      if (x.src === 'upload') flags.push('remote');
      return { errors, flags, geoBlock: geoMode === 'block' && flags.some((f) => f === 'nogeo' || f === 'far') };
    },
    /** what the closing dialogs show next to a picked or uploaded item */
    checkEvidence(c, list, actor) { return this._cleanEvidence(list, actor, c.roomId).map((x) => ({ x, ...this.proofOf(c, x) })); },
    validateClosure(c, d, actor) {
      const e = {}; const st = S().settings; const ev = this._cleanEvidence(d.evidence, actor, c.roomId); const note = String(d.note || '').trim(); const need = this.needsEvidence(c);
      if (note.length > 200) e.note = 'note_long'; const checks = ev.map((x) => this.proofOf(c, x));
      const hard = ['stale', 'before', 'reused']; const bad = checks.flatMap((k) => k.errors).find((x) => hard.includes(x)); if (bad) e.evidence = bad;
      if (!e.evidence && need) {
        const good = checks.filter((k) => !k.errors.length && !k.geoBlock).length;
        if (good < st.min) e.evidence = ev.length < st.min ? 'evidence' : checks.some((k) => k.errors.includes('timemark')) ? 'timemark' : checks.some((k) => k.errors.includes('camera')) ? 'camera' : checks.some((k) => k.flags.includes('far')) ? 'far' : checks.some((k) => k.geoBlock) ? 'nogeo' : 'evidence';
      }
      if (st.required && st.noteRequired && need && note.length < 5) e.note = 'note'; return e;
    },
    /** who may not close this card: '' when allowed, else the reason (safety_role | self_close | scope) */
    closeBlock(c, actor) {
      const st = S().settings; if (c.category === 'Safety' && st.safetyManagersOnly && !MGR.includes(actor.role)) return 'safety_role';
      if (APPT_ROLES.includes(actor.role) && actor.no && !String(actor.no).startsWith('acct:') && !this.covers(actor.no, c.roomId)) return 'scope';
      if (st.noSelfClose && ['High', 'Critical'].includes(c.priority) && actor.no) { const m = this.message(c.originMsgId); if (m && m.senderNo === actor.no) return 'self_close'; }
      return '';
    },
    closeCard(id, d, actor) {
      if (!K.can(actor.role, 'move')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' }; if (c.status === 'Resolved') return { ok: false, error: 'same' };
      const blk = this.closeBlock(c, actor); if (blk) return { ok: false, error: blk };
      const e = this.validateClosure(c, d, actor); if (Object.keys(e).length) return { ok: false, errors: e, error: 'evidence' };
      const ev = this._cleanEvidence(d.evidence, actor, c.roomId); const checks = ev.map((x) => this.proofOf(c, x)); ev.forEach((x, i) => { x.flags = checks[i].flags; }); const flags = [...new Set(checks.flatMap((k) => k.flags))];
      const from = c.status; c.status = 'Resolved'; c.upd = nowStr(); c.closure = { by: actor.no || actor.role, byRole: actor.role, at: nowStr(), note: String(d.note || '').trim(), evidence: ev, flags };
      c.history.push({ at: nowStr(), by: actor.no || actor.role, from, to: 'Resolved', note: ev.length ? `evidence ${ev.length}` : 'no evidence' });
      const award = this._confirm(c, from, actor); this._spot(c); I.trim(); I.sys(c, 'closed', actor);
      const ok = I.save(); I.emit({ type: 'card', id }); bus.emit('kchat.card.moved', { id, from, to: 'Resolved' }); bus.emit('kchat.card.closed', { id, evidence: ev.length }); return { ok: true, card: c, awarded: award, persisted: ok };
    },
    /** a card that is not a real problem: closed with a reason, no evidence, no points, and it counts against the reporter's record */
    rejectCard(id, reason, actor) {
      if (!K.can(actor.role, 'move')) return { ok: false, error: 'denied' }; const c = this.card(id); if (!c) return { ok: false, error: 'missing' }; if (c.status === 'Resolved') return { ok: false, error: 'same' };
      const blk = this.closeBlock(c, actor); if (blk) return { ok: false, error: blk }; const why = String(reason || '').trim(); if (why.length < 5) return { ok: false, error: 'reason' }; if (why.length > 200) return { ok: false, error: 'reason_long' };
      const from = c.status; c.status = 'Resolved'; c.upd = nowStr(); c.rejected = { by: actor.no || actor.role, at: nowStr(), reason: why }; c.closure = { by: actor.no || actor.role, byRole: actor.role, at: nowStr(), note: why, evidence: [], flags: [], rejected: true };
      c.history.push({ at: nowStr(), by: actor.no || actor.role, from, to: 'Resolved', note: 'rejected: ' + why }); this._note(c, 'rejected', actor.no || 'system', {});
      const ok = I.save(); I.emit({ type: 'card', id }); bus.emit('kchat.card.rejected', { id }); return { ok: true, card: c, persisted: ok };
    },
    rejectedBy(empNo, days) { const from = nowMs() - days * 24 * H; return S().cards.filter((c) => c.rejected && toMs(c.rejected.at) >= from && (() => { const m = this.message(c.originMsgId); return m && m.senderNo === empNo; })()).length; },
    unevidenced() { return S().cards.filter((c) => c.status === 'Resolved' && !c.rejected && this.needsEvidence(c) && !(c.closure && c.closure.evidence.length)); },

    // =====================================================================
    // 4  REWARDS AND THE SPOT-CHECK
    // =====================================================================
    reporterOf(c) { const m = c.originMsgId ? this.message(c.originMsgId) : null; return m ? m.senderNo : ''; },
    awardsIn(empNo, days) { const from = nowMs() - days * 24 * H; return S().cards.filter((c) => c.awardTo === empNo && c.awardAt && toMs(c.awardAt) >= from && !c.clawed).length; },
    pairCount(reporter, closer, days) { const from = nowMs() - days * 24 * H; return S().cards.filter((c) => c.closure && !c.closure.rejected && c.closure.by === closer && toMs(c.closure.at) >= from && this.reporterOf(c) === reporter).length; },
    _confirm(c, from, actor) {
      const st = S().settings; const note = (n) => { c.awardNote = n; c.history.push({ at: nowStr(), by: 'system', from: '', to: '', note: 'no points: ' + n }); return 0; };
      if (c.category !== 'Safety' || c.by !== 'ai' || c.awarded || !['High', 'Critical'].includes(c.priority) || !MGR.includes(actor.role) || !wallet()) return 0;
      if (this.needsEvidence(c) && !(c.closure && c.closure.evidence.length)) return 0;
      const reporter = this.reporterOf(c); if (!reporter || String(reporter).startsWith('acct:') || reporter === actor.no || MGR.includes(this.roleOfEmp(reporter))) return 0;
      const rule = wallet().rule('hazard'); if (!rule || !rule.on) return 0;
      if (st.pairLimit > 0 && this.pairCount(reporter, actor.no, 30) > st.pairLimit) { c.closure.flags.push('pair'); return note('pair'); }
      if (st.rewardCap > 0 && this.awardsIn(reporter, 7) >= st.rewardCap) return note('cap');
      if (this.rejectedBy(reporter, 30) >= 3) return note('trust');
      const r = wallet().award(reporter, { ruleId: 'hazard', points: rule.points, reason: `Hazard reported in the site chat and fixed (${c.id})` }, actor.no || 'system'); if (!r.ok) return 0;
      c.awarded = true; c.awardTo = reporter; c.awardAt = nowStr(); c.awardPts = rule.points; c.awardEntry = r.entry.id; c.history.push({ at: nowStr(), by: 'system', from: '', to: '', note: `+${rule.points} ${reporter}` }); return rule.points;
    },
    /** decide whether this closing goes to a second person: any flag on the evidence, a repeating pair, or the sampled share of safety closures */
    _spot(c) {
      const st = S().settings; if (!c.closure || c.closure.rejected || c.category !== 'Safety' || !['High', 'Critical'].includes(c.priority)) { c.spot = null; return; }
      const why = [...new Set(c.closure.flags || [])]; const n = parseInt(String(c.id).replace(/\D/g, ''), 10) || 0; if (!why.length && st.spotRate > 0 && (n * 37) % 100 < st.spotRate) why.push('sample');
      if (c.awardNote === 'pair' && !why.includes('pair')) why.push('pair'); c.spot = why.length ? { state: 'pending', why, at: nowStr() } : null;
    },
    spotQueue() { return S().cards.filter((c) => c.spot && c.spot.state === 'pending').sort((a, b) => a.spot.at.localeCompare(b.spot.at)); },
    spotBlock(c, actor) { if (!c.closure) return 'missing'; if (!MGR.includes(actor.role)) return 'denied'; if (actor.no && (actor.no === c.closure.by || actor.no === this.reporterOf(c))) return 'spot_self'; return ''; },
    /** a second person looks at the closure. A fail reopens the card and takes the points back (as far as the wallet still holds them) */
    spotCheck(id, verdict, note, actor) {
      const c = this.card(id); if (!c || !c.spot || c.spot.state !== 'pending') return { ok: false, error: 'missing' }; const b = this.spotBlock(c, actor); if (b) return { ok: false, error: b };
      const why = String(note || '').trim(); if (verdict === 'fail' && (why.length < 5 || why.length > 200)) return { ok: false, error: 'reason' }; if (verdict !== 'pass' && verdict !== 'fail') return { ok: false, error: 'verdict' };
      c.spot = { ...c.spot, state: verdict, by: actor.no || actor.role, decidedAt: nowStr(), note: why }; let clawed = 0;
      if (verdict === 'fail') {
        if (c.awarded && !c.clawed && c.awardTo && wallet()) { const p = Math.min(c.awardPts || 0, wallet().points(c.awardTo)); if (p >= 1) { const r = wallet().deduct(c.awardTo, { points: p, reason: `Spot-check failed: ${c.id}` }, actor.no || 'system'); if (r.ok) { clawed = p; c.clawed = true; } } else c.clawed = true; }
        const from = c.status; c.status = 'In_Progress'; c.upd = nowStr(); (c.reopened = c.reopened || []).push(c.closure); c.closure = null; c.history.push({ at: nowStr(), by: actor.no || actor.role, from, to: 'In_Progress', note: 'spot-check failed: ' + why }); this._note(c, 'spotfail', actor.no || 'system', {});
      } else c.history.push({ at: nowStr(), by: actor.no || actor.role, from: c.status, to: c.status, note: 'spot-check passed' });
      const ok = I.save(); I.emit({ type: 'card', id }); bus.emit('kchat.card.spot', { id, verdict }); return { ok: true, card: c, clawed, persisted: ok };
    },

    // =====================================================================
    // 3  INTAKE: limits, triage, tap-driven reports, a model for languages the rules cannot read
    // =====================================================================
    createdBy(senderNo, minutes) { const from = nowMs() - minutes * 60000; return S().cards.filter((c) => c.originMsgId && toMs(c.at) >= from && this.reporterOf(c) === senderNo).length; },
    /** why a message is not turned into a card straight away: '' | rate | lang | media */
    _holdReason(m, a) {
      const s = this.senderOf(m.senderNo); const st = S().settings;
      if (a.is_kanban_item) {
        if (s.role === 'KANBAN_OWNER' || !(st.tagLimit > 0)) return ''; if (this.createdBy(m.senderNo, 60) < st.tagLimit) return '';
        const bypass = a.category === 'Safety' && a.priority === 'Critical' && this.rejectedBy(m.senderNo, 7) < 2; return bypass ? '' : 'rate';
      }
      if (m.tap || m.tag) return ''; if (UNCOVERED.test(m.text || '')) return 'lang'; if (m.media && ['voice', 'video'].includes(m.media.type) && !(m.text || '').trim()) return 'media'; return '';
    },
    triage() { return S().msgs.filter((m) => m.held && !m.cardId && !m.held.dismissed).sort((a, b) => b.at.localeCompare(a.at)); },
    /** a person decides what a held message is: make a card (category and priority chosen from the tiles) or dismiss it */
    resolveHeld(msgId, d, actor) {
      if (!K.can(actor.role, 'consolidate')) return { ok: false, error: 'denied' }; const m = this.message(msgId); if (!m || !m.held || m.cardId || m.held.dismissed) return { ok: false, error: 'missing' };
      if (d.action === 'dismiss') { m.held.dismissed = { by: actor.no || actor.role, at: nowStr(), reason: String(d.reason || '').trim().slice(0, 200) }; const ok = I.save(); I.emit({ type: 'triage', id: msgId }); return { ok: true, persisted: ok }; }
      const h = HAZARDS.find((x) => x.id === d.hazard); if (!h) return { ok: false, error: 'hazard' }; const room = this.room(m.roomId);
      const a = { is_kanban_item: true, category: h.cat, priority: h.pri, assigned_role: ROLE_OF_CAT[h.cat], recommended_column: 'Pending_Review', location_tag: [room.building, room.level, room.zone].filter(Boolean).join(' • '), summaryKey: h.cat.toLowerCase(), title: (m.text || h.en).replace(/\s+/g, ' ').slice(0, 57), conf: 1, hazard: h.id };
      const r = this._fromAnalysis(m, a, room, { reviewedBy: actor.no || actor.role }); m.held.released = { by: actor.no || actor.role, at: nowStr() }; const ok = I.save(); I.emit({ type: 'card', id: r.card.id }); return { ok: true, card: r.card, persisted: ok };
    },
    /** the tap-driven report: pick what is wrong, optionally add a note and a photo. No keyword is read, so no language is needed. */
    reportHazard(roomId, senderNo, d, actor) {
      const room = this.room(roomId); if (!room) return { ok: false, error: 'room' }; const s = this.senderOf(senderNo); if (!K.can(s.role, 'send')) return { ok: false, error: 'denied' }; if (!s.admin && !this.isMember(roomId, senderNo)) return { ok: false, error: 'member' };
      const h = HAZARDS.find((x) => x.id === d.type); if (!h) return { ok: false, error: 'hazard' }; const note = String(d.note || '').trim(); if (note.length > 200) return { ok: false, error: 'long' };
      const text = `${h.zh} · ${h.en}${note ? ' — ' + note : ''}`; const md = d.media && d.media.type === 'image' ? this._cleanMedia(d.media, senderNo, roomId) : null;
      const m = { id: 'M' + String(++S().n.m).padStart(4, '0'), roomId, senderNo, text, lang: 'en', tr: { zh: `${h.zh}${note ? ' — ' + note : ''}`, en: `${h.en}${note ? ' — ' + note : ''}` }, media: md, tag: h.cat, tap: h.id, cardId: '', crawled: true, status: 'sent', at: nowStr() }; S().msgs.push(m); I.trim();
      const a = { is_kanban_item: true, category: h.cat, priority: h.pri, assigned_role: ROLE_OF_CAT[h.cat], recommended_column: h.id === 'done' && !this.needsEvidenceFor('Progress') ? 'Resolved' : h.cat === 'Progress' ? 'In_Progress' : 'Pending_Review', location_tag: [room.building, room.level, room.zone].filter(Boolean).join(' • '), summaryKey: h.cat.toLowerCase(), title: (text.length > 57 ? text.slice(0, 56).trimEnd() + '…' : text), conf: 1, hazard: h.id };
      const hold = this._holdReason(m, a); let card = null; if (hold) m.held = { why: hold, at: nowStr() }; else card = this._fromAnalysis(m, a, room, {}).card;
      const ok = I.save(); I.emit({ type: 'message', id: m.id, roomId }); bus.emit('kchat.message', { id: m.id, roomId, senderNo, cardId: m.cardId }); setTimeout(() => K._tick(m.id, 'delivered'), 900); setTimeout(() => K._tick(m.id, 'read'), 2600); return { ok: true, message: m, card, held: hold, persisted: ok };
    },
    _cleanMedia(md, senderNo, roomId) {
      if (!md || md.type !== 'image') return md || null; const takenAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(md.takenAt || '') ? String(md.takenAt).slice(0, 16) : nowStr();
      return { type: 'image', name: String(md.name || 'photo.jpg').slice(0, 40), data: typeof md.data === 'string' && (md.data === '' || md.data.startsWith('data:image/')) ? md.data : '', hash: /^[0-9a-f]{16}$/.test(md.hash || '') ? md.hash : '', takenAt, cam: !!md.cam, geo: md.geo && Number.isFinite(+md.geo.lat) && Number.isFinite(+md.geo.lng) ? { lat: +md.geo.lat, lng: +md.geo.lng, acc: Number(md.geo.acc) || 0 } : this.position(senderNo, roomId), tm: this._cleanTm(md.tm), marks: [] };
    },
    /** plug in a real language model: fn(text, {room, lang}) → a promise of the specification's JSON. Held messages are sent to it; its answer becomes a card with a "model" mark. */
    setModel(fn) { this._model = typeof fn === 'function' ? fn : null; return { ok: true }; },
    askModel(msgId) {
      const m = this.message(msgId); if (!m || !this._model || m.cardId) return Promise.resolve({ ok: false });
      return Promise.resolve(this._model(m.text || '', { room: this.room(m.roomId), lang: m.lang })).then((a) => {
        if (!a || !a.is_kanban_item || !K.CATS.includes(a.category) || !K.PRI.includes(a.priority)) return { ok: true, card: null }; const room = this.room(m.roomId);
        const r = this._fromAnalysis(m, { ...a, assigned_role: ROLE_OF_CAT[a.category], recommended_column: 'Pending_Review', location_tag: a.location_tag || [room.building, room.level, room.zone].filter(Boolean).join(' • '), summaryKey: a.category.toLowerCase(), title: String(a.title || m.text).slice(0, 57), conf: Number(a.conf) || 0.8 }, room, { model: true }); if (m.held) m.held.released = { by: 'model', at: nowStr() }; I.save(); I.emit({ type: 'card', id: r.card.id }); return r;
      }).catch(() => ({ ok: false }));
    },

    // =====================================================================
    // 6  ONE LIFE CYCLE with Permit to Work
    // =====================================================================
    /** open Critical safety cards at the permit's site (linked to it, or raised in a room of the same project and site) */
    permitHoldCards(p) {
      if (!S().settings.permitHold) return [];
      return S().cards.filter((c) => c.status !== 'Resolved' && c.category === 'Safety' && c.priority === 'Critical' && (c.permitId === p.id || (() => { const r = this.room(c.roomId); return !!r && r.siteKey === p.siteKey && r.projectKey === p.projectKey; })()));
    },

    // =====================================================================
    // 7  THE MEASURE
    // =====================================================================
    /** the headline: median hours from a Critical safety report to its evidenced closure, against the owner's target; plus what stands behind it */
    metrics(f = {}) {
      const st = S().settings; const days = f.days || 30; const from = nowMs() - days * 24 * H; const cards = S().cards.filter((c) => !f.roomId || c.roomId === f.roomId); const dur = (c) => (toMs(c.closure.at) - toMs(c.at)) / H;
      const closed = cards.filter((c) => c.status === 'Resolved' && c.closure && !c.closure.rejected && toMs(c.closure.at) >= from);
      const grp = (pri) => { const l = closed.filter((c) => c.category === 'Safety' && c.priority === pri); const d = l.map(dur); return { n: l.length, median: median(d), p90: pctile(d, 0.9), within: pc(l.filter((c) => dur(c) <= st.sla[pri]).length, l.length), evidenced: pc(l.filter((c) => c.closure.evidence.length).length, l.length), target: st.sla[pri] }; };
      const open = cards.filter((c) => c.status !== 'Resolved'); const late = open.filter((c) => { const s = this.sla(c); return s.unowned || ['overdue', 'esc2'].includes(s.state); });
      const owned = cards.filter((c) => c.ownerAt && toMs(c.ownerAt) >= from && ['High', 'Critical'].includes(c.priority)).map((c) => Math.max(0, (toMs(c.ownerAt) - toMs(c.at)) / 60000));
      const made = cards.filter((c) => toMs(c.at) >= from && c.by === 'ai'); const rej = cards.filter((c) => c.rejected && toMs(c.rejected.at) >= from);
      const spots = cards.filter((c) => c.spot && c.spot.state !== 'pending' && c.spot.decidedAt && toMs(c.spot.decidedAt) >= from); const paid = cards.filter((c) => c.awardAt && toMs(c.awardAt) >= from);
      const series = []; for (let i = 13; i >= 0; i--) { const day = hr.addDays(today(), -i); const l = closed.filter((c) => c.category === 'Safety' && c.priority === 'Critical' && c.closure.at.slice(0, 10) === day); series.push({ date: day, n: l.length, median: median(l.map(dur)) }); }
      const rooms = (f.roomId ? [this.room(f.roomId)] : this.rooms()).filter(Boolean).map((r) => { const cs = closed.filter((c) => c.roomId === r.id && c.category === 'Safety' && c.priority === 'Critical'); const o = open.filter((c) => c.roomId === r.id); return { id: r.id, n: cs.length, median: median(cs.map(dur)), open: o.length, late: o.filter((c) => late.includes(c)).length }; }).filter((r) => r.n || r.open);
      const owners = {}; open.forEach((c) => { const k = c.assignedTo || ''; const o = owners[k] = owners[k] || { no: k, open: 0, late: 0 }; o.open++; if (late.includes(c)) o.late++; });
      return { days, crit: grp('Critical'), high: grp('High'), open: open.length, late: late.length, unowned: open.filter((c) => ['High', 'Critical'].includes(c.priority) && !c.assignedTo).length, ownedMin: median(owned), reports: made.length, rejected: rej.length, rejectRate: pc(rej.length, made.length), spot: { pass: spots.filter((c) => c.spot.state === 'pass').length, fail: spots.filter((c) => c.spot.state === 'fail').length, pending: this.spotQueue().length }, paid: paid.length, triage: this.triage().length, series, rooms, owners: Object.values(owners).sort((a, b) => b.late - a.late || b.open - a.open) };
    },

    /** one-time upgrade of older saved data and the demo seed: appointments, owners, history for the measure */
    _ensure() {
      const s = S(); if (s.ops === 1) return false;
      s.ops = 1; s.n.a = s.n.a || 0; s.appointments = s.appointments || []; s.demo = s.demo || { pos: 'onsite' };
      if (!s.appointments.length) {
        const t0 = today(); const add = (empNo, role, projectKey, siteKey, ref) => { if (!hr.emp(empNo)) return; s.appointments.push({ id: 'AP-' + String(++s.n.a).padStart(3, '0'), empNo, role, projectKey, siteKey, from: hr.addDays(t0, -100), to: hr.addDays(t0, 265), ref, by: 'system', at: hr.addDays(t0, -100) + 'T09:00', ended: '' }); };
        add('BS10456', 'SAFETY_OFFICER', 'maritime', '', 'APL-2026-014'); add('SG-0312', 'SAFETY_OFFICER', 'raffles', '', 'APL-2026-021'); add('BS10113', 'QUALITY_CONTROL', 'maritime', 'a1', 'APL-2026-033'); add('SG-0288', 'SCHEDULER', 'raffles', '', 'APL-2026-040');
      }
      s.cards.forEach((c) => { c.esc = c.esc || []; c.flags = c.flags || []; if (c.status !== 'Resolved' && !c.assignedTo) this._autoOwner(c); if (c.assignedTo && !c.ownerAt) c.ownerAt = c.at; });
      if (!s.cards.some((c) => c.hist)) {
        const t0 = today(); const rooms = ['g:g-day1', 'g:g-night', 'g:g-m2']; const so = { 'g:g-day1': 'SG-0312', 'g:g-night': 'BS10456', 'g:g-m2': 'BS10456' };
        // [days ago, hours open, priority, title, with evidence, room index]
        [[1, 2.1, 'Critical', 'Live cable across walkway, level 2', 1, 0], [2, 3.4, 'Critical', 'Unprotected opening near lift core', 1, 0], [3, 1.6, 'Critical', 'Sparks at temporary DB, A1 level 1', 1, 1], [4, 5.8, 'Critical', 'Scaffold tie missing, east face', 1, 0], [6, 2.7, 'Critical', 'Gas cylinder not chained, B2 slab', 1, 2], [8, 3.1, 'Critical', 'Water on switch room floor', 1, 1], [9, 7.2, 'Critical', 'Crane outrigger pad cracked', 1, 2], [11, 2.4, 'Critical', 'Worker at edge without harness', 1, 0],
          [2, 9.5, 'High', 'No toe board on level 3 platform', 1, 0], [5, 13.5, 'High', 'Loose handrail, stair 2', 1, 1], [7, 6.2, 'High', 'Missing helmet signage at gate', 1, 2], [10, 10.4, 'High', 'Exposed rebar ends, zone C', 1, 2]].forEach(([ago, hrs, pri, title, ev, ri], i) => {
          const room = rooms[ri]; const start = toMs(t0 + 'T08:00') - ago * 24 * H + (i % 4) * 25 * 60000; const end = start + hrs * H; const closer = so[room];
          s.cards.push({ id: 'KC-' + String(++s.n.c).padStart(4, '0'), roomId: room, originMsgId: '', title, category: 'Safety', priority: pri, status: 'Resolved', role: 'SAFETY_OFFICER', loc: '', summaryKey: 'safety', summary: '', assignedTo: closer, ownerAt: fmtAt(start + 9 * 60000), by: 'manual', createdBy: closer, at: fmtAt(start), upd: fmtAt(end), history: [{ at: fmtAt(start), by: closer, from: '', to: 'Pending_Review', note: '' }, { at: fmtAt(end), by: closer, from: 'In_Progress', to: 'Resolved', note: 'evidence 1' }], permitId: '', awarded: false, hist: true, esc: [], flags: [],
            closure: { by: closer, byRole: 'SAFETY_OFFICER', at: fmtAt(end), note: '', evidence: ev ? [{ type: 'image', name: `fix-${i + 1}.jpg`, data: '', msgId: '', src: 'camera', takenAt: fmtAt(end - 1800000), geo: null, hash: '', cam: true, flags: [] }] : [], flags: [] } });
        });
      }
      I.save(); return true;
    },
  });

  // reset runs the seed again, so the upgrade must run again too
  const baseReset = K.reset; K.reset = function () { baseReset.call(K); K._ensure(); K.sweep(); I.save(); I.emit({ type: 'reset' }); };
  K._ensure(); K.sweep();
  setInterval(() => K.sweep(), 60000);
  window.addEventListener('storage', (e) => { if (e.key === 'bs_kchat_proto_v1') { K._ensure(); } });
})(window.BS);
