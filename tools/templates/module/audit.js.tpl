// @ts-check
/* Which actions of __EN__ the audit log records. Loaded after the audit log exists. Only administrator actions are recorded, not the phone's. */
(function (BS) {
  const sdk = BS.sdk; const m = () => BS.__ID__;
  const o = (zh, en) => ({ zh, en });
  const label = (id) => { const x = m().item(id); return x ? o(`__ZH__ ${x.id} ${x.title}`, `__EN__ ${x.id} ${x.title}`) : o(String(id)); };
  sdk.audit.watch(m(), 'create', { module: '__ID__', type: 'create', object: (a, r) => (r && r.item ? label(r.item.id) : null) });
  sdk.audit.watch(m(), 'update', { module: '__ID__', type: 'update', object: (a) => label(a[0]) });
  sdk.audit.watch(m(), 'setStatus', { module: '__ID__', type: (a) => (a[1] === 'done' ? 'complete' : 'update'), object: (a) => label(a[0]) });
  sdk.audit.watch(m(), 'remove', { module: '__ID__', type: 'delete', before: (id) => m().item(id) && { ...m().item(id) }, object: (a, r, b) => (b ? o(`__ZH__ ${b.id} ${b.title}`, `__EN__ ${b.id} ${b.title}`) : null) });
})(window.BS);
