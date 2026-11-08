/* Worker app: 课程 — browse and search the courses (Course Atlas snapshot), a map of training centres, courses that renew the worker's expiring certificates,
   a shortlist, and "ask my employer" (an enrolment request the employer approves or declines). The worker never registers or pays by themself. */
(function (BS) {
  const tr = BS.train, hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const P = { tab: 'me', kw: '', lang: '', sel: '', groupId: '', intakeId: '', note: '', mine: true, err: '' };
    const money = (n) => 'S$ ' + Number(n).toFixed(2);
    const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
    const TAG = { asked: 'pending', requested: 'pending', registered: 'pending', confirmed: 'approved', completed: 'approved', declined: 'rejected', cancelled: 'withdrawn' };
    let apiRef = null;

    const langName = (t, l) => (l ? t('trn.lang.' + l) : t('trn.lang.none'));
    const span = (i) => (i.d.length > 1 ? `${i.d[0]} → ${i.d[i.d.length - 1]}` : i.d[0]);
    function feeText(api, i) { return i.f == null ? api.t('trn.fee.none') : money(i.f) + (i.gst === 'excluded' ? ' ' + api.t('trn.fee.exGst') : ''); }
    const myLang = () => { const e = hr.emp(me()); return e ? tr.languageFor(e) : 'English'; };

    function seg(api) {
      const { t, html } = api;
      return html`<div class="w-seg w-trn-seg" role="tablist">${[['me', 'w.trn.tab.me'], ['browse', 'w.trn.tab.browse'], ['map', 'w.trn.tab.map'], ['saved', 'w.trn.tab.saved']].map(([k, key]) => html`<button type="button" role="tab" class="${P.tab === k ? 'on' : ''}" aria-selected="${P.tab === k ? 'true' : 'false'}" data-act="trn-tab" data-k="${k}">${t(key)}${k === 'saved' && tr.shortlist(me()).length ? html` <i>${tr.shortlist(me()).length}</i>` : ''}</button>`)}</div>`;
    }
    const emptyBox = (api, text) => api.html`<div class="w-empty">${api.icon('cap', 40)}<p>${text}</p></div>`;

    function intakeLine(api, i) {
      const { t, html, icon } = api;
      return html`<small class="w-trn-meta">${icon('cal', 12)} ${span(i)} · ${tr.providerName(i.p)}</small><small class="w-trn-meta">${langName(t, i.l)} · ${feeText(api, i)}</small>`;
    }
    function courseCard(api, g, intakes, extra) {
      const { t, html, icon } = api; const next = intakes[0]; const fees = tr.feeRange(intakes);
      return html`<button type="button" class="w-card w-trn-card" data-act="trn-open" data-g="${g.id}" data-course="${g.id}">
        <div class="w-trn-top">${g.cert ? html`<span class="w-tag approved">${t('trn.renews', { c: t('trn.certName.' + g.cert) })}</span>` : ''}${extra || ''}<span class="w-trn-n">${t('w.trn.intakes', { n: intakes.length })}</span></div>
        <b>${g.title}</b>
        ${next ? html`<small class="w-trn-meta">${icon('cal', 12)} ${t('trn.next')}: ${span(next)}</small><small class="w-trn-meta">${tr.providerName(next.p)} · ${fees ? (fees[0] === fees[1] ? money(fees[0]) : money(fees[0]) + ' – ' + money(fees[1])) : t('trn.fee.none')}</small>` : ''}${icon('right', 18)}</button>`;
    }

    // ---------- the main screen ----------
    function meTab(api) {
      const { t, html, icon } = api; const sug = tr.suggestFor(me()); const reqs = tr.asksOf(me());
      return html`
        <div class="w-sec"><h2>${t('w.trn.renew')}</h2><span>${t('w.trn.renewSub')}</span></div>
        ${sug.length ? sug.map((s) => html`<button type="button" class="w-card w-trn-card sug ${s.why}" data-act="trn-open" data-g="${s.group.id}" data-i="${s.intake.id}" data-sug="${s.cert}">
          <div class="w-trn-top"><span class="w-tag ${s.why === 'soon' ? 'pending' : 'rejected'}">${t('w.trn.why.' + s.why, { c: t('trn.certName.' + s.cert) })}</span><span class="w-trn-n">${t('w.trn.intakes', { n: s.count })}</span></div>
          <b>${s.group.title}</b>${intakeLine(api, s.intake)}<small class="w-trn-meta">${s.intake.v || t('trn.novenue')}</small>${icon('right', 18)}</button>`)
          : html`<div class="w-card w-trn-ok">${icon('check', 18)} <span>${t('w.trn.upToDate')}</span></div>`}
        <div class="w-sec"><h2>${t('w.trn.myReq')}</h2></div>
        ${reqs.length ? reqs.map((r) => html`<div class="w-card w-trn-req" data-req="${r.id}"><div class="w-trn-top"><span class="w-tag ${TAG[r.status]}">${t('w.trn.st.' + r.status)}</span><small>${r.id}</small></div><b>${r.title}</b>
          <small class="w-trn-meta">${icon('cal', 12)} ${r.dates.length > 1 ? `${r.start} → ${r.end}` : r.start} · ${r.provider}</small><small class="w-trn-meta">${r.venue || t('trn.novenue')}</small>
          <p class="w-trn-say">${t('w.trn.say.' + r.status, { v: r.venue || r.provider, d: r.start })}</p>
          ${r.status === 'declined' ? html`<p class="w-trn-why">${icon('warn', 14)} ${(r.log.slice().reverse().find((l) => l.type === 'declined') || {}).note || ''}</p>` : ''}
          ${r.status === 'asked' && r.askedBy === me() ? html`<button type="button" class="w-btn ghost" data-act="trn-withdraw" data-id="${r.id}">${t('w.trn.withdraw')}</button>` : ''}</div>`) : emptyBox(api, t('w.trn.noReq'))}`;
    }
    function browseTab(api) {
      const { t, html, icon } = api; const f = { kw: P.kw, lang: P.lang }; const list = tr.catalogue(f).slice(0, 40); const total = tr.catalogue(f).length;
      return html`
        <label class="w-input w-trn-search">${icon('search', 16)}<input data-trn="kw" value="${P.kw}" placeholder="${t('w.trn.search')}" aria-label="${t('w.trn.search')}" autocomplete="off"></label>
        ${langChips(api)}
        ${list.length ? list.map((e) => courseCard(api, e.group, e.intakes)) : emptyBox(api, t('trn.none'))}
        ${total > list.length ? html`<p class="w-note">${t('w.trn.more', { n: total - list.length })}</p>` : ''}`;
    }
    function langChips(api) {
      const { t, html } = api; const langs = tr.languages();
      return html`<div class="w-trn-chips" role="group" aria-label="${t('trn.f.lang')}"><button type="button" class="${!P.lang ? 'on' : ''}" data-act="trn-lang" data-l="">${t('dep.f.all')}</button>${langs.map((l) => html`<button type="button" class="${P.lang === l ? 'on' : ''}" data-act="trn-lang" data-l="${l}">${langName(t, l)}${tr.sameLang(l, myLang()) ? ' ★' : ''}</button>`)}</div>`;
    }
    function mapTab(api) {
      const { t, html, icon } = api; const list = tr.intakes({ lang: P.lang }); const mp = tr.mapPlaces(list); const places = mp.places.sort((a, b) => b.count - a.count); const sel = P.sel && places.find((x) => x.loc.id === P.sel);
      const here = sel ? list.filter((i) => i.loc === P.sel).slice(0, 8) : [];
      setTimeout(() => mountMap(api), 0);
      return html`
        ${langChips(api)}
        <div class="w-trn-map" data-map-slot="train-w" aria-label="${t('trn.map.title')}"></div>
        <p class="w-note">${icon('pin', 14)} ${t('w.trn.mapNote', { p: places.length, u: mp.unmapped })}</p>
        ${sel ? html`<section class="w-card w-trn-loc" data-role="locdet"><b>${sel.loc.name}</b><small class="w-trn-meta">${sel.loc.address || ''}</small>
          ${here.map((i) => html`<button type="button" class="w-trn-row" data-act="trn-open" data-g="${i.g}" data-i="${i.id}"><span><b>${(tr.group(i.g) || {}).title || i.t}</b><small class="w-trn-meta">${span(i)} · ${langName(t, i.l)} · ${feeText(api, i)}</small></span>${icon('right', 16)}</button>`)}</section>`
          : html`<p class="w-note">${t('w.trn.pickCentre')}</p>`}
        <div class="w-sec"><h2>${t('trn.map.list')}</h2></div>
        ${places.slice(0, 12).map(({ loc, count }) => html`<button type="button" class="w-card w-trn-card loc ${P.sel === loc.id ? 'sel' : ''}" data-act="trn-loc" data-id="${loc.id}"><div class="w-trn-top"><span class="w-trn-n">${t('w.trn.intakes', { n: count })}</span></div><b>${loc.name}</b><small class="w-trn-meta">${loc.address || ''}</small></button>`)}`;
    }
    function mountMap(api) {
      const host = api.root.querySelector('[data-map-slot=train-w]'); if (!host) return; const s = BS.map.slot('train-w'); s.mount(host);
      const list = tr.intakes({ lang: P.lang }); const mp = tr.mapPlaces(list);
      s.set({ pins: mp.places.map(({ loc, count }) => ({ id: loc.id, kind: 'centre', lat: loc.lat, lng: loc.lng, count, label: `${loc.name} · ${api.t('w.trn.intakes', { n: count })}`, selected: loc.id === P.sel })), lines: [], lang: api.lang, fitText: api.t('dm.map.fit'), fitKey: mp.places.map((x) => x.loc.id).join(',') + '|' + P.lang,
        legend: [{ cls: 'centre', text: api.t('trn.map.leg') }], onSelect: (ids) => { P.sel = ids[0]; api.render(); } });
    }
    function savedTab(api) {
      const { t, html, icon } = api; const ids = tr.shortlist(me()); const items = ids.map((id) => ({ g: tr.group(id), list: tr.intakes({ groupId: id }) })).filter((x) => x.g);
      return html`${items.length ? items.map(({ g, list }) => html`<div class="w-card w-trn-saved" data-saved="${g.id}"><b>${g.title}</b>
        ${list[0] ? html`<small class="w-trn-meta">${t('trn.next')}: ${span(list[0])} · ${tr.providerName(list[0].p)} · ${feeText(api, list[0])}</small>` : html`<small class="w-trn-meta">${t('trn.noIntake')}</small>`}
        <div class="w-btns"><button type="button" class="w-btn ghost" data-act="trn-open" data-g="${g.id}">${t('w.trn.details')}</button>${list[0] ? html`<button type="button" class="w-btn primary" data-act="trn-askopen" data-i="${list[0].id}">${t('w.trn.ask')}</button>` : ''}</div>
        <button type="button" class="w-trn-unsave" data-act="trn-save" data-g="${g.id}">${icon('x', 14)} ${t('w.trn.unsave')}</button></div>`) : emptyBox(api, t('w.trn.noSaved'))}`;
    }
    function main(api) {
      const { t, html, header } = api;
      return html`${header(t('w.trn.title'))}<div class="w-body w-trn">${seg(api)}${{ me: meTab, browse: browseTab, map: mapTab, saved: savedTab }[P.tab](api)}</div>`;
    }

    // ---------- a course ----------
    function course(api) {
      const { t, html, icon, header } = api; const g = tr.group(P.groupId); if (!g) return html`${header(t('w.trn.title'))}<div class="w-body">${emptyBox(api, t('trn.none'))}</div>`;
      const all = tr.intakes({ groupId: g.id }); const lang = myLang(); const list = (P.mine ? all.filter((i) => tr.sameLang(i.l, lang)) : all).slice(0, 15); const saved = tr.shortlist(me()).includes(g.id); const fees = tr.feeRange(all);
      const open = tr.asksOf(me()).find((r) => ['asked', 'requested', 'registered', 'confirmed'].includes(r.status) && r.groupId === g.id && r.end >= BS.fmt.now().slice(0, 10));
      return html`
        ${header(g.title, { right: html`<button type="button" class="w-heart ${saved ? 'on' : ''}" data-act="trn-save" data-g="${g.id}" aria-pressed="${saved ? 'true' : 'false'}" aria-label="${t(saved ? 'w.trn.unsave' : 'w.trn.save')}">${icon('star', 20)}</button>` })}
        <div class="w-body w-trn">
          <section class="w-card w-trn-sum">${g.cert ? html`<span class="w-tag approved">${t('trn.renews', { c: t('trn.certName.' + g.cert) })}</span>` : ''}<b>${g.title}</b>${g.alias ? html`<small class="w-trn-meta">${g.alias}</small>` : ''}
            <small class="w-trn-meta">${t('w.trn.intakes', { n: all.length })} · ${fees ? (fees[0] === fees[1] ? money(fees[0]) : money(fees[0]) + ' – ' + money(fees[1])) : t('trn.fee.none')}</small></section>
          ${open ? html`<p class="w-note info">${icon('check', 16)} ${t('w.trn.alreadyAsked', { s: t('w.trn.st.' + open.status) })}</p>` : ''}
          <div class="w-trn-chips" role="group"><button type="button" class="${P.mine ? 'on' : ''}" data-act="trn-mine" data-v="1">${t('w.trn.myLang', { l: langName(t, lang) })}</button><button type="button" class="${!P.mine ? 'on' : ''}" data-act="trn-mine" data-v="">${t('dep.f.all')}</button></div>
          ${list.length ? list.map((i) => html`<div class="w-card w-trn-int" data-intake="${i.id}"><div class="w-trn-top"><b>${icon('cal', 13)} ${span(i)}</b>${i.a === 'available' ? html`<span class="w-tag approved">${t('trn.avail.yes')}</span>` : html`<span class="w-tag withdrawn">${t('trn.avail.unknown')}</span>`}</div>
            <small class="w-trn-meta">${tr.providerName(i.p)} · ${langName(t, i.l)}${i.tm ? ' · ' + i.tm : ''}</small><small class="w-trn-meta">${icon('pin', 12)} ${i.v || t('trn.novenue')}</small><small class="w-trn-fee">${feeText(api, i)}</small>
            <div class="w-btns">${safeUrl(i.u) ? html`<a class="w-btn ghost" href="${i.u}" target="_blank" rel="noopener noreferrer">${t('trn.provider')} ↗</a>` : ''}${open ? '' : html`<button type="button" class="w-btn primary" data-act="trn-askopen" data-i="${i.id}">${t('w.trn.ask')}</button>`}</div></div>`)
            : emptyBox(api, t(P.mine ? 'w.trn.noMine' : 'trn.noIntake'))}
          ${all.length > list.length && !P.mine ? html`<p class="w-note">${t('trn.moreIntakes', { n: all.length - list.length })}</p>` : ''}
        </div>`;
    }

    // ---------- ask the employer ----------
    function ask(api) {
      const { t, html, icon, header } = api; const i = tr.intake(P.intakeId); if (!i) return html`${header(t('w.trn.askTitle'))}<div class="w-body">${emptyBox(api, t('trn.t.stale'))}</div>`;
      const g = tr.group(i.g) || { title: i.t }; const cl = tr.clashes(me(), i.d); const hard = cl.some((c) => c.kind === 'training');
      return html`
        ${header(t('w.trn.askTitle'))}
        <div class="w-body w-trn w-form">
          <section class="w-card w-trn-sum"><b>${g.title}</b><small class="w-trn-meta">${icon('cal', 12)} ${span(i)}${i.tm ? ' · ' + i.tm : ''}</small><small class="w-trn-meta">${tr.providerName(i.p)} · ${langName(t, i.l)}</small><small class="w-trn-meta">${icon('pin', 12)} ${i.v || t('trn.novenue')}</small><small class="w-trn-fee">${feeText(api, i)}</small></section>
          ${cl.length ? html`<section class="w-card w-trn-clash" data-role="clash">${icon('warn', 18)}<div><b>${t(hard ? 'w.trn.clashHard' : 'w.trn.clash')}</b>${cl.map((c) => html`<small>${t('trn.ck.' + c.kind)}: ${c.kind === 'leave' ? t('trn.cl.leave', { ref: c.ref, a: c.from, b: c.to, s: t('lv.st.' + c.status) }) : c.kind === 'training' ? t('trn.cl.training', { ref: c.ref, a: c.from, b: c.to }) : t('trn.cl.permit', { ref: c.ref, a: c.from })}</small>`)}</div></section>` : ''}
          <div class="w-field ${P.err ? 'err' : ''}"><label for="w-trn-note">${t('w.trn.note')}</label><textarea id="w-trn-note" class="w-input" rows="3" maxlength="200" data-trn="note" placeholder="${t('w.trn.notePh')}">${P.note}</textarea>${P.err ? html`<small class="w-err">${t('w.trn.e.' + P.err)}</small>` : ''}</div>
          <p class="w-note info">${icon('users', 16)} ${t('w.trn.how')}</p>
          <button type="button" class="w-btn primary" data-act="trn-send" ${hard ? 'disabled' : ''}>${t('w.trn.send')}</button>
        </div>`;
    }

    return {
      stores: [tr, hr, BS.leaveReq, ...BS.modules.stores(['ptw'])],
      screens: { train: main, 'train-course': course, 'train-ask': ask },
      init(api) {
        apiRef = api;
        api.root.addEventListener('input', (e) => {
          const k = e.target.dataset && e.target.dataset.trn; if (!k) return;
          if (k === 'note') { P.note = e.target.value; return; }
          if (k === 'kw') { P.kw = e.target.value; api.render(); const i = api.root.querySelector('[data-trn=kw]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
        });
      },
      onClick(a, b, api) {
        switch (a) {
          case 'open-trn': P.tab = 'me'; api.go([{ s: 'home' }, { s: 'train' }]); return true;
          case 'trn-tab': P.tab = b.dataset.k; api.render(); return true;
          case 'trn-lang': P.lang = b.dataset.l; api.render(); return true;
          case 'trn-loc': P.sel = P.sel === b.dataset.id ? '' : b.dataset.id; api.render(); { const l = tr.location(b.dataset.id); if (P.sel && l) BS.map.slot('train-w').focus(l.lat, l.lng, 14); } return true;
          case 'trn-open': P.groupId = b.dataset.g; P.mine = true; api.push('train-course', {}); return true;
          case 'trn-mine': P.mine = !!b.dataset.v; api.render(); return true;
          case 'trn-save': { const on = tr.toggleShort(me(), b.dataset.g); api.toast(api.t(on ? 'w.trn.t.saved' : 'w.trn.t.unsaved'), 'ok'); return true; }
          case 'trn-askopen': P.intakeId = b.dataset.i; P.note = ''; P.err = ''; api.push('train-ask', {}); return true;
          case 'trn-send': {
            const r = tr.ask(me(), P.intakeId, P.note, me());
            if (!r.ok) { if (r.error === 'already') { api.toast(api.t('w.trn.e.already'), 'warn'); } else { api.toast(api.t(r.error === 'past' ? 'w.trn.e.past' : 'trn.t.stale'), 'warn'); } return true; }
            P.tab = 'me'; api.go([{ s: 'home' }, { s: 'train' }]); api.toast(api.t('w.trn.t.sent'), 'ok'); return true;
          }
          case 'trn-withdraw': { const r = tr.cancel(b.dataset.id, me()); api.toast(api.t(r.ok ? 'w.trn.t.withdrawn' : 'trn.t.stale'), r.ok ? 'ok' : 'warn'); return true; }
        }
        return false;
      },
    };
  })());
})(window.BS);
