/* Admin module: 租户管理 → 租户列表 (create / edit / enable / disable) and 订阅记录 (list, create, renew, detail, adjust seats, cancel). */
(function (BS) {
  const { html, icon, fmt } = BS;
  const tn = BS.tenant;
  const PAGE_T = 10, PAGE_S = 20;
  const TF = { kw: '', status: '' }, SF = { kw: '', status: '', from: '', to: '' };
  const money = (c) => 'S$ ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const numOnly = (v, dec) => { let s = String(v).replace(dec ? /[^\d.]/g : /\D/g, ''); if (dec) { const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '').slice(0, 2); } return s.replace(/^0+(?=\d)/, '').slice(0, 9); };

  function readFile(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  function squareLogo(dataUrl, size = 128) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); const k = Math.max(size / img.width, size / img.height); const w = img.width * k, h = img.height * k; g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h); res(c.toDataURL('image/png')); };
      img.onerror = () => res(null); img.src = dataUrl;
    });
  }

  BS.tenantParts = BS.tenantParts || {};

  // =====================================================================================
  BS.tenantParts.tenants = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
    const T = { draft: { ...TF }, applied: { ...TF }, page: 1, modal: null };
    const lang = () => ctx.lang();
    const avatar = (x, cls = '') => (x.logo ? html`<img class="tn-av ${cls}" alt="" src="${x.logo}">` : html`<i class="tn-av c${x.color % 8} ${cls}">${x.name.trim().slice(0, 1).toUpperCase()}</i>`);
    const tag = (s) => html`<span class="a-tag ${s === 'active' ? 'approved' : 'withdrawn'}">${t('t.st.' + s)}</span>`;
    const rows = () => { const f = T.applied, kw = f.kw.trim().toLowerCase(); return tn.tenants().filter((x) => (!kw || x.name.toLowerCase().includes(kw) || x.account.toLowerCase().includes(kw) || x.customerId.toLowerCase().includes(kw)) && (!f.status || x.status === f.status)); };

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / PAGE_T)); if (T.page > pages) T.page = pages;
      const slice = all.slice((T.page - 1) * PAGE_T, T.page * PAGE_T); const d = T.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('t.title')}</h1><p class="a-sub">${t('t.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn primary" data-act="tn-new">${icon('plus', 16)} ${t('t.new')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('t.f.kw')}" aria-label="${t('t.f.kw')}"></label>
            <label class="a-in"><select data-f="status" aria-label="${t('t.f.status')}"><option value="">${t('t.f.status')}</option><option value="active" ${d.status === 'active' ? 'selected' : ''}>${t('t.st.active')}</option><option value="disabled" ${d.status === 'disabled' ? 'selected' : ''}>${t('t.st.disabled')}</option></select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="tn-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
          </form>
          <div class="a-tablewrap"><table class="a-table">
            <thead><tr>${['info', 'account', 'total', 'usable', 'expired', 'status', 'created'].map((c) => html`<th class="${['total', 'usable', 'expired'].includes(c) ? 'c-amount' : ''}">${t('t.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((x) => html`<tr>
              <td><span class="tn-info">${avatar(x)}<span><b>${x.name}</b><small>${x.customerId}</small></span></span></td><td class="mute">${x.account}</td>
              <td class="c-amount">${t('t.people', { n: x.total })}</td><td class="c-amount">${t('t.people', { n: x.active })}</td><td class="c-amount ${x.total - x.active ? '' : 'mute'}">${t('t.people', { n: x.total - x.active })}</td>
              <td>${tag(x.status)}</td><td class="mute">${x.createdAt}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="tn-edit" data-id="${x.id}">${t('p.edit')}</button>${x.status === 'active' ? html`<button type="button" class="a-link bad" data-act="tn-toggle" data-id="${x.id}">${t('t.disable')}</button>` : html`<button type="button" class="a-link ok" data-act="tn-toggle" data-id="${x.id}">${t('t.enable')}</button>`}</td></tr>`)
              : html`<tr><td colspan="8" class="a-none">${icon('users', 32)}<p>${t('t.none')}</p></td></tr>`}</tbody>
          </table></div>
          <footer class="a-pager"><span>${t('a.total', { n: all.length })} · ${t('a.perPage', { n: PAGE_T })}</span>
            <nav aria-label="${t('a.pager')}"><button type="button" data-act="tn-page" data-p="${T.page - 1}" ${T.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
            ${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${T.page === i + 1 ? 'on' : ''}" data-act="tn-page" data-p="${i + 1}" aria-current="${T.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`)}
            <button type="button" data-act="tn-page" data-p="${T.page + 1}" ${T.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
        </section>`;
    }

    function editModal() {
      const M = T.modal; const F = M.f; const e = M.errs; const edit = !!M.id;
      const E = (k) => (e[k] ? html`<small class="a-ferr" data-err="${k}">${t('t.e.' + e[k])}</small>` : '');
      const preview = { logo: F.logo, name: F.name || '?', color: edit ? tn.tenant(M.id).color : 7 };
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('t.m.title')}</h2><p>${t('t.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <div class="a-frow"><label class="a-lab">${t('t.m.logo')}</label>
            <div class="tn-logo">${preview.logo ? html`<img class="tn-av lg" alt="" src="${preview.logo}">` : html`<i class="tn-av lg c${preview.color % 8}">${preview.name.trim().slice(0, 1).toUpperCase()}</i>`}
              <div><button type="button" class="a-btn" data-act="tn-logo">${icon('upload', 16)} ${t('t.m.upload')}</button> ${preview.logo ? html`<button type="button" class="a-link bad" data-act="tn-logo-rm">${t('t.m.remove')}</button>` : ''}
                <small class="a-fhint">${t('t.m.logoHint1')}<br>${t('t.m.logoHint2')}</small>${E('logo')}</div>
              <input type="file" hidden data-role="logo-in" accept="image/png,image/jpeg,image/svg+xml"></div></div>
          <div class="a-frow"><label class="a-lab" for="tn-name"><b class="req">*</b> ${t('t.m.name')}</label><input id="tn-name" class="a-field" data-t="name" maxlength="60" value="${F.name}" placeholder="${t('t.m.namePh')}">${E('name')}</div>
          <div class="a-frow"><label class="a-lab" for="tn-acc"><b class="req">*</b> ${t('t.m.account')}</label><input id="tn-acc" class="a-field" data-t="account" maxlength="30" autocomplete="off" value="${F.account}" placeholder="${t('t.m.accountPh')}">${E('account')}</div>
          <div class="a-frow"><label class="a-lab" for="tn-pw">${edit ? '' : html`<b class="req">*</b> `}${t('t.m.password')}</label>
            <div class="a-field l-amt"><input id="tn-pw" type="${M.showPw ? 'text' : 'password'}" data-t="password" autocomplete="new-password" value="${F.password}" placeholder="${t('t.m.passwordPh')}"><button type="button" class="a-link" data-act="tn-pw-toggle">${M.showPw ? t('t.m.hide') : t('t.m.show')}</button></div>
            ${e.password ? E('password') : html`<small class="a-fhint">${edit ? t('t.m.pwEdit') : t('t.m.pwRule')}</small>`}</div>
          <div class="a-frow"><label class="a-lab" for="tn-st"><b class="req">*</b> ${t('t.m.status')}</label><select id="tn-st" class="a-field" data-t="status"><option value="active" ${F.status === 'active' ? 'selected' : ''}>${t('t.st.active')}</option><option value="disabled" ${F.status === 'disabled' ? 'selected' : ''}>${t('t.st.disabled')}</option></select></div>
          <div class="a-frow"><label class="a-lab">${t('t.m.modules')}</label><div class="tn-mods">${tn.MODULES.map((m) => html`<label class="p-check"><input type="checkbox" data-tmod="${m.id}" ${F.modules.includes(m.id) ? 'checked' : ''} ${!m.ready && !F.modules.includes(m.id) ? 'disabled' : ''}> ${ctx.lang() === 'zh' ? m.zh : m.en}${m.ready ? '' : html` <small class="a-fhint">${t('t.m.modSoon')}</small>`}</label>`)}</div><small class="a-fhint">${t('t.m.modHint')}</small></div>
          <p class="l-audit">${icon('shield', 14)} ${t('t.m.protoPw')}</p>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="tn-save">${edit ? t('p.m.save') : t('t.m.create')}</button></footer>
      </div></div>`;
    }
    function toggleModal() {
      const M = T.modal; const x = tn.tenant(M.id); if (!x) return ''; const off = M.to === 'disabled';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop>
        <header><h2>${off ? t('t.c.offTitle', { name: x.name }) : t('t.c.onTitle', { name: x.name })}</h2><p>${off ? t('t.c.offMsg') : t('t.c.onMsg')}</p></header>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn ${off ? 'bad' : 'primary'}" data-act="tn-toggle-ok">${off ? t('t.disable') : t('t.enable')}</button></footer></div></div>`;
    }

    async function pickLogo(file) {
      const M = T.modal; if (!M || M.k !== 'edit') return; M.errs.logo = null;
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) { M.errs.logo = 'logo_type'; render(); return; }
      if (file.size > 2 * 1048576) { M.errs.logo = 'logo_big'; render(); return; }
      try {
        const raw = await readFile(file);
        if (file.type === 'image/svg+xml') { if (file.size > 150 * 1024) { M.errs.logo = 'logo_svg'; render(); return; } M.f.logo = raw; }
        else { const sq = await squareLogo(raw); if (!sq) { M.errs.logo = 'logo_type'; render(); return; } M.f.logo = sq; }
      } catch (e) { M.errs.logo = 'logo_type'; }
      render();
    }
    function save() {
      const M = T.modal; const r = tn.saveTenant(M.f, M.id);
      if (!r.ok) { M.errs = r.errors; render(); const el = ctx.view().querySelector('.a-ferr'); if (el) { const inp = el.closest('.a-frow').querySelector('input,select'); if (inp) inp.focus(); } return; }
      T.modal = null; render(); toast(t(M.id ? 't.toast.saved' : 't.toast.created', { name: r.tenant.name }), 'ok');
      if (!r.persisted) toast(t('l.toast.notSaved'), 'warn');
    }

    return {
      tab: 'tenants',
      crumbs() { return [{ text: t('a.nav.tenant'), act: 'noop' }, { text: t('t.tab.tenants') }]; },
      page,
      modal() { const M = T.modal; return !M ? '' : M.k === 'edit' ? editModal() : toggleModal(); },
      afterRender(view) { const M = T.modal; if (!M || M.focused) return; M.focused = true; const el = view.querySelector(M.k === 'edit' ? '#tn-name' : '.a-modal .a-btn'); if (el) el.focus(); },
      onInput(e) {
        const el = e.target, view = ctx.view(), M = T.modal;
        if (el.dataset.f) { T.draft[el.dataset.f] = el.value; return; }
        if (M && M.k === 'edit' && el.dataset.t) {
          const k = el.dataset.t; M.f[k] = el.value; if (M.errs[k]) { M.errs[k] = null; view.querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
          if (k === 'name' && !M.f.logo) { const i = view.querySelector('.tn-logo i.tn-av'); if (i) i.textContent = (el.value.trim().slice(0, 1) || '?').toUpperCase(); }
        }
      },
      onChange(e) { const mod = e.target.dataset && e.target.dataset.tmod; if (mod && T.modal && T.modal.k === 'edit') { const f = T.modal.f; f.modules = e.target.checked ? [...new Set([...f.modules, mod])] : f.modules.filter((x) => x !== mod); render(); return; } if (e.target.dataset && e.target.dataset.role === 'logo-in' && e.target.files[0]) { pickLogo(e.target.files[0]); e.target.value = ''; } },
      onSubmit() { T.applied = { ...T.draft }; T.page = 1; render(); },
      onEscape() { if (T.modal) { T.modal = null; render(); return true; } return false; },
      onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id;
        switch (a) {
          case 'noop': break;
          case 'tn-reset': T.draft = { ...TF }; T.applied = { ...TF }; T.page = 1; render(); break;
          case 'tn-page': { const p = +b.dataset.p; if (p >= 1) { T.page = p; render(); } break; }
          case 'tn-new': T.modal = { k: 'edit', id: null, f: { name: '', account: '', password: '', status: 'active', logo: null, modules: [] }, errs: {}, showPw: false }; render(); break;
          case 'tn-edit': { const x = tn.tenant(id); T.modal = { k: 'edit', id, f: { name: x.name, account: x.account, password: '', status: x.status, logo: x.logo, modules: (x.modules || []).slice() }, errs: {}, showPw: false }; render(); break; }
          case 'tn-save': save(); break;
          case 'tn-logo': ctx.view().querySelector('[data-role=logo-in]').click(); break;
          case 'tn-logo-rm': T.modal.f.logo = null; render(); break;
          case 'tn-pw-toggle': T.modal.showPw = !T.modal.showPw; render(); break;
          case 'tn-toggle': { const x = tn.tenant(id); T.modal = { k: 'toggle', id, to: x.status === 'active' ? 'disabled' : 'active' }; render(); break; }
          case 'tn-toggle-ok': { const M = T.modal; tn.setStatus(M.id, M.to); const x = tn.tenant(M.id); T.modal = null; render(); toast(t(M.to === 'disabled' ? 't.toast.off' : 't.toast.on', { name: x.name }), 'ok'); break; }
          case 'close-modal': T.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { T.draft = { ...TF }; T.applied = { ...TF }; T.page = 1; T.modal = null; },
    };
  };

  // =====================================================================================
  BS.tenantParts.subs = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
    const S = { view: 'list', id: null, draft: { ...SF }, applied: { ...SF }, page: 1, modal: null, all: { renewals: false, seats: false } };
    const by = (k) => t('t.by.' + k);
    const stTag = (s) => html`<span class="a-tag sub-${s}">${t('t.sst.' + s)}</span>`;
    const rows = () => {
      const f = S.applied, kw = f.kw.trim().toLowerCase();
      return tn.subs().map((s) => ({ s, tn: tn.tenant(s.tenantId) })).filter(({ s, tn: x }) => x
        && (!kw || x.name.toLowerCase().includes(kw) || x.customerId.toLowerCase().includes(kw))
        && (!f.status || tn.subStatus(s) === f.status) && (!f.from || s.end >= f.from) && (!f.to || s.start <= f.to))
        .sort((a, b) => b.s.start.localeCompare(a.s.start) || a.tn.customerId.localeCompare(b.tn.customerId));
    };

    // ---------- list ----------
    function list() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / PAGE_S)); if (S.page > pages) S.page = pages;
      const slice = all.slice((S.page - 1) * PAGE_S, S.page * PAGE_S); const d = S.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('t.s.title')}</h1><p class="a-sub">${t('t.s.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn primary" data-act="sub-new">${icon('plus', 16)} ${t('t.s.new')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('t.s.f.kw')}" aria-label="${t('t.s.f.kw')}"></label>
            <label class="a-in"><select data-f="status" aria-label="${t('t.s.f.status')}"><option value="">${t('t.s.f.status')}</option>${['active', 'upcoming', 'soon', 'expired', 'cancelled'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('t.sst.' + k)}</option>`)}</select></label>
            <span class="a-in a-range"><input type="date" data-f="from" value="${d.from}" aria-label="${t('t.s.f.from')}"><i>–</i><input type="date" data-f="to" value="${d.to}" aria-label="${t('t.s.f.to')}"></span>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="sub-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
          </form>
          <div class="a-tablewrap"><table class="a-table">
            <thead><tr>${['cid', 'name', 'price', 'start', 'end', 'status'].map((c) => html`<th class="${c === 'price' ? 'c-amount' : ''}">${t('t.s.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map(({ s, tn: x }) => html`<tr>
              <td class="mute">${x.customerId}</td><td><b>${x.name}</b></td><td class="c-amount"><b>${money(s.priceCents)}</b></td><td>${s.start}</td><td>${s.end}</td><td>${stTag(tn.subStatus(s))}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="sub-open" data-id="${s.tenantId}">${t('t.s.view')}</button><button type="button" class="a-link" data-act="sub-renew" data-id="${s.tenantId}">${t('t.s.renew')}</button></td></tr>`)
              : html`<tr><td colspan="7" class="a-none">${icon('wallet', 32)}<p>${t('t.s.none')}</p></td></tr>`}</tbody>
          </table></div>
          <footer class="a-pager"><span>${t('a.total', { n: all.length })} · ${t('t.s.perPage', { n: PAGE_S })}</span>
            <nav aria-label="${t('a.pager')}"><button type="button" data-act="sub-page" data-p="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
            ${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${S.page === i + 1 ? 'on' : ''}" data-act="sub-page" data-p="${i + 1}" aria-current="${S.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`)}
            <button type="button" data-act="sub-page" data-p="${S.page + 1}" ${S.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
        </section>`;
    }

    // ---------- detail ----------
    function detail() {
      const x = tn.tenant(S.id), s = tn.sub(S.id);
      if (!x || !s) return html`<button type="button" class="a-btn" data-act="sub-back">${icon('back', 16)} ${t('a.back')}</button><p class="a-none">${t('t.s.missing')}</p>`;
      const st = tn.subStatus(s); const used = tn.used(x.id); const left = s.seats - used; const dead = st === 'expired' || st === 'cancelled';
      const ren = S.all.renewals ? s.renewals : s.renewals.slice(0, 3), seg = S.all.seats ? s.seatLog : s.seatLog.slice(0, 3);
      const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v}</dd></div>`;
      return html`
        <div class="a-dhead"><button type="button" class="a-btn" data-act="sub-back">${icon('back', 16)} ${t('a.back')}</button>
          <div><h1 class="a-h1">${t('t.d.title')}</h1><p class="a-sub">${t('t.d.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn" data-act="sub-seats" data-id="${x.id}" ${dead ? 'disabled' : ''} title="${dead ? t('t.d.seatsOff') : ''}">${t('t.d.adjust')}</button>
            <button type="button" class="a-btn primary" data-act="sub-renew" data-id="${x.id}">${t('t.s.renew')}</button>
            ${dead ? '' : html`<button type="button" class="a-btn bad-o" data-act="sub-cancel" data-id="${x.id}">${t('t.d.cancel')}</button>`}</div></div>
        <section class="a-card a-pad"><div class="tn-basic-h"><h2 class="a-h2">${icon('clip', 18)} ${t('t.d.basic')}</h2>${stTag(st)}${st === 'soon' ? html`<small class="a-fhint">${t('t.d.daysLeft', { n: tn.daysLeft(s) })}</small>` : ''}</div>
          <dl class="a-dl tn-dl">${kv('t.s.col.cid', x.customerId)}${kv('t.s.col.name', x.name)}${kv('t.s.col.price', money(s.priceCents))}${kv('t.d.seats', t('t.people', { n: s.seats }))}
            ${kv('t.s.col.start', s.start)}${kv('t.d.end', s.end)}${kv('t.d.used', t('t.people', { n: used }))}${kv('t.d.left', html`<span class="${left < 0 ? 'neg' : ''}">${t('t.people', { n: left })}</span>`)}</dl>
          ${s.note ? html`<p class="a-fhint tn-note">${t('t.d.note')}：${s.note}</p>` : ''}</section>
        <section class="a-card a-pad"><div class="tn-sec-h"><div><h2 class="a-h2">${icon('refresh', 18)} ${t('t.d.renewals')}</h2><small class="a-fhint">${t('t.d.renewalsSub')}</small></div>${s.renewals.length > 3 ? html`<button type="button" class="a-link" data-act="sub-all" data-w="renewals">${S.all.renewals ? t('t.d.less') : t('t.d.all')}</button>` : ''}</div>
          ${ren.length ? html`<div class="a-tablewrap"><table class="a-table"><thead><tr>${['at', 'from', 'to', 'by', 'note'].map((c) => html`<th>${t('t.d.col.' + c)}</th>`)}</tr></thead><tbody>${ren.map((r) => html`<tr><td class="mute">${r.at}</td><td>${r.from}</td><td><b>${r.to}</b></td><td>${by(r.by)}</td><td>${r.note || '—'}</td></tr>`)}</tbody></table></div>` : html`<p class="a-fhint">${t('t.d.noRenewals')}</p>`}</section>
        <section class="a-card a-pad"><div class="tn-sec-h"><div><h2 class="a-h2">${icon('users', 18)} ${t('t.d.seatLog')}</h2><small class="a-fhint">${t('t.d.seatLogSub')}</small></div>${s.seatLog.length > 3 ? html`<button type="button" class="a-link" data-act="sub-all" data-w="seats">${S.all.seats ? t('t.d.less') : t('t.d.all')}</button>` : ''}</div>
          ${seg.length ? html`<div class="a-tablewrap"><table class="a-table"><thead><tr>${['at', 'before', 'after', 'delta', 'by', 'note'].map((c) => html`<th>${t('t.d.col.' + c)}</th>`)}</tr></thead><tbody>${seg.map((r) => { const dd = r.after - r.before; return html`<tr><td class="mute">${r.at}</td><td>${t('t.people', { n: r.before })}</td><td><b>${t('t.people', { n: r.after })}</b></td><td class="l-delta ${dd < 0 ? 'neg' : 'pos'}">${dd > 0 ? '+' : '−'}${Math.abs(dd)} ${t('t.ppl')}</td><td>${by(r.by)}</td><td>${r.note || '—'}</td></tr>`; })}</tbody></table></div>` : html`<p class="a-fhint">${t('t.d.noSeatLog')}</p>`}</section>`;
    }

    // ---------- dialogs ----------
    const E = (M, k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('t.e.' + M.errs[k], M.errP || {})}</small>` : '');
    const infoGrid = (x, s) => html`<dl class="a-sum"><div><dt>${t('t.s.col.cid')}</dt><dd>${x.customerId}</dd></div><div><dt>${t('t.s.col.name')}</dt><dd>${x.name}</dd></div><div><dt>${t('t.s.col.status')}</dt><dd>${stTag(tn.subStatus(s))}</dd></div><div><dt>${t('t.s.col.start')}</dt><dd>${s.start}</dd></div><div><dt>${t('t.r.curEnd')}</dt><dd>${s.end}</dd></div><div><dt>${t('t.d.seats')}</dt><dd>${t('t.people', { n: s.seats })}</dd></div></dl>`;

    function createModal() {
      const M = S.modal; const F = M.f; const avail = tn.tenants().filter((x) => !tn.sub(x.id));
      const total = (/^\d+$/.test(F.seats) && /^\d+(\.\d{1,2})?$/.test(F.price)) ? Math.round(+F.seats * Number(F.price) * 100) : null;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('t.c.title')}</h2><p>${t('t.c.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <div class="a-frow"><label class="a-lab" for="sb-t"><b class="req">*</b> ${t('t.c.tenant')}</label>
            <select id="sb-t" class="a-field" data-s="tenantId"><option value="">${t('t.c.tenantPh')}</option>${avail.map((x) => html`<option value="${x.id}" ${F.tenantId === x.id ? 'selected' : ''}>${x.name} · ${x.customerId}</option>`)}</select>
            ${M.errs.tenantId ? E(M, 'tenantId') : avail.length ? '' : html`<small class="a-fhint">${t('t.c.allHave')}</small>`}</div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="sb-q"><b class="req">*</b> ${t('t.c.seats')}</label><div class="a-field l-amt"><input id="sb-q" data-s="seats" inputmode="numeric" value="${F.seats}" placeholder="${t('t.c.seatsPh')}"><span>${t('t.ppl')}</span></div>${E(M, 'seats')}</div>
            <div class="a-frow"><label class="a-lab" for="sb-p"><b class="req">*</b> ${t('t.c.price')}</label><div class="a-field l-amt"><span>S$</span><input id="sb-p" data-s="price" inputmode="decimal" value="${F.price}" placeholder="${t('t.c.pricePh')}"></div>${E(M, 'price')}</div></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="sb-s"><b class="req">*</b> ${t('t.s.col.start')}</label><input id="sb-s" type="date" class="a-field" data-s="start" value="${F.start}">${E(M, 'start')}</div>
            <div class="a-frow"><label class="a-lab" for="sb-e"><b class="req">*</b> ${t('t.s.col.end')}</label><input id="sb-e" type="date" class="a-field" data-s="end" value="${F.end}">${E(M, 'end')}</div></div>
          <div class="a-frow"><label class="a-lab">${t('t.c.total')}</label><div class="a-field ro tn-total" data-role="total">${total == null ? t('t.c.totalPh') : money(total)}</div><small class="a-fhint">${t('t.c.totalHint')}</small></div>
          <div class="a-frow"><label class="a-lab" for="sb-n">${t('t.m.note')}</label><textarea id="sb-n" class="a-field" data-s="note" rows="2" maxlength="200" placeholder="${t('t.c.notePh')}">${F.note}</textarea></div>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sub-create-ok">${t('t.m.create')}</button></footer>
      </div></div>`;
    }
    function renewModal() {
      const M = S.modal; const x = tn.tenant(M.id), s = tn.sub(M.id); if (!x || !s) return '';
      const reactivate = tn.subStatus(s) === 'cancelled';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('t.r.title')}</h2><p>${t('t.r.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><h3 class="lv-h3">${icon('clip', 16)} ${t('t.r.basic')}</h3>${infoGrid(x, s)}
          ${reactivate ? html`<p class="p-warnbox">${icon('warn', 16)} ${t('t.r.reactivate')}</p>` : ''}
          <div class="a-frow"><label class="a-lab" for="rn-e"><b class="req">*</b> ${t('t.r.newEnd')}</label><input id="rn-e" type="date" class="a-field" data-r="end" value="${M.f.end}" min="${tn.addDays(s.end > BS.fmt.now().slice(0, 10) && !s.cancelledAt ? s.end : BS.fmt.now().slice(0, 10), 1)}">${E(M, 'end')}</div>
          <div class="a-frow"><label class="a-lab" for="rn-n">${t('t.m.note')}</label><textarea id="rn-n" class="a-field" data-r="note" rows="2" maxlength="200" placeholder="${t('t.r.notePh')}">${M.f.note}</textarea>${E(M, 'note')}</div>
          <p class="l-audit">${icon('shield', 14)} ${t('t.r.hint')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sub-renew-ok">${t('t.r.ok')}</button></footer>
      </div></div>`;
    }
    function seatsPreview(M, s) {
      const n = M.f.seats; if (!/^\d+$/.test(n)) return t('t.a.previewIdle'); const d = +n - s.seats;
      return d === 0 ? t('t.a.same') : t('t.a.preview', { a: s.seats, b: +n, d: Math.abs(d), w: d > 0 ? t('t.a.inc') : t('t.a.dec') });
    }
    function seatsModal() {
      const M = S.modal; const x = tn.tenant(M.id), s = tn.sub(M.id); if (!x || !s) return '';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('t.d.adjust')}</h2><p>${t('t.a.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><h3 class="lv-h3">${icon('clip', 16)} ${t('t.a.info')}</h3>
          <dl class="a-sum"><div><dt>${t('t.s.col.cid')}</dt><dd>${x.customerId}</dd></div><div><dt>${t('t.s.col.name')}</dt><dd>${x.name}</dd></div><div><dt>${t('t.s.col.status')}</dt><dd>${stTag(tn.subStatus(s))}</dd></div><div><dt>${t('t.a.cur')}</dt><dd>${t('t.people', { n: s.seats })}</dd></div><div><dt>${t('t.d.used')}</dt><dd>${t('t.people', { n: tn.used(x.id) })}</dd></div></dl>
          <div class="a-frow"><label class="a-lab" for="sa-n"><b class="req">*</b> ${t('t.a.new')}</label><div class="a-field l-amt"><input id="sa-n" data-a="seats" inputmode="numeric" value="${M.f.seats}"><span>${t('t.ppl')}</span></div>
            ${M.errs.seats ? E(M, 'seats') : html`<small class="a-fhint tn-prev" data-role="prev">${seatsPreview(M, s)}</small>`}</div>
          <div class="a-frow"><label class="a-lab" for="sa-m">${t('t.a.note')}</label><textarea id="sa-m" class="a-field" data-a="note" rows="2" maxlength="200" placeholder="${t('t.a.notePh')}">${M.f.note}</textarea>${E(M, 'note')}</div>
          <p class="l-audit">${icon('shield', 14)} ${t('t.a.hint')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sub-seats-ok">${t('t.a.ok')}</button></footer>
      </div></div>`;
    }
    function cancelModal() {
      const x = tn.tenant(S.modal.id); if (!x) return '';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop>
        <header><h2>${t('t.x.title')}</h2><p>${t('t.x.msg', { name: x.name })}</p></header>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="sub-cancel-ok">${t('t.d.cancel')}</button></footer></div></div>`;
    }

    // ---------- actions ----------
    const ERRMAP = { missing: 'missing', date: 'date', not_later: 'not_later', too_long: 'too_long', note_len: 'note_len' };
    function createSub() {
      const M = S.modal; const r = tn.createSub(M.f);
      if (!r.ok) { M.errs = r.errors; render(); return; }
      const x = tn.tenant(M.f.tenantId); S.modal = null; S.view = 'detail'; S.id = x.id; render(); ctx.scrollTop0(); toast(t('t.toast.subCreated', { name: x.name }), 'ok');
    }
    function renewSub() {
      const M = S.modal; M.errs = {}; const r = tn.renew(M.id, M.f.end, M.f.note);
      if (!r.ok) { M.errs.end = ERRMAP[r.error] || 'date'; M.errP = { d: r.floor || '' }; if (r.error === 'note_len') { M.errs.note = 'note_len'; delete M.errs.end; } render(); return; }
      const x = tn.tenant(M.id); S.modal = null; render(); toast(t(r.was === 'cancelled' ? 't.toast.reactivated' : 't.toast.renewed', { name: x.name, d: M.f.end }), 'ok');
    }
    function adjustSeats() {
      const M = S.modal; M.errs = {}; const r = tn.adjustSeats(M.id, M.f.seats, M.f.note);
      if (!r.ok) {
        const map = { seats: 'seats', same: 'same', below_used: 'below_used', inactive: 'inactive', note_len: 'note_len', missing: 'missing' };
        const k = r.error === 'note_len' ? 'note' : 'seats'; M.errs[k] = map[r.error] || 'seats'; M.errP = { n: r.used }; render(); return;
      }
      const x = tn.tenant(M.id); S.modal = null; render(); toast(t('t.toast.seats', { name: x.name }), 'ok');
    }

    return {
      tab: 'subs',
      crumbs() { return S.view === 'detail' ? [{ text: t('a.nav.tenant'), act: 'noop' }, { text: t('t.tab.subs'), act: 'sub-back' }, { text: t('t.d.title') }] : [{ text: t('a.nav.tenant'), act: 'noop' }, { text: t('t.tab.subs') }]; },
      page() { return S.view === 'detail' ? detail() : list(); },
      modal() { const M = S.modal; return !M ? '' : M.k === 'create' ? createModal() : M.k === 'renew' ? renewModal() : M.k === 'seats' ? seatsModal() : cancelModal(); },
      afterRender(view) { const M = S.modal; if (!M || M.focused) return; M.focused = true; const el = view.querySelector(M.k === 'create' ? '#sb-t' : M.k === 'renew' ? '#rn-e' : M.k === 'seats' ? '#sa-n' : '.a-modal .a-btn'); if (el) el.focus(); },
      onInput(e) {
        const el = e.target, view = ctx.view(), M = S.modal;
        if (el.dataset.f) { S.draft[el.dataset.f] = el.value; return; }
        if (!M) return;
        const clear = (k) => { if (M.errs[k]) { M.errs[k] = null; view.querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } };
        if (M.k === 'create' && el.dataset.s) {
          const k = el.dataset.s; let v = el.value;
          if (k === 'seats') { v = numOnly(v, false); if (v !== el.value) el.value = v; } else if (k === 'price') { v = numOnly(v, true); if (v !== el.value) el.value = v; }
          M.f[k] = v; clear(k);
          const tot = view.querySelector('[data-role=total]'); if (tot) { const ok = /^\d+$/.test(M.f.seats) && /^\d+(\.\d{1,2})?$/.test(M.f.price); tot.textContent = ok ? money(Math.round(+M.f.seats * Number(M.f.price) * 100)) : t('t.c.totalPh'); }
        } else if (M.k === 'renew' && el.dataset.r) { M.f[el.dataset.r] = el.value; clear(el.dataset.r === 'end' ? 'end' : 'note'); }
        else if (M.k === 'seats' && el.dataset.a) {
          const k = el.dataset.a; let v = el.value; if (k === 'seats') { v = numOnly(v, false); if (v !== el.value) el.value = v; }
          M.f[k] = v; clear(k === 'seats' ? 'seats' : 'note');
          if (k === 'seats') { const p = view.querySelector('[data-role=prev]'); if (p) p.textContent = seatsPreview(M, tn.sub(M.id)); else { render(); } }
        }
      },
      onSubmit() { S.applied = { ...S.draft }; S.page = 1; render(); },
      onEscape() { if (S.modal) { S.modal = null; render(); return true; } return false; },
      onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id;
        switch (a) {
          case 'noop': break;
          case 'sub-reset': S.draft = { ...SF }; S.applied = { ...SF }; S.page = 1; render(); break;
          case 'sub-page': { const p = +b.dataset.p; if (p >= 1) { S.page = p; render(); } break; }
          case 'sub-open': S.view = 'detail'; S.id = id; S.all = { renewals: false, seats: false }; render(); ctx.scrollTop0(); break;
          case 'sub-back': S.view = 'list'; S.id = null; render(); break;
          case 'sub-all': S.all[b.dataset.w] = !S.all[b.dataset.w]; render(); break;
          case 'sub-new': S.modal = { k: 'create', errs: {}, f: { tenantId: '', seats: '', price: '', start: '', end: '', note: '' } }; render(); break;
          case 'sub-create-ok': createSub(); break;
          case 'sub-renew': { const s = tn.sub(id); S.modal = { k: 'renew', id, errs: {}, f: { end: '', note: '' } }; render(); break; }
          case 'sub-renew-ok': renewSub(); break;
          case 'sub-seats': { const s = tn.sub(id); S.modal = { k: 'seats', id, errs: {}, f: { seats: String(s.seats), note: '' } }; render(); break; }
          case 'sub-seats-ok': adjustSeats(); break;
          case 'sub-cancel': S.modal = { k: 'cancel', id }; render(); break;
          case 'sub-cancel-ok': { const x = tn.tenant(S.modal.id); tn.cancelSub(S.modal.id); S.modal = null; render(); toast(t('t.toast.cancelled', { name: x.name }), 'ok'); break; }
          case 'close-modal': S.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { S.view = 'list'; S.id = null; S.draft = { ...SF }; S.applied = { ...SF }; S.page = 1; S.modal = null; S.all = { renewals: false, seats: false }; },
    };
  };
})(window.BS);
