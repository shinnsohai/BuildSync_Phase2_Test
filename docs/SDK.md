# The BuiltSync SDK and the module contract (version 1)

A module author, human or AI, should be able to build a feature knowing only this page, `docs/MODULES.md` (the module shape) and `sdk/builtsync-sdk.d.ts` (the types). The platform inside can change; if the contract below holds, the module keeps working.

**What is the contract?** Four things, all versioned together (`SDK_VERSION` in `js/modules/registry.js`, now **1.0.0**):

1. `BS.sdk`, the functions below.
2. The manifest: its fields, file slots, domains, operations, navigation groups and default role codes.
3. Other modules' public APIs (`BS.sdk.modules.api(id)`) and extension points (`extend`, `collect`, `first`).
4. The shapes the dashboard and the phone call on your code: the admin instance and the phone extension (types in `sdk/builtsync-sdk.d.ts`).

## 1. Why there is an SDK at all

| Without it | With it |
|---|---|
| A module reads `BS.hr`, `BS.perm`, `BS.att` directly, so any change inside the platform can break it. | The module calls `BS.sdk.people`, `BS.sdk.perm`, `BS.sdk.attendance`. Each forwards to the real store at call time, so the inside can be rearranged. |
| Every module hand-writes load, save, version, tab-sync and reset for its data. | `BS.sdk.storage.createStore` does it in one call. |
| An AI assistant guesses which of 60 globals to use. | It has one object with 11 sections, typed. |

A module that declares **`sdkOnly: true`** in its manifest may use only `BS.sdk` and its own globals; `node tools/check-modules.js` fails the build otherwise. New modules (and everything the scaffold makes) are `sdkOnly`. Permit to Work and the Site chat were written first and still use some kernel names directly (`sdkOnly: false`); they are grandfathered and move over when next changed.

## 2. `BS.sdk` reference

| Section | Functions | Notes |
|---|---|---|
| `version` | the contract version string | |
| `ui` | `html` · `raw(markup)` · `esc(text)` · `icon(name, size?, cls?)` | `html` is a tagged template that **escapes every value**; wrap trusted markup in `raw`. Icon names: back, bell, brief, cal, cal2, camera, cap, cert, chart, check, clip, clock, down, file, folder, gear, gift, globe, home, image, list, mega, menu, pin, plus, receipt, refresh, right, search, shield, star, tag, trash, upload, user, users, wallet, warn, x, zoom. |
| `i18n` | `define(key, zh, en)` · `t(lang, key, params?)` | Every string exists in both languages. `{n}` in a string is filled from `params`. |
| `time` | `now()` · `today()` · `addDays(date, n)` | The prototype clock, local time. Use it, never `new Date()`, so tests and demos agree. |
| `people` | `emp(empNo)` · `emps()` · `project(key)` · `projects()` · `site(key)` · `sites()` · `certsOf(empNo)` · `certStatus(cert)` · `certType(code)` · `subscribe(fn)` | Read only. Personnel, projects, sites and certificates belong to the Personnel module. |
| `attendance` | `groups()` · `group(id)` · `groupOf(emp)` · `day(empNo, date)` · `now()` · `subscribe(fn)` | Crews and one person's day. |
| `perm` | `can(page, op)` · `canPage(page)` · `currentAccount()` · `currentId()` · `account(id)` · `roleOf(account)` · `subscribe(fn)` | For the **administrator** who is signed in. Hide a button the account may not use with `can('mypage', 'create')`; the dashboard also checks by action name (see below). |
| `me()` | `{ empNo, name, nameEn }` | The **worker** signed in on the phone. |
| `audit` | `watch(store, method, spec)` | Records an administrator action in the audit log: `spec = { module, type, object(args, result, before), before? }`. `type` is one of the audit types (create, update, delete, approve, reject, complete, …). |
| `bus` | `on(pattern, fn)` → off · `emit(type, payload)` | Names start with your module id and are listed in `events.emits`. `on('qaqc.*', fn)` matches a prefix. |
| `modules` | `api(id)` · `has(id)` · `stores(ids)` · `providerStores(point)` · `extend(point, owner, fn)` · `collect(point, …args)` · `first(point, …args)` | `api` returns the other module's **declared** exports or `null`: always handle `null`. |
| `storage` | `createStore({ key, version?, seed, migrate? })` | Returns `{ state, update(fn, evt?), save, emit, subscribe, version, reset }`. Keys look like `bs_<module>_…` and are listed in the manifest `storage`. Data of an older `version` goes through `migrate(old, fromVersion)` or is replaced by `seed()`. Other browser tabs' saves are picked up. |
| `admin` | `register(page)` | `{ id, nav, stores, tabs, create(ctx) → instance }`; see the template `tools/templates/module/admin.js.tpl`. |
| `phone` | `extend({ stores, screens, init, onClick, onStore })` | See `worker.js.tpl`. The tile in the manifest sends its `act` to `onClick`. |

