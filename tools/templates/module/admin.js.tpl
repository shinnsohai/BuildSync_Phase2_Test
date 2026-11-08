// @ts-check
/* The admin page of __EN__: a list with filters, a form in a dialog, delete with confirmation, CSV export.
   The dashboard calls create(ctx) when the page is opened and then asks the instance to draw (page, modal) and to handle clicks.
   Action names decide which permission is asked, so keep the words: -new / -add (create), -edit / -update (update), -del / -delete (delete), export (export). */
(function (BS) {
  const sdk = BS.sdk; const { html, icon } = sdk.ui; const mod = () => BS.__ID__;

  sdk.admin.register({
    id: '__ID__', nav: 'a.nav.__ID__',
    stores: [{ subscribe: (fn) => mod().subscribe(fn) }],           // the page repaints when the module's data changes
    tabs: [{ id: 'list', k: '__ID__.tab.list' }],
    create(ctx) {
      const t = ctx.t; const toast = ctx.toast; const render = ctx.rerender;
      const D = { tab: 'list', status: '', modal: /** @type {any} */ (null) };       // what this page remembers while it is open
      const can = (op) => sdk.perm.can('__ID__', op);
      const by = () => 'acct:' + sdk.perm.currentId();
      const who = (no) => { const e = sdk.people.emp(no); return e ? (ctx.lang() === 'zh' ? e.name : e.nameEn || e.name) : no ? no : '—'; };
      const err = (e, k) => (e && e[k] ? html`<small class="a-ferr" data-err="${k}">${t('__ID__.e.' + e[k])}</small>` : '');
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub || ''}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const csv = (name, rows) => { const text = rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

      function page() {
        const m = mod(); const all = m.items(); const rows = m.items({ status: D.status });
        const kpi = [['__ID__.k.open', all.filter((x) => x.status === 'open').length, 'active'], ['__ID__.k.late', all.filter((x) => m.isLate(x)).length, 'blocked'], ['__ID__.k.done', all.filter((x) => x.status === 'done').length, 'granted']];
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('__ID__.title')}</h1><p class="a-sub">${t('__ID__.sub')}</p></div>
            <div class="a-tbtns"><button type="button" class="a-btn" data-act="__ID__-export">${icon('upload', 16)} ${t('__ID__.export')}</button>${can('create') ? html`<button type="button" class="a-btn primary" data-act="__ID__-new">${icon('plus', 16)} ${t('__ID__.new')}</button>` : ''}</div></div>
          <div class="dp-kpis">${kpi.map(([lab, n, cls]) => html`<div class="dp-kpi ${cls}"><b>${n}</b><span>${t(lab)}</span></div>`)}</div>
          <section class="a-card">
            <div class="hr-chips" role="group">${['', ...m.STATUS].map((s) => html`<button type="button" class="${D.status === s ? 'on' : ''}" data-act="__ID__-filter" data-s="${s}" aria-pressed="${D.status === s ? 'true' : 'false'}">${t(s ? '__ID__.status.' + s : '__ID__.all')}</button>`)}</div>
            ${rows.length ? html`<div class="a-tablewrap"><table class="a-table"><thead><tr><th>${t('__ID__.col.title')}</th><th>${t('__ID__.col.owner')}</th><th>${t('__ID__.col.due')}</th><th>${t('__ID__.col.status')}</th><th class="c-act">${t('__ID__.col.act')}</th></tr></thead><tbody>
              ${rows.map((x) => html`<tr data-item="${x.id}"><td><b>${x.title}</b><small class="hr-sub">${x.id}${x.note ? ' · ' + x.note : ''}</small></td><td>${who(x.owner)}</td><td>${x.due || '—'} ${m.isLate(x) ? html`<span class="__ID__-late">${t('__ID__.late')}</span>` : ''}</td><td><span class="a-tag ${x.status === 'done' ? 'approved' : 'pending'}">${t('__ID__.status.' + x.status)}</span></td>
                <td class="c-act">${can('update') ? html`<button type="button" class="a-link" data-act="__ID__-update-status" data-id="${x.id}">${x.status === 'open' ? t('__ID__.done') : t('__ID__.reopen')}</button><button type="button" class="a-link" data-act="__ID__-edit" data-id="${x.id}">${t('__ID__.edit')}</button>` : ''}${can('delete') ? html`<button type="button" class="a-link bad" data-act="__ID__-del" data-id="${x.id}">${t('__ID__.del')}</button>` : ''}</td></tr>`)}</tbody></table></div>` : html`<div class="a-none"><p>${t('__ID__.none')}</p></div>`}
          </section>`;
      }
      function formModal() {
        const M = D.modal; const f = M.f; const e = M.errs || {}; const edit = !!M.id; const people = sdk.people.emps().filter((p) => p.status === 'active');
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>${head(t(edit ? '__ID__.edit' : '__ID__.new'), edit ? M.id : '')}<div class="a-mbody l-form">
          <div class="a-frow"><label class="a-lab" for="f-title"><b class="req">*</b> ${t('__ID__.f.title')}</label><input id="f-title" class="a-field" data-f="title" maxlength="60" value="${f.title}">${err(e, 'title')}</div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="f-owner">${t('__ID__.f.owner')}</label><select id="f-owner" class="a-field" data-f="owner"><option value="">${t('__ID__.f.noOwner')}</option>${people.map((p) => html`<option value="${p.empNo}" ${f.owner === p.empNo ? 'selected' : ''}>${who(p.empNo)} · ${p.empNo}</option>`)}</select>${err(e, 'owner')}</div>
            <div class="a-frow"><label class="a-lab" for="f-due">${t('__ID__.f.due')}</label><input id="f-due" class="a-field" type="date" data-f="due" value="${f.due}">${err(e, 'due')}</div></div>
          <div class="a-frow"><label class="a-lab" for="f-note">${t('__ID__.f.note')}</label><textarea id="f-note" class="a-field" rows="3" maxlength="200" data-f="note">${f.note}</textarea>${err(e, 'note')}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="${edit ? '__ID__-edit-ok' : '__ID__-new-ok'}">${t('__ID__.save')}</button></footer></div></div>`;
      }
      function delModal() {
        const x = mod().item(D.modal.id); if (!x) return '';
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" aria-labelledby="a-mt" data-stop>${head(t('__ID__.del'), x.id)}<div class="a-mbody"><p class="p-warnbox">${icon('warn', 16)} ${t('__ID__.delMsg', { t: x.title })}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn bad" data-act="__ID__-del-ok">${t('__ID__.del')}</button></footer></div></div>`;
      }
      const blank = (x) => ({ title: x ? x.title : '', owner: x ? x.owner : '', due: x ? x.due : '', note: x ? x.note : '' });
      const fail = (r) => toast(t('__ID__.e.' + (r.error === 'missing' ? 'missing' : 'denied')), 'warn');

      return {
        get tab() { return D.tab; }, set tab(v) { D.tab = v; },
        crumbs() { return [{ text: t('a.nav.__ID__') }]; },
        page,
        modal() { const M = D.modal; if (!M) return ''; return M.k === 'del' ? delModal() : formModal(); },
        onInput(e) { const el = /** @type {HTMLInputElement} */ (e.target); if (D.modal && D.modal.f && el.dataset.f) { D.modal.f[el.dataset.f] = el.value; D.modal.errs = {}; } },
        onEscape() { if (D.modal) { D.modal = null; render(); return true; } return false; },
        onClick(act, el) {
          const id = el.dataset.id || '';
          switch (act) {
            case '__ID__-filter': D.status = el.dataset.s || ''; render(); return true;
            case '__ID__-new': D.modal = { k: 'form', f: blank(null), errs: {} }; render(); return true;
            case '__ID__-edit': D.modal = { k: 'form', id, f: blank(mod().item(id)), errs: {} }; render(); return true;
            case '__ID__-new-ok': { const M = D.modal; const r = mod().create(M.f, by()); if (!r.ok) { M.errs = r.errors || {}; render(); return true; } D.modal = null; render(); toast(t('__ID__.saved'), 'ok'); return true; }
            case '__ID__-edit-ok': { const M = D.modal; const r = mod().update(M.id, M.f, by()); if (!r.ok) { if (r.errors) { M.errs = r.errors; render(); } else fail(r); return true; } D.modal = null; render(); toast(t('__ID__.saved'), 'ok'); return true; }
            case '__ID__-update-status': { const x = mod().item(id); const r = x ? mod().setStatus(id, x.status === 'open' ? 'done' : 'open', by()) : { ok: false, error: 'missing' }; if (!r.ok) fail(r); else toast(t('__ID__.saved'), 'ok'); return true; }
            case '__ID__-del': D.modal = { k: 'del', id }; render(); return true;
            case '__ID__-del-ok': { const r = mod().remove(D.modal.id); D.modal = null; render(); if (!r.ok) fail(r); else toast(t('__ID__.deleted'), 'ok'); return true; }
            case '__ID__-export': { const rows = mod().items({ status: D.status }); csv('__ID__-' + sdk.time.today() + '.csv', [['id', 'title', 'owner', 'due', 'status', 'note'], ...rows.map((x) => [x.id, x.title, x.owner, x.due, x.status, x.note])]); toast(t('__ID__.saved'), 'ok'); return true; }
            case 'close-modal': D.modal = null; render(); return true;
            default: return false;
          }
        },
        reset() { D.modal = null; D.status = ''; D.tab = 'list'; },
      };
    },
  });
})(window.BS);
