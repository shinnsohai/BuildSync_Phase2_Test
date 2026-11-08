/* Worker app: 现场群聊 — the WhatsApp-style site chat (room list in three tiers, conversation with photo / voice / video tiles and quick tags) and the single-column Kanban board of each room.
   The signed-in worker is 张强 (a supervisor); a prototype switcher lets a reviewer chat as anyone, to see what each role may do. */
(function (BS) {
  const kc = BS.kchat, hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const P = { as: '', tier: 'location', collapsed: {}, room: '', col: 'Pending_Review', draft: '', tag: '', pending: null, sheet: '', trans: {}, focus: '', recording: false, close: null, rep: null, tri: '', rej: null, view: null, menu: '', fwd: null, replyTo: '', prof: '', emoTab: 'recent', marking: false, markHide: false, cam: null, camCache: {}, pinFrom: '', form: { title: '', category: 'Progress', priority: 'Medium' }, formErr: '' };
    const me = () => P.as || BS.ME.empNo;
    const COLOR = { Safety: '#EF4444', Quality: '#F59E0B', Progress: '#3B82F6', Material: '#10B981' };
    const TRADE_COLOR = { Structure: '#5058f2', Architecture: '#7a4bd8', Electrical: '#e39824', Civil: '#17795c', Piping: '#0b8fa8', Scaffolding: '#d64545', Mechanical: '#c2478a' };
    const pad = (n) => String(n).padStart(2, '0');
    const toMs = (at) => Date.parse(String(at).slice(0, 16) + ':00');
    const atOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
    const durTxt = (api, ms) => { const m = Math.max(0, Math.round(ms / 60000)); if (m < 60) return api.t('kc.dur.m', { m }); const h = Math.floor(m / 60); if (h >= 48) return api.t('kc.dur.d', { d: Math.floor(h / 24), h: h % 24 }); return api.t('kc.dur.h', { h, m: m % 60 }); };
    const whoName = (api, w) => (kc.ROLES.includes(w) ? api.t('kc.role.' + w) : nameOf(api, w));
    const actor = () => ({ role: kc.roleOfEmp(me()), no: me() });
    const nameOf = (api, no) => { const s = kc.senderOf(no); return api.lang === 'zh' ? s.name : s.nameEn; };
    const roomName = (api, r) => (api.lang === 'zh' ? r.nameZh : r.nameEn);
    const loc = (r) => [r.building, r.level, r.room, r.zone].filter(Boolean).join(' • ');
    const hm = (at) => at.slice(11, 16);
    const dayLabel = (api, at) => { const d = at.slice(0, 10); const t0 = BS.fmt.now().slice(0, 10); return d === t0 ? api.t('kc.today') : d === hr.addDays(t0, -1) ? api.t('kc.yesterday') : d; };
    const cardSummary = (api, c) => c.summary || (c.summaryKey ? api.t('kc.sum.' + c.summaryKey, { loc: c.loc }) : '');
    const tradeColor = (r) => TRADE_COLOR[r.trade] || '#6b7280';
    const initials = (api, r) => roomName(api, r).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
    const roomsOf = () => kc.roomsOf(me());
    function preview(api, m) { if (!m) return api.t('kc.noMsg'); const s = m.senderNo === me() ? api.t('kc.you') : nameOf(api, m.senderNo).split(' ')[0]; const body = m.media && !m.text ? api.t('kc.m.' + m.media.type) : (m.media ? (m.media.type === 'image' ? '📷 ' : m.media.type === 'voice' ? '🎤 ' : '🎬 ') : '') + m.text; return `${s}: ${body}`; }

    // ---------- chat list ----------
    function list(api) {
      const { t, html, icon, header } = api; const rooms = roomsOf(); const tier = P.tier;
      const keyOf = (r) => (tier === 'location' ? `${(hr.project(r.projectKey) || {}).zh ? (api.lang === 'zh' ? hr.project(r.projectKey).zh : hr.project(r.projectKey).en) : r.projectKey} › ${r.building || ''}` : tier === 'trade' ? t('kc.trade.' + (r.trade || 'Civil')) : kc.subconOf(r) || t('kc.directForce'));
      const groups = {}; rooms.forEach((r) => { (groups[keyOf(r)] = groups[keyOf(r)] || []).push(r); });
      const e = hr.emp(me()); const role = kc.roleOfEmp(me());
      return html`
        <header class="w-nav"><button type="button" class="w-back" data-act="back" aria-label="${t('common.back')}">${icon('back', 22)}</button><h1>${t('kc.title')}</h1><button type="button" class="kc-star" data-act="kc-stars" data-role="stars" aria-label="${t('kc.stars')}">${icon('star', 18)}${kc.openStars(me()) ? html`<i>${kc.openStars(me())}</i>` : ''}</button><button type="button" class="kc-me" data-act="kc-persona" aria-label="${t('kc.persona')}"><b>${(api.lang === 'zh' ? e.name : e.nameEn || e.name).slice(0, 1)}</b></button></header>
        <div class="w-body kc-list">
          <button type="button" class="kc-who" data-act="kc-persona" data-role="who"><span>${t('kc.chatAs')}</span><b>${nameOf(api, me())}</b><em>${t('kc.role.' + role)}</em>${icon('down', 14)}</button>
          <div class="w-seg kc-tiers" role="tablist">${['location', 'trade', 'subcon'].map((k) => html`<button type="button" role="tab" class="${tier === k ? 'on' : ''}" data-act="kc-tier" data-k="${k}" aria-selected="${tier === k ? 'true' : 'false'}">${t('kc.tier.' + k)}</button>`)}</div>
          ${rooms.length ? Object.entries(groups).map(([g, rs]) => html`<section class="kc-grp" data-group="${g}"><button type="button" class="kc-gh" data-act="kc-fold" data-k="${g}" aria-expanded="${P.collapsed[g] ? 'false' : 'true'}">${icon(P.collapsed[g] ? 'right' : 'down', 14)} <b>${g}</b><span>${rs.length}</span></button>
            ${P.collapsed[g] ? '' : rs.map((r) => { const last = kc.lastMessage(r.id); const un = kc.unread(r.id, me()); const open = kc.openCount(r.id); const crit = kc.cards({ roomId: r.id }).some((c) => c.status !== 'Resolved' && c.priority === 'Critical');
              return html`<button type="button" class="kc-row" data-act="kc-open" data-id="${r.id}" data-room="${r.id}"><span class="kc-av" style="background:${tradeColor(r)}">${initials(api, r)}</span><span class="kc-rt"><b>${roomName(api, r)}</b><small>${preview(api, last)}</small></span><span class="kc-rm"><small>${last ? hm(last.at) : ''}</small>${un ? html`<i class="kc-badge">${un}</i>` : ''}${open ? html`<em class="kc-open ${crit ? 'crit' : ''}">${open}</em>` : ''}</span></button>`; })}</section>`)
            : html`<div class="w-empty">${icon('users', 40)}<p>${t('kc.noRooms')}</p><small>${t('kc.noRoomsSub')}</small></div>`}
          <p class="w-note">${icon('shield', 14)} ${t('kc.listNote')}</p>
        </div>${P.sheet === 'persona' ? personaSheet(api) : ''}`;
    }
    function personaSheet(api) {
      const { t, html, icon } = api; const people = kc.people().sort((a, b) => kc.ROLES.indexOf(kc.roleOfEmp(a.empNo)) - kc.ROLES.indexOf(kc.roleOfEmp(b.empNo)) || a.empNo.localeCompare(b.empNo));
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.persona')}"><header><b>${t('kc.persona')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header><p class="w-note">${t('kc.personaNote')}</p>
        <div class="kc-posbox" data-role="pos"><small class="pp-lab">${t('kc.pos')}</small><div class="kc-opts">${['onsite', 'off', 'none'].map((k) => html`<button type="button" class="${kc.demoPos() === k ? 'on' : ''}" data-act="kc-pos" data-k="${k}" aria-pressed="${kc.demoPos() === k ? 'true' : 'false'}">${t('kc.pos.' + k)}</button>`)}</div><small class="mute">${t('kc.posNote')}</small></div>
        <div class="kc-people">${people.map((e) => { const r = kc.roleOfEmp(e.empNo); return html`<button type="button" class="kc-person ${e.empNo === me() ? 'on' : ''}" data-act="kc-as" data-e="${e.empNo}"><span><b>${api.lang === 'zh' ? e.name : e.nameEn || e.name}</b><small>${kc.roomsOf(e.empNo).map((x) => roomName(api, x)).join(' · ') || t('kc.noRooms')}</small></span><em class="kc-role ${r}">${t('kc.role.' + r)}</em></button>`; })}</div></div></div>`;
    }

    // ---------- the conversation ----------
    function sysNote(api, m) {
      const { t, html } = api; const c = m.cardId ? kc.card(m.cardId) : null; const img = m.media && m.media.type === 'image' ? m.media : null;
      return html`<div class="kc-sys" data-msg="${m.id}"><span>${t('kc.sys.' + m.sys.type, { id: m.sys.card, n: m.sys.who ? whoName(api, m.sys.who) : nameOf(api, m.senderNo) })}</span>${img ? html`<button type="button" class="kc-thumb" data-act="kc-photo" data-msg="${m.id}">${img.data ? html`<img src="${img.data}" alt="${img.name}">` : html`<i>${img.name}</i>`}</button>` : ''}${c ? html`<button type="button" class="a-link" data-act="kc-board" data-card="${c.id}">${t('kc.openCard')}</button>` : ''}<small>${hm(m.at)}</small></div>`;
    }
    const snip = (api, m) => { if (!m) return ''; const ic = m.media ? (m.media.type === 'image' ? '📷 ' : m.media.type === 'voice' ? '🎤 ' : '🎬 ') : ''; const tx = m.text || (m.media ? api.t('kc.m.' + m.media.type) : ''); return (ic + tx).slice(0, 90); };
    const nameBtn = (api, no, cls = '') => api.html`<button type="button" class="kc-name ${cls}" data-act="kc-profile" data-e="${no}">${nameOf(api, no)}</button>`;
    /** the picture with every markup layer on top; the original is never touched */
    function imgStack(api, md, ref) {
      const { html } = api; const marks = !P.markHide && md.marks ? md.marks : [];
      return html`<span class="kc-mkstack"><img class="kc-img" src="${md.data}" alt="${md.name}">${marks.map((k) => html`<img class="kc-mklayer" src="${k.data}" alt="">`)}</span>`;
    }
    function bubble(api, m, prevM) {
      const { t, html, icon } = api; if (m.sys) return sysNote(api, m); const mine = m.senderNo === me(); const s = kc.senderOf(m.senderNo); const show = !mine && (!prevM || prevM.senderNo !== m.senderNo);
      const tr = P.trans[m.id] ? (m.tr && m.tr[api.lang]) || t('kc.noTr') : '';
      const needTr = m.lang && m.lang !== api.lang && !mine && !(m.lang === 'zh' && api.lang === 'zh') && !(m.lang === 'en' && api.lang === 'en');
      const c = m.cardId ? kc.card(m.cardId) : null; const q = m.replyTo ? kc.message(m.replyTo) : null; const reacts = kc.reactionsOf(m, me());
      return html`<div class="kc-msg ${mine ? 'mine' : ''} ${P.hl === m.id ? 'hl' : ''}" data-msg="${m.id}">
        <div class="kc-bub">${show ? html`<div class="kc-sn">${nameBtn(api, m.senderNo)}${s.role !== 'WORKER' ? html` <em class="kc-role ${s.role}">${t('kc.role.' + s.role)}</em>` : ''}</div>` : ''}
          ${m.fwd ? html`<small class="kc-fwd">↪ ${t('kc.fwd')} · ${nameOf(api, m.fwd.by)}</small>` : ''}${q ? html`<button type="button" class="kc-quote" data-act="kc-goto" data-msg="${q.id}"><b>${q.senderNo === me() ? t('kc.you') : nameOf(api, q.senderNo)}</b><span>${snip(api, q)}</span></button>` : m.replyTo ? html`<div class="kc-quote gone">${t('kc.quoteGone')}</div>` : ''}
          ${m.media ? mediaTile(api, m.media, m.id) : ''}${m.text ? html`<p>${m.text}</p>` : ''}${tr ? html`<p class="kc-tr">${icon('globe', 12)} ${tr}</p>` : ''}
          <div class="kc-meta">${m.pinned ? html`<small title="${t('kc.pinned')}">📌</small>` : ''}${kc.isStarred(me(), m.id) ? html`<small title="${t('kc.stars')}">⭐</small>` : ''}${m.tag ? html`<i class="kc-tag" style="background:${COLOR[m.tag]}">#${t('kc.cat.' + m.tag)}</i>` : ''}${m.lang && m.lang !== 'en' && m.lang !== 'zh' ? html`<small class="kc-lang">${t('kc.lang.' + m.lang)}</small>` : ''}${needTr ? html`<button type="button" class="kc-trbtn" data-act="kc-trans" data-id="${m.id}">${P.trans[m.id] ? t('kc.original') : t('kc.translate')}</button>` : ''}<small>${hm(m.at)}</small>${mine ? html`<span class="kc-tick ${m.status}" aria-label="${m.status}">${m.status === 'sent' ? '✓' : '✓✓'}</span>` : ''}</div>
          ${m.held && !c && !m.held.dismissed ? html`<span class="kc-heldchip" data-role="held">${icon('warn', 12)} ${t('kc.held')} · ${t('kc.held.' + m.held.why)}</span>` : ''}${m.tap ? html`<span class="kc-viachip">${t('kc.via.tap')}</span>` : ''}
          ${c ? html`<button type="button" class="kc-cardchip" style="border-color:${COLOR[c.category]}" data-act="kc-board" data-card="${c.id}">${icon('list', 12)} <b>${c.id}</b> ${t('kc.cat.' + c.category)} · ${t('kc.pri.' + c.priority)} · ${t('kc.col.' + c.status)}</button>` : ''}
          ${reacts.length ? html`<div class="kc-reacts" data-role="reacts">${reacts.map((x) => html`<button type="button" class="kc-react ${x.mine ? 'on' : ''}" data-act="kc-react-chip" data-id="${m.id}" data-e="${x.e}" aria-pressed="${x.mine ? 'true' : 'false'}">${x.e}${x.n > 1 ? html` <b>${x.n}</b>` : ''}</button>`)}</div>` : ''}</div></div>`;
    }
    function mediaTile(api, md, msgId) {
      const { t, html, icon } = api;
      if (md.type === 'image') { const inner = md.data ? imgStack(api, md) : html`<div class="kc-ph"><span>${icon('image', 22)}</span><small>${md.name}</small></div>`; const stamp = md.tm ? html`<small class="kc-tmtag">${icon('shield', 10)} ${md.tm.code}</small>` : ''; return msgId ? html`<button type="button" class="kc-imgbtn" data-act="kc-photo" data-msg="${msgId}" aria-label="${t('kc.openPhoto')}">${inner}${stamp}${md.marks && md.marks.length ? html`<i class="kc-markdot">✎ ${md.marks.length}</i>` : ''}</button>` : inner; }
      if (md.type === 'voice') return html`<div class="kc-voice"><span class="kc-play">▶</span><i class="kc-wave"></i><small>${md.dur}</small></div>`;
      return html`<div class="kc-vid"><span class="kc-play">▶</span><small>${md.name} · ${md.dur}</small></div>`;
    }
    /** pinned messages of the room, newest first */
    function pinBar(api, r) {
      const { t, html } = api; const pins = kc.pinned(r.id); if (!pins.length) return '';
      return html`<button type="button" class="kc-pinbar" data-act="kc-pins" data-role="pinbar"><span>📌</span><span class="kc-pinx"><b>${t('kc.pinned')} ${pins.length}/${kc.MAX_PINS}</b><small>${snip(api, pins[0])}</small></span></button>`;
    }
    function sheets(api, r) { const all = { new: () => newSheet(api, r), close: () => closeSheet(api), photo: () => photoSheet(api), persona: () => personaSheet(api), rep: () => hazardSheet(api), triage: () => triageSheet(api, r), reject: () => rejectSheet(api), msgmenu: () => menuSheet(api), emoji: () => emojiSheet(api), fwd: () => fwdSheet(api), profile: () => profileSheet(api), pins: () => pinsSheet(api, r), camset: () => camSheet(api) }; return all[P.sheet] ? all[P.sheet]() : ''; }
    function room(api) {
      const { t, html, icon } = api; const r = kc.room(P.room); if (!r) return html`<header class="w-nav"><button type="button" class="w-back" data-act="back">${icon('back', 22)}</button><h1>${t('kc.title')}</h1><span></span></header><div class="w-body"><div class="w-empty"><p>${t('kc.noRooms')}</p></div></div>`;
      const msgs = kc.messages(r.id); const role = kc.roleOfEmp(me()); const at = kc.attendanceToday(r.id); const det = kc.detect(P.draft, P.tag, P.pending); let day = '';
      setTimeout(() => { const el = api.root.querySelector('.kc-msgs'); if (el) el.scrollTop = P.focus ? (api.root.querySelector(`[data-msg="${P.focus}"]`) || { offsetTop: el.scrollHeight }).offsetTop - 60 : el.scrollHeight; P.focus = ''; kc.markRead(r.id, me()); }, 0);
      return html`
        <header class="w-nav kc-bar"><button type="button" class="w-back" data-act="kc-list" aria-label="${t('common.back')}">${icon('back', 22)}</button><span class="kc-av sm" style="background:${tradeColor(r)}">${initials(api, r)}</span>
          <div class="kc-bt"><b>${roomName(api, r)}</b><small>${loc(r)}</small></div><button type="button" class="kc-boardbtn" data-act="kc-board">${icon('list', 14)} ${t('kc.board')}</button></header>
        <div class="kc-ctx"><span>${icon('users', 12)} ${t('kc.members', { n: kc.members(r.id).length })}</span><span>${t('kc.att', { l: at.leave, a: at.absent })}</span><span class="kc-roleme">${nameOf(api, me())} · ${t('kc.role.' + role)}</span></div>
        ${pinBar(api, r)}<div class="kc-msgs" role="log" aria-live="polite">${msgs.length ? msgs.map((m, i) => { const d = m.at.slice(0, 10); const sep = d !== day ? (day = d, html`<div class="kc-day"><span>${dayLabel(api, m.at)}</span></div>`) : ''; return html`${sep}${bubble(api, m, msgs[i - 1])}`; }) : html`<div class="w-empty"><p>${t('kc.noMsg')}</p></div>`}</div>
        ${composer(api, r, det)}${sheets(api, r)}`;
    }
    function composer(api, r, det) {
      const { t, html, icon } = api; const isMember = kc.isMember(r.id, me());
      if (!isMember) return html`<div class="kc-compose ro"><p class="w-note">${icon('shield', 14)} ${t('kc.notMember')}</p></div>`;
      return html`<div class="kc-compose" data-role="composer">
        ${P.pending ? html`<div class="kc-pend"><span>${P.pending.type === 'image' ? '📷' : P.pending.type === 'voice' ? '🎤' : '🎬'} ${P.pending.name}${P.pending.dur ? ' · ' + P.pending.dur : ''}${P.pending.cam ? ' · ' + t('kc.pf.cam') : ''}</span><button type="button" class="pp-x" data-act="kc-unpend" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>` : ''}
        ${P.replyTo && kc.message(P.replyTo) ? html`<div class="kc-replybar" data-role="replybar"><div><b>${t('kc.replyTo', { n: kc.message(P.replyTo).senderNo === me() ? t('kc.you') : nameOf(api, kc.message(P.replyTo).senderNo) })}</b><span>${snip(api, kc.message(P.replyTo))}</span></div><button type="button" class="pp-x" data-act="kc-unreply" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>` : ''}
        <button type="button" class="kc-repbtn" data-act="kc-rep" data-role="rep">${icon('warn', 16)} ${t('kc.rep')}</button>
        <div class="kc-tags" role="group" aria-label="${t('kc.tags')}">${kc.CATS.map((c) => html`<button type="button" class="${P.tag === c ? 'on' : ''}" style="--c:${COLOR[c]}" data-act="kc-tag" data-k="${c}" aria-pressed="${P.tag === c ? 'true' : 'false'}">#${t('kc.cat.' + c)}</button>`)}</div>
        <p class="kc-hint ${det.is_kanban_item ? 'on ' + det.category : ''}" data-role="hint">${det.is_kanban_item ? t('kc.hint', { c: t('kc.cat.' + det.category), r: t('kc.role.' + det.assigned_role), p: t('kc.pri.' + det.priority) }) : ''}</p>
        <div class="kc-row2"><input class="kc-file" type="file" id="kc-photo" accept="image/*" capture="environment" data-kc="photo"><label for="kc-photo" class="kc-ic" aria-label="${t('kc.camera')}">${icon('camera', 20)}</label><button type="button" class="kc-ic sm" data-act="kc-camset" data-role="camset" aria-label="${t('kc.cam.title')}">${icon('gear', 16)}</button>
          <input class="kc-file" type="file" id="kc-gal" accept="image/*" data-kc="photo-gal"><label for="kc-gal" class="kc-ic" aria-label="${t('kc.pf.gallery')}">${icon('image', 20)}</label>
          <button type="button" class="kc-ic ${P.recording ? 'rec' : ''}" data-act="kc-voice" aria-label="${t('kc.voice')}">${P.recording ? '■' : '🎤'}</button><button type="button" class="kc-ic" data-act="kc-video" aria-label="${t('kc.video')}">🎬</button>
          <textarea rows="1" class="kc-in" data-kc="text" placeholder="${t('kc.ph')}" aria-label="${t('kc.ph')}" maxlength="1000">${P.draft}</textarea>
          <button type="button" class="kc-send ${det.is_kanban_item ? det.category : ''}" data-act="kc-send" aria-label="${t('kc.send')}" ${P.draft.trim() || P.pending ? '' : 'disabled'}>➤${det.is_kanban_item && det.category === 'Safety' ? html`<i class="kc-haz">!</i>` : ''}</button></div></div>`;
    }

    // ---------- tap-driven report ----------
    function hazardSheet(api) {
      const { t, html, icon } = api; const R = P.rep; if (!R) return ''; const label = (h) => (api.lang === 'zh' ? h.zh : h.en);
      const pinned = kc.pinnedHazards(); const use = kc.hazardUsage(P.room); const mode = R.mode || (pinned.length ? 'pinned' : 'used'); const cats = R.cats || [];
      let list = kc.HAZARDS.filter((h) => !cats.length || cats.includes(h.cat));
      if (mode === 'pinned') list = pinned.map((id) => list.find((h) => h.id === id)).filter(Boolean); else if (mode === 'used') list = list.filter((h) => use[h.id]).sort((a, b) => use[b.id] - use[a.id]).slice(0, 9);
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.repTitle')}" data-role="report"><header><b>${t('kc.repTitle')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <div class="kc-tags kc-rcats" role="group" aria-label="${t('kc.tags')}">${kc.CATS.map((c) => html`<button type="button" class="${cats.includes(c) ? 'on' : ''}" style="--c:${COLOR[c]}" data-act="kc-rcat" data-k="${c}" aria-pressed="${cats.includes(c) ? 'true' : 'false'}">#${t('kc.cat.' + c)}</button>`)}</div>
        <div class="w-seg kc-rmodes" role="tablist">${['pinned', 'used', 'all'].map((k) => html`<button type="button" role="tab" class="${mode === k ? 'on' : ''}" data-act="kc-rmode" data-k="${k}" aria-selected="${mode === k ? 'true' : 'false'}">${t('kc.mode.' + k)}</button>`)}</div>
        <p class="w-note">${t('kc.mode.' + mode + 'Sub')}</p>
        ${list.length ? html`<div class="kc-tiles" role="group">${list.map((h) => html`<button type="button" class="kc-tile ${R.type === h.id ? 'on' : ''} ${h.pri}" data-act="kc-hz" data-k="${h.id}" aria-pressed="${R.type === h.id ? 'true' : 'false'}">${pinned.includes(h.id) ? html`<em class="kc-pinmark" title="${t('kc.pinnedByAdmin')}">📌</em>` : ''}${use[h.id] ? html`<em class="kc-usemark">×${use[h.id]}</em>` : ''}<i>${h.ic}</i><b>${label(h)}</b><small>${h.ta}</small><small>${h.bn}</small></button>`)}</div>` : html`<div class="w-empty"><p>${t('kc.mode.none')}</p></div>`}
        ${R.err ? html`<small class="w-err" data-err="hazard">${t('kc.e.' + R.err)}</small>` : ''}
        <div class="w-field"><label for="kc-rn">${t('kc.repNote')}</label><textarea id="kc-rn" class="w-input" rows="2" maxlength="200" data-kc="rep:note">${R.note}</textarea></div>
        <div class="kc-uprow"><input class="kc-file2" type="file" id="kc-rcam" accept="image/*" capture="environment" data-kc="rep-photo"><label for="kc-rcam" class="w-btn ghost kc-uplab">${icon('camera', 16)} ${t('kc.repPhoto')}</label>${R.media ? html`<span class="kc-attach">${icon('image', 12)} ${R.media.name}${R.media.tm ? ' · ' + R.media.tm.code : ''}<button type="button" class="pp-x" data-act="kc-rep-unphoto" aria-label="${t('pp.remove')}">${icon('x', 12)}</button></span>` : ''}</div>
        <button type="button" class="w-btn primary" data-act="kc-rep-send">${t('kc.repSend')}</button></div></div>`;
    }
    function menuSheet(api) {
      const { t, html, icon } = api; const m = kc.message(P.menu); if (!m) return ''; const role = kc.roleOfEmp(me()); const quick = kc.quickEmoji(me()); const mineE = (m.reactions || {})[me()];
      return html`<div class="kc-sheet-bg"><div class="kc-sheet kc-menu" role="dialog" aria-modal="true" aria-label="${t('kc.menu')}" data-role="menu">
        <div class="kc-quick" role="group">${quick.map((e) => html`<button type="button" class="${mineE === e ? 'on' : ''}" data-act="kc-react" data-e="${e}" aria-label="${e}">${e}</button>`)}<button type="button" class="more" data-act="kc-emoji-open" data-role="more" aria-label="${t('kc.emoji.more')}">＋</button></div>
        <p class="kc-menuprev"><b>${m.senderNo === me() ? t('kc.you') : nameOf(api, m.senderNo)}</b> ${snip(api, m)}</p>
        <div class="kc-acts2">
          <button type="button" data-act="kc-reply" data-role="reply"><i>↩</i>${t('kc.reply')}</button>
          <button type="button" data-act="kc-fwd" data-role="forward"><i>➡</i>${t('kc.forward')}</button>
          ${kc.canPin(role) ? html`<button type="button" data-act="kc-pin" data-role="pin"><i>📌</i>${m.pinned ? t('kc.unpin') : t('kc.pin')}</button>` : ''}
          <button type="button" data-act="kc-star" data-role="star"><i>${kc.isStarred(me(), m.id) ? '★' : '☆'}</i>${kc.isStarred(me(), m.id) ? t('kc.unstar') : t('kc.star')}</button>
          ${m.text ? html`<button type="button" data-act="kc-copy" data-role="copy"><i>⧉</i>${t('kc.copy')}</button>` : ''}</div></div></div>`;
    }
    function emojiSheet(api) {
      const { t, html, icon } = api; const groups = BS.kchatEmoji; const rec = kc.recentEmoji(me()); const tab = P.emoTab; const g = groups.find((x) => x.id === tab); const list = tab === 'recent' ? rec : g ? g.list : [];
      return html`<div class="kc-sheet-bg"><div class="kc-sheet kc-emoji" role="dialog" aria-modal="true" aria-label="${t('kc.emoji.title')}" data-role="emoji"><header><b>${t('kc.emoji.title')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <div class="kc-etabs" role="tablist"><button type="button" role="tab" class="${tab === 'recent' ? 'on' : ''}" data-act="kc-etab" data-k="recent" title="${t('kc.emoji.recent')}">🕘</button>${groups.map((x) => html`<button type="button" role="tab" class="${tab === x.id ? 'on' : ''}" data-act="kc-etab" data-k="${x.id}" title="${api.lang === 'zh' ? x.zh : x.en}">${x.ic}</button>`)}</div>
        <small class="pp-lab">${tab === 'recent' ? t('kc.emoji.recent') : api.lang === 'zh' ? g.zh : g.en}</small>
        <div class="kc-egrid" role="group">${list.length ? list.map((e) => html`<button type="button" data-act="kc-react" data-e="${e}" aria-label="${e}">${e}</button>`) : html`<p class="w-note">${t('kc.emoji.none')}</p>`}</div></div></div>`;
    }
    function fwdSheet(api) {
      const { t, html, icon } = api; const F = P.fwd; const m = F && kc.message(F.id); if (!m) return ''; const rooms = roomsOf();
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.forward')}" data-role="fwd"><header><b>${t('kc.forward')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <p class="kc-menuprev">${snip(api, m)}</p><p class="w-note">${t('kc.fwdSub')}</p>
        <div class="kc-people">${rooms.map((r) => html`<button type="button" class="kc-person ${F.sel.includes(r.id) ? 'on' : ''}" data-act="kc-fwd-pick" data-id="${r.id}" aria-pressed="${F.sel.includes(r.id) ? 'true' : 'false'}"><span><b>${roomName(api, r)}</b><small>${loc(r)}</small></span><em class="kc-role">${F.sel.includes(r.id) ? '✓' : ''}</em></button>`)}</div>
        <button type="button" class="w-btn primary" data-act="kc-fwd-send" ${F.sel.length ? '' : 'disabled'}>${t('kc.fwdSend', { n: F.sel.length })}</button></div></div>`;
    }
    function pinsSheet(api, r) {
      const { t, html, icon } = api; const pins = kc.pinned(r.id); const role = kc.roleOfEmp(me());
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.pinned')}" data-role="pins"><header><b>${t('kc.pinned')} ${pins.length}/${kc.MAX_PINS}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        ${pins.length ? pins.map((m) => html`<div class="kc-held" data-msg="${m.id}"><p><b>${nameOf(api, m.senderNo)}</b> · ${m.at.slice(5, 16).replace('T', ' ')}</p><p>${snip(api, m)}</p><small class="mute">${t('kc.pinnedBy', { n: nameOf(api, m.pinned.by) })}</small><div class="kc-acts"><button type="button" class="w-btn ghost" data-act="kc-goto" data-msg="${m.id}">${t('kc.goto')}</button>${kc.canPin(role) ? html`<button type="button" class="w-btn ghost bad" data-act="kc-unpin" data-id="${m.id}">${t('kc.unpin')}</button>` : ''}</div></div>`) : html`<div class="w-empty"><p>${t('kc.noPins')}</p></div>`}</div></div>`;
    }
    function profileSheet(api) {
      const { t, html, icon } = api; const p = kc.profile(P.prof, kc.roleOfEmp(me())); if (!p) return ''; const z = api.lang === 'zh'; const nm = z ? p.name : p.nameEn || p.name; const sub = z ? p.nameEn : p.name;
      const row = (k, v) => (v ? html`<div class="kc-prow"><small>${k}</small><b>${v}</b></div>` : '');
      const L = (o) => (o ? (z ? o.zh : o.en) : '');
      const body = p.admin ? html`<p class="w-note">${t('kc.prof.admin')}</p>` : html`
        <div class="kc-prows">${row(t('kc.prof.project'), [L(p.project), L(p.site)].filter(Boolean).join(' › '))}${row(t('kc.prof.trade'), p.trades.join(' · '))}${row(t('kc.prof.employer'), L(p.employer))}${row(t('kc.prof.country'), String(p.country || '').toUpperCase())}${row(t('kc.prof.joined'), p.joined)}${row(t('kc.prof.rooms'), p.rooms.map((r) => roomName(api, r)).join(' · '))}</div>
        ${p.appts.length ? html`<small class="pp-lab">${t('kc.prof.appts')}</small><div class="kc-prows">${p.appts.map((a) => html`<div class="kc-prow"><small>${t('kc.role.' + a.role)}</small><b>${L(a.project)}${a.site ? ' › ' + L(a.site) : ''} · ${t('kc.prof.until', { d: a.to })}${a.ref ? ' · ' + a.ref : ''}</b></div>`)}</div>` : ''}
        ${p.certs.length ? html`<small class="pp-lab">${t('kc.prof.certs')}</small><div class="kc-pfs">${p.certs.map((c) => html`<i class="kc-pfc ${c.status === 'expired' ? 'bad' : c.status === 'soon' ? 'warn' : 'ok'}" title="${c.number}">${L(c.ty) || c.type}${c.expiry ? ' · ' + c.expiry : ''}</i>`)}</div>` : ''}
        ${p.manager ? html`<div class="kc-prows" data-role="mgrview"><small class="pp-lab">${t('kc.prof.mgr')}</small>${row(t('kc.prof.phone'), p.phone)}${p.today ? row(t('kc.prof.today'), t('kc.prof.t.' + p.today)) : ''}${row(t('kc.prof.stats'), t('kc.prof.statsv', p.stats))}</div>` : ''}`;
      return html`<div class="kc-sheet-bg"><div class="kc-sheet kc-prof" role="dialog" aria-modal="true" aria-label="${nm}" data-role="profile"><header><b>${t('kc.prof.title')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <div class="kc-phead"><span class="kc-av lg">${nm.slice(0, 1)}</span><div><b>${nm}</b><small>${sub} · ${p.no}</small><em class="kc-role ${p.role}">${t('kc.role.' + p.role)}</em></div></div>${body}</div></div>`;
    }
    /** the timemark camera: switch it on or off, pick the template, say what the work is */
    function camSheet(api) {
      const { t, html, icon } = api; const st = kc.settings().timemark; const C = P.cam; if (!C) return ''; const cfg = kc.timemarkFor(me()); const at = BS.fmt.now().slice(0, 16); const info0 = kc.stampInfo(me(), P.room, at); const ui = BS.kchatUI;
      const prev = (tpl) => { const key = [tpl, st.color, JSON.stringify(st.fields), st.title, C.content, P.room].join('|'); return P.camCache[key] || (P.camCache[key] = ui.sample({ ...info0, content: C.content || info0.content, cfg: { ...info0.cfg, tpl, color: st.color, fields: st.fields, on: true } }, 360, 480)); };
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.cam.title')}" data-role="camsheet"><header><b>${t('kc.cam.title')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        ${!st.on ? html`<p class="kc-need">${t('kc.cam.off')}</p>` : html`
          <p class="w-note">${st.require ? t('kc.cam.required') : st.userChange ? t('kc.cam.sub') : t('kc.cam.locked')}</p>
          <label class="p-check"><input type="checkbox" data-kc="cam:on" ${C.on ? 'checked' : ''} ${st.userChange && !st.require ? '' : 'disabled'}> <b>${t('kc.cam.on')}</b></label>
          <small class="pp-lab">${t('kc.cam.tpl')}</small>
          <div class="kc-tpls" role="radiogroup">${kc.TPLS.map((k) => html`<label class="kc-tpl ${C.tpl === k ? 'on' : ''}"><input type="radio" name="kc-tpl" data-kc="cam:tpl" value="${k}" ${C.tpl === k ? 'checked' : ''} ${st.userChange ? '' : 'disabled'}><img src="${prev(k)}" alt=""><b>${t('kc.tpl.' + k)}</b></label>`)}</div>
          <div class="w-field"><label for="kc-cc">${t('kc.cam.content')}</label><input id="kc-cc" class="w-input" maxlength="40" data-kc="cam:content" value="${C.content}" placeholder="${info0.content}">${C.err ? html`<small class="w-err" data-err="content">${t('kc.cam.e.' + C.err)}</small>` : ''}</div>
          <button type="button" class="w-btn primary" data-act="kc-cam-save">${t('kc.cam.save')}</button>`}</div></div>`;
    }
    function starsScreen(api) {
      const { t, html, icon, header } = api; const all = kc.stars(me()); const open = all.filter((x) => !x.done); const done = all.filter((x) => x.done);
      const item = (x) => html`<div class="kc-held ${x.done ? 'done' : ''}" data-msg="${x.m.id}"><label class="kc-todo"><input type="checkbox" data-act="kc-star-done" data-id="${x.m.id}" ${x.done ? 'checked' : ''}><span><b>${nameBtn(api, x.m.senderNo)}</b> · ${roomName(api, kc.room(x.m.roomId))} · ${x.m.at.slice(5, 16).replace('T', ' ')}</span></label><p>${snip(api, x.m)}</p><div class="kc-acts"><button type="button" class="w-btn ghost" data-act="kc-viewchat" data-msg="${x.m.id}">${t('kc.goto')}</button><button type="button" class="w-btn ghost bad" data-act="kc-star-rm" data-id="${x.m.id}">${t('kc.unstar')}</button></div></div>`;
      return html`
        <header class="w-nav"><button type="button" class="w-back" data-act="back" aria-label="${t('common.back')}">${icon('back', 22)}</button><h1>${t('kc.stars')}</h1><span></span></header>
        <div class="w-body kc-list" data-role="starlist"><p class="w-note">${t('kc.starsSub')}</p>
          ${open.length ? open.map(item) : html`<div class="w-empty">${icon('star', 36)}<p>${t('kc.noStars')}</p></div>`}
          ${done.length ? html`<small class="pp-lab">${t('kc.starsDone', { n: done.length })}</small>${done.map(item)}` : ''}</div>${P.sheet === 'profile' ? profileSheet(api) : ''}`;
    }
    /** one viewer for every picture: the original with its markup layers, who marked it, and whether the timemark code is genuine */
    function photoSheet(api) {
      const { t, html, icon } = api; const V = P.view; if (!V) return ''; const R = V.ref ? kc.mediaRef(V.ref) : null; const x = R ? R.media : V.md; if (!x) return '';
      const canMark = !!(R && x.data && kc._canSee(R.roomId, me())); const verdict = x.tm ? kc.verifyMedia(x) : null;
      if (P.marking && canMark) setTimeout(() => mountMarkup(api, x), 0);
      return html`<div class="kc-sheet-bg"><div class="kc-sheet kc-viewer" role="dialog" aria-modal="true" aria-label="${x.name}" data-role="viewer"><header><b>${x.name}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        ${x.data ? (P.marking ? html`<div id="kc-mkhost" class="kc-mkhost"></div>` : html`<div class="kc-mkview">${imgStack(api, x)}</div>`) : html`<div class="kc-ph"><span>${icon('image', 22)}</span><small>${x.name} · ${t('kc.noPixels')}</small></div>`}
        ${x.tm ? html`<p class="kc-tmline ${verdict ? 'ok' : 'bad'}" data-role="tmline">${icon('shield', 13)} ${verdict ? t('kc.tm.ok', { c: x.tm.code }) : t('kc.tm.bad', { c: x.tm.code })}${x.takenAt ? ' · ' + x.takenAt.replace('T', ' ') : ''}</p>` : x.takenAt ? html`<p class="kc-tmline">${icon('clock', 13)} ${t('kc.pf.age', { t: x.takenAt.replace('T', ' ') })}</p>` : ''}
        ${!P.marking ? html`<div class="kc-acts">${canMark ? html`<button type="button" class="w-btn primary" data-act="kc-mark" data-role="mark">✎ ${t('kc.mark')}</button>` : ''}${x.marks && x.marks.length ? html`<button type="button" class="w-btn ghost" data-act="kc-mark-hide">${P.markHide ? t('kc.marks.show') : t('kc.marks.hide')}</button>` : ''}</div>
          ${x.marks && x.marks.length ? html`<div class="kc-marklist" data-role="marklist"><small class="pp-lab">${t('kc.marks', { n: x.marks.length })}</small>${x.marks.map((k) => html`<div class="kc-markrow"><span>${nameBtn(api, k.by)} <small class="mute">${k.at.slice(5, 16).replace('T', ' ')}</small></span>${k.by === me() || kc.roleOfEmp(me()) === 'KANBAN_OWNER' ? html`<button type="button" class="pp-x" data-act="kc-mark-rm" data-id="${k.id}" aria-label="${t('pp.remove')}">${icon('trash', 14)}</button>` : ''}</div>`)}</div>` : ''}` : ''}</div></div>`;
    }
    function mountMarkup(api, x) {
      const h = api.root.querySelector('#kc-mkhost'); if (!h || h.dataset.m) return; h.dataset.m = '1'; const ref = P.view.ref;
      BS.kchatUI.mountMarkup(h, { src: x.data, marks: x.marks || [], labels: { undo: api.t('kc.mk.undo'), clear: api.t('kc.mk.clear'), save: api.t('kc.mk.save'), cancel: api.t('kc.mk.cancel') },
        onSave: (png) => { const r = kc.addMark(ref, png, actor()); P.marking = false; api.render(); api.toast(r.ok ? api.t('kc.mk.saved') : api.t('kc.e.' + (r.error === 'marks_full' ? 'marks_full' : 'denied')), r.ok ? 'ok' : 'warn'); }, onCancel: () => { P.marking = false; api.render(); } });
    }
    // ---------- held messages: a person decides ----------
    function triageSheet(api, r) {
      const { t, html, icon } = api; const list = kc.triage().filter((m) => m.roomId === r.id); const label = (h) => (api.lang === 'zh' ? h.zh : h.en);
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.triage')}" data-role="triage"><header><b>${t('kc.triage')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header><p class="w-note">${t('kc.triage.sub')}</p>
        ${list.length ? list.map((m) => html`<div class="kc-held" data-msg="${m.id}"><p><b>${nameOf(api, m.senderNo)}</b> · ${hm(m.at)}</p><p>${m.media ? mediaTile(api, m.media) : ''}${m.text || ''}</p><small class="kc-heldchip">${t('kc.held.' + m.held.why)}</small>
          ${P.tri === m.id ? html`<div class="kc-tiles sm">${kc.HAZARDS.map((h) => html`<button type="button" class="kc-tile ${h.pri}" data-act="kc-tri-make" data-id="${m.id}" data-k="${h.id}"><i>${h.ic}</i><b>${label(h)}</b></button>`)}</div>` : html`<div class="kc-acts"><button type="button" class="w-btn primary" data-act="kc-tri-pick" data-id="${m.id}">${t('kc.triage.make')}</button><button type="button" class="w-btn ghost" data-act="kc-tri-skip" data-id="${m.id}">${t('kc.triage.dismiss')}</button></div>`}</div>`) : html`<div class="w-empty"><p>${t('kc.triage.none')}</p></div>`}</div></div>`;
    }
    function rejectSheet(api) {
      const { t, html, icon } = api; const R = P.rej; const c = R && kc.card(R.id); if (!c) return '';
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.rejectTitle')}" data-role="reject"><header><b>${t('kc.rejectTitle')} · ${c.id}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <p class="kc-need">${c.title}</p><div class="w-field ${R.err ? 'err' : ''}"><label for="kc-rj">${t('kc.rejectWhy')}</label><textarea id="kc-rj" class="w-input" rows="3" maxlength="200" data-kc="rej:reason">${R.reason}</textarea>${R.err ? html`<small class="w-err" data-err="reason">${t('kc.e.' + R.err)}</small>` : ''}</div>
        <button type="button" class="w-btn primary" data-act="kc-reject-ok">${t('kc.rejectBtn')}</button></div></div>`;
    }

    // ---------- the board ----------
    function board(api) {
      const { t, html, icon } = api; const r = kc.room(P.room); if (!r) return room(api); const role = kc.roleOfEmp(me()); const canMove = kc.can(role, 'move'); const all = kc.cards({ roomId: r.id });
      if (P.focus && kc.card(P.focus)) P.col = kc.card(P.focus).status; const cards = all.filter((c) => c.status === P.col);
      return html`
        <header class="w-nav kc-bar"><button type="button" class="w-back" data-act="kc-room" aria-label="${t('common.back')}">${icon('back', 22)}</button><span class="kc-av sm" style="background:${tradeColor(r)}">${initials(api, r)}</span><div class="kc-bt"><b>${roomName(api, r)}</b><small>${t('kc.kanban')}</small></div>${canMove ? html`<button type="button" class="kc-boardbtn" data-act="kc-new">${icon('plus', 14)} ${t('kc.newCard')}</button>` : ''}</header>
        <div class="kc-cols" role="tablist">${kc.COLS.map((c) => { const n = all.filter((x) => x.status === c).length; const crit = c !== 'Resolved' && all.some((x) => x.status === c && x.category === 'Safety' && ['High', 'Critical'].includes(x.priority)); return html`<button type="button" role="tab" class="${P.col === c ? 'on' : ''}" data-act="kc-col" data-k="${c}" aria-selected="${P.col === c ? 'true' : 'false'}">${t('kc.col.' + c)} <i class="${crit ? 'pulse' : ''}">${n}</i></button>`; })}</div>
        <div class="w-body kc-cards">${kc.can(role, 'consolidate') && kc.triage().some((m) => m.roomId === r.id) ? html`<button type="button" class="kc-triagebar" data-act="kc-triage" data-role="triagebar">${icon('warn', 14)} ${t('kca.triage.banner', { n: kc.triage().filter((m) => m.roomId === r.id).length })}</button>` : ''}${!canMove ? html`<p class="w-note info" data-role="ro">${icon('shield', 14)} ${t('kc.readOnly')}</p>` : ''}
          ${cards.length ? cards.map((c) => cardView(api, c, canMove)) : html`<div class="w-empty">${icon('list', 36)}<p>${t('kc.noCards')}</p></div>`}</div>${sheets(api, r)}`;
    }
    function cardView(api, c, canMove) {
      const { t, html, icon } = api; const i = kc.COLS.indexOf(c.status); const p = c.permitId && BS.ptw ? BS.ptw.get(c.permitId) : null; const open = c.status !== 'Resolved'; const role = kc.roleOfEmp(me());
      return html`<article class="kc-card ${P.focus === c.id ? 'focus' : ''}" data-card="${c.id}" style="border-left-color:${COLOR[c.category]}"><div class="kc-ch"><span class="kc-cat" style="background:${COLOR[c.category]}">${t('kc.cat.' + c.category)}</span><span class="kc-pri ${c.priority}">${t('kc.pri.' + c.priority)}</span><small>${c.id}</small></div>
        <b class="kc-ct">${c.title}</b><p class="kc-cl">${icon('pin', 12)} ${c.loc}</p><p class="kc-cs">${cardSummary(api, c)}</p>
        <div class="kc-cf"><span class="kc-role ${c.role}">${t('kc.role.' + c.role)}</span><small>${c.by === 'ai' ? t('kc.byAi') : t('kc.byManual')} · ${c.upd.slice(5, 16).replace('T', ' ')}</small></div>
        ${cardExtras(api, c)}
        ${p ? html`<p class="kc-permit">${icon('warn', 12)} ${t('kc.permit', { id: p.id })}</p>` : ''}${c.awarded && !c.clawed ? html`<p class="kc-permit ok">${icon('check', 12)} ${t('kc.awarded')}</p>` : ''}${c.awardNote ? html`<p class="kc-permit">${icon('warn', 12)} ${t('kc.award.' + c.awardNote)}</p>` : ''}
        <div class="kc-acts">${c.originMsgId ? html`<button type="button" class="w-btn ghost" data-act="kc-viewchat" data-msg="${c.originMsgId}">${t('kc.viewChat')}</button>` : ''}
          ${canMove && open && !c.assignedTo && role !== 'WORKER' ? html`<button type="button" class="w-btn ghost" data-act="kc-own" data-id="${c.id}" data-role="own">${t('kc.own')}</button>` : ''}
          ${canMove && open ? html`<button type="button" class="w-btn ghost bad" data-act="kc-reject" data-id="${c.id}">${t('kc.reject')}</button>` : ''}
          ${canMove ? html`<button type="button" class="w-btn ghost" data-act="kc-move" data-id="${c.id}" data-d="prev" ${i === 0 ? 'disabled' : ''}>← ${t('kc.prev')}</button><button type="button" class="w-btn primary" data-act="kc-move" data-id="${c.id}" data-d="next" ${i === kc.COLS.length - 1 ? 'disabled' : ''}>${t('kc.next')} ➜</button>` : ''}</div></article>`;
    }
    const ageH = (c) => Math.max(0, Math.round((Date.parse(BS.fmt.now()) - Date.parse(c.at + ':00')) / 3600000));
    const FLAGCHIPS = ['far', 'nogeo', 'remote', 'gallery', 'unverifiable', 'pair', 'sample', 'tmbad'];
    function cardExtras(api, c) {
      const { t, html, icon } = api; const cl = c.closure; const open = c.status !== 'Resolved'; const s = kc.sla(c); const worst = (c.esc || []).reduce((n, e) => Math.max(n, e.level), 0);
      const slaChip = open ? html`<span class="kc-chip ${s.state === 'overdue' || s.state === 'esc2' ? 'bad' : s.state === 'soon' ? 'warn' : ''}" data-role="sla" data-state="${s.state}">${icon('clock', 11)} ${t('kc.sla.' + s.state, { t: durTxt(api, Math.abs(s.leftMs)) })}</span>` : (cl && !c.rejected ? html`<span class="kc-chip ${s.state === 'missed' ? 'warn' : 'ok'}" data-role="sla" data-state="${s.state}">${icon('clock', 11)} ${t('kc.sla.' + s.state, { t: durTxt(api, toMs(cl.at) - toMs(c.at)) })}</span>` : '');
      const own = c.assignedTo ? html`<span class="kc-chip" data-role="owner">${icon('user', 11)} ${t('kc.owner', { n: nameOf(api, c.assignedTo) })}${c.autoOwner ? html` <small>(${t('kc.auto')})</small>` : ''}</span>` : open ? html`<span class="kc-chip ${s.unowned ? 'bad' : 'warn'}" data-role="owner">${t('kc.sla.unowned')}</span>` : '';
      const sp = c.spot ? html`<span class="kc-chip ${c.spot.state === 'fail' ? 'bad' : c.spot.state === 'pass' ? 'ok' : 'warn'}" data-role="spot">${t('kc.spot.' + c.spot.state)}</span>` : '';
      return html`<div class="kc-xtra">${own}${slaChip}${worst ? html`<span class="kc-chip bad" data-role="esc">${t('kc.escLvl', { n: worst })}</span>` : ''}${c.dupOf ? html`<span class="kc-chip warn">${t('kc.dup', { id: c.dupOf })}</span>` : ''}${open && kc.needsEvidence(c) ? html`<span class="kc-chip">${icon('camera', 11)} ${t('kc.needsEv')}${kc.needCamera(c) ? ' · ' + t('kc.pf.cam') : ''}</span>` : ''}${(c.flags || []).includes('lowconf') ? html`<span class="kc-chip warn">${t('kc.flag.lowconf')}</span>` : ''}${c.via === 'model' ? html`<span class="kc-chip">${t('kc.flag.model')}</span>` : c.via === 'tap' ? html`<span class="kc-chip">${t('kc.via.tap')}</span>` : c.via === 'review' ? html`<span class="kc-chip">${t('kc.via.review')}</span>` : ''}${sp}</div>
        ${cl && cl.rejected ? html`<div class="kc-closure rej" data-role="closure"><b>${icon('x', 12)} ${t('kc.rejectedChip', { r: cl.note })}</b><small>${nameOf(api, cl.by)} · ${cl.at.slice(5, 16).replace('T', ' ')}</small></div>` : cl ? html`<div class="kc-closure" data-role="closure"><b>${icon('check', 12)} ${t('kc.closedBy', { n: nameOf(api, cl.by), d: cl.at.slice(5, 16).replace('T', ' ') })}</b>${cl.note ? html`<p>${cl.note}</p>` : ''}${cl.evidence.length ? html`<div class="kc-evs">${cl.evidence.map((x, k) => (x.type === 'image' ? html`<button type="button" class="kc-thumb" data-act="kc-ev" data-card="${c.id}" data-k="${k}">${x.data ? html`<img src="${x.data}" alt="${x.name}">` : html`<i>${x.name}</i>`}</button>` : html`<span class="kc-file">${icon('file', 12)} ${x.name}</span>`))}</div>` : html`<p class="kc-noev">${t('kc.noEvidence')}</p>`}${(cl.flags || []).filter((f) => FLAGCHIPS.includes(f)).length ? html`<div class="kc-pfs">${[...new Set(cl.flags)].filter((f) => FLAGCHIPS.includes(f)).map((f) => html`<i class="kc-pfc warn">${t('kc.pf.' + f)}</i>`)}</div>` : ''}</div>` : c.status === 'Resolved' ? html`<p class="kc-noev">${t('kc.legacy')}</p>` : ''}`;
    }
    /** the proof line under one picked or uploaded item: where it came from, whether it was taken on site, and why it would be refused */
    function proofLine(api, c, k) {
      const { t, html } = api; const x = k.x; const room = kc.room(c.roomId); const site = room && hr.site(room.siteKey); const chips = [];
      chips.push(html`<i class="kc-pfc ${x.cam ? 'ok' : ''}">${t(x.cam ? 'kc.pf.cam' : x.src === 'chat' ? 'kc.pf.chat' : x.src === 'gallery' ? 'kc.pf.gallery' : 'kc.pf.remote')}</i>`); if (x.tm) chips.push(html`<i class="kc-pfc ${k.flags.includes('tmbad') ? 'bad' : 'ok'}">${t(k.flags.includes('tmbad') ? 'kc.pf.tmbad' : 'kc.pf.tm')} ${x.tm.code}</i>`);
      if (x.type === 'image' && x.geo && site && !k.flags.includes('far')) chips.push(html`<i class="kc-pfc ok">${t('kc.pf.in', { m: kc.metres(x.geo, site) })}</i>`);
      k.flags.filter((f) => ['far', 'nogeo', 'unverifiable'].includes(f)).forEach((f) => chips.push(html`<i class="kc-pfc warn">${t('kc.pf.' + f)}</i>`));
      return html`<div class="kc-pfs">${chips}</div>${k.errors.map((e) => html`<small class="w-err" data-err="${e}">${t('kc.e.' + e)}</small>`)}`;
    }
    function closeSheet(api) {
      const { t, html, icon } = api; const C = P.close; const c = kc.card(C.id); if (!c) return ''; const need = kc.needsEvidence(c); const st = kc.settings(); const photos = kc.recentPhotos(c.roomId, c); const E = C.err || {}; const cam = kc.needCamera(c);
      const evs = [...C.picks.map((id) => ({ type: 'image', name: (kc.message(id) || { media: {} }).media.name || 'photo', msgId: id })), ...C.up]; const keys = [...C.picks.map((id) => 'm:' + id), ...C.up.map((x, k) => 'u:' + k)]; const chk = evs.length ? kc.checkEvidence(c, evs, actor()) : [];
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.closeTitle')}" data-role="close"><header><b>${t('kc.closeTitle')} · ${c.id}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <p class="kc-need ${need ? 'req' : ''}">${need ? t('kc.evReq', { n: st.min }) : t('kc.evOpt')}${cam ? ' ' + t('kc.needCam') : ''}</p>
        <p class="kc-done" data-role="done"><b>${t('kc.doneWhen')}:</b> ${t('kc.done.' + c.category)}</p>
        ${photos.length ? html`<div><small class="pp-lab">${t('kc.fromChat')}</small><div class="kc-evs">${photos.map((m) => html`<button type="button" class="kc-thumb pick ${C.picks.includes(m.id) ? 'on' : ''}" data-act="kc-pick" data-msg="${m.id}" aria-pressed="${C.picks.includes(m.id) ? 'true' : 'false'}">${m.media.data ? html`<img src="${m.media.data}" alt="${m.media.name}">` : html`<i>${m.media.name}</i>`}</button>`)}</div></div>` : ''}
        <div><small class="pp-lab">${t('kc.upload')}</small><div class="kc-uprow"><input class="kc-file2" type="file" id="kc-evcam" accept="image/*" capture="environment" data-kc="evcam"><label for="kc-evcam" class="w-btn ghost kc-uplab">${icon('camera', 16)} ${t('kc.takePhoto')}</label><input class="kc-file2" type="file" id="kc-evin" accept="image/*,.pdf,.doc,.docx" data-kc="evfile"><label for="kc-evin" class="w-btn ghost kc-uplab">${icon('file', 16)} ${t('kc.pickFile')}</label></div></div>
        ${evs.length ? html`<div class="kc-evlist" data-role="attached">${evs.map((x, i) => html`<div class="kc-evitem"><span class="kc-attach">${x.type === 'file' ? icon('file', 12) : icon('image', 12)} ${x.name}<button type="button" class="pp-x" data-act="kc-unattach" data-key="${keys[i]}" aria-label="${t('pp.remove')}">${icon('x', 12)}</button></span>${chk[i] ? proofLine(api, c, chk[i]) : ''}</div>`)}</div>` : ''}
        ${E.evidence ? html`<small class="w-err" data-err="evidence">${t('kc.e.' + E.evidence, { n: st.min })}</small>` : ''}
        <div class="w-field ${E.note ? 'err' : ''}"><label for="kc-cn">${t('kc.closeNote')}${st.required && st.noteRequired && need ? ' *' : ''}</label><textarea id="kc-cn" class="w-input" rows="2" maxlength="200" data-kc="close:note" placeholder="${t('kc.closeNotePh')}">${C.note}</textarea>${E.note ? html`<small class="w-err" data-err="note">${t('kc.e.' + E.note)}</small>` : ''}</div>
        ${C.fail ? html`<small class="w-err" data-err="role">${t('kc.e.' + C.fail)}</small>` : ''}<button type="button" class="w-btn primary" data-act="kc-close-ok">${t('kc.closeBtn')}</button></div></div>`;
    }
    function newSheet(api, r) {
      const { t, html, icon } = api; const f = P.form;
      return html`<div class="kc-sheet-bg"><div class="kc-sheet" role="dialog" aria-modal="true" aria-label="${t('kc.newCard')}"><header><b>${t('kc.newCard')}</b><button type="button" class="pp-x" data-act="kc-sheet-close" aria-label="${t('common.close')}">${icon('x', 16)}</button></header>
        <div class="w-field ${P.formErr ? 'err' : ''}"><label for="kc-nt">${t('kc.f.title')}</label><input id="kc-nt" class="w-input" data-kc="form:title" maxlength="60" value="${f.title}">${P.formErr ? html`<small class="w-err">${t('kc.e.' + P.formErr)}</small>` : ''}</div>
        <div class="w-field"><label>${t('kc.f.cat')}</label><div class="kc-opts">${kc.CATS.map((c) => html`<button type="button" class="${f.category === c ? 'on' : ''}" style="--c:${COLOR[c]}" data-act="kc-fcat" data-k="${c}">${t('kc.cat.' + c)}</button>`)}</div></div>
        <div class="w-field"><label>${t('kc.f.pri')}</label><div class="kc-opts">${kc.PRI.map((c) => html`<button type="button" class="${f.priority === c ? 'on' : ''}" data-act="kc-fpri" data-k="${c}">${t('kc.pri.' + c)}</button>`)}</div></div>
        <button type="button" class="w-btn primary" data-act="kc-create">${t('kc.create')}</button></div></div>`;
    }

    // ---------- media and sending ----------
    /** the stamp for a picture taken now in this room, or null when the timemark camera is off for this person */
    function stampCtx() { const cfg = kc.timemarkFor(me()); if (!cfg.on || !P.room) return null; return kc.stampInfo(me(), P.room, BS.fmt.now().slice(0, 16)); }
    function loadImage(api, file, done, info) {
      const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const hash = kc.aHash(im); const r = BS.kchatUI.process(im, info, !!info); done({ data: r.data, hash, tm: info ? { code: info.code, tpl: info.cfg.tpl, by: info.by, room: info.room } : null, geo: info ? info.geo : null, takenAt: info ? info.at : '' }); }; im.onerror = () => api.toast(api.t('kc.e.photo'), 'warn'); im.src = fr.result; }; fr.readAsDataURL(file);
    }
    /** cam: taken with the in-app camera (stamped, time is now); otherwise the file's own date stands in for the time the picture was taken */
    function readPhoto(api, file, cam) {
      if (!file) return; if (file.size > 4 * 1024 * 1024 || !/^image\//.test(file.type)) { api.toast(api.t('kc.e.photo'), 'warn'); return; }
      loadImage(api, file, (r) => { P.pending = { type: 'image', name: file.name.slice(0, 40), data: r.data, hash: r.hash, cam, tm: r.tm, geo: r.geo, takenAt: cam ? (r.takenAt || BS.fmt.now().slice(0, 16)) : atOf(file.lastModified || Date.now()) }; api.render(); }, cam ? stampCtx() : null);
    }
    function readRepPhoto(api, file) {
      if (!file || !P.rep) return; if (file.size > 4 * 1024 * 1024 || !/^image\//.test(file.type)) { api.toast(api.t('kc.e.photo'), 'warn'); return; }
      loadImage(api, file, (r) => { P.rep.media = { type: 'image', name: file.name.slice(0, 40), data: r.data, hash: r.hash, cam: true, tm: r.tm, geo: r.geo, takenAt: r.takenAt || BS.fmt.now().slice(0, 16) }; api.render(); }, stampCtx());
    }
    function readEvidence(api, file, src) {
      if (!file || !P.close) return; if (file.size > 4 * 1024 * 1024) { P.close.err = { evidence: 'evidence' }; api.toast(api.t('kc.e.file'), 'warn'); api.render(); return; }
      if (!/^image\//.test(file.type)) { P.close.up.push({ type: 'file', name: file.name.slice(0, 80), size: file.size, src: 'gallery' }); P.close.err = {}; api.render(); return; }
      loadImage(api, file, (r) => { P.close.up.push({ type: 'image', name: file.name.slice(0, 80), data: r.data, hash: r.hash, src, tm: r.tm, geo: src === 'camera' ? r.geo : null, takenAt: src === 'camera' ? (r.takenAt || BS.fmt.now().slice(0, 16)) : atOf(file.lastModified || Date.now()) }); P.close.err = {}; api.render(); }, src === 'camera' ? stampCtx() : null);
    }
    function refresh(api) {
      const r = kc.room(P.room); if (!r) return; const det = kc.detect(P.draft, P.tag, P.pending); const hint = api.root.querySelector('[data-role=hint]'); const send = api.root.querySelector('.kc-send');
      if (hint) { hint.className = 'kc-hint ' + (det.is_kanban_item ? 'on ' + det.category : ''); hint.textContent = det.is_kanban_item ? api.t('kc.hint', { c: api.t('kc.cat.' + det.category), r: api.t('kc.role.' + det.assigned_role), p: api.t('kc.pri.' + det.priority) }) : ''; }
      if (send) { send.disabled = !(P.draft.trim() || P.pending); send.className = 'kc-send ' + (det.is_kanban_item ? det.category : ''); }
    }
    function sendNow(api) {
      const lang = /[一-鿿]/.test(P.draft) ? 'zh' : /[ঀ-৿]/.test(P.draft) ? 'bn' : /[஀-௿]/.test(P.draft) ? 'ta' : 'en';
      const r = kc.send(P.room, me(), { text: P.draft, tag: P.tag, media: P.pending, lang, replyTo: P.replyTo }, actor());
      if (r.ok && r.message.held) { P.draft = ''; P.tag = ''; P.pending = null; P.replyTo = ''; api.render(); api.toast(api.t('kc.held.' + r.message.held.why), 'warn'); return; }
      if (!r.ok) { api.toast(api.t('kc.e.' + r.error), 'warn'); return; }
      P.draft = ''; P.tag = ''; P.pending = null; P.replyTo = ''; api.render(); if (r.card) api.toast(api.t('kc.t.card', { id: r.card.id, c: api.t('kc.cat.' + r.card.category) }), r.card.category === 'Safety' ? 'warn' : 'ok');
    }

    return {
      stores: [kc, hr, BS.att],
      screens: { kc: list, 'kc-room': room, 'kc-board': board, 'kc-stars': starsScreen },
      init(api) {
        api.root.addEventListener('input', (e) => {
          const k = e.target.dataset && e.target.dataset.kc; if (!k) return;
          if (k === 'text') { P.draft = e.target.value; e.target.style.height = 'auto'; e.target.style.height = Math.min(96, e.target.scrollHeight) + 'px'; refresh(api); } else if (k === 'form:title') P.form.title = e.target.value; else if (k === 'close:note' && P.close) P.close.note = e.target.value; else if (k === 'rep:note' && P.rep) P.rep.note = e.target.value; else if (k === 'cam:content' && P.cam) P.cam.content = e.target.value; else if (k === 'rej:reason' && P.rej) P.rej.reason = e.target.value;
        });
        api.root.addEventListener('click', (e) => { if (e.target.classList && e.target.classList.contains('kc-sheet-bg')) { P.sheet = ''; api.render(); } });
        api.root.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.kc; if (k === 'photo' || k === 'photo-gal') { readPhoto(api, e.target.files && e.target.files[0], k === 'photo'); e.target.value = ''; } else if (k === 'rep-photo') { readRepPhoto(api, e.target.files && e.target.files[0]); e.target.value = ''; } else if (k === 'evfile' || k === 'evcam') { readEvidence(api, e.target.files && e.target.files[0], k === 'evcam' ? 'camera' : 'gallery'); e.target.value = ''; } });
        // long press (or right click) opens the message menu; a swipe to the left replies
        let g = null; let quiet = 0; const vib = () => { try { navigator.vibrate && navigator.vibrate(15); } catch (err) { /* no vibration */ } };
        const openMenu = (id) => { const m = kc.message(id); if (!m || m.sys) return; vib(); P.menu = id; P.sheet = 'msgmenu'; api.render(); };
        api.root.addEventListener('pointerdown', (e) => {
          const el = e.target.closest && e.target.closest('.kc-msg'); if (!el || (e.button && e.button > 0)) return;
          g = { id: el.dataset.msg, x: e.clientX, y: e.clientY, dx: 0, el, swipe: false, fired: false, timer: setTimeout(() => { if (g && !g.swipe) { g.fired = true; openMenu(g.id); } }, 450) };
        });
        api.root.addEventListener('pointermove', (e) => {
          if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y;
          if (!g.swipe && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) { clearTimeout(g.timer); if (Math.abs(dx) > Math.abs(dy) && dx < 0) g.swipe = true; else { g = null; return; } }
          if (g.swipe) { g.dx = Math.max(-96, dx); const b = g.el.querySelector('.kc-bub'); if (b) { b.style.transition = 'none'; b.style.transform = `translateX(${g.dx}px)`; } g.el.classList.toggle('arm', g.dx <= -60); }
        });
        const endG = () => {
          if (!g) return; clearTimeout(g.timer); const b = g.el.querySelector('.kc-bub'); if (b) { b.style.transition = 'transform .16s'; b.style.transform = ''; } g.el.classList.remove('arm');
          if (g.swipe && g.dx <= -60) { vib(); P.replyTo = g.id; setTimeout(() => { api.render(); const i = api.root.querySelector('[data-kc=text]'); if (i) i.focus(); }, 0); }
          if (g.fired || g.swipe) quiet = Date.now() + 200; g = null;
        };
        api.root.addEventListener('pointerup', endG); api.root.addEventListener('pointercancel', endG);
        api.root.addEventListener('click', (e) => { if (Date.now() < quiet) { e.stopPropagation(); e.preventDefault(); } }, true);
        api.root.addEventListener('contextmenu', (e) => { const el = e.target.closest && e.target.closest('.kc-msg'); if (el) { e.preventDefault(); openMenu(el.dataset.msg); } });
        api.root.addEventListener('change', (e) => {
          const k = e.target.dataset && e.target.dataset.kc; if (!P.cam) return;
          if (k === 'cam:on') P.cam.on = e.target.checked; else if (k === 'cam:tpl') { P.cam.tpl = e.target.value; api.render(); }
        });
        api.root.addEventListener('keydown', (e) => { if (e.target.dataset && e.target.dataset.kc === 'text' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (P.draft.trim() || P.pending) sendNow(api); } if (e.key === 'Escape' && P.sheet) { P.sheet = ''; api.render(); } });
      },
      onStore(evt, api) { const v = api.root.querySelector('.w-view'); if (!v || !/s-kc/.test(v.className)) return; if (P.marking) return; if (evt && evt.type === 'tick') { const el = api.root.querySelector(`[data-msg="${evt.id}"] .kc-tick`); const m = kc.message(evt.id); if (el && m) { el.className = 'kc-tick ' + m.status; el.textContent = m.status === 'sent' ? '✓' : '✓✓'; } return; } if (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.kc === 'text') { const keep = P.draft; api.render(); const i = api.root.querySelector('[data-kc=text]'); if (i) { i.focus(); i.setSelectionRange(keep.length, keep.length); } return; } api.render(); },
      onClick(a, b, api) {
        switch (a) {
          case 'open-kc': P.room = ''; P.sheet = ''; api.go([{ s: 'home' }, { s: 'kc' }]); return true;
          case 'kc-tier': P.tier = b.dataset.k; api.render(); return true;
          case 'kc-fold': P.collapsed[b.dataset.k] = !P.collapsed[b.dataset.k]; api.render(); return true;
          case 'kc-open': P.room = b.dataset.id; P.sheet = ''; api.push('kc-room', {}); return true;
          case 'kc-list': P.sheet = ''; api.go([{ s: 'home' }, { s: 'kc' }]); return true;
          case 'kc-room': P.sheet = ''; api.go([{ s: 'home' }, { s: 'kc' }, { s: 'kc-room' }]); return true;
          case 'kc-board': P.sheet = ''; if (b.dataset.card) { P.focus = b.dataset.card; } api.go([{ s: 'home' }, { s: 'kc' }, { s: 'kc-room' }, { s: 'kc-board' }]); return true;
          case 'kc-col': P.col = b.dataset.k; api.render(); return true;
          case 'kc-persona': P.sheet = 'persona'; api.render(); return true;
          case 'kc-sheet-close': P.sheet = ''; P.marking = false; api.render(); return true;
          case 'kc-as': P.as = b.dataset.e === BS.ME.empNo ? '' : b.dataset.e; P.sheet = ''; P.pending = null; P.draft = ''; P.tag = ''; api.go([{ s: 'home' }, { s: 'kc' }]); return true;
          case 'kc-tag': P.tag = P.tag === b.dataset.k ? '' : b.dataset.k; api.render(); { const i = api.root.querySelector('[data-kc=text]'); if (i) { i.focus(); i.setSelectionRange(P.draft.length, P.draft.length); } } return true;
          case 'kc-voice': if (!P.recording) { P.recording = true; api.render(); setTimeout(() => { if (!P.recording) return; P.recording = false; P.pending = { type: 'voice', name: 'voice.m4a', dur: '0:' + pad(3 + Math.floor(Math.random() * 12)) }; api.render(); }, 1800); } else { P.recording = false; P.pending = { type: 'voice', name: 'voice.m4a', dur: '0:03' }; api.render(); } return true;
          case 'kc-video': P.pending = { type: 'video', name: 'clip.mp4', dur: '0:' + pad(5 + Math.floor(Math.random() * 10)) }; api.render(); return true;
          case 'kc-unpend': P.pending = null; api.render(); return true;
          case 'kc-send': sendNow(api); return true;
          case 'kc-trans': { const m = kc.message(b.dataset.id); P.trans[b.dataset.id] = !P.trans[b.dataset.id]; if (P.trans[b.dataset.id] && !(m && m.tr && m.tr[api.lang])) api.toast(api.t('kc.noTr'), 'warn'); api.render(); return true; }
          case 'kc-viewchat': { const m = kc.message(b.dataset.msg); if (m) P.room = m.roomId; P.focus = b.dataset.msg; api.go([{ s: 'home' }, { s: 'kc' }, { s: 'kc-room' }]); return true; }
          case 'kc-move': { const c0 = kc.card(b.dataset.id); if (c0 && b.dataset.d === 'next' && kc.COLS.indexOf(c0.status) + 1 === kc.COLS.indexOf('Resolved')) { const blk = kc.closeBlock(c0, actor()); if (blk) { api.toast(api.t('kc.e.' + blk), 'warn'); return true; } P.close = { id: c0.id, picks: [], up: [], note: '', err: {}, fail: '' }; P.sheet = 'close'; api.render(); return true; } const r = kc.moveCard(b.dataset.id, b.dataset.d, actor()); if (!r.ok) { api.toast(api.t(r.error === 'denied' ? 'kc.e.denied' : 'kc.e.edge'), 'warn'); return true; } P.col = r.card.status; api.render(); api.toast(r.awarded ? api.t('kc.t.awarded', { n: r.awarded }) : api.t('kc.t.moved', { c: api.t('kc.col.' + r.card.status) }), 'ok'); return true; }
          case 'kc-profile': P.prof = b.dataset.e; P.sheet = 'profile'; api.render(); return true;
          case 'kc-stars': P.sheet = ''; api.push('kc-stars', {}); return true;
          case 'kc-star-done': kc.setStarDone(me(), b.dataset.id, b.checked); api.render(); return true;
          case 'kc-star-rm': kc.star(me(), b.dataset.id); api.render(); return true;
          case 'kc-goto': { const m = kc.message(b.dataset.msg); if (!m) return true; if (m.roomId !== P.room) P.room = m.roomId; P.focus = m.id; P.hl = m.id; P.sheet = ''; api.go([{ s: 'home' }, { s: 'kc' }, { s: 'kc-room' }]); setTimeout(() => { P.hl = ''; }, 2200); return true; }
          case 'kc-pins': P.sheet = 'pins'; api.render(); return true;
          case 'kc-unpin': { const r = kc.unpin(b.dataset.id, actor()); if (!r.ok) api.toast(api.t('kc.e.denied'), 'warn'); api.render(); return true; }
          case 'kc-react': { const r = kc.react(P.menu, b.dataset.e, me()); P.sheet = ''; P.menu = ''; api.render(); if (!r.ok) api.toast(api.t('kc.e.denied'), 'warn'); return true; }
          case 'kc-react-chip': { const r = kc.react(b.dataset.id, b.dataset.e, me()); if (!r.ok) api.toast(api.t('kc.e.denied'), 'warn'); api.render(); return true; }
          case 'kc-emoji-open': P.emoTab = kc.recentEmoji(me()).length ? 'recent' : 'smile'; P.sheet = 'emoji'; api.render(); return true;
          case 'kc-etab': P.emoTab = b.dataset.k; api.render(); return true;
          case 'kc-reply': P.replyTo = P.menu; P.sheet = ''; api.render(); setTimeout(() => { const i = api.root.querySelector('[data-kc=text]'); if (i) i.focus(); }, 0); return true;
          case 'kc-unreply': P.replyTo = ''; api.render(); return true;
          case 'kc-fwd': P.fwd = { id: P.menu, sel: [] }; P.sheet = 'fwd'; api.render(); return true;
          case 'kc-fwd-pick': { const F = P.fwd; F.sel = F.sel.includes(b.dataset.id) ? F.sel.filter((x) => x !== b.dataset.id) : [...F.sel, b.dataset.id]; api.render(); return true; }
          case 'kc-fwd-send': { const r = kc.forward(P.fwd.id, P.fwd.sel, me()); P.sheet = ''; P.fwd = null; api.render(); api.toast(r.ok ? api.t('kc.t.forwarded', { n: r.ids.length }) : api.t('kc.e.' + (r.error === 'many' ? 'many' : 'denied')), r.ok ? 'ok' : 'warn'); return true; }
          case 'kc-pin': { const m = kc.message(P.menu); const r = m && m.pinned ? kc.unpin(P.menu, actor()) : kc.pin(P.menu, actor()); P.sheet = ''; api.render(); api.toast(r.ok ? api.t(m && m.pinned === undefined ? 'kc.t.unpinned' : 'kc.t.pinned') : api.t('kc.e.' + (r.error === 'pin_full' ? 'pin_full' : 'denied')), r.ok ? 'ok' : 'warn'); return true; }
          case 'kc-star': { const was = kc.isStarred(me(), P.menu); const r = kc.star(me(), P.menu); P.sheet = ''; api.render(); api.toast(r.ok ? api.t(was ? 'kc.t.unstarred' : 'kc.t.starred') : api.t('kc.e.' + (r.error === 'star_full' ? 'star_full' : 'denied')), r.ok ? 'ok' : 'warn'); return true; }
          case 'kc-copy': { const m = kc.message(P.menu); P.sheet = ''; api.render(); try { navigator.clipboard.writeText(m.text).then(() => api.toast(api.t('kc.t.copied'), 'ok'), () => api.toast(api.t('kc.e.denied'), 'warn')); } catch (err) { api.toast(api.t('kc.e.denied'), 'warn'); } return true; }
          case 'kc-mark': P.marking = true; api.render(); return true;
          case 'kc-mark-hide': P.markHide = !P.markHide; api.render(); return true;
          case 'kc-mark-rm': { const r = kc.removeMark(P.view.ref, b.dataset.id, actor()); if (!r.ok) api.toast(api.t('kc.e.denied'), 'warn'); api.render(); return true; }
          case 'kc-rcat': { const R = P.rep; R.cats = R.cats || []; R.cats = R.cats.includes(b.dataset.k) ? R.cats.filter((x) => x !== b.dataset.k) : [...R.cats, b.dataset.k]; if (R.type && !kc.HAZARDS.find((h) => h.id === R.type && (!R.cats.length || R.cats.includes(h.cat)))) R.type = ''; api.render(); return true; }
          case 'kc-rmode': P.rep.mode = b.dataset.k; api.render(); return true;
          case 'kc-camset': { const cfg = kc.timemarkFor(me()); P.cam = { on: cfg.on, tpl: cfg.tpl, content: kc.userTimemark(me()).content || '', err: '' }; P.sheet = 'camset'; api.render(); return true; }
          case 'kc-cam-save': { const C = P.cam; const r = kc.setTimemarkPref(me(), { on: C.on, tpl: C.tpl, content: C.content }); if (!r.ok) { C.err = r.error === 'content_long' ? 'content_long' : ''; if (!C.err) api.toast(api.t('kc.cam.e.' + (r.error === 'required' ? 'required' : 'denied')), 'warn'); api.render(); return true; } P.sheet = ''; P.cam = null; api.render(); api.toast(api.t('kc.cam.saved'), 'ok'); return true; }
          case 'kc-pos': kc.setDemoPos(b.dataset.k); api.render(); return true;
          case 'kc-rep': P.rep = { type: '', note: '', media: null, err: '' }; P.sheet = 'rep'; api.render(); return true;
          case 'kc-hz': P.rep.type = b.dataset.k; P.rep.err = ''; api.render(); return true;
          case 'kc-rep-unphoto': P.rep.media = null; api.render(); return true;
          case 'kc-rep-send': { const R = P.rep; if (!R.type) { R.err = 'hazard'; api.render(); return true; } const r = kc.reportHazard(P.room, me(), { type: R.type, note: R.note, media: R.media }, actor()); if (!r.ok) { R.err = r.error === 'long' ? 'long' : 'hazard'; api.render(); return true; } P.sheet = ''; P.rep = null; api.render(); if (r.card) api.toast(api.t('kc.t.reported', { id: r.card.id }), r.card.category === 'Safety' ? 'warn' : 'ok'); else api.toast(api.t('kc.t.heldrep'), 'warn'); return true; }
          case 'kc-triage': P.tri = ''; P.sheet = 'triage'; api.render(); return true;
          case 'kc-tri-pick': P.tri = b.dataset.id; api.render(); return true;
          case 'kc-tri-make': { const r = kc.resolveHeld(b.dataset.id, { action: 'card', hazard: b.dataset.k }, actor()); P.tri = ''; if (!r.ok) { api.toast(api.t('kc.e.denied'), 'warn'); api.render(); return true; } api.render(); api.toast(api.t('kc.t.created', { id: r.card.id }), 'ok'); return true; }
          case 'kc-tri-skip': { const r = kc.resolveHeld(b.dataset.id, { action: 'dismiss' }, actor()); if (!r.ok) api.toast(api.t('kc.e.denied'), 'warn'); else api.toast(api.t('kc.t.triaged'), 'ok'); api.render(); return true; }
          case 'kc-own': { const r = kc.assignCard(b.dataset.id, me(), actor()); if (!r.ok) api.toast(api.t(r.error === 'member' ? 'kc.e.scope' : 'kc.e.denied'), 'warn'); else api.render(); return true; }
          case 'kc-reject': { const c0 = kc.card(b.dataset.id); if (!c0) return true; const blk = kc.closeBlock(c0, actor()); if (blk) { api.toast(api.t('kc.e.' + blk), 'warn'); return true; } P.rej = { id: c0.id, reason: '', err: '' }; P.sheet = 'reject'; api.render(); return true; }
          case 'kc-reject-ok': { const R = P.rej; const r = kc.rejectCard(R.id, R.reason, actor()); if (!r.ok) { R.err = r.error === 'reason' ? 'reason' : r.error === 'reason_long' ? 'reason_long' : ''; if (!R.err) api.toast(api.t('kc.e.' + (['self_close', 'safety_role', 'scope'].includes(r.error) ? r.error : 'denied')), 'warn'); api.render(); return true; } P.sheet = ''; P.rej = null; P.col = 'Resolved'; api.render(); api.toast(api.t('kc.t.rejected'), 'ok'); return true; }
          case 'kc-pick': { const C = P.close; const id = b.dataset.msg; C.picks = C.picks.includes(id) ? C.picks.filter((x) => x !== id) : [...C.picks, id]; C.err = {}; api.render(); return true; }
          case 'kc-unattach': { const [k, v] = b.dataset.key.split(':'); if (k === 'm') P.close.picks = P.close.picks.filter((x) => x !== v); else P.close.up.splice(+v, 1); api.render(); return true; }
          case 'kc-close-ok': {
            const C = P.close; const ev = [...C.picks.map((id) => kc.message(id)).filter(Boolean).map((m) => ({ type: 'image', name: m.media.name, data: m.media.data, msgId: m.id })), ...C.up];
            const r = kc.closeCard(C.id, { evidence: ev, note: C.note }, actor()); if (!r.ok) { C.err = r.errors || {}; C.fail = ['safety_role', 'self_close', 'scope', 'denied'].includes(r.error) ? r.error : ''; api.render(); return true; }
            P.sheet = ''; P.close = null; P.col = 'Resolved'; api.render(); api.toast(r.awarded ? api.t('kc.t.awarded', { n: r.awarded }) : api.t('kc.t.closed'), 'ok'); return true;
          }
          case 'kc-photo': { const m = kc.message(b.dataset.msg); if (m && m.media && m.media.type === 'image') { P.view = { ref: 'm:' + m.id }; P.marking = false; P.markHide = false; P.sheet = 'photo'; api.render(); } return true; }
          case 'kc-ev': { const c = kc.card(b.dataset.card); const x = c && c.closure && c.closure.evidence[+b.dataset.k]; if (x) { P.view = x.type === 'image' ? { ref: 'e:' + c.id + ':' + b.dataset.k } : { md: x }; P.marking = false; P.markHide = false; P.sheet = 'photo'; api.render(); } return true; }
          case 'kc-new': P.form = { title: '', category: 'Progress', priority: 'Medium' }; P.formErr = ''; P.sheet = 'new'; api.render(); return true;
          case 'kc-fcat': P.form.category = b.dataset.k; api.render(); return true;
          case 'kc-fpri': P.form.priority = b.dataset.k; api.render(); return true;
          case 'kc-create': { const f = P.form; const r = kc.createCard({ title: f.title, category: f.category, priority: f.priority, roomId: P.room, role: { Safety: 'SAFETY_OFFICER', Quality: 'QUALITY_CONTROL', Material: 'SCHEDULER', Progress: 'SUPERVISOR' }[f.category], status: 'Pending_Review' }, actor()); if (!r.ok) { P.formErr = r.error === 'denied' ? 'denied' : (r.errors.title || 'title'); api.render(); return true; } P.sheet = ''; P.col = 'Pending_Review'; api.render(); api.toast(api.t('kc.t.created', { id: r.card.id }), 'ok'); return true; }
        }
        return false;
      },
    };
  })());
})(window.BS);
