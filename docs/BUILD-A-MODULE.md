# Build a module, with or without an AI assistant

A module is a feature with its own page, phone screen, data and rules (Permit to Work, Site chat, and the planned Account, Site and QAQC modules). You make one with a command, change it into your feature, and a set of checks tells you when it is right. Everything below works the same for a person typing and for an AI IDE such as Claude Code, Cursor or Copilot.

Read first (10 minutes): `docs/MODULES.md` (what a module is) and `docs/SDK.md` (what you may use). This page is the how-to.

## 1. Quick start

You need Node 18 or newer and Python 3 (only to serve the page). No install step: the project has no dependencies.

```bash
node tools/new-module.js qaqc --domain qaqc --zh 质量巡检 --en "Quality inspection"   # make the module
node tools/verify.js                                                                  # everything that must be true
python tools/serve.py 8766                                                             # serve it, then open http://localhost:8766
```

Open the page, press **重置演示数据** (reset demo data) once, and look: the sidebar has your page, the phone home has your tile, the permission page lists your page, the subscription page lists your module. That is a working feature before you have written a line.

`new-module` options: `--domain account|site|qaqc|platform` · `--group <sidebar group>` · `--icon <name>` · `--zh` · `--en` · `--dry` (show what it would do).

## 2. What you got

| File | What it is | You change it to… |
|---|---|---|
| `js/<id>/manifest.js` | plain data: id, pages, permissions, events, the public API | declare what is true about your feature |
| `js/<id>/store.js` | the data and every rule; sets `BS.<id>` | your entities, validation and actions |
| `js/<id>/i18n.js` | every string, Chinese and English | your wording |
| `js/<id>/admin.js` | the admin page: list, filter, dialog, delete, export | your screens |
| `js/<id>/worker.js` | the phone screen opened by the tile | your phone flow |
| `js/<id>/audit.js` | which administrator actions are logged | add a line per new action |
| `css/<id>.css` | styles, every class prefixed with the id | only what shared styles lack |
| `tests/<id>.test.js` | Node tests of the store, the events, the audit entry and the contract | tests for your rules |

The example feature is a list of items with an owner, a due date and a status. Keep its shape (validate → act → return `{ ok, … }`; errors as codes the screen turns into strings) and replace the content.

## 3. Turn it into your feature: the order that works

1. **Say what it is.** Write down, in two sentences, what the feature does and who uses it (admin, worker, both). Decide its entities and the rules that must always hold.
2. **Store first, with tests.** Edit `store.js` (fields, `validate`, actions) and `tests/<id>.test.js`. Run `node tests/<id>.test.js` until green. No screen yet. A rule that is not in the store will end up copied into two screens and disagree.
3. **Strings.** Every label, error, button and toast goes into `i18n.js` in both languages. A string used with a literal key and never defined is an error from the check.
4. **Admin page.** Edit `admin.js`. Buttons use action names that carry the right permission (see SDK.md section 2). Show or hide with `sdk.perm.can('<id>', 'create')`.
5. **Phone.** Edit `worker.js`. The tile's `act` arrives in `onClick`; draw screens with `api.html`, `api.header`.
6. **Manifest.** Update `permissions.ops` and `defaults` (which built-in roles get what), `events.emits`, `exports` (the small API others may call), `storage` (every localStorage key), `nav.group`/`icon`, `tenant.defaultFor`.
7. **Audit.** One `sdk.audit.watch` line per administrator action worth recording.
8. **Verify, then look.** `node tools/verify.js`, then reload the page, reset the demo data, click through it in both languages and on a phone-width window.

## 4. Cookbook

**Add a field.** `seed()` and `validate()` in `store.js` → the `create` and `update` field lists → `blank()` and the form in `admin.js` → strings (`f.<name>`, `e.<name>`) → test.

**Add a status with approval.** Add the status to `STATUS`, a store action that checks the transition, and an admin button named `<id>-approve` (it then needs the *approve* operation). Add `'approve'` to `permissions.ops` and give it to the roles that should have it in `defaults`.

