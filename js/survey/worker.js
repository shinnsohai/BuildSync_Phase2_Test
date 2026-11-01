/* Worker app: 问卷 — pending and submitted surveys, answering (with a saved draft), and read-only submitted answers. */
(function (BS) {
  const sv = BS.survey;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const P = { tab: 'pending', id: null, answers: {}, errs: {} };
    const me = () => BS.ME.empNo;
    const loc = (api, o) => (api.lang === 'zh' ? o.zh : o.en || o.zh);
    const dl = (s) => s.deadline.slice(5, 16).replace('T', ' ');

    function list(api) {
      const { t, html, icon, header } = api; const all = sv.mine(me());
      const pend = all.filter((x) => x.state !== 'done').sort((a, b) => (a.state === 'closed') - (b.state === 'closed') || a.s.deadline.localeCompare(b.s.deadline));
      const done = all.filter((x) => x.state === 'done').sort((a, b) => b.resp.submittedAt.localeCompare(a.resp.submittedAt));
      const shown = P.tab === 'pending' ? pend : done; const nPend = pend.filter((x) => x.state === 'pending').length;
      return html`
        ${header(t('w.sv.title'))}
        <div class="w-body">
          <div class="w-filters" role="tablist"><button type="button" role="tab" aria-selected="${P.tab === 'pending' ? 'true' : 'false'}" class="${P.tab === 'pending' ? 'on' : ''}" data-act="sv-tab" data-v="pending">${t('w.sv.tabPending', { n: nPend })}</button><button type="button" role="tab" aria-selected="${P.tab === 'done' ? 'true' : 'false'}" class="${P.tab === 'done' ? 'on' : ''}" data-act="sv-tab" data-v="done">${t('w.sv.tabDone', { n: done.length })}</button></div>
          ${shown.length ? shown.map(({ s, resp, state }) => state === 'done' ? html`
            <button type="button" class="w-card w-rec w-sv" data-act="sv-open" data-id="${s.id}"><div class="w-rec-top"><span class="w-ico-sq">${icon('clip', 18)}</span><b>${loc(api, s)}</b><span class="w-tag approved">${t('w.sv.submitted')}</span></div>
              <p class="w-pssub">${t('w.sv.doneLine', { n: s.questions.length, d: resp.submittedAt.replace('T', ' ') })}</p>${icon('right', 18, 'w-rec-go')}</button>` : html`
            <div class="w-card w-rec w-sv ${state === 'closed' ? 'locked' : ''}"><div class="w-rec-top"><span class="w-ico-sq">${icon('clip', 18)}</span><b>${loc(api, s)}</b><span class="w-tag ${state === 'closed' ? 'withdrawn' : s.required ? 'rejected' : 'pending'}">${t(state === 'closed' ? 'w.sv.closed' : s.required ? 'sv.req' : 'w.sv.todo')}</span></div>
              <p class="w-pssub">${t('w.sv.meta', { n: s.questions.length, m: sv.minutes(s) })}</p><p class="w-pssub">${t('w.sv.deadline', { d: dl(s) })}${sv.draftOf(me(), s.id) && state === 'pending' ? ' · ' + t('w.sv.hasDraft') : ''}</p>
              ${state === 'pending' ? html`<button type="button" class="w-btn primary w-sv-go" data-act="sv-start" data-id="${s.id}">${t(sv.draftOf(me(), s.id) ? 'w.sv.resume' : 'w.sv.start')}</button>` : html`<p class="w-pssub">${t('w.sv.closedNote')}</p>`}</div>`)
            : html`<div class="w-empty">${icon('clip', 40)}<p>${t(P.tab === 'pending' ? 'w.sv.nonePending' : 'w.sv.noneDone')}</p></div>`}
        </div>`;
    }

    function fill(api) {
      const { t, html, icon, header } = api; const s = sv.get(P.id);
      if (!s || !sv.isOpen(s) || sv.responseOf(s.id, me())) return html`${header(t('w.sv.title'))}<div class="w-body"><div class="w-empty">${icon('clip', 40)}<p>${t('w.sv.unavailable')}</p></div></div>`;
      return html`
        ${header(loc(api, s))}
        <div class="w-body w-form">
          ${s.questions.map((q, i) => { const a = P.answers[q.id]; const er = P.errs[q.id]; return html`<section class="w-card w-q ${er ? 'err' : ''}"><h3>${i + 1}. ${loc(api, q)}${q.required ? html`<b class="req" aria-label="${t('sv.q.must')}"> *</b>` : ''}</h3>
            ${q.type === 'text' ? html`<textarea class="w-input" rows="3" maxlength="500" data-sva="${q.id}" aria-label="${loc(api, q)}" placeholder="${t('w.sv.textPh')}">${a || ''}</textarea>`
              : q.type === 'multi' ? html`<div class="w-opts">${q.options.map((o, n) => { const on = Array.isArray(a) && a.includes(n); return html`<button type="button" role="checkbox" aria-checked="${on ? 'true' : 'false'}" class="w-opt ${on ? 'on' : ''}" data-act="sv-opt" data-q="${q.id}" data-n="${n}"><i>${on ? icon('check', 14) : ''}</i><span>${loc(api, o)}</span></button>`; })}</div><small class="w-sub">${t('w.sv.multiHint')}</small>`
              : html`<div class="w-opts ${q.type === 'bool' ? 'two' : ''}">${q.options.map((o, n) => html`<button type="button" role="radio" aria-checked="${a === n ? 'true' : 'false'}" class="w-opt ${a === n ? 'on' : ''}" data-act="sv-opt" data-q="${q.id}" data-n="${n}"><i>${a === n ? icon('check', 14) : ''}</i><span>${loc(api, o)}</span></button>`)}</div>`}
            ${er ? html`<small class="w-err" data-err="${q.id}">${t('w.sv.e.' + er)}</small>` : ''}</section>`; })}
        </div>
        <footer class="w-foot w-two"><button type="button" class="w-btn ghost" data-act="sv-draft">${t('w.sv.saveDraft')}</button><button type="button" class="w-btn primary" data-act="sv-submit">${t('w.sv.submit')}</button></footer>`;
    }

    function detail(api) {
      const { t, html, icon, header } = api; const s = sv.get(api.cur().id); const r = s && sv.responseOf(s.id, me());
      if (!s || !r) return html`${header(t('w.sv.detail'))}<div class="w-body"><div class="w-empty">${icon('clip', 40)}<p>${t('w.sv.unavailable')}</p></div></div>`;
      return html`
        ${header(t('w.sv.detail'))}
        <div class="w-body">
          <section class="w-card"><div class="w-rec-top"><b>${loc(api, s)}</b><span class="w-tag approved">${t('w.sv.submitted')}</span></div><p class="w-pssub">${t('w.sv.submittedAt', { d: r.submittedAt.replace('T', ' ') })}</p></section>
          <p class="w-note info">${icon('shield', 16)} ${t('w.sv.readonly')}</p>
          ${s.questions.map((q, i) => { const a = sv.answerText(q, r.answers[q.id], api.lang); return html`<section class="w-card w-q"><h3>${i + 1}. ${loc(api, q)}</h3><p class="w-ans">${a || html`<i class="w-sub">${t('w.sv.blank')}</i>`}</p></section>`; })}
        </div>`;
    }

    function start(api, id) {
      const d = sv.draftOf(me(), id); P.id = id; P.answers = d ? JSON.parse(JSON.stringify(d.answers)) : {}; P.errs = {}; api.push('sv-fill');
    }

    return {
      stores: [sv],
      screens: { sv: list, 'sv-fill': fill, 'sv-detail': detail },
      init(api) { api.root.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.sva) { P.answers[el.dataset.sva] = el.value; if (P.errs[el.dataset.sva]) { delete P.errs[el.dataset.sva]; const c = el.closest('.w-q'); if (c) { c.classList.remove('err'); const x = c.querySelector('.w-err'); if (x) x.remove(); } } } }); },
      onClick(a, b, api) {
        switch (a) {
          case 'open-sv': P.tab = 'pending'; api.go([{ s: 'home' }, { s: 'sv' }]); return true;
          case 'sv-tab': P.tab = b.dataset.v; api.render(); return true;
          case 'sv-start': start(api, b.dataset.id); return true;
          case 'sv-open': api.W.banner = null; api.push('sv-detail', { id: b.dataset.id }); return true;
          case 'sv-opt': {
            const s = sv.get(P.id), q = s.questions.find((x) => x.id === b.dataset.q), n = +b.dataset.n; delete P.errs[q.id];
            if (q.type === 'multi') { const cur = Array.isArray(P.answers[q.id]) ? P.answers[q.id] : []; P.answers[q.id] = cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n].sort(); } else P.answers[q.id] = n;
            api.render(); return true;
          }
          case 'sv-draft': sv.saveDraft(me(), P.id, P.answers); api.toast(api.t('w.sv.toast.draft'), 'ok'); return true;
          case 'sv-submit': {
            const r = sv.submit(me(), P.id, P.answers);
            if (!r.ok) {
              if (r.errors) { P.errs = r.errors; api.render(); const f = api.root.querySelector('.w-q.err'); if (f) f.scrollIntoView({ block: 'center' }); api.toast(api.t('w.sv.e.fix'), 'warn'); }
              else { api.toast(api.t('w.sv.e.' + (r.error || 'closed')), 'warn'); api.go([{ s: 'home' }, { s: 'sv' }]); }
              return true;
            }
            api.go([{ s: 'home' }, { s: 'sv' }, { s: 'sv-detail', id: P.id }]); api.toast(api.t('w.sv.toast.submitted'), 'ok'); return true;
          }
        }
        return false;
      },
      onStore(evt, api) {
        if (evt.type === 'published') { const s = sv.get(evt.id); if (s && sv.inAudience(s, me())) { api.showBanner({ kind: 'info', act: 'open-sv', title: api.t('w.sv.nt'), msg: loc(api, s) }); return; } }
        if (evt.type === 'draft') return;
        api.render();
      },
    };
  })());
})(window.BS);
