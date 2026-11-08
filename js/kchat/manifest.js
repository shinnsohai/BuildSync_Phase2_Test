/* Site chat & Kanban: what this module is, in plain data. The platform reads this; nothing here runs. See docs/MODULES.md. */
BS.modules.define({
  id: 'kchat', version: '1.5.0', domain: 'site',
  sdk: '^1.0.0', sdkOnly: false,   // written for contract 1.x; still uses some kernel names directly (see docs/SDK.md, grandfathered)
  name: { zh: '现场群聊看板', en: 'Site chat & Kanban' },
  global: 'kchat', globals: ['kchatUI', 'kchatEmoji'],
  requires: [],
  uses: {
    ptw: { optional: true, why: 'link a High or Critical safety card to the permit running at the site' },
    wallet: { optional: true, why: 'pay hazard-star points to the person who reported a hazard' },
  },
  files: {
    css: ['css/kchat.css'],
    i18n: ['js/kchat/i18n.js', 'js/kchat/i18n-ops.js', 'js/kchat/i18n-social.js'],
    store: ['js/kchat/emoji.js', 'js/kchat/ui.js', 'js/kchat/store.js', 'js/kchat/ops.js', 'js/kchat/social.js', 'js/kchat/integration.js'],
    hooks: ['js/kchat/audit.js'],
    phone: ['js/kchat/worker.js'],
    admin: ['js/kchat/admin.js'],
  },
  nav: { group: 'site', icon: 'mega', label: 'a.nav.kchat', after: 'a.nav.ptw' },
  permissions: {
    page: 'kchat', ops: ['view', 'create', 'update', 'delete', 'export', 'approve'], descKey: 'pg.kchat', scoped: false,
    defaults: { PROJECT_ADMIN: ['view', 'create', 'update', 'delete', 'export', 'approve'], HR_ADMIN: ['view', 'export'] },
  },
  tenant: { order: 70, ready: true, defaultFor: ['ten-xinghan', 'ten-huazhu'] },
  audit: { module: 'kchat' },
  events: { prefix: 'kchat', emits: ['kchat.message', 'kchat.card.created', 'kchat.card.moved', 'kchat.card.closed', 'kchat.card.deleted', 'kchat.card.escalated', 'kchat.card.rejected', 'kchat.card.spot'], listens: [] },
  phone: { tiles: [{ icon: 'mega', label: 'w.tile.chat', act: 'open-kc', order: 100 }] },
  exports: ['openCount', 'card', 'cards', 'permitCards', 'permitHoldCards', 'version'],
  provides: ['ptw.holds', 'ptw.related'],
  storage: ['bs_kchat_proto_v1'],
  reset: true,
});
