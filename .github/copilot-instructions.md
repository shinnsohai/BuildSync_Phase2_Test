# Instructions for GitHub Copilot

This is the BuiltSync clickable prototype: vanilla JavaScript, no build step, no dependencies. **Read `AGENTS.md` at the repository root; it is the full set of instructions.**

When asked to add or change a feature module:

- Create it with `node tools/new-module.js <id> --domain <account|site|qaqc|platform> --zh <中文名> --en "<English name>"`.
- Use only `BS.sdk` (reference `docs/SDK.md`, types `sdk/builtsync-sdk.d.ts`); do not invent functions. Reach another module only with `BS.sdk.modules.api(id)` (can be `null`) or an extension point.
- Do not edit `index.html`, `js/shell.js`, `js/main.js`, `js/perm/*`, `js/tenant/*`, `js/audit/*` or `js/modules/*` to wire a module, except adding the id to `js/modules/enabled.js`.
- Put rules in `js/<id>/store.js` and test them in `tests/<id>.test.js`. Every string in Chinese and English.
- Run `node tools/verify.js` and report the result.

The step-by-step guide is `docs/BUILD-A-MODULE.md`.