**Action names decide permissions.** The dashboard asks `perm.guard(page, act)` for every click, from the action's name: contains `new`, `add` or `create` → *create*; `edit`, `upd`, `update` → *update*; `del`, `delete`, `rm`, `remove` → *delete*; `approve`, `reject`, `verify`, `decide` → *approve*; `export` → *export*. Name your buttons `qaqc-new`, `qaqc-edit`, `qaqc-del` and the right role restrictions apply with no extra code.

## 3. Versioning rules

| Change | Version | Rule |
|---|---|---|
| A function, field or vocabulary item is **removed or its arguments change** | **major** (2.0.0) | Needs a migration note in `docs/SDK-CHANGELOG.md` and one release in which the old way still works and is marked deprecated. |
| Something is **added** | **minor** (1.1.0) | Old modules keep working. |
| A bug is fixed, nothing visible changes | **patch** (1.0.1) | |

Every manifest says which version it was written for: `sdk: '^1.0.0'` means "any 1.x from 1.0.0". The platform refuses a module written for a newer minor than it has, or for another major. **Do not change the contract casually:** the guard below stops you.

### The guard: `tools/sdk-surface.js`

`sdk/surface.json` records every `BS.sdk` function (with its number of arguments) and every manifest vocabulary. `node tools/sdk-surface.js`:

- fails if something was removed or changed and the major version did not go up;
- fails if something was added and the minor version did not go up;
- fails if the version moved but the snapshot was not updated, or `docs/SDK-CHANGELOG.md` has no heading for the version.

To change the contract on purpose: edit the code, raise `SDK_VERSION` in `js/modules/registry.js`, add a `## x.y.z` entry to the changelog, then `node tools/sdk-surface.js --update`. Forwarding functions such as `people.emp` show `fn/0` because they pass any arguments through; their real signatures are in the `.d.ts`.

## 4. What is NOT in the contract (do not depend on it)

`BS.hr`, `BS.att`, `BS.perm`, `BS.tenant`, `BS.audit`, `BS.bus`, `BS.fmt`, any other module's global (`BS.ptw`, `BS.kchat`, `BS.wallet`, …), DOM structure of the shell, CSS class names other than the ones the templates use, localStorage keys of other modules. They work today because the prototype is one page, and they can change without a version bump.

## 5. Typed, in your editor

`sdk/builtsync-sdk.d.ts` types `BS.sdk`, the manifest (`BuiltSync.Manifest`), the admin page and instance, the phone extension and `PhoneApi`. `jsconfig.json` loads it for every file in the project. Put `// @ts-check` on the first line of a module file to turn type checking on for that file (the scaffold does). Wrong calls such as `sdk.perm.can('x', 'fly')` or `sdk.people.everyone()` then show as errors in VS Code, Cursor or any TypeScript-aware editor, and from a terminal with `npx -p typescript tsc -p jsconfig.json`.

## 6. Running a module without a browser

`tools/harness.js` boots the whole platform in Node (about 0.25 s): every store, every admin and phone registration, the module loader and the runtime contract check, against a fake `localStorage` and a fake DOM. A module's logic, its rules and its audit entries can be tested there; the scaffold writes `tests/<id>.test.js` that way. It cannot show you the screen. For layout, look at the page.

## 7. From this prototype to the real product

| This prototype | Real product |
|---|---|
| `BS.sdk` object, `sdk/builtsync-sdk.d.ts` | an npm package `@builtsync/sdk` with the same names and the real types; modules import it instead of reading a global |
| `manifest.js` checked by `tools/check-modules.js` | a `module.json` validated in CI by the same rules, plus a CLI (`bs module new`, the scaffold made installable) |
| `sdk/surface.json` and the guard | API-extractor style report committed in the SDK package, breaking changes blocked in review |
| `createStore` on localStorage | the same call shape on a tenant-scoped database table, with `migrate` as a real migration |
| `BS.sdk.modules.api(id)` | a typed client generated from another module's exports (in a modular monolith, an in-process call; later, an HTTP or event contract) |

The names and rules are the part that carries over. That is why they are versioned now.
