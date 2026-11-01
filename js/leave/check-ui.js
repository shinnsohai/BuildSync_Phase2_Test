/* Admin: 请假管理 → 请假核查 (Leave Check). For each leave request: the crew coverage the AI assistant works out, the reasons, who could cover, the questions to ask and the nearest dates that work.
   Read-only: the decision itself stays in 请假审批. */
(function (BS) {
  const { html, icon } = BS;
  const chk = BS.leaveCheck, hr = BS.hr, req = BS.leaveReq;
  BS.leaveParts = BS.leaveParts || {};
  BS.leaveParts.check = function (ctx, nav) {
    const t = ctx.t, render = ctx.rerender; const lang = () => ctx.lang(); const z = () => lang() === 'zh';
    const V = { scope: 'pending', answers: {}, json: {}, group: '' };
    const nm = (e) => (e ? (z() ? e.name : e.nameEn || e.name) : '?');
    const gName = (g) => (g ? (z() ? g.nameZh : g.nameEn) : t('lc.nogroup'));
    const role = (r) => t('lc.role.' + r);
    const tag = { 0: 'approved', 1: 'sub-upcoming', 2: 'pending', 3: 'rejected' };
    const md = (d) => d.slice(5);
    const dates = (ds) => (ds.length <= 3 ? ds.map(md).join('、') : `${md(ds[0])} → ${md(ds[ds.length - 1])}${t('lc.nDays', { n: ds.length })}`);
    const wName = (m) => nm(hr.emp(m));
    const sub = (e) => { const a = e && e.assigns[0]; const p = a && hr.project(a.projectKey); return p ? (z() ? p.zh : p.en) : ''; };

    function line(f) {
      if (f.kind === 'crew') return html`<li class="lc-f ${tag[f.level]}"><span class="a-tag ${tag[f.level]}">${t('lc.lv.' + chk.NAME[f.level])}</span> ${t('lc.f.crew', { role: role(f.role), dates: dates(f.dates), after: f.after, min: f.min, work: z() ? f.work.zh : f.work.en })}${f.others.length ? html` <small class="mute">${t('lc.f.others', { n: f.others.map((x) => wName(x)).join('、') })}</small>` : ''}</li>`;
      if (f.kind === 'permit') return html`<li class="lc-f ${tag[f.level]}"><span class="a-tag ${tag[f.level]}">${t('lc.lv.block')}</span> ${t('lc.f.permit', { id: f.id, title: f.title, date: md(f.date) })}</li>`;
      return html`<li class="lc-f ${tag[f.level]}"><span class="a-tag ${tag[f.level]}">${t('lc.lv.warn')}</span> ${t('lc.f.training', { id: f.id, title: f.title, a: md(f.from), b: md(f.to) })}</li>`;
    }
    function qText(q, a) {
      if (q.kind === 'cover') return t('lc.q.cover', { name: wName(q.empNo), group: gName(chk.crewOf ? BS.att.group(q.groupId) : null), role: role(q.role), dates: dates(q.dates) });
      if (q.kind === 'resched') return t('lc.q.resched', { work: z() ? q.work.zh : q.work.en, to: md(q.to) });
      if (q.kind === 'accept') return t('lc.q.accept', { role: role(q.role), n: q.after, dates: dates(q.dates) });
      if (q.kind === 'permit') return t('lc.q.permit', { id: q.permit, date: md(q.date) });
      return t('lc.q.handover', { name: nm(hr.emp(a.empNo)) });
    }
    function card(r) {
      const a = chk.analyse(r.id, V.answers[r.id] || {}); const e = hr.emp(r.empNo); const open = !!V.json[r.id];
      const ans = (id) => (V.answers[r.id] || {})[id];
      const L = chk.lead(a, t, z());
      return html`<article class="a-card lc-card" data-req="${r.id}" data-level="${a.levelName}" data-verdict="${a.verdict}">
        <header class="lc-h"><div><span class="a-tag ${r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'withdrawn'}">${t('lv.st.' + r.status)}</span> <b>${nm(e)}</b> <span class="mute">${r.empNo} · ${t('l.type.' + r.type)}</span>
            <div class="mute">${icon('cal', 12)} ${r.start.slice(5, 16).replace('T', ' ')} → ${r.end.slice(5, 16).replace('T', ' ')} · ${req.dur(r.hours, lang())} · ${icon('users', 12)} ${gName(a.group)}${a.roles.length ? ' · ' + a.roles.map(role).join('、') : ''}</div></div>
          <span class="a-tag lc-v ${tag[a.level]}">${L.title}</span></header>
        <p class="lc-sum"><span class="lc-ai">${icon('star', 13)} ${t('lc.ai')}</span> ${L.sentence} ${L.advice}</p>
        ${a.findings.length ? html`<ul class="lc-fl">${a.findings.map(line)}</ul>` : ''}
        ${Object.keys(a.candidates).length ? html`<div class="lc-cands"><b>${t('lc.cover')}</b>${Object.entries(a.candidates).map(([ro, l]) => html`<div data-role-cover="${ro}"><small class="mute">${role(ro)}</small>${l.length ? l.map((c) => html`<span class="lc-chip" data-cand="${c.empNo}">${wName(c.empNo)} <small>${gName(BS.att.group(c.groupId))}${c.sameProject ? ' · ' + t('lc.sameProj') : ''}${c.donor ? '' : ' · ' + t('lc.donorLow')}</small></span>`) : html`<span class="lc-none">${icon('warn', 13)} ${t('lc.noCand')}</span>`}</div>`)}</div>` : ''}
        ${a.questions.length ? html`<div class="lc-qs"><b>${t('lc.qs')}</b>${a.questions.map((q) => html`<div class="lc-q" data-q="${q.id}"><span>${qText(q, a)}</span><span class="lc-yn" role="group"><button type="button" class="${ans(q.id) === 'yes' ? 'on' : ''}" data-act="lc-answer" data-id="${r.id}" data-q="${q.id}" data-a="yes" aria-pressed="${ans(q.id) === 'yes' ? 'true' : 'false'}">${t('lc.yes')}</button><button type="button" class="${ans(q.id) === 'no' ? 'on no' : ''}" data-act="lc-answer" data-id="${r.id}" data-q="${q.id}" data-a="no" aria-pressed="${ans(q.id) === 'no' ? 'true' : 'false'}">${t('lc.no')}</button></span></div>`)}</div>` : ''}
        <footer class="lc-foot"><button type="button" class="a-link" data-act="lc-json" data-id="${r.id}">${icon('file', 13)} ${t(open ? 'lc.hideCtx' : 'lc.showCtx')}</button><span class="a-fgrow"></span>${r.status === 'pending' ? html`<button type="button" class="a-btn sm primary" data-act="lc-goto" data-id="${r.id}">${t('lc.goto')}</button>` : ''}</footer>
        ${open ? html`<pre class="lc-json" data-role="ctx">${JSON.stringify(chk.context(r.id), null, 1)}</pre>` : ''}</article>`;
    }
    function coverageTable() {
      return html`<section class="a-card"><h3 class="hr-h">${t('lc.rules')}</h3><p class="a-fhint">${t('lc.rulesSub')}</p><div class="a-tablewrap"><table class="a-table dp-table"><thead><tr><th>${t('lc.col.group')}</th><th>${t('lc.col.role')}</th><th>${t('lc.col.min')}</th><th>${t('lc.col.have')}</th><th>${t('lc.col.work')}</th></tr></thead><tbody>
        ${BS.att.groups().flatMap((g) => (chk.RULES[g.id] || []).map(([ro, min, critical, work], i) => html`<tr><td>${i === 0 ? html`<b>${gName(g)}</b><small class="hr-sub">${chk.crewOf(g).length} ${t('lc.people')}</small>` : ''}</td><td>${role(ro)}${critical ? html` <span class="a-tag rejected">${t('lc.critical')}</span>` : ''}</td><td>${min}</td><td>${chk.crewOf(g).filter((m) => chk.hasRole(m, ro)).length}</td><td class="mute" style="white-space:normal">${z() ? work.zh : work.en}</td></tr>`))}</tbody></table></div></section>`;
    }
    function page() {
      const list = chk.list('', V.scope === 'all'); const n = chk.list('', false).length; const results = list.map((r) => chk.analyse(r.id, V.answers[r.id] || {})); const count = (lv) => results.filter((x) => x && x.level === lv).length;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('lc.title')}</h1><p class="a-sub">${t('lc.sub')}</p></div></div>
        <p class="lc-banner" role="note">${icon('star', 16)} <span><b>${t('lc.ai')}</b> ${t('lc.banner')}</span></p>
        <div class="dp-kpis">${[['lc.k.pending', n, 'active'], ['lc.k.hold', count(3), 'blocked'], ['lc.k.cover', count(2), 'requested'], ['lc.k.ok', count(0) + count(1), 'granted']].map(([lab, v, cls]) => html`<div class="dp-kpi ${cls}"><b>${v}</b><span>${t(lab)}</span></div>`)}</div>
        <section class="a-card"><div class="hr-chips pt-filters" role="group">${[['pending', 'lc.sc.pending'], ['all', 'lc.sc.all']].map(([k, key]) => html`<button type="button" class="${V.scope === k ? 'on' : ''}" data-act="lc-scope" data-s="${k}" aria-pressed="${V.scope === k ? 'true' : 'false'}">${t(key)}</button>`)}</div></section>
        ${list.length ? list.map(card) : html`<section class="a-card"><div class="a-none"><p>${t('lc.none')}</p></div></section>`}
        ${coverageTable()}
        <p class="l-audit">${icon('shield', 14)} ${t('lc.note')}</p>`;
    }
    return {
      crumbs: () => [{ text: t('a.nav.leave'), act: 'noop' }, { text: t('l.tab.check') }],
      page, modal: () => '',
      onClick(a, b) {
        const id = b.dataset.id;
        switch (a) {
          case 'noop': break;
          case 'lc-scope': V.scope = b.dataset.s; render(); break;
          case 'lc-answer': { const o = V.answers[id] || (V.answers[id] = {}); const k = b.dataset.q; o[k] = o[k] === b.dataset.a ? undefined : b.dataset.a; render(); break; }
          case 'lc-json': V.json[id] = !V.json[id]; render(); break;
          case 'lc-goto': nav.to('approve'); break;
          default: return false;
        }
        return true;
      },
      reset() { V.scope = 'pending'; V.answers = {}; V.json = {}; },
    };
  };
})(window.BS);
