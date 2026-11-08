---
name: new-builtsync-module
description: Create or extend a BuiltSync module (Account, Site, QAQC or any feature with its own admin page, phone screen and data). Use when the user asks for a new module, a new feature page, or changes to js/<id>/ in this repository.
---

# Building a BuiltSync module

Follow `docs/BUILD-A-MODULE.md`; the rules are in `AGENTS.md`. In short:

1. **Understand the feature** in two sentences: entities, who uses it (admin, worker, both), the rules that must always hold. If something that changes the design is unclear, ask one question; otherwise choose and say what you chose.
2. **Scaffold**: `node tools/new-module.js <id> --domain <account|site|qaqc|platform> --zh <中文名> --en "<English name>"`. The id is 2 to 16 lowercase letters or digits and not an existing platform name. It writes `js/<id>/`, `css/<id>.css`, `tests/<id>.test.js` and adds the id to `js/modules/enabled.js`, then runs the checks.
3. **Store first**: change `js/<id>/store.js` (fields, `validate`, actions, events) and `tests/<id>.test.js`; run `node tests/<id>.test.js` until green.
4. **Strings** in `i18n.js`, both languages, literal keys.
5. **Admin page** in `admin.js`, **phone screen** in `worker.js`, **audit** lines in `audit.js`, **manifest** (`permissions`, `events`, `exports`, `storage`, `nav`, `tenant.defaultFor`).
6. After every step run `node tools/verify.js` and read it. Fix what it reports; do not argue with it.
7. Look at the page if you can (`python tools/serve.py 8766`, reset the demo data, both languages). If you cannot, say which things you did not see.

## Hard limits

- Use `BS.sdk` only. Only the functions in `docs/SDK.md` exist.
- Another module only via `BS.sdk.modules.api(id)` (handle `null`) or an extension point.
- Do not edit `index.html`, `js/shell.js`, `js/main.js`, `js/perm/*`, `js/tenant/*`, `js/audit/*` or `js/modules/*` except to add the id to `js/modules/enabled.js`.
- No top-level `const`/`let` in module files; wrap in `(function (BS) { … })(window.BS)`.
- Action names keep the permission words: `-new`, `-edit`, `-del`, `-approve`, `export`.

## Finish

Report: what was built, the output of `node tools/verify.js`, the files changed (`git diff --stat`), what you could not check visually, and any decision you made that the user should confirm.
