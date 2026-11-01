/* Admin module: 报销审核 (list / detail / approve / reject). */
(function (BS) {
  const { html, icon, fmt, store } = BS;
  const PAGE = 10;
  const EMPTY = { kw: '', type: '', status: '', from: '', to: '' };

  BS.registerAdmin({
    id: 'reimb', nav: 'a.nav.reimb', stores: [store],
    tabs: [{ id: 'review', k: 'a.nav.reimb' }],
    create(ctx) {
    const A = { get lang() { return ctx.lang(); }, view: 'list', id: null, draft: { ...EMPTY }, applied: { ...EMPTY }, page: 1, modal: null };
    const t = ctx.t;
    const nameOf = (c) => (A.lang === 'zh' ? c.applicant.name : c.applicant.nameEn || c.applicant.name);
    const typeS = (k) => t('type.s.' + k);
    const tag = (s) => html`<span class="a-tag ${s}">${t('a.status.' + s)}</span>`;

    function filtered() {
      const f = A.applied; const kw = f.kw.trim().toLowerCase();
      return BS.perm.scoped(store.all(), (c) => c.applicant.empNo).filter((c) => {
        if (kw && !(c.applicant.name.toLowerCase().includes(kw) || (c.applicant.nameEn || '').toLowerCase().includes(kw) || c.applicant.empNo.toLowerCase().includes(kw) || c.id.toLowerCase().includes(kw))) return false;
        if (f.type && c.type !== f.type) return false;
        if (f.status && c.status !== f.status) return false;
        const d = c.submittedAt.slice(0, 10);
        if (f.from && d < f.from) return false;
        if (f.to && d > f.to) return false;
        return true;
      }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    }

    // ---------- pages ----------
    function listPage() {
      const rows = filtered(); const pages = Math.max(1, Math.ceil(rows.length / PAGE));
      if (A.page > pages) A.page = pages;
      const slice = rows.slice((A.page - 1) * PAGE, A.page * PAGE);
      const d = A.draft;
      const pending = BS.perm.scoped(store.all(), (c) => c.applicant.empNo).filter((c) => c.status === 'pending').length;
      return html`
        <h1 class="a-h1">${t('a.title')}</h1>
        <p class="a-sub">${t('a.sub')} <span class="a-pend">${t('a.pendingN', { n: pending })}</span></p>
        <section class="a-card">
          <form class="a-filters" data-role="filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('a.f.kw')}" aria-label="${t('a.f.kw')}"></label>
            <label class="a-in"><select data-f="type" aria-label="${t('a.col.type')}"><option value="">${t('a.f.type')}</option>${store.TYPES.map((k) => html`<option value="${k}" ${d.type === k ? 'selected' : ''}>${typeS(k)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('a.col.status')}"><option value="">${t('a.f.status')}</option>${['pending', 'approved', 'rejected', 'withdrawn'].map((k) => html`<option value="${k}" ${d.status === k ? 'selected' : ''}>${t('a.status.' + k)}</option>`)}</select></label>
            <span class="a-in a-range"><input type="date" data-f="from" value="${d.from}" aria-label="${t('a.f.from')}"><i>–</i><input type="date" data-f="to" value="${d.to}" aria-label="${t('a.f.to')}"></span>
            <span class="a-fgrow"></span>
            <button type="button" class="a-btn" data-act="reset">${t('a.f.reset')}</button>
            <button type="submit" class="a-btn primary">${t('a.f.query')}</button>
          </form>
          <div class="a-tablewrap"><table class="a-table">
            <thead><tr>${['applicant', 'emp', 'id', 'type', 'amount', 'note', 'files', 'at', 'status'].map((k) => html`<th class="c-${k}">${t('a.col.' + k)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((c) => html`
              <tr>
                <td class="c-applicant"><b>${nameOf(c)}</b></td><td class="c-emp mute">${c.applicant.empNo}</td><td class="c-id mute">${c.id}</td>
                <td class="c-type">${typeS(c.type)}</td><td class="c-amount"><b>${fmt.moneyNum(c.amountCents)}</b></td>
                <td class="c-note" title="${c.note}">${c.note || '—'}</td><td class="c-files">${c.files.length}</td>
                <td class="c-at mute">${fmt.dt(c.submittedAt)}</td><td class="c-status">${tag(c.status)}</td>
                <td class="c-act"><button type="button" class="a-link" data-act="detail" data-id="${c.id}">${t('a.act.detail')}</button>${c.status === 'pending' ? html`<button type="button" class="a-link ok" data-act="approve" data-id="${c.id}">${t('a.act.approve')}</button><button type="button" class="a-link bad" data-act="reject" data-id="${c.id}">${t('a.act.reject')}</button>` : ''}</td>
              </tr>`) : html`<tr><td colspan="10" class="a-none">${icon('receipt', 32)}<p>${t('a.none')}</p></td></tr>`}</tbody>
          </table></div>
          <footer class="a-pager"><span>${t('a.total', { n: rows.length })} · ${t('a.perPage', { n: PAGE })}</span>
            <nav aria-label="${t('a.pager')}"><button type="button" data-act="page" data-p="${A.page - 1}" ${A.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
            ${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${A.page === i + 1 ? 'on' : ''}" data-act="page" data-p="${i + 1}" aria-current="${A.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`)}
            <button type="button" data-act="page" data-p="${A.page + 1}" ${A.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
        </section>`;
    }

    function detailPage() {
      const c = store.get(A.id);
      if (!c) return html`<button type="button" class="a-btn" data-act="list">${icon('back', 16)} ${t('a.back')}</button><p class="a-none">${t('a.missing')}</p>`;
      const rv = c.review;
      const events = c.log.map((l) => ({
        k: l.type, at: l.at, text: l.text,
        title: l.type === 'submitted' ? t('a.log.submitted') : l.type === 'approved' ? t('a.log.approved') : l.type === 'rejected' ? t('a.log.rejected') : t('a.log.withdrawn'),
        who: l.type === 'submitted' || l.type === 'withdrawn' ? nameOf(c) : t('a.admin'),
      }));
      return html`
        <div class="a-dhead"><button type="button" class="a-btn" data-act="list">${icon('back', 16)} ${t('a.back')}</button>
          <div><h1 class="a-h1">${t('a.d.title')}</h1><p class="a-sub">${t('a.d.id')} ${c.id}</p></div>${tag(c.status)}</div>
        <div class="a-dgrid">
          <div class="a-dcol">
            <section class="a-card a-pad"><h2 class="a-h2">${icon('user', 18)} ${t('a.d.applicant')}</h2>
              <dl class="a-dl"><div><dt>${t('a.d.name')}</dt><dd>${nameOf(c)}</dd></div><div><dt>${t('a.d.emp')}</dt><dd>${c.applicant.empNo}</dd></div><div><dt>${t('a.d.project')}</dt><dd>${A.lang === 'zh' ? c.applicant.project : c.applicant.projectEn || c.applicant.project}</dd></div></dl></section>
            <section class="a-card a-pad"><h2 class="a-h2">${icon('receipt', 18)} ${t('a.d.submit')}</h2>
              <dl class="a-dl"><div><dt>${t('a.d.id')}</dt><dd>${c.id}</dd></div><div><dt>${t('a.col.type')}</dt><dd>${typeS(c.type)}</dd></div><div><dt>${t('a.d.amount')}</dt><dd class="amt">${fmt.money(c.amountCents)}</dd></div>
              <div class="wide"><dt>${t('a.d.receipts')} (${c.files.length})</dt><dd><div class="a-files">${c.files.map((f) => html`
                <button type="button" class="a-file" data-act="view-file" data-fid="${f.id}" title="${f.name}"><span class="a-file-ic">${f.kind === 'image' ? html`<img alt="" src="${f.src || BS.receiptArt(typeS(c.type), c.amountCents, c.id + f.name)}">` : icon('file', 22)}</span><span><b>${f.name}</b><small>${fmt.size(f.size)} · ${f.kind === 'image' ? t('a.d.image') : 'PDF'}</small></span></button>`)}</div></dd></div>
              <div class="wide"><dt>${t('a.col.note')}</dt><dd>${c.note || '—'}</dd></div><div><dt>${t('a.col.at')}</dt><dd>${fmt.dt(c.submittedAt)}</dd></div><div><dt>${t('a.col.status')}</dt><dd>${tag(c.status)}</dd></div>
              ${c.resubmitOf ? html`<div class="wide"><dt>${t('a.d.resub')}</dt><dd>${c.resubmitOf}</dd></div>` : ''}</dl></section>
          </div>
          <aside class="a-dcol">
            <section class="a-card a-pad"><h2 class="a-h2">${icon('clock', 18)} ${t('a.d.log')}</h2>
              <ol class="a-tl">${events.map((e) => html`<li class="${e.k}"><i></i><div><b>${e.title}</b><small>${e.who} · ${fmt.dt(e.at)}</small>${e.text ? html`<p class="${e.k === 'rejected' ? 'bad' : ''}">${e.k === 'rejected' ? t('a.d.reason') + '：' : t('a.d.comment') + '：'}${e.text}</p>` : ''}</div></li>`)}
              ${c.status === 'pending' ? html`<li class="now"><i></i><div><b>${t('a.log.wait')}</b><small>${t('a.log.cur')}</small></div></li>` : ''}</ol></section>
            ${c.status === 'pending' ? html`<div class="a-actions"><button type="button" class="a-btn bad-o" data-act="reject" data-id="${c.id}">${t('a.act.reject')}</button><button type="button" class="a-btn primary" data-act="approve" data-id="${c.id}">${t('a.act.pass')}</button></div>`
              : html`<p class="a-closed">${icon(c.status === 'approved' ? 'check' : 'warn', 16)} ${t('a.d.closed', { s: t('a.status.' + c.status) })}</p>`}
          </aside>
        </div>`;
    }

    function modalView() {
      const m = A.modal; if (!m) return '';
      const c = store.get(m.id); if (!c) return '';
      const summary = html`<dl class="a-sum"><div><dt>${t('a.d.name')}</dt><dd>${nameOf(c)}</dd></div><div><dt>${t('a.d.id')}</dt><dd>${c.id}</dd></div><div><dt>${t('a.col.type')}</dt><dd>${typeS(c.type)}</dd></div><div><dt>${t('a.d.amount')}</dt><dd>${fmt.money(c.amountCents)}</dd></div><div><dt>${t('a.col.at')}</dt><dd>${fmt.dt(c.submittedAt)}</dd></div><div><dt>${t('a.col.status')}</dt><dd>${tag(c.status)}</dd></div></dl>`;
      const rej = m.k === 'reject';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${rej ? t('a.m.rejectTitle') : t('a.m.approveTitle')}</h2><p>${rej ? t('a.m.rejectSub') : t('a.m.approveSub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><h3>${icon('receipt', 16)} ${t('a.m.summary')}</h3>${summary}
          <label class="a-lab" for="a-txt">${rej ? html`<b class="req">*</b> ${t('a.m.reason')}` : t('a.m.comment')}</label>
          <textarea id="a-txt" data-role="txt" maxlength="200" rows="4" placeholder="${rej ? t('a.m.reasonPh') : t('a.m.commentPh')}">${m.text}</textarea>
          <div class="a-hint"><span class="${m.err ? 'bad' : ''}">${m.err ? t(m.err) : rej ? t('a.m.reasonHint') : t('a.m.commentHint')}</span><span data-role="count">${m.text.length} / 200</span></div>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn ${rej ? 'bad' : 'primary'}" data-act="confirm-modal">${rej ? t('a.m.confirmReject') : t('a.m.confirmApprove')}</button></footer>
      </div></div>`;
    }
    const render = ctx.rerender, toast = ctx.toast;

    function openModal(k, id) {
      const c = store.get(id); if (!c) return;
      if (c.status !== 'pending') { toast(t('a.toast.notPending', { s: t('a.status.' + c.status) }), 'warn'); render(); return; }
      A.modal = { k, id, text: k === 'approve' ? t('a.m.defaultComment') : '', err: null };
      render();
    }
    function confirmModal() {
      const m = A.modal; if (!m) return;
      const r = store.review(m.id, m.k, m.k === 'reject' ? { reason: m.text } : { comment: m.text });
      if (!r.ok) {
        if (r.error === 'reason_required') { m.err = 'a.m.reasonReq'; render(); const x = ctx.view().querySelector('#a-txt'); if (x) x.focus(); return; }
        A.modal = null; toast(t('a.toast.notPending', { s: t('a.status.' + (r.status || 'withdrawn')) }), 'warn'); render(); return;
      }
      A.modal = null; render();
      toast(t(m.k === 'approve' ? 'a.toast.approved' : 'a.toast.rejected', { id: m.id }), 'ok');
    }

    return {
      tab: 'review',
      crumbs() { return A.view === 'detail' ? [{ text: t('a.nav.reimb'), act: 'list' }, { text: t('a.d.title') }] : [{ text: t('a.nav.reimb') }]; },
      page() { return A.view === 'detail' ? detailPage() : listPage(); },
      modal: modalView,
      afterRender() {
        if (A.modal) { const x = ctx.view().querySelector('#a-txt'); if (x && !A.modal.focused) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); A.modal.focused = true; } }
      },
      onInput(e) {
        const el = e.target; const view = ctx.view();
        if (el.dataset.f) A.draft[el.dataset.f] = el.value;
        else if (el.dataset.role === 'txt' && A.modal) {
          A.modal.text = el.value; A.modal.err = null;
          const cnt = view.querySelector('[data-role=count]'); if (cnt) cnt.textContent = `${el.value.length} / 200`;
          const h = view.querySelector('.a-hint > span:first-child'); if (h && h.classList.contains('bad')) { h.classList.remove('bad'); h.textContent = A.modal.k === 'reject' ? t('a.m.reasonHint') : t('a.m.commentHint'); }
        }
      },
      onSubmit() { A.applied = { ...A.draft }; A.page = 1; render(); },
      onEscape() { if (A.modal) { A.modal = null; render(); return true; } return false; },
      onClick(a, b) {
        const id = b.dataset.id;
        switch (a) {
          case 'reset': A.draft = { ...EMPTY }; A.applied = { ...EMPTY }; A.page = 1; render(); break;
          case 'page': { const p = +b.dataset.p; if (p >= 1) { A.page = p; render(); } break; }
          case 'detail': A.view = 'detail'; A.id = id; render(); ctx.scrollTop0(); break;
          case 'list': A.view = 'list'; A.id = null; render(); break;
          case 'approve': openModal('approve', id); break;
          case 'reject': openModal('reject', id); break;
          case 'close-modal': A.modal = null; render(); break;
          case 'confirm-modal': confirmModal(); break;
          case 'view-file': { const c = store.get(A.id); const f = c && c.files.find((x) => x.id === b.dataset.fid); if (f) BS.openReceipt(ctx.host, f, { type: c.type, amountCents: c.amountCents, id: c.id }, A.lang); break; }
          default: return false;
        }
        return true;
      },
      onStore(evt) {
        if (A.modal && !store.get(A.modal.id)) A.modal = null;
        // a claim withdrawn/decided elsewhere while a dialog is open: dialog stays; confirm re-checks status
        render();
        if (evt.type === 'created') { const c = store.get(evt.id); if (c) toast(t('a.toast.new', { name: nameOf(c), id: c.id }), 'ok'); }
        if (evt.type === 'withdrawn') toast(t('a.toast.withdrawn', { id: evt.id }), 'warn');
      },
      reset() { A.view = 'list'; A.id = null; A.modal = null; A.draft = { ...EMPTY }; A.applied = { ...EMPTY }; A.page = 1; },
    };
    },
  });
})(window.BS);
