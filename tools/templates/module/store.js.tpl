// @ts-check
/* __EN__: the data and the rules, and nothing about screens. Everything else (admin page, phone screen, audit) calls these methods.
   Only BS.sdk is used from the platform. Change the fields, the rules and the seed to fit your feature; keep the shape: validate, then act, then return { ok, ... }. */
(function (BS) {
  const sdk = BS.sdk;
  const PREFIX = '__IDUP__';
  const pad = (n) => String(n).padStart(4, '0');

  function seed() {
    const pool = sdk.people.emps().filter((e) => e.status === 'active'); const me = pool.find((e) => e.empNo === sdk.me().empNo) || pool[0]; const people = [me, ...pool.filter((e) => e !== me)].slice(0, 3); const t0 = sdk.time.today();   // the first item belongs to the phone user, so the phone screen has something to show
    const mk = (n, title, who, due, status, note) => ({ id: `${PREFIX}-${pad(n)}`, title, owner: who ? who.empNo : '', due, note, status, createdBy: 'system', createdAt: t0 + 'T08:00', updatedAt: t0 + 'T08:00', doneAt: status === 'done' ? t0 + 'T09:00' : '' });
    return { n: 3, items: [mk(1, 'First example item', people[0], sdk.time.addDays(t0, 3), 'open', ''), mk(2, 'Second example item', people[1], sdk.time.addDays(t0, -1), 'open', 'Already late: shows the overdue state'), mk(3, 'A finished example item', people[2], sdk.time.addDays(t0, -2), 'done', '')] };
  }
  const store = sdk.storage.createStore({ key: 'bs___ID___proto_v1', version: 1, seed });

  /** what is wrong with this input, as { field: 'code' }; the screens turn each code into the string "__ID__.e.<code>" */
  function validate(d, existing) {
    const e = {}; const title = String(d.title || '').trim();
    if (title.length < 3 || title.length > 60) e.title = 'title';
    if (d.owner) { const p = sdk.people.emp(d.owner); if (!p || p.status !== 'active') e.owner = 'owner'; }
    const due = String(d.due || ''); if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || (due < sdk.time.today() && !(existing && existing.due === due)))) e.due = 'due';
    if (String(d.note || '').length > 200) e.note = 'note';
    return e;
  }
  const find = (id) => store.state.items.find((x) => x.id === id) || null;

  const api = {
    STATUS: ['open', 'done'],
    /** newest and most urgent first: open before done, then by due date */
    items(f = {}) {
      return store.state.items.filter((x) => (!f.status || x.status === f.status) && (!f.owner || x.owner === f.owner))
        .sort((a, b) => (a.status === b.status ? (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id) : a.status === 'open' ? -1 : 1));
    },
    item: find,
    mine(empNo) { return api.items({ owner: empNo }); },
    isLate(x) { return x.status === 'open' && !!x.due && x.due < sdk.time.today(); },
    /** how many items are still open (the public API: other modules may show this) */
    openCount(empNo) { return store.state.items.filter((x) => x.status === 'open' && (!empNo || x.owner === empNo)).length; },
    validate,
    create(d, by) {
      const e = validate(d, null); if (Object.keys(e).length) return { ok: false, errors: e };
      const item = store.update((s) => { const x = { id: `${PREFIX}-${pad(++s.n)}`, title: String(d.title).trim(), owner: d.owner || '', due: d.due || '', note: String(d.note || '').trim(), status: 'open', createdBy: by, createdAt: sdk.time.now().slice(0, 16), updatedAt: sdk.time.now().slice(0, 16), doneAt: '' }; s.items.push(x); return x; }, { type: 'created' });
      sdk.bus.emit('__ID__.item.created', { id: item.result.id }); return { ok: true, item: item.result, persisted: item.persisted };
    },
    update(id, d, by) {
      const x = find(id); if (!x) return { ok: false, error: 'missing' }; const e = validate({ ...x, ...d }, x); if (Object.keys(e).length) return { ok: false, errors: e };
      const r = store.update(() => { ['title', 'owner', 'due', 'note'].forEach((k) => { if (d[k] != null) x[k] = typeof d[k] === 'string' ? d[k].trim() : d[k]; }); x.updatedAt = sdk.time.now().slice(0, 16); x.updatedBy = by; return x; }, { type: 'updated', id });
      return { ok: true, item: r.result, persisted: r.persisted };
    },
    setStatus(id, status, by) {
      const x = find(id); if (!x) return { ok: false, error: 'missing' }; if (!api.STATUS.includes(status)) return { ok: false, error: 'status' }; if (x.status === status) return { ok: false, error: 'same' };
      const r = store.update(() => { x.status = status; x.doneAt = status === 'done' ? sdk.time.now().slice(0, 16) : ''; x.updatedAt = sdk.time.now().slice(0, 16); x.updatedBy = by; return x; }, { type: 'status', id });
      if (status === 'done') sdk.bus.emit('__ID__.item.done', { id }); return { ok: true, item: r.result, persisted: r.persisted };
    },
    remove(id) {
      const x = find(id); if (!x) return { ok: false, error: 'missing' };
      const r = store.update((s) => { s.items = s.items.filter((y) => y.id !== id); }, { type: 'removed', id }); return { ok: true, persisted: r.persisted };
    },
    subscribe: (fn) => store.subscribe(fn),
    version: () => store.version(),
    reset: () => store.reset(),
  };
  BS.__ID__ = api;
})(window.BS);
