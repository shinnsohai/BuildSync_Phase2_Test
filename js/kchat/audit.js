/* Site chat: which of its actions the audit log records. Loaded in the hooks slot, after the audit log exists. */
(function (BS) {
  const A = BS.audit; const o = (zh, en) => ({ zh, en: en == null ? zh : en });
  const W = (store, name, spec) => A.wrap(store, name, spec);
  const KC = BS.kchat; const kcObj = (id) => { const c = KC.card(id); return c ? o(`看板卡片 ${c.id} ${c.title}`, `Kanban card ${c.id} ${c.title}`) : o(String(id)); };
  W(KC, 'createCard', { module: 'kchat', type: 'create', object: (a, r) => (r && r.card ? kcObj(r.card.id) : null) });
  W(KC, 'moveCard', { module: 'kchat', type: 'update', object: (a) => kcObj(a[0]) });
  W(KC, 'closeCard', { module: 'kchat', type: 'complete', object: (a) => kcObj(a[0]) });
  W(KC, 'assignCard', { module: 'kchat', type: 'update', object: (a) => kcObj(a[0]) });
  W(KC, 'saveSettings', { module: 'kchat', type: 'update', object: () => o('关闭证据规则', 'Closure evidence rules') });
  W(KC, 'updateCard', { module: 'kchat', type: 'update', object: (a) => kcObj(a[0]) });
  W(KC, 'deleteCard', { module: 'kchat', type: 'delete', before: (id) => KC.card(id) && { ...KC.card(id) }, object: (a, r, b) => (b ? o(`看板卡片 ${b.id} ${b.title}`, `Kanban card ${b.id} ${b.title}`) : null) });
  W(KC, 'consolidate', { module: 'kchat', type: 'generate', object: () => o('合并所有群聊消息', 'Consolidate all chats') });
  W(KC, 'digest', { module: 'kchat', type: 'generate', object: (a, r) => (r && r.digest ? o(`每日 EHS 简报 ${r.digest.id} ${r.digest.date}`, `Daily EHS digest ${r.digest.id} ${r.digest.date}`) : null) });
  W(KC, 'createRoom', { module: 'kchat', type: 'create', object: (a, r) => (r && r.id ? o(`聊天群 ${a[0].nameZh || a[0].nameEn}`, `Chat room ${a[0].nameEn || a[0].nameZh}`) : null) });
  W(KC, 'updateRoom', { module: 'kchat', type: 'update', object: (a) => o(`聊天群 ${a[0]}`, `Chat room ${a[0]}`) });
  W(KC, 'appoint', { module: 'kchat', type: 'create', object: (a, r) => (r && r.appointment ? o(`聊天任命 ${r.appointment.id} ${a[0].role}`, `Chat appointment ${r.appointment.id} ${a[0].role}`) : null) });
  W(KC, 'endAppointment', { module: 'kchat', type: 'update', object: (a) => o(`结束任命 ${a[0]}`, `End appointment ${a[0]}`) });
  W(KC, 'rejectCard', { module: 'kchat', type: 'reject', object: (a) => kcObj(a[0]) });
  W(KC, 'spotCheck', { module: 'kchat', type: 'verify', object: (a) => kcObj(a[0]) });
  W(KC, 'resolveHeld', { module: 'kchat', type: 'update', object: (a) => o(`待确认消息 ${a[0]}`, `Held message ${a[0]}`) });
  W(KC, 'forward', { module: 'kchat', type: 'create', object: (a) => o(`转发消息 ${a[0]}`, `Forwarded message ${a[0]}`) });
  W(KC, 'pin', { module: 'kchat', type: 'update', object: (a) => o(`置顶消息 ${a[0]}`, `Pinned message ${a[0]}`) });
  W(KC, 'unpin', { module: 'kchat', type: 'update', object: (a) => o(`取消置顶 ${a[0]}`, `Unpinned message ${a[0]}`) });
  W(KC, 'addMark', { module: 'kchat', type: 'create', object: (a) => o(`照片标记 ${a[0]}`, `Photo markup ${a[0]}`) });
  W(KC, 'removeMark', { module: 'kchat', type: 'delete', object: (a) => o(`删除照片标记 ${a[0]}`, `Removed photo markup ${a[0]}`) });
  W(KC, 'reportHazard', { module: 'kchat', type: 'create', object: (a, r) => (r && r.message ? o(`点选报告 ${r.message.id}`, `Tap report ${r.message.id}`) : null) });
})(window.BS);
