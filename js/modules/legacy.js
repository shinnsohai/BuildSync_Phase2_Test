/* Older modules that have no manifest yet. Only their public API is registered, so a module that has a manifest can reach them through BS.modules.api(id)
   and the platform can tell the difference between "a module is missing" and "a method is missing". Move each of these to a manifest when it is next worked on. */
(function (BS) {
  const M = BS.modules;
  M.adopt('dep', { domain: 'site', name: { zh: '部署与合规', en: 'Deployments & compliance' }, exports: ['list', 'phase', 'subconOf', 'subcontractors', 'mainContractors', 'subscribe'] });
  M.adopt('comp', { domain: 'account', name: { zh: '合规引擎', en: 'Compliance engine' }, exports: ['fit', 'permitType', 'PERMIT', 'subscribe'] });
  M.adopt('train', { domain: 'account', name: { zh: '培训中心预订', en: 'Training hub' }, exports: ['pendingFor', 'courseForCert', 'subscribe'] });
  M.adopt('wallet', { domain: 'account', name: { zh: '激励与钱包', en: 'Incentives & wallets' }, exports: ['rule', 'rules', 'award', 'deduct', 'points', 'reverse', 'subscribe'] });
})(window.BS);
