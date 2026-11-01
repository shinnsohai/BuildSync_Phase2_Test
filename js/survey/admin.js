/* Admin: 问卷管理 — survey list (basic info, who has answered), question configuration, and answer records. */
(function (BS) {
  const { html, icon } = BS;
  const hr = BS.hr, sv = BS.survey;
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  const csvOf = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
  const TAG = { draft: 'withdrawn', published: 'approved', closed: 'pending' };
  const dt = (s) => String(s).slice(5, 16).replace('T', ' ');
  const nowLocal = () => BS.fmt.now().slice(0, 16);

  BS.registerAdmin({
    id: 'survey', nav: 'a.nav.survey', stores: [sv, hr],
    tabs: [{ id: 'list', k: 'sv.tab.list' }, { id: 'records', k: 'sv.tab.records' }],
    create(ctx) {
      const t = ctx.t, render = ctx.rerender, toast = ctx.toast; const lang = () => ctx.lang();
      const L0 = () => ({ kw: '', status: '', fill: '' }), R0 = () => ({ kw: '', person: '', date: '' });
      const S = { tab: 'list', L: { draft: L0(), applied: L0(), page: 1 }, R: { draft: R0(), applied: R0(), page: 1 }, cfg: null, sel: null, modal: null };
      const z = () => lang() === 'zh';
      const loc = (o) => (o ? (z() ? o.zh : o.en || o.zh) : '');
      const nameOf = (e) => (z() ? e.name : e.nameEn || e.name);
      const prjName = (k) => loc(hr.project(k)) || '—';
      const scopeText = (s) => (s.scope === 'all' ? t('sv.scope.all') : s.scope === 'new' ? t('sv.scope.new') : s.targets.map(prjName).join('、'));
      const stTag = (s) => { const k = sv.status(s); return html`<span class="a-tag ${TAG[k]}">${t('sv.st.' + k)}</span>`; };
      const SS = (s) => { const st = sv.stats(s); const keep = (l) => l.filter((e) => BS.perm.inScopeEmp(e)); const fl = keep(st.filledList), ul = keep(st.unfilledList); return { ...st, filledList: fl, unfilledList: ul, filled: fl.length, unfilled: ul.length, total: fl.length + ul.length }; }; // counts and name lists only cover people the administrator may see
      const maskPh = (p) => `+65 ${String(p).slice(0, 1)}*** ${String(p).slice(-4)}`;

      // ---------- list ----------
      const listRows = () => { const f = S.L.applied, kw = f.kw.trim().toLowerCase();
        return sv.list().filter((s) => (!kw || s.zh.toLowerCase().includes(kw) || s.en.toLowerCase().includes(kw)) && (!f.status || sv.status(s) === f.status) && (!f.fill || (f.fill === 'done' ? SS(s).unfilled === 0 && s.status === 'published' : SS(s).unfilled > 0 && s.status === 'published'))); };
      function listPage() {
        const all = listRows(); const pages = Math.max(1, Math.ceil(all.length / 6)); if (S.L.page > pages) S.L.page = pages; const slice = all.slice((S.L.page - 1) * 6, S.L.page * 6); const d = S.L.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sv.title')}</h1><p class="a-sub">${t('sv.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="sv-export">${icon('upload', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="sv-new">${icon('plus', 16)} ${t('sv.new')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('sv.f.name')}" aria-label="${t('sv.f.name')}"></label>
              <label class="a-in"><select data-f="status" aria-label="${t('sv.col.status')}"><option value="">${t('sv.col.status')}</option>${['published', 'draft', 'closed'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('sv.st.' + k)}</option>`)}</select></label>
              <label class="a-in"><select data-f="fill" aria-label="${t('sv.f.fill')}"><option value="">${t('sv.f.fill')}</option><option value="done" ${d.fill === 'done' ? 'selected' : ''}>${t('sv.f.allDone')}</option><option value="open" ${d.fill === 'open' ? 'selected' : ''}>${t('sv.f.hasOpen')}</option></select></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="sv-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['name', 'qn', 'scope', 'deadline', 'fill', 'status'].map((c) => html`<th>${t('sv.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((s) => { const st = SS(s); const pub = s.status === 'published'; return html`<tr><td class="nt-ttl"><b>${loc(s)}</b>${s.required ? html` <span class="a-tag rejected sv-req">${t('sv.req')}</span>` : ''}<small class="hr-sub">${z() ? s.en : s.zh}</small></td><td>${s.questions.length}</td><td>${scopeText(s)}</td><td class="mute">${dt(s.deadline)}</td>
                <td>${pub ? html`<button type="button" class="a-link" data-act="sv-ppl" data-id="${s.id}" data-v="filled">${st.filled}</button> / <button type="button" class="a-link" data-act="sv-ppl" data-id="${s.id}" data-v="unfilled">${st.unfilled}</button>` : html`<span class="mute">0 / ${st.total}</span>`}</td><td>${stTag(s)}</td>
                <td class="c-act"><button type="button" class="a-link" data-act="sv-cfg" data-id="${s.id}">${t('sv.cfg')}</button><button type="button" class="a-link" data-act="sv-edit" data-id="${s.id}">${t('p.edit')}</button><button type="button" class="a-link danger" data-act="sv-del" data-id="${s.id}">${t('prj.s.del')}</button></td></tr>`; })
                : html`<tr><td colspan="7" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sv.count', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${S.L.page === i + 1 ? 'on' : ''}" data-act="sv-page" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
      }

      // ---------- configuration page ----------
      const qLabel = (q) => (q.zh || q.en ? loc(q) || q.zh || q.en : t('sv.q.untitled'));
      function cfgPage() {
        const s = sv.get(S.cfg); const edit = sv.editable(s); const qs = s.questions; const sel = qs.find((q) => q.id === S.sel) || qs[0]; if (sel) S.sel = sel.id; const must = qs.filter((q) => q.required).length;
        const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v}</dd></div>`; const incomplete = qs.filter((q) => sv.qIssues(q).length).length;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${edit ? t('sv.cfg.title') : t('sv.cfg.titleRo')} ${stTag(s)}</h1><p class="a-sub">${t('sv.cfg.sub')}</p></div>
            <div class="a-tbtns"><button type="button" class="a-btn" data-act="sv-back">${t('sv.cfg.back')}</button><button type="button" class="a-btn" data-act="sv-edit" data-id="${s.id}">${t('sv.cfg.editInfo')}</button>${edit ? html`<button type="button" class="a-btn primary" data-act="sv-publish" data-id="${s.id}">${t('sv.cfg.publish')}</button>` : ''}</div></div>
          ${edit ? '' : html`<p class="prj-warn sv-lock">${icon('warn', 16)} ${t('sv.cfg.locked')}</p>`}
          <section class="a-card sv-card"><div class="sv-head"><h3>${t('sv.cfg.info')}</h3><small class="mute">${t('sv.cfg.saved', { d: s.savedAt })}</small></div>
            <dl class="a-dl lv-dl">${kv('sv.f.nameZh', s.zh)}${kv('sv.f.deadline', s.deadline.replace('T', ' '))}${kv('sv.f.nameEn', s.en)}${kv('sv.f.required', t(s.required ? 'sv.req' : 'sv.opt'))}${kv('sv.f.scope', scopeText(s))}${kv('sv.col.status', t('sv.st.' + sv.status(s)))}</dl></section>
          <section class="a-card sv-card"><div class="sv-head"><h3>${t('sv.cfg.all', { n: qs.length })}</h3>${edit ? html`<button type="button" class="a-btn primary" data-act="sv-qadd">${icon('plus', 16)} ${t('sv.cfg.add')}</button>` : ''}</div>
            ${qs.length ? html`<ol class="sv-qlist">${qs.map((q, i) => { const bad = sv.qIssues(q).length; return html`<li><button type="button" class="${q.id === S.sel ? 'on' : ''} ${bad ? 'bad' : ''}" data-act="sv-qsel" data-q="${q.id}"><i>${i + 1}</i><em>${t('sv.type.' + q.type)}</em><span>${qLabel(q)}</span>${bad ? html`<small>${t('sv.q.todo')}</small>` : ''}</button></li>`; })}</ol>
              <p class="sv-sum">${t('sv.cfg.sum', { n: qs.length, m: must })}${incomplete ? html` · <b class="sv-badtxt">${t('sv.cfg.incomplete', { n: incomplete })}</b>` : ''}</p>` : html`<div class="a-none"><p>${t('sv.cfg.noq')}</p></div>`}</section>
          ${sel ? qEditor(s, sel, qs.indexOf(sel), edit) : ''}`;
      }
      function qEditor(s, q, i, edit) {
        const iss = sv.qIssues(q); const opts = q.options; const letter = (n) => String.fromCharCode(65 + n); const D = edit ? '' : 'disabled';
        const f = (k, label, v, max) => html`<div class="a-frow"><label class="a-lab" for="sq-${k}"><b class="req">*</b> ${label}</label><input id="sq-${k}" class="a-field" data-qf="${k}" value="${v}" maxlength="${max}" ${D} autocomplete="off">${iss.includes(k) ? html`<small class="a-ferr">${t('sv.qe.' + k)}</small>` : ''}</div>`;
        return html`<section class="a-card sv-card sv-editor"><div class="sv-head"><div><h3>${t('sv.q.n', { n: i + 1 })} · ${t('sv.type.' + q.type)}</h3><small class="${iss.length ? 'sv-badtxt' : 'mute'}">${q.required ? t('sv.q.must') : t('sv.q.opt')} · ${iss.length ? t('sv.q.todo') : t('sv.q.done')}</small></div>
            ${edit ? html`<div class="sv-qtools"><button type="button" class="a-btn" data-act="sv-qmove" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="${t('sv.q.up')}">↑</button><button type="button" class="a-btn" data-act="sv-qmove" data-d="1" ${i === s.questions.length - 1 ? 'disabled' : ''} aria-label="${t('sv.q.down')}">↓</button><button type="button" class="a-btn danger-o" data-act="sv-qdel">${t('sv.q.del')}</button></div>` : ''}</div>
          <div class="l-form">${f('zh', t('sv.q.zh'), q.zh, 200)}${f('en', t('sv.q.en'), q.en, 300)}<small class="a-fhint">${t('sv.q.bothHint')}</small>
            ${q.type === 'text' ? '' : html`<div class="a-frow"><label class="a-lab">${t('sv.q.opts')}</label><small class="a-fhint">${q.type === 'bool' ? t('sv.q.optsBool') : t(q.type === 'single' ? 'sv.q.optsSingle' : 'sv.q.optsMulti')}</small>
              <div class="sv-opts">${opts.map((o, n) => html`<div class="sv-opt"><b>${letter(n)}</b><input class="a-field" data-op="${n}:zh" value="${o.zh}" maxlength="100" placeholder="${t('sv.q.optZh')}" aria-label="${t('sv.q.optZh')} ${letter(n)}" ${D}><input class="a-field" data-op="${n}:en" value="${o.en}" maxlength="150" placeholder="${t('sv.q.optEn')}" aria-label="${t('sv.q.optEn')} ${letter(n)}" ${D}>${edit && q.type !== 'bool' ? html`<button type="button" class="a-x" data-act="sv-oprm" data-n="${n}" aria-label="${t('t.m.remove')}" ${opts.length <= 2 ? 'disabled' : ''}>${icon('x', 14)}</button>` : ''}</div>`)}</div>
              ${iss.includes('opts') ? html`<small class="a-ferr">${t('sv.qe.opts')}</small>` : ''}${iss.includes('optText') ? html`<small class="a-ferr">${t('sv.qe.optText')}</small>` : ''}
              ${edit && q.type !== 'bool' ? html`<button type="button" class="a-btn" data-act="sv-opadd" ${opts.length >= 8 ? 'disabled' : ''}>${icon('plus', 14)} ${t('sv.q.addOpt')}</button>` : ''}</div>`}
            <div class="a-frow"><label class="p-check"><input type="checkbox" data-qreq ${q.required ? 'checked' : ''} ${D}> <b>${t('sv.q.must')}</b></label><small class="a-fhint">${t('sv.q.mustHint')}</small></div></div></section>`;
      }

      // ---------- records ----------
      const recRows = () => { const f = S.R.applied, kw = f.kw.trim().toLowerCase(), p = f.person.trim().toLowerCase();
        return sv.responses().filter((r) => { const s = sv.get(r.surveyId), e = hr.emp(r.empNo); return s && e && BS.perm.inScopeEmp(e) && (!kw || s.zh.toLowerCase().includes(kw) || s.en.toLowerCase().includes(kw)) && (!p || e.name.toLowerCase().includes(p) || e.nameEn.toLowerCase().includes(p) || e.empNo.toLowerCase().includes(p)) && (!f.date || r.submittedAt.slice(0, 10) === f.date); }); };
      function recPage() {
        const all = recRows(); const pages = Math.max(1, Math.ceil(all.length / 8)); if (S.R.page > pages) S.R.page = pages; const slice = all.slice((S.R.page - 1) * 8, S.R.page * 8); const d = S.R.draft;
        return html`
          <div class="a-titlebar"><div><h1 class="a-h1">${t('sv.rec.title')}</h1><p class="a-sub">${t('sv.rec.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="sv-rexport">${icon('upload', 16)} ${t('hr.export')}</button></div></div>
          <section class="a-card"><form class="a-filters" autocomplete="off">
              <label class="a-in a-search">${icon('search', 16)}<input data-r="kw" value="${d.kw}" placeholder="${t('sv.f.name')}" aria-label="${t('sv.f.name')}"></label>
              <label class="a-in"><input data-r="person" value="${d.person}" placeholder="${t('sv.f.person')}" aria-label="${t('sv.f.person')}"></label>
              <label class="a-in"><span class="a-in-l">${t('sv.f.date')}</span><input type="date" data-r="date" value="${d.date}"></label>
              <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="sv-rreset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
            <div class="a-tablewrap"><table class="a-table prj-table"><thead><tr>${['person', 'survey', 'project', 'time'].map((c) => html`<th>${t('sv.rec.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${slice.length ? slice.map((r) => { const s = sv.get(r.surveyId), e = hr.emp(r.empNo); return html`<tr><td><b>${nameOf(e)}</b> <span class="mute">/ ${e.empNo}</span></td><td>${loc(s)}</td><td>${prjName(r.projectKey)}</td><td class="mute">${dt(r.submittedAt)}</td><td class="c-act"><button type="button" class="a-link" data-act="sv-rview" data-id="${r.id}">${t('sv.rec.detail')}</button></td></tr>`; })
                : html`<tr><td colspan="5" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>
            <footer class="a-pager"><span>${t('sv.count2', { n: all.length })}</span><nav>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${S.R.page === i + 1 ? 'on' : ''}" data-act="sv-rpage" data-p="${i + 1}">${i + 1}</button>`)}</nav></footer></section>`;
      }

      // ---------- dialogs ----------
      const head = (title, sub) => html`<header><h2 id="a-mt">${title}</h2><p>${sub}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>`;
      const E = (M, k) => (M.errs && M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('sv.e.' + M.errs[k])}</small>` : '');
      function formModal() {
        const M = S.modal, f = M.f; const cur = M.id ? sv.get(M.id) : null; const pubd = cur && cur.status === 'published';
        const fld = (k, label, ph, max) => html`<div class="a-frow"><label class="a-lab" for="sf-${k}"><b class="req">*</b> ${label}</label><input id="sf-${k}" class="a-field" data-s="${k}" value="${f[k]}" maxlength="${max}" placeholder="${ph}" autocomplete="off">${E(M, k)}</div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(M.id ? t('sv.edit') : t('sv.new'), t('prj.p.formSub'))}
          <div class="a-mbody l-form">
            <div class="p-two">${fld('zh', t('sv.f.nameZh'), t('sv.f.nameZhPh'), 40)}${fld('en', t('sv.f.nameEn'), 'Enter questionnaire name', 80)}</div>
            <div class="a-frow"><label class="a-lab" for="sf-scope"><b class="req">*</b> ${t('sv.f.scope')}</label><select id="sf-scope" class="a-field" data-s="scope">${['all', 'project', 'new'].map((k) => html`<option value="${k}" ${f.scope === k ? 'selected' : ''}>${t('sv.scope.' + k)}</option>`)}</select>${E(M, 'scope')}
              ${f.scope === 'project' ? html`<div class="nt-chips" role="group" aria-label="${t('sv.f.scope')}">${hr.projects().filter((p) => hr.projectStatus(p) !== 'done').map((p) => html`<button type="button" class="${f.targets.includes(p.key) ? 'on' : ''}" aria-pressed="${f.targets.includes(p.key) ? 'true' : 'false'}" data-act="sv-tg" data-id="${p.key}">${loc(p)}</button>`)}</div>${E(M, 'targets')}` : ''}
              <small class="a-fhint" data-role="est">${t('sv.f.est', { n: sv.audience({ scope: f.scope, targets: f.targets }).length })}</small></div>
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="sf-deadline"><b class="req">*</b> ${t('sv.f.deadline')}</label><input id="sf-deadline" class="a-field" type="datetime-local" data-s="deadline" value="${f.deadline}">${E(M, 'deadline')}</div>
              <div class="a-frow"><label class="a-lab" for="sf-required">${t('sv.f.required')}</label><select id="sf-required" class="a-field" data-s="required"><option value="1" ${f.required ? 'selected' : ''}>${t('sv.req')}</option><option value="0" ${f.required ? '' : 'selected'}>${t('sv.opt')}</option></select><small class="a-fhint">${t('sv.f.reqHint')}</small></div></div>
            <div class="a-frow"><label class="a-lab" for="sf-status">${t('sv.col.status')}</label><select id="sf-status" class="a-field" data-s="status"><option value="draft" ${f.status === 'draft' ? 'selected' : ''} ${pubd ? 'disabled' : ''}>${t('sv.st.draft')}</option><option value="published" ${f.status === 'published' ? 'selected' : ''}>${t('sv.st.published')}</option></select>${E(M, 'status')}<small class="a-fhint">${t(pubd ? 'sv.f.pubHint' : 'sv.f.draftHint')}</small></div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sv-save">${t('co.ok')}</button></footer></div></div>`;
      }
      function typeModal() {
        const M = S.modal;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sv.add.title'), t('sv.add.sub'))}
          <div class="a-mbody l-form"><div class="sv-types" role="radiogroup" aria-label="${t('sv.add.title')}">${sv.TYPES.map((k) => html`<button type="button" role="radio" aria-checked="${M.type === k ? 'true' : 'false'}" class="${M.type === k ? 'on' : ''}" data-act="sv-qtype" data-k="${k}"><b>${t('sv.type.' + k)}</b><small>${t('sv.add.' + k)}</small></button>`)}</div></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="sv-qok">${t('sv.add.ok')}</button></footer></div></div>`;
      }
      function delModal() {
        const s = sv.get(S.modal.id); const n = sv.responsesOf(s.id).length;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sv.del.title'), t('sv.del.sub'))}
          <div class="a-mbody l-form"><dl class="ps-dl"><div class="ps-kv"><dt>${t('sv.f.name')}</dt><dd>${loc(s)}</dd></div><div class="ps-kv"><dt>${t('sv.col.qn')}</dt><dd>${s.questions.length}</dd></div></dl>
            <p class="${n ? 'prj-warn' : 'a-fhint'}">${n ? html`${icon('warn', 16)} ` : ''}${n ? t('sv.del.warn', { n }) : t('sv.del.note')}</p></div>
          <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn danger" data-act="sv-del-ok">${t('co.del.ok')}</button></footer></div></div>`;
      }
      function pplModal() {
        const M = S.modal; const s = sv.get(M.id); const st = SS(s); const kw = M.kw.trim().toLowerCase(); const filled = M.v === 'filled';
        const list = (filled ? st.filledList : st.unfilledList).filter((e) => !kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw) || e.phone.includes(kw));
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t(filled ? 'sv.ppl.filled' : 'sv.ppl.unfilled'), `${loc(s)} · ${t(filled ? 'sv.ppl.nFilled' : 'sv.ppl.nUnfilled', { n: filled ? st.filled : st.unfilled })}`)}
          <div class="a-mbody"><div class="sv-seg"><button type="button" class="${filled ? 'on' : ''}" data-act="sv-pv" data-v="filled">${t('sv.ppl.nFilled', { n: st.filled })}</button><button type="button" class="${filled ? '' : 'on'}" data-act="sv-pv" data-v="unfilled">${t('sv.ppl.nUnfilled', { n: st.unfilled })}</button></div>
            <div class="a-filters" style="padding:12px 0;border:0"><label class="a-in a-search">${icon('search', 16)}<input data-p="kw" value="${M.kw}" placeholder="${t('sv.ppl.kw')}" aria-label="${t('sv.ppl.kw')}"></label><span class="a-fgrow"></span><button type="button" class="a-btn" data-act="sv-pexport">${icon('upload', 16)} ${t('sv.ppl.export')}</button></div>
            <div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr>${['person', 'empNo', 'phone', 'company', 'role', 'state'].map((c) => html`<th>${t('sv.ppl.c.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
              <tbody>${list.length ? list.map((e) => html`<tr><td><b>${nameOf(e)}</b></td><td class="mute">${e.empNo}</td><td class="mute">${maskPh(e.phone)}</td><td>${loc(e.employer)}</td><td>${t('hr.role.' + e.role)}</td><td><span class="a-tag ${filled ? 'approved' : 'pending'}">${t(filled ? 'sv.ppl.done' : 'sv.ppl.todo')}</span></td><td class="c-act"><button type="button" class="a-link" data-act="sv-pdetail" data-e="${e.empNo}">${t('sv.rec.detail')}</button></td></tr>`) : html`<tr><td colspan="7" class="a-none">${t('t.none')}</td></tr>`}</tbody></table></div>
            <p class="a-fhint">${t('sv.ppl.total', { n: list.length })}</p></div>
          <footer><button type="button" class="a-btn primary" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
      }
      function respModal() {
        const M = S.modal; const r = M.rid ? sv.response(M.rid) : null; const s = sv.get(r ? r.surveyId : M.sid); const e = hr.emp(r ? r.empNo : M.e);
        const prj = r ? r.projectKey : (e.assigns[0] || {}).projectKey; const qs = s.questions;
        const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v || '—'}</dd></div>`;
        return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal wide" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
          ${head(t('sv.d.title'), t('sv.d.sub'))}
          <div class="a-mbody"><h3 class="hr-h">${t('sv.d.info')}</h3><dl class="a-dl lv-dl">${kv('sv.d.person', `${nameOf(e)} · ${e.empNo}`)}${kv('sv.f.name', loc(s))}${kv('sv.rec.project', prj ? prjName(prj) : '')}${kv('sv.rec.time', r ? r.submittedAt.replace('T', ' ') : t('sv.d.notYet'))}</dl>
            <h3 class="hr-h">${t('sv.d.answers')} <em>${t('sv.d.total', { n: qs.length })}</em></h3>
            ${r ? html`<ol class="sv-ans">${qs.map((q) => { const a = sv.answerText(q, r.answers[q.id], lang()); return html`<li><b>${loc(q)}</b><span class="a-tag sub-upcoming">${t('sv.type.' + q.type)}</span><div class="sv-a"><small>${t('sv.d.answer')}</small><p>${a || html`<i class="mute">${t('sv.d.blank')}</i>`}</p></div></li>`; })}</ol>` : html`<p class="prj-warn">${icon('warn', 16)} ${t('sv.d.unfilled')}</p>`}</div>
          <footer>${M.back ? html`<button type="button" class="a-btn" data-act="sv-pback">${t('sv.d.back')}</button>` : ''}<button type="button" class="a-btn primary" data-act="close-modal">${t('sv.d.close')}</button></footer></div></div>`;
      }
      function modal() {
        const M = S.modal; if (!M) return '';
        if (M.id && !sv.get(M.id)) { S.modal = null; return ''; } if (M.rid && !sv.response(M.rid)) { S.modal = null; return ''; }
        return { form: formModal, type: typeModal, del: delModal, ppl: pplModal, resp: respModal }[M.k]();
      }

      // ---------- helpers ----------
      const blank = () => ({ zh: '', en: '', scope: 'all', targets: [], deadline: '', required: true, status: 'draft' });
      const toForm = (s) => ({ zh: s.zh, en: s.en, scope: s.scope, targets: s.targets.slice(), deadline: s.deadline, required: s.required, status: s.status });
      function exportList() {
        const all = listRows(); download(`surveys-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([['name_zh', 'name_en', 'questions', 'audience', 'deadline', 'filled', 'unfilled', 'status'], ...all.map((s) => { const st = SS(s); return [s.zh, s.en, s.questions.length, scopeText(s), s.deadline.replace('T', ' '), s.status === 'published' ? st.filled : 0, s.status === 'published' ? st.unfilled : st.total, t('sv.st.' + sv.status(s))]; })]));
        toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }
      function exportRecords() {
        const all = recRows(); const rows = [];
        all.forEach((r) => { const s = sv.get(r.surveyId), e = hr.emp(r.empNo); s.questions.forEach((q) => rows.push([e.empNo, e.name, s.zh, r.submittedAt.replace('T', ' '), loc(q), t('sv.type.' + q.type), sv.answerText(q, r.answers[q.id], lang())])); });
        download(`survey-answers-${BS.fmt.now().slice(0, 10)}.csv`, csvOf([['empNo', 'name', 'survey', 'submitted', 'question', 'type', 'answer'], ...rows])); toast(t('hr.toast.exported', { n: all.length }), 'ok');
      }
      function exportPeople() {
        const M = S.modal; const s = sv.get(M.id); const st = SS(s); const filled = M.v === 'filled'; const list = filled ? st.filledList : st.unfilledList;
        download(`survey-${filled ? 'filled' : 'unfilled'}-${s.id}.csv`, csvOf([['empNo', 'name', 'phone', 'company', 'role'], ...list.map((e) => [e.empNo, e.name, maskPh(e.phone), e.employer.zh, t('hr.role.' + e.role)])])); toast(t('hr.toast.exported', { n: list.length }), 'ok');
      }

      return {
        get tab() { return S.tab; }, set tab(v) { S.modal = null; S.tab = v; if (v !== 'list') S.cfg = null; },
        crumbs() { const c = [{ text: t('a.nav.survey'), act: 'noop' }]; if (S.tab === 'list' && S.cfg) return [...c, { text: t('sv.tab.list'), act: 'sv-back' }, { text: t('sv.crumb.cfg') }]; return [...c, { text: t(S.tab === 'list' ? 'sv.tab.list' : 'sv.tab.records') }]; },
        page() { return S.tab === 'records' ? recPage() : S.cfg && sv.get(S.cfg) ? cfgPage() : (S.cfg = null, listPage()); }, modal,
        afterRender(v) { const M = S.modal; if (M && M.k === 'form' && !M.focused) { M.focused = true; const el = v.querySelector('#sf-zh'); if (el) el.focus(); } },
        onInput(e) {
          const el = e.target, M = S.modal;
          if (el.dataset.f) { S.L.draft[el.dataset.f] = el.value; return; } if (el.dataset.r) { S.R.draft[el.dataset.r] = el.value; return; }
          if (M && M.k === 'ppl' && el.dataset.p) { M.kw = el.value; const pos = el.selectionStart; render(); const n = ctx.view().querySelector('[data-p=kw]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
          if (M && M.k === 'form' && el.dataset.s) {
            const k = el.dataset.s; M.f[k] = k === 'required' ? el.value === '1' : el.value; if (M.errs[k]) { M.errs[k] = null; ctx.view().querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); }
            if (k === 'scope') { M.f.targets = []; render(); }
            return;
          }
          if (S.cfg && !M) {
            const s = sv.get(S.cfg), q = s && s.questions.find((x) => x.id === S.sel); if (!q || !sv.editable(s)) return;
            if (el.dataset.qf) sv.updateQuestion(s.id, q.id, { [el.dataset.qf]: el.value });
            else if (el.dataset.op) { const [n, k] = el.dataset.op.split(':'); const opts = q.options.map((o) => ({ ...o })); opts[+n][k] = el.value; sv.updateQuestion(s.id, q.id, { options: opts }); }
            else if ('qreq' in el.dataset) { sv.updateQuestion(s.id, q.id, { required: el.checked }); render(); }
          }
        },
        onChange(e) { const el = e.target; if (S.cfg && !S.modal && (el.dataset.qf || el.dataset.op)) render(); },
        onSubmit() { if (S.modal || S.cfg) return; if (S.tab === 'list') { S.L.applied = { ...S.L.draft }; S.L.page = 1; } else { S.R.applied = { ...S.R.draft }; S.R.page = 1; } render(); },
        onEscape() { if (S.modal) { S.modal = S.modal.back ? S.modal.back : null; render(); return true; } return false; },
        onStore(evt) { if (evt.type === 'question') return; render(); },
        onClick(a, b) {
          const s = S.cfg ? sv.get(S.cfg) : null;
          switch (a) {
            case 'noop': break;
            case 'sv-reset': S.L.draft = L0(); S.L.applied = L0(); S.L.page = 1; render(); break;
            case 'sv-rreset': S.R.draft = R0(); S.R.applied = R0(); S.R.page = 1; render(); break;
            case 'sv-page': S.L.page = +b.dataset.p; render(); break;
            case 'sv-rpage': S.R.page = +b.dataset.p; render(); break;
            case 'sv-export': exportList(); break;
            case 'sv-rexport': exportRecords(); break;
            case 'sv-new': S.modal = { k: 'form', id: null, f: blank(), errs: {} }; render(); break;
            case 'sv-edit': { const x = sv.get(b.dataset.id); S.modal = { k: 'form', id: x.id, f: toForm(x), errs: {} }; render(); break; }
            case 'sv-tg': { const M = S.modal; const id = b.dataset.id; M.f.targets = M.f.targets.includes(id) ? M.f.targets.filter((k) => k !== id) : [...M.f.targets, id]; M.errs.targets = null; render(); break; }
            case 'sv-save': {
              const M = S.modal; const r = sv.saveBasic(M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); const first = ctx.view().querySelector('[data-err]'); if (first) first.scrollIntoView({ block: 'center' }); break; }
              S.modal = null; if (!M.id) { S.cfg = r.survey.id; S.sel = null; S.tab = 'list'; } render(); toast(t(M.id ? 'sv.toast.saved' : 'sv.toast.created'), 'ok'); break;
            }
            case 'sv-cfg': S.cfg = b.dataset.id; S.sel = null; render(); ctx.scrollTop0(); break;
            case 'sv-back': S.cfg = null; S.modal = null; render(); break;
            case 'sv-qsel': S.sel = b.dataset.q; render(); break;
            case 'sv-qadd': S.modal = { k: 'type', type: 'single' }; render(); break;
            case 'sv-qtype': S.modal.type = b.dataset.k; render(); break;
            case 'sv-qok': { const r = sv.addQuestion(s.id, S.modal.type); S.modal = null; if (r.ok) S.sel = r.question.id; else toast(t('sv.e.' + (r.error || 'many')), 'warn'); render(); break; }
            case 'sv-qdel': { const idx = s.questions.findIndex((q) => q.id === S.sel); sv.removeQuestion(s.id, S.sel); S.sel = (s.questions[Math.min(idx, s.questions.length - 1)] || {}).id || null; render(); break; }
            case 'sv-qmove': sv.moveQuestion(s.id, S.sel, +b.dataset.d); render(); break;
            case 'sv-opadd': { const q = s.questions.find((x) => x.id === S.sel); sv.updateQuestion(s.id, q.id, { options: [...q.options, { zh: '', en: '' }] }); render(); break; }
            case 'sv-oprm': { const q = s.questions.find((x) => x.id === S.sel); if (q.options.length > 2) { sv.updateQuestion(s.id, q.id, { options: q.options.filter((_, i) => i !== +b.dataset.n) }); render(); } break; }
            case 'sv-publish': {
              const r = sv.publish(b.dataset.id); if (!r.ok) { toast(t('sv.e.pub_' + r.error), 'warn'); break; }
              toast(t('sv.toast.published'), 'ok'); render(); break;
            }
            case 'sv-del': S.modal = { k: 'del', id: b.dataset.id }; render(); break;
            case 'sv-del-ok': { const id = S.modal.id; S.modal = null; if (S.cfg === id) S.cfg = null; sv.remove(id); render(); toast(t('sv.toast.deleted'), 'ok'); break; }
            case 'sv-ppl': S.modal = { k: 'ppl', id: b.dataset.id, v: b.dataset.v, kw: '' }; render(); break;
            case 'sv-pv': S.modal.v = b.dataset.v; render(); break;
            case 'sv-pexport': exportPeople(); break;
            case 'sv-pdetail': { const P = S.modal; const r = sv.responseOf(P.id, b.dataset.e); S.modal = r ? { k: 'resp', rid: r.id, back: P } : { k: 'resp', sid: P.id, e: b.dataset.e, back: P }; render(); break; }
            case 'sv-pback': S.modal = S.modal.back; render(); break;
            case 'sv-rview': S.modal = { k: 'resp', rid: b.dataset.id }; render(); break;
            case 'close-modal': S.modal = null; render(); break;
            default: return false;
          }
          return true;
        },
        reset() { S.tab = 'list'; S.L = { draft: L0(), applied: L0(), page: 1 }; S.R = { draft: R0(), applied: R0(), page: 1 }; S.cfg = null; S.sel = null; S.modal = null; },
      };
    },
  });
})(window.BS);
