/* Admin module: 请假管理 — hosts the 请假审批 and 请假额度汇总 tabs. */
(function (BS) {
  BS.registerAdmin({
    id: 'leave', nav: 'a.nav.leave', stores: [BS.leave, BS.leaveReq],
    tabs: [{ id: 'approve', k: 'l.tab.approve' }, { id: 'check', k: 'l.tab.check' }, { id: 'rules', k: 'l.tab.rules', live: false }, { id: 'quota', k: 'l.tab.quota' }],
    create(ctx) {
      let tab = 'approve';
      const nav = { to(id) { tab = id; ctx.rerender(); } };
      const parts = { approve: BS.leaveParts.approve(ctx), check: BS.leaveParts.check(ctx, nav), quota: BS.leaveParts.quota(ctx) };
      const cur = () => parts[tab];
      return {
        get tab() { return tab; },
        set tab(v) { if (parts[tab].onEscape) parts[tab].onEscape(); tab = v; },
        crumbs: () => cur().crumbs(),
        page: () => cur().page(),
        modal: () => cur().modal(),
        afterRender: (v) => cur().afterRender && cur().afterRender(v),
        onInput: (e) => cur().onInput && cur().onInput(e),
        onSubmit: (e) => cur().onSubmit && cur().onSubmit(e),
        onEscape: () => (cur().onEscape ? cur().onEscape() : false),
        onStore: (evt) => ctx.rerender(evt),
        onClick: (a, b, e) => cur().onClick(a, b, e),
        reset() { Object.values(parts).forEach((p) => p.reset && p.reset()); tab = 'approve'; },
      };
    },
  });
})(window.BS);
