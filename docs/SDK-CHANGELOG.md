# SDK and module contract: changelog

The contract is `BS.sdk`, the manifest fields and vocabularies, extension points and `BS.modules.api`. Its version is `SDK_VERSION` in `js/modules/registry.js` and every manifest names the version it was written for (`sdk: '^1.0.0'`). Rules: docs/SDK.md.

- **Major** (2.0.0): something was removed or changed. Needs a migration note here and a deprecation period first.
- **Minor** (1.1.0): something was added. Old modules keep working.
- **Patch** (1.0.1): a bug fix, no change to the surface.

## 1.0.0

First stable contract.

- `BS.sdk`: `ui` (html, raw, esc, icon), `i18n` (define, t), `time` (now, today, addDays), `people`, `attendance`, `perm`, `me`, `audit.watch`, `bus`, `modules` (api, has, stores, providerStores, extend, collect, first), `storage.createStore`, `admin.register`, `phone.extend`.
- Manifest: fields, six file slots (css, i18n, store, hooks, phone, admin), domains (account, site, qaqc, platform), operations, navigation groups, default role codes.
- `sdkOnly: true` modules may use only `BS.sdk` and their own globals; `tools/check-modules.js` enforces it.
- `permit` and `chat` modules are written for 1.x and still use some kernel names directly (`sdkOnly: false`).
