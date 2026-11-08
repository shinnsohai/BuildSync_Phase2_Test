# BuiltSync modules: the platform, the contract, and how to add one

The prototype is built so a new feature module (Account, Site, QAQC, …) is **a folder plus one id**, and nothing else in the platform is edited. This page is the contract. The code that enforces it is `js/modules/registry.js`; the checks are `tools/check-modules.js` and `tools/test-modules.js`.

```bash
node tools/new-module.js qaqc --domain qaqc --zh 质量巡检 --en "Quality inspection"   # make a working module from the template
node tools/verify.js            # everything: boot in Node, contract check, SDK guard, all tests (run before every commit)
node tools/check-modules.js     # the contract against the real files
```

Related: **`docs/SDK.md`** (what a module may use, versioning), **`docs/BUILD-A-MODULE.md`** (the how-to, for people and AI assistants), `AGENTS.md` (the short instructions AI tools read automatically).

## 1. The platform (the kernel) and what is a module

| | What | Who may use it |
|---|---|---|
| **Kernel** | Language strings (`BS.D`, `BS.t`), the event bus, roles and permissions (`BS.perm`), tenants and subscriptions (`BS.tenant`), the audit log (`BS.audit`), the sidebar and phone shell, the module registry (`BS.modules`), UI helpers (`html`, `icon`, `toast`), formatting | every module |
| **Shared people data** | `BS.hr` (people, projects, sites), `BS.att` (attendance), `BS.leaveReq` | every module (read; changes go through their own methods) |
| **Module** | A feature with its own pages, data and phone screens: Permit to Work, Site chat & Kanban, later Account, Site, QAQC modules | other modules only through its **public API** or an **extension point** |
| **Adopted module** | An older module with no manifest yet; only its public API is registered | like a module |

The list of names a module may use freely is `BS.modules.KERNEL`.

## 2. A module is a folder with a manifest

```
js/qaqc/
  manifest.js      ← plain data: what this module is (nothing runs)
  i18n.js          ← strings (zh and en)
  store.js         ← data and rules; sets BS.qaqc
  integration.js   ← the only file that registers extension points (optional)
  audit.js         ← which actions the audit log records
  worker.js        ← phone screens
  admin.js         ← admin pages
css/qaqc.css
```

`js/modules/enabled.js` lists the ids that are switched on: `BS.modules.enable(['ptw', 'kchat', 'qaqc'])`. That one line, and the folder, is all a new module needs. `index.html` never changes: it has six fixed slots (`css`, `i18n`, `store`, `hooks`, `phone`, `admin`) and the platform writes each module's files into them in dependency order.

### The manifest (every field)

```js
BS.modules.define({
  id: 'qaqc', version: '1.0.0', domain: 'qaqc',          // domain: account | site | qaqc | platform
  sdk: '^1.0.0', sdkOnly: true,                           // the contract version it was written for; sdkOnly = touches the platform only through BS.sdk
  name: { zh: '质量巡检', en: 'Quality inspection' },
  global: 'qaqc', globals: [],                            // BS.qaqc is the API object; extra globals it owns
  requires: [],                                           // hard dependencies (loaded first, may be used directly)
  uses: { ptw: { optional: true, why: 'link an inspection to a permit' } },   // soft: only through BS.modules.api('ptw'), may be absent
  consumes: [],                                           // extension points it asks questions of
  files: { css: [...], i18n: [...], store: [...], hooks: [...], phone: [...], admin: [...] },   // root-relative paths, in order
  nav:         { group: 'site', icon: 'clip', label: 'a.nav.qaqc', after: 'a.nav.ptw' },        // sidebar entry
  permissions: { page: 'qaqc', ops: ['view','create','update','delete','export','approve'], descKey: 'pg.qaqc', scoped: false,
                 defaults: { PROJECT_ADMIN: ['view','create','update'], HR_ADMIN: ['view'] } }, // grants for the built-in roles
  tenant:      { order: 80, ready: true, defaultFor: ['ten-xinghan'] },                          // the subscription entry
  audit:       { module: 'qaqc' },
  events:      { prefix: 'qaqc', emits: ['qaqc.report.created'], listens: [] },                  // names must start with the prefix
  phone:       { tiles: [{ icon: 'clip', label: 'w.tile.qaqc', act: 'open-qaqc', order: 110 }] }, // a tile on the phone home
  exports: ['openCount', 'subscribe'],                    // the public API: nothing else is visible to other modules
  points:   { 'qaqc.checks': 'fn(room) → [...]  what this module lets others add' },            // extension points it owns (prefix = id)
  provides: [],                                           // extension points of other modules that it answers
  storage: ['bs_qaqc_proto_v1'],                          // every localStorage key it writes
  reset: true,                                            // the demo reset button calls BS.qaqc.reset()
});
```

What the platform does with it, so the module never does: puts the page in the sidebar, creates the permission page and the default role grants, adds the subscription entry (and which tenants have it by default), adds the audit module and its filter label, adds the event prefix to the event log filter, adds the phone tile, loads the CSS/JS in order, and calls `reset` from the reset button.

