# BuiltSync prototype: instructions for AI coding assistants

BuiltSync is a Singapore construction workforce platform. This repository is its clickable prototype: plain HTML, CSS and JavaScript, **no build step, no dependencies**. An admin dashboard (Chinese and English) and a worker phone app share one page. Data is saved in `localStorage` with demo seed data.

Features are **modules** (Permit to Work, Site chat & Kanban, and soon Account, Site, QAQC). A module is a folder with a manifest. The platform wires everything else. Your job is usually to add or change a module without touching the platform.

## Commands

```bash
node tools/new-module.js <id> --domain <account|site|qaqc|platform> --zh <中文名> --en "<English name>"   # make a working module
node tools/verify.js              # boot the platform in Node + contract check + SDK guard + all tests. Run after every step.
node tools/verify.js --quick      # same, without the slow kernel tests
node tests/<id>.test.js           # one module's tests
python tools/serve.py 8766        # serve http://localhost:8766 (no cache) to look at the page
```

Never say something works without running `node tools/verify.js` and reading the result. You cannot see the screen: say what you could not check visually.

## The rules for a module

1. Start from the scaffold (`tools/new-module.js`). Do not copy another module by hand.
2. Write against **`BS.sdk` only** (the manifest says `sdkOnly: true`). Types: `sdk/builtsync-sdk.d.ts`. Reference: `docs/SDK.md`. Only the functions listed there exist: do not invent any.
3. Another module is reached only through `BS.sdk.modules.api('<id>')` (it can be `null`: handle it) or an extension point. Never `BS.ptw`, `BS.kchat`, `BS.wallet`, `BS.hr` and so on.
4. **Do not edit platform files to add a module**: `index.html`, `js/shell.js`, `js/main.js`, `js/perm/*`, `js/tenant/*`, `js/audit/*`, `js/modules/*` (except adding the id to `js/modules/enabled.js`). The manifest does all the wiring. If you believe you need to, stop and say why.
5. Put every rule in `store.js` and test it in `tests/<id>.test.js`. Screens only draw and call the store. The store never touches the DOM.
6. Every string in **both languages** via `sdk.i18n.define`, with literal keys (`t('qaqc.e.title')`). Never hard-code text in a screen.
7. Declare everything in the manifest: files, storage keys, events (prefixed with the id), public `exports`, extension points. Undeclared is an error.
8. Button action names carry permissions: `<id>-new`/`-add` (create), `-edit`/`-update` (update), `-del`/`-delete` (delete), `-approve`/`-reject` (approve), `export`. Keep those words.
9. Wrap each file in `(function (BS) { … })(window.BS)`; no top-level `const`/`let` (all scripts share one global scope).
10. CSS classes are prefixed with the module id. Dates and "now" come from `sdk.time`, never `new Date()`. Draw with `sdk.ui.html` (it escapes values).

## What a finished change looks like

`git diff --stat` shows only `js/<id>/`, `css/<id>.css`, `tests/<id>.test.js` and one id added to `js/modules/enabled.js`; `node tools/verify.js` prints **All clean**; both languages checked; the module can be switched off (remove its id from `enabled.js`) and the rest of the app still works.

## Where things are

| | |
|---|---|
| `docs/BUILD-A-MODULE.md` | the how-to with a cookbook, a checklist and a troubleshooting table: read it before building |
| `docs/MODULES.md` | what a module is, the manifest fields, extension points |
| `docs/SDK.md`, `docs/SDK-CHANGELOG.md` | the contract and its version rules |
| `js/kchat/`, `js/ptw/` | two real modules (written before the SDK; they still use some kernel names, do not copy that) |
| `tools/templates/module/` | what the scaffold writes: the reference pattern |
| `README.md` | the prototype's features and the walkthroughs |

## Style

Vanilla ES2020, two-space indent, single quotes, semicolons, `const` by default. Comments say why, in plain English. Keep files small enough to read; long one-line templates are used in this codebase, do not reformat existing files you are not changing.

## Changing the contract itself (rare)

`BS.sdk`, the manifest fields and vocabularies are versioned. Changing them needs a version bump, a changelog entry and `node tools/sdk-surface.js --update`; see `docs/SDK.md` section 3. Do not do this as part of building a module.
