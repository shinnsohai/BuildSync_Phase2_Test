/* What the site chat gives to other modules. This is the only file in the module that registers extension points, so reading it tells you
   exactly how the rest of the platform can reach into the chat. The permit module never calls BS.kchat; it asks "what stops this permit?" and whoever answers is shown. */
(function (BS) {
  const K = BS.kchat; const M = BS.modules;
  /** a Critical safety card open at the permit's site stops the permit (switchable in the chat's settings) */
  M.extend('ptw.holds', 'kchat', (p) => K.permitHoldCards(p).map((c) => ({ source: { zh: '现场群聊', en: 'Site chat' }, id: c.id, title: c.title, loc: c.loc, goto: 'kchat', openKey: 'kc.ptw.open' })));
  /** open safety cards linked to the permit are listed on the permit card with a link to the board */
  M.extend('ptw.related', 'kchat', (p) => { const n = K.permitCards(p.id).length; return n ? [{ labelKey: 'kc.ptw.cards', n, goto: 'kchat', openKey: 'kc.ptw.open' }] : []; });
})(window.BS);
