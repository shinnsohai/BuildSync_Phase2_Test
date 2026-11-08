/* Permit to Work: what this module is, in plain data. The platform reads this; nothing here runs. See docs/MODULES.md. */
BS.modules.define({
  id: 'ptw', version: '1.2.0', domain: 'site',
  sdk: '^1.0.0', sdkOnly: false,   // written for contract 1.x; still uses some kernel names directly (see docs/SDK.md, grandfathered)
  name: { zh: '工作许可（PTW）', en: 'Permit to Work' },
  global: 'ptw',
  requires: ['dep', 'comp'],
  uses: { train: { optional: true, why: 'offer a training course when a worker fails a certificate check' } },
  consumes: [],
  files: {
    css: ['css/ptw.css'],
    i18n: ['js/ptw/i18n.js'],
    store: ['js/ptw/store.js'],
    hooks: ['js/ptw/audit.js'],
    admin: ['js/ptw/admin.js'],
  },
  nav: { group: 'site', icon: 'warn', label: 'a.nav.ptw', after: 'a.nav.dep' },
  permissions: {
    page: 'ptw', ops: ['view', 'create', 'update', 'delete', 'export', 'approve'], descKey: 'pg.ptw', scoped: true,
    defaults: { PROJECT_ADMIN: ['view', 'create', 'update', 'export', 'approve'], HR_ADMIN: ['view', 'export'], SUBCON_USER: ['view', 'create', 'update'], MAINCON_USER: ['view', 'update', 'approve', 'export'] },
  },
  tenant: { order: 20, ready: true, defaultFor: ['ten-xinghan', 'ten-huazhu'] },
  audit: { module: 'ptw' },
  events: { prefix: 'ptw', emits: ['ptw.created', 'ptw.approved', 'ptw.rejected', 'ptw.started', 'ptw.closed', 'ptw.cancelled', 'ptw.suspended', 'ptw.resumed', 'ptw.overridden', 'ptw.swapped'], listens: ['compliance.changed'] },
  exports: ['all', 'get', 'state', 'hold', 'version'],
  points: {
    'ptw.holds': 'fn(permit) → [{ source: {zh,en}, id, title, loc }]: anything that must stop this permit being approved or started (a Critical hazard open at its site)',
    'ptw.related': 'fn(permit) → [{ labelKey, n, goto, openKey }]: other modules\' records linked to this permit, shown on its card with a link',
  },
  storage: ['bs_ptw_proto_v1'],
  reset: true,
});
