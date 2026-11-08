/* BS.sdk: the stable face of the platform for module authors.
   A module that is written only against BS.sdk (manifest `sdkOnly: true`) keeps working when the platform inside changes: every function here looks up the real
   store at call time, so the kernel can be rearranged without touching a module. The version is BS.modules.SDK_VERSION; what is in here is listed in sdk/surface.json
   and cannot change without a version bump (tools/sdk-surface.js). Types for editors are in sdk/builtsync-sdk.d.ts. Rules and policy: docs/SDK.md. */
(function () {
  'use strict';
  const BS = window.BS; const M = BS.modules;
  /** one function that forwards to BS.<obj>.<name>, looked up when called (wrappers such as audit hooks replace methods later) */
  const fwd = (obj, name) => (...a) => BS[obj][name](...a);
  const group = (obj, names) => Object.fromEntries(names.map((n) => [n, fwd(obj, n)]));

  /** a module's own saved data: one localStorage key, a version, a seed, optional migration, change events, and sync between browser tabs */
  function createStore(opts) {
    const { key, version = 1, seed, migrate } = opts || {};
    if (typeof key !== 'string' || !/^bs_[a-z0-9]+_/.test(key)) throw new Error('createStore: key must look like bs_<module>_..., and be listed in the manifest storage');
    if (typeof seed !== 'function') throw new Error('createStore: seed() is required');
    const listeners = new Set(); let counter = 0;
    const stamp = (s) => { s.v = version; return s; };
    function load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) { const s = JSON.parse(raw); if (s && s.v === version) return s; if (s && typeof migrate === 'function' && typeof s.v === 'number' && s.v < version) { const n = migrate(s, s.v); if (n) return stamp(n); } }
      } catch (e) { /* unreadable data: start again from the seed */ }
      return stamp(seed());
    }
    let state = load();
    const emit = (evt) => { counter++; listeners.forEach((fn) => { try { fn(evt); } catch (err) { console.error(err); } }); };
    const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch (e) { return false; } };
    if (typeof window.addEventListener === 'function') window.addEventListener('storage', (e) => { if (e.key === key) { state = load(); emit({ type: 'sync' }); } });
    return {
      key,
      get state() { return state; },
      /** changes made with update() are saved and announced; change `state` any other way and call save() and emit yourself */
      update(fn, evt) { const result = fn(state); const persisted = save(); emit(evt || { type: 'update' }); return { result, persisted }; },
      save, emit,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      version: () => counter,
      reset() { state = stamp(seed()); save(); emit({ type: 'reset' }); },
    };
  }

  const sdk = {
    version: M.SDK_VERSION,
    /** safe HTML templating: html`<b>${userText}</b>` escapes every value; raw() marks trusted markup; icon(name, size) draws a built-in icon */
    ui: { html: (s, ...v) => BS.html(s, ...v), raw: (s) => BS.raw(s), esc: (s) => BS.esc(s), icon: (name, size, cls) => BS.icon(name, size, cls) },
    /** strings in both languages: define('x.y', '中文', 'English'), t(lang, 'x.y', { n: 1 }) fills {n} */
    i18n: { define: (key, zh, en) => BS.D(key, zh, en), t: (lang, key, params) => BS.t(lang, key, params) },
    /** the prototype clock, 'YYYY-MM-DDTHH:mm:ss' local time; use it instead of Date so demos and tests can agree on "now" */
    time: { now: () => BS.fmt.now(), today: () => BS.fmt.now().slice(0, 10), addDays: (d, n) => BS.hr.addDays(d, n) },
    /** people, projects, sites and certificates (read only; changes go through the Personnel module) */
    people: group('hr', ['emp', 'emps', 'project', 'projects', 'site', 'sites', 'certsOf', 'certStatus', 'certType', 'subscribe']),
    /** attendance groups (the crews) and one person's day */
    attendance: group('att', ['groups', 'group', 'groupOf', 'day', 'now', 'subscribe']),
    /** what the signed-in administrator may do: can('ptw', 'approve'), canPage('ptw'), currentAccount() */
    perm: { can: (page, op) => BS.perm.can(page, op), canPage: (page) => BS.perm.canPage(page), currentAccount: () => BS.perm.current(), currentId: () => BS.perm.currentId(), account: (id) => BS.perm.account(id), roleOf: (acct) => BS.perm.roleOf(acct), subscribe: (fn) => BS.perm.subscribe(fn) },
    /** the worker signed in on the phone: { empNo, name, nameEn } */
    me: () => BS.ME,
    /** record administrator actions in the audit log: watch(store, 'methodName', { module, type, object(args, result, before) }) */
    audit: { watch: (store, name, spec) => BS.audit.wrap(store, name, spec) },
    /** events between modules: names start with the emitting module's id ('qaqc.report.created') and are listed in its manifest */
    bus: { on: (pattern, fn) => BS.bus.on(pattern, fn), emit: (type, payload) => BS.bus.emit(type, payload) },
    /** other modules: api(id) returns their declared public API or null; extend / collect / first are extension points */
    modules: { api: (id) => M.api(id), has: (id) => M.has(id), stores: (ids) => M.stores(ids), providerStores: (point) => M.providerStores(point), extend: (point, owner, fn) => M.extend(point, owner, fn), collect: (point, ...a) => M.collect(point, ...a), first: (point, ...a) => M.first(point, ...a) },
    /** a module's own saved data (see createStore above) */
    storage: { createStore },
    /** register the module's admin page (the dashboard calls it with a context when the page is opened) */
    admin: { register: (page) => BS.registerAdmin(page) },
    /** register the module's phone screens, tile handlers and stores */
    phone: { extend: (ext) => { (BS.workerExt = BS.workerExt || []).push(ext); } },
  };

  const freeze = (o) => { Object.values(o).forEach((v) => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(o); };
  BS.sdk = freeze(sdk);
})();
