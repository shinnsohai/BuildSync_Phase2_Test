/* Admin: 操作日志 → 审计日志 — a read-only trail of what administrators changed. */
(function (BS) {
  const { html, icon } = BS;
  const au = BS.audit;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');

  BS.registerAdmin({
    id: 'audit', nav: 'a.nav.audit', stores: [au],
    tabs: [{ id: 'log', k: 'au.tab' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
      const F0 = () => ({ admin: '', module: '', type: '', date: '' });
      const V = { draft: F0(), applied: F0(), page: 1 };
      const z = () => lang() === 'zh';
      const adminName = (k) => { const w = au.who(k); return z() ? w.zh : w.en; };
      const rows = () => { const f = V.applied; return au.list().filter((e) => (!f.admin || e.admin === f.admin) && (!f.module || e.module === f.module) && (!f.type || e.type === f.type) && (!f.date || e.at.slice(0, 10) === f.date)); };
      const when = (e) => e.at.slice(5).replace('T', ' ');

      function page() {
        const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 10)); if (V.page > pages) V.page = pages; const slice = all.slice((V.page - 1) * 10, V.page * 10); const d = V.draft;
        const sel = (k, label, opts) => html`<label class="a-in"><select data-f="${k}" aria-label="${label}"><option value="">${label}</option>${opts.map(([v, text]) => html`<option value="${v}" ${d[k] === v ? 'selected' : ''}>${text}</option>`)}</select></label>`;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('au.title')}</h1><p class="a-sub">${t('au.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="au-export">${icon('upload', 16)} ${t('hr.export')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              ${sel('admin', t('au.col.admin'), au.admins().map((k) => [k, adminName(k)]))}${sel('module', t('au.col.module'), au.MODULES.map((k) => [k, t('au.mod.' + k)]))}${sel('type', t('au.col.type'), au.TYPES.map((k) => [k, t('au.type.' + k)]))}
              <label class="a-in"><span class="a-in-l">${t('au.f.date')}</span><input type="date" data-f="date" value="${d.date}"></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="au-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['at', 'admin', 'module', 'type', 'object', 'ip', 'result'].map((c) => html`<th>${t('au.col.' + c)}</th>`)}</tr></thead>
              <tbody>${slice.length ? slice.map((e) => html`<tr><td class="mute au-time">${when(e)}</td><td>${adminName(e.admin)}</td><td>${t('au.mod.' + e.module)}</td><td>${t('au.type.' + e.type)}</td><td class="au-obj">${z() ? e.object.zh : e.object.en}</td><td class="mute">${e.ip}</td><td><span class="a-tag ${e.result === 'success' ? 'approved' : 'rejected'}">${t('au.res.' + e.result)}</span></td></tr>`)
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('au.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${V.page === i + 1 ? 'on' : ''}" data-act="au-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>
          <p class="a-fhint au-note">${icon('shield', 14)} ${t('au.note')}</p>`;
      }
      function exportCsv() {
        const all = rows(); download(`audit-log-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([['time', 'admin', 'module', 'type', 'object', 'ip', 'result'], ...all.map((e) => [e.at.replace('T', ' '), adminName(e.admin), t('au.mod.' + e.module), t('au.type.' + e.type), z() ? e.object.zh : e.object.en, e.ip, t('au.res.' + e.result)])]));
        toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }
      return {
        tab: 'log', crumbs() { return [{ text: t('a.nav.audit'), act: 'noop' }, { text: t('au.tab') }]; }, page,
        onInput(e) { const el = e.target; if (el.dataset.f) V.draft[el.dataset.f] = el.value; },
        onSubmit() { V.applied = { ...V.draft }; V.page = 1; render(); },
        onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'au-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break;
            case 'au-page': V.page = +b.dataset.p; render(); break;
            case 'au-export': exportCsv(); break;
            default: return false;
          }
          return true;
        },
        reset() { V.draft = F0(); V.applied = F0(); V.page = 1; },
      };
    },
  });
})(window.BS);
