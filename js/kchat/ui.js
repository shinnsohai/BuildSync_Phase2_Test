/* Site chat, shared drawing code for the phone and the admin pages: the timemark stamp (time, date, place, a code) drawn into a picture, and the scribble editor for markup.
   Both work on canvases only, so nothing is uploaded and the original picture is never changed by markup. */
(function (BS) {
  const COL = { amber: '#f5b301', blue: '#2b6cff', green: '#1fa561', red: '#e5484d', white: '#ffffff' };
  const ON_COL = { amber: '#111111', blue: '#ffffff', green: '#ffffff', red: '#ffffff', white: '#111111' };
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const p2 = (n) => String(n).padStart(2, '0');

  const when = (at) => { const d = new Date(String(at).slice(0, 16) + ':00'); return { time: `${p2(d.getHours())}:${p2(d.getMinutes())}`, date: `${DOW[d.getDay()]}, ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` }; };
  const rr = (x, a, b, w, h, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); };
  const fit = (x, text, max) => { let s = String(text); if (x.measureText(s).width <= max) return s; while (s.length > 1 && x.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; };

  /** draw the stamp onto a canvas context of size w × h. info: { title, at, address, geo, name, content, code, cfg:{ tpl, color, fields } } */
  function drawStamp(x, w, h, info) {
    const cfg = info.cfg; const u = w / 640; const f = cfg.fields || {}; const c = COL[cfg.color] || COL.amber; const on = ON_COL[cfg.color] || '#111'; const t = when(info.at); const tpl = cfg.tpl;
    const font = (n, b) => { x.font = `${b ? '700 ' : '500 '}${Math.round(n * u)}px system-ui, "Segoe UI", "PingFang SC", "Noto Sans", sans-serif`; };
    const shadow = (on2) => { x.shadowColor = on2 ? 'rgba(0,0,0,.65)' : 'transparent'; x.shadowBlur = on2 ? 4 * u : 0; x.shadowOffsetY = on2 ? 1 * u : 0; };
    const text = (s, px, py, size, bold, color) => { font(size, bold); x.fillStyle = color || '#fff'; x.textBaseline = 'top'; shadow(true); x.fillText(s, px, py); shadow(false); };
    const maxW = w - 24 * u; x.save();
    if (tpl === 'minimal') {
      font(34, true); x.textAlign = 'right'; text(t.time, w - 14 * u, h - 62 * u, 34, true); if (f.date) text(t.date, w - 14 * u, h - 26 * u, 14, false); x.textAlign = 'left'; x.restore(); return;
    }
    if (tpl === 'compact') {
      const bh = (f.address || f.code ? 52 : 34) * u; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, h - bh, w, bh);
      let line = [f.time ? t.time : '', f.date ? t.date : ''].filter(Boolean).join('   '); text(line || info.title, 12 * u, h - bh + 6 * u, 16, true);
      const l2 = [f.address ? info.address : '', f.code ? info.code : ''].filter(Boolean).join('  ·  '); if (l2) { font(12); text(fit(x, l2, maxW), 12 * u, h - bh + 29 * u, 12, false, '#e8ecf4'); } x.restore(); return;
    }
    // site and full: the layout of a site-report camera
    let y = 12 * u; font(15, true); const tw = x.measureText(info.title).width + 18 * u; const th = 28 * u; const sw = f.time ? 30 * u : 0;
    x.fillStyle = c; rr(x, 12 * u, y, Math.min(tw, maxW), th, 5 * u); x.fill(); x.fillStyle = on; x.textBaseline = 'middle'; x.fillText(fit(x, info.title, maxW - 18 * u), 21 * u, y + th / 2 + 1 * u); x.textBaseline = 'top';
    if (f.time) { font(30, true); const tmw = x.measureText(t.time).width + 16 * u; const bx = 12 * u + Math.min(tw, maxW) + 4 * u; x.fillStyle = 'rgba(255,255,255,.94)'; rr(x, bx, y - 3 * u, tmw, th + 6 * u, 5 * u); x.fill(); x.fillStyle = '#0b2a6b'; x.textBaseline = 'middle'; x.fillText(t.time, bx + 8 * u, y + th / 2 + 1 * u); x.textBaseline = 'top'; }
    y += th + 14 * u; const rows = []; if (f.date) rows.push([t.date, 17, true]); if (f.address && info.address) rows.push([info.address, 14, false]); if (f.coord && info.geo) rows.push([`${info.geo.lat.toFixed(5)}, ${info.geo.lng.toFixed(5)}`, 13, false]);
    if (rows.length) { const bh = rows.reduce((n, r2) => n + (r2[1] + 7) * u, 0); x.fillStyle = c; x.fillRect(12 * u, y, 3 * u, bh); let yy = y; rows.forEach(([s, sz, b]) => { font(sz, b); text(fit(x, s, maxW - 12 * u), 22 * u, yy, sz, b); yy += (sz + 7) * u; }); y += bh + 8 * u; }
    const notes = []; if (f.name && info.name) notes.push(`Notes: ${info.name}`); if (f.content && info.content) notes.push(`Construction content: ${info.content}`); if (tpl === 'full' && f.code) notes.push(`Photo code: ${info.code}`);
    if (notes.length) { const bh = notes.length * 24 * u + 10 * u; x.fillStyle = 'rgba(0,0,0,.38)'; rr(x, 12 * u, y, maxW, bh, 6 * u); x.fill(); notes.forEach((s, i) => { font(14); text(fit(x, s, maxW - 16 * u), 20 * u, y + 7 * u + i * 24 * u, 14, false); }); }
    if (f.verified) { const s = `✔ Verified time by BuiltSync Camera${f.code ? ' · ' + info.code : ''}`; font(12); text(fit(x, s, maxW), 12 * u, h - 22 * u, 12, false, '#f1f5ff'); }
    x.restore();
  }

  /** a picture (Image or canvas) → { data } scaled to 640 wide with the stamp drawn in; cfg.on false returns it unstamped */
  function process(img, info, stamp) {
    const sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height; const w = Math.min(640, sw); const h = Math.round(sh * w / sw);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); if (stamp) drawStamp(x, w, h, info); return { data: c.toDataURL('image/jpeg', 0.72), w, h };
  }
  /** a sample scene with the stamp, for the settings preview */
  function sample(info, w = 360, h = 480) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f8aa6'); g.addColorStop(0.55, '#b9c6d0'); g.addColorStop(1, '#6b6f73'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#8c969e'; x.fillRect(w * 0.1, h * 0.42, w * 0.34, h * 0.5); x.fillRect(w * 0.5, h * 0.3, w * 0.4, h * 0.62); x.fillStyle = '#d9dee2'; for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) x.fillRect(w * 0.54 + q * w * 0.12, h * 0.34 + r * h * 0.08, w * 0.07, h * 0.04);
    x.strokeStyle = '#e8a317'; x.lineWidth = 4; x.beginPath(); x.moveTo(w * 0.7, h * 0.3); x.lineTo(w * 0.7, h * 0.06); x.lineTo(w * 0.2, h * 0.06); x.stroke();
    if (info.cfg.on !== false) drawStamp(x, w, h, info); return c.toDataURL('image/jpeg', 0.7);
  }

  // ---------- the scribble editor ----------
  const PEN = ['#e5484d', '#f5b301', '#1fa561', '#2b6cff', '#ffffff', '#111111']; const WID = [3, 6, 12];
  /** mounts a drawing layer over a picture inside `host`. opts: { src, marks:[{data}], labels:{ undo, clear, save, cancel }, onSave(pngDataUrl), onCancel() } */
  function mountMarkup(host, opts) {
    host.innerHTML = ''; const L = opts.labels || {}; host.className = (host.className || '') + ' kc-mk';
    const stage = document.createElement('div'); stage.className = 'kc-mkstage'; const base = document.createElement('img'); base.alt = ''; base.className = 'kc-mkbase'; stage.appendChild(base);
    (opts.marks || []).forEach((m) => { const o = document.createElement('img'); o.className = 'kc-mklayer'; o.alt = ''; o.src = m.data; stage.appendChild(o); });
    const cv = document.createElement('canvas'); cv.className = 'kc-mkcanvas'; stage.appendChild(cv);
    const bar = document.createElement('div'); bar.className = 'kc-mkbar'; let color = PEN[0], width = WID[1]; const strokes = []; let cur = null;
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', fn); return b; };
    const pens = document.createElement('div'); pens.className = 'kc-mkpens'; PEN.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kc-mkpen' + (c === color ? ' on' : ''); b.style.background = c; b.setAttribute('aria-label', c); b.addEventListener('click', () => { color = c; pens.querySelectorAll('.kc-mkpen').forEach((e) => e.classList.toggle('on', e === b)); }); pens.appendChild(b); });
    const sizes = document.createElement('div'); sizes.className = 'kc-mkpens'; WID.forEach((wd) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'kc-mksz' + (wd === width ? ' on' : ''); b.innerHTML = `<i style="width:${wd + 4}px;height:${wd + 4}px"></i>`; b.setAttribute('aria-label', 'width ' + wd); b.addEventListener('click', () => { width = wd; sizes.querySelectorAll('.kc-mksz').forEach((e) => e.classList.toggle('on', e === b)); }); sizes.appendChild(b); });
    const redraw = () => { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.lineCap = 'round'; x.lineJoin = 'round'; strokes.concat(cur ? [cur] : []).forEach((s) => { x.strokeStyle = s.color; x.lineWidth = s.width; x.beginPath(); s.pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); if (s.pts.length === 1) x.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]); x.stroke(); }); };
    const undo = btn(L.undo || 'Undo', 'kc-mkb', () => { strokes.pop(); redraw(); }); const clear = btn(L.clear || 'Clear', 'kc-mkb', () => { strokes.length = 0; redraw(); });
    const save = btn(L.save || 'Save', 'kc-mkb primary', () => { if (!strokes.length) { opts.onCancel && opts.onCancel(); return; } opts.onSave(cv.toDataURL('image/png')); }); const cancel = btn(L.cancel || 'Cancel', 'kc-mkb', () => opts.onCancel && opts.onCancel());
    const row1 = document.createElement('div'); row1.className = 'kc-mkrow'; row1.append(pens, sizes); const row2 = document.createElement('div'); row2.className = 'kc-mkrow'; row2.append(undo, clear, cancel, save); bar.append(row1, row2); host.append(stage, bar);
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)]; };
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } const k = cv.width / 640; cur = { color, width: width * Math.max(1, k), pts: [pt(e)] }; redraw(); });
    cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.pts.push(pt(e)); redraw(); });
    const end = () => { if (cur) { strokes.push(cur); cur = null; redraw(); } }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    base.onload = () => { cv.width = base.naturalWidth || 640; cv.height = base.naturalHeight || 480; }; base.src = opts.src;
    return { strokes: () => strokes.length };
  }

  BS.kchatUI = { COL, drawStamp, process, sample, mountMarkup, when };
})(window.BS);
