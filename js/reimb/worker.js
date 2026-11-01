/* Worker mobile app: 工作中心 → 报销 (submit / records / detail / receipts). */
(function (BS) {
  const { html, raw, icon, fmt, store } = BS;

  BS.createWorker = function (root) {
    const W = {
      lang: 'zh',
      stack: [{ s: 'home' }],
      sheet: null,
      draft: newDraft(),
      errors: {},
      filter: 'all',
      banner: null,
    };
    const t = (k, p) => BS.t(W.lang, k, p);
    const cur = () => W.stack[W.stack.length - 1];
    const typeLabel = (k) => t('type.' + k);

    function newDraft(from) {
      return from
        ? { type: from.type, amountStr: (from.amountCents / 100).toFixed(2), note: from.note, files: [], resubmitOf: from.id }
        : { type: '', amountStr: '', note: '', files: [], resubmitOf: null };
    }
    const draftDirty = () => !!(W.draft.type || W.draft.amountStr || W.draft.note || W.draft.files.length);

    // ---------- chrome ----------
    root.innerHTML = html`
      <div class="w-status" aria-hidden="true"><b>9:41</b><span class="w-status-r"><i>5G</i><i class="w-batt"></i></span></div>
      <div class="w-view" data-role="view"></div>
      <input type="file" hidden data-role="in-gallery" accept="image/*" multiple>
      <input type="file" hidden data-role="in-camera" accept="image/*" capture="environment">
      <input type="file" hidden data-role="in-pdf" accept="application/pdf,.pdf" multiple>`.s;
    const view = root.querySelector('[data-role=view]');

    // ---------- navigation ----------
    function push(s, p = {}) { W.stack.push({ s, ...p }); W.sheet = null; render(true); }
    function pop() { if (W.stack.length > 1) { W.stack.pop(); W.sheet = null; render(true); } }
    function goTab(s) { W.stack = [{ s }]; W.sheet = null; render(true); }
    function back() {
      if (cur().s === 'form' && draftDirty()) {
        W.sheet = { k: 'confirm', title: t('w.discardTitle'), msg: t('w.discardMsg'), ok: t('w.discard'), danger: true, then: () => { W.draft = newDraft(); W.errors = {}; pop(); } };
        render(); return;
      }
      pop();
    }

    // ---------- screens ----------
    function header(title, { back: showBack = true, right = '' } = {}) {
      return html`<header class="w-nav">${showBack ? html`<button type="button" class="w-back" data-act="back" aria-label="${t('common.back')}">${icon('back', 22)}</button>` : html`<span class="w-back"></span>`}<h1>${title}</h1><span class="w-nav-r">${right}</span></header>`;
    }

    function tag(status) { return html`<span class="w-tag ${status}">${t('w.status.' + status)}</span>`; }

    const LIVE = { 'w.tile.reimb': 'open-reimb', 'w.tile.leave': 'open-leave', 'w.tile.att': 'open-att-rec', 'w.tile.salary': 'open-pay', 'w.tile.cert': 'open-cert', 'w.tile.survey': 'open-sv', 'w.tile.wallet': 'open-wl', 'w.tile.train': 'open-trn', 'w.tile.dorm': 'open-dorm', 'w.tile.spin': 'open-spin' };
    /** bottom tab bar shared by the home and attendance screens */
    function tabbar(active) {
      const tabs = [['home', 'w.tab.home', 'tab-home'], ['brief', 'w.tab.work', 'tab-home'], ['cal', 'w.tab.att', 'open-att'], ['mega', 'w.tab.bc', 'open-bc'], ['gear', 'w.tab.set', 'open-set']];
      return html`<nav class="w-tabbar" aria-label="Tabs">${tabs.map(([ic, k, act]) => html`<button type="button" class="${k === active ? 'on' : ''}" data-act="${act}">${icon(ic, 22)}<span>${t(k)}</span>${k === 'w.tab.bc' && BS.notice.unread(BS.ME.empNo) ? html`<em class="w-tab-dot">${BS.notice.unread(BS.ME.empNo)}</em>` : ''}</button>`)}</nav>`;
    }
    const mePrj = () => { const e = BS.hr.emp(BS.ME.empNo); const a = e && e.assigns[0]; const p = a && BS.hr.project(a.projectKey); return p ? (W.lang === 'zh' ? p.zh : p.en) : t('hr.unassigned'); };
    function homeScreen() {
      const tiles = [['cal', 'w.tile.att'], ['clip', 'w.tile.survey'], ['wallet', 'w.tile.salary'], ['brief', 'w.tile.leave'], ['user', 'w.tile.profile'], ['receipt', 'w.tile.reimb'], ['cert', 'w.tile.cert'], ['tag', 'w.tile.wallet'], ['cap', 'w.tile.train'], ['home', 'w.tile.dorm'], ['gift', 'w.tile.spin']];
      const pend = store.mine().filter((c) => c.status === 'pending').length; const certDue = BS.hr.dueReminders(BS.ME.empNo).length;
      return html`
        <div class="w-body">
          <div class="w-hero"><h1>${t('w.home.title')}</h1><p>${t('w.home.emp', { name: W.lang === 'zh' ? BS.ME.name : BS.ME.nameEn })}</p></div>
          <section class="w-card w-project">
            <div class="w-proj-top"><span class="w-ico-sq">${icon('pin', 18)}</span><div><small>${t('w.home.project')}</small><b>${mePrj()}</b></div><button type="button" class="w-chip" data-act="inert">${t('w.home.switch')}</button></div>
            <p class="w-addr">1 Raffles Place, Singapore 048616</p>
          </section>
          ${(() => { const e = BS.hr.emp(BS.ME.empNo); const h = e && !e.assigns.length ? BS.sys.live('unassigned') : null; return h ? html`<section class="w-card w-hint">${icon('bell', 20)}<div><b>${t('w.home.unassignedTitle')}</b><div class="w-notice-body">${BS.raw(BS.notice.clean(W.lang === 'zh' ? h.bodyZh : h.bodyEn))}</div></div></section>` : ''; })()}
          ${BS.content.reminders().length ? html`<div class="w-sec"><h2>${t('w.safety')}</h2></div><div class="w-safety">${BS.content.reminders().map((r) => html`<div class="w-safe" style="background:${r.color}">${r.icon ? html`<img src="${r.icon.data}" alt="">` : html`<span class="w-safe-ic">${icon('shield', 22)}</span>`}<div><b>${W.lang === 'zh' ? r.titleZh : r.titleEn}</b><small>${W.lang === 'zh' ? r.subZh : r.subEn}</small></div></div>`)}</div>` : ''}
          <div class="w-sec"><h2>${t('w.home.common')}</h2><span>${t('w.home.services', { n: 10 })}</span></div>
          <div class="w-grid">${tiles.map(([ic, k]) => html`
            <button type="button" class="w-tile ${LIVE[k] ? 'live' : ''}" data-act="${LIVE[k] || 'inert'}">
              <span class="w-ico-sq lg">${icon(ic, 22)}</span><span>${t(k)}</span>${k === 'w.tile.reimb' && pend ? html`<em class="w-dot">${pend}</em>` : ''}${k === 'w.tile.cert' && certDue ? html`<em class="w-dot">${certDue}</em>` : ''}${k === 'w.tile.survey' && BS.survey.pendingCount(BS.ME.empNo) ? html`<em class="w-dot">${BS.survey.pendingCount(BS.ME.empNo)}</em>` : ''}
            </button>`)}</div>
        </div>
        ${tabbar('w.tab.work')}`;
    }

    function formScreen() {
      const d = W.draft, e = W.errors, mine = store.mine().length;
      return html`
        ${header(t('w.form.title'))}
        <div class="w-body w-form">
          <button type="button" class="w-card w-link" data-act="records">${icon('receipt', 20)}<span><b>${t('w.form.viewRecords')}</b></span><em>${t('w.form.total', { n: mine })}</em>${icon('right', 18)}</button>
          ${d.resubmitOf ? html`<p class="w-note info">${icon('refresh', 16)} ${t('w.form.resubmitting', { id: d.resubmitOf })}</p>` : ''}
          <div class="w-field ${e.type ? 'err' : ''}">
            <label>${t('w.form.type')}</label>
            <button type="button" class="w-input w-select ${d.type ? '' : 'ph'}" data-act="pick-type" aria-haspopup="dialog"><span>${d.type ? typeLabel(d.type) : t('w.form.typePh')}</span>${icon('down', 18)}</button>
            ${e.type ? html`<small class="w-err">${t(e.type)}</small>` : ''}
          </div>
          <div class="w-field ${e.amount ? 'err' : ''}">
            <label for="w-amt">${t('w.form.amount')}</label>
            <div class="w-input w-money"><span>S$</span><input id="w-amt" data-role="amount" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${d.amountStr}" aria-describedby="w-amt-e"></div>
            ${e.amount ? html`<small class="w-err" id="w-amt-e">${t(e.amount)}</small>` : ''}
          </div>
          <div class="w-field">
            <label for="w-note">${t('w.form.note')} <i>${t('w.form.optional')}</i></label>
            <textarea id="w-note" class="w-input" data-role="note" rows="3" maxlength="200" placeholder="${t('w.form.notePh')}">${d.note}</textarea>
          </div>
          <div class="w-field ${e.files ? 'err' : ''}">
            <label>${t('w.form.receipts')} <i>${d.files.length}/${store.MAX_FILES}</i></label>
            <div class="w-files">
              ${d.files.map((f) => html`
                <div class="w-thumb">
                  <button type="button" class="w-thumb-img" data-act="view-draft-file" data-id="${f.id}" aria-label="${f.name}">${f.kind === 'image' ? html`<img alt="" src="${f.src}">` : html`<span class="pdf">${icon('file', 24)}<b>PDF</b></span>`}</button>
                  <button type="button" class="w-thumb-x" data-act="rm-file" data-id="${f.id}" aria-label="${t('common.remove')}">${icon('x', 14)}</button>
                  <small>${f.name}</small>
                </div>`)}
              ${d.files.length < store.MAX_FILES ? html`<button type="button" class="w-upload" data-act="pick-upload">${icon('upload', 22)}<b>${t('w.form.upload')}</b><small>${t('w.form.uploadMax')}</small></button>` : ''}
            </div>
            ${e.files ? html`<small class="w-err">${t(e.files)}</small>` : ''}
          </div>
        </div>
        <footer class="w-foot"><button type="button" class="w-btn primary" data-act="submit">${t('w.form.submit')}</button></footer>`;
    }

    function recordsScreen() {
      const all = store.mine();
      const list = W.filter === 'all' ? all : all.filter((c) => c.status === W.filter);
      const filters = ['all', 'pending', 'approved', 'rejected'];
      return html`
        ${header(t('w.rec.title'), { right: html`<button type="button" class="w-plus" data-act="new" aria-label="${t('w.form.title')}">${icon('plus', 22)}</button>` })}
        <div class="w-body">
          <div class="w-filters" role="tablist">${filters.map((f) => html`<button type="button" role="tab" aria-selected="${W.filter === f ? 'true' : 'false'}" class="${W.filter === f ? 'on' : ''}" data-act="filter" data-f="${f}">${f === 'all' ? t('w.rec.all') : t('w.status.' + f)}</button>`)}</div>
          ${list.length ? list.map((c) => html`
            <button type="button" class="w-card w-rec" data-act="open" data-id="${c.id}">
              <div class="w-rec-top"><span class="w-ico-sq">${icon('receipt', 18)}</span><b>${typeLabel(c.type)}</b>${tag(c.status)}</div>
              <div class="w-kv"><span>${t('w.rec.submitted')}</span><b>${fmt.day(c.submittedAt)}</b></div>
              <div class="w-kv"><span>${t('w.rec.amount')}</span><b class="amt">${fmt.money(c.amountCents)}</b></div>
              ${icon('right', 18, 'w-rec-go')}
            </button>`) : html`<div class="w-empty">${icon('receipt', 40)}<p>${t('w.rec.empty')}</p></div>`}
        </div>`;
    }

    function detailScreen() {
      const c = store.get(cur().id);
      if (!c) return html`${header(t('w.det.title'))}<div class="w-body"><div class="w-empty"><p>${t('w.det.missing')}</p></div></div>`;
      const st = c.status;
      const hero = {
        pending: ['clock', t('w.det.h.pending'), t('w.det.s.pending', { at: fmt.dt(c.submittedAt) })],
        approved: ['check', t('w.det.h.approved'), t('w.det.s.approved')],
        rejected: ['x', t('w.det.h.rejected'), t('w.det.s.rejected')],
        withdrawn: ['refresh', t('w.det.h.withdrawn'), t('w.det.s.withdrawn')],
      }[st];
      const rv = c.review;
      return html`
        ${header(t('w.det.title'))}
        <div class="w-body">
          <section class="w-hero-card ${st}"><span class="w-hero-ic">${icon(hero[0], 26)}</span><div><b>${hero[1]}</b><p>${hero[2]}</p></div>${tag(st)}</section>
          <section class="w-card w-list">
            <div class="w-row"><span>${t('w.det.type')}</span><b>${typeLabel(c.type)}</b></div>
            <div class="w-row"><span>${t('w.det.amount')}</span><b class="amt">${fmt.money(c.amountCents)}</b></div>
            <div class="w-row"><span>${t('w.det.id')}</span><b>${c.id}</b></div>
            <button type="button" class="w-row link" data-act="receipts" data-id="${c.id}"><span>${t('w.det.receipts')}</span><b>${t('w.det.receiptsN', { n: c.files.length })} ${icon('right', 16)}</b></button>
            <div class="w-row"><span>${t('w.det.at')}</span><b>${fmt.dt(c.submittedAt)}</b></div>
            <div class="w-row"><span>${t('w.det.note')}</span><b class="note">${c.note || '—'}</b></div>
          </section>
          ${st === 'pending' ? html`
            <section class="w-card">
              <h3>${t('w.det.progress')}</h3>
              <ol class="w-steps"><li class="done"><i>${icon('check', 12)}</i><div><b>${t('w.det.p.sub')}</b><small>${fmt.dt(c.submittedAt)}</small></div></li>
              <li class="now"><i></i><div><b>${t('w.det.p.wait')}</b><small>${t('w.det.p.cur')}</small></div></li></ol>
            </section>
            <p class="w-note">${icon('bell', 16)} ${t('w.det.pendingNote')}</p>` : ''}
          ${rv ? html`
            <section class="w-card w-list">
              <div class="w-row"><span>${t('w.det.result')}</span><b class="res ${st}">${t('w.status.' + st)}</b></div>
              <div class="w-row"><span>${t('w.det.by')}</span><b>${t('reviewer')}</b></div>
              <div class="w-row"><span>${t('w.det.rat')}</span><b>${fmt.dt(rv.at)}</b></div>
              ${st === 'rejected' ? html`<div class="w-reason"><span>${t('w.det.reason')}</span><p>${rv.text}</p></div>` : html`<div class="w-row"><span>${t('w.det.comment')}</span><b>${rv.text || '—'}</b></div>`}
            </section>` : ''}
          ${st === 'approved' ? html`<p class="w-note ok">${icon('check', 16)} ${t('w.det.approvedNote')}</p>` : ''}
        </div>
        <footer class="w-foot">
          ${st === 'pending' ? html`<button type="button" class="w-btn danger-o" data-act="withdraw" data-id="${c.id}">${t('w.det.withdraw')}</button>` : ''}
          ${st === 'rejected' || st === 'withdrawn' ? html`<button type="button" class="w-btn primary" data-act="resubmit" data-id="${c.id}">${t('w.det.resubmit')}</button>` : ''}
          ${st === 'approved' ? html`<button type="button" class="w-btn primary" data-act="records">${t('w.form.viewRecords')}</button>` : ''}
        </footer>`;
    }

    function receiptsScreen() {
      const c = store.get(cur().id);
      if (!c) return html`${header(t('w.rc.title'))}<div class="w-body"></div>`;
      return html`
        ${header(t('w.rc.title'))}
        <div class="w-body">
          <section class="w-card"><div class="w-rc-head"><div><small>${t('w.rc.id')}</small><b>${c.id}</b></div><span class="w-chip">${t('w.rc.count', { n: c.files.length })}</span></div>
            <p class="w-rc-sub">${typeLabel(c.type)} · ${fmt.money(c.amountCents)} · ${t('w.rc.sub', { d: fmt.day(c.submittedAt) })}</p></section>
          <h3 class="w-h3">${t('w.det.receipts')}</h3>
          ${c.files.map((f) => html`
            <button type="button" class="w-card w-file" data-act="view-file" data-id="${c.id}" data-fid="${f.id}">
              <span class="w-file-ic ${f.kind}">${f.kind === 'image' ? html`<img alt="" src="${f.src || BS.receiptArt(typeLabel(c.type), c.amountCents, c.id + f.name)}">` : icon('file', 24)}</span>
              <span class="w-file-t"><b>${f.name}</b><small>${fmt.size(f.size)} · ${f.kind === 'image' ? t('w.rc.image') : 'PDF'}</small></span>
              <em>${f.kind === 'image' ? t('w.rc.openImg') : t('w.rc.openPdf')} ${icon('right', 14)}</em>
            </button>`)}
          <p class="w-note">${icon('zoom', 16)} ${t('w.rc.hint')}</p>
        </div>`;
    }

    // ---------- sheets / overlays ----------
    function sheetView() {
      const s = W.sheet; if (!s) return '';
      let inner;
      if (s.k === 'type') {
        inner = html`<h2>${t('w.form.type')}</h2><ul class="w-opts" role="listbox">${store.TYPES.map((k) => html`<li><button type="button" role="option" aria-selected="${W.draft.type === k ? 'true' : 'false'}" class="${W.draft.type === k ? 'on' : ''}" data-act="set-type" data-v="${k}"><span>${typeLabel(k)}</span>${W.draft.type === k ? icon('check', 18) : ''}</button></li>`)}</ul>`;
      } else if (s.k === 'upload') {
        inner = html`<h2>${t('w.up.title')}</h2><p class="w-sheet-sub">${t('w.up.sub')}</p>
          <button type="button" class="w-act" data-act="in-pdf"><span class="w-ico-sq">${icon('file', 20)}</span>${t('w.up.pdf')}</button>
          <button type="button" class="w-act" data-act="in-gallery"><span class="w-ico-sq">${icon('image', 20)}</span>${t('w.up.gallery')}</button>
          <button type="button" class="w-act" data-act="in-camera"><span class="w-ico-sq">${icon('camera', 20)}</span>${t('w.up.camera')}</button>
          <button type="button" class="w-btn ghost" data-act="close-sheet">${t('common.cancel')}</button>`;
      } else if (s.render) {
        inner = s.render();
      } else if (s.k === 'confirm') {
        inner = html`<h2>${s.title}</h2><p class="w-sheet-sub">${s.msg}</p>
          <div class="w-btns"><button type="button" class="w-btn ghost" data-act="close-sheet">${t('common.cancel')}</button><button type="button" class="w-btn ${s.danger ? 'danger' : 'primary'}" data-act="confirm-ok">${s.ok}</button></div>`;
      }
      return html`<div class="w-scrim" data-act="close-sheet"></div><div class="w-sheet ${s.k}" role="dialog" aria-modal="true"><i class="w-grab"></i>${inner}</div>`;
    }

    function bannerView() {
      const b = W.banner; if (!b) return '';
      return html`<button type="button" class="w-banner ${b.kind}" data-act="${b.act || 'open'}" data-id="${b.id || ''}">${icon(b.kind === 'ok' ? 'check' : b.kind === 'bad' ? 'x' : 'bell', 18)}<span><b>${b.title}</b><small>${b.msg}</small></span></button>`;
    }

    // ---------- render ----------
    function render(resetScroll) {
      const prev = view.querySelector('.w-body');
      const keep = prev && !resetScroll ? prev.scrollTop : 0;
      const s = cur().s;
      const gate = (BS.workerExt || []).map((x) => x.gate && x.gate(api)).find(Boolean);
      if (gate) { view.className = 'w-view s-gate'; view.innerHTML = gate.s; return; }
      const own = { home: homeScreen, form: formScreen, records: recordsScreen, detail: detailScreen, receipts: receiptsScreen }[s];
      const extScreen = (BS.workerExt || []).map((x) => x.screens && x.screens[s]).find(Boolean);
      const screen = own ? own() : extScreen ? extScreen(api) : homeScreen();
      view.className = 'w-view s-' + s;
      view.innerHTML = html`${screen}${sheetView()}${bannerView()}`.s;
      const body = view.querySelector('.w-body'); if (body) body.scrollTop = keep;
      const first = view.querySelector('.w-sheet button'); if (first && W.sheet) first.focus();
    }

    const toast = (m, k) => BS.toast(root, m, k);
    function showBanner(b) { W.banner = b; render(); clearTimeout(showBanner._t); showBanner._t = setTimeout(() => { W.banner = null; render(); }, 5000); }

    // ---------- file handling ----------
    function readFile(file) {
      return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    }
    function downscale(dataUrl, max = 900) {
      return new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => res(null);
        img.src = dataUrl;
      });
    }
    async function addFiles(list) {
      W.sheet = null;
      let room = store.MAX_FILES - W.draft.files.length; let skipped = 0, big = 0, bad = 0;
      for (const f of Array.from(list)) {
        if (room <= 0) { skipped++; continue; }
        const isImg = f.type.startsWith('image/'), isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        if (!isImg && !isPdf) { bad++; continue; }
        if (f.size > 10 * 1048576) { big++; continue; }
        try {
          const raw0 = await readFile(f);
          let src = null;
          if (isImg) { src = await downscale(raw0); if (!src) { bad++; continue; } } else if (f.size <= 600 * 1024) src = raw0;
          W.draft.files.push({ id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: f.name, size: f.size, kind: isImg ? 'image' : 'pdf', src });
          room--;
        } catch (e) { bad++; }
      }
      W.errors.files = null; render();
      if (skipped) toast(t('w.err.max'), 'warn'); else if (big) toast(t('w.err.big'), 'warn'); else if (bad) toast(t('w.err.type'), 'warn');
    }
    ['gallery', 'camera', 'pdf'].forEach((k) => {
      const el = root.querySelector(`[data-role=in-${k}]`);
      el.addEventListener('change', () => { if (el.files.length) addFiles(el.files); el.value = ''; });
    });

    // ---------- submit ----------
    function validate() {
      const d = W.draft; const e = {};
      if (!d.type) e.type = 'w.err.type.req';
      const n = Number(d.amountStr);
      if (!d.amountStr || !/^\d+(\.\d{1,2})?$/.test(d.amountStr)) e.amount = 'w.err.amt.req';
      else if (Math.round(n * 100) <= 0) e.amount = 'w.err.amt.zero';
      else if (Math.round(n * 100) > store.MAX_AMOUNT_CENTS) e.amount = 'w.err.amt.max';
      if (!d.files.length) e.files = 'w.err.files.req';
      return e;
    }
    function submit() {
      W.errors = validate();
      if (Object.keys(W.errors).length) { render(); const f = view.querySelector('.w-field.err'); if (f) f.scrollIntoView({ block: 'center' }); return; }
      const d = W.draft;
      const { claim, persisted } = store.create({ type: d.type, amountCents: Math.round(Number(d.amountStr) * 100), note: d.note, files: d.files, resubmitOf: d.resubmitOf });
      W.draft = newDraft(); W.errors = {};
      W.stack = [{ s: 'home' }, { s: 'records' }, { s: 'detail', id: claim.id }]; W.filter = 'all'; render(true);
      toast(persisted ? t('w.toast.submitted') : t('w.toast.notSaved'), persisted ? 'ok' : 'warn');
    }

    // ---------- events ----------
    root.addEventListener('input', (e) => {
      const r = e.target.dataset && e.target.dataset.role;
      if (r === 'amount') {
        let v = e.target.value.replace(/[^\d.]/g, ''); const i = v.indexOf('.');
        if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
        v = v.replace(/^0+(?=\d)/, '').slice(0, 9);
        if (v !== e.target.value) e.target.value = v;
        W.draft.amountStr = v;
        if (W.errors.amount) { W.errors.amount = null; e.target.closest('.w-field').classList.remove('err'); const s = e.target.closest('.w-field').querySelector('.w-err'); if (s) s.remove(); }
      } else if (r === 'note') W.draft.note = e.target.value;
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (root.querySelector('.lightbox')) return; if (W.sheet) { W.sheet = null; render(); } }
    });

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
      const a = b.dataset.act, id = b.dataset.id;
      switch (a) {
        case 'back': back(); break;
        case 'inert': toast(t('w.toast.inert')); break;
        case 'tab-home': W.stack = [{ s: 'home' }]; W.sheet = null; render(true); break;
        case 'open-reimb': W.stack = [{ s: 'home' }, { s: 'form' }]; render(true); break;
        case 'new': W.stack = [{ s: 'home' }, { s: 'form' }]; render(true); break;
        case 'records': {
          const cur0 = cur();
          if (cur0.s === 'detail') { W.stack = [{ s: 'home' }, { s: 'records' }]; render(true); } else push('records');
          break;
        }
        case 'filter': W.filter = b.dataset.f; render(); break;
        case 'open': W.banner = null; if (cur().s === 'detail' && cur().id === id) render(); else push('detail', { id }); break;
        case 'receipts': push('receipts', { id }); break;
        case 'view-file': { const c = store.get(id); const f = c && c.files.find((x) => x.id === b.dataset.fid); if (f) BS.openReceipt(root, f, c, W.lang); break; }
        case 'view-draft-file': { const f = W.draft.files.find((x) => x.id === id); if (f) BS.openReceipt(root, f, { type: W.draft.type || 'other', amountCents: 0, id: 'draft' }, W.lang); break; }
        case 'pick-type': W.sheet = { k: 'type' }; render(); break;
        case 'set-type': W.draft.type = b.dataset.v; W.errors.type = null; W.sheet = null; render(); break;
        case 'pick-upload': W.sheet = { k: 'upload' }; render(); break;
        case 'in-gallery': case 'in-camera': case 'in-pdf': root.querySelector(`[data-role=${a}]`).click(); break;
        case 'rm-file': W.draft.files = W.draft.files.filter((x) => x.id !== id); render(); break;
        case 'close-sheet': W.sheet = null; render(); break;
        case 'confirm-ok': { const fn = W.sheet && W.sheet.then; W.sheet = null; render(); if (fn) fn(); break; }
        case 'submit': submit(); break;
        case 'withdraw':
          W.sheet = { k: 'confirm', title: t('w.wd.title'), msg: t('w.wd.msg'), ok: t('w.det.withdraw'), danger: true, then: () => {
            const r = store.withdraw(id);
            if (r.ok) toast(t('w.toast.withdrawn')); else toast(t('w.toast.already', { s: t('w.status.' + r.status) }), 'warn');
            render();
          } };
          render(); break;
        case 'resubmit': {
          const c = store.get(id); if (!c) break;
          const start = () => { W.draft = newDraft(c); W.errors = {}; W.stack = [{ s: 'home' }, { s: 'form' }]; render(true); toast(t('w.toast.reattach'), 'warn'); };
          if (draftDirty()) { W.sheet = { k: 'confirm', title: t('w.replaceTitle'), msg: t('w.replaceMsg'), ok: t('w.replace'), danger: false, then: start }; render(); } else start();
          break;
        }
        default: (BS.workerExt || []).some((x) => x.onClick && x.onClick(a, b, api));
      }
    });

    // ---------- store events (admin decisions arrive here) ----------
    store.subscribe((evt) => {
      const c = evt.id && store.get(evt.id);
      if (c && c.applicant.empNo === BS.ME.empNo && (evt.type === 'approved' || evt.type === 'rejected')) {
        showBanner({ kind: evt.type === 'approved' ? 'ok' : 'bad', id: c.id, title: t(evt.type === 'approved' ? 'w.nt.approved' : 'w.nt.rejected'), msg: `${typeLabel(c.type)} ${fmt.money(c.amountCents)} · ${c.id}` });
      } else render();
    });

    // feature modules (e.g. leave balances) plug in extra screens, click handlers and store listeners
    const api = {
      root, W, t, html, icon, fmt, header, tag, render, toast, showBanner, pop,
      tabbar, cur, push, go(stack) { W.stack = stack; W.sheet = null; render(true); },
      get lang() { return W.lang; },
    };
    (BS.workerExt || []).forEach((x) => x.init && x.init(api));
    (BS.workerExt || []).forEach((x) => (x.stores || []).forEach((st) => st.subscribe((evt) => (x.onStore ? x.onStore(evt, api) : render()))));

    render(true);
    return {
      setLang(l) { W.lang = l; render(); },
      get lang() { return W.lang; },
      reset() { W.stack = [{ s: 'home' }]; W.sheet = null; W.draft = newDraft(); W.errors = {}; W.filter = 'all'; W.banner = null; render(true); },
      toast,
    };
  };
})(window.BS);
