/* The module kernel: the one place that knows which feature modules exist and what each one declares.
   A module is a folder with a manifest (`js/<id>/manifest.js`) that calls BS.modules.define({...}) with plain data: its pages, permissions, subscription entry,
   audit label, phone tiles, the files it needs and the small public API it offers. The kernel reads the manifests and wires the platform itself
   (navigation, role permissions, tenant subscription, audit, reset, files), so adding a module means adding a folder and one id in js/modules/enabled.js.
   Modules never reach into each other: they ask BS.modules.api(id) for a declared public API, or use extension points (extend / collect / first).
   Loaded first, in <head>, before core.js: it depends on nothing. See docs/MODULES.md for the contract. */
(function () {
  'use strict';
  const BS = (window.BS = window.BS || {});

  // ---------- the contract's vocabulary ----------
  /** the version of the contract (this file, the manifest fields, BS.sdk). Semantic: a removed or changed item needs a new major, an added one a new minor. See docs/SDK.md. */
  const SDK_VERSION = '1.0.0';
  /** every field a manifest may have; anything else is a typo and is refused */
  const FIELDS = ['id', 'version', 'domain', 'name', 'description', 'sdk', 'sdkOnly', 'global', 'globals', 'requires', 'uses', 'consumes', 'files', 'nav', 'permissions', 'tenant', 'audit', 'events', 'phone', 'exports', 'points', 'provides', 'storage', 'reset'];
  /** does `version` satisfy `range`? Supports ^1.2.3, 1.x and an exact 1.2.3 */
  function satisfies(version, range) {
    const [M, m, p] = String(version).split('.').map(Number); const r = String(range).trim(); let x;
    if ((x = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(r))) { const [a, b, c] = x.slice(1).map(Number); return M === a && (m > b || (m === b && p >= c)); }
    if ((x = /^(\d+)\.x$/.exec(r))) return M === +x[1];
    if ((x = /^(\d+)\.(\d+)\.(\d+)$/.exec(r))) return M === +x[1] && m === +x[2] && p === +x[3];
    return false;
  }
  const SLOTS = ['css', 'i18n', 'store', 'hooks', 'phone', 'admin'];          // when a module's files are written into the page
  const DOMAINS = ['account', 'site', 'qaqc', 'platform'];                    // the product areas a module belongs to
  const OPS = ['view', 'create', 'update', 'delete', 'export', 'approve'];
  const NAV_GROUPS = ['overview', 'people', 'timepay', 'site', 'welfare', 'engage', 'system'];
  const ROLE_CODES = ['PROJECT_ADMIN', 'FINANCE_ADMIN', 'HR_ADMIN', 'SUBCON_USER', 'MAINCON_USER'];   // SUPER_ADMIN always gets every page
  /** what a module may touch on BS freely: the platform (kernel) and the shared people / attendance data. Everything else belongs to some module. */
  const KERNEL = ['html', 'raw', 'esc', 'icon', 'D', 't', 'fmt', 'bus', 'perm', 'tenant', 'audit', 'hr', 'att', 'leaveReq', 'registerAdmin', 'adminMods', 'workerExt', 'ME', 'toast', 'modules', 'sdk', 'warnStorage', 'createAdmin', 'createWorker'];

  const defs = new Map();       // id → manifest (managed modules and adopted legacy ones)
  const mounted = new Map();    // id → { api, proxy }
  const providers = new Map();  // extension point → [{ owner, fn }]
  const problems = [];          // found while defining; check() reports them with the rest
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isStr = (v) => typeof v === 'string' && v.length > 0;
  const bilingual = (o) => !!o && isStr(o.zh) && isStr(o.en);
  const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };

  /** the shape of a manifest; returns the problems found (an empty list means it is well formed) */
  function shape(m) {
    const e = []; const at = (msg) => e.push(`${m && m.id ? m.id : '(no id)'}: ${msg}`);
    if (!m || typeof m !== 'object') return ['a manifest must be an object'];
    Object.keys(m).forEach((k) => { if (!FIELDS.includes(k)) at(`unknown field "${k}" (allowed: ${FIELDS.join(', ')})`); });
    if (!isStr(m.sdk) || !/^(\^\d+\.\d+\.\d+|\d+\.x|\d+\.\d+\.\d+)$/.test(m.sdk)) at('sdk is required: the contract version it was written for, like "^1.0.0"');
    else if (!satisfies(SDK_VERSION, m.sdk)) at(`written for sdk ${m.sdk}, but this platform has ${SDK_VERSION}`);
    if (m.sdkOnly != null && typeof m.sdkOnly !== 'boolean') at('sdkOnly must be true or false');
    if (!/^[a-z][a-z0-9]{1,15}$/.test(m.id || '')) at('id must be 2-16 lowercase letters or digits');
    if (!/^\d+\.\d+\.\d+$/.test(m.version || '')) at('version must look like 1.0.0');
    if (!DOMAINS.includes(m.domain)) at(`domain must be one of ${DOMAINS.join(', ')}`);
    if (!bilingual(m.name)) at('name needs zh and en');
    if (m.files) Object.entries(m.files).forEach(([slot, list]) => { if (!SLOTS.includes(slot)) at(`unknown file slot "${slot}"`); else if (!Array.isArray(list) || !list.every(isStr)) at(`files.${slot} must be a list of paths`); });
    else at('files is required');
    (m.requires || []).forEach((r) => { if (!isStr(r)) at('requires must be a list of module ids'); });
    Object.entries(m.uses || {}).forEach(([id, u]) => { if (!u || typeof u !== 'object') at(`uses.${id} must say why: { optional, why }`); else if (!isStr(u.why)) at(`uses.${id} needs a "why"`); });
    if (m.nav) { if (!NAV_GROUPS.includes(m.nav.group)) at(`nav.group must be one of ${NAV_GROUPS.join(', ')}`); if (!isStr(m.nav.icon) || !isStr(m.nav.label)) at('nav needs icon and label'); }
    if (m.permissions) {
      const p = m.permissions; if (!isStr(p.page)) at('permissions.page is required'); if (!Array.isArray(p.ops) || !p.ops.length || !p.ops.every((o) => OPS.includes(o))) at(`permissions.ops must be a subset of ${OPS.join(', ')}`);
      Object.entries(p.defaults || {}).forEach(([role, ops]) => { if (!ROLE_CODES.includes(role)) at(`permissions.defaults has an unknown role "${role}"`); else if (!Array.isArray(ops) || !ops.every((o) => (p.ops || []).includes(o))) at(`permissions.defaults.${role} uses an operation the page does not have`); });
      if (m.nav && !isStr(p.descKey)) at('permissions.descKey (the page description string) is required for a page with navigation');
    }
    if (m.tenant) { if (typeof m.tenant.order !== 'number') at('tenant.order must be a number'); if (typeof m.tenant.ready !== 'boolean') at('tenant.ready must be true or false'); }
    if (m.events) { if (!/^[a-z][a-z0-9]*$/.test(m.events.prefix || '')) at('events.prefix is required'); (m.events.emits || []).forEach((n) => { if (!String(n).startsWith(m.events.prefix + '.')) at(`event "${n}" must start with "${m.events.prefix}."`); }); }
    if (m.exports && !(Array.isArray(m.exports) && m.exports.every(isStr))) at('exports must be a list of method names');
    if (m.phone && m.phone.tiles) m.phone.tiles.forEach((t) => { if (!isStr(t.icon) || !isStr(t.label) || !isStr(t.act)) at('a phone tile needs icon, label and act'); });
    if (m.storage && !(Array.isArray(m.storage) && m.storage.every(isStr))) at('storage must be a list of keys');
    Object.keys(m.points || {}).forEach((p) => { if (!p.startsWith(m.id + '.')) at(`extension point "${p}" must start with "${m.id}."`); });
    (m.provides || []).forEach((p) => { if (!isStr(p)) at('provides must be a list of extension point names'); });
    return e;
  }

  /** modules in the order their files must load: a module's requirements and the modules it uses come first */
  function order() {
    const ids = [...defs.keys()].filter((id) => !defs.get(id).legacy); const out = []; const seen = new Set(); const stack = new Set();
    const visit = (id) => {
      if (seen.has(id) || !defs.has(id)) return; if (stack.has(id)) { problems.push(`${id}: circular dependency`); return; } stack.add(id); const m = defs.get(id);
      [...(m.requires || []), ...Object.keys(m.uses || {})].forEach(visit); stack.delete(id); seen.add(id); if (!defs.get(id).legacy) out.push(id);
    };
    ids.forEach(visit); return out;
  }
  const managed = () => order().map((id) => defs.get(id));

  const M = {
    SLOTS, DOMAINS, OPS, NAV_GROUPS, ROLE_CODES, KERNEL, SDK_VERSION, FIELDS, satisfies,

    // ---------- declaring ----------
    /** a manifest: plain data only. Called once per module from js/<id>/manifest.js */
    define(m) {
      const e = shape(m); e.forEach((x) => problems.push(x));
      if (m && m.id) { if (defs.has(m.id)) problems.push(`${m.id}: defined twice`); else defs.set(m.id, deepFreeze(JSON.parse(JSON.stringify(m)))); }
      return !e.length;
    },
    /** the one line to add for a new module: writes its manifest into the page, in order */
    enable(ids) { ids.forEach((id) => document.write(`<script src="js/${id}/manifest.js"><\/script>`)); },
    /** an older module that has no manifest yet: only its public API is registered, so others can use it through BS.modules.api() */
    adopt(id, spec) {
      if (defs.has(id)) return; const m = { id, version: '0.0.0', domain: spec.domain || 'platform', name: spec.name || { zh: id, en: id }, global: spec.global || id, exports: spec.exports || [], legacy: true, files: {} };
      defs.set(id, Object.freeze(m)); if (BS[m.global]) mounted.set(id, { api: BS[m.global], proxy: null });
    },

    // ---------- loading ----------
    /** writes the files of one slot, module by module in dependency order. Called from index.html while the page is still being parsed. */
    load(slot) {
      if (document.readyState !== 'loading') { problems.push(`slot ${slot} was loaded after the page was ready`); return; }
      const out = []; if (slot === 'store') out.push('<script src="js/modules/legacy.js"><\/script>');
      managed().forEach((m) => {
        ((m.files || {})[slot] || []).forEach((f) => out.push(/\.css$/.test(f) ? `<link rel="stylesheet" href="${f}">` : `<script src="${f}"><\/script>`));
        if (slot === 'store') out.push(`<script>BS.modules.mount(${JSON.stringify(m.id)})<\/script>`);
      });
      if (out.length) document.write(out.join(''));
    },
    /** called right after a module's store files: records its API object, which the manifest names with `global` */
    mount(id) {
      const m = defs.get(id); if (!m) return; const api = BS[m.global || id];
      if (!api) { problems.push(`${id}: no BS.${m.global || id} after its store files loaded`); return; }
      mounted.set(id, { api, proxy: null });
    },

    // ---------- using another module ----------
    list() { return [...defs.values()]; },
    get(id) { return defs.get(id) || null; },
    has(id) { return mounted.has(id); },
    /** the public API of another module: only the methods its manifest exports (and subscribe), or null when that module is not there. Always check for null. */
    api(id) {
      const rec = mounted.get(id); const m = defs.get(id); if (!rec || !m) return null; if (rec.proxy) return rec.proxy;
      const p = {}; [...(m.exports || []), 'subscribe'].forEach((name) => {
        if (typeof rec.api[name] === 'function') p[name] = (...a) => rec.api[name](...a);   // looked up at call time: audit wrappers replace methods
        else if (name in rec.api) Object.defineProperty(p, name, { enumerable: true, get: () => rec.api[name] });
      });
      rec.proxy = Object.freeze(p); return rec.proxy;
    },
    /** the stores of the modules that are present, for an admin page to repaint when they change (absent modules are skipped) */
    stores(ids) { return ids.map((id) => { const a = M.api(id); return a && a.subscribe ? { subscribe: (fn) => a.subscribe(fn) } : null; }).filter(Boolean); },

    /** the stores of whoever answers an extension point, so a page can repaint when its providers change without ever naming them */
    providerStores(point) { return M.stores([...new Set((providers.get(point) || []).map((x) => x.owner))]); },

    // ---------- extension points: how a module lets others add to it without knowing them ----------
    /** `owner` offers fn for the point; the module that owns the point calls collect / first */
    extend(point, owner, fn) {
      const ownerId = point.split('.')[0];   // the module that owns the point; when it is not in this build, the offer is simply never asked for
      if (defs.has(ownerId) && !hasOwn(defs.get(ownerId).points || {}, point)) problems.push(`${owner}: extends "${point}" which ${ownerId} does not declare`);
      if (!providers.has(point)) providers.set(point, []); providers.get(point).push({ owner, fn });
    },
    /** every provider's answer, flattened; a provider that throws is skipped */
    collect(point, ...args) { return (providers.get(point) || []).flatMap(({ fn }) => { try { const r = fn(...args); return Array.isArray(r) ? r : r == null ? [] : [r]; } catch (err) { console.error(err); return []; } }); },
    first(point, ...args) { return M.collect(point, ...args)[0]; },
    points() { return [...defs.values()].flatMap((m) => Object.keys(m.points || {}).map((p) => ({ point: p, owner: m.id, doc: m.points[p], providers: (providers.get(p) || []).map((x) => x.owner) }))); },

    // ---------- what the platform reads from the manifests ----------
    permPages() { return managed().filter((m) => m.permissions).map((m) => ({ id: m.permissions.page, ops: m.permissions.ops.slice(), descKey: m.permissions.descKey, scoped: !!m.permissions.scoped, defaults: m.permissions.defaults || {}, nav: m.nav ? m.nav.label : '', module: m.id })); },
    tenantModules() { return managed().filter((m) => m.tenant).map((m) => ({ id: m.id, zh: m.name.zh, en: m.name.en, ready: m.tenant.ready, order: m.tenant.order, defaultFor: m.tenant.defaultFor || [] })); },
    auditModules() { return managed().filter((m) => m.audit).map((m) => ({ id: m.audit.module, zh: m.name.zh, en: m.name.en })); },
    eventPrefixes() { return managed().filter((m) => m.events).map((m) => m.events.prefix + '.*'); },
    navItems() { return managed().filter((m) => m.nav).map((m) => ({ id: m.id, group: m.nav.group, icon: m.nav.icon, label: m.nav.label, after: m.nav.after || '' })); },
    phoneTiles() { return managed().flatMap((m) => ((m.phone || {}).tiles || []).map((t) => ({ ...t, module: m.id }))).sort((a, b) => (a.order || 0) - (b.order || 0)); },
    /** the reset button: every module that has a reset, requirements first */
    resetAll() { managed().forEach((m) => { const rec = mounted.get(m.id); if (m.reset && rec && typeof rec.api.reset === 'function') rec.api.reset(); }); },
    /** a module is switched on for the signed-in tenant (platform pages ask this; a module that is not mounted is never on) */
    active(id) { return mounted.has(id); },

    // ---------- the contract check ----------
    /** everything wrong with the modules as declared and as running. opts.runtime: look at the live platform too (false in the command-line check). */
    check(opts = {}) {
      const errors = problems.slice(); const warnings = []; const E = (m) => errors.push(m); const W = (m) => warnings.push(m);
      const all = [...defs.values()]; const managedList = all.filter((m) => !m.legacy);
      const dup = (label, vals) => { const seen = new Map(); vals.forEach(([id, v]) => { if (seen.has(v)) E(`${id}: ${label} "${v}" is also used by ${seen.get(v)}`); else seen.set(v, id); }); };
      dup('page id', managedList.filter((m) => m.permissions).map((m) => [m.id, m.permissions.page])); dup('nav label', managedList.filter((m) => m.nav).map((m) => [m.id, m.nav.label]));
      dup('storage key', managedList.flatMap((m) => (m.storage || []).map((k) => [m.id, k]))); dup('event prefix', managedList.filter((m) => m.events).map((m) => [m.id, m.events.prefix])); dup('audit module', managedList.filter((m) => m.audit).map((m) => [m.id, m.audit.module]));
      managedList.forEach((m) => {
        (m.requires || []).forEach((r) => { if (!defs.has(r)) E(`${m.id}: requires "${r}" which is not a known module`); });
        Object.keys(m.uses || {}).forEach((u) => { if (!defs.has(u)) { if (m.uses[u].optional) W(`${m.id}: optional module "${u}" is not in this build`); else E(`${m.id}: uses "${u}" which is not a known module`); } else if (!(m.uses[u].optional) && !(m.requires || []).includes(u)) W(`${m.id}: uses "${u}" without "optional": use requires for a hard dependency`); });
        const pointCheck = (verb, p) => { const ownerId = p.split('.')[0]; if (!defs.has(ownerId)) W(`${m.id}: ${verb} "${p}" but module "${ownerId}" is not in this build`); else if (!hasOwn(defs.get(ownerId).points || {}, p)) E(`${m.id}: ${verb} "${p}" which ${ownerId} does not declare`); else if (ownerId !== m.id && !(m.uses || {})[ownerId] && !(m.requires || []).includes(ownerId)) E(`${m.id}: ${verb} a point of "${ownerId}" without declaring it in uses`); };
        (m.provides || []).forEach((p) => pointCheck('provides', p)); (m.consumes || []).forEach((p) => pointCheck('consumes', p));
        if (!(m.exports || []).length) W(`${m.id}: exports nothing, so no other module can use it`);
        if (opts.runtime && BS.perm && m.nav && m.nav.after && !(m.nav.after in BS.perm.NAV_TO_PAGE)) W(`${m.id}: nav.after "${m.nav.after}" is not in this build, so the entry goes last in its group`);
        if (opts.runtime) {
          const rec = mounted.get(m.id); if (!rec) { E(`${m.id}: declared but not mounted (its store files did not create BS.${m.global || m.id})`); return; }
          (m.exports || []).forEach((n) => { if (!(n in rec.api)) E(`${m.id}: exports "${n}" but BS.${m.global || m.id}.${n} does not exist`); });
          if (m.reset && typeof rec.api.reset !== 'function') E(`${m.id}: reset is declared but there is no reset()`);
          (m.provides || []).filter((p) => defs.has(p.split('.')[0])).forEach((p) => { if (!(providers.get(p) || []).some((x) => x.owner === m.id)) E(`${m.id}: declares it provides "${p}" but never called BS.modules.extend`); });
          if (BS.perm && m.permissions && !BS.perm.PAGES.some((p) => p.id === m.permissions.page)) E(`${m.id}: page "${m.permissions.page}" is not registered with the permission store`);
          if (BS.tenant && m.tenant && !BS.tenant.MODULES.some((x) => x.id === m.id)) E(`${m.id}: not listed in the tenant subscription modules`);
          if (BS.audit && m.audit && !BS.audit.MODULES.includes(m.audit.module)) E(`${m.id}: audit module "${m.audit.module}" is not known to the audit log`);
          if (BS.adminMods && m.permissions && m.nav && !BS.adminMods.some((a) => a.nav === m.nav.label)) E(`${m.id}: no admin page registered with nav "${m.nav.label}"`);
          if (BS.t) { const quiet = console.warn; console.warn = () => {}; try { const miss = (k) => BS.t('en', k) === k || BS.t('zh', k) === k; if (m.nav && miss(m.nav.label)) E(`${m.id}: nav label "${m.nav.label}" has no strings`); if (m.permissions && m.permissions.descKey && miss(m.permissions.descKey)) E(`${m.id}: page description "${m.permissions.descKey}" has no strings`); ((m.phone || {}).tiles || []).forEach((t) => { if (miss(t.label)) E(`${m.id}: phone tile label "${t.label}" has no strings`); }); } finally { console.warn = quiet; } }
        }
      });
      return { errors, warnings, modules: managedList.map((m) => m.id) };
    },
    /** problems found while declaring (the console shows them at boot) */
    problems() { return problems.slice(); },
  };
  BS.modules = M;
})();
