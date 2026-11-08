/* Connects the audit log to the stores: each administrator action is recorded by wrapping the store method that performs it.
   Only admin actions are wrapped; punches, worker requests, confirmations and other phone-side actions are not part of the log. */
(function (BS) {
  const A = BS.audit; const hr = BS.hr;
  const o = (zh, en) => ({ zh, en: en == null ? zh : en });
  const empObj = (no) => { const e = hr.emp(no); return e ? o(`${e.name} / ${e.empNo}`, `${e.nameEn || e.name} / ${e.empNo}`) : o(String(no)); };
  const siteObj = (s) => (s ? o(`工区 ${s.zh} / ${s.code}`, `Site ${s.en || s.zh} / ${s.code}`) : null);
  const prjObj = (p) => (p ? o(`${p.zh} / ${p.code}`, `${p.en || p.zh} / ${p.code}`) : null);
  const coObj = (c) => (c ? o(c.name, c.nameEn || c.name) : null);
  const slipObj = (id) => { const s = BS.payroll.slip(id); const e = s && hr.emp(s.empNo); return s ? o(`${e ? e.name : s.empNo} / ${s.empNo} 工资单 ${s.month}`, `${e ? e.nameEn || e.name : s.empNo} / ${s.empNo} payslip ${s.month}`) : o(String(id)); };
  const copy = (x) => (x ? JSON.parse(JSON.stringify(x)) : x);
  const W = (store, name, spec) => A.wrap(store, name, spec);

  // ----- 人员管理 -----
  W(hr, 'create', { module: 'people', type: 'create', object: (a, r) => (r && r.emp ? empObj(r.emp.empNo) : null) });
  W(hr, 'update', { module: 'people', type: 'update', object: (a) => empObj(a[0]) });
  W(hr, 'setStatus', { module: 'people', type: (a) => (a[1] === 'disabled' ? 'disable' : 'enable'), object: (a) => empObj(a[0]) });
  W(hr, 'second', { module: 'people', type: 'second', object: (a) => empObj(a[0]) });
  W(hr, 'setProjectRole', { module: 'people', type: 'update', object: (a) => empObj(a[0]) });
  W(hr, 'assignTo', { module: 'people', type: 'update', object: (a) => empObj(a[0]) });
  W(hr, 'commitImport', { module: 'people', type: 'import', object: (a, r) => (r && r.ok ? o(`批量导入 ${r.n} 人`, `Bulk import of ${r.n} people`) : null) });
  W(hr, 'saveTrade', { module: 'people', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.ok ? o(`工种 ${a[0].zh}`, `Trade ${a[0].en}`) : null) });
  // ----- 项目与工区 -----
  W(hr, 'saveProject', { module: 'project', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => prjObj(r && r.project) });
  W(hr, 'completeProject', { module: 'project', type: 'complete', object: (a) => prjObj(hr.project(a[0])) });
  W(hr, 'extendProject', { module: 'project', type: 'adjust', object: (a) => prjObj(hr.project(a[0])) });
  W(hr, 'saveSite', { module: 'project', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => siteObj(r && r.site) });
  W(hr, 'setSiteActive', { module: 'project', type: (a) => (a[1] ? 'enable' : 'disable'), object: (a) => siteObj(hr.site(a[0])) });
  W(hr, 'deleteSite', { module: 'project', type: 'delete', before: (key) => copy(hr.site(key)), object: (a, r, b) => siteObj(b) });
  // ----- 客户与分包商 -----
  W(hr, 'saveCompany', { module: 'client', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => coObj(r && r.company) });
  W(hr, 'deleteCompany', { module: 'client', type: 'delete', before: (id) => copy(hr.company(id)), object: (a, r, b) => coObj(b) });
  // ----- 证书管理 -----
  W(hr, 'addCert', { module: 'cert', type: 'create', object: (a, r) => { const e = hr.emp(a[0].empNo); const ty = hr.certType(a[0].type); return r && r.ok ? o(`${e.name} / ${e.empNo} ${ty.zh}`, `${e.nameEn || e.name} / ${e.empNo} ${ty.en}`) : null; } });
  W(hr, 'updateCert', { module: 'cert', type: 'update', object: (a, r) => { const e = hr.emp(a[0]); const c = hr.certsOf(a[0]).find((x) => x.id === a[1]); const ty = c && hr.certType(c.type); return e && ty ? o(`${e.name} / ${e.empNo} ${ty.zh}`, `${e.nameEn || e.name} / ${e.empNo} ${ty.en}`) : null; } });
  W(hr, 'saveCertType', { module: 'cert', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.certType ? o(`证书类型 ${r.certType.zh}`, `Certificate type ${r.certType.en}`) : null) });
  // ----- 考勤管理 -----
  W(BS.att, 'saveGroup', { module: 'attendance', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.group ? o(`考勤组 ${r.group.nameZh}`, `Attendance group ${r.group.nameEn}`) : null) });
  W(BS.att, 'removeGroup', { module: 'attendance', type: 'delete', before: (id) => copy(BS.att.group(id)), object: (a, r, b) => (b ? o(`考勤组 ${b.nameZh}`, `Attendance group ${b.nameEn}`) : null) });
  W(BS.att, 'adjust', { module: 'attendance', type: 'adjust', when: (a) => (a[2] || {}).by !== 'worker', object: (a) => { const e = hr.emp(a[0]); return e ? o(`${e.name} / ${e.empNo} ${a[1]}`, `${e.nameEn || e.name} / ${e.empNo} ${a[1]}`) : null; } });
  // ----- 薪资发放 -----
  W(BS.payroll, 'generate', { module: 'payroll', type: 'generate', object: (a) => o(`工资月份 ${a[0]}`, `Payroll month ${a[0]}`) });
  W(BS.payroll, 'verify', { module: 'payroll', type: 'verify', object: (a) => slipObj(a[0]) });
  W(BS.payroll, 'verifyAll', { module: 'payroll', type: 'verify', object: (a, r) => o(`批量核对 ${(a[0] || []).length} 张工资单`, `Verified ${(a[0] || []).length} payslips`) });
  W(BS.payroll, 'resolve', { module: 'payroll', type: 'adjust', object: (a) => slipObj(a[0]) });
  W(BS.payroll, 'pay', { module: 'payroll', type: 'pay', object: (a) => slipObj(a[0]) });
  W(BS.pay, 'save', { module: 'payroll', type: (a) => (a[0].id ? 'update' : 'create'), object: (a, r) => (r && r.tpl ? o(`薪资模板 ${r.tpl.nameZh}`, `Pay template ${r.tpl.nameEn || r.tpl.nameZh}`) : null) });
  W(BS.pay, 'remove', { module: 'payroll', type: 'delete', before: (id) => copy(BS.pay.template(id)), object: (a, r, b) => (b ? o(`薪资模板 ${b.nameZh}`, `Pay template ${b.nameEn || b.nameZh}`) : null) });
  const cpfObj = (id, pre) => { const r = BS.cpf.rule(id); if (!r) return null; const g = r.group === 'citizen' ? ['公民', 'Citizen'] : ['永久居民', 'PR']; const tail = [r.stage, r.band].filter(Boolean).join(' · '); return o(`${pre ? '公积金默认规则' : '公积金规则'} ${g[0]} · ${tail}`, `${pre ? 'CPF default rule' : 'CPF rule'} ${g[1]} · ${tail}`); };
  W(BS.cpf, 'update', { module: 'payroll', type: 'update', object: (a) => cpfObj(a[0]) });
  W(BS.cpf, 'setDefault', { module: 'payroll', type: 'update', object: (a) => cpfObj(a[0], true) });
  W(BS.cpf, 'bulkUpdate', { module: 'payroll', type: 'update', object: (a) => o(`公积金规则批量调整 ${(a[0] || []).length} 项`, `CPF bulk change of ${(a[0] || []).length} rules`) });
  // ----- 请假管理 -----
  W(BS.leave, 'adjust', { module: 'leave', type: 'adjust', object: (a) => { const d = a[0] || {}; const n = (d.empNos || []).length; return n === 1 ? (() => { const e = hr.emp(d.empNos[0]); return o(`请假额度 ${e.name} / ${e.empNo}`, `Leave quota ${e.nameEn || e.name} / ${e.empNo}`); })() : o(`请假额度批量调整 ${n} 人`, `Leave quota change for ${n} people`); } });
  W(BS.leaveReq, 'decide', { module: 'leave', type: (a) => (a[1] === 'approve' ? 'approve' : 'reject'), when: (a) => (a[2] || {}).by && a[2].by.role === 'admin', object: (a) => o(`请假单 ${a[0]}`, `Leave request ${a[0]}`) });
  W(BS.leaveReq, 'create', { module: 'leave', type: 'create', when: (a) => (a[0] || {}).by && a[0].by.role === 'admin', object: (a, r) => (r && r.ok && r.request ? o(`代提请假单 ${r.request.id}`, `Leave request ${r.request.id} (on behalf)`) : r && r.id ? o(`代提请假单 ${r.id}`, `Leave request ${r.id} (on behalf)`) : o('代提请假单', 'Leave request (on behalf)')) });
  // ----- 租户管理 -----
  const tnObj = (id) => { const t = BS.tenant.tenant(id); return t ? o(t.name) : o(String(id)); };
  W(BS.tenant, 'saveTenant', { module: 'tenant', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.tenant ? o(r.tenant.name) : a[1] ? tnObj(a[1]) : o(a[0].name)) });
  W(BS.tenant, 'setStatus', { module: 'tenant', type: (a) => (a[1] === 'active' ? 'enable' : 'disable'), object: (a) => tnObj(a[0]) });
  W(BS.tenant, 'createSub', { module: 'tenant', type: 'create', object: (a) => { const t = BS.tenant.tenant(a[0].tenantId); return o(`订阅 ${t ? t.name : a[0].tenantId}`, `Subscription ${t ? t.name : a[0].tenantId}`); } });
  W(BS.tenant, 'renew', { module: 'tenant', type: 'renew', object: (a) => tnObj(a[0]) });
  W(BS.tenant, 'adjustSeats', { module: 'tenant', type: 'adjust', object: (a) => o(`可用人数 ${tnObj(a[0]).zh}`, `Seats ${tnObj(a[0]).zh}`) });
  W(BS.tenant, 'cancelSub', { module: 'tenant', type: 'cancel', object: (a) => o(`订阅 ${tnObj(a[0]).zh}`, `Subscription ${tnObj(a[0]).zh}`) });
  // ----- 部署与合规 -----
  const dpObj = (id) => { const x = BS.dep.get(id); const e = x && hr.emp(x.empNo); return x ? o(`部署 ${x.id} ${e ? e.name : ''} / ${x.empNo}`, `Deployment ${x.id} ${e ? e.nameEn || e.name : ''} / ${x.empNo}`) : o(String(id)); };
  W(BS.dep, 'request', { module: 'deployment', type: 'create', object: (a, r) => (r && r.dep ? dpObj(r.dep.id) : null) });
  W(BS.dep, 'accept', { module: 'deployment', type: 'approve', object: (a) => dpObj(a[0]) });
  W(BS.dep, 'reject', { module: 'deployment', type: 'reject', object: (a) => dpObj(a[0]) });
  W(BS.dep, 'end', { module: 'deployment', type: 'end', object: (a) => dpObj(a[0]) });
  W(BS.dep, 'block', { module: 'deployment', type: 'block', object: (a) => dpObj(a[0]) });
  W(BS.dep, 'unblock', { module: 'deployment', type: 'unblock', object: (a) => dpObj(a[0]) });
  W(BS.comp, 'saveBase', { module: 'deployment', type: 'update', object: () => o('合规基本要求', 'Compliance base requirements') });
  W(BS.comp, 'savePermit', { module: 'deployment', type: 'update', object: (a) => { const p = BS.comp.permitType(a[0]); return p ? o(`作业证书要求 ${p.zh}`, `Certificates for ${p.en}`) : null; } });
  W(BS.tenant, 'setModules', { module: 'tenant', type: 'update', object: (a) => o(`租户模块 ${tnObj(a[0]).zh}`, `Tenant modules ${tnObj(a[0]).zh}`) });
  // ----- 工作许可 -----
  const ptObj = (id) => { const x = BS.ptw.get(id); return x ? o(`工作许可 ${x.id} ${x.title}`, `Permit ${x.id} ${x.title}`) : o(String(id)); };
  W(BS.ptw, 'create', { module: 'ptw', type: 'create', object: (a, r) => (r && r.permit ? ptObj(r.permit.id) : null) });
  W(BS.ptw, 'approve', { module: 'ptw', type: 'approve', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'reject', { module: 'ptw', type: 'reject', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'start', { module: 'ptw', type: 'update', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'close', { module: 'ptw', type: 'complete', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'cancel', { module: 'ptw', type: 'cancel', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'swap', { module: 'ptw', type: 'update', object: (a) => ptObj(a[0]) });
  W(BS.ptw, 'override', { module: 'ptw', type: 'adjust', object: (a) => ptObj(a[0]) });
  W(hr, 'setDocExpiry', { module: 'people', type: 'update', object: (a) => empObj(a[0]) });
  // ----- 培训预订 -----
  const TR = BS.train; const bkObj = (id) => { const b = TR.request(id); return b ? o(`培训报名 ${b.id} ${b.title}`, `Enrolment ${b.id} ${b.title}`) : o(String(id)); };
  W(TR, 'createRequest', { module: 'training', type: 'create', object: (a, r) => (r && r.request ? bkObj(r.request.id) : null) });
  W(TR, 'ask', { module: 'training', type: 'create', object: (a, r) => (r && r.request ? bkObj(r.request.id) : null) });
  W(TR, 'approve', { module: 'training', type: 'approve', object: (a) => bkObj(a[0]) });
  W(TR, 'decline', { module: 'training', type: 'reject', object: (a) => bkObj(a[0]) });
  W(TR, 'register', { module: 'training', type: 'update', object: (a) => bkObj(a[0]) });
  W(TR, 'confirm', { module: 'training', type: 'update', object: (a) => bkObj(a[0]) });
  W(TR, 'setTrainees', { module: 'training', type: 'update', object: (a) => bkObj(a[0]) });
  W(TR, 'cancel', { module: 'training', type: 'cancel', object: (a) => bkObj(a[0]) });
  W(TR, 'complete', { module: 'training', type: 'complete', object: (a) => bkObj(a[0]) });
  // ----- 激励与钱包 -----
  const WL = BS.wallet; const wlObj = (no) => { const e = hr.emp(no); return e ? o(`积分钱包 ${e.name} / ${e.empNo}`, `Wallet ${e.nameEn || e.name} / ${e.empNo}`) : o(String(no)); };
  W(WL, 'award', { module: 'wallet', type: 'award', object: (a) => wlObj(a[0]) });
  W(WL, 'deduct', { module: 'wallet', type: 'deduct', object: (a) => wlObj(a[0]) });
  W(WL, 'reverse', { module: 'wallet', type: 'reverse', object: (a, r) => (r && r.entry ? wlObj(r.entry.empNo) : null) });
  W(WL, 'redeem', { module: 'wallet', type: 'redeem', when: (a) => !a[3] || a[3] !== a[0], object: (a) => wlObj(a[0]) });
  W(WL, 'saveRules', { module: 'wallet', type: 'update', object: () => o('激励规则', 'Incentive rules') });
  W(WL, 'grant', { module: 'wallet', type: 'award', object: (a) => wlObj(a[0]) });
  W(WL, 'addRate', { module: 'wallet', type: 'update', object: (a) => o(`积分汇率 ${a[0].from}`, `Points rate ${a[0].from}`) });
  // ----- 宿舍床位 -----
  const DM = BS.dorm; const dlObj = (id) => { const l = DM.lease(id); const e = l && hr.emp(l.empNo); const d = l && DM.dorm(l.dormId); return l ? o(`宿舍租约 ${l.id} ${e ? e.name : l.empNo} · ${d.zh}`, `Bed lease ${l.id} ${e ? e.nameEn || e.name : l.empNo} · ${d.en}`) : o(String(id)); };
  W(DM, 'allocate', { module: 'dorm', type: 'create', object: (a, r) => (r && r.leases ? o(`宿舍床位分配 ${r.leases.length} 人`, `Bed allocation for ${r.leases.length} people`) : null) });
  W(DM, 'confirm', { module: 'dorm', type: 'confirm', object: (a) => dlObj(a[0]) });
  W(DM, 'cancel', { module: 'dorm', type: 'cancel', object: (a) => dlObj(a[0]) });
  W(DM, 'end', { module: 'dorm', type: 'end', object: (a) => dlObj(a[0]) });
  // ----- 转转乐 -----
  const SP = BS.spin; const spObj = (no) => { const e = hr.emp(no); return e ? o(`转转乐 ${e.name} / ${e.empNo}`, `Spin & win ${e.nameEn || e.name} / ${e.empNo}`) : o(String(no)); };
  W(SP, 'spin', { module: 'spin', type: 'award', object: (a) => spObj(a[0]) });
  W(SP, 'adjust', { module: 'spin', type: 'adjust', object: (a) => spObj(a[0]) });
  W(SP, 'saveConfig', { module: 'spin', type: 'update', object: () => o('代币与连签规则', 'Token and streak rules') });
  W(SP, 'savePrizes', { module: 'spin', type: 'update', object: () => o('转盘奖品与预算', 'Wheel prizes and budget') });
  W(SP, 'recordReferral', { module: 'spin', type: 'create', object: (a, r) => (r && r.referral ? o(`邀请记录 ${r.referral.id}`, `Referral ${r.referral.id}`) : null) });
  W(SP, 'voidReferral', { module: 'spin', type: 'cancel', object: (a) => o(`邀请记录 ${a[0]}`, `Referral ${a[0]}`) });
  // ----- 现场群聊看板 -----
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
  // ----- 报销审核 -----
  W(BS.store, 'review', { module: 'reimb', type: (a) => (a[1] === 'approve' ? 'approve' : 'reject'), object: (a) => o(`报销单 ${a[0]}`, `Reimbursement ${a[0]}`) });
  // ----- 通知管理 -----
  W(BS.notice, 'publish', { module: 'notice', type: 'publish', object: (a, r) => (r && r.notice ? o(r.notice.titleZh, r.notice.titleEn) : null) });
  W(BS.notice, 'remove', { module: 'notice', type: 'delete', before: (id) => copy(BS.notice.get(id)), object: (a, r, b) => (b ? o(b.titleZh, b.titleEn) : null) });
  // ----- 权限管理 -----
  const P = BS.perm;
  W(P, 'saveRole', { module: 'system', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.role ? o(`角色 ${r.role.name}`, `Role ${r.role.nameEn}`) : null) });
  W(P, 'savePermissions', { module: 'system', type: 'adjust', object: (a) => { const r = P.role(a[0]); return r ? o(`角色权限 ${r.name}`, `Role permissions ${r.nameEn}`) : null; } });
  W(P, 'deleteRole', { module: 'system', type: 'delete', before: (id) => copy(P.role(id)), object: (a, r, b) => (b ? o(`角色 ${b.name}`, `Role ${b.nameEn}`) : null) });
  W(P, 'saveAccount', { module: 'system', type: (a, r) => (a[1] ? (a[0].status === 'disabled' ? 'disable' : 'update') : 'create'), object: (a, r) => (r && r.account ? o(`管理员 ${r.account.id}`, `Administrator ${r.account.id}`) : null) });
  W(P, 'resetPassword', { module: 'system', type: 'update', object: (a) => o(`管理员 ${a[0]} 重置密码`, `Administrator ${a[0]} password reset`) });
  // ----- 系统与三方配置 -----
  const SY = BS.sys; const svcObj = (id) => { const s = SY.service(id); return s ? o(`第三方服务 ${s.zh}`, `Service ${s.en}`) : null; };
  W(SY, 'saveService', { module: 'system', type: 'update', object: (a) => svcObj(a[0]) });
  W(SY, 'setServiceEnabled', { module: 'system', type: (a) => (a[1] ? 'enable' : 'disable'), object: (a) => svcObj(a[0]) });
  W(SY, 'saveContent', { module: 'system', type: 'update', object: (a) => { const c = SY.content(a[0]); return c ? o(`用户端内容 ${c.titleZh}`, `App content ${c.titleEn}`) : null; } });
  W(SY, 'saveDict', { module: 'system', type: (a) => (a[2] ? 'update' : 'create'), object: (a, r) => (r && r.item ? o(`字典 ${SY.DICTS.find((d) => d.id === a[0]) && r.item.zh}`, `Dictionary ${r.item.en}`) : null) });
  W(SY, 'deleteDict', { module: 'system', type: 'delete', before: (type, id) => copy(SY.dictItem(type, id)), object: (a, r, b) => (b ? o(`字典 ${b.zh}`, `Dictionary ${b.en}`) : null) });
  // ----- 内容配置 -----
  W(BS.content, 'savePopup', { module: 'content', type: 'update', object: (a, r) => (r && r.popup ? o(`弹窗内容 ${r.popup.zh}`, `Pop-up ${r.popup.en}`) : null) });
  W(BS.content, 'saveReminder', { module: 'content', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.reminder ? o(`安全提醒 ${r.reminder.titleZh}`, `Safety reminder ${r.reminder.titleEn}`) : null) });
  W(BS.content, 'setDefault', { module: 'content', type: 'update', object: (a) => { const r = BS.content.reminder(a[0]); return r ? o(`默认安全提醒 ${r.titleZh}`, `Default safety reminder ${r.titleEn}`) : null; } });
  W(BS.content, 'removeReminder', { module: 'content', type: 'delete', before: (id) => copy(BS.content.reminder(id)), object: (a, r, b) => (b ? o(`安全提醒 ${b.titleZh}`, `Safety reminder ${b.titleEn}`) : null) });
  // ----- 问卷管理 -----
  W(BS.survey, 'saveBasic', { module: 'survey', type: (a) => (a[1] ? 'update' : 'create'), object: (a, r) => (r && r.survey ? o(r.survey.zh, r.survey.en) : null) });
  W(BS.survey, 'publish', { module: 'survey', type: 'publish', object: (a) => { const s = BS.survey.get(a[0]); return s ? o(s.zh, s.en) : null; } });
  W(BS.survey, 'remove', { module: 'survey', type: 'delete', before: (id) => copy(BS.survey.get(id)), object: (a, r, b) => (b ? o(b.zh, b.en) : null) });
})(window.BS);