**A second admin tab.** Add it to `tabs: [...]` in `sdk.admin.register` and to the instance `tab`; `page()` draws by `D.tab`. Tab labels are string keys.

**Show data from another module.** `const w = sdk.modules.api('wallet'); if (w) w.points(empNo)`. Declare it in the manifest: `uses: { wallet: { optional: true, why: '…' } }`. The module must also work when `w` is `null`.

**Let other modules add to your page.** Own an extension point named `<id>.something` in `points`, ask with `sdk.modules.collect('<id>.something', arg)`, and show whatever comes back. You never name the modules that answer. Example: `ptw.holds` in Permit to Work.

**Answer another module's extension point.** Put it in `integration.js`: `sdk.modules.extend('ptw.holds', '<id>', (permit) => [...])`, and list the point in `provides`. See `js/kchat/integration.js`.

**React to something that happened elsewhere.** `sdk.bus.on('employee.*', fn)` or `'compliance.changed'`. Events you emit start with your id and are listed in `events.emits`.

**Change the shape of saved data.** Raise `version` in `createStore` and give it `migrate(old, fromVersion)` returning the new state. Without `migrate`, old data is replaced by `seed()`, which is fine for demo data and not for anything real.

**Use the permission of the signed-in account.** `sdk.perm.can('<id>', op)`. The dashboard guards clicks by action name on its own; the check in your code is for hiding things.

**Draw safely.** `html` escapes every value. Never build markup by string concatenation with user text.

## 5. Rules, and the mistakes they came from

