/* Admin: 系统与三方配置 — third-party services, phone-number regions, phone content (agreements, about, hint) and dictionaries. */
(function (BS) {
  const { html, icon, raw } = BS;
  const sy = BS.sys, hr = BS.hr;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const TABS = ['svc', 'reg', 'cnt', 'dict'];

  BS.registerAdmin({
    id: 'sys', nav: 'a.nav.sys', stores: [sy],
    tabs: TABS.map((id) => ({ id, k: 'sy.tab.' + id })),
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const S = { tab: 'svc', testing: {}, F: { svc: { kw: '', type: '', status: '' }, reg: { kw: '', sms: '' }, cnt: { kw: '', type: '', status: '' }, dict: { kw: '', status: '' } }, FA: null, dict: 'country', modal: null };
      S.FA = JSON.parse(JSON.stringify(S.F));
      const loc = (o) => (z() ? o.zh : o.en || o.zh);
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('sy.e.' + M.errs[k])}</small>` : '');
      const filt = (kw, k, label, opts) => html`<label class="a-in"><select data-f="${k}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, text]) => html`<option value="${v}" ${S.F[S.tab][k] === v ? 'selected' : ''}>${text}</option>`)}</select></label>`;
      const kwBox = (ph) => html`<label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${S.F[S.tab].kw}" placeholder="${ph}" aria-label="${ph}"></label>`;
      const bar = (act) => html`<span class="a-fgrow"></span><button type="button" class="a-btn" data-act="${act}">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>`;
      const tag = (cls, text) => html`<span class="a-tag ${cls}">${text}</span>`;

      // ---------- third-party services ----------
      const svcSummary = (s) => (s.type === 'map' ? `${s.config.projectId} / ${s.secrets.apiKey || '—'}` : s.type === 'sms' ? `${s.config.senderId || '—'} / ${s.secrets.accessKey || '—'}` : `${s.config.bucket || '—'} / ${(s.config.endpoint || '').replace(/^https?:\/\//, '')}`);
      function svcPage() {
        const f = S.FA.svc, kw = f.kw.trim().toLowerCase();
        const all = sy.services().filter((s) => (!kw || s.zh.toLowerCase().includes(kw) || s.en.toLowerCase().includes(kw)) && (!f.type || s.type === f.type) && (!f.status || (f.status === 'on') === s.enabled));
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sy.svc.title')}</h1><p class="a-sub">${t('sy.svc.sub')}</p></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">${kwBox(t('sy.svc.name'))}${filt('', 'type', t('sy.col.stype'), [['map', t('sy.type.map')], ['sms', t('sy.type.sms')], ['file', t('sy.type.file')]])}${filt('', 'status', t('sy.col.on'), [['on', t('p.on')], ['off', t('p.off')]])}${bar('sy-reset')}</form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['svc', 'stype', 'sum', 'last', 'res', 'on'].map((c) => html`<th>${t('sy.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((s) => { const busy = S.testing[s.id]; return html`<tr><td><b>${loc(s)}</b></td><td>${t('sy.type.' + s.type)}</td><td class="mute sy-sum">${svcSummary(s)}</td><td class="mute">${s.lastTestAt ? s.lastTestAt.slice(5) : '—'}</td>
                <td>${busy ? tag('pending', t('sy.testing')) : s.lastResult === 'ok' ? tag('approved', t('sy.res.ok')) : s.lastResult === 'fail' ? tag('rejected', t('sy.res.fail')) : tag('withdrawn', t('sy.res.none'))}${s.lastResult === 'fail' && !busy ? html` <small class="mute">${t('sy.why.' + (s.failWhy || 'auth'))}</small>` : ''}</td><td>${tag(s.enabled ? 'approved' : 'withdrawn', t(s.enabled ? 'p.on' : 'p.off'))}</td>
                <td class="c-act"><button type="button" class="a-link" data-act="sy-cfg" data-id="${s.id}">${t('sy.cfg')}</button><button type="button" class="a-link" data-act="sy-test-update" data-id="${s.id}" ${busy ? 'disabled' : ''}>${t('sy.test')}</button><button type="button" class="a-link ${s.enabled ? 'danger' : ''}" data-act="${s.enabled ? 'sy-off-update' : 'sy-on-update'}" data-id="${s.id}">${t(s.enabled ? 'sy.stop' : 'sy.start')}</button></td></tr>`; })
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sy.count', { n: all.length })}</span><span></span></footer></section>
          <p class="a-fhint sy-note">${icon('shield', 14)} ${t('sy.svc.note')}</p>`;
      }

      // ---------- phone regions ----------
      function regPage() {
        const f = S.FA.reg, kw = f.kw.trim().toLowerCase();
        const all = sy.regions().filter((r) => (!kw || r.zh.includes(kw) || r.en.toLowerCase().includes(kw) || r.code.includes(kw)) && (!f.sms || (f.sms === 'yes') === r.sms));
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sy.reg.title')}</h1><p class="a-sub">${t('sy.reg.sub')}</p></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">${kwBox(t('sy.reg.kw'))}${filt('', 'sms', t('sy.col.sms'), [['yes', t('sy.sms.yes')], ['no', t('sy.sms.no')]])}${bar('sy-reset')}</form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['country', 'code', 'rule', 'lang', 'sms', 'on'].map((c) => html`<th>${t('sy.col.' + c)}</th>`)}</tr></thead>
              <tbody>${all.length ? all.map((r) => html`<tr><td><b>${loc(r)}</b></td><td>${r.code}</td><td>${t('sy.reg.digits', { n: r.digits })}</td><td>${r.lang === 'zh' ? '简体中文' : 'English'}</td><td>${tag(r.sms ? 'approved' : 'withdrawn', t(r.sms ? 'sy.sms.yes' : 'sy.sms.no'))}</td><td>${tag('approved', t('p.on'))}</td></tr>`) : html`<tr><td colspan="6" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sy.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- phone content ----------
      function cntPage() {
        const f = S.FA.cnt, kw = f.kw.trim().toLowerCase();
        const all = sy.contents().filter((c) => (!kw || c.titleZh.includes(kw) || c.titleEn.toLowerCase().includes(kw)) && (!f.type || c.type === f.type) && (!f.status || c.status === f.status));
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sy.cnt.title')}</h1><p class="a-sub">${t('sy.cnt.sub')}</p></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">${kwBox(t('sy.cnt.kw'))}${filt('', 'type', t('sy.col.ctype'), ['agreement', 'product', 'hint'].map((k) => [k, t('sy.ctype.' + k)]))}${filt('', 'status', t('sy.col.pub'), [['published', t('ct.st.published')], ['draft', t('ct.st.draft')]])}${bar('sy-reset')}</form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['title', 'ctype', 'clang', 'ver', 'upd', 'pub'].map((c) => html`<th>${t('sy.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((c) => html`<tr><td><b>${z() ? c.titleZh : c.titleEn}</b><small class="hr-sub">${z() ? c.titleEn : c.titleZh}</small></td><td>${t('sy.ctype.' + c.type)}</td><td>中文 / English</td><td>${c.version}</td><td class="mute">${c.updatedAt.slice(5)}</td><td>${tag(c.status === 'published' ? 'approved' : 'withdrawn', t('ct.st.' + c.status))}</td><td class="c-act"><button type="button" class="a-link" data-act="sy-c-edit" data-id="${c.id}">${t('p.edit')}</button></td></tr>`) : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sy.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- dictionaries ----------
      function dictPage() {
        const f = S.FA.dict, kw = f.kw.trim().toLowerCase(); const type = S.dict; const def = sy.DICTS.find((d) => d.id === type);
        const all = sy.dictItems(type).filter((x) => (!kw || x.zh.includes(kw) || x.en.toLowerCase().includes(kw) || x.code.toLowerCase().includes(kw)) && (!f.status || x.status === f.status));
        const parentName = (x) => { if (!x.parent) return '—'; const c = sy.dictItems('country').find((y) => y.key === x.parent); return c ? loc(c) : x.parent; };
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sy.dict.title')}</h1><p class="a-sub">${t('sy.dict.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn primary" data-act="dc-new">${icon('plus', 16)} ${t('sy.dict.add')}</button></div></div>
          <section class="a-card sy-types"><h3>${t('sy.dict.type')}</h3><p class="a-fhint">${t('sy.dict.typeHint')}</p><div class="sy-typegrid" role="radiogroup">${sy.DICTS.map((d) => html`<button type="button" role="radio" aria-checked="${type === d.id ? 'true' : 'false'}" class="${type === d.id ? 'on' : ''}" data-act="dc-type" data-k="${d.id}"><b>${t('sy.dt.' + d.id)}</b><small>${t('sy.dt.' + d.id + '.d')}</small></button>`)}</div></section>
          <section class="a-card"><div class="sv-head"><div><h3>${t('sy.dt.' + type)}</h3><small class="mute">${t('sy.dict.n', { n: sy.dictItems(type).length })} · ${t('sy.dt.' + type + '.d')}</small></div>${def.wired ? '' : html`<span class="a-tag pending">${t('sy.dict.notWired')}</span>`}</div>
            <form class="a-filters" autocomplete="off">${kwBox(t('sy.dict.kw'))}${filt('', 'status', t('sy.col.on'), [['active', t('p.on')], ['disabled', t('p.off')]])}${bar('sy-reset')}</form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['dzh', 'den', 'dcode'].map((c) => html`<th>${t('sy.col.' + c)}</th>`)}${type === 'city' ? html`<th>${t('sy.col.dparent')}</th>` : ''}${['dsort', 'on'].map((c) => html`<th>${t('sy.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((x) => html`<tr><td><b>${x.zh}</b></td><td>${x.en}</td><td class="mute">${x.code}</td>${type === 'city' ? html`<td>${parentName(x)}</td>` : ''}<td>${x.sort}</td><td>${tag(x.status === 'active' ? 'approved' : 'withdrawn', t(x.status === 'active' ? 'p.on' : 'p.off'))}</td><td class="c-act"><button type="button" class="a-link" data-act="dc-edit" data-id="${x.id}">${t('p.edit')}</button><button type="button" class="a-link danger" data-act="dc-del" data-id="${x.id}">${t('prj.s.del')}</button></td></tr>`) : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sy.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- dialogs ----------
      const fld = (M, k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="sf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="sf-${k}" class="a-field" data-s="${k}" type="${o.type || 'text'}" value="${M.f[k] ?? ''}" maxlength="${o.max || 120}" placeholder="${o.ph || ''}" ${o.dis ? 'disabled' : ''} autocomplete="off">${o.hint ? html`<small class="a-fhint">${o.hint}</small>` : ''}${E(M, k)}</div>`;
      function cfgModal() {
        const M = S.modal; const s = sy.service(M.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sy.cfg.title', { n: loc(s) }), t('sy.cfg.sub'))}
          <div class="a-mbody l-form">${sy.SVC_FIELDS[s.type].map((k) => fld(M, k, t('sy.f.' + k), { req: 1, ph: sy.SECRET.has(k) ? t('sy.f.secretPh') : t('sy.f.' + k + 'Ph'), hint: sy.SECRET.has(k) && s.secrets[k] ? t('sy.f.maskedHint') : '' }))}
            <p class="a-fhint">${t('sy.cfg.after')}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sy-save-update">${t('p.m.save')}</button></footer></div></div>`;
      }
      // rich text for agreements
      const rt = () => ctx.view().querySelector('.nt-rt');
      const sync = () => { const M = S.modal, el = rt(); if (!M || !el) return; const k = M.lang === 'zh' ? 'bodyZh' : 'bodyEn'; M.f[k] = el.innerHTML; const c = ctx.view().querySelector('[data-role=count]'); if (c) c.textContent = t('nt.tb.chars', { n: BS.notice.plain(el.innerHTML).length }); if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } };
      function cntModal() {
        const M = S.modal; const f = M.f; const zh = M.lang === 'zh'; const K = zh ? 'Zh' : 'En'; const c = sy.content(M.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sy.cnt.edit'), t('prj.p.formSub'))}
          <div class="a-mbody l-form"><div class="p-two"><div class="a-frow"><label class="a-lab">${t('sy.col.ctype')}</label><div class="a-field ro">${t('sy.ctype.' + c.type)}</div></div>${fld(M, 'version', t('sy.col.ver'), { req: 1, max: 8, ph: 'V1.0' })}</div>
            <div class="nt-lang"><div class="seg" role="tablist" aria-label="${t('nt.f.langs')}">${['zh', 'en'].map((l) => html`<button type="button" role="tab" aria-selected="${M.lang === l ? 'true' : 'false'}" aria-pressed="${M.lang === l ? 'true' : 'false'}" data-act="sy-clang" data-l="${l}">${l === 'zh' ? '中文' : 'English'}${M.errs['title' + (l === 'zh' ? 'Zh' : 'En')] || M.errs['body' + (l === 'zh' ? 'Zh' : 'En')] ? html` <i class="nt-dot"></i>` : ''}</button>`)}</div><small class="a-fhint">${t('nt.f.langHint')}</small></div>
            <div class="a-frow"><label class="a-lab" for="sf-title"><b class="req">*</b> ${t(zh ? 'sy.cnt.titleZh' : 'sy.cnt.titleEn')}</label><input id="sf-title" class="a-field" data-s="title${K}" value="${f['title' + K]}" maxlength="${zh ? 40 : 80}" autocomplete="off">${E(M, 'title' + K)}</div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t(zh ? 'sy.cnt.bodyZh' : 'sy.cnt.bodyEn')}</label><div class="nt-editor"><div class="nt-tb" role="toolbar">
              <button type="button" data-act="sy-fmt" data-c="p">${t('nt.tb.p')} · 14 px</button><button type="button" data-act="sy-fmt" data-c="h2">${t('nt.tb.h2')} · 18 px</button><i></i><button type="button" data-act="sy-fmt" data-c="bold"><b>B</b></button><button type="button" data-act="sy-fmt" data-c="italic"><em>I</em></button><i></i><button type="button" data-act="sy-fmt" data-c="ul">•</button><button type="button" data-act="sy-fmt" data-c="ol">1.</button></div>
              <div class="nt-rt" contenteditable="true" role="textbox" aria-multiline="true" data-ph="${t(zh ? 'nt.f.bodyPhZh' : 'nt.f.bodyPhEn')}"></div><div class="nt-count"><span>${t('nt.tb.para')}</span><span data-role="count">${t('nt.tb.chars', { n: BS.notice.plain(f['body' + K]).length })}</span></div></div>${E(M, 'body' + K)}</div>
            <div class="a-frow"><label class="a-lab" for="sf-status">${t('sy.col.pub')}</label><select id="sf-status" class="a-field" data-s="status"><option value="published" ${f.status === 'published' ? 'selected' : ''}>${t('ct.st.published')}</option><option value="draft" ${f.status === 'draft' ? 'selected' : ''}>${t('ct.st.draft')}</option></select>${E(M, 'status')}<small class="a-fhint">${t('sy.cnt.stHint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sy-csave-update">${t('co.ok')}</button></footer></div></div>`;
      }
      function dictModal() {
        const M = S.modal; const type = S.dict;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(M.id ? t('sy.dict.edit') : t('sy.dict.add'), t('sy.dict.formSub'))}
          <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab">${t('sy.dict.type')}</label><div class="a-field ro">${t('sy.dt.' + type)}</div></div>
            <div class="p-two">${fld(M, 'zh', t('sy.col.dzh'), { req: 1, max: 30 })}${fld(M, 'en', t('sy.col.den'), { req: 1, max: 60 })}</div>
            ${fld(M, 'code', t('sy.col.dcode'), { req: 1, max: 20, ph: 'SGP' })}
            ${type === 'city' ? html`<div class="a-frow"><label class="a-lab" for="sf-parent"><b class="req">*</b> ${t('sy.dict.parent')}</label><select id="sf-parent" class="a-field" data-s="parent"><option value="">${t('prj.p.pick')}</option>${sy.dictItems('country').map((c) => html`<option value="${c.key}" ${M.f.parent === c.key ? 'selected' : ''}>${loc(c)}</option>`)}</select><small class="a-fhint">${t('sy.dict.parentHint')}</small>${E(M, 'parent')}</div>` : ''}
            <div class="p-two">${fld(M, 'sort', t('sy.col.dsort'), { req: 1, type: 'number', max: 3 })}<div class="a-frow"><label class="a-lab" for="sf-status">${t('sy.col.on')}</label><select id="sf-status" class="a-field" data-s="status"><option value="active" ${M.f.status === 'active' ? 'selected' : ''}>${t('p.on')}</option><option value="disabled" ${M.f.status === 'disabled' ? 'selected' : ''}>${t('p.off')}</option></select>${E(M, 'status')}</div></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="dc-save-update">${t('p.m.save')}</button></footer></div></div>`;
      }
      function delModal() {
        const M = S.modal; const x = sy.dictItem(S.dict, M.id); const n = sy.dictUsage(S.dict, M.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sy.dict.delTitle'), t('sy.dict.delSub'))}
          <div class="a-mbody l-form"><dl class="ps-dl"><div class="ps-kv"><dt>${t('sy.dt.' + S.dict)} · ${t('sy.col.dzh')}</dt><dd>${x.zh}</dd></div><div class="ps-kv"><dt>${t('sy.col.dcode')}</dt><dd>${x.code}</dd></div></dl>
            ${n ? html`<p class="prj-block" data-role="blocked">${icon('x', 16)} <span><b>${t('prj.del.blocked')}</b> ${t('sy.dict.used', { n })} ${t('sy.dict.useHow')}</span></p>` : html`<p class="a-fhint">${t('sy.dict.delNote')}</p>`}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button>${n && x.status === 'active' ? html`<button type="button" class="a-btn" data-act="dc-stop" data-id="${x.id}">${t('prj.del.stopInstead')}</button>` : ''}<button type="button" class="a-btn danger" data-act="dc-del-ok-update" ${n ? 'disabled' : ''}>${t('co.del.ok')}</button></footer></div></div>`;
      }
      function modal() {
        const M = S.modal; if (!M) return ''; if (M.id && M.k === 'cfg' && !sy.service(M.id)) { S.modal = null; return ''; }
        return { cfg: cfgModal, cnt: cntModal, dict: dictModal, ddel: delModal }[M.k]();
      }
      const blankDict = () => ({ zh: '', en: '', code: '', parent: '', sort: String(sy.dictItems(S.dict).length + 1), status: 'active' });
      function exportRegions() { download('phone-regions.csv', csvOf([['country', 'code', 'digits', 'language', 'sms'], ...sy.regions().map((r) => [loc(r), r.code, r.digits, r.lang, r.sms ? 'yes' : 'no'])])); toast(t('hr.toast.exported', { n: sy.regions().length }), 'ok'); }

      return {
        get tab() { return S.tab; }, set tab(v) { S.modal = null; S.tab = v; },
        crumbs() { return [{ text: t('a.nav.sys'), act: 'noop' }, { text: t('sy.tab.' + S.tab) }]; },
        page() { return { svc: svcPage, reg: regPage, cnt: cntPage, dict: dictPage }[S.tab](); }, modal,
        afterRender(v) {
          const M = S.modal; if (!M) return;
          if (M.k === 'cnt') { const el = v.querySelector('.nt-rt'); if (el) { el.innerHTML = BS.notice.clean(M.f[M.lang === 'zh' ? 'bodyZh' : 'bodyEn']); el.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); }); const tb = v.querySelector('.nt-tb'); if (tb) tb.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); }); } }
          if (!M.focused) { M.focused = true; const el = v.querySelector('#sf-title, #sf-zh, #sf-projectId, #sf-bucket, #sf-accessKey, #sf-senderId, #sf-version'); if (el) el.focus(); }
        },
        onInput(e) {
          const el = e.target, M = S.modal;
          if (el.dataset.f) { S.F[S.tab][el.dataset.f] = el.value; return; }
          if (!M) return; if (el.classList.contains('nt-rt')) { sync(); return; }
          const k = el.dataset.s; if (!k) return; M.f[k] = el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
        },
        onSubmit() { if (S.modal) return; S.FA[S.tab] = { ...S.F[S.tab] }; render(); },
        onEscape() { if (S.modal) { S.modal = null; render(); return true; } return false; }, onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'sy-reset': S.F[S.tab] = JSON.parse(JSON.stringify({ svc: { kw: '', type: '', status: '' }, reg: { kw: '', sms: '' }, cnt: { kw: '', type: '', status: '' }, dict: { kw: '', status: '' } }[S.tab])); S.FA[S.tab] = { ...S.F[S.tab] }; render(); break;
            case 'sy-cfg': { const s = sy.service(b.dataset.id); const f = {}; sy.SVC_FIELDS[s.type].forEach((k) => { f[k] = sy.SECRET.has(k) ? s.secrets[k] || '' : s.config[k] || ''; }); S.modal = { k: 'cfg', id: s.id, f, errs: {} }; render(); break; }
            case 'sy-save-update': { const M = S.modal; const r = sy.saveService(M.id, M.f); if (!r.ok) { M.errs = r.errors; render(); break; } S.modal = null; render(); toast(t(r.changed ? 'sy.toast.savedRetest' : 'sy.toast.saved'), 'ok'); break; }
            case 'sy-test-update': { const id = b.dataset.id; S.testing[id] = true; render(); setTimeout(() => { delete S.testing[id]; const r = sy.testService(id); toast(t(r.result === 'ok' ? 'sy.toast.testOk' : 'sy.toast.testFail'), r.result === 'ok' ? 'ok' : 'warn'); }, 800); break; }
            case 'sy-on-update': { const r = sy.setServiceEnabled(b.dataset.id, true); toast(r.ok ? t('sy.toast.on') : t('sy.e.untested'), r.ok ? 'ok' : 'warn'); break; }
            case 'sy-off-update': sy.setServiceEnabled(b.dataset.id, false); toast(t('sy.toast.off'), 'ok'); break;
            case 'sy-c-edit': { const c = sy.content(b.dataset.id); S.modal = { k: 'cnt', id: c.id, lang: 'zh', f: { titleZh: c.titleZh, titleEn: c.titleEn, bodyZh: c.bodyZh, bodyEn: c.bodyEn, version: c.version, status: c.status }, errs: {} }; render(); break; }
            case 'sy-clang': { const M = S.modal; sync(); M.lang = b.dataset.l; M.focused = false; render(); break; }
            case 'sy-fmt': { const el = rt(); if (!el) break; el.focus(); const map = { p: ['formatBlock', 'p'], h2: ['formatBlock', 'h2'], bold: ['bold'], italic: ['italic'], ul: ['insertUnorderedList'], ol: ['insertOrderedList'] }; const [c, v] = map[b.dataset.c]; document.execCommand(c, false, v); sync(); break; }
            case 'sy-csave-update': {
              const M = S.modal; sync(); const r = sy.saveContent(M.id, M.f);
              if (!r.ok) { M.errs = r.errors; const bad = ['Zh', 'En'].find((k) => r.errors['title' + k] || r.errors['body' + k]); const cur = M.lang === 'zh' ? 'Zh' : 'En'; if (bad && !(r.errors['title' + cur] || r.errors['body' + cur])) M.lang = bad === 'Zh' ? 'zh' : 'en'; render(); break; }
              S.modal = null; render(); toast(t('sy.toast.cSaved'), 'ok'); break;
            }
            case 'dc-type': S.dict = b.dataset.k; S.F.dict = { kw: '', status: '' }; S.FA.dict = { ...S.F.dict }; render(); break;
            case 'dc-new': S.modal = { k: 'dict', id: null, f: blankDict(), errs: {} }; render(); break;
            case 'dc-edit': { const x = sy.dictItem(S.dict, b.dataset.id); S.modal = { k: 'dict', id: x.id, f: { zh: x.zh, en: x.en, code: x.code, parent: x.parent, sort: String(x.sort), status: x.status }, errs: {} }; render(); break; }
            case 'dc-save-update': { const M = S.modal; const r = sy.saveDict(S.dict, M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); break; } S.modal = null; render(); toast(t(M.id ? 'sy.toast.dSaved' : 'sy.toast.dAdded'), 'ok'); break; }
            case 'dc-del': S.modal = { k: 'ddel', id: b.dataset.id }; render(); break;
            case 'dc-del-ok-update': { const id = S.modal.id; S.modal = null; const r = sy.deleteDict(S.dict, id); render(); toast(t(r.ok ? 'sy.toast.dDel' : 'sy.dict.useHow'), r.ok ? 'ok' : 'warn'); break; }
            case 'dc-stop': { const x = sy.dictItem(S.dict, b.dataset.id); S.modal = null; sy.saveDict(S.dict, { ...x, status: 'disabled', sort: String(x.sort) }, x.id); toast(t('sy.toast.dStopped'), 'ok'); break; }
            case 'close-modal': S.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { S.tab = 'svc'; S.testing = {}; S.F = { svc: { kw: '', type: '', status: '' }, reg: { kw: '', sms: '' }, cnt: { kw: '', type: '', status: '' }, dict: { kw: '', status: '' } }; S.FA = JSON.parse(JSON.stringify(S.F)); S.dict = 'country'; S.modal = null; },
      };
    },
  });
})(window.BS);