### Switching a module on or off

Remove an id from `js/modules/enabled.js` and everything of that module disappears (page, tile, permission page, subscription entry, audit label) while the rest keeps working; modules that used it just stop seeing it (`BS.modules.api(id)` returns `null`, its extension points get no answers). Add the id back and it returns. A tenant that already exists keeps the subscription it had: a newly enabled module appears for it only after the module is added to its subscription on the Tenants page (or the demo is reset, which re-seeds `tenant.defaultFor`).

## 3. The rules (all enforced by `check-modules`)

1. **Declare everything.** Files, strings used by the manifest, storage keys, events, extension points. Anything undeclared is an error.
2. **No reaching into another module.** `BS.ptw.all()` inside `kchat` is an error. Use `BS.modules.api('ptw')`, which returns only the exported methods, or `null` when the module is absent. Always handle `null`: a module must still work without its optional neighbours.
3. **The platform and older modules never name a module that has a manifest** (`BS.kchat` in `shell.js` is an error). Use `BS.modules.api(id)` or an extension point.
4. **Ask a question through an extension point, not a call.** The permit module asks `BS.modules.collect('ptw.holds', permit)` ("what stops this permit?") and shows whatever answers; it does not know the site chat exists. The chat answers with `BS.modules.extend('ptw.holds', 'kchat', fn)` in its `integration.js`.
5. **Events are named by their module.** `kchat.card.closed`. Listen to events from other modules freely, declare them in `listens`.
6. **Strings used by a literal key must exist** in a language file (`t('kc.reply')` with no `D('kc.reply', …)` is an error). This found a real bug the first time it ran.
7. **Keep a module's files in its folder.** A `.js` file in the folder that the manifest does not list is a warning (it would never load).

## 4. Talking to another module

| You need | Use | Example |
|---|---|---|
| Call a method of an optional module | `BS.modules.api('wallet')` (null when absent) | `const w = BS.modules.api('wallet'); if (w) w.award(...)` |
| Repaint when another module's data changes | `BS.modules.stores(['ptw'])` or `providerStores('ptw.holds')` in the admin registration | `stores: [hr, ...BS.modules.providerStores('ptw.holds')]` |
| Ask others to add to your page | an extension point you own, `collect` / `first` | `ptw.holds`, `ptw.related` |
| Add to another module's page | `BS.modules.extend('point', 'yourId', fn)` in `integration.js`, and list it in `provides` | the chat's `ptw.holds` |
| Tell others something happened | `BS.bus.emit('qaqc.report.created', {...})` | |

## 5. Where the real product differs

This is a no-build prototype, so the "kernel" is a script and the loader writes `<script>` tags. The SDK (`BS.sdk`), the scaffold (`tools/new-module.js`) and the checks now exist in the prototype form (see `docs/SDK.md`). The contract is what carries over:

| Prototype | Real product |
|---|---|
| `manifest.js` plain data | a `module.json`/TypeScript manifest, validated at build time |
| `BS.modules.api(id)` | a typed SDK package (`@builtsync/sdk`) giving the kernel and other modules' public APIs |
| `tools/check-modules.js` | the same rules as a lint step in CI, plus a scaffold command (`bs module new qaqc`) that writes the folder and manifest |
| `BS.modules.enable([...])` | a module list per build or per tenant |
| localStorage key per module (`BS.sdk.storage.createStore`) | a database schema per module, a `tenant_id` on every table, a REST/event contract from the exports and events |
| extension points | server-side hooks or events, so a module can be deployed on its own later |

Start the real build as a modular monolith (one deployable, strict boundaries as above) and split a module into a service only when it needs its own scaling or team.

## 6. What is migrated

| Module | State |
|---|---|
| Permit to Work (`ptw`) | manifest; its audit hooks and strings are in its folder; asks `ptw.holds` / `ptw.related` instead of calling the chat; uses `train` only through its API |
| Site chat & Kanban (`kchat`) | manifest; uses `ptw` and `wallet` only through their APIs; answers the permit module's extension points |
| `dep`, `comp`, `train`, `wallet` | adopted: public API registered in `js/modules/legacy.js` |
| everything else (people, attendance, payroll, leave, notices, surveys, training, wallet, dormitory, spin, …) | still wired the old way; move each when it is next worked on |

To move an old module: (1) write its `manifest.js`; (2) move its lines out of `shell.js`, `perm/store.js`, `tenant/store.js`, `audit/*`, `main.js` and `index.html` (the check lists what is left behind); (3) change other modules' direct calls to `BS.modules.api`; (4) run the check until it is clean.

## 7. Adding the three planned modules

- **Account** (identity, tenants, roles are kernel; business parts such as payroll, leave and claims can become `account` modules one by one).
- **Site** (Permit to Work, deployments, dormitory, site chat; `domain: 'site'`).
- **QAQC** (`domain: 'qaqc'`): decide first who owns a quality defect's life cycle. The suggested split is that QAQC owns it and the site chat is one way a defect enters, through an extension point such as `qaqc.intake`.
