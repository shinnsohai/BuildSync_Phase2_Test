/* Site chat: the conversation layer. Reactions, replies, forwarding, pinned messages, a person's own bookmarks (action items), a worker's profile card,
   markup on photos, the timemark camera (a stamp with time, place and a verification code baked into the picture) and which issues the tap report puts first.
   Photos are never changed by a markup: the original stays as evidence, markups are separate transparent layers with an author. */
(function (BS) {
  const K = BS.kchat, I = K._i, hr = BS.hr, att = BS.att;
  const S = () => I.state();
  const nowStr = () => BS.fmt.now().slice(0, 16);
  const today = () => BS.fmt.now().slice(0, 10);
  const mgr = (role) => role && role !== 'WORKER';
  const EMOJI_RX = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]{2}|[0-9#*]️?⃣/u;
  const QUICK = ['👍', '✅', '❤️', '😂', '😮', '🙏'];
  const TPLS = ['site', 'compact', 'minimal', 'full']; const COLORS = ['amber', 'blue', 'green', 'red', 'white'];
  const FIELDS = ['time', 'date', 'address', 'coord', 'name', 'code', 'content', 'verified'];
  const MAX_PINS = 3, MAX_MARKS = 5;

  Object.assign(K, {
    TPLS, COLORS, FIELDS, QUICK, MAX_PINS,
    _canSee(roomId, no) { return String(no).startsWith('acct:') || this.isMember(roomId, no); },
    _replyOk(id, roomId) { const m = id && this.message(id); return m && m.roomId === roomId && !m.sys ? m.id : ''; },

    // ---------- reactions: one per person per message ----------
    react(msgId, emoji, no) {
      const m = this.message(msgId); if (!m || m.sys) return { ok: false, error: 'missing' }; if (!this._canSee(m.roomId, no)) return { ok: false, error: 'member' };
      const e = String(emoji || '').trim(); if (!e || e.length > 16 || !EMOJI_RX.test(e)) return { ok: false, error: 'emoji' };
      m.reactions = m.reactions || {}; const had = m.reactions[no] === e; if (had) delete m.reactions[no]; else m.reactions[no] = e;
      if (!had) { const p = S().prefs[no] = S().prefs[no] || {}; p.recent = [e, ...(p.recent || []).filter((x) => x !== e)].slice(0, 12); }
      const ok = I.save(); I.emit({ type: 'react', id: msgId }); return { ok: true, on: !had, persisted: ok };
    },
    /** [{ e, n, mine, who: [no] }] sorted by count */
    reactionsOf(m, me) {
      const by = {}; Object.entries(m.reactions || {}).forEach(([no, e]) => { (by[e] = by[e] || []).push(no); });
      return Object.entries(by).map(([e, who]) => ({ e, n: who.length, mine: who.includes(me), who })).sort((a, b) => b.n - a.n);
    },
    quickEmoji(no) { const r = (S().prefs[no] || {}).recent || []; return [...new Set([...r.slice(0, 3), ...QUICK])].slice(0, 6); },
    recentEmoji(no) { return (S().prefs[no] || {}).recent || []; },

    // ---------- forwarding ----------
    forward(msgId, roomIds, senderNo) {
      const m = this.message(msgId); if (!m || m.sys) return { ok: false, error: 'missing' }; if (!this._canSee(m.roomId, senderNo)) return { ok: false, error: 'member' };
      const targets = [...new Set(roomIds || [])].filter((id) => this.room(id)); if (!targets.length) return { ok: false, error: 'rooms' }; if (targets.length > 5) return { ok: false, error: 'many' };
      if (targets.some((id) => !this._canSee(id, senderNo))) return { ok: false, error: 'member' };
      const s = this.senderOf(senderNo); if (!K.can(s.role, 'send')) return { ok: false, error: 'denied' };
      const origin = m.fwd || { by: m.senderNo, room: m.roomId, at: m.at }; const made = [];
      targets.forEach((roomId) => {
        const c = { id: 'M' + String(++S().n.m).padStart(4, '0'), roomId, senderNo, text: m.text, lang: m.lang, tr: m.tr ? { ...m.tr } : null, media: m.media ? { ...m.media, marks: [] } : null, tag: '', cardId: '', crawled: true, status: 'sent', at: nowStr(), fwd: origin };
        S().msgs.push(c); made.push(c.id);
      }); I.trim(); const ok = I.save(); targets.forEach((roomId) => I.emit({ type: 'message', roomId })); return { ok: true, ids: made, persisted: ok };
    },

    // ---------- pins: shared by the room ----------
    pinned(roomId) { return S().msgs.filter((m) => m.roomId === roomId && m.pinned).sort((a, b) => b.pinned.at.localeCompare(a.pinned.at)); },
    canPin(role) { return mgr(role); },
    pin(msgId, actor) {
      const m = this.message(msgId); if (!m || m.sys) return { ok: false, error: 'missing' }; if (!this.canPin(actor.role)) return { ok: false, error: 'denied' }; if (!this._canSee(m.roomId, actor.no)) return { ok: false, error: 'member' };
      if (m.pinned) return { ok: false, error: 'same' }; if (this.pinned(m.roomId).length >= MAX_PINS) return { ok: false, error: 'pin_full' };
      m.pinned = { by: actor.no || actor.role, at: nowStr() }; this._note({ roomId: m.roomId, id: '' }, 'pinned', actor.no || 'system', {}); const ok = I.save(); I.emit({ type: 'pin', id: msgId }); return { ok: true, persisted: ok };
    },
    unpin(msgId, actor) {
      const m = this.message(msgId); if (!m || !m.pinned) return { ok: false, error: 'missing' }; if (!this.canPin(actor.role)) return { ok: false, error: 'denied' };
      delete m.pinned; const ok = I.save(); I.emit({ type: 'pin', id: msgId }); return { ok: true, persisted: ok };
    },

    // ---------- a person's own bookmarks: starred messages are action items ----------
    isStarred(no, msgId) { return ((S().stars[no] || []).some((x) => x.msgId === msgId)); },
    star(no, msgId) {
      const m = this.message(msgId); if (!m || m.sys) return { ok: false, error: 'missing' }; if (!this._canSee(m.roomId, no)) return { ok: false, error: 'member' };
      const l = S().stars[no] = S().stars[no] || []; const i = l.findIndex((x) => x.msgId === msgId); if (i >= 0) l.splice(i, 1); else { if (l.length >= 100) return { ok: false, error: 'star_full' }; l.unshift({ msgId, at: nowStr(), done: false }); }
      const ok = I.save(); I.emit({ type: 'star', no }); return { ok: true, on: i < 0, persisted: ok };
    },
    stars(no) { return (S().stars[no] || []).map((x) => ({ ...x, m: this.message(x.msgId) })).filter((x) => x.m && this._canSee(x.m.roomId, no)); },
    setStarDone(no, msgId, done) { const x = (S().stars[no] || []).find((y) => y.msgId === msgId); if (!x) return { ok: false, error: 'missing' }; x.done = !!done; x.doneAt = done ? nowStr() : ''; const ok = I.save(); I.emit({ type: 'star', no }); return { ok: true, persisted: ok }; },
    openStars(no) { return this.stars(no).filter((x) => !x.done).length; },

    // ---------- a person's card: what a colleague sees, and what a manager sees on top ----------
    profile(no, viewerRole) {
      if (String(no).startsWith('acct:')) { const s = this.senderOf(no); return { admin: true, no, name: s.name, nameEn: s.nameEn, role: s.role }; }
      const e = hr.emp(no); if (!e) return null; const m = mgr(viewerRole); const a = e.assigns[0] || {}; const site = hr.site(a.siteKey), prj = hr.project(a.projectKey);
      const appts = S().appointments.filter((x) => x.empNo === no && this.apptStatus(x) === 'active').map((x) => ({ role: x.role, project: prj && x.projectKey === prj.key ? prj : hr.project(x.projectKey), site: x.siteKey ? hr.site(x.siteKey) : null, to: x.to, ref: m ? x.ref : '' }));
      const certs = hr.certsOf(no).map((c) => ({ type: c.type, ty: hr.certType(c.type), number: m ? c.number : '', expiry: m ? c.expiry : '', status: hr.certStatus(c) })).filter((c) => m || c.status !== 'expired');
      const out = { admin: false, no, name: e.name, nameEn: e.nameEn, role: this.roleOfEmp(no), trades: e.trades.slice(), employer: e.employer, country: e.country, project: prj, site, rooms: this.roomsOf(no), appts, certs, joined: e.joinDate, active: e.status === 'active', manager: m };
      if (m) {
        let today0 = null; try { const x = att.day(no, today(), att.now()); today0 = x.expected ? (x.leaveFull ? 'leave' : x.status === 'missing' ? 'absent' : 'ok') : 'off'; } catch (err) { today0 = null; }
        const days30 = (n) => Date.now() - n * 86400000; const mine = S().cards.filter((c) => this.reporterOf(c) === no);
        out.phone = e.phone; out.today = today0;
        out.stats = { reports: mine.filter((c) => Date.parse(c.at + ':00') >= days30(30)).length, invalid: this.rejectedBy(no, 30), owned: S().cards.filter((c) => c.status !== 'Resolved' && c.assignedTo === no).length, points: BS.wallet ? BS.wallet.points(no) : 0 };
      }
      return out;
    },

    // ---------- markup on photos ----------
    /** a reference to a photo: 'm:<message id>' (a chat picture) or 'e:<card id>:<index>' (closing evidence) */
    mediaRef(ref) {
      const p = String(ref || '').split(':');
      if (p[0] === 'm') { const m = this.message(p[1]); return m && m.media && m.media.type === 'image' ? { media: m.media, roomId: m.roomId, msg: m } : null; }
      if (p[0] === 'e') { const c = this.card(p[1]); const x = c && c.closure && c.closure.evidence[+p[2]]; if (!x || x.type !== 'image') return null; if (x.msgId) { const m = this.message(x.msgId); if (m && m.media) return { media: m.media, roomId: c.roomId, msg: m, card: c, ev: x }; } return { media: x, roomId: c.roomId, card: c, ev: x }; }
      return null;
    },
    marksOf(ref) { const r = this.mediaRef(ref); return r ? (r.media.marks || []) : []; },
    addMark(ref, overlay, actor) {
      const r = this.mediaRef(ref); if (!r) return { ok: false, error: 'missing' }; if (!this._canSee(r.roomId, actor.no)) return { ok: false, error: 'member' };
      if (typeof overlay !== 'string' || !overlay.startsWith('data:image/png;base64,') || overlay.length > 600000) return { ok: false, error: 'overlay' };
      r.media.marks = r.media.marks || []; if (r.media.marks.length >= MAX_MARKS) return { ok: false, error: 'marks_full' };
      const mk = { id: 'MK' + String(++S().n.k || (S().n.k = 1)).padStart(3, '0'), by: actor.no || actor.role, at: nowStr(), data: overlay }; r.media.marks.push(mk); const ok = I.save(); I.emit({ type: 'mark', ref }); return { ok: true, mark: mk, persisted: ok };
    },
    removeMark(ref, markId, actor) {
      const r = this.mediaRef(ref); if (!r) return { ok: false, error: 'missing' }; const l = r.media.marks || []; const i = l.findIndex((x) => x.id === markId); if (i < 0) return { ok: false, error: 'missing' };
      if (l[i].by !== actor.no && actor.role !== 'KANBAN_OWNER') return { ok: false, error: 'denied' }; l.splice(i, 1); const ok = I.save(); I.emit({ type: 'mark', ref }); return { ok: true, persisted: ok };
    },

    // ---------- the timemark camera ----------
    photoCode(no, at, roomId, geo) {
      let h = 2166136261; const s = `${no}|${at}|${roomId}|${geo ? geo.lat + ',' + geo.lng : '-'}|bs`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return 'TM-' + h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
    },
    _cleanTm(tm) { return tm && /^TM-[0-9A-Z]{6}$/.test(tm.code || '') && TPLS.includes(tm.tpl) ? { code: tm.code, tpl: tm.tpl, by: String(tm.by || '').slice(0, 30), room: String(tm.room || '').slice(0, 30) } : null; },
    /** does the code on a picture match the time, place and person it claims? */
    verifyMedia(md) { if (!md || !md.tm) return null; return this.photoCode(md.tm.by, md.takenAt, md.tm.room, md.geo) === md.tm.code; },
    userTimemark(no) { return (S().prefs[no] || {}).tm || {}; },
    /** the settings that apply to one person: the owner's policy, then their own choice where the owner allows it */
    timemarkFor(no) {
      const st = S().settings.timemark; const pf = this.userTimemark(no);
      const on = !!st.on && (st.require || !st.userChange || pf.on !== false); const tpl = st.userChange && TPLS.includes(pf.tpl) ? pf.tpl : st.tpl;
      return { on, tpl, color: st.color, title: st.title, fields: { ...st.fields }, require: st.require, userChange: st.userChange, content: pf.content || '' };
    },
    setTimemarkPref(no, d) {
      const st = S().settings.timemark; if (!st.on) return { ok: false, error: 'off' }; const p = S().prefs[no] = S().prefs[no] || {}; const cur = p.tm = p.tm || {};
      const content = String(d.content == null ? cur.content || '' : d.content).trim(); if (content.length > 40) return { ok: false, error: 'content_long' };
      if (st.userChange) { if (d.on != null) { if (!d.on && st.require) return { ok: false, error: 'required' }; cur.on = !!d.on; } if (d.tpl != null) { if (!TPLS.includes(d.tpl)) return { ok: false, error: 'tpl' }; cur.tpl = d.tpl; } }
      cur.content = content; const ok = I.save(); I.emit({ type: 'prefs', no }); return { ok: true, persisted: ok };
    },
    /** everything the stamp prints for this person in this room at this moment */
    stampInfo(no, roomId, at) {
      const room = this.room(roomId); const site = room && hr.site(room.siteKey); const prj = room && hr.project(room.projectKey); const geo = this.position(no, roomId); const cfg = this.timemarkFor(no); const s = this.senderOf(no);
      const trade = room && room.trade ? String(room.trade).toUpperCase().replace('_', ' ') + ' WORK' : 'SITE WORK';
      return { cfg, at, title: cfg.title || (prj ? prj.en : 'BuiltSync'), address: site ? site.address : '', geo, name: s.nameEn || s.name, content: cfg.content || trade, code: this.photoCode(no, at, roomId, geo), by: no, room: roomId };
    },

    // ---------- the tap report: which issues come first ----------
    pinnedHazards() { return (S().settings.pinned || []).filter((id) => K.HAZARDS.some((h) => h.id === id)); },
    /** how often each issue was reported in this project in the last 30 days */
    hazardUsage(roomId) {
      const r = this.room(roomId); const from = Date.now() - 30 * 86400000; const use = {}; const inProject = (rid) => { const x = this.room(rid); return !(r && x && x.projectKey !== r.projectKey); };
      S().cards.forEach((c) => { if (c.hazard && Date.parse(c.at + ':00') >= from && inProject(c.roomId)) use[c.hazard] = (use[c.hazard] || 0) + 1; });
      S().msgs.forEach((m) => { if (m.tap && !m.cardId && Date.parse(m.at + ':00') >= from && inProject(m.roomId)) use[m.tap] = (use[m.tap] || 0) + 1; });
      return use;
    },
    validateExtras(d, e) {
      if (d.pinned != null) { if (!Array.isArray(d.pinned) || d.pinned.length > 6 || d.pinned.some((id) => !K.HAZARDS.some((h) => h.id === id))) e.pinned = 'pinned'; }
      const t = d.timemark; if (t) {
        if (!TPLS.includes(t.tpl)) e.tmTpl = 'enum'; if (!COLORS.includes(t.color)) e.tmColor = 'enum'; if (String(t.title || '').length > 40) e.tmTitle = 'title';
        if (t.require && !t.on) e.tmRequire = 'require';
      }
    },
    cleanExtras(d) {
      const out = {}; if (Array.isArray(d.pinned)) out.pinned = [...new Set(d.pinned)];
      const t = d.timemark; if (t) { const f = {}; FIELDS.forEach((k) => { f[k] = !!(t.fields || {})[k]; }); out.timemark = { on: !!t.on, tpl: t.tpl, userChange: !!t.userChange, require: !!t.require && !!t.on, color: t.color, title: String(t.title || '').trim(), fields: f }; }
      return out;
    },

    _ensure2() {
      const s = S(); if (s.social === 1) return false; s.social = 1; s.prefs = s.prefs || {}; s.stars = s.stars || {}; s.n.k = s.n.k || 0;
      // a few reactions, a reply and a pin so the new features have something to show
      const find = (t) => s.msgs.find((m) => m.text && m.text.startsWith(t)); const a = find('Morning. Tower A L3'); const b = find('Level 3 east corridor'); const c = find('Safety first');
      if (a && !a.reactions) a.reactions = { BS10115: '👍', 'SG-0288': '✅' }; if (b && !b.reactions) b.reactions = { 'SG-0312': '🙏' }; if (c && !c.pinned) c.pinned = { by: 'SG-0312', at: c.at };
      const ok = find('ok copy'); if (ok && a && !ok.replyTo) ok.replyTo = a.id;
      // the earlier closed cards stand for what this project has been reporting
      const kinds = ['height', 'electric', 'falling', 'ppe', 'electric', 'height', 'lift', 'trip', 'fire', 'electric', 'height', 'ppe']; let i = 0; s.cards.forEach((c) => { if (c.hist && !c.hazard) c.hazard = kinds[i++ % kinds.length]; });
      I.save(); return true;
    },
  });

  // reset runs the seed again
  const baseReset = K.reset; K.reset = function () { baseReset.call(K); K._ensure2(); };
  K._ensure2();
})(window.BS);
