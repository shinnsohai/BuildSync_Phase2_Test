/* Admin: 内容配置 — sign-in / sign-out pop-up content and the safety reminders shown on the phone. */
(function (BS) {
  const { html, icon } = BS;
  const ct = BS.content;
  const size = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const stamp = () => BS.fmt.now().slice(0, 16).replace('T', ' ');

  BS.registerAdmin({
    id: 'content', nav: 'a.nav.content', stores: [ct],
    tabs: [{ id: 'popups', k: 'ct.tab.popups' }, { id: 'reminders', k: 'ct.tab.reminders' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
      const S = { tab: 'popups', P: { draft: { type: '', status: '' }, applied: { type: '', status: '' } }, R: { draft: { kw: '', def: '' }, applied: { kw: '', def: '' } }, modal: null };
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('ct.e.' + M.errs[k])}</small>` : '');
      const thumb = (img, cls = '') => (img ? html`<img class="ct-thumb ${cls}" src="${img.data}" alt="">` : html`<span class="ct-thumb empty ${cls}">${icon('file', 16)}</span>`);

      // ---------- pop-up list ----------
      const popRows = () => { const f = S.P.applied; return ct.popups().filter((p) => (!f.type || p.type === f.type) && (!f.status || p.status === f.status)); };
      function popupsPage() {
        const all = popRows(); const d = S.P.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('ct.p.title')}</h1><p class="a-sub">${t('ct.p.sub')}</p></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in"><select data-f="type" aria-label="${t('ct.col.type')}"><option value="">${t('ct.col.type')}</option>${['in', 'out'].map((k) => html`<option value="${k}" ${d.type === k ? 'selected' : ''}>${t('ct.type.' + k)}</option>`)}</select></label>
              <label class="a-in"><select data-f="status" aria-label="${t('ct.col.status')}"><option value="">${t('ct.col.status')}</option>${['published', 'draft'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('ct.st.' + k)}</option>`)}</select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="ct-preset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['name', 'type', 'image', 'msg', 'status'].map((c) => html`<th>${t('ct.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((p) => html`<tr><td><b>${z() ? p.zh : p.en}</b><small class="hr-sub">${z() ? p.en : p.zh}</small></td><td>${t('ct.type.' + p.type)}</td><td><span class="ct-imgcell">${thumb(p.image)}<span class="a-tag ${p.image ? 'approved' : 'withdrawn'}">${t(p.image ? 'ct.up' : 'ct.notUp')}</span></span></td><td class="ct-msg">${z() ? p.msgZh : p.msgEn}</td>
                <td><span class="a-tag ${p.status === 'published' ? 'approved' : 'withdrawn'}">${t('ct.st.' + p.status)}</span></td><td class="c-act"><button type="button" class="a-link" data-act="ct-pv" data-id="${p.id}">${t('ct.preview')}</button><button type="button" class="a-link" data-act="ct-pedit" data-id="${p.id}">${t('p.edit')}</button></td></tr>`)
                : html`<tr><td colspan="6" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('ct.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- reminders list ----------
      const remRows = () => { const f = S.R.applied, kw = f.kw.trim().toLowerCase(); return ct.reminders().filter((r) => (!kw || [r.titleZh, r.titleEn, r.subZh, r.subEn].some((x) => x.toLowerCase().includes(kw))) && (!f.def || (f.def === 'yes') === r.isDefault)); };
      function remindersPage() {
        const all = remRows(); const d = S.R.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('ct.r.title')}</h1><p class="a-sub">${t('ct.r.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn primary" data-act="ct-rnew" ${ct.reminders().length >= ct.MAX_REMINDERS ? 'disabled' : ''}>${icon('plus', 16)} ${t('ct.r.add')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('ct.r.kw')}" aria-label="${t('ct.r.kw')}"></label>
              <label class="a-in"><select data-f="def" aria-label="${t('ct.col.def')}"><option value="">${t('ct.col.def')}</option><option value="yes" ${d.def === 'yes' ? 'selected' : ''}>${t('ct.def.yes')}</option><option value="no" ${d.def === 'no' ? 'selected' : ''}>${t('ct.def.no')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="ct-rreset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table"><thead><tr>${['icon', 'title', 'sub', 'color', 'def'].map((c) => html`<th>${t('ct.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${all.length ? all.map((r) => html`<tr><td>${thumb(r.icon, 'sq')}</td><td class="ct-msg"><b>${z() ? r.titleZh : r.titleEn}</b></td><td class="ct-msg">${z() ? r.subZh : r.subEn}</td><td><span class="ct-swatch"><i style="background:${r.color}"></i>${r.color}</span></td>
                <td><span class="a-tag ${r.isDefault ? 'approved' : 'withdrawn'}">${t(r.isDefault ? 'ct.def.yes' : 'ct.def.no')}</span></td>
                <td class="c-act"><button type="button" class="a-link" data-act="ct-redit" data-id="${r.id}">${t('p.edit')}</button>${r.isDefault ? html`<span class="mute ct-nodel">${t('ct.r.noDel')}</span>` : html`<button type="button" class="a-link" data-act="ct-rdef" data-id="${r.id}">${t('ct.r.setDef')}</button><button type="button" class="a-link danger" data-act="ct-rdel" data-id="${r.id}">${t('prj.s.del')}</button>`}</td></tr>`)
                : html`<tr><td colspan="6" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('ct.count', { n: all.length })}</span><span></span></footer></section>`;
      }

      // ---------- dialogs ----------
      const imgPicker = (M, key, label, hint) => html`<div class="a-frow"><label class="a-lab">${label}</label>
        <div class="ct-pick">${thumb(M.f[key], key === 'icon' ? 'sq big' : 'big')}<div><label class="a-btn ct-file"><input type="file" hidden data-role="img" data-key="${key}" accept="image/png,image/jpeg">${icon('upload', 16)} ${t(M.f[key] ? 'ct.f.reupload' : 'ct.f.upload')}</label>${M.f[key] ? html`<small class="a-fhint">${M.f[key].name} · ${size(M.f[key].size)}</small>` : ''}<small class="a-fhint">${hint}</small>${M.busy ? html`<small class="a-fhint">${t('ct.f.busy')}</small>` : ''}</div></div>${E(M, key)}</div>`;
      const fld = (M, k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="cf-${k}"><b class="req">*</b> ${label}</label><input id="cf-${k}" class="a-field" data-c="${k}" value="${M.f[k]}" maxlength="${o.max || 80}" placeholder="${o.ph || ''}" autocomplete="off">${E(M, k)}</div>`;
      function popupForm() {
        const M = S.modal; const p = ct.popup(M.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ct.pe.title'), t('prj.p.formSub'))}
          <div class="a-mbody l-form"><div class="p-two">${fld(M, 'zh', t('ct.pe.nameZh'), { max: 30, ph: t('ct.pe.nameZhPh') })}${fld(M, 'en', t('ct.pe.nameEn'), { max: 60, ph: 'Enter pop-up name' })}</div>
            <div class="a-frow"><label class="a-lab">${t('ct.col.type')}</label><div class="a-field ro">${t('ct.type.' + p.type)}</div><small class="a-fhint">${t('ct.pe.typeHint')}</small></div>
            <div class="p-two">${fld(M, 'msgZh', t('ct.pe.msgZh'), { max: 60, ph: t('ct.pe.msgZhPh') })}${fld(M, 'msgEn', t('ct.pe.msgEn'), { max: 120, ph: 'Enter English message' })}</div>
            ${imgPicker(M, 'image', t('ct.pe.image'), t('ct.f.imgHint'))}
            <div class="a-frow"><label class="a-lab" for="cf-status">${t('ct.col.status')}</label><select id="cf-status" class="a-field" data-c="status"><option value="published" ${M.f.status === 'published' ? 'selected' : ''}>${t('ct.st.published')}</option><option value="draft" ${M.f.status === 'draft' ? 'selected' : ''}>${t('ct.st.draft')}</option></select>${E(M, 'status')}<small class="a-fhint">${t('ct.pe.stHint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ct-psave">${t('co.ok')}</button></footer></div></div>`;
      }
      function previewModal() {
        const M = S.modal; const p = ct.popup(M.id); const en = M.pl === 'en'; const inn = p.type === 'in'; const us = en ? 'en' : 'zh';
        const L = (zh, e) => (en ? e : zh);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('ct.pv.title'), t('ct.pv.sub'))}
          <div class="a-mbody"><div class="ct-pv"><div class="ct-sheet"><h3>${L(inn ? '确认签到' : '确认签退', inn ? 'Confirm sign-in' : 'Confirm sign-out')}</h3>
              <div class="ct-sheet-img">${p.image ? html`<img src="${p.image.data}" alt="">` : html`<span>${t('ct.pv.noImg')}</span>`}</div><p class="ct-sheet-msg">${en ? p.msgEn : p.msgZh}</p>
              <dl><div><dt>${L(inn ? '当前签到位置' : '当前签退位置', inn ? 'Sign-in location' : 'Sign-out location')}</dt><dd>1 Raffles Place, Singapore 048616</dd></div><div><dt>${L(inn ? '本次签到时间' : '本次签退时间', inn ? 'Sign-in time' : 'Sign-out time')}</dt><dd>${stamp()}:00</dd></div></dl>
              <div class="ct-sheet-btns"><span>${L('取消', 'Cancel')}</span><b>${L(inn ? '确认签到' : '确认签退', inn ? 'Confirm sign-in' : 'Confirm sign-out')}</b></div><small>${t('ct.pv.demo')}</small></div>
            <div class="ct-pv-side"><div class="sv-seg" role="tablist" aria-label="${t('ct.pv.lang')}">${['zh', 'en'].map((l) => html`<button type="button" role="tab" aria-selected="${M.pl === l ? 'true' : 'false'}" class="${M.pl === l ? 'on' : ''}" data-act="ct-pl" data-l="${l}">${l === 'zh' ? '中文' : 'English'}</button>`)}</div>
              <dl class="a-dl lv-dl"><div><dt>${t('ct.col.name')}</dt><dd>${en ? p.en : p.zh}</dd></div><div><dt>${t('ct.col.type')}</dt><dd>${t('ct.type.' + p.type)}</dd></div><div><dt>${t('ct.col.status')}</dt><dd>${t('ct.st.' + p.status)}</dd></div><div><dt>${t('ct.col.msg')}</dt><dd>${en ? p.msgEn : p.msgZh}</dd></div></dl>
              <p class="a-fhint">${icon('shield', 14)} ${t('ct.pv.note')}${p.status !== 'published' ? ' ' + t('ct.pv.draft') : ''}</p></div></div></div>
          <footer><button type="button" class="a-btn primary" data-act="close-modal">${t('ct.pv.close')}</button></footer></div></div>`;
      }
      function reminderForm() {
        const M = S.modal; const f = M.f; const isDef = M.id && ct.reminder(M.id).isDefault;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(M.id ? t('ct.r.edit') : t('ct.r.add'), t(M.id ? 'ct.r.editSub' : 'ct.r.addSub'))}
          <div class="a-mbody l-form">
            ${imgPicker(M, 'icon', t('ct.r.iconImg'), t('ct.r.iconHint'))}
            <div class="a-frow"><label class="a-lab" for="cf-color"><b class="req">*</b> ${t('ct.col.color')}</label><div class="ct-colorrow"><input type="color" aria-label="${t('ct.col.color')}" data-c="colorPick" value="${/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '#D9F0E4'}"><input id="cf-color" class="a-field" data-c="color" value="${f.color}" maxlength="7" placeholder="#D9F0E4" autocomplete="off"></div>${E(M, 'color')}</div>
            <div class="p-two">${fld(M, 'titleZh', t('ct.r.titleZh'), { max: 40, ph: t('ct.r.titlePh') })}${fld(M, 'titleEn', t('ct.r.titleEn'), { max: 80, ph: 'Enter safety reminder title' })}</div>
            <div class="p-two">${fld(M, 'subZh', t('ct.r.subZh'), { max: 80, ph: t('ct.r.subPh') })}${fld(M, 'subEn', t('ct.r.subEn'), { max: 160, ph: 'Enter safety reminder subtitle' })}</div>
            <div class="a-frow"><label class="a-lab">${t('ct.r.preview')}</label><div class="ct-rem" data-role="rem" style="background:${/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '#EEF0F6'}">${thumb(f.icon, 'sq')}<div><b>${(z() ? f.titleZh : f.titleEn) || t('ct.r.titleDemo')}</b><small>${(z() ? f.subZh : f.subEn) || t('ct.r.subDemo')}</small></div></div></div>
            <div class="a-frow"><label class="p-check"><input type="checkbox" data-c="isDefault" ${f.isDefault ? 'checked' : ''} ${isDef ? 'disabled' : ''}> <b>${t('ct.r.setDef')}</b></label><small class="a-fhint">${t(isDef ? 'ct.r.isDefHint' : 'ct.r.defHint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="ct-rsave">${t(M.id ? 'p.m.save' : 'ct.r.addOk')}</button></footer></div></div>`;
      }
      function confirmModal() {
        const M = S.modal; const r = ct.reminder(M.id); const del = M.k === 'rdel'; const name = z() ? r.titleZh : r.titleEn;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t(del ? 'ct.rd.title' : 'ct.rf.title'), name)}
          <div class="a-mbody l-form"><p class="prj-q">${t(del ? 'ct.rd.msg' : 'ct.rf.msg', { n: name })}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn ${del ? 'danger' : 'primary'}" data-act="${del ? 'ct-rdel-ok' : 'ct-rdef-ok'}">${t(del ? 'co.del.ok' : 'ct.rf.ok')}</button></footer></div></div>`;
      }
      function modal() {
        const M = S.modal; if (!M) return ''; if (M.id && !(M.k === 'pform' || M.k === 'pv' ? ct.popup(M.id) : ct.reminder(M.id))) { S.modal = null; return ''; }
        return { pform: popupForm, pv: previewModal, rform: reminderForm, rdel: confirmModal, rdef: confirmModal }[M.k]();
      }

      const popToForm = (p) => ({ zh: p.zh, en: p.en, msgZh: p.msgZh, msgEn: p.msgEn, image: p.image ? { ...p.image } : null, status: p.status });
      const remToForm = (r) => ({ titleZh: r.titleZh, titleEn: r.titleEn, subZh: r.subZh, subEn: r.subEn, color: r.color, icon: r.icon ? { ...r.icon } : null, isDefault: r.isDefault });
      const blankRem = () => ({ titleZh: '', titleEn: '', subZh: '', subEn: '', color: '#D9F0E4', icon: null, isDefault: false });

      return {
        get tab() { return S.tab; }, set tab(v) { S.modal = null; S.tab = v; },
        crumbs() { return [{ text: t('a.nav.content'), act: 'noop' }, { text: t(S.tab === 'popups' ? 'ct.tab.popups' : 'ct.tab.reminders') }]; },
        page() { return S.tab === 'popups' ? popupsPage() : remindersPage(); }, modal,
        afterRender(v) { const M = S.modal; if (M && (M.k === 'pform' || M.k === 'rform') && !M.focused) { M.focused = true; const el = v.querySelector(M.k === 'pform' ? '#cf-zh' : '#cf-titleZh'); if (el) el.focus(); } },
        onInput(e) {
          const el = e.target, M = S.modal;
          if (el.dataset.f) { (S.tab === 'popups' ? S.P : S.R).draft[el.dataset.f] = el.value; return; }
          if (!(M && el.dataset.c)) return; const k = el.dataset.c;
          if (k === 'colorPick') { M.f.color = el.value.toUpperCase(); M.errs.color = null; render(); return; }
          M.f[k] = k === 'isDefault' ? el.checked : el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
          if (M.k === 'rform' && (k === 'color' || k.startsWith('title') || k.startsWith('sub'))) { const box = ctx.view().querySelector('[data-role=rem]'); if (box) { if (/^#[0-9a-fA-F]{6}$/.test(M.f.color)) box.style.background = M.f.color; const b = box.querySelector('b'), s = box.querySelector('small'); if (b) b.textContent = (z() ? M.f.titleZh : M.f.titleEn) || t('ct.r.titleDemo'); if (s) s.textContent = (z() ? M.f.subZh : M.f.subEn) || t('ct.r.subDemo'); } }
          if (M.k === 'rform' && k === 'color' && /^#[0-9a-fA-F]{6}$/.test(M.f.color)) { const p = ctx.view().querySelector('[data-c=colorPick]'); if (p) p.value = M.f.color; }
        },
        async onChange(e) {
          const el = e.target, M = S.modal; if (!(M && el.dataset.role === 'img')) return; const file = el.files && el.files[0]; if (!file) return; const key = el.dataset.key;
          M.busy = true; M.errs[key] = null; render(); const r = await ct.prepareImage(file); M.busy = false;
          if (r.ok) M.f[key] = r.image; else M.errs[key] = r.error; if (S.modal === M) render();
        },
        onSubmit() { if (S.modal) return; if (S.tab === 'popups') S.P.applied = { ...S.P.draft }; else S.R.applied = { ...S.R.draft }; render(); },
        onEscape() { if (S.modal) { S.modal = null; render(); return true; } return false; }, onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'ct-preset': S.P.draft = { type: '', status: '' }; S.P.applied = { ...S.P.draft }; render(); break;
            case 'ct-rreset': S.R.draft = { kw: '', def: '' }; S.R.applied = { ...S.R.draft }; render(); break;
            case 'ct-pedit': { const p = ct.popup(b.dataset.id); S.modal = { k: 'pform', id: p.id, f: popToForm(p), errs: {} }; render(); break; }
            case 'ct-psave': { const M = S.modal; const r = ct.savePopup(M.id, M.f); if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; } S.modal = null; render(); toast(t('ct.toast.popup'), 'ok'); break; }
            case 'ct-pv': S.modal = { k: 'pv', id: b.dataset.id, pl: lang() }; render(); break;
            case 'ct-pl': S.modal.pl = b.dataset.l; render(); break;
            case 'ct-rnew': S.modal = { k: 'rform', id: null, f: blankRem(), errs: {} }; render(); break;
            case 'ct-redit': { const r = ct.reminder(b.dataset.id); S.modal = { k: 'rform', id: r.id, f: remToForm(r), errs: {} }; render(); break; }
            case 'ct-rsave': { const M = S.modal; const r = ct.saveReminder(M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; } S.modal = null; render(); toast(t(M.id ? 'ct.toast.rSaved' : 'ct.toast.rAdded'), 'ok'); break; }
            case 'ct-rdef': S.modal = { k: 'rdef', id: b.dataset.id }; render(); break;
            case 'ct-rdef-ok': { const id = S.modal.id; S.modal = null; ct.setDefault(id); render(); toast(t('ct.toast.rDef'), 'ok'); break; }
            case 'ct-rdel': S.modal = { k: 'rdel', id: b.dataset.id }; render(); break;
            case 'ct-rdel-ok': { const id = S.modal.id; S.modal = null; const r = ct.removeReminder(id); render(); toast(t(r.ok ? 'ct.toast.rDel' : 'ct.e.default'), r.ok ? 'ok' : 'warn'); break; }
            case 'close-modal': S.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { S.tab = 'popups'; S.P = { draft: { type: '', status: '' }, applied: { type: '', status: '' } }; S.R = { draft: { kw: '', def: '' }, applied: { kw: '', def: '' } }; S.modal = null; },
      };
    },
  });
})(window.BS);
