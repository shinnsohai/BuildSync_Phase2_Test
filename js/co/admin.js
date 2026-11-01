/* Admin: 客户与分包商 — one list of client and subcontractor companies (UEN, contact, bank, business card). */
(function (BS) {
  const { html, icon } = BS;
  const hr = BS.hr;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const size = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

  BS.registerAdmin({
    id: 'co', nav: 'a.nav.clients', stores: [hr],
    tabs: [{ id: 'list', k: 'co.tab' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
      const F0 = () => ({ kw: '', uen: '', type: '', status: '' });
      const C = { draft: F0(), applied: F0(), page: 1, modal: null };
      const nameOf = (c) => (lang() === 'zh' ? c.name : c.nameEn || c.name);
      const rows = () => { const f = C.applied, kw = f.kw.trim().toLowerCase(), u = f.uen.trim().toUpperCase();
        return hr.companies().filter((c) => (!kw || c.name.toLowerCase().includes(kw) || (c.nameEn || '').toLowerCase().includes(kw)) && (!u || c.uen.includes(u)) && (!f.type || c.type === f.type) && (!f.status || (f.status === 'on') === c.active)); };
      const typeTag = (c) => html`<span class="a-tag ${c.type === 'client' ? 'sub-upcoming' : c.type === 'main' ? 'approved' : 'sub-soon'}">${t('co.type.' + c.type)}</span>`;

      function page() {
        const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 6)); if (C.page > pages) C.page = pages; const slice = all.slice((C.page - 1) * 6, C.page * 6); const d = C.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('co.title')}</h1><p class="a-sub">${t('co.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="co-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="co-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
          <section class="a-card">
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('co.f.kw')}" aria-label="${t('co.f.kw')}"></label>
              <label class="a-in"><input data-f="uen" value="${d.uen}" placeholder="${t('co.f.uenKw')}" aria-label="${t('co.f.uenKw')}"></label>
              <label class="a-in"><select data-f="type" aria-label="${t('co.col.type')}"><option value="">${t('co.col.type')}</option>${['client', 'sub', 'main'].map((k) => html`<option value="${k}" ${d.type === k ? 'selected' : ''}>${t('co.type.' + k)}</option>`)}</select></label>
              <label class="a-in"><select data-f="status" aria-label="${t('co.col.status')}"><option value="">${t('co.col.status')}</option><option value="on" ${d.status === 'on' ? 'selected' : ''}>${t('co.st.on')}</option><option value="off" ${d.status === 'off' ? 'selected' : ''}>${t('co.st.off')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="co-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['name', 'type', 'uen', 'contact', 'phone', 'status'].map((c) => html`<th>${t('co.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((c) => html`<tr><td><b>${nameOf(c)}</b>${lang() === 'zh' && c.nameEn && c.nameEn !== c.name ? html`<small class="hr-sub">${c.nameEn}</small>` : ''}</td><td>${typeTag(c)}</td><td class="mute">${c.uen || '—'}</td><td>${c.contact}</td><td class="mute">${hr.maskIntlPhone(c.phone)}</td>
                <td><span class="a-tag ${c.active ? 'approved' : 'withdrawn'}">${t(c.active ? 'co.st.on' : 'co.st.off')}</span></td>
                <td class="c-act"><button type="button" class="a-link" data-act="co-edit" data-id="${c.id}">${t('p.edit')}</button><button type="button" class="a-link danger" data-act="co-del" data-id="${c.id}">${t('prj.s.del')}</button></td></tr>`)
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('co.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${C.page === i + 1 ? 'on' : ''}" data-act="co-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
      }

      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      function formModal() {
        const M = C.modal, f = M.f; const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('co.e.' + M.errs[k])}</small>` : '');
        const fld = (k, label, o = {}) => html`<div class="a-frow"><label class="a-lab" for="cf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label><input id="cf-${k}" class="a-field" data-c="${k}" value="${f[k]}" maxlength="${o.max || 80}" placeholder="${o.ph || ''}" autocomplete="off">${o.hint ? html`<small class="a-fhint">${o.hint}</small>` : ''}${E(k)}</div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(M.id ? t('co.edit') : t('co.add'), t('prj.p.formSub'))}
          <div class="a-mbody l-form">
            <div class="p-two">${fld('name', t('co.f.name'), { req: 1, ph: t('co.f.namePh') })}${fld('nameEn', t('co.f.nameEn'), { ph: 'English name' })}</div>
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="cf-type"><b class="req">*</b> ${t('co.col.type')}</label><select id="cf-type" class="a-field" data-c="type"><option value="">${t('prj.p.pick')}</option>${['client', 'sub', 'main'].map((k) => html`<option value="${k}" ${f.type === k ? 'selected' : ''}>${t('co.type.' + k)}</option>`)}</select>${E('type')}</div>
              ${fld('uen', t('co.f.uen'), { req: f.type === 'client', ph: t('co.f.uenPh'), max: 24, hint: f.type === 'sub' ? t('co.f.uenOpt') : '' })}</div>
            <div class="p-two">${fld('contact', t('co.f.contact'), { req: 1, ph: t('co.f.contactPh'), max: 40 })}${fld('phone', t('co.f.phone'), { ph: '+65 8123 4567', max: 24 })}</div>
            ${fld('email', t('co.f.email'), { ph: t('co.f.emailPh') })}
            <div class="p-two">${fld('bank', t('co.f.bank'), { ph: t('co.f.bankPh') })}${fld('bankNo', t('co.f.bankNo'), { ph: t('co.f.bankNoPh'), max: 26, hint: M.id && f.bankNo && /^•/.test(f.bankNo) ? t('hr.f.maskedHint') : '' })}</div>
            ${fld('address', t('co.f.address'), { req: 1, ph: t('co.f.addressPh'), max: 120 })}
            <div class="a-frow"><label class="a-lab">${t('co.f.card')}</label>
              <div class="hr-file"><input type="file" data-role="card-in" accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg"><small class="a-fhint">${f.card ? t('co.f.cardCur', { f: f.card.name, s: size(f.card.size) }) : t('co.f.cardHint')}</small>${f.card ? html`<button type="button" class="a-link" data-act="co-card-x">${t('co.f.cardRemove')}</button>` : ''}</div>${E('card')}</div>
            <div class="a-frow"><label class="a-lab" for="cf-active">${t('co.col.status')}</label><select id="cf-active" class="a-field" data-c="active"><option value="1" ${f.active ? 'selected' : ''}>${t('co.st.on')}</option><option value="0" ${f.active ? '' : 'selected'}>${t('co.st.off')}</option></select></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="co-save">${t('co.ok')}</button></footer></div></div>`;
      }
      function delModal() {
        const c = hr.company(C.modal.id); const u = hr.companyUsage(c.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('co.del.title'), t('co.del.sub'))}
          <div class="a-mbody l-form"><dl class="ps-dl"><div class="ps-kv"><dt>${t('co.f.name')}</dt><dd>${nameOf(c)}</dd></div><div class="ps-kv"><dt>${t('co.f.uen')}</dt><dd>${c.uen || '—'}</dd></div></dl>
            ${u.used ? html`<p class="prj-block" data-role="blocked">${icon('x', 16)} <span><b>${t('prj.del.blocked')}</b> ${[u.people ? t('co.del.people', { n: u.people }) : '', u.projects ? t('co.del.projects', { n: u.projects }) : '', u.deps ? t('co.del.deps', { n: u.deps }) : ''].filter(Boolean).join(t('prj.del.sep'))}${t('prj.del.dot')} ${t('co.del.how')}</span></p>` : html`<p class="a-fhint">${t('co.del.note')}</p>`}</div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button>${u.used && c.active ? html`<button type="button" class="a-btn" data-act="co-stop" data-id="${c.id}">${t('prj.del.stopInstead')}</button>` : ''}<button type="button" class="a-btn danger" data-act="co-del-ok" ${u.used ? 'disabled' : ''}>${t('co.del.ok')}</button></footer></div></div>`;
      }
      function modal() { const M = C.modal; if (M && M.id && !hr.company(M.id)) { C.modal = null; return ''; } return !M ? '' : M.k === 'form' ? formModal() : delModal(); }

      const toForm = (c) => ({ name: c.name, nameEn: c.nameEn === c.name ? '' : c.nameEn, type: c.type, uen: c.uen, contact: c.contact, phone: c.phone, email: c.email, bank: c.bank, bankNo: c.bankMask, address: c.address, card: c.card ? { ...c.card } : null, active: c.active });
      const blank = () => ({ name: '', nameEn: '', type: 'client', uen: '', contact: '', phone: '', email: '', bank: '', bankNo: '', address: '', card: null, active: true });
      function exportCsv() {
        const all = rows(); const head = ['name', 'name_en', 'type', 'uen', 'contact', 'phone', 'email', 'bank', 'account', 'address', 'status'];
        download(`companies-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([head, ...all.map((c) => [c.name, c.nameEn, t('co.type.' + c.type), c.uen, c.contact, hr.maskIntlPhone(c.phone), c.email, c.bank, c.bankMask, c.address, t(c.active ? 'co.st.on' : 'co.st.off')])]));
        toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }
      return {
        tab: 'list', crumbs() { return [{ text: t('a.nav.clients'), act: 'noop' }, { text: t('co.tab') }]; }, page, modal,
        afterRender(v) { const M = C.modal; if (M && M.k === 'form' && !M.focused) { M.focused = true; const el = v.querySelector('#cf-name'); if (el) el.focus(); } },
        onInput(e) {
          const el = e.target, M = C.modal;
          if (el.dataset.f) { C.draft[el.dataset.f] = el.value; return; }
          if (!(M && M.k === 'form' && el.dataset.c)) return;
          const k = el.dataset.c; M.f[k] = k === 'active' ? el.value === '1' : el.value;
          if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
          if (k === 'type') render();
        },
        onChange(e) {
          const el = e.target, M = C.modal; if (!(M && M.k === 'form' && el.dataset.role === 'card-in')) return;
          const file = el.files && el.files[0]; if (!file) return;
          M.f.card = { name: file.name, size: file.size }; M.errs.card = null; render();
        },
        onSubmit() { C.applied = { ...C.draft }; C.page = 1; render(); },
        onEscape() { if (C.modal) { C.modal = null; render(); return true; } return false; }, onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'co-reset': C.draft = F0(); C.applied = F0(); C.page = 1; render(); break;
            case 'co-page': C.page = +b.dataset.p; render(); break;
            case 'co-export': exportCsv(); break;
            case 'co-new': C.modal = { k: 'form', id: null, f: blank(), errs: {} }; render(); break;
            case 'co-edit': { const c = hr.company(b.dataset.id); C.modal = { k: 'form', id: c.id, f: toForm(c), errs: {} }; render(); break; }
            case 'co-card-x': C.modal.f.card = null; render(); break;
            case 'co-save': {
              const M = C.modal; const r = hr.saveCompany(M.f, M.id);
              if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
              C.modal = null; render(); toast(t(M.id ? 'co.toast.updated' : 'co.toast.created'), 'ok'); break;
            }
            case 'co-del': C.modal = { k: 'del', id: b.dataset.id }; render(); break;
            case 'co-del-ok': { const M = C.modal; C.modal = null; const r = hr.deleteCompany(M.id); if (!r.ok) { C.modal = M; render(); break; } render(); toast(t('co.toast.deleted'), 'ok'); break; }
            case 'co-stop': { const c = hr.company(b.dataset.id); C.modal = null; hr.saveCompany({ ...toForm(c), active: false }, c.id); toast(t('co.toast.stopped'), 'ok'); break; }
            case 'close-modal': C.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { C.draft = F0(); C.applied = F0(); C.page = 1; C.modal = null; },
      };
    },
  });
})(window.BS);
