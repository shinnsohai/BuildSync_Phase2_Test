// @ts-check
/* __EN__: what this module is, in plain data. The platform reads this; nothing here runs. Rules: docs/MODULES.md and docs/SDK.md. */
BS.modules.define(/** @type {BuiltSync.Manifest} */ ({
  id: '__ID__', version: '0.1.0', domain: '__DOMAIN__',
  sdk: '^1.0.0', sdkOnly: true,                      // written against BS.sdk only; tools/check-modules.js enforces it
  name: { zh: '__ZH__', en: '__EN__' },
  global: '__ID__',                                   // BS.__ID__ is this module's API object (js/__ID__/store.js)
  files: {
    css: ['css/__ID__.css'],
    i18n: ['js/__ID__/i18n.js'],
    store: ['js/__ID__/store.js'],
    hooks: ['js/__ID__/audit.js'],
    phone: ['js/__ID__/worker.js'],
    admin: ['js/__ID__/admin.js'],
  },
  nav: { group: '__GROUP__', icon: '__ICON__', label: 'a.nav.__ID__' },
  permissions: {
    page: '__ID__', ops: ['view', 'create', 'update', 'delete', 'export'], descKey: 'pg.__ID__',
    defaults: { PROJECT_ADMIN: ['view', 'create', 'update', 'export'], HR_ADMIN: ['view', 'export'] },
  },
  tenant: { order: __ORDER__, ready: true, defaultFor: ['ten-xinghan', 'ten-huazhu'] },
  audit: { module: '__ID__' },
  events: { prefix: '__ID__', emits: ['__ID__.item.created', '__ID__.item.done'] },
  phone: { tiles: [{ icon: '__ICON__', label: 'w.tile.__ID__', act: 'open-__ID__', order: __TILE__ }] },
  exports: ['openCount'],                             // the public API: what other modules may call through BS.sdk.modules.api('__ID__')
  storage: ['bs___ID___proto_v1'],
  reset: true,
}));
