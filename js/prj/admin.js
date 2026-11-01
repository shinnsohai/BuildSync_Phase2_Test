/* Admin: 项目与工区 — project list (edit, extend end date, confirm complete) and site list (address, coordinates, electronic fence, stop, delete). */
(function (BS) {
  const { html, icon, raw, esc } = BS;
  const hr = BS.hr;
  BS.prjParts = BS.prjParts || {};

  // A tiny stand-in for the map search: the design calls Google Maps, which needs a key and a network, so the prototype searches this list.
  const PLACES = [
    ['1 Raffles Place, Singapore 048616', 'Raffles Place · Downtown Core', 1.2840, 103.8515], ['5 Raffles Place, Singapore 048618', 'Raffles Place · Downtown Core', 1.2846, 103.8522],
    ['8 Marina Boulevard, Singapore 018981', 'Marina Bay', 1.2806, 103.8546], ['12 Marina Boulevard, Singapore 018982', 'Marina Bay', 1.2812, 103.8554],
    ['1 Jurong Gateway Rd, Singapore 608549', 'Jurong East', 1.3330, 103.7436], ['3 River Valley Rd, Singapore 179024', 'Clarke Quay · River Valley', 1.2905, 103.8422],
    ['10 Pasir Panjang Rd, Singapore 117438', 'Pasir Panjang', 1.2763, 103.7970], ['1 HarbourFront Walk, Singapore 098585', 'HarbourFront', 1.2652, 103.8222],
    ['20 Tuas Ave 1, Singapore 639497', 'Tuas', 1.3195, 103.6390], ['2 Changi Business Park Central 1, Singapore 486066', 'Changi Business Park', 1.3340, 103.9640],
    ['60 Woodlands Industrial Park E1, Singapore 757718', 'Woodlands', 1.4480, 103.7940], ['1 Punggol Central, Singapore 828694', 'Punggol', 1.4050, 103.9020],
    ['Jalan Kolam Ayer, 80300 Johor Bahru', 'Johor Bahru · Iskandar', 1.4655, 103.7578], ['Jalan Tun Abdul Razak, 80000 Johor Bahru', 'Johor Bahru · Bukit Chagar', 1.4586, 103.7640],
  ];
  const fix6 = (n) => Number(n).toFixed(6);
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

  /** Schematic map: roads and blocks are drawn from the coordinates so moving the pin visibly changes the picture; the circle is the fence. */
  function mapSvg(t, lat, lng, radius) {
    const W = 400, H = 200, cx = W / 2, cy = H / 2;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return `<div class="prj-map-empty">${esc(t('prj.map.none'))}</div>`;
    const r = Math.max(50, Math.min(5000, Number(radius) || 300)); const ppm = Math.min(0.4, 80 / r);
    let h = (Math.floor(lat * 4000) * 73856093) ^ (Math.floor(lng * 4000) * 19349663); const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 1) >>> 0; return (h % 1000) / 1000; };
    const dx = ((lng * 111320 * Math.cos((lat * Math.PI) / 180)) % 90) * 0.8, dy = (lat * 111320) % 90 * 0.8;
    let blocks = ''; for (let i = 0; i < 9; i++) { const x = rnd() * W, y = rnd() * H, w = 24 + rnd() * 50, hh = 16 + rnd() * 34; blocks += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${hh.toFixed(0)}" rx="3" class="blk"/>`; }
    let roads = ''; for (let i = -1; i < 6; i++) roads += `<path d="M${(i * 90 - dx).toFixed(0)} -10 L${(i * 90 - dx + 40).toFixed(0)} ${H + 10}" class="rd"/>`; for (let i = -1; i < 4; i++) roads += `<path d="M-10 ${(i * 70 - dy).toFixed(0)} L${W + 10} ${(i * 70 - dy + 14).toFixed(0)}" class="rd"/>`;
    const bar = Math.round((100 * ppm) * 10) / 10;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('prj.map.alt'))}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" class="bg"/>${blocks}${roads}
      <circle cx="${cx}" cy="${cy}" r="${(r * ppm).toFixed(1)}" class="fence"/><circle cx="${cx}" cy="${cy}" r="4" class="dot"/>
      <path d="M${cx} ${cy - 6} c-9 -14 -13 -19 -13 -26 a13 13 0 0 1 26 0 c0 7 -4 12 -13 26z" class="pin"/><circle cx="${cx}" cy="${cy - 32}" r="5" class="pinh"/>
      <g transform="translate(14 ${H - 16})"><rect x="0" y="0" width="${bar}" height="4" class="sc"/><text x="${bar + 6}" y="5" class="sct">100 m</text></g></svg>`;
  }

  // ---------------- 项目列表 ----------------
  BS.prjParts.projects = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const F0 = () => ({ kw: '', country: '', status: '' });
    const P = { draft: F0(), applied: F0(), page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const country = (k) => (hr.COUNTRIES[k] ? hr.COUNTRIES[k][lang() === 'zh' ? 0 : 1] : k);
    const stTag = (st) => html`<span class="a-tag ${BS.prjTag(st)}">${t('hr.pj.st.' + st)}</span>`;
    const rows = () => { const f = P.applied, kw = f.kw.trim().toLowerCase();
      return hr.projects().filter((p) => BS.perm.inScopeProject(p.key)).filter((p) => (!kw || [p.zh, p.en, p.code, p.city, p.contact].some((x) => String(x).toLowerCase().includes(kw))) && (!f.country || p.country === f.country) && (!f.status || hr.projectStatus(p) === f.status)); };

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 6)); if (P.page > pages) P.page = pages; const slice = all.slice((P.page - 1) * 6, P.page * 6); const d = P.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('prj.p.title')}</h1><p class="a-sub">${t('prj.p.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="pj-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="pj-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('prj.p.kw')}" aria-label="${t('prj.p.kw')}"></label>
            <label class="a-in"><select data-f="country" aria-label="${t('prj.f.country')}"><option value="">${t('prj.f.country')}</option>${Object.keys(hr.COUNTRIES).map((k) => html`<option value="${k}" ${d.country === k ? 'selected' : ''}>${country(k)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('hr.pj.status')}"><option value="">${t('hr.pj.status')}</option>${['upcoming', 'running', 'delayed', 'done'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('hr.pj.st.' + k)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="pj-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['name', 'country', 'city', 'contact', 'sites', 'start', 'end', 'status'].map((c) => html`<th>${t('prj.p.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((p) => { const st = hr.projectStatus(p); return html`<tr><td><b>${loc(p)}</b> <span class="mute">/ ${p.code}</span></td><td>${country(p.country)}</td><td>${p.city}</td><td>${p.contact}</td>
              <td><button type="button" class="a-link" data-act="pj-sites" data-k="${p.key}">${t('prj.p.sitesN', { n: p.sites.length })}</button></td><td class="mute">${p.start}</td><td class="mute">${p.end}</td><td>${stTag(st)}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="pj-edit" data-k="${p.key}">${t('p.edit')}</button>${st === 'delayed' ? html`<button type="button" class="a-link" data-act="pj-end" data-k="${p.key}">${t('prj.p.extend')}</button>` : ''}${st !== 'done' ? html`<button type="button" class="a-link" data-act="pj-done" data-k="${p.key}">${t('prj.p.complete')}</button>` : ''}</td></tr>`; })
              : html`<tr><td colspan="9" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('prj.p.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${P.page === i + 1 ? 'on' : ''}" data-act="pj-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
    }

    // ---------- dialogs ----------
    const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
    function stPreview(F, cur) {
      if (!validDate(F.start) || !validDate(F.end) || F.end < F.start) return html`<span class="mute">—</span>`;
      const st = hr.projectStatus({ done: !!(cur && cur.done), start: F.start, end: F.end });
      return html`${stTag(st)} <small class="mute">${t('prj.p.st.hint.' + st)}</small>`;
    }
    function formModal() {
      const M = P.modal, F = M.f, cur = M.key ? hr.project(M.key) : null;
      const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('prj.e.' + M.errs[k])}</small>` : '');
      const fld = (k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="pf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="pf-${k}" class="a-field" data-p="${k}" type="${o.type || 'text'}" value="${F[k]}" maxlength="${o.max || 120}" ${o.list ? html`list="pf-ct"` : ''}>${E(k)}</div>`;
      const people = hr.emps().filter((e) => e.role !== 'worker');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(cur ? t('prj.p.edit') : t('prj.p.add'), t('prj.p.formSub'))}
        <div class="a-mbody l-form">
          <div class="p-two">${fld('zh', t('prj.p.nameZh'), { req: 1, max: 60 })}${fld('en', t('prj.p.nameEn'), { max: 100 })}</div>
          <div class="p-two">${fld('code', t('prj.p.code'), { req: 1, max: 20 })}
            <div class="a-frow"><label class="a-lab" for="pf-country"><b class="req">*</b> ${t('prj.f.country')}</label><select id="pf-country" class="a-field" data-p="country"><option value="">${t('prj.p.pick')}</option>${BS.sys.countryKeys(F.country).map((k) => html`<option value="${k}" ${F.country === k ? 'selected' : ''}>${country(k)}</option>`)}</select>${E('country')}</div></div>
          <div class="p-two">${fld('city', t('prj.p.city'), { req: 1, max: 40 })}${fld('contact', t('prj.p.contact'), { req: 1, max: 40, list: 1 })}</div>
          <datalist id="pf-ct">${people.map((e) => html`<option value="${lang() === 'zh' ? e.name : e.nameEn || e.name}"></option>`)}</datalist>
          ${fld('address', t('prj.p.address'), { req: 1 })}
          <div class="a-frow"><label class="a-lab">${t('prj.p.sitesOpt')}</label><div class="a-field ro prj-sitesrow"><span>${cur ? t('prj.p.sitesN', { n: cur.sites.length }) : t('prj.p.sitesNone')}</span>${cur ? html`<button type="button" class="a-link" data-act="pj-manage" data-k="${cur.key}">${t('prj.p.manage')}</button>` : ''}</div><small class="a-fhint">${t('prj.p.sitesHint')}</small></div>
          <div class="p-two">${fld('start', t('prj.p.start'), { req: 1, type: 'date' })}${fld('end', t('prj.p.end'), { req: 1, type: 'date' })}</div>
          <div class="a-frow"><label class="a-lab">${t('hr.pj.status')}</label><div class="a-field ro prj-stprev" data-role="pst">${stPreview(F, cur)}</div><small class="a-fhint">${t('prj.p.stHint')}</small></div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="pj-save">${t('p.m.save')}</button></footer></div></div>`;
    }
    function endModal() {
      const M = P.modal, p = hr.project(M.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('prj.end.title'), t('prj.end.sub'))}
        <div class="a-mbody l-form"><p class="prj-who"><b>${loc(p)}</b> · ${p.code}</p><p class="a-fhint">${t('prj.end.cur')}: ${stTag('delayed')}</p>
          <div class="p-two"><div class="a-frow"><label class="a-lab">${t('prj.end.old')}</label><div class="a-field ro">${p.end}</div></div>
            <div class="a-frow"><label class="a-lab" for="pe-new"><b class="req">*</b> ${t('prj.end.new')}</label><input id="pe-new" class="a-field" type="date" data-e="end" value="${M.v}">${M.err ? html`<small class="a-ferr" data-err="end">${t('prj.e.' + M.err)}</small>` : ''}</div></div>
          <p class="prj-days" data-role="days">${daysText(p, M.v)}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="pj-end-ok">${t('prj.end.ok')}</button></footer></div></div>`;
    }
    function daysText(p, v) {
      if (!validDate(v)) return '';
      const n = Math.round((new Date(v.replace(/-/g, '/')) - new Date(p.end.replace(/-/g, '/'))) / 86400000);
      return n > 0 ? t('prj.end.longer', { n }) : '';
    }
    function doneModal() {
      const p = hr.project(P.modal.key); const im = hr.projectImpact(p.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('prj.done.title'), t('prj.done.sub'))}
        <div class="a-mbody l-form"><h3 class="prj-q">${t('prj.done.q')}</h3><p class="a-fhint">${t('prj.done.note')}</p>
          <dl class="ps-dl"><div class="ps-kv"><dt>${t('prj.p.col.name')}</dt><dd>${loc(p)}</dd></div><div class="ps-kv"><dt>${t('prj.done.period')}</dt><dd>${p.start} ${t('prj.done.to')} ${p.end}</dd></div>
            <div class="ps-kv"><dt>${t('prj.done.people')}</dt><dd>${t('t.people', { n: im.people })}</dd></div><div class="ps-kv"><dt>${t('prj.done.sites')}</dt><dd>${t('prj.p.sitesN', { n: im.sites })}</dd></div></dl>
          ${im.people || im.sites ? html`<p class="prj-warn">${icon('warn', 16)} ${t('prj.done.warn')}</p>` : ''}</div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="pj-done-ok">${t('prj.done.ok')}</button></footer></div></div>`;
    }
    function sitesModal() {
      const p = hr.project(P.modal.key); const list = p.sites.map((k) => hr.site(k));
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('prj.sm.title'), `${loc(p)} · ${p.code}`)}
        <div class="a-mbody"><p class="a-fhint">${t('prj.sm.bound')} <b>${t('prj.p.sitesN', { n: list.length })}</b></p>
          <div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr>${['name', 'where', 'address', 'fence', 'status'].map((c) => html`<th>${t('prj.sm.col.' + c)}</th>`)}</tr></thead>
            <tbody>${list.length ? list.map((s) => html`<tr><td><b>${loc(s)}</b> <span class="mute">/ ${s.code}</span></td><td>${country(p.country)} / ${p.city}</td><td>${s.address}</td><td>${t('prj.s.circle', { n: s.radius })}</td><td><span class="a-tag ${s.active ? 'approved' : 'withdrawn'}">${t(s.active ? 'p.on' : 'p.off')}</span></td></tr>`)
              : html`<tr><td colspan="5" class="a-none">${t('prj.sm.none')}</td></tr>`}</tbody></table></div>
          <p class="a-fhint">${t('prj.sm.note')}</p></div>
        <footer><button type="button" class="a-btn" data-act="pj-manage" data-k="${p.key}">${t('prj.p.manage')}</button><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    function modal() { const M = P.modal; return !M ? '' : M.k === 'form' ? formModal() : M.k === 'end' ? endModal() : M.k === 'done' ? doneModal() : sitesModal(); }

    function exportCsv() {
      const all = rows(); const head = ['code', 'name_zh', 'name_en', 'country', 'city', 'contact', 'address', 'sites', 'start', 'end', 'status'];
      download(`projects-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([head, ...all.map((p) => [p.code, p.zh, p.en, country(p.country), p.city, p.contact, p.address, p.sites.length, p.start, p.end, t('hr.pj.st.' + hr.projectStatus(p))])]));
      toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    const blank = () => ({ zh: '', en: '', code: hr.nextProjectCode(), country: 'sg', city: '', contact: '', address: '', start: '', end: '' });
    return {
      tab: 'projects', crumbs() { return [{ text: t('a.nav.projects'), act: 'noop' }, { text: t('prj.tab.projects') }]; }, page, modal,
      afterRender(v) { const M = P.modal; if (M && M.k === 'form' && !M.focused) { M.focused = true; const el = v.querySelector('#pf-zh'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = P.modal;
        if (el.dataset.f) { P.draft[el.dataset.f] = el.value; return; }
        if (M && M.k === 'form' && el.dataset.p) {
          const k = el.dataset.p; M.f[k] = el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
          if (k === 'start' || k === 'end') { const box = ctx.view().querySelector('[data-role=pst]'); if (box) box.innerHTML = stPreview(M.f, M.key ? hr.project(M.key) : null).s; }
        } else if (M && M.k === 'end' && el.dataset.e) {
          M.v = el.value; M.err = null; ctx.view().querySelectorAll('[data-err=end]').forEach((n) => n.remove()); const d = ctx.view().querySelector('[data-role=days]'); if (d) d.textContent = daysText(hr.project(M.key), M.v);
        }
      },
      onSubmit() { P.applied = { ...P.draft }; P.page = 1; render(); },
      onEscape() { if (P.modal) { P.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'pj-reset': P.draft = F0(); P.applied = F0(); P.page = 1; render(); break;
          case 'pj-page': P.page = +b.dataset.p; render(); break;
          case 'pj-export': exportCsv(); break;
          case 'pj-new': P.modal = { k: 'form', key: null, f: blank(), errs: {} }; render(); break;
          case 'pj-edit': { const p = hr.project(b.dataset.k); P.modal = { k: 'form', key: p.key, f: { zh: p.zh, en: p.en, code: p.code, country: p.country, city: p.city, contact: p.contact, address: p.address, start: p.start, end: p.end }, errs: {} }; render(); break; }
          case 'pj-save': { const M = P.modal; const r = hr.saveProject(M.f, M.key); if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; } P.modal = null; render(); toast(t(M.key ? 'prj.toast.pUpdated' : 'prj.toast.pCreated'), 'ok'); break; }
          case 'pj-sites': P.modal = { k: 'sites', key: b.dataset.k }; render(); break;
          case 'pj-end': { const p = hr.project(b.dataset.k); P.modal = { k: 'end', key: p.key, v: '', err: null }; render(); break; }
          case 'pj-end-ok': { const M = P.modal; const r = hr.extendProject(M.key, M.v); if (!r.ok) { M.err = r.error === 'date' ? 'end_date' : r.error; render(); break; } P.modal = null; render(); toast(t('prj.toast.extended', { n: r.days }), 'ok'); break; }
          case 'pj-done': P.modal = { k: 'done', key: b.dataset.k }; render(); break;
          case 'pj-done-ok': { const M = P.modal; const r = hr.completeProject(M.key); P.modal = null; render(); if (r.ok) toast(t('prj.toast.completed'), 'ok'); break; }
          case 'close-modal': P.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { P.draft = F0(); P.applied = F0(); P.page = 1; P.modal = null; },
    };
  };

  // ---------------- 工区列表 ----------------
  BS.prjParts.sites = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const F0 = () => ({ kw: '', projectKey: '', status: '' });
    const S = { draft: F0(), applied: F0(), page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const rows = () => { const f = S.applied, kw = f.kw.trim().toLowerCase();
      return hr.sites().filter((s) => BS.perm.inScopeProject(s.projectKey)).filter((s) => (!kw || [s.zh, s.en, s.code, s.address].some((x) => String(x).toLowerCase().includes(kw))) && (!f.projectKey || s.projectKey === f.projectKey) && (!f.status || (f.status === 'on') === s.active)); };
    const rule = (s) => t(s.allowOutside ? 'prj.s.allow' : 'prj.s.deny');

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 8)); if (S.page > pages) S.page = pages; const slice = all.slice((S.page - 1) * 8, S.page * 8); const d = S.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('prj.s.title')}</h1><p class="a-sub">${t('prj.s.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="st-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="st-new">${icon('plus', 16)} ${t('prj.s.add')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('prj.s.kw')}" aria-label="${t('prj.s.kw')}"></label>
            <label class="a-in"><select data-f="projectKey" aria-label="${t('prj.s.allPrj')}"><option value="">${t('prj.s.allPrj')}</option>${hr.projects().filter((p) => BS.perm.inScopeProject(p.key)).map((p) => html`<option value="${p.key}" ${d.projectKey === p.key ? 'selected' : ''}>${loc(p)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('prj.s.allSt')}"><option value="">${t('prj.s.allSt')}</option><option value="on" ${d.status === 'on' ? 'selected' : ''}>${t('p.on')}</option><option value="off" ${d.status === 'off' ? 'selected' : ''}>${t('p.off')}</option></select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="st-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['name', 'project', 'address', 'coords', 'radius', 'rule', 'status'].map((c) => html`<th>${t('prj.s.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((s) => html`<tr><td><b>${loc(s)}</b> <span class="mute">/ ${s.code}</span></td><td>${loc(hr.project(s.projectKey))}</td><td class="prj-addr">${s.address}</td><td class="mute">${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</td><td>${t('prj.s.m', { n: s.radius })}</td>
              <td><span class="a-tag ${s.allowOutside ? 'sub-upcoming' : 'pending'}">${rule(s)}</span></td><td><span class="a-tag ${s.active ? 'approved' : 'withdrawn'}">${t(s.active ? 'p.on' : 'p.off')}</span></td>
              <td class="c-act"><button type="button" class="a-link" data-act="st-map" data-k="${s.key}">${t('prj.s.map')}</button><button type="button" class="a-link" data-act="st-edit" data-k="${s.key}">${t('p.edit')}</button><button type="button" class="a-link" data-act="${s.active ? 'st-off' : 'st-on'}" data-k="${s.key}">${t(s.active ? 'prj.s.stop' : 'prj.s.start')}</button><button type="button" class="a-link danger" data-act="st-del" data-k="${s.key}">${t('prj.s.del')}</button></td></tr>`)
              : html`<tr><td colspan="8" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('prj.s.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${S.page === i + 1 ? 'on' : ''}" data-act="st-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
    }

    // ---------- dialogs ----------
    const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
    const mapBox = (F) => html`<div class="prj-mapbox pick" data-role="map" data-act="st-map-pick" title="${t('prj.s.mapHint')}">${raw(mapSvg(t, parseFloat(F.lat), parseFloat(F.lng), F.radius))}</div>`;
    function formModal() {
      const M = S.modal, F = M.f, cur = M.key ? hr.site(M.key) : null; const locked = cur && hr.siteUsage(cur.key).used;
      const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('prj.e.' + M.errs[k])}</small>` : '');
      const fld = (k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="sf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="sf-${k}" class="a-field" data-s="${k}" value="${F[k]}" maxlength="${o.max || 120}" ${o.num ? 'inputmode="decimal"' : ''}>${E(k)}</div>`;
      const prjs = hr.projects().filter((p) => BS.perm.inScopeProject(p.key) && hr.projectStatus(p) !== 'done' || (cur && cur.projectKey === p.key));
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(cur ? t('prj.s.edit') : t('prj.s.add'), t('prj.s.formSub'))}
        <div class="a-mbody l-form">
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="sf-projectKey"><b class="req">*</b> ${t('prj.s.col.project')}</label><select id="sf-projectKey" class="a-field" data-s="projectKey" ${locked ? 'disabled' : ''}><option value="">${t('prj.p.pick')}</option>${prjs.map((p) => html`<option value="${p.key}" ${F.projectKey === p.key ? 'selected' : ''}>${loc(p)} · ${p.code}</option>`)}</select>${locked ? html`<small class="a-fhint">${t('prj.s.locked')}</small>` : ''}${E('projectKey')}</div>
            ${fld('code', t('prj.s.code'), { req: 1, max: 20 })}</div>
          <div class="p-two">${fld('zh', t('prj.s.nameZh'), { req: 1, max: 30 })}${fld('en', t('prj.s.nameEn'), { max: 60 })}</div>
          <div class="a-frow"><label class="a-lab" for="sf-q">${t('prj.s.search')}</label>
            <div class="prj-search"><label class="a-in">${icon('search', 16)}<input id="sf-q" data-s="q" value="${M.q}" placeholder="${t('prj.s.searchPh')}"></label><button type="button" class="a-btn" data-act="st-find">${t('prj.s.find')}</button></div>
            ${M.results ? M.results.length ? html`<ul class="prj-results">${M.results.map((r, i) => html`<li><button type="button" data-act="st-pick" data-i="${i}"><b>${r[0]}</b><small>${r[1]} · ${fix6(r[2])}, ${fix6(r[3])}</small></button></li>`)}</ul>` : html`<p class="a-fhint">${t('prj.s.noHit')}</p>` : ''}
            ${M.picked ? html`<p class="prj-picked">${icon('check', 14)} <b>${t('prj.s.picked')}</b> ${M.picked}</p>` : ''}</div>
          ${fld('address', t('prj.s.address'), { req: 1 })}
          ${mapBox(F)}
          <p class="a-fhint prj-maphint">${t('prj.s.mapHint')}</p>
          <div class="p-three">${fld('lat', t('prj.s.lat'), { req: 1, num: 1, max: 12 })}${fld('lng', t('prj.s.lng'), { req: 1, num: 1, max: 13 })}
            <div class="a-frow"><label class="a-lab" for="sf-radius"><b class="req">*</b> ${t('prj.s.radiusL')}</label><div class="a-field l-amt"><input id="sf-radius" data-s="radius" inputmode="numeric" value="${F.radius}" maxlength="4"><span>${t('prj.s.unit')}</span></div>${E('radius')}</div></div>
          <div class="a-frow"><label class="a-lab">${t('prj.s.outside')}</label><label class="p-check"><input type="checkbox" data-s="allowOutside" ${F.allowOutside ? 'checked' : ''}> ${t('prj.s.outsideOn')}</label><small class="a-fhint">${t('prj.s.outsideHint')}</small></div>
          <div class="a-frow"><label class="a-lab">${t('prj.s.col.status')}</label><label class="p-check"><input type="checkbox" data-s="active" ${F.active ? 'checked' : ''}> ${F.active ? t('prj.s.curOn') : t('prj.s.curOff')}</label>${E('active')}</div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="st-save">${t('p.m.save')}</button></footer></div></div>`;
    }
    function toggleModal() {
      const s = hr.site(S.modal.key); const u = hr.siteUsage(s.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('prj.off.title'), t('prj.off.sub'))}
        <div class="a-mbody l-form"><p class="prj-q">${t('prj.off.msg')}</p><p class="prj-who"><b>${loc(s)}</b> · ${s.code}<br><small class="mute">${loc(hr.project(s.projectKey))}</small></p>
          ${u.people ? html`<p class="prj-warn">${icon('warn', 16)} ${t('prj.off.people', { n: u.people })}</p>` : ''}</div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="st-off-ok">${t('prj.off.ok')}</button></footer></div></div>`;
    }
    function delModal() {
      const s = hr.site(S.modal.key); const u = hr.siteUsage(s.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('prj.del.title'), t('prj.del.sub'))}
        <div class="a-mbody l-form"><p class="prj-q">${t('prj.del.msg')}</p><p class="prj-who"><b>${loc(s)}</b> · ${s.code}<br><small class="mute">${loc(hr.project(s.projectKey))}</small></p>
          ${u.used ? html`<p class="prj-block" data-role="blocked">${icon('x', 16)} <span><b>${t('prj.del.blocked')}</b> ${[u.people ? t('prj.del.people', { n: u.people }) : '', u.groups ? t('prj.del.groups', { n: u.groups }) : ''].filter(Boolean).join(t('prj.del.sep'))}${t('prj.del.dot')} ${t('prj.del.how')}</span></p>` : ''}</div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button>${u.used && s.active ? html`<button type="button" class="a-btn" data-act="st-off" data-k="${s.key}">${t('prj.del.stopInstead')}</button>` : ''}<button type="button" class="a-btn danger" data-act="st-del-ok" ${u.used ? 'disabled' : ''}>${t('prj.del.ok')}</button></footer></div></div>`;
    }
    function mapModal() {
      const s = hr.site(S.modal.key);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(`${loc(s)} · ${s.code}`, s.address)}
        <div class="a-mbody"><div class="prj-mapbox">${raw(mapSvg(t, s.lat, s.lng, s.radius))}</div>
          <dl class="ps-dl"><div class="ps-kv"><dt>${t('prj.s.col.coords')}</dt><dd>${fix6(s.lat)}, ${fix6(s.lng)}</dd></div><div class="ps-kv"><dt>${t('prj.s.radiusL')}</dt><dd>${t('prj.s.m', { n: s.radius })}</dd></div><div class="ps-kv"><dt>${t('prj.s.col.rule')}</dt><dd>${rule(s)}</dd></div></dl>
          <p class="a-fhint">${t('prj.s.mapNote')}</p></div>
        <footer><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    function modal() { const M = S.modal; if (M && M.key && !hr.site(M.key)) { S.modal = null; return ''; } return !M ? '' : M.k === 'form' ? formModal() : M.k === 'off' ? toggleModal() : M.k === 'del' ? delModal() : mapModal(); }

    function paintMap() { const box = ctx.view().querySelector('[data-role=map]'); const M = S.modal; if (box && M && M.k === 'form') box.innerHTML = mapSvg(t, parseFloat(M.f.lat), parseFloat(M.f.lng), M.f.radius); }
    function exportCsv() {
      const all = rows(); const head = ['code', 'name_zh', 'name_en', 'project', 'address', 'lat', 'lng', 'radius_m', 'outside_punch', 'status'];
      download(`sites-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([head, ...all.map((s) => [s.code, s.zh, s.en, (hr.project(s.projectKey) || {}).code, s.address, s.lat, s.lng, s.radius, rule(s), t(s.active ? 'p.on' : 'p.off')])]));
      toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    const blank = (projectKey) => ({ projectKey: projectKey || '', code: '', zh: '', en: '', address: '', lat: '', lng: '', radius: '300', allowOutside: true, active: true });
    const toForm = (s) => ({ projectKey: s.projectKey, code: s.code, zh: s.zh, en: s.en, address: s.address, lat: fix6(s.lat), lng: fix6(s.lng), radius: String(s.radius), allowOutside: s.allowOutside, active: s.active });
    /** the map is a schematic: a click moves the pin by the clicked offset from the centre (the map then re-centres) */
    function mapPick(evt) {
      const M = S.modal; const svg = evt && evt.target.closest('.prj-mapbox svg'); if (!M || !svg) return;
      const lat = parseFloat(M.f.lat), lng = parseFloat(M.f.lng); if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const r = svg.getBoundingClientRect(); const x = ((evt.clientX - r.left) / r.width) * 400, y = ((evt.clientY - r.top) / r.height) * 200;
      const rad = Math.max(50, Math.min(5000, parseFloat(M.f.radius) || 300)); const ppm = Math.min(0.4, 80 / rad);
      M.f.lat = fix6(lat + (100 - y) / ppm / 111320); M.f.lng = fix6(lng + (x - 200) / ppm / (111320 * Math.cos((lat * Math.PI) / 180)));
      M.errs.lat = M.errs.lng = null; M.picked = ''; render();
    }
    function clearErr(k) { const M = S.modal; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } }

    return {
      tab: 'sites', crumbs() { return [{ text: t('a.nav.projects'), act: 'noop' }, { text: t('prj.tab.sites') }]; }, page, modal,
      /** jump in from a project row: show only that project's sites */
      focusProject(key) { S.draft = { ...F0(), projectKey: key }; S.applied = { ...S.draft }; S.page = 1; S.modal = null; },
      afterRender(v) { const M = S.modal; if (M && M.k === 'form' && !M.focused) { M.focused = true; const el = v.querySelector(M.key ? '#sf-zh' : '#sf-projectKey'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = S.modal;
        if (el.dataset.f) { S.draft[el.dataset.f] = el.value; return; }
        if (!(M && M.k === 'form' && el.dataset.s)) return;
        const k = el.dataset.s;
        if (k === 'allowOutside' || k === 'active') { M.f[k] = el.checked; clearErr(k); if (k === 'active') render(); return; }
        if (k === 'q') { M.q = el.value; return; }
        let v = el.value;
        if (k === 'lat' || k === 'lng') { v = v.replace(/[^\d.\-]/g, ''); if (v !== el.value) el.value = v; }
        if (k === 'radius') { v = v.replace(/\D/g, '').slice(0, 4); if (v !== el.value) el.value = v; }
        M.f[k] = v; clearErr(k);
        if (k === 'lat' || k === 'lng' || k === 'radius') paintMap();
        if (k === 'projectKey') render();
      },
      onSubmit() { if (S.modal && S.modal.k === 'form') { return; } S.applied = { ...S.draft }; S.page = 1; render(); },
      onEscape() { if (S.modal) { S.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b, evt) {
        switch (a) {
          case 'noop': break;
          case 'st-reset': S.draft = F0(); S.applied = F0(); S.page = 1; render(); break;
          case 'st-page': S.page = +b.dataset.p; render(); break;
          case 'st-export': exportCsv(); break;
          case 'st-new': S.modal = { k: 'form', key: null, f: blank(S.applied.projectKey), q: '', results: null, picked: '', errs: {} }; render(); break;
          case 'st-edit': { const s = hr.site(b.dataset.k); S.modal = { k: 'form', key: s.key, f: toForm(s), q: '', results: null, picked: '', errs: {} }; render(); break; }
          case 'st-find': {
            const M = S.modal; const q = M.q.trim().toLowerCase(); M.results = q ? PLACES.filter((p) => p[0].toLowerCase().includes(q) || p[1].toLowerCase().includes(q)).slice(0, 5) : []; render(); break;
          }
          case 'st-pick': {
            const M = S.modal; const r = M.results[+b.dataset.i]; if (!r) break; M.f.address = r[0]; M.f.lat = fix6(r[2]); M.f.lng = fix6(r[3]); M.picked = r[0]; M.results = null; M.errs.address = M.errs.lat = M.errs.lng = null; render(); break;
          }
          case 'st-map-pick': mapPick(evt); break;
          case 'st-save': {
            const M = S.modal; const r = hr.saveSite(M.f, M.key);
            if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
            S.modal = null; render(); toast(t(M.key ? 'prj.toast.sUpdated' : 'prj.toast.sCreated'), 'ok'); break;
          }
          case 'st-map': S.modal = { k: 'map', key: b.dataset.k }; render(); break;
          case 'st-off': S.modal = { k: 'off', key: b.dataset.k }; render(); break;
          case 'st-off-ok': { hr.setSiteActive(S.modal.key, false); S.modal = null; render(); toast(t('prj.toast.sOff'), 'ok'); break; }
          case 'st-on': { const r = hr.setSiteActive(b.dataset.k, true); if (!r.ok) { toast(t('prj.e.' + r.error), 'warn'); break; } toast(t('prj.toast.sOn'), 'ok'); break; }
          case 'st-del': S.modal = { k: 'del', key: b.dataset.k }; render(); break;
          case 'st-del-ok': { const M = S.modal; S.modal = null; const r = hr.deleteSite(M.key); if (!r.ok) { S.modal = M; render(); break; } render(); toast(t('prj.toast.sDeleted'), 'ok'); break; }
          case 'close-modal': S.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { S.draft = F0(); S.applied = F0(); S.page = 1; S.modal = null; },
    };
  };

  // ---------------- module wrapper ----------------
  BS.registerAdmin({
    id: 'prj', nav: 'a.nav.projects', stores: [hr, BS.att],
    tabs: [{ id: 'projects', k: 'prj.tab.projects' }, { id: 'sites', k: 'prj.tab.sites' }],
    create(ctx) {
      const parts = { projects: BS.prjParts.projects(ctx), sites: BS.prjParts.sites(ctx) };
      let tab = 'projects'; const cur = () => parts[tab];
      return {
        get tab() { return tab; }, set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v), onInput: (e) => cur().onInput && cur().onInput(e), onChange: (e) => cur().onChange && cur().onChange(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: () => ctx.rerender(),
        onClick(a, b, e) {
          if (a === 'pj-manage') { parts.projects.onEscape(); tab = 'sites'; parts.sites.focusProject(b.dataset.k); ctx.rerender(); return true; }
          return cur().onClick(a, b, e);
        },
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'projects'; },
      };
    },
  });
})(window.BS);
