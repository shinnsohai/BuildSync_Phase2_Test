/* Admin: 考勤管理 — 每日考勤统计, 日考勤明细 (+ adjust), 月考勤统计, 考勤组. */
(function (BS) {
  const { html, icon, fmt } = BS;
  const hr = BS.hr, att = BS.att;
  const today = () => att.now().slice(0, 10);
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  const DAY_TYPES = ['weekday', 'sat', 'sun', 'special'];

  BS.attParts = BS.attParts || {};
  function kit(ctx) {
    const t = ctx.t; const lang = () => ctx.lang();
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const nameOf = (e) => (lang() === 'zh' ? e.name : e.nameEn || e.name);
    const empOf = (d) => hr.emp(d.empNo);
    const gName = (g) => (g ? (lang() === 'zh' ? g.nameZh : g.nameEn || g.nameZh) : '—');
    const siteL = (g) => (g ? `${loc(hr.project(g.projectKey))} / ${loc(hr.site(g.siteKey))}` : '—');
    const hhmm = (p) => (p ? p.at.slice(11, 16) : '—');
    const tag = (s) => html`<span class="a-tag at-${s}">${t('at.s.' + s)}</span>`;
    const inTxt = (d) => (d.inP ? `${t('at.in')} ${hhmm(d.inP)}${d.inState === 'late' ? `（${t('at.s.late')}）` : ''}${d.flags.includes('outsideIn') ? `（${t('at.s.outside')}）` : ''}` : `${t('at.in')} ${t('at.none')}`);
    const outTxt = (d) => (d.outP ? `${t('at.out')} ${hhmm(d.outP)}${d.outState === 'early' ? `（${t('at.s.early')}）` : ''}${d.flags.includes('outsideOut') ? `（${t('at.s.outside')}）` : ''}` : `${t('at.out')} ${d.outState === 'missing' ? t('at.s.missing') : t('at.notyet')}`);
    const leaveTxt = (d) => { const r = BS.leaveReq.all().find((x) => x.empNo === d.empNo && x.status === 'approved' && x.start < d.shiftEnd && d.shiftStart < x.end); return r ? `${t('l.type.' + r.type)} · ${r.start.slice(5, 16).replace('T', ' ')} ${t('at.to')} ${r.end.slice(5, 16).replace('T', ' ')}` : t('at.s.leave'); };
    const remark = (d) => {
      if (d.status === 'leave') { const r = BS.leaveReq.all().find((x) => x.empNo === d.empNo && x.status === 'approved' && x.start < d.shiftEnd && d.shiftStart < x.end); return r ? `${t('l.type.' + r.type)} ${BS.leaveReq.dur(r.hours, lang())}` : t('at.s.leave'); }
      if (att.adjusts(d.empNo, d.date).length) return t('at.adjusted');
      const parts = []; if (d.lateMin) parts.push(t('at.lateN', { n: d.lateMin })); if (d.earlyMin) parts.push(t('at.earlyN', { n: d.earlyMin })); if (d.flags.includes('outsideIn')) parts.push(t('at.outIn')); if (d.flags.includes('outsideOut')) parts.push(t('at.outOut'));
      if (d.outState === 'missing' && d.inP) parts.push(t('at.pastOut')); if (d.inState === 'missing') parts.push(t('at.noIn'));
      return parts.join(' · ') || t('at.sys');
    };
    const projSel = (F, d, extra = '') => html`<label class="a-in"><select data-f="projectKey" aria-label="${t('lv.d.project')}"><option value="">${t('lv.d.project')}</option>${hr.projects().map((p) => html`<option value="${p.key}" ${d.projectKey === p.key ? 'selected' : ''}>${loc(p)}</option>`)}</select></label>
      <label class="a-in"><select data-f="siteKey" aria-label="${t('lv.d.site')}"><option value="">${t('lv.d.site')}</option>${(d.projectKey ? hr.project(d.projectKey).sites : hr.sites().map((s) => s.key)).map((k) => html`<option value="${k}" ${d.siteKey === k ? 'selected' : ''}>${loc(hr.site(k))}</option>`)}</select></label>${extra}`;
    const pager = (S, total, per, act) => { const pages = Math.max(1, Math.ceil(total / per)); if (S.page > pages) S.page = pages; return html`<footer class="a-pager"><span>${t('hr.total', { n: total })}</span><nav aria-label="${t('a.pager')}"><button type="button" data-act="${act}" data-p="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''}>‹</button>${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${S.page === i + 1 ? 'on' : ''}" data-act="${act}" data-p="${i + 1}">${i + 1}</button>`)}<button type="button" data-act="${act}" data-p="${S.page + 1}" ${S.page >= pages ? 'disabled' : ''}>›</button></nav></footer>`; };
    const dtLocal = (s) => (s ? s.slice(0, 16) : '');
    return { t, lang, loc, nameOf, empOf, gName, siteL, hhmm, tag, inTxt, outTxt, leaveTxt, remark, projSel, pager, dtLocal };
  }

  // ===================================================================== 每日考勤统计
  BS.attParts.daily = function (ctx) {
    const K = kit(ctx); const { t, loc, nameOf, gName, tag, inTxt, outTxt, leaveTxt, projSel } = K; const render = ctx.rerender;
    const F0 = () => ({ date: today(), projectKey: '', siteKey: '', groupId: '' });
    const V = { draft: F0(), applied: F0(), modal: null };
    const list = () => BS.perm.scoped(att.daily(V.applied.date, V.applied), (d) => d.empNo);
    const row = (d, kind) => html`<li><i class="l-av">${nameOf(K.empOf(d)).slice(0, 1)}</i><div><b>${nameOf(K.empOf(d))}</b><small>${kind === 'leave' ? leaveTxt(d) : `${inTxt(d)} · ${outTxt(d)}`}</small></div>${kind === 'modal' ? tag(d.status) : ''}</li>`;
    function page() {
      const all = list(); const d = V.draft; const a = V.applied;
      const normal = all.filter((x) => x.status === 'normal'), abn = all.filter((x) => ['late', 'early', 'missing', 'outside'].includes(x.status)), lv = all.filter((x) => x.status === 'leave'), pend = all.filter((x) => ['pending', 'future'].includes(x.status));
      const rate = all.length ? Math.round((normal.length / all.length) * 1000) / 10 : 0;
      const sec = (k, arr, title, note, cls) => html`<section class="a-card a-pad at-sec ${cls}"><div class="at-sec-h"><div><h2 class="a-h2">${title}</h2><b class="at-n">${t('t.people', { n: arr.length })}</b></div>${arr.length ? html`<button type="button" class="a-link" data-act="at-all" data-k="${k}">${t('at.all')} →</button>` : ''}</div>
        <ul class="at-list">${arr.slice(0, 3).map((x) => row(x, k === 'leave' ? 'leave' : ''))}${arr.length ? '' : html`<li class="at-empty">${t('at.noOne')}</li>`}</ul><p class="a-fhint">${note}</p></section>`;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('at.d.title')}</h1><p class="a-sub">${t('at.d.sub')}</p></div></div>
        <div class="st-cards at-cards">
          <div class="st-card"><small>${t('at.d.expected')}</small><b>${all.length}</b><span>${t('at.d.expectedSub')}${pend.length ? ' · ' + t('at.d.pend', { n: pend.length }) : ''}</span></div>
          <div class="st-card add"><small>${t('at.s.normal')}</small><b>${normal.length}</b><span>${t('at.d.rate', { r: rate })}</span></div>
          <div class="st-card off"><small>${t('at.d.abn')}</small><b>${abn.length}</b><span>${t('at.d.abnSub')}</span></div>
          <div class="st-card"><small>${t('at.s.leave')}</small><b>${lv.length}</b><span>${t('at.d.leaveSub')}</span></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in"><span class="a-in-l">${t('at.date')}</span><input type="date" data-f="date" value="${d.date}" max="${today()}"></label>${projSel(null, d)}
            <label class="a-in"><select data-f="groupId" aria-label="${t('at.group')}"><option value="">${t('at.group')}</option>${att.groups().map((g) => html`<option value="${g.id}" ${d.groupId === g.id ? 'selected' : ''}>${gName(g)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="at-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form></section>
        <div class="at-secs">${sec('normal', normal, t('at.d.normalList'), t('at.d.normalNote'), 'ok')}${sec('abn', abn, t('at.d.abnList'), t('at.d.abnNote'), 'bad')}${sec('leave', lv, t('at.d.leaveList'), t('at.d.leaveNote'), 'lv')}</div>`;
    }
    function modal() {
      const M = V.modal; const all = list(); const a = V.applied;
      const arr = M.k === 'normal' ? all.filter((x) => x.status === 'normal') : M.k === 'abn' ? all.filter((x) => ['late', 'early', 'missing', 'outside'].includes(x.status)) : all.filter((x) => x.status === 'leave');
      const scope = `${a.date}${a.projectKey ? ' · ' + loc(hr.project(a.projectKey)) : ''}${a.siteKey ? ' · ' + loc(hr.site(a.siteKey)) : ''}`;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('at.d.' + M.k + 'List')}</h2><p>${t('lv.rv.detailSub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><p class="a-fhint" style="margin:0 0 8px"><b>${t('t.people', { n: arr.length })}</b> · ${scope} · ${t('at.d.' + M.k + 'Note')}</p><ul class="at-list big">${arr.map((x) => row(x, M.k === 'leave' ? 'leave' : 'modal'))}</ul></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    return {
      tab: 'daily', crumbs() { return [{ text: t('a.nav.att'), act: 'noop' }, { text: t('at.tab.daily') }]; }, page, modal() { return V.modal ? modal() : ''; },
      onInput(e) { const el = e.target; if (!el.dataset.f) return; V.draft[el.dataset.f] = el.value; if (el.dataset.f === 'projectKey') { V.draft.siteKey = ''; render(); } },
      onSubmit() { V.applied = { ...V.draft, date: V.draft.date || today() }; render(); }, onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) { switch (a) { case 'noop': break; case 'at-reset': V.draft = F0(); V.applied = F0(); render(); break; case 'at-all': V.modal = { k: b.dataset.k }; render(); break; case 'close-modal': V.modal = null; render(); break; default: return false; } return true; },
      reset() { V.draft = F0(); V.applied = F0(); V.modal = null; },
    };
  };

  // ===================================================================== 日考勤明细
  BS.attParts.detail = function (ctx) {
    const K = kit(ctx); const { t, loc, nameOf, gName, siteL, hhmm, tag, remark, projSel, pager, dtLocal } = K; const render = ctx.rerender, toast = ctx.toast;
    const F0 = () => ({ kw: '', date: today(), projectKey: '', siteKey: '', groupId: '', result: '' });
    const V = { draft: F0(), applied: F0(), page: 1, modal: null };
    const rows = () => { const a = V.applied; const kw = a.kw.trim().toLowerCase(); return BS.perm.scoped(att.daily(a.date, a), (d) => d.empNo).filter((d) => { const e = K.empOf(d); return (!kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw)) && (!a.result || d.status === a.result); }); };
    const inSt = (d) => (d.status === 'leave' ? '—' : d.inState === 'late' ? t('at.s.late') : d.flags.includes('outsideIn') ? t('at.s.outside') : d.inState === 'ok' ? t('at.s.normal') : d.inState === 'missing' ? t('at.s.missing') : '—');
    const outSt = (d) => (d.status === 'leave' ? '—' : d.outState === 'early' ? t('at.s.early') : d.flags.includes('outsideOut') ? t('at.s.outside') : d.outState === 'ok' ? t('at.s.normal') : d.outState === 'missing' ? t('at.s.missing') : d.outState === 'notyet' ? t('at.notyet') : '—');
    function page() {
      const all = rows(); const slice = all.slice((V.page - 1) * 10, V.page * 10); const d = V.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('at.dt.title')}</h1><p class="a-sub">${t('at.dt.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn" data-act="at-export">${icon('upload', 16)} ${t('hr.export')}</button></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('at.dt.kw')}" aria-label="${t('at.dt.kw')}"></label>
            <label class="a-in"><span class="a-in-l">${t('at.date')}</span><input type="date" data-f="date" value="${d.date}" max="${today()}"></label>${projSel(null, d)}
            <label class="a-in"><select data-f="groupId" aria-label="${t('at.group')}"><option value="">${t('at.group')}</option>${att.groups().map((g) => html`<option value="${g.id}" ${d.groupId === g.id ? 'selected' : ''}>${gName(g)}</option>`)}</select></label>
            <label class="a-in"><select data-f="result" aria-label="${t('at.dt.col.result')}"><option value="">${t('at.dt.col.result')}</option>${['normal', 'late', 'early', 'missing', 'outside', 'leave', 'pending'].map((k) => html`<option value="${k}" ${d.result === k ? 'selected' : ''}>${t('at.s.' + k)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="at-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table at-table"><thead><tr>${['person', 'group', 'in', 'inT', 'out', 'outT', 'site', 'result', 'note'].map((c) => html`<th>${t('at.dt.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((x) => html`<tr><td><b>${nameOf(K.empOf(x))}</b><small class="hr-sub">${x.empNo}</small></td><td>${gName(x.group)}</td><td>${inSt(x)}</td><td>${hhmm(x.inP)}</td><td>${outSt(x)}</td><td>${hhmm(x.outP)}</td><td>${siteL(x.group)}</td><td>${tag(x.status)}</td><td class="mute">${remark(x)}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="at-view" data-e="${x.empNo}">${t('lv.act.detail')}</button><button type="button" class="a-link" data-act="at-adj" data-e="${x.empNo}" ${x.status === 'leave' ? 'disabled' : ''}>${t('at.adjust')}</button></td></tr>`)
              : html`<tr><td colspan="10" class="a-none">${icon('clock', 32)}<p>${t('t.none')}</p></td></tr>`}</tbody></table></div>${pager(V, all.length, 10, 'at-page')}</section>`;
    }
    function viewModal() {
      const M = V.modal; const d = att.day(M.e, V.applied.date); const e = K.empOf(d); const adj = att.adjusts(M.e, V.applied.date);
      const pl = d.plan.p; const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v}</dd></div>`;
      const pun = (p) => html`<li class="${p.valid ? '' : 'inv'}"><b>${t(p.type === 'in' ? 'at.in' : 'at.out')}</b> <span>${p.at.slice(5, 16).replace('T', ' ')}</span> <em>${p.geo === 'out' ? t('at.s.outside') : t('at.fenceIn')}</em> ${p.valid ? '' : html`<span class="a-tag withdrawn">${t('at.invalid')}</span>`} <small>${p.src === 'admin' ? t('at.src.admin') : p.src === 'worker' ? t('at.src.worker') : t('at.src.seed')}</small></li>`;
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('at.v.title')}</h2><p>${t('at.v.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><h3 class="hr-h">${t('at.v.rec')} <em>${t('lv.rv.ro')}</em></h3>
          <dl class="a-dl lv-dl">${kv('hr.col.person', `${nameOf(e)}（${e.empNo}）`)}${kv('at.date', d.date)}${kv('at.group', `${gName(d.group)}（${pl.start}—${pl.end}）`)}${kv('at.dt.col.site', siteL(d.group))}${kv('at.dt.col.in', d.inP ? `${hhmm(d.inP)} · ${d.inState === 'late' ? t('at.lateN', { n: d.lateMin }) : t('at.s.normal')}` : '—')}${kv('at.dt.col.out', d.outP ? `${hhmm(d.outP)} · ${d.outState === 'early' ? t('at.earlyN', { n: d.earlyMin }) : t('at.s.normal')}` : '—')}${kv('at.v.hours', d.workMin != null ? `${fmt.num(Math.round(d.workMin / 6) / 10)} h` : '—')}${kv('at.dt.col.result', html`${tag(d.status)}`)}</dl>
          ${d.punches.length ? html`<h3 class="hr-h">${t('at.v.punches')}</h3><ul class="at-punches">${d.punches.map(pun)}</ul>` : ''}
          <div class="at-face"><div class="at-face-ph">${icon('user', 28)}</div><div><b>${t('at.v.face')}</b><small>${d.inP ? t('at.v.facePass') : '—'}</small></div></div>
          <p class="a-fhint">${t('at.v.sysNote', { g: gName(d.group) })}</p>
          ${adj.length ? html`<h3 class="hr-h">${t('at.v.adjLog')} <em>${t('at.v.adjN', { n: adj.length })}</em></h3>${adj.map((a) => html`<div class="hr-cert ro"><div class="hr-cert-h"><b>${t('at.v.by')}：${t('lv.by.admin')}</b><span class="mute">${a.at}</span></div><dl class="a-dl lv-dl">${a.changes.map((c) => html`<div class="wide"><dt>${t('at.v.' + c.field)}</dt><dd>${c.from ? c.from.slice(5, 16).replace('T', ' ') : '—'} → <b>${c.to.slice(5, 16).replace('T', ' ')}</b></dd></div>`)}<div class="wide"><dt>${t('at.v.reason')}</dt><dd>${a.reason}</dd></div></dl></div>`)}` : ''}</div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button><button type="button" class="a-btn primary" data-act="at-adj" data-e="${M.e}" ${d.status === 'leave' ? 'disabled' : ''}>${t('at.adjust')}</button></footer></div></div>`;
    }
    function adjModal() {
      const M = V.modal; const d = att.day(M.e, V.applied.date); const e = K.empOf(d); const pv = att.preview(M.e, V.applied.date, { inAt: M.f.inAt || null, outAt: M.f.outAt || null });
      const E = (k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('at.e.' + M.errs[k])}</small>` : '');
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('at.a.title')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><div class="a-frow"><label class="a-lab">${t('hr.col.person')}</label><div class="l-ro">${nameOf(e)}（${e.empNo}）</div></div>
          <div class="a-frow"><label class="a-lab" for="aa-in">${t('at.dt.col.in')}</label><input id="aa-in" type="datetime-local" class="a-field" data-a="inAt" value="${M.f.inAt}">${E('inAt')}</div>
          <div class="a-frow"><label class="a-lab" for="aa-out">${t('at.dt.col.out')}</label><input id="aa-out" type="datetime-local" class="a-field" data-a="outAt" value="${M.f.outAt}">${E('outAt')}${E('order')}</div>
          <div class="l-calc"><div><span>${t('at.a.cur')}</span><b>${tag(d.status)}</b></div><i>→</i><div><span>${t('at.a.after')}</span><b data-role="after">${tag(pv.status)}</b></div></div><small class="a-fhint">${t('at.a.after')}：${t('at.a.afterHint')}${pv.workMin != null ? ' · ' + fmt.num(Math.round(pv.workMin / 6) / 10) + ' h' : ''}</small>
          <div class="a-frow"><label class="a-lab" for="aa-why"><b class="req">*</b> ${t('at.a.reason')}</label><textarea id="aa-why" class="a-field" data-a="reason" rows="3" maxlength="200" placeholder="${t('at.a.reasonPh')}">${M.f.reason}</textarea>${E('reason')}${E('nochange')}</div>
          <p class="l-audit">${icon('shield', 14)} ${t('at.a.keep')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="at-adj-ok">${t('l.m.confirm')}</button></footer></div></div>`;
    }
    function openAdj(e) { const d = att.day(e, V.applied.date); V.modal = { k: 'adj', e, errs: {}, f: { inAt: dtLocal(d.inP && d.inP.at), outAt: dtLocal(d.outP && d.outP.at), reason: '' } }; render(); }
    function exportCsv() {
      const all = rows(); const head = ['empNo', 'name', 'date', 'group', 'in', 'out', 'result', 'workHours'];
      const body = all.map((x) => [x.empNo, K.empOf(x).name, x.date, gName(x.group), hhmm(x.inP), hhmm(x.outP), x.status, x.workMin != null ? (x.workMin / 60).toFixed(2) : '']);
      const csv = '﻿' + [head, ...body].map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `attendance-${V.applied.date}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast(t('hr.toast.exported', { n: all.length }), 'ok');
    }
    return {
      tab: 'detail', crumbs() { return [{ text: t('a.nav.att'), act: 'noop' }, { text: t('at.tab.detail') }]; }, page, modal() { const M = V.modal; return !M ? '' : M.k === 'view' ? viewModal() : adjModal(); },
      afterRender(v) { const M = V.modal; if (M && M.k === 'adj' && !M.focused) { M.focused = true; const el = v.querySelector('#aa-in'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = V.modal, view = ctx.view();
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; if (el.dataset.f === 'projectKey') { V.draft.siteKey = ''; render(); } return; }
        if (M && M.k === 'adj' && el.dataset.a) { const k = el.dataset.a; M.f[k] = el.value; M.errs = {}; view.querySelectorAll('.a-ferr').forEach((n) => n.remove()); if (k !== 'reason') { const pv = att.preview(M.e, V.applied.date, { inAt: M.f.inAt || null, outAt: M.f.outAt || null }); const a = view.querySelector('[data-role=after]'); if (a) a.innerHTML = tag(pv.status).s; } }
      },
      onSubmit() { V.applied = { ...V.draft, date: V.draft.date || today() }; V.page = 1; render(); }, onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        switch (a) {
          case 'noop': break;
          case 'at-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break;
          case 'at-page': { const p = +b.dataset.p; if (p >= 1) { V.page = p; render(); } break; }
          case 'at-view': V.modal = { k: 'view', e: b.dataset.e }; render(); break;
          case 'at-adj': openAdj(b.dataset.e); break;
          case 'at-adj-ok': {
            const M = V.modal; const date = V.applied.date; const cur = att.day(M.e, date); const inAt = M.f.inAt && M.f.inAt !== dtLocal(cur.inP && cur.inP.at) ? M.f.inAt : null; const outAt = M.f.outAt && M.f.outAt !== dtLocal(cur.outP && cur.outP.at) ? M.f.outAt : null;
            const r = att.adjust(M.e, date, { inAt, outAt, reason: M.f.reason });
            if (!r.ok) { M.errs = {}; if (r.error === 'reason' || r.error === 'reason_len') M.errs.reason = r.error; else if (r.error === 'order') M.errs.order = 'order'; else if (r.error === 'nochange') M.errs.nochange = 'nochange'; else M.errs.inAt = r.error; render(); break; }
            V.modal = null; render(); toast(t('at.toast.adjusted', { name: nameOf(K.empOf(cur)) }), 'ok'); break;
          }
          case 'at-export': exportCsv(); break;
          case 'close-modal': V.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { V.draft = F0(); V.applied = F0(); V.page = 1; V.modal = null; },
    };
  };

  // ===================================================================== 月考勤统计
  BS.attParts.monthly = function (ctx) {
    const K = kit(ctx); const { t, loc, nameOf, tag, inTxt, outTxt, leaveTxt, projSel, pager } = K; const render = ctx.rerender;
    const F0 = () => ({ kw: '', month: today().slice(0, 7), projectKey: '', siteKey: '' });
    const V = { draft: F0(), applied: F0(), page: 1, modal: null };
    const rows = () => { const a = V.applied; const kw = a.kw.trim().toLowerCase(); return BS.perm.scoped(att.monthly(a.month, a), (c) => c.empNo).filter((c) => { const e = hr.emp(c.empNo); return !kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.empNo.toLowerCase().includes(kw); }); };
    function page() {
      const all = rows(); const slice = all.slice((V.page - 1) * 10, V.page * 10); const d = V.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('at.m.title')}</h1><p class="a-sub">${t('at.m.sub')}</p></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('at.dt.kw')}" aria-label="${t('at.dt.kw')}"></label>
            <label class="a-in"><span class="a-in-l">${t('at.m.month')}</span><input type="month" data-f="month" value="${d.month}" max="${today().slice(0, 7)}"></label>${projSel(null, d)}
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="at-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table"><thead><tr>${['person', 'month', 'expected', 'normal', 'late', 'early', 'missing', 'outside', 'leave', 'hours'].map((c) => html`<th class="${['person', 'month'].includes(c) ? '' : 'c-amount'}">${t('at.m.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((c) => { const e = hr.emp(c.empNo); return html`<tr><td><b>${nameOf(e)}</b><small class="hr-sub">${e.empNo}</small></td><td class="mute">${c.month}</td><td class="c-amount">${c.expected}</td><td class="c-amount">${c.normal}</td><td class="c-amount ${c.late ? 'at-warn' : 'mute'}">${c.late}</td><td class="c-amount ${c.early ? 'at-warn' : 'mute'}">${c.early}</td><td class="c-amount ${c.missing ? 'at-bad' : 'mute'}">${c.missing}</td><td class="c-amount ${c.outside ? 'at-warn' : 'mute'}">${c.outside}</td><td class="c-amount">${c.leave}</td><td class="c-amount"><b>${fmt.num(Math.round(c.hours * 10) / 10)}</b></td><td class="c-act"><button type="button" class="a-link" data-act="at-mview" data-e="${c.empNo}">${t('at.m.view')}</button></td></tr>`; })
              : html`<tr><td colspan="11" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>${pager(V, all.length, 10, 'at-page')}</section>`;
    }
    function modal() {
      const M = V.modal; const e = hr.emp(M.e); const a = V.applied; const days = []; for (let d = `${a.month}-01`; d.slice(0, 7) === a.month && d <= today(); d = att.addDays(d, 1)) days.push(d);
      const rowsD = days.map((d) => att.day(M.e, d)).filter((x) => x.status !== 'none'); const c = att.monthly(a.month).find((x) => x.empNo === M.e) || { expected: 0, normal: 0, late: 0, early: 0, missing: 0, outside: 0, leave: 0 };
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${nameOf(e)} · ${a.month}</h2><p>${t('at.m.sum', { n: c.expected, a: c.normal, b: c.late, c: c.early, d: c.missing, e: c.outside, f: c.leave })}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><ul class="at-list big">${rowsD.map((x) => { const wd = new Date(x.date.replace(/-/g, '/')).getDay(); return html`<li><i class="at-dd">${x.date.slice(5)}<small>${t('lv.wd.' + wd)}</small></i><div><b>${x.status === 'rest' ? t('at.s.rest') : ''}${x.status === 'rest' ? '' : tag(x.status)}</b><small>${x.status === 'rest' ? t('at.restNote') : x.status === 'leave' ? leaveTxt(x) : `${inTxt(x)} · ${outTxt(x)}`}</small></div></li>`; })}</ul></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button></footer></div></div>`;
    }
    return {
      tab: 'monthly', crumbs() { return [{ text: t('a.nav.att'), act: 'noop' }, { text: t('at.tab.monthly') }]; }, page, modal() { return V.modal ? modal() : ''; },
      onInput(e) { const el = e.target; if (!el.dataset.f) return; V.draft[el.dataset.f] = el.value; if (el.dataset.f === 'projectKey') { V.draft.siteKey = ''; render(); } },
      onSubmit() { V.applied = { ...V.draft, month: V.draft.month || today().slice(0, 7) }; V.page = 1; render(); }, onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) { switch (a) { case 'noop': break; case 'at-reset': V.draft = F0(); V.applied = F0(); V.page = 1; render(); break; case 'at-page': { const p = +b.dataset.p; if (p >= 1) { V.page = p; render(); } break; } case 'at-mview': V.modal = { e: b.dataset.e }; render(); break; case 'close-modal': V.modal = null; render(); break; default: return false; } return true; },
      reset() { V.draft = F0(); V.applied = F0(); V.page = 1; V.modal = null; },
    };
  };

  // ===================================================================== 考勤组
  BS.attParts.groups = function (ctx) {
    const K = kit(ctx); const { t, loc, gName, pager } = K; const render = ctx.rerender, toast = ctx.toast;
    const V = { draft: { kw: '', projectKey: '' }, applied: { kw: '', projectKey: '' }, page: 1, modal: null };
    const net = (p) => { const span = (+p.end.slice(0, 2) * 60 + +p.end.slice(3) - +p.start.slice(0, 2) * 60 - +p.start.slice(3) + 1440) % 1440; return Math.round(((span - (p.brk !== 'none' ? +p.brkMin : 0)) / 60) * 10) / 10; };
    const rule = (g) => { const d = g.days; const parts = []; const cross = +d.weekday.end.slice(0, 2) * 60 + +d.weekday.end.slice(3) <= +d.weekday.start.slice(0, 2) * 60 + +d.weekday.start.slice(3); if (cross) parts.push(t('at.g.cross')); if (d.weekday.on) parts.push(`${t('at.g.wk')}${net(d.weekday)}h`); if (d.sat.on) parts.push(`${t('lv.wd.6')}${net(d.sat)}h`); if (d.sun.on) parts.push(`${t('lv.wd.0')}${net(d.sun)}h`); return parts.join(' · '); };
    const brkL = (g) => { const p = g.days.weekday; return p.brk === 'auto' ? t('at.g.brkAuto', { n: +p.brkMin / 60 }) : p.brk === 'fixed' ? t('at.g.brkFixed', { n: +p.brkMin / 60 }) : t('at.g.brkNone'); };
    const rows = () => { const a = V.applied, kw = a.kw.trim().toLowerCase(); return att.groups().filter((g) => (!kw || g.nameZh.toLowerCase().includes(kw) || g.nameEn.toLowerCase().includes(kw)) && (!a.projectKey || g.projectKey === a.projectKey)); };
    function page() {
      const all = rows(); const slice = all.slice((V.page - 1) * 10, V.page * 10); const d = V.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('at.g.title')}</h1><p class="a-sub">${t('at.g.sub')}</p></div><div class="a-tbtns"><button type="button" class="a-btn primary" data-act="g-new">${icon('plus', 16)} ${t('at.g.new')}</button></div></div>
        <section class="a-card"><form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('at.g.name')}" aria-label="${t('at.g.name')}"></label>
            <label class="a-in"><select data-f="projectKey" aria-label="${t('lv.d.project')}"><option value="">${t('lv.d.project')}</option>${hr.projects().map((p) => html`<option value="${p.key}" ${d.projectKey === p.key ? 'selected' : ''}>${loc(p)}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="g-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button></form>
          <div class="a-tablewrap"><table class="a-table"><thead><tr>${['name', 'project', 'site', 'rule', 'brk', 'round', 'users'].map((c) => html`<th>${t('at.g.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((g) => html`<tr><td><b>${gName(g)}</b></td><td>${loc(hr.project(g.projectKey))}</td><td>${loc(hr.site(g.siteKey))}</td><td>${rule(g)}</td><td>${brkL(g)}</td><td>${t('at.g.roundN', { n: g.round.unit })} · ${t('at.g.dir.' + g.round.dir)}</td><td>${t('t.people', { n: att.groupUsers(g.id) })}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="g-edit" data-id="${g.id}">${t('p.edit')}</button><button type="button" class="a-link bad" data-act="g-del" data-id="${g.id}">${t('p.del')}</button></td></tr>`) : html`<tr><td colspan="8" class="a-none"><p>${t('t.none')}</p></td></tr>`}</tbody></table></div>${pager(V, all.length, 10, 'g-page')}</section>`;
    }
    function blank() { const mk = (s, e, on = true) => ({ on, start: s, end: e, brk: 'auto', brkFrom: '12:00', brkTo: '13:00', brkMin: 60 }); return { nameZh: '', nameEn: '', projectKey: '', siteKey: '', days: { weekday: mk('08:00', '17:00'), sat: mk('08:00', '12:00'), sun: mk('08:00', '17:00', false), special: { ...mk('09:00', '18:00', false), dates: [] } }, round: { unit: 15, dir: 'nearest' } }; }
    function formModal() {
      const M = V.modal; const F = M.f; const e = M.errs; const E = (k) => (e[k] ? html`<small class="a-ferr" data-err="${k}">${t('at.e.' + e[k])}</small>` : '');
      const sites = F.projectKey ? hr.project(F.projectKey).sites.filter((k) => hr.site(k).active || F.siteKey === k) : [];
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${M.id ? t('at.g.edit') : t('at.g.new')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><h3 class="hr-h">${t('hr.m.basic')}</h3>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="g-z"><b class="req">*</b> ${t('at.g.zh')}</label><input id="g-z" class="a-field" data-g="nameZh" value="${F.nameZh}" maxlength="30">${E('nameZh')}</div><div class="a-frow"><label class="a-lab" for="g-e"><b class="req">*</b> ${t('at.g.en')}</label><input id="g-e" class="a-field" data-g="nameEn" value="${F.nameEn}" maxlength="50">${E('nameEn')}</div></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="g-p"><b class="req">*</b> ${t('lv.d.project')}</label><select id="g-p" class="a-field" data-g="projectKey"><option value="">${t('at.g.pickProject')}</option>${hr.projects().map((p) => html`<option value="${p.key}" ${F.projectKey === p.key ? 'selected' : ''}>${loc(p)}</option>`)}</select>${E('projectKey')}</div>
            <div class="a-frow"><label class="a-lab" for="g-s"><b class="req">*</b> ${t('lv.d.site')}</label><select id="g-s" class="a-field" data-g="siteKey"><option value="">${t('at.g.pickSite')}</option>${sites.map((k) => html`<option value="${k}" ${F.siteKey === k ? 'selected' : ''}>${loc(hr.site(k))}</option>`)}</select>${E('siteKey')}</div></div>
          <h3 class="hr-h">${t('at.g.shifts')}</h3><small class="a-fhint" style="margin-top:-8px">${t('at.g.shiftsHint')}</small>
          <div class="a-tablewrap"><table class="p-rules at-rules"><thead><tr><th>${t('p.m.dayCat')}</th><th>${t('at.g.on')}</th><th>${t('at.g.start')}</th><th>${t('at.g.end')}</th><th>${t('at.g.brk')}</th><th>${t('at.g.window')}</th><th>${t('at.g.min')}</th></tr></thead>
            <tbody>${DAY_TYPES.map((k) => { const p = F.days[k]; return html`<tr class="${e['days.' + k] ? 'err' : ''}"><th scope="row">${t('p.day.' + k)}${k === 'special' ? html`<em>${t('p.m.optional')}</em>` : ''}</th>
              <td><input type="checkbox" data-gd="${k}:on" ${p.on ? 'checked' : ''} aria-label="${t('p.day.' + k)}"></td>
              <td><input type="time" class="a-field sm" data-gd="${k}:start" value="${p.start}" ${p.on ? '' : 'disabled'}></td><td><input type="time" class="a-field sm" data-gd="${k}:end" value="${p.end}" ${p.on ? '' : 'disabled'}></td>
              <td><select class="a-field sm" data-gd="${k}:brk" ${p.on ? '' : 'disabled'}><option value="auto" ${p.brk === 'auto' ? 'selected' : ''}>${t('at.g.brkA')}</option><option value="fixed" ${p.brk === 'fixed' ? 'selected' : ''}>${t('at.g.brkF')}</option><option value="none" ${p.brk === 'none' ? 'selected' : ''}>${t('at.g.brkN')}</option></select></td>
              <td>${p.brk !== 'none' ? html`<span class="at-win"><input type="time" class="a-field sm" data-gd="${k}:brkFrom" value="${p.brkFrom}" ${p.on ? '' : 'disabled'}>–<input type="time" class="a-field sm" data-gd="${k}:brkTo" value="${p.brkTo}" ${p.on ? '' : 'disabled'}></span>` : '—'}</td>
              <td>${p.brk !== 'none' ? html`<input class="a-field sm" style="width:64px" inputmode="numeric" data-gd="${k}:brkMin" value="${p.brkMin}" ${p.on ? '' : 'disabled'}>` : '—'}</td></tr>
              ${k === 'special' && p.on ? html`<tr class="${e['days.special'] ? 'err' : ''}"><td colspan="7"><div class="at-dates"><b>${t('at.g.dates')}</b>${(p.dates || []).map((d) => html`<span class="hr-pill">${d} <button type="button" class="at-x" data-act="g-date-rm" data-d="${d}" aria-label="${t('t.m.remove')}">×</button></span>`)}<input type="date" class="a-field sm" data-g-date><button type="button" class="a-btn" data-act="g-date-add">${t('at.g.addDate')}</button></div></td></tr>` : ''}
              ${e['days.' + k] ? html`<tr class="p-errrow"><td colspan="7">${E('days.' + k)}</td></tr>` : ''}`; })}</tbody></table></div>
          <small class="a-fhint">${t('at.g.crossHint')}</small>
          <h3 class="hr-h">${t('at.g.rounding')}</h3>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="g-u">${t('at.g.unit')}</label><select id="g-u" class="a-field" data-g="round.unit">${[1, 5, 15, 30].map((n) => html`<option value="${n}" ${+F.round.unit === n ? 'selected' : ''}>${t('at.g.roundN', { n })}</option>`)}</select></div>
            <div class="a-frow"><label class="a-lab" for="g-d">${t('at.g.dir')}</label><select id="g-d" class="a-field" data-g="round.dir">${['nearest', 'down', 'up'].map((k) => html`<option value="${k}" ${F.round.dir === k ? 'selected' : ''}>${t('at.g.dir.' + k)}</option>`)}</select></div></div>
          <p class="l-audit">${icon('shield', 14)} ${t('at.g.formula')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="g-save">${t('p.m.save')}</button></footer></div></div>`;
    }
    function delModal() {
      const M = V.modal; const g = att.group(M.id); if (!g) return ''; const n = att.groupUsers(g.id);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop><header><h2>${t('at.g.delTitle')}</h2><p>${t('at.g.delMsg', { name: gName(g) })}</p></header>
        <div class="a-mbody"><p class="${n ? 'p-warnbox' : 'a-fhint'}">${n ? html`${icon('warn', 16)} ${t('at.g.delUsed', { n })}` : t('at.g.delSafe')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${n ? t('common.close') : t('common.cancel')}</button>${n ? '' : html`<button type="button" class="a-btn bad" data-act="g-del-ok">${t('at.g.delOk')}</button>`}</footer></div></div>`;
    }
    return {
      tab: 'groups', crumbs() { return [{ text: t('a.nav.att'), act: 'noop' }, { text: t('at.tab.groups') }]; }, page, modal() { const M = V.modal; return !M ? '' : M.k === 'form' ? formModal() : delModal(); },
      afterRender(v) { const M = V.modal; if (M && M.k === 'form' && !M.focused) { M.focused = true; const el = v.querySelector('#g-z'); if (el) el.focus(); } },
      onInput(e) {
        const el = e.target, M = V.modal, view = ctx.view();
        if (el.dataset.f) { V.draft[el.dataset.f] = el.value; return; }
        if (!M || M.k !== 'form') return; const F = M.f; const clear = () => { M.errs = {}; view.querySelectorAll('.a-ferr').forEach((n) => n.remove()); view.querySelectorAll('.at-rules tr.err').forEach((r) => r.classList.remove('err')); };
        if (el.dataset.g) { const k = el.dataset.g; if (k.startsWith('round.')) F.round[k.slice(6)] = el.value; else F[k] = el.value; if (k === 'projectKey') { F.siteKey = ''; render(); return; } clear(); }
        else if (el.dataset.gd) { const [d, f] = el.dataset.gd.split(':'); const p = F.days[d]; if (f === 'on') { p.on = el.checked; render(); return; } if (f === 'brk') { p.brk = el.value; render(); return; } p[f] = f === 'brkMin' ? el.value.replace(/\D/g, '').slice(0, 3) : el.value; if (f === 'brkMin' && el.value !== p[f]) el.value = p[f]; clear(); }
      },
      onSubmit() { V.applied = { ...V.draft }; V.page = 1; render(); }, onEscape() { if (V.modal) { V.modal = null; render(); return true; } return false; }, onStore() { render(); },
      onClick(a, b) {
        const M = V.modal;
        switch (a) {
          case 'noop': break;
          case 'g-reset': V.draft = { kw: '', projectKey: '' }; V.applied = { ...V.draft }; V.page = 1; render(); break;
          case 'g-page': { const p = +b.dataset.p; if (p >= 1) { V.page = p; render(); } break; }
          case 'g-new': V.modal = { k: 'form', id: null, f: blank(), errs: {} }; render(); break;
          case 'g-edit': { const g = att.group(b.dataset.id); V.modal = { k: 'form', id: g.id, f: JSON.parse(JSON.stringify({ nameZh: g.nameZh, nameEn: g.nameEn, projectKey: g.projectKey, siteKey: g.siteKey, days: g.days, round: g.round })), errs: {} }; render(); break; }
          case 'g-date-add': { const inp = ctx.view().querySelector('[data-g-date]'); if (inp && inp.value && !M.f.days.special.dates.includes(inp.value)) { M.f.days.special.dates.push(inp.value); M.f.days.special.dates.sort(); M.errs = {}; render(); } break; }
          case 'g-date-rm': M.f.days.special.dates = M.f.days.special.dates.filter((d) => d !== b.dataset.d); render(); break;
          case 'g-save': { const r = att.saveGroup(M.f, M.id); if (!r.ok) { M.errs = r.errors; render(); break; } V.modal = null; render(); toast(t('at.toast.group'), 'ok'); break; }
          case 'g-del': V.modal = { k: 'del', id: b.dataset.id }; render(); break;
          case 'g-del-ok': { att.removeGroup(M.id); V.modal = null; render(); toast(t('p.toast.deleted'), 'ok'); break; }
          case 'close-modal': V.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      reset() { V.draft = { kw: '', projectKey: '' }; V.applied = { ...V.draft }; V.page = 1; V.modal = null; },
    };
  };

  // ===================================================================== wrapper
  BS.registerAdmin({
    id: 'att', nav: 'a.nav.att', stores: [att, BS.leaveReq, hr],
    tabs: [{ id: 'daily', k: 'at.tab.daily' }, { id: 'detail', k: 'at.tab.detail' }, { id: 'monthly', k: 'at.tab.monthly' }, { id: 'groups', k: 'at.tab.groups' }],
    create(ctx) {
      const parts = { daily: BS.attParts.daily(ctx), detail: BS.attParts.detail(ctx), monthly: BS.attParts.monthly(ctx), groups: BS.attParts.groups(ctx) };
      let tab = 'daily'; const cur = () => parts[tab];
      return {
        get tab() { return tab; }, set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(), page: () => cur().page(), modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v), onInput: (e) => cur().onInput && cur().onInput(e), onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false), onStore: () => ctx.rerender(), onClick: (a, b, e) => cur().onClick(a, b, e),
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'daily'; },
      };
    },
  });
})(window.BS);
