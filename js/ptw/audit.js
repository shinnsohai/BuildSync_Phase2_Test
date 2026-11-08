/* Permit to Work: which of its actions the audit log records. Loaded in the hooks slot, after the audit log exists. */
(function (BS) {
  const A = BS.audit; const o = (zh, en) => ({ zh, en: en == null ? zh : en });
  const W = (store, name, spec) => A.wrap(store, name, spec);
  const ptObj = (id) => { const x = BS.ptw.get(id); return x ? o(`工作许可 ${x.id} ${x.title}`, `Permit ${x.id} ${x.title}`) : o(String(id)); };
  W(BS.ptw, 'create', { module: 'ptw', type: 'create', object: (a, r) => (r && r.permit ? ptObj(r.permit.id) : null) });
  W(BS.ptw, 'approve', { module: 'ptw', type: 'approve', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'reject', { module: 'ptw', type: 'reject', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'start', { module: 'ptw', type: 'update', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'close', { module: 'ptw', type: 'complete', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'cancel', { module: 'ptw', type: 'cancel', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'swap', { module: 'ptw', type: 'update', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'override', { module: 'ptw', type: 'adjust', object: (a) => ptObj(a[0]) });
})(window.BS);
