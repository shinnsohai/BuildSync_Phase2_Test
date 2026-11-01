/* Admin: 证书管理 — people's certificates (add / update / view, expiry status) and certificate types (reminder days). */
(function (BS) {
  const { html, icon } = BS;
  const hr = BS.hr;
  BS.certParts = BS.certParts || {};
  const previews = new Map(); // certificate id -> object URL of an image chosen this session (files themselves are never stored)
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const size = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const today = () => BS.fmt.now().slice(0, 10);
  const TAG = { ok: 'approved', perm: 'approved', soon: 'pending', expired: 'rejected', none: 'withdrawn' };

  // ---------------- 人员证书 ----------------
  BS.certParts.people = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const F0 = () => ({ kw: '', type: '', status: '', range: '' });
    const V = { draft: F0(), applied: F0(), page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const nameOf = (e) => (lang() === 'zh' ? e.name : e.nameEn || e.name);
    const ctName = (code) => loc(hr.certType(code) || { zh: code, en: code });
    const label = (st) => t(st === 'none' ? 'cr.st.none' : 'hr.cert.' + st);
    const tagOf = (st) => html`<span class="a-tag ${TAG[st]}">${label(st)}</span>`;
    const fileTag = (c) => html`<span class="a-tag ${c && c.file ? 'approved' : 'withdrawn'}">${t(c && c.file ? 'cr.up' : 'cr.notUp')}</span>`;

    const base = () => { const out = []; hr.emps().filter((e) => e.status === 'active' && BS.perm.inScopeEmp(e)).forEach((e) => { if (!e.certs.length) out.push({ e, c: null, st: 'none' }); else e.certs.forEach((c) => out.push({ e, c, st: hr.certStatus(c) })); }); return out; };
    const rank = { expired: 0, soon: 1, none: 2, ok: 3, perm: 4 };
    function rows() {
      const f = V.applied, kw = f.kw.trim().toLowerCase();
      return base().filter(({ e, c, st }) => (!kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw))
        && (!f.type || (c && c.type === f.type)) && (!f.status || (f.status === 'ok' ? st === 'ok' || st === 'perm' : st === f.status))
        && (!f.range || (c && (f.range === 'perm' ? !c.expiry : c.expiry && hr.certDays(c) >= 0 && hr.certDays(c) <= +f.range))))
        .sort((a, b) => rank[a.st] - rank[b.st] || (hr.certDays(a.c || {}) ?? 1e9) - (hr.certDays(b.c || {}) ?? 1e9) || a.e.empNo.localeCompare(b.e.empNo));
    }
    function cards() {
      const all = base(); const n = (fn) => all.filter(fn).length; const act = V.applied.status;
      const c = (k, cls, num, sub, st) => html`<button type="button" class="st-card ${cls} cr-card ${act === st ? 'on' : ''}" data-act="cr-card" data-v="${st}"><small>${t('cr.c.' + k)}</small><b>${num}</b><span>${sub}</span></button>`;
      return html`<div class="st-cards ps-cards">${c('ok', '', n((x) => x.st === 'ok' || x.st === 'perm'), t('cr.c.okSub'), 'ok')}${c('soon', 'add', n((x) => x.st === 'soon'), t('cr.c.soonSub', { n: hr.SOON_DAYS }), 'soon')}${c('expired', 'off', n((x) => x.st === 'expired'), t('cr.c.expiredSub'), 'expired')}${c('none', '', n((x) => x.st === 'none'), t('cr.c.noneSub'), 'none')}</div>`;
    }

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 8)); if (V.page > pages) V.page = pages; const slice = all.slice((V.page - 1) * 8, V.page * 8); const d = V.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('cr.p.title')}</h1><p class="a-sub">${t('cr.p.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="cr-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="cr-new">${icon('plus', 16)} ${t('cr.p.add')}</button></div></div>
        ${cards()}
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('cr.f.person')}" aria-label="${t('cr.f.person')}"></label>
            <label class="a-in"><select data-f="type" aria-label="${t('cr.col.type')}"><option value="">${t('cr.col.type')}</option>${hr.certTypes().map((x) => html`<option value="${x.code}" ${d.type === x.code ? 'selected' : ''}>${loc(x)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('cr.col.status')}"><option value="">${t('cr.col.status')}</option>${['ok', 'soon', 'expired', 'none'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${k === 'ok' ? t('cr.st.ok') : label(k)}</option>`)}</select></label>
            <label class="a-in"><select data-f="range" aria-label="${t('cr.f.range')}"><option value="">${t('cr.f.range')}</option>${['30', '60', '90'].map((k) => html`<option value="${k}" ${d.range === k ? 'selected' : ''}>${t('cr.f.within', { n: k })}</option>`)}<option value="perm" ${d.range === 'perm' ? 'selected' : ''}>${t('hr.cert.perm')}</option></select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="cr-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table ps-table"><thead><tr>${['person', 'name', 'no', 'until', 'image', 'status'].map((c) => html`<th>${t('cr.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map(({ e, c, st }) => html`<tr><td><b>${nameOf(e)}</b> <span class="mute">/ ${e.empNo}</span></td><td>${c ? ctName(c.type) : '—'}</td><td class="mute">${c ? c.no : '—'}</td><td class="mute">${c ? c.expiry || t('hr.f.permanent') : '—'}</td><td>${fileTag(c)}</td><td>${tagOf(st)}${c && st === 'soon' ? html` <small class="mute">${t('cr.daysLeft', { n: hr.certDays(c) })}</small>` : ''}</td>
              <td class="c-act">${c ? html`<button type="button" class="a-link" data-act="cr-view" data-e="${e.empNo}" data-id="${c.id}">${t('cr.view')}</button><button type="button" class="a-link" data-act="cr-upd" data-e="${e.empNo}" data-id="${c.id}">${t('cr.update')}</button>` : html`<button type="button" class="a-link" data-act="cr-new" data-e="${e.empNo}">${t('cr.upload')}</button>`}</td></tr>`)
              : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('cr.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${V.page === i + 1 ? 'on' : ''}" data-act="cr-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
    }

    // ---------- dialogs ----------
    const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
    const E = (M, k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('cr.e.' + M.errs[k])}</small>` : '');
    const fld = (M, k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="cr-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="cr-${k}" class="a-field" data-c="${k}" type="${o.type || 'text'}" value="${M.f[k]}" maxlength="${o.max || 40}" placeholder="${o.ph || ''}" ${o.dis ? 'disabled' : ''} autocomplete="off">${E(M, k)}</div>`;
    const dates = (M) => html`<div class="p-three">${fld(M, 'issued', t('cr.f.issued'), { type: 'date' })}${fld(M, 'expiry', t('cr.f.expiry'), { type: 'date', req: !M.f.permanent, dis: M.f.permanent })}
      <div class="a-frow"><label class="a-lab">&nbsp;</label><label class="p-check"><input type="checkbox" data-c="permanent" ${M.f.permanent ? 'checked' : ''}> ${t('hr.f.permanent')}</label></div></div>`;
    const picker = (M, curFile) => html`<div class="a-frow"><label class="a-lab">${t('cr.f.attach')}</label>
      ${curFile ? html`<p class="cr-cur">${icon('file', 16)} <span>${t('cr.f.current')}: <b>${curFile.name}</b> (${size(curFile.size)})</span></p>` : ''}
      <div class="hr-file"><input type="file" data-role="cr-file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"><small class="a-fhint">${M.f.file ? t('cr.f.chosen', { f: M.f.file.name, s: size(M.f.file.size) }) : curFile ? t('cr.f.replaceHint') : t('cr.f.none')}</small></div>
      ${M.f.file && M.f.file.url ? html`<div class="cr-prev"><img src="${M.f.file.url}" alt="${t('cr.f.preview')}"></div>` : html`<div class="cr-prev empty">${icon('file', 22)}<span>${M.f.file ? M.f.file.name : t('cr.f.noFile')}</span></div>`}${E(M, 'file')}<small class="a-fhint">${t('cr.f.fileHint')}</small></div>`;

    function addModal() {
      const M = V.modal; const h = hr.emp(M.f.empNo);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('cr.add.title'), t('cr.add.sub'))}
        <div class="a-mbody l-form">
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="cr-empNo"><b class="req">*</b> ${t('cr.f.holder')}</label><select id="cr-empNo" class="a-field" data-c="empNo"><option value="">${t('cr.f.holderPh')}</option>${hr.emps().filter((e) => e.status === 'active' && BS.perm.inScopeEmp(e)).map((e) => html`<option value="${e.empNo}" ${M.f.empNo === e.empNo ? 'selected' : ''}>${nameOf(e)} / ${e.empNo}</option>`)}</select>${E(M, 'empNo')}</div>
            <div class="a-frow"><label class="a-lab" for="cr-type"><b class="req">*</b> ${t('cr.col.type')}</label><select id="cr-type" class="a-field" data-c="type"><option value="">${t('cr.f.typePh')}</option>${hr.certTypes().filter((x) => x.active).map((x) => html`<option value="${x.code}" ${M.f.type === x.code ? 'selected' : ''}>${loc(x)}${h && h.certs.some((c) => c.type === x.code) ? ' · ' + t('cr.f.has') : ''}</option>`)}</select>${E(M, 'type')}</div></div>
          ${fld(M, 'no', t('cr.col.no'), { req: 1, ph: t('cr.f.noPh') })}${dates(M)}${picker(M, null)}
          <p class="cr-rule">${icon('shield', 14)} <span><b>${t('cr.rule.save')}</b> ${t('cr.add.rule')}</span></p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="cr-save">${t('cr.add.ok')}</button></footer></div></div>`;
    }
    function updModal() {
      const M = V.modal; const e = hr.emp(M.empNo); const c = hr.certsOf(M.empNo).find((x) => x.id === M.id);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('cr.upd.title'), t('cr.upd.sub'))}
        <div class="a-mbody l-form">
          <div class="p-two"><div class="a-frow"><label class="a-lab">${t('cr.f.holder')}</label><div class="a-field ro">${nameOf(e)} / ${e.empNo}</div></div><div class="a-frow"><label class="a-lab">${t('cr.col.type')}</label><div class="a-field ro">${ctName(c.type)}</div></div></div>
          ${fld(M, 'no', t('cr.col.no'), { req: 1, ph: t('cr.f.noPh') })}${dates(M)}${picker(M, c.file ? { name: c.file, size: c.fileSize } : null)}
          <p class="cr-rule">${icon('shield', 14)} <span><b>${t('cr.rule.upd')}</b> ${t('cr.upd.rule')}</span></p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="cr-save">${t('cr.upd.ok')}</button></footer></div></div>`;
    }
    function viewModal() {
      const M = V.modal; const e = hr.emp(M.empNo); const c = hr.certsOf(M.empNo).find((x) => x.id === M.id); const st = hr.certStatus(c); const img = previews.get(c.id);
      const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v || '—'}</dd></div>`;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        ${head(t('cr.view.title'), t('cr.view.sub'))}
        <div class="a-mbody"><div class="cr-hero"><span class="a-av">${nameOf(e).slice(0, 1)}</span><div><b>${ctName(c.type)}</b><small>${c.no}</small></div>${tagOf(st)}</div>
          <h3 class="hr-h">${t('cr.view.info')}</h3><dl class="a-dl lv-dl">${kv('cr.f.holder', `${nameOf(e)} / ${e.empNo}`)}${kv('cr.col.type', ctName(c.type))}${kv('cr.col.no', c.no)}${kv('cr.f.issued', c.issued)}${kv('cr.f.expiry', c.expiry || t('hr.f.permanent'))}${kv('cr.col.status', label(st) + (st === 'soon' ? ' · ' + t('cr.daysLeft', { n: hr.certDays(c) }) : st === 'expired' ? ' · ' + t('cr.daysOver', { n: -hr.certDays(c) }) : ''))}</dl>
          <h3 class="hr-h">${t('cr.f.attach')} ${fileTag(c)}</h3>
          <div class="cr-prev big ${img ? '' : 'empty'}">${img ? html`<img src="${img}" alt="${c.file}">` : html`${icon('file', 26)}<span>${c.file ? t('cr.view.placeholder') : t('cr.view.noFile')}</span>`}</div>
          ${c.file ? html`<p class="cr-cur">${icon('file', 16)} <span><b>${c.file}</b> (${size(c.fileSize)})</span> <button type="button" class="a-link" data-act="cr-orig">${t('cr.view.orig')}</button></p>` : ''}
          <p class="a-fhint">${t('cr.view.edit')}</p></div>
        <footer><button type="button" class="a-btn" data-act="cr-upd" data-e="${e.empNo}" data-id="${c.id}">${t('cr.update')}</button><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    function modal() {
      const M = V.modal; if (!M) return '';
      if (M.k !== 'add' && !(hr.certsOf(M.empNo).some((x) => x.id === M.id))) { V.modal = null; return ''; }
      return M.k === 'add' ? addModal() : M.k === 'upd' ? updModal() : viewModal();
    }

    const blank = (empNo) => ({ empNo: empNo || '', type: '', no: '', issued: '', expiry: '', permanent: false, file: null });
    function exportCsv() {
      const all = rows(); const head = ['empNo', 'name', 'cert_type', 'cert_no', 'issued', 'expiry', 'attachment', 'status'];
      download(`certificates-${today()}.csv`, csvOf([head, ...all.map(({ e, c, st }) => [e.empNo, e.name, c ? ctName(c.type) : '', c ? c.no : '', c ? c.issued : '', c ? c.expiry || t('hr.f.permanent') : '', c && c.file ? c.file : '', label(st)])]));
      toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    return {
      tab: 'people', crumbs() { return [{ text: t('a.nav.certs'), act: 'noop' }, { text: t('cr.tab.people') }]; }, page, modal,
      afterRender(v) { const M = V.modal; if (M && (M.k === 'add' || M.k === 'upd') && !M.focused) { M.focused = true; const el = v.querySelector(M.k === 'add' && !M.f.empNo ? '#cr-empNo' : '#cr-no'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = V.modal;
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; return; }
        if (!(M && el.dataset.c)) return;
        const k = el.dataset.c; M.f[k] = k === 'permanent' ? el.checked : el.value;
        if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
        if (k === 'permanent') { if (el.checked) M.f.expiry = ''; M.errs.expiry = null; render(); } else if (k === 'empNo') render();
      },
      onChange(e) {
        const el = e.target, M = V.modal; if (!(M && el.dataset.role === 'cr-file')) return;
        const file = el.files && el.files[0]; if (!file) return;
        M.f.file = { name: file.name, size: file.size, url: /^image\/(jpeg|png)$/.test(file.type) ? URL.createObjectURL(file) : '' }; M.errs.file = null; render();
      },
      onSubmit() { V.applied = { ...V.draft }; V.page = 1; render(); },
      onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'cr-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break;
          case 'cr-card': { const v = V.applied.status === b.dataset.v ? '' : b.dataset.v; V.draft.status = v; V.applied = { ...V.draft, status: v }; V.page = 1; render(); break; }
          case 'cr-page': V.page = +b.dataset.p; render(); break;
          case 'cr-export': exportCsv(); break;
          case 'cr-new': V.modal = { k: 'add', f: blank(b.dataset.e), errs: {} }; render(); break;
          case 'cr-upd': { const c = hr.certsOf(b.dataset.e).find((x) => x.id === b.dataset.id); V.modal = { k: 'upd', empNo: b.dataset.e, id: c.id, f: { no: c.no, issued: c.issued, expiry: c.expiry || '', permanent: !c.expiry, file: null }, errs: {} }; render(); break; }
          case 'cr-view': V.modal = { k: 'view', empNo: b.dataset.e, id: b.dataset.id }; render(); break;
          case 'cr-orig': toast(t('cr.view.origToast')); break;
          case 'cr-save': {
            const M = V.modal; const adding = M.k === 'add';
            const r = adding ? hr.addCert({ ...M.f }) : hr.updateCert(M.empNo, M.id, { ...M.f });
            if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
            if (M.f.file && M.f.file.url) previews.set(r.cert.id, M.f.file.url);
            V.modal = null; render(); toast(t(adding ? 'cr.toast.added' : 'cr.toast.updated'), 'ok'); break;
          }
          case 'close-modal': V.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { V.draft = F0(); V.applied = F0(); V.page = 1; V.modal = null; previews.clear(); },
    };
  };

  // ---------------- 证书类型 ----------------
  BS.certParts.types = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
    const F0 = () => ({ kw: '', status: '' });
    const V = { draft: F0(), applied: F0(), page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const rows = () => { const f = V.applied, kw = f.kw.trim().toLowerCase(); return hr.certTypes().filter((x) => (!kw || x.zh.toLowerCase().includes(kw) || x.en.toLowerCase().includes(kw) || x.code.toLowerCase().includes(kw)) && (!f.status || (f.status === 'on') === x.active)); };
    const days = (r) => r.slice().sort((a, b) => b - a).map((n) => t('cr.days', { n })).join(t('prj.del.sep'));

    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 8)); if (V.page > pages) V.page = pages; const slice = all.slice((V.page - 1) * 8, V.page * 8); const d = V.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('cr.t.title')}</h1><p class="a-sub">${t('cr.t.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="ct-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="ct-new">${icon('plus', 16)} ${t('cr.t.add')}</button></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('cr.t.kw')}" aria-label="${t('cr.t.kw')}"></label>
            <label class="a-in"><select data-f="status" aria-label="${t('cr.col.status')}"><option value="">${t('cr.col.status')}</option><option value="on" ${d.status === 'on' ? 'selected' : ''}>${t('p.on')}</option><option value="off" ${d.status === 'off' ? 'selected' : ''}>${t('p.off')}</option></select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="ct-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table"><thead><tr>${['type', 'code', 'remind', 'used', 'status'].map((c) => html`<th>${t('cr.t.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((x) => html`<tr><td><b>${loc(x)}</b>${lang() === 'zh' && x.en !== x.zh ? html`<small class="hr-sub">${x.en}</small>` : ''}</td><td class="mute">${x.code}</td><td>${days(x.reminders)}</td><td>${t('cr.t.usedN', { n: hr.certTypeUsage(x.code) })}</td><td><span class="a-tag ${x.active ? 'approved' : 'withdrawn'}">${t(x.active ? 'p.on' : 'p.off')}</span></td><td class="c-act"><button type="button" class="a-link" data-act="ct-edit" data-c="${x.code}">${t('p.edit')}</button></td></tr>`)
              : html`<tr><td colspan="6" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
          <footer class="a-pager"><span>${t('cr.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${V.page === i + 1 ? 'on' : ''}" data-act="ct-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
    }
    function modal() {
      const M = V.modal; if (!M) return ''; const f = M.f; const Er = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('cr.e.' + M.errs[k])}</small>` : '');
      const fld = (k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="ct-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="ct-${k}" class="a-field" data-t="${k}" value="${f[k]}" maxlength="${o.max || 60}" placeholder="${o.ph || ''}" autocomplete="off">${Er(k)}</div>`;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('cr.t.form')}</h2><p>${t('cr.t.formSub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <div class="p-two">${fld('zh', t('cr.t.nameZh'), { req: 1, max: 30, ph: t('cr.t.nameZhPh') })}${fld('en', t('cr.t.nameEn'), { ph: 'Enter certificate type name' })}</div>
          ${fld('code', t('cr.t.codeL'), { req: 1, max: 30, ph: 'WORK-HEIGHT' })}
          <div class="a-frow"><label class="a-lab" for="ct-rnew"><b class="req">*</b> ${t('cr.t.remindL')}</label>
            <div class="cr-chips">${f.reminders.slice().sort((a, b) => b - a).map((n) => html`<span class="cr-chip"><b>${n}</b> ${t('cr.t.before', { n })}<button type="button" data-act="ct-rm" data-n="${n}" aria-label="${t('t.m.remove')}">${icon('x', 12)}</button></span>`)}</div>
            <div class="prj-search"><label class="a-in"><input id="ct-rnew" data-t="rnew" inputmode="numeric" maxlength="3" value="${M.rnew}" placeholder="${t('cr.t.rnewPh')}"></label><button type="button" class="a-btn" data-act="ct-radd">${icon('plus', 14)} ${t('cr.t.radd')}</button></div>${Er('reminders')}
            <small class="a-fhint"><b>${t('cr.t.ruleL')}</b> ${t('cr.t.rule')}</small></div>
          <div class="a-frow"><label class="a-lab" for="ct-active">${t('cr.col.status')}</label><select id="ct-active" class="a-field" data-t="active"><option value="1" ${f.active ? 'selected' : ''}>${t('p.on')}</option><option value="0" ${f.active ? '' : 'selected'}>${t('p.off')}</option></select><small class="a-fhint">${t('cr.t.offHint')}</small></div></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ct-save">${t('p.m.save')}</button></footer></div></div>`;
    }
    function exportCsv() {
      const all = rows(); download(`certificate-types-${today()}.csv`, csvOf([['code', 'name_zh', 'name_en', 'reminder_days', 'status'], ...all.map((x) => [x.code, x.zh, x.en, x.reminders.slice().sort((a, b) => b - a).join('/'), t(x.active ? 'p.on' : 'p.off')])]));
      toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    return {
      tab: 'types', crumbs() { return [{ text: t('a.nav.certs'), act: 'noop' }, { text: t('cr.tab.types') }]; }, page, modal,
      afterRender(v) { const M = V.modal; if (M && !M.focused) { M.focused = true; const el = v.querySelector('#ct-zh'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = V.modal;
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; return; }
        if (!(M && el.dataset.t)) return; const k = el.dataset.t;
        if (k === 'rnew') { const v = el.value.replace(/\D/g, '').slice(0, 3); if (v !== el.value) el.value = v; M.rnew = v; return; }
        M.f[k] = k === 'active' ? el.value === '1' : el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
      },
      onSubmit() { if (V.modal) return; V.applied = { ...V.draft }; V.page = 1; render(); },
      onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'ct-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break;
          case 'ct-page': V.page = +b.dataset.p; render(); break;
          case 'ct-export': exportCsv(); break;
          case 'ct-new': V.modal = { code: null, f: { zh: '', en: '', code: '', reminders: [30], active: true }, rnew: '', errs: {} }; render(); break;
          case 'ct-edit': { const x = hr.certType(b.dataset.c); V.modal = { code: x.code, f: { zh: x.zh, en: x.en === x.zh ? '' : x.en, code: x.code, reminders: x.reminders.slice(), active: x.active }, rnew: '', errs: {} }; render(); break; }
          case 'ct-radd': {
            const M = V.modal; const n = parseInt(M.rnew, 10); M.errs.reminders = null;
            if (!(n >= 1 && n <= 365)) M.errs.reminders = 'range'; else if (M.f.reminders.includes(n)) M.errs.reminders = 'dup'; else if (M.f.reminders.length >= 6) M.errs.reminders = 'many'; else { M.f.reminders.push(n); M.rnew = ''; }
            render(); const el = ctx.view().querySelector('#ct-rnew'); if (el) el.focus(); break;
          }
          case 'ct-rm': { const M = V.modal; M.f.reminders = M.f.reminders.filter((n) => n !== +b.dataset.n); render(); break; }
          case 'ct-save': {
            const M = V.modal; const r = hr.saveCertType(M.f, M.code);
            if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
            V.modal = null; render(); toast(t('cr.toast.typeSaved'), 'ok'); break;
          }
          case 'close-modal': V.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { V.draft = F0(); V.applied = F0(); V.page = 1; V.modal = null; },
    };
  };

  // ---------------- module wrapper ----------------
  BS.registerAdmin({
    id: 'cert', nav: 'a.nav.certs', stores: [hr],
    tabs: [{ id: 'people', k: 'cr.tab.people' }, { id: 'types', k: 'cr.tab.types' }],
    create(ctx) {
      const parts = { people: BS.certParts.people(ctx), types: BS.certParts.types(ctx) };
      let tab = 'people'; const cur = () => parts[tab];
      return {
        get tab() { return tab; }, set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v), onInput: (e) => cur().onInput && cur().onInput(e), onChange: (e) => cur().onChange && cur().onChange(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: () => ctx.rerender(),
        onClick: (a, b, e) => cur().onClick(a, b, e),
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'people'; },
      };
    },
  });
})(window.BS);
