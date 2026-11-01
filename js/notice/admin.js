/* Admin: 通知管理 — platform announcement send records, publish (rich text, Chinese and English, now or scheduled), detail and delete. */
(function (BS) {
  const { html, icon, raw } = BS;
  const hr = BS.hr, nt = BS.notice;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const TAG = { success: 'approved', partial: 'pending', scheduled: 'sub-upcoming' };
  const nowLocal = () => BS.fmt.now().slice(0, 16);

  BS.registerAdmin({
    id: 'notice', nav: 'a.nav.notice', stores: [nt, hr],
    tabs: [{ id: 'log', k: 'nt.tab' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
      const F0 = () => ({ kw: '', scope: '', status: '', date: '' });
      const N = { draft: F0(), applied: F0(), page: 1, modal: null };
      const L = (a, k) => (lang() === 'zh' ? a[k + 'Zh'] : a[k + 'En']);
      const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
      const scopeText = (a) => (a.scope === 'all' ? t('nt.scope.all') : `${t('nt.scope.' + a.scope)} · ${(a.targetNames || []).map(loc).join('、')}`);
      const rows = () => { const f = N.applied, kw = f.kw.trim().toLowerCase();
        return nt.list().filter((a) => (!kw || a.titleZh.toLowerCase().includes(kw) || a.titleEn.toLowerCase().includes(kw)) && (!f.scope || a.scope === f.scope) && (!f.status || a.status === f.status) && (!f.date || a.sentAt.slice(0, 10) === f.date)); };
      const when = (a) => a.sentAt.slice(5, 16).replace('T', ' ');

      function page() {
        const all = rows(); const pages = Math.max(1, Math.ceil(all.length / 6)); if (N.page > pages) N.page = pages; const slice = all.slice((N.page - 1) * 6, N.page * 6); const d = N.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('nt.title')}</h1><p class="a-sub">${t('nt.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="nt-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="nt-new">${icon('plus', 16)} ${t('nt.publish')}</button></div></div>
          <section class="a-card">
            <form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('nt.f.title')}" aria-label="${t('nt.f.title')}"></label>
              <label class="a-in"><select data-f="scope" aria-label="${t('nt.col.scope')}"><option value="">${t('nt.col.scope')}</option>${['all', 'company', 'project'].map((k) => html`<option value="${k}" ${d.scope === k ? 'selected' : ''}>${t('nt.scope.' + k)}</option>`)}</select></label>
              <label class="a-in"><select data-f="status" aria-label="${t('nt.col.status')}"><option value="">${t('nt.col.status')}</option>${['success', 'partial', 'scheduled'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('nt.st.' + k)}</option>`)}</select></label>
              <label class="a-in"><span class="a-in-l">${t('nt.f.date')}</span><input type="date" data-f="date" value="${d.date}"></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="nt-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['title', 'type', 'scope', 'channel', 'time', 'count', 'status'].map((c) => html`<th>${t('nt.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((a) => html`<tr><td class="nt-ttl"><b>${L(a, 'title')}</b><small class="hr-sub">${lang() === 'zh' ? a.titleEn : a.titleZh}</small></td><td>${t('nt.type.platform')}</td><td>${scopeText(a)}</td><td>${t('nt.ch.' + a.channel)}</td><td class="mute">${when(a)}</td>
                <td>${a.status === 'scheduled' ? html`<span class="mute">${t('nt.est', { n: nt.countFor(a.scope, a.targets) })}</span>` : html`${a.recipients.length}${a.failed.length ? html` <small class="nt-fail">${t('nt.failedN', { n: a.failed.length })}</small>` : ''}`}</td>
                <td><span class="a-tag ${TAG[a.status]}">${t('nt.st.' + a.status)}</span></td><td class="c-act"><button type="button" class="a-link" data-act="nt-view" data-id="${a.id}">${t('nt.view')}</button></td></tr>`)
                : html`<tr><td colspan="8" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('nt.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${N.page === i + 1 ? 'on' : ''}" data-act="nt-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
      }

      // ---------- publish dialog ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('nt.e.' + M.errs[k])}</small>` : '');
      const L2 = (M) => (M.lang === 'zh' ? 'Zh' : 'En');
      function targetsBox(M) {
        const f = M.f; if (f.scope === 'all') return html`<div class="a-field ro">${t('nt.allUsers')}</div>`;
        const items = f.scope === 'company' ? hr.companies().filter((c) => c.active).map((c) => ({ id: c.id, name: loc({ zh: c.name, en: c.nameEn }) })) : hr.projects().filter((p) => hr.projectStatus(p) !== 'done').map((p) => ({ id: p.key, name: loc(p) }));
        return html`<div class="nt-chips" role="group" aria-label="${t('nt.f.targets')}">${items.map((x) => html`<button type="button" class="${f.targets.includes(x.id) ? 'on' : ''}" aria-pressed="${f.targets.includes(x.id) ? 'true' : 'false'}" data-act="nt-tg" data-id="${x.id}">${x.name}</button>`)}</div>`;
      }
      function formModal() {
        const M = N.modal, f = M.f, z = M.lang === 'zh'; const k = L2(M); const est = f.scope === 'all' || f.targets.length ? nt.countFor(f.scope, f.targets) : null;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('nt.publish'), t('prj.p.formSub'))}
          <div class="a-mbody l-form">
            <div class="p-two"><div class="a-frow"><label class="a-lab">${t('nt.f.type')}</label><div class="a-field ro">${t('nt.type.platform')}</div></div>
              <div class="a-frow"><label class="a-lab" for="nt-scope"><b class="req">*</b> ${t('nt.col.scope')}</label><select id="nt-scope" class="a-field" data-n="scope">${['all', 'company', 'project'].map((s) => html`<option value="${s}" ${f.scope === s ? 'selected' : ''}>${t('nt.scope.' + s)}</option>`)}</select>${E(M, 'scope')}</div></div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('nt.f.targets')}</label>${targetsBox(M)}${E(M, 'targets')}<small class="a-fhint" data-role="est">${est == null ? t('nt.f.targetsHint') : t('nt.f.est', { n: est })}</small></div>
            <div class="p-two"><div class="a-frow"><label class="a-lab">${t('nt.col.channel')}</label><select class="a-field" data-n="channel"><option value="app" ${f.channel === 'app' ? 'selected' : ''}>${t('nt.ch.app')}</option><option value="sms" ${f.channel === 'sms' ? 'selected' : ''}>${t('nt.ch.sms')}</option></select><small class="a-fhint">${t(f.channel === 'sms' ? 'nt.f.smsHint' : 'nt.f.appHint')}</small>${E(M, 'channel')}</div>
              <div class="a-frow"><label class="a-lab">${t('nt.f.when')}</label><div class="l-radio" role="radiogroup">${['now', 'later'].map((w) => html`<label class="${f.when === w ? 'on' : ''}"><input type="radio" name="nt-when" data-n="when" value="${w}" ${f.when === w ? 'checked' : ''}>${t('nt.when.' + w)}</label>`)}</div>
                ${f.when === 'later' ? html`<input type="datetime-local" class="a-field" data-n="at" value="${f.at}" min="${nowLocal()}" aria-label="${t('nt.f.at')}">${E(M, 'at')}` : ''}</div></div>
            <div class="nt-lang"><div class="seg" role="tablist" aria-label="${t('nt.f.langs')}">${['zh', 'en'].map((l) => html`<button type="button" role="tab" aria-selected="${M.lang === l ? 'true' : 'false'}" aria-pressed="${M.lang === l ? 'true' : 'false'}" data-act="nt-lang" data-l="${l}">${l === 'zh' ? '中文' : 'English'}${M.errs['title' + (l === 'zh' ? 'Zh' : 'En')] || M.errs['body' + (l === 'zh' ? 'Zh' : 'En')] ? html` <i class="nt-dot" aria-label="!"></i>` : ''}</button>`)}</div><small class="a-fhint">${t('nt.f.langHint')}</small></div>
            <div class="a-frow"><label class="a-lab" for="nt-title"><b class="req">*</b> ${t(z ? 'nt.f.titleZh' : 'nt.f.titleEn')}</label><input id="nt-title" class="a-field" data-n="title${k}" value="${f['title' + k]}" maxlength="${z ? 60 : 100}" placeholder="${t(z ? 'nt.f.titlePhZh' : 'nt.f.titlePhEn')}" autocomplete="off">${E(M, 'title' + k)}</div>
            <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t(z ? 'nt.f.bodyZh' : 'nt.f.bodyEn')}</label>
              <div class="nt-editor"><div class="nt-tb" role="toolbar" aria-label="${t('nt.tb')}">
                <button type="button" data-act="nt-fmt" data-c="p" title="${t('nt.tb.p')}">${t('nt.tb.p')} · 14 px</button><button type="button" data-act="nt-fmt" data-c="h2" title="${t('nt.tb.h2')}">${t('nt.tb.h2')} · 18 px</button><i></i>
                <button type="button" data-act="nt-fmt" data-c="bold" title="${t('nt.tb.b')}"><b>B</b></button><button type="button" data-act="nt-fmt" data-c="italic" title="${t('nt.tb.i')}"><em>I</em></button><button type="button" data-act="nt-fmt" data-c="underline" title="${t('nt.tb.u')}"><u>U</u></button><i></i>
                <button type="button" data-act="nt-fmt" data-c="ul" title="${t('nt.tb.ul')}">•</button><button type="button" data-act="nt-fmt" data-c="ol" title="${t('nt.tb.ol')}">1.</button><button type="button" data-act="nt-fmt" data-c="clear" title="${t('nt.tb.clear')}">${icon('x', 14)}</button></div>
                <div class="nt-rt" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${t(z ? 'nt.f.bodyZh' : 'nt.f.bodyEn')}" data-rt="${k}" data-ph="${t(z ? 'nt.f.bodyPhZh' : 'nt.f.bodyPhEn')}"></div>
                <div class="nt-count"><span>${t('nt.tb.para')}</span><span data-role="count">${t('nt.tb.chars', { n: nt.plain(f['body' + k]).length })}</span></div></div>${E(M, 'body' + k)}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="nt-send">${f.when === 'later' ? t('nt.schedule') : t('nt.send')}</button></footer></div></div>`;
      }
      function viewModal() {
        const M = N.modal; const a = nt.get(M.id); const z = M.lang === 'zh';
        const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v || '—'}</dd></div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('nt.d.title'), t('nt.d.sub'))}
          <div class="a-mbody"><div class="nt-dhead"><span class="a-tag ${TAG[a.status]}">${t(a.status === 'scheduled' ? 'nt.st.scheduled' : 'nt.d.sent')}</span>${a.status === 'partial' ? html`<span class="a-tag pending">${t('nt.st.partial')}</span>` : ''}</div>
            <dl class="a-dl lv-dl">${kv('nt.f.type', t('nt.type.platform'))}${kv('nt.d.time', a.sentAt.replace('T', ' '))}${kv('nt.col.scope', t('nt.scope.' + a.scope))}${kv('nt.f.targets', a.scope === 'all' ? t('nt.allUsers') : (a.targetNames || []).map(loc).join('、'))}${kv('nt.col.channel', t('nt.ch.' + a.channel))}${kv('nt.d.sender', loc(a.sender))}
              ${kv('nt.col.count', a.status === 'scheduled' ? t('nt.est', { n: nt.countFor(a.scope, a.targets) }) : String(a.recipients.length) + (a.failed.length ? ' · ' + t('nt.failedN', { n: a.failed.length }) : ''))}</dl>
            ${a.failed.length ? html`<p class="prj-warn">${icon('warn', 16)} <span>${t('nt.d.failedWho')}: ${a.failed.map((e) => { const x = hr.emp(e); return x ? (lang() === 'zh' ? x.name : x.nameEn || x.name) : e; }).join('、')}. ${t('nt.d.simNote')}</span></p>` : ''}
            <div class="nt-lang"><div class="seg" role="tablist" aria-label="${t('nt.d.readLang')}">${['zh', 'en'].map((l) => html`<button type="button" role="tab" aria-selected="${M.lang === l ? 'true' : 'false'}" aria-pressed="${M.lang === l ? 'true' : 'false'}" data-act="nt-lang" data-l="${l}">${l === 'zh' ? '中文' : 'English'}</button>`)}</div><small class="a-fhint">${t('nt.d.readNote')}</small></div>
            <article class="nt-article"><h3>${z ? a.titleZh : a.titleEn}</h3><div class="nt-body">${raw(nt.clean(z ? a.bodyZh : a.bodyEn))}</div></article></div>
          <footer><button type="button" class="a-btn danger-o" data-act="nt-del" data-id="${a.id}">${t('prj.s.del')}</button><button type="button" class="a-btn primary" data-act="close-modal">${t('nt.d.close')}</button></footer></div></div>`;
      }
      function delModal() {
        const a = nt.get(N.modal.id);
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('nt.del.title'), t('nt.del.sub'))}
          <div class="a-mbody l-form"><dl class="ps-dl"><div class="ps-kv"><dt>${t('nt.col.title')}</dt><dd>${L(a, 'title')}</dd></div><div class="ps-kv"><dt>${t('nt.col.time')}</dt><dd>${a.sentAt.replace('T', ' ')}</dd></div></dl>
            <p class="a-fhint">${t(a.status === 'scheduled' ? 'nt.del.noteSched' : 'nt.del.note')}</p></div>
          <footer><button type="button" class="a-btn" data-act="nt-del-back">${t('common.cancel')}</button><button type="button" class="a-btn danger" data-act="nt-del-ok">${t('co.del.ok')}</button></footer></div></div>`;
      }
      function modal() {
        const M = N.modal; if (!M) return ''; if (M.id && !nt.get(M.id)) { N.modal = null; return ''; }
        return M.k === 'form' ? formModal() : M.k === 'view' ? viewModal() : delModal();
      }

      // ---------- rich text ----------
      const rtEl = () => ctx.view().querySelector('.nt-rt');
      function syncBody() { const M = N.modal, el = rtEl(); if (!M || !el) return; const k = L2(M); M.f['body' + k] = el.innerHTML; const c = ctx.view().querySelector('[data-role=count]'); if (c) c.textContent = t('nt.tb.chars', { n: nt.plain(el.innerHTML).length }); if (M.errs['body' + k]) { M.errs['body' + k] = null; ctx.view().querySelectorAll(`[data-err="body${k}"]`).forEach((n) => n.remove()); } }
      function format(cmd) {
        const el = rtEl(); if (!el) return; el.focus();
        const map = { p: ['formatBlock', 'p'], h2: ['formatBlock', 'h2'], bold: ['bold'], italic: ['italic'], underline: ['underline'], ul: ['insertUnorderedList'], ol: ['insertOrderedList'], clear: ['removeFormat'] };
        const [c, v] = map[cmd]; document.execCommand(c, false, v); if (cmd === 'clear') document.execCommand('formatBlock', false, 'p'); syncBody();
      }
      const blank = () => ({ scope: 'all', targets: [], channel: 'app', when: 'now', at: '', titleZh: '', titleEn: '', bodyZh: '', bodyEn: '' });
      function exportCsv() {
        const all = rows(); const head = ['title_zh', 'title_en', 'type', 'scope', 'channel', 'time', 'recipients', 'failed', 'status'];
        download(`announcements-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([head, ...all.map((a) => [a.titleZh, a.titleEn, t('nt.type.platform'), scopeText(a), t('nt.ch.' + a.channel), a.sentAt.replace('T', ' '), a.recipients.length, a.failed.length, t('nt.st.' + a.status)])]));
        toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }

      return {
        tab: 'log', crumbs() { return [{ text: t('a.nav.notice'), act: 'noop' }, { text: t('nt.tab') }]; }, page, modal,
        afterRender(v) {
          const M = N.modal; if (!M || M.k !== 'form') return; const el = v.querySelector('.nt-rt'); if (!el) return;
          el.innerHTML = nt.clean(M.f['body' + L2(M)]);
          el.addEventListener('paste', (e) => { e.preventDefault(); const text = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, text); }); // plain text only, so pasted web content cannot bring styles or scripts
          const tb = v.querySelector('.nt-tb'); if (tb) tb.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
          if (!M.focused) { M.focused = true; const ti = v.querySelector('#nt-title'); if (ti) ti.focus(); }
        },
        onInput(e) {
          const el = e.target, M = N.modal;
          if (el.dataset.f) { N.draft[el.dataset.f] = el.value; return; }
          if (!(M && M.k === 'form')) return;
          if (el.classList.contains('nt-rt')) { syncBody(); return; }
          const k = el.dataset.n; if (!k) return;
          if (k === 'scope') { M.f.scope = el.value; M.f.targets = []; M.errs.targets = null; render(); return; }
          if (k === 'when') { M.f.when = el.value; M.errs.at = null; render(); return; }
          if (k === 'channel') { M.f.channel = el.value; render(); return; }
          M.f[k] = el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
        },
        onSubmit() { if (N.modal) return; N.applied = { ...N.draft }; N.page = 1; render(); },
        onEscape() { if (N.modal) { N.modal = null; render(); return true; } return false; }, onStore() { render(); },
        onClick(a, b) {
          switch (a) {
            case 'noop': break;
            case 'nt-reset': N.draft = F0(); N.applied = F0(); N.page = 1; render(); break;
            case 'nt-page': N.page = +b.dataset.p; render(); break;
            case 'nt-export': exportCsv(); break;
            case 'nt-new': N.modal = { k: 'form', lang: 'zh', f: blank(), errs: {} }; render(); break;
            case 'nt-lang': { const M = N.modal; if (M.k === 'form') syncBody(); M.lang = b.dataset.l; M.focused = false; render(); break; }
            case 'nt-tg': { const M = N.modal; const id = b.dataset.id; M.f.targets = M.f.targets.includes(id) ? M.f.targets.filter((x) => x !== id) : [...M.f.targets, id]; M.errs.targets = null; render(); break; }
            case 'nt-fmt': format(b.dataset.c); break;
            case 'nt-send': {
              const M = N.modal; syncBody(); const r = nt.publish(M.f);
              if (!r.ok) { M.errs = r.errors; const bad = ['Zh', 'En'].find((k) => r.errors['title' + k] || r.errors['body' + k]); if (bad && !(r.errors['title' + L2(M)] || r.errors['body' + L2(M)])) M.lang = bad === 'Zh' ? 'zh' : 'en'; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
              N.modal = null; render(); toast(t(M.f.when === 'later' ? 'nt.toast.scheduled' : 'nt.toast.sent', { n: r.notice.recipients.length }), 'ok'); break;
            }
            case 'nt-view': N.modal = { k: 'view', id: b.dataset.id, lang: lang() }; render(); break;
            case 'nt-del': N.modal = { k: 'del', id: b.dataset.id }; render(); break;
            case 'nt-del-back': N.modal = { k: 'view', id: N.modal.id, lang: lang() }; render(); break;
            case 'nt-del-ok': { const id = N.modal.id; N.modal = null; nt.remove(id); render(); toast(t('nt.toast.deleted'), 'ok'); break; }
            case 'close-modal': N.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { N.draft = F0(); N.applied = F0(); N.page = 1; N.modal = null; },
      };
    },
  });
})(window.BS);
