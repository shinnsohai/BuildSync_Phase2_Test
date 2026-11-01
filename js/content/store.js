/* Content configuration: the sign-in / sign-out pop-ups shown on the phone, and the safety reminders on its home screen. */
(function (BS) {
  const KEY = 'bs_content_proto_v1';
  const listeners = new Set();
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const now = () => BS.fmt.now().slice(0, 16).replace('T', ' ');
  const clean = (s) => String(s == null ? '' : s).trim();
  const svg = (body, bg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${bg}"/>${body}</svg>`);
  const HELMET = svg('<path d="M24 78a36 36 0 0 1 72 0z" fill="#F5B301"/><rect x="18" y="78" width="84" height="10" rx="5" fill="#E09A00"/><rect x="54" y="30" width="12" height="48" fill="#E09A00"/>', '#EEF0FF');
  const EXIT = svg('<rect x="34" y="24" width="38" height="72" rx="4" fill="#5058F2"/><path d="M76 60h26m0 0-9-9m9 9-9 9" stroke="#168A5B" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', '#EAF8F2');
  const SHIELD = svg('<path d="M60 20 92 32v26c0 22-14 36-32 44C42 94 28 80 28 58V32z" fill="#168A5B"/><path d="M45 60l11 11 20-22" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', '#D9F0E4');
  const HEART = svg('<path d="M60 96C26 72 24 44 42 36c10-4 18 2 18 10 0-8 8-14 18-10 18 8 16 36-18 60z" fill="#D33B45"/>', '#FFDDE1');

  function seed() {
    return {
      v: 1, n: 3,
      popups: [
        { id: 'in', type: 'in', zh: '签到安全提示', en: 'Sign-in safety notice', msgZh: '签到前请确认防护装备', msgEn: 'Please check your protective equipment before signing in', image: { name: 'checkin-helmet.png', size: 48213, data: HELMET }, status: 'published', updatedAt: '2026-08-11 08:00' },
        { id: 'out', type: 'out', zh: '签退现场确认', en: 'Sign-out site check', msgZh: '签退前请确认已离开工区', msgEn: 'Please confirm you have left the work area before signing out', image: { name: 'checkout-exit.png', size: 39120, data: EXIT }, status: 'published', updatedAt: '2026-08-11 08:00' },
      ],
      reminders: [
        { id: 'r1', titleZh: '进入工地须佩戴个人防护装备', titleEn: 'Wear protective equipment on site', subZh: '在工地内须始终按要求佩戴防护装备。', subEn: 'Wear the required protective equipment at all times on site.', color: '#D9F0E4', icon: { name: 'safety-helmet.png', size: 21400, data: SHIELD }, isDefault: true, updatedAt: '2026-08-11 08:00' },
        { id: 'r2', titleZh: '生命只有一次', titleEn: 'You only live once', subZh: '保持警惕，注意安全，遵守操作规程。', subEn: 'Stay alert, work safely and follow the procedures.', color: '#FFDDE1', icon: { name: 'life.png', size: 18800, data: HEART }, isDefault: false, updatedAt: '2026-08-11 08:00' },
      ],
    };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.popups) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  BS.content = {
    MAX_REMINDERS: 6, MAX_IMG: 2 * 1024 * 1024,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    popups() { return state.popups; },
    popup(id) { return state.popups.find((p) => p.id === id) || null; },
    /** the published pop-up of a kind ('in' | 'out') or null; the phone falls back to its built-in text */
    livePopup(type) { const p = state.popups.find((x) => x.type === type); return p && p.status === 'published' ? p : null; },
    reminders() { return state.reminders.slice().sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)); },
    reminder(id) { return state.reminders.find((r) => r.id === id) || null; },

    /** shrink a chosen picture to a small data URL so it can live in local storage (the prototype has no file storage) */
    async prepareImage(file) {
      if (!/^image\/(png|jpeg)$/.test(file.type)) return { ok: false, error: 'img_type' };
      if (file.size > this.MAX_IMG) return { ok: false, error: 'img_size' };
      try {
        const url = URL.createObjectURL(file); const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const k = Math.min(1, 360 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        return { ok: true, image: { name: file.name, size: file.size, data: c.toDataURL('image/jpeg', 0.8) } };
      } catch (e) { return { ok: false, error: 'img_read' }; }
    },

    // ---------- pop-ups ----------
    validatePopup(d) {
      const e = {};
      if (!clean(d.zh)) e.zh = 'zh'; else if (clean(d.zh).length > 30) e.zh = 'zh_len'; if (!clean(d.en)) e.en = 'en'; else if (clean(d.en).length > 60) e.en = 'en_len';
      if (!clean(d.msgZh)) e.msgZh = 'msgZh'; else if (clean(d.msgZh).length > 60) e.msgZh = 'msg_len'; if (!clean(d.msgEn)) e.msgEn = 'msgEn'; else if (clean(d.msgEn).length > 120) e.msgEn = 'msg_len';
      if (!['published', 'draft'].includes(d.status)) e.status = 'status'; else if (d.status === 'published' && !d.image) e.status = 'need_img';
      return e;
    },
    savePopup(id, d) {
      const p = this.popup(id); if (!p) return { ok: false, error: 'missing' };
      const e = this.validatePopup(d); if (Object.keys(e).length) return { ok: false, errors: e };
      Object.assign(p, { zh: clean(d.zh), en: clean(d.en), msgZh: clean(d.msgZh), msgEn: clean(d.msgEn), image: d.image || null, status: d.status, updatedAt: now() });
      const ok = save(); emit({ type: 'popup', id }); return { ok: true, popup: p, persisted: ok };
    },

    // ---------- safety reminders ----------
    validateReminder(d) {
      const e = {};
      if (!clean(d.titleZh)) e.titleZh = 'titleZh'; else if (clean(d.titleZh).length > 40) e.titleZh = 'title_len'; if (!clean(d.titleEn)) e.titleEn = 'titleEn'; else if (clean(d.titleEn).length > 80) e.titleEn = 'title_len';
      if (!clean(d.subZh)) e.subZh = 'subZh'; else if (clean(d.subZh).length > 80) e.subZh = 'sub_len'; if (!clean(d.subEn)) e.subEn = 'subEn'; else if (clean(d.subEn).length > 160) e.subEn = 'sub_len';
      if (!/^#[0-9a-fA-F]{6}$/.test(clean(d.color))) e.color = 'color';
      return e;
    },
    saveReminder(d, id) {
      const e = this.validateReminder(d); if (Object.keys(e).length) return { ok: false, errors: e };
      let r = id && this.reminder(id);
      if (!r && state.reminders.length >= this.MAX_REMINDERS) return { ok: false, errors: { titleZh: 'max' } };
      const f = { titleZh: clean(d.titleZh), titleEn: clean(d.titleEn), subZh: clean(d.subZh), subEn: clean(d.subEn), color: clean(d.color).toUpperCase(), icon: d.icon || null, updatedAt: now() };
      if (r) Object.assign(r, f); else { r = { id: 'r' + ++state.n, isDefault: false, ...f }; state.reminders.push(r); }
      // exactly one default: the first reminder becomes it, and ticking "default" moves it
      if (d.isDefault || !state.reminders.some((x) => x.isDefault)) state.reminders.forEach((x) => { x.isDefault = x === r; });
      const ok = save(); emit({ type: 'reminder', id: r.id }); return { ok: true, reminder: r, persisted: ok };
    },
    setDefault(id) { const r = this.reminder(id); if (!r) return { ok: false, error: 'missing' }; state.reminders.forEach((x) => { x.isDefault = x === r; }); save(); emit({ type: 'reminder', id }); return { ok: true }; },
    removeReminder(id) {
      const r = this.reminder(id); if (!r) return { ok: false, error: 'missing' }; if (r.isDefault) return { ok: false, error: 'default' };
      state.reminders = state.reminders.filter((x) => x.id !== id); save(); emit({ type: 'reminder', id }); return { ok: true };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
