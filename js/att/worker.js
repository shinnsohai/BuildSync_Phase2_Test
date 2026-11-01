/* Worker app: 考勤 — check-in / check-out (with face check and a fence / time simulator) and 考勤记录. */
(function (BS) {
  const att = BS.att, hr = BS.hr;
  const ADDR = { raffles: '1 Raffles Place, Singapore 048616', maritime: '8 Marina Boulevard, Singapore 018981', jurong: '1 Jurong Gateway Rd, Singapore 608549', riverside: '3 River Valley Rd, Singapore 179024', olddock: '10 Pasir Panjang Rd, Singapore 117438' };
  const pad = (n) => String(n).padStart(2, '0');
  const diffMin = (a, b) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 60000);

  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const A = { face: null, timer: null, rec: { mode: 'month', month: '', sel: '' }, simOpen: false, toastFace: null };
    const me = () => BS.ME.empNo;
    const hm = (api, min) => api.t('w.at.hm', { h: Math.floor(min / 60), m: pad(min % 60) });
    const siteOf = (e) => { const a = e && e.assigns[0]; return a ? hr.site(a.siteKey) : null; };
    const addr = (e) => { const s = siteOf(e); if (s) return s.address; const a = e && e.assigns[0]; return (a && ADDR[a.projectKey]) || ADDR.raffles; };
    const siteLine = (api, e) => { const a = e && e.assigns[0]; if (!a) return api.t('hr.unassigned'); const p = hr.project(a.projectKey), s = hr.site(a.siteKey); const L = (o) => (api.lang === 'zh' ? o.zh : o.en || o.zh); return `${L(s)}`; };
    const prjName = (api, e) => { const a = e && e.assigns[0]; const p = a && hr.project(a.projectKey); return p ? (api.lang === 'zh' ? p.zh : p.en) : api.t('hr.unassigned'); };

    /** everything the main screen needs, from the engine */
    function model(api) {
      const e = hr.emp(me()); const n = att.now(); const g = e && att.groupOf(e); if (!g) return { e, n, none: true };
      const sd = att.currentShift(me(), n); if (!sd) return { e, n, g, rest: true };
      const d = att.day(me(), sd, n); if (!d.expected) return { e, n, g, rest: true, sd };
      const inWindow = att.shiftFor(me(), n) === sd; const late = !d.inP ? diffMin(n, d.shiftStart) : 0;
      let state, label;
      if (d.leaveFull) { state = 'leave'; label = 'w.at.st.leave'; }
      else if (!inWindow) { state = 'upcoming'; label = 'w.at.st.upcoming'; }
      else if (d.outP) { state = 'done'; label = 'w.at.st.done'; }
      else if (d.inP) { state = 'working'; label = d.inState === 'late' ? 'w.at.st.workingLate' : 'w.at.st.working'; }
      else if (n >= d.shiftEnd) { state = 'abnormalOut'; label = 'w.at.st.noIn'; }
      else if (late > att.GRACE) { state = 'late'; label = 'w.at.st.late'; }
      else { state = 'ready'; label = 'w.at.st.ready'; }
      return { e, n, g, d, sd, inWindow, late, state, label };
    }
    function workedMin(M) {
      const d = M.d; if (d.outP) return d.workMin || 0; if (!d.inP) return 0;
      const pv = att.preview(me(), M.sd, { outAt: M.n }); return pv.workMin || 0;
    }

    // ---------- main screen ----------
    function main(api) {
      const { t, html, icon, fmt } = api; const M = model(api); const S = att.sim;
      if (M.none) return html`<div class="w-body"><div class="w-hero"><h1>${t('w.tab.att')}</h1></div><div class="w-empty">${icon('pin', 40)}<p>${t('w.at.none')}</p></div></div>${api.tabbar('w.tab.att')}`;
      if (M.rest) { const nx = att.nextShift(me(), M.n); return html`<div class="w-body"><div class="w-hero"><h1>${t('w.tab.att')}</h1><p>${siteLine(api, M.e)}</p></div><div class="w-card w-restc">${icon('cal', 30)}<b>${t('w.at.rest')}</b><small>${nx ? t('w.at.nextShift', { d: nx.slice(5), w: t('lv.wd.' + new Date(nx.replace(/-/g, '/')).getDay()) }) : ''}</small></div>${sim(api)}</div>${api.tabbar('w.tab.att')}`; }
      const { d } = M; const pl = d.plan.p; const out = S.geo === 'out';
      const hours = M.state === 'working' || M.state === 'done' ? workedMin(M) : 0;
      let btn = null;
      if (M.state === 'ready') btn = { act: 'att-start', k: 'in', label: out ? 'w.at.btn.inOut' : 'w.at.btn.in' };
      else if (M.state === 'late') btn = { act: 'att-start', k: 'in', label: out ? 'w.at.btn.inOut' : 'w.at.btn.late' };
      else if (M.state === 'abnormalOut') btn = { act: 'att-start', k: 'out', label: 'w.at.btn.abnOut' };
      else if (M.state === 'working') btn = { act: 'att-start', k: 'out', label: 'w.at.btn.out' };
      else if (M.state === 'done') btn = { act: 'att-start', k: 'out', label: 'w.at.btn.update' };
      // site rules (项目与工区): stopped site or no punching outside the fence
      const site = siteOf(M.e); const siteOff = !!(site && !site.active); const denied = !!(site && out && !site.allowOutside);
      if (btn && (siteOff || denied)) btn = null;
      const lv = M.state === 'leave' ? BS.leaveReq.all().find((r) => r.empNo === me() && r.status === 'approved' && r.start < d.shiftEnd && d.shiftStart < r.end) : null;
      return html`
        <div class="w-body w-att">
          <div class="w-hero"><h1>${t('w.tab.att')}</h1><p>${siteLine(api, M.e)} · ${t('w.at.central')}</p></div>
          <section class="w-card w-clockc ${M.state}"><span class="w-stchip ${M.state}">${t(M.label, { n: M.late })}</span><div class="w-clock" data-role="clock">${M.n.slice(11, 16)}<small>:${pad(new Date().getSeconds())}</small></div>
            <p class="w-attprj">${prjName(api, M.e)}</p><p class="w-attshift">${t('w.at.shift', { d: M.sd.slice(5).replace('-', t('w.at.m')) + t('w.at.d'), s: pl.start, e: pl.end })}${d.cross ? ' · ' + t('at.g.cross') : ''}</p>
            <div class="w-loc ${out ? 'bad' : ''}">${icon('pin', 16)}<span><b>${t(out ? 'w.at.locBad' : 'w.at.locOk')}</b> ${out ? t('w.at.outside') : addr(M.e)}</span></div></section>
          ${lv ? html`<section class="w-card"><h3>${t('w.at.onLeave')}</h3><p class="w-sub">${t('l.type.' + lv.type)} · ${lv.start.slice(5, 16).replace('T', ' ')} → ${lv.end.slice(5, 16).replace('T', ' ')}</p><button type="button" class="w-textbtn" data-act="lv-open" data-id="${lv.id}">${t('w.at.viewLeave')} ›</button></section><p class="w-note ok">${icon('check', 16)} ${t('w.at.leaveNote')}</p>` : html`
          <div class="w-two">
            <section class="w-card w-mini"><small>${t('w.at.today')}</small><b>${hm(api, hours)}</b><span>${M.d.inP ? t('w.at.cum') : t('w.at.notIn')}</span></section>
            <section class="w-card w-mini"><small>${d.outP ? t('w.at.outT') : t('w.at.inT')}</small><b>${d.outP ? d.outP.at.slice(11, 16) : d.inP ? d.inP.at.slice(11, 16) : '--:--'}</b><span>${d.outP ? t('w.at.doneToday') : d.inP ? t('w.at.inDone') : t('w.at.afterIn')}</span></section></div>
          <section class="w-card w-fence ${out ? 'bad' : ''}"><div><small>${t('w.at.punchLoc')}</small><b>${t(out ? 'at.s.outside' : 'at.fenceIn')}</b></div><span>${out ? t('w.at.dist', { n: (site ? site.radius : 300) + 128 }) : t('w.at.gps', { n: 3 })}${site ? ` · ${t('w.at.radius', { n: site.radius })}` : ''}</span></section>
          ${siteOff ? html`<p class="w-note bad">${icon('x', 16)} ${t('w.at.siteOff')}</p>` : denied ? html`<p class="w-note bad">${icon('x', 16)} ${t('w.at.outDenied')}</p>` : ''}
          ${M.state === 'upcoming' ? html`<p class="w-note">${icon('clock', 16)} ${t('w.at.notWindow', { t: pl.start })}</p>` : ''}
          ${btn ? html`<button type="button" class="w-btn primary w-punch ${out ? 'warn' : ''}" data-act="${btn.act}" data-k="${btn.k}">${t(btn.label)}</button><small class="w-hint">${t(btn.k === 'in' ? 'w.at.hintIn' : 'w.at.hintOut')}</small>` : ''}`}
          ${sim(api)}
        </div>
        ${api.tabbar('w.tab.att')}`;
    }
    function sim(api) {
      const { t, html, icon } = api; const S = att.sim;
      return html`<section class="w-card w-sim"><button type="button" class="w-sim-h" data-act="att-sim-toggle" aria-expanded="${A.simOpen ? 'true' : 'false'}">${icon('gear', 16)} <b>${t('w.at.sim')}</b><em>${t('p.demo')}</em><span>${A.simOpen ? '−' : '+'}</span></button>
        ${A.simOpen ? html`<p class="w-sub">${t('w.at.simHint')}</p>
          <div class="w-simrow"><label for="sim-t">${t('w.at.simTime')}</label><input id="sim-t" type="time" class="w-input" data-sim="time" value="${S.time}"><button type="button" class="w-textbtn" data-act="att-sim-real">${t('w.at.simReal')}</button></div>
          <div class="w-simrow"><label>${t('w.at.simLoc')}</label><div class="w-seg">${['in', 'out'].map((k) => html`<button type="button" class="${S.geo === k ? 'on' : ''}" data-act="att-sim-geo" data-v="${k}">${t(k === 'in' ? 'at.fenceIn' : 'at.s.outside')}</button>`)}</div></div>
          <div class="w-simrow"><label>${t('w.at.simFace')}</label><div class="w-seg">${['ok', 'fail'].map((k) => html`<button type="button" class="${S.face === k ? 'on' : ''}" data-act="att-sim-face" data-v="${k}">${t(k === 'ok' ? 'w.at.simPass' : 'w.at.simFail')}</button>`)}</div></div>` : ''}</section>`;
    }

    // ---------- confirm sheet + face ----------
    function confirmSheet(api, k) {
      const { t, html, icon } = api; const M = model(api); const out = att.sim.geo === 'out';
      return () => html`<h2>${t(k === 'in' ? 'w.at.confirmIn' : 'w.at.confirmOut')}</h2>
        ${(() => { const pop = BS.content.livePopup(k); return pop && pop.image ? html`<img class="w-pop-img" src="${pop.image.data}" alt="${api.lang === 'zh' ? pop.zh : pop.en}"><p class="w-pop-msg">${api.lang === 'zh' ? pop.msgZh : pop.msgEn}</p>` : html`<div class="w-tip">${icon(k === 'in' ? 'shield' : 'check', 26)}<div><b>${t(k === 'in' ? 'w.at.tipInT' : 'w.at.tipOutT')}</b><small>${t(k === 'in' ? 'w.at.tipIn' : 'w.at.tipOut')}</small></div></div>`; })()}
        <dl class="w-sheet-dl"><div><dt>${t(k === 'in' ? 'w.at.curIn' : 'w.at.curOut')}</dt><dd>${addr(M.e)}${out ? html` <em class="w-bad">${t('at.s.outside')}</em>` : ''}</dd></div><div><dt>${t(k === 'in' ? 'w.at.timeIn' : 'w.at.timeOut')}</dt><dd>${att.now().replace('T', ' ')}</dd></div></dl>
        <div class="w-btns"><button type="button" class="w-btn ghost" data-act="close-sheet">${t('common.cancel')}</button><button type="button" class="w-btn primary" data-act="att-go" data-k="${k}">${t(k === 'in' ? 'w.at.btn.confirmIn' : 'w.at.btn.confirmOut')}</button></div>`;
    }
    function doPunch(api, k) {
      const r = att.punch(me(), k, { geo: att.sim.geo, face: true });
      if (!r.ok) { api.toast(api.t('w.at.err.' + r.error), 'warn'); return null; } return r;
    }
    function face(api) {
      const { t, html, icon, header } = api; const F = A.face;
      if (!F) return html`${header(t('w.at.face'))}<div class="w-body"></div>`;
      if (F.phase === 'scan' && !A.timer) {
        A.timer = setTimeout(() => {
          A.timer = null; if (!A.face) return;
          if (att.sim.face === 'fail') A.face.phase = 'fail';
          else { const r = doPunch(api, 'in'); if (r) { A.face.phase = 'ok'; A.face.res = r; } else { A.face = null; api.go([{ s: 'home' }, { s: 'att' }]); return; } }
          api.render();
        }, 1500);
      }
      const body = F.phase === 'scan' ? html`<div class="w-face scan"><div class="w-face-ring">${icon('user', 54)}</div></div><h2>${t('w.at.faceScan')}</h2><p class="w-sub">${t('w.at.faceScanHint')}</p><button type="button" class="w-textbtn" data-act="att-face-cancel">${t('w.at.faceCancel')}</button>`
        : F.phase === 'fail' ? html`<div class="w-face bad"><div class="w-face-ring">${icon('x', 54)}</div></div><h2>${t('w.at.faceFail')}</h2><p class="w-sub">${t('w.at.faceFailHint')}</p><div class="w-btns"><button type="button" class="w-btn ghost" data-act="att-face-cancel">${t('common.cancel')}</button><button type="button" class="w-btn primary" data-act="att-face-retry">${t('w.at.faceRetry')}</button></div>`
        : html`<div class="w-face ok"><div class="w-face-ring">${icon('check', 54)}</div></div><h2>${t('w.at.inOk')}</h2><p class="w-sub">${t('w.at.inOkHint')}</p>
          <dl class="w-sheet-dl"><div><dt>${t('w.at.curIn')}</dt><dd>${addr(hr.emp(me()))}</dd></div><div><dt>${t('w.at.timeIn')}</dt><dd>${F.res.punch.at.replace('T', ' ')}:00</dd></div></dl><button type="button" class="w-btn primary" data-act="att-face-done">${t('w.at.back')}</button>`;
      return html`${header(t('w.at.face'))}<div class="w-body w-facebody">${body}<small class="w-hint">${t('w.at.faceNote')}</small></div>`;
    }

    // ---------- records ----------
    function records(api) {
      const { t, html, icon, header, fmt } = api; const R = A.rec; const n0 = att.now().slice(0, 10);
      if (!R.month) { R.month = n0.slice(0, 7); R.sel = n0; }
      const days = []; for (let d = `${R.month}-01`; d.slice(0, 7) === R.month; d = att.addDays(d, 1)) days.push(d);
      const info = new Map(days.map((d) => [d, d > n0 ? { status: 'future' } : att.day(me(), d)]));
      const worked = days.reduce((s, d) => s + ((info.get(d).workMin) || 0), 0); const present = days.filter((d) => info.get(d).inP).length; const abn = days.filter((d) => ['late', 'early', 'missing', 'outside'].includes(info.get(d).status)).length;
      const first = new Date(`${R.month}-01`.replace(/-/g, '/')).getDay(); const lead = (first + 6) % 7; const sel = R.sel; const dd = info.get(sel) || att.day(me(), sel);
      const mLabel = t('w.at.monthLbl', { y: R.month.slice(0, 4), m: +R.month.slice(5) });
      const detail = () => {
        if (!dd || !dd.expected) return html`<p class="w-sub">${dd && dd.status === 'rest' ? t('at.restNote') : t('w.at.noRec')}</p>`;
        return html`<div class="w-rec-d"><div class="w-rec-top"><b>${t('w.at.dayHdr', { d: sel.slice(5).replace('-', t('w.at.m')) + t('w.at.d'), w: t('lv.wd.' + new Date(sel.replace(/-/g, '/')).getDay()) })}</b><span class="a-tag at-${dd.status}">${t('at.s.' + dd.status)}</span></div>
          <p class="w-sub">${t('w.at.dayHours', { h: hm(api, dd.workMin || 0) })}${dd.adjusted ? '' : ''}</p>
          ${dd.punches && dd.punches.length ? html`<ul class="w-punches">${dd.punches.map((p) => html`<li class="${p.valid ? '' : 'inv'}"><span class="w-ico-sq">${icon(p.type === 'in' ? 'check' : 'back', 14)}</span><div><b>${t(p.type === 'in' ? 'at.in' : 'at.out')}${p.valid ? '' : ' (' + t('at.invalid') + ')'}</b><small>${siteLine(api, hr.emp(me()))} · ${p.geo === 'out' ? t('at.s.outside') : t('at.fenceIn')}${p.src === 'admin' ? ' · ' + t('at.src.admin') : ''}</small></div><em>${p.at.slice(11, 16)}</em></li>`)}</ul>` : html`<p class="w-sub">${dd.status === 'leave' ? t('w.at.leaveDay') : t('w.at.noPunch')}</p>`}</div>`;
      };
      return html`
        ${header(t('w.at.recTitle'))}
        <div class="w-body">
          <div class="w-filters" role="tablist">${['day', 'month'].map((m) => html`<button type="button" role="tab" aria-selected="${R.mode === m ? 'true' : 'false'}" class="${R.mode === m ? 'on' : ''}" data-act="att-mode" data-m="${m}">${t('w.at.' + m + 'Rec')}</button>`)}</div>
          ${R.mode === 'month' ? html`
            <div class="w-monthbar"><button type="button" class="w-back" data-act="att-month" data-n="-1" aria-label="${t('a.prev')}">${icon('back', 20)}</button><b>${mLabel}</b><button type="button" class="w-back" data-act="att-month" data-n="1" ${R.month >= n0.slice(0, 7) ? 'disabled' : ''} aria-label="${t('a.next')}">${icon('right', 20)}</button></div>
            <div class="w-sumrow"><div><b>${hm(api, worked)}</b><small>${t('w.at.sumHours')}</small></div><div><b>${present} ${t('w.at.dayUnit')}</b><small>${t('w.at.sumDays')}</small></div><div><b>${abn}</b><small>${t('w.at.sumAbn')}</small></div></div>
            <div class="w-cal">${[1, 2, 3, 4, 5, 6, 0].map((w) => html`<i>${t('lv.wds.' + w)}</i>`)}${Array.from({ length: lead }, () => html`<span></span>`)}
              ${days.map((d) => { const x = info.get(d); const cls = x.status === 'normal' ? 'ok' : ['late', 'early', 'missing', 'outside'].includes(x.status) ? 'bad' : x.status === 'leave' ? 'lv' : ''; return html`<button type="button" class="${cls} ${d === n0 ? 'today' : ''} ${d === sel ? 'sel' : ''}" data-act="att-sel" data-d="${d}">${+d.slice(8)}</button>`; })}</div>
            <p class="w-sub w-legend">${t('w.at.legend')}</p>` : html`
            <div class="w-monthbar"><button type="button" class="w-back" data-act="att-day" data-n="-1" aria-label="${t('a.prev')}">${icon('back', 20)}</button><b>${t('w.at.dayHdr', { d: sel.slice(5).replace('-', t('w.at.m')) + t('w.at.d'), w: t('lv.wd.' + new Date(sel.replace(/-/g, '/')).getDay()) })}</b><button type="button" class="w-back" data-act="att-day" data-n="1" ${sel >= n0 ? 'disabled' : ''} aria-label="${t('a.next')}">${icon('right', 20)}</button></div>`}
          <section class="w-card">${detail()}</section>
        </div>`;
    }

    return {
      stores: [att, BS.leaveReq, hr],
      screens: { att: main, 'att-face': face, 'att-rec': records },
      init(api) {
        api.root.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.sim === 'time') { att.sim.time = el.value; api.render(); } });
        let lastMin = '';
        setInterval(() => {
          const c = api.cur(); if (!c || c.s !== 'att') return; const el = api.root.querySelector('[data-role=clock]'); if (!el) return; const now = att.now();
          el.innerHTML = `${now.slice(11, 16)}<small>:${pad(new Date().getSeconds())}</small>`;
          if (!att.sim.time && now.slice(11, 16) !== lastMin) { lastMin = now.slice(11, 16); if (!api.W.sheet) api.render(); }
        }, 1000);
      },
      onClick(a, b, api) {
        const k = b.dataset.k;
        switch (a) {
          case 'open-att': api.go([{ s: 'home' }, { s: 'att' }]); return true;
          case 'open-att-rec': A.rec = { mode: 'month', month: '', sel: '' }; api.go([{ s: 'home' }, { s: 'att-rec' }]); return true;
          case 'att-sim-toggle': A.simOpen = !A.simOpen; api.render(); return true;
          case 'att-sim-real': att.sim.time = ''; api.render(); return true;
          case 'att-sim-geo': att.sim.geo = b.dataset.v; api.render(); return true;
          case 'att-sim-face': att.sim.face = b.dataset.v; api.render(); return true;
          case 'att-start': api.W.sheet = { k: 'html', render: confirmSheet(api, k) }; api.render(); return true;
          case 'att-go': {
            api.W.sheet = null;
            if (k === 'in') { A.face = { phase: 'scan' }; clearTimeout(A.timer); A.timer = null; api.push('att-face'); return true; }
            const r = doPunch(api, 'out'); api.render(); if (r) { const d = r.day; api.toast(api.t(r.replaced ? 'w.at.outUpdated' : 'w.at.outOk', { h: hm(api, d.workMin || 0) }), 'ok'); } return true;
          }
          case 'att-face-cancel': clearTimeout(A.timer); A.timer = null; A.face = null; api.pop(); return true;
          case 'att-face-retry': A.face = { phase: 'scan' }; clearTimeout(A.timer); A.timer = null; api.render(); return true;
          case 'att-face-done': A.face = null; api.go([{ s: 'home' }, { s: 'att' }]); return true;
          case 'att-mode': A.rec.mode = b.dataset.m; api.render(); return true;
          case 'att-month': { const m = A.rec.month; const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + +b.dataset.n, 1); const nm = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; if (nm > att.now().slice(0, 7)) return true; A.rec.month = nm; A.rec.sel = nm === att.now().slice(0, 7) ? att.now().slice(0, 10) : `${nm}-01`; api.render(); return true; }
          case 'att-sel': A.rec.sel = b.dataset.d; api.render(); return true;
          case 'att-day': { const nd = att.addDays(A.rec.sel, +b.dataset.n); if (nd > att.now().slice(0, 10)) return true; A.rec.sel = nd; A.rec.month = nd.slice(0, 7); api.render(); return true; }
        }
        return false;
      },
      onStore(evt, api) { const c = api.cur(); if (c && (c.s === 'att' || c.s === 'att-rec')) api.render(); else api.render(); },
    };
  })());
})(window.BS);