| Rule | Why |
|---|---|
| Use only `BS.sdk` (and your own `BS.<id>`). | `sdkOnly: true` is checked. It keeps the module alive when the platform changes. |
| Never call another module's global (`BS.ptw`, `BS.wallet`, …). | Use `sdk.modules.api(id)`; it is `null` when that module is off. The check lists the line. |
| Do not edit shared files to add your module (`index.html`, `shell.js`, `perm/store.js`, `tenant/store.js`, `audit/*`, `main.js`). | The manifest does all of it. If you think you need to, you are fighting the contract: ask. |
| Do not write a top-level `const x = …` in a module file. | Classic scripts share one global scope; two modules with the same name break the page. Wrap files in `(function (BS) { … })(window.BS)`. (The scaffold's first version had exactly this bug: a second generated module failed to load.) |
| Prefix CSS classes with your id. | Modules share one stylesheet scope. |
| Every string in both languages, defined with `i18n.define`. | An undefined key shows as the raw key on screen; the check finds literal ones. |
| Dates through `sdk.time`, never `new Date()`. | One clock for demos and tests. |
| The store never touches the DOM; screens never hold rules. | It is what makes the Node tests meaningful. |
| Declare every storage key, event name and extension point. | Undeclared is an error; it is how other people learn what your module does. |

## 6. Definition of done

- [ ] `node tools/verify.js` prints *All clean*.
- [ ] Your rules have tests (empty, too long, unknown id, wrong state, permission) and they pass.
- [ ] Both languages show correctly on every screen, with no raw keys (look for text such as `qaqc.e.title`).
- [ ] A role without the *create* operation sees no create button (sign in as 王人事 in the user menu).
- [ ] The phone screen works at phone width (430 px) with long text.
- [ ] Turn the module off (remove its id from `js/modules/enabled.js`): the rest of the app still works. Turn it back on.
- [ ] The demo reset button restores your seed.
- [ ] Nothing outside your folder, `css/<id>.css`, `tests/<id>.test.js` and the one id in `enabled.js` changed.

## 7. Working with an AI assistant

**What the assistant reads on its own.** `AGENTS.md` at the project root (Claude Code reads `CLAUDE.md`, which imports it; Cursor reads `.cursor/rules`; Copilot reads `.github/copilot-instructions.md`). They all say the same short thing: use the scaffold, use only `BS.sdk`, run `node tools/verify.js`, never edit the platform to add a module. Claude Code also has a skill and a command: `/new-module qaqc` walks through this page.

**A first prompt that works** (change the words in brackets):

> Create a new BuiltSync module "[Quality inspection]" with id `[qaqc]` in the `[qaqc]` domain. Use `node tools/new-module.js` and keep it `sdkOnly`. The feature: [inspectors record an inspection of a place on site, with a result pass/fail, photos later, and a failed inspection must be assigned to someone and closed with a note]. Admin sees all inspections; workers see the ones assigned to them on the phone. Put the rules in `store.js` first with tests, then the strings in both languages, then the admin page, then the phone screen. Run `node tools/verify.js` after each step and fix what it reports. Do not edit anything outside `js/qaqc/`, `css/qaqc.css`, `tests/qaqc.test.js` and `js/modules/enabled.js`. Tell me what you could not check without a browser.

**Follow-ups that keep it on track:**

- "Run `node tools/verify.js` and show me the output."
- "List every string the screens use that is not defined in both languages."
- "Which of my manifest `exports`, `events` and `storage` entries are not used by the code? Remove them or use them."
- "Add tests for the permission and validation rules, then show which rule has no test."
- "Show me the diff outside `js/qaqc/`." (It should be one line in `enabled.js`.)

**How to review its work in five minutes.** `git diff --stat` (only your folders plus one line), `node tools/verify.js` (clean), open the page and press reset, click every button once in Chinese and English, sign in as the HR officer and check the buttons disappear, switch your module off and on. The checks cover rules and wiring; a person has to look at the screen.

**What an assistant cannot verify.** Layout, colours, wording that reads naturally in Chinese, whether the flow is sensible for a site worker with gloves, and anything that needs a real phone. Ask it to say so, and look yourself.

**Typical failures and what to say.**

| It did | Say |
|---|---|
| Edited `shell.js`, `perm/store.js` or `index.html` to wire the page | "Revert that. The manifest wires it. Fix the manifest instead." |
| Used `BS.hr`, `BS.perm`, `BS.ptw` directly | "This module is sdkOnly. Use `BS.sdk`, or `sdk.modules.api` for another module." |
| Put a rule in the admin page | "Move that rule into `store.js` and test it." |
| Wrote only English strings, or Chinese only | "Both languages for every string; run the string check." |
| Invented an SDK function | "Only the functions in `docs/SDK.md` exist. Check `sdk/builtsync-sdk.d.ts`." |
| Said it works without running anything | "Run `node tools/verify.js` and paste the result." |

## 8. When something fails

| Message | Meaning | Fix |
|---|---|---|
| `uses BS.hr, but the manifest says sdkOnly` | a kernel global used directly | use `sdk.people` (or the matching `BS.sdk` section) |
| `uses BS.ptw (module "ptw") directly` | another module's global | `sdk.modules.api('ptw')`, declare it in `uses` |
| `string "x.y" is used but never defined` | `t('x.y')` has no `define('x.y', …)` | add it in `i18n.js`, both languages |
| `writes localStorage key "…" which is not in storage` | undeclared key | add to `storage` in the manifest |
| `emits "x.y" which is not in events.emits` | undeclared event | add it, and keep the prefix |
| `declared file … does not exist` | typo in `files` | fix the path |
| `written for sdk ^2.0.0, but this platform has 1.0.0` | wrong contract version | set `sdk: '^1.0.0'` |
| `unknown field "permisions"` | typo in the manifest | fix the spelling |
| `breaking changes need a new major version` | someone changed `BS.sdk` or a vocabulary | see SDK.md section 3, or revert |
| page shows `qaqc.e.title` | the string is missing | define it in both languages |
| the page is blank after adding the id | a script error in one of your files | open the console; `node tools/verify.js` boots the same files and prints the error |
| `tests/<id>.test.js` fails with `Cannot read properties of undefined` | the module did not load | read the first line of `failed` printed by the test: it names the file and the error |
