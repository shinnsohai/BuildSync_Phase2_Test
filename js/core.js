/* Core helpers: safe HTML templating, icons, i18n, formatting, shared UI (toast, lightbox). */
window.BS = window.BS || {};
(function (BS) {
  // ---------- safe html templating ----------
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(s);
  const part = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : v === false || v == null ? '' : esc(v));
  function html(strings, ...vals) {
    let o = '';
    strings.forEach((s, i) => { o += s; if (i < vals.length) o += part(vals[i]); });
    return new Raw(o);
  }
  BS.esc = esc; BS.raw = raw; BS.html = html;

  // ---------- icons (24x24, stroke) ----------
  const I = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 9"/>',
    file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 010 7M18 14.5c2.5.6 4 2.3 4 5.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
    mega: '<path d="M3 11v3l12 5V6zM15 8c3 0 5 2 5 4s-2 4-5 4M7 15l1 5h3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    cal2: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M7.5 8a2.5 2.5 0 010-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 010 5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    cert: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-3 4 3M8 9h8M8 13h5"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
    folder: '<path d="M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  BS.icon = (name, size = 20, cls = '') =>
    raw(`<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`);

  // ---------- i18n ----------
  const dict = { zh: {}, en: {} };
  BS.D = (key, zh, en) => { dict.zh[key] = zh; dict.en[key] = en; };
  BS.t = (lang, key, p) => {
    let s = (dict[lang] || {})[key];
    if (s == null) { console.warn('[i18n] missing', lang, key); return key; }
    return p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] ?? m)) : s;
  };

  // ---------- formatting ----------
  const pad = (n) => String(n).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  BS.fmt = {
    money: (c) => 'S$ ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    moneyNum: (c) => (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    dt: (iso) => iso.slice(0, 10) + ' ' + iso.slice(11, 16),
    day: (iso) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`,
    size: (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'),
    now: () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`; },
    pad,
  };

  // ---------- generated receipt art (placeholder for seeded receipts) ----------
  BS.receiptArt = (title, amountCents, seed) => {
    let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const lines = Array.from({ length: 7 }, (_, i) => `<rect x="36" y="${150 + i * 26}" width="${90 + ((h >> i) % 90)}" height="8" rx="4" fill="#d9dce6"/><rect x="${230 - ((h >> (i + 3)) % 30)}" y="${150 + i * 26}" width="${34 + ((h >> (i + 5)) % 20)}" height="8" rx="4" fill="#c9cddb"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="#eef0f7"/><rect x="18" y="14" width="264" height="392" rx="6" fill="#fff" stroke="#dfe2e9"/><text x="150" y="58" text-anchor="middle" font-family="Arial" font-size="16" font-weight="700" fill="#33384a">${esc(title).slice(0, 22)}</text><text x="150" y="82" text-anchor="middle" font-family="Arial" font-size="11" fill="#8a8fa3">SAMPLE RECEIPT</text><line x1="36" y1="104" x2="264" y2="104" stroke="#e5e8f0"/>${lines}<line x1="36" y1="344" x2="264" y2="344" stroke="#e5e8f0"/><text x="36" y="372" font-family="Arial" font-size="13" fill="#666a73">TOTAL</text><text x="264" y="374" text-anchor="end" font-family="Arial" font-size="18" font-weight="700" fill="#17181c">S$ ${(amountCents / 100).toFixed(2)}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  // ---------- shared UI ----------
  BS.toast = (host, msg, kind = '') => {
    let el = host.querySelector(':scope > .toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); host.appendChild(el); }
    el.textContent = msg; el.className = 'toast show ' + kind;
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600);
  };

  /** Receipt lightbox: image zoom view, or PDF viewer (blob iframe when bytes were kept). */
  BS.openReceipt = (host, file, claim, lang) => {
    const t = (k, p) => BS.t(lang, k, p);
    const old = host.querySelector(':scope > .lightbox'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    let body;
    if (file.kind === 'image') {
      const src = file.src || BS.receiptArt(t('type.' + claim.type), claim.amountCents, claim.id + file.name);
      body = html`<img src="${src}" alt="${file.name}">`;
    } else if (file.src) {
      const blob = BS.dataUrlToBlob(file.src);
      const url = blob ? URL.createObjectURL(blob) : '';
      box._url = url;
      body = html`<iframe src="${url}" title="${file.name}"></iframe>`;
    } else {
      body = html`<div class="pdf-ph">${BS.icon('file', 44)}<b>${file.name}</b><span>${t('rc.pdfPlaceholder')}</span></div>`;
    }
    box.innerHTML = html`<div class="lb-bar"><span>${file.name}</span><button type="button" class="lb-x" aria-label="${t('common.close')}">${BS.icon('x', 20)}</button></div><div class="lb-body">${body}</div>`.s;
    const close = () => { if (box._url) URL.revokeObjectURL(box._url); box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.querySelector('.lb-x').addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('lb-body')) close(); });
    document.addEventListener('keydown', onKey);
    host.appendChild(box);
    box.querySelector('.lb-x').focus();
  };

  BS.dataUrlToBlob = (u) => {
    try {
      const [h, b] = u.split(','); const mime = /data:([^;]+)/.exec(h)[1];
      const bin = atob(b); const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    } catch (e) { return null; }
  };
})(window.BS);
