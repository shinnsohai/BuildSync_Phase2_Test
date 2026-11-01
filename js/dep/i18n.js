/* Strings: Phase 2 foundations — deployments, compliance rules, event log, party types, module entitlements. Loaded after the Phase 1 string files. */
(function (BS) {
  const D = BS.D;
  // ---------- navigation and permission pages ----------
  D('a.nav.dep', '部署与合规', 'Deployments & compliance');
  D('a.nav.g.overview', '总览', 'Overview'); D('a.nav.g.people', '人员与项目', 'People & projects'); D('a.nav.g.timepay', '考勤与薪资', 'Time & pay'); D('a.nav.g.site', '现场合规', 'Site compliance'); D('a.nav.g.welfare', '培训与福利', 'Training & welfare'); D('a.nav.g.engage', '沟通与内容', 'Engagement'); D('a.nav.g.system', '系统管理', 'System');
  D('pg.dep', '分包商人员部署、闸机准入、合规规则', 'Subcontractor deployments, gate access and compliance rules');

  // ---------- deployments ----------
  D('dep.tab.list', '人员部署', 'Deployments'); D('dep.tab.fit', '合规状态', 'Compliance status'); D('dep.tab.rules', '合规规则', 'Compliance rules'); D('dep.tab.events', '事件记录', 'Event log');
  D('dep.title', '人员部署', 'Deployments'); D('dep.sub', '分包商工人在总包商工地的部署、闸机准入与合规检查', 'Subcontractor workers placed on main contractors’ sites, with gate access and compliance checks');
  D('dep.pt.subcon', '你以分包商身份登录：只显示你公司的工人与部署，工资信息只有你能看到。', 'You are signed in as a subcontractor: only your company’s workers and deployments are shown, and wage details are visible to you alone.');
  D('dep.pt.maincon', '你以总包商身份登录：只显示部署到你工地的工人；工资、银行、联系方式等商业与个人信息已隐藏。', 'You are signed in as a main contractor: only workers deployed to your sites are shown; wages, bank and contact details are hidden.');
  D('dep.k.active', '在岗部署', 'Active'); D('dep.k.granted', '闸机准入', 'Gate open'); D('dep.k.blocked', '闸机拦截', 'Gate closed'); D('dep.k.requested', '待总包商确认', 'Awaiting acceptance');
  D('dep.f.kw', '姓名 / 工号', 'Name / employee no.'); D('dep.f.sub', '分包商', 'Subcontractor'); D('dep.f.main', '总包商', 'Main contractor'); D('dep.f.state', '部署状态', 'Deployment status'); D('dep.f.gate', '闸机', 'Gate'); D('dep.f.all', '全部', 'All');
  D('dep.c.worker', '工人', 'Worker'); D('dep.c.sub', '分包商', 'Subcontractor'); D('dep.c.main', '总包商 / 工区', 'Main contractor / site'); D('dep.c.period', '部署期间', 'Period'); D('dep.c.docs', '证件与证书', 'Documents'); D('dep.c.wage', '工资（内部）', 'Wage (internal)');
  D('dep.c.gate', '闸机准入', 'Gate'); D('dep.c.rfid', 'RFID 卡', 'RFID card'); D('dep.c.status', '部署状态', 'Status');
  D('dep.st.requested', '待总包商确认', 'Awaiting acceptance'); D('dep.st.scheduled', '待开始', 'Scheduled'); D('dep.st.active', '在岗', 'Active'); D('dep.st.ended', '已结束', 'Ended'); D('dep.st.rejected', '已拒绝', 'Rejected');
  D('dep.g.granted', '准入', 'Open'); D('dep.g.blocked', '拦截', 'Closed'); D('dep.g.none', '—', '—'); D('dep.g.manual', '总包商拦截：{r}', 'Blocked by main contractor: {r}');
  D('dep.new', '申请部署', 'New deployment'); D('dep.view', '详情', 'Details'); D('dep.accept', '确认上场', 'Accept'); D('dep.reject', '拒绝', 'Reject'); D('dep.end', '结束部署', 'End'); D('dep.block', '拦截', 'Block'); D('dep.unblock', '解除拦截', 'Unblock');
  D('dep.wage.conf', '保密', 'Confidential'); D('dep.wage.day', 'S$ {n} / 日', 'S$ {n} / day'); D('dep.wage.mon', 'S$ {n} / 月', 'S$ {n} / month');
  D('dep.none', '没有符合条件的部署', 'No deployments match'); D('dep.count', '共 {n} 条部署', '{n} deployments'); D('dep.noPeriodEnd', '至今', 'open-ended'); D('dep.docs.ok', '齐全', 'In order'); D('dep.docs.warn', '{n} 项将到期', '{n} expiring'); D('dep.docs.bad', '{n} 项不合规', '{n} not valid');
  // form
  D('dep.m.title', '申请部署', 'Request a deployment'); D('dep.m.sub', '分包商工人部署到总包商工地，需总包商确认后才能入场', 'A subcontractor’s worker placed on a main contractor’s site; the worker can enter only after the main contractor accepts');
  D('dep.f.subSel', '分包商', 'Subcontractor'); D('dep.f.worker', '工人', 'Worker'); D('dep.f.pick', '请选择', 'Choose'); D('dep.f.mainSel', '总包商', 'Main contractor'); D('dep.f.project', '项目', 'Project'); D('dep.f.site', '工区', 'Site'); D('dep.f.from', '开始日期', 'Start date'); D('dep.f.to', '结束日期（选填）', 'End date (optional)');
  D('dep.f.workerHint', '只列出该分包商名下的在职人员', 'Only active people employed by the chosen subcontractor');
  const E = (k, zh, en) => D('dep.e.' + k, zh, en);
  E('emp', '请选择在职人员', 'Choose an active person'); E('sub', '请选择分包商', 'Choose a subcontractor'); E('not_theirs', '该人员不属于所选分包商', 'This person is not employed by the chosen subcontractor'); E('main', '请选择总包商', 'Choose a main contractor');
  E('project', '请选择未完成的项目', 'Choose a project that is not finished'); E('site', '请选择该项目下启用的工区', 'Choose an active site of that project'); E('from', '请选择开始日期', 'Choose a start date'); E('from_old', '开始日期不能早于一年前', 'The start date cannot be more than a year ago');
  E('to', '结束日期无效', 'The end date is not valid'); E('to_before', '结束日期不能早于开始日期', 'The end cannot be before the start'); E('overlap', '这位人员在这段时间内已有进行中或待确认的部署', 'This person already has a live or pending deployment in that period');
  E('note', '请填写原因', 'Enter a reason'); E('note_len', '最多 120 个字', 'At most 120 characters'); E('date', '日期无效', 'The date is not valid'); E('before_start', '不能早于开始日期', 'Cannot be before the start date');
  // detail, dialogs
  D('dep.d.title', '部署详情', 'Deployment details'); D('dep.d.sub', '{id} · {name}', '{id} · {name}'); D('dep.d.worker', '工人信息', 'Worker'); D('dep.d.checks', '准入检查', 'Gate checks'); D('dep.d.allOk', '全部通过', 'All checks passed'); D('dep.d.log', '处理记录', 'History');
  D('dep.d.hidden', '以下信息对你的身份隐藏：{g}', 'Hidden from your role: {g}'); D('dep.d.nowarn', '无即将到期的证件', 'Nothing about to expire');
  D('dep.grp.identity', '基本身份', 'identity'); D('dep.grp.pass', '证件与证书', 'documents'); D('dep.grp.org', '所属公司', 'employer'); D('dep.grp.wage', '工资', 'wage'); D('dep.grp.bank', '银行', 'bank'); D('dep.grp.contact', '联系方式', 'contact'); D('dep.grp.personal', '个人资料', 'personal details');
  D('dep.log.requested', '提交部署申请', 'Requested'); D('dep.log.accepted', '总包商确认', 'Accepted'); D('dep.log.rejected', '总包商拒绝', 'Rejected'); D('dep.log.ended', '结束部署', 'Ended'); D('dep.log.blocked', '总包商拦截', 'Blocked'); D('dep.log.unblocked', '解除拦截', 'Unblocked');
  D('dep.rj.title', '拒绝部署申请', 'Reject the request'); D('dep.rj.sub', '请写明原因，分包商会看到', 'Give a reason; the subcontractor will see it'); D('dep.rj.ok', '确认拒绝', 'Reject');
  D('dep.bl.title', '拦截工人入场', 'Block this worker'); D('dep.bl.sub', '闸机将不放行这位工人，直到你解除拦截', 'The gate stays closed to this worker until you lift the block'); D('dep.bl.ok', '确认拦截', 'Block');
  D('dep.en.title', '结束部署', 'End the deployment'); D('dep.en.sub', '从所选日期起该工人不再在这个工地上', 'The worker is no longer on this site from the chosen date'); D('dep.en.date', '结束日期', 'End date'); D('dep.en.ok', '确认结束', 'End deployment');
  D('dep.note', '原因', 'Reason');
  D('dep.t.requested', '已提交部署申请，等待总包商确认', 'Request sent; waiting for the main contractor'); D('dep.t.accepted', '已确认上场并发放 RFID 卡', 'Accepted; RFID card issued'); D('dep.t.rejected', '已拒绝该申请', 'Request rejected');
  D('dep.t.ended', '部署已结束', 'Deployment ended'); D('dep.t.blocked', '已拦截该工人', 'Worker blocked'); D('dep.t.unblocked', '已解除拦截', 'Block lifted'); D('dep.t.stale', '这条部署的状态已变化，请刷新后再试', 'This deployment has changed; please look again');
  D('dep.proto', '原型提示：闸机、RFID 刷卡与总包商/分包商登录均为模拟。可用左下角账号菜单切换到“华东劳务 周经理”（分包商）或“Pinnacle 项目协调员”（总包商）查看各自可见的内容。', 'Prototype: the gate, RFID taps and external logins are simulated. Use the account menu at the bottom left to switch to “Huadong Labour — Manager Zhou” (subcontractor) or “Pinnacle — Site coordinator” (main contractor) and see what each can see.');

  // ---------- compliance ----------
  D('cp.title', '合规状态', 'Compliance status'); D('cp.sub', '谁今天可以上场：护照、工作准证与必备证书的检查结果', 'Who may work today: the result of the passport, work pass and required certificate checks');
  D('cp.k.total', '检查人数', 'People checked'); D('cp.k.ok', '合规', 'In order'); D('cp.k.soon', '即将到期', 'Expiring soon'); D('cp.k.blocked', '不合规', 'Not valid');
  D('cp.s.ok', '合规', 'In order'); D('cp.s.soon', '即将到期', 'Expiring'); D('cp.s.blocked', '不合规', 'Not valid');
  D('cp.f.permit', '按作业类型检查', 'Check for work type'); D('cp.f.base', '仅基本要求', 'Base requirements only'); D('cp.f.state', '状态', 'Status'); D('cp.f.kw', '姓名 / 工号', 'Name / employee no.');
  D('cp.c.person', '人员', 'Person'); D('cp.c.status', '状态', 'Status'); D('cp.c.reasons', '原因 / 提醒', 'Reasons / warnings'); D('cp.c.deploy', '部署', 'Deployment'); D('cp.none', '没有符合条件的人员', 'No one matches'); D('cp.allgood', '无', 'None');
  D('cp.r.inactive.expired', '账号已停用', 'Account is disabled'); D('cp.r.passport.missing', '缺少护照信息', 'Passport details missing'); D('cp.r.passport.expired', '护照已于 {d} 过期', 'Passport expired on {d}');
  D('cp.r.pass.missing', '缺少工作准证信息', 'Work pass details missing'); D('cp.r.pass.expired', '工作准证已于 {d} 过期', 'Work pass expired on {d}');
  D('cp.r.cert.missing', '缺少 {x}', 'No {x} on file'); D('cp.r.cert.expired', '{x} 已于 {d} 过期', '{x} expired on {d}');
  D('cp.r.leave.pending', '当天有待批准的请假（{ref}）', 'Leave pending that day ({ref})'); D('cp.r.leave.approved', '当天有已批准的请假（{ref}）', 'On approved leave that day ({ref})');
  D('cp.w.passport', '护照 {n} 天后到期（{d}）', 'Passport expires in {n} days ({d})'); D('cp.w.pass', '工作准证 {n} 天后到期（{d}）', 'Work pass expires in {n} days ({d})'); D('cp.w.cert', '{x} {n} 天后到期（{d}）', '{x} expires in {n} days ({d})');
  D('cp.pass.WP', '工作准证 WP', 'Work Permit (WP)'); D('cp.pass.SP', 'S Pass', 'S Pass'); D('cp.pass.EP', '就业准证 EP', 'Employment Pass (EP)');
  // rules
  D('cp.rules.title', '合规规则', 'Compliance rules'); D('cp.rules.sub', '决定一个人能否上场的基本要求，以及各类作业额外要求的证书', 'The base requirements for working on site, and the extra certificates each kind of work demands');
  D('cp.rb.title', '基本要求（所有人员）', 'Base requirements (everyone)'); D('cp.rb.passport', '护照有效（仅外籍人员）', 'Passport valid (foreign workers)'); D('cp.rb.pass', '工作准证有效（仅外籍人员）', 'Work pass valid (foreign workers)'); D('cp.rb.certs', '必备证书', 'Required certificates');
  D('cp.rb.soon', '到期前提醒天数', 'Warn this many days before expiry'); D('cp.rb.addCert', '添加必备证书', 'Add a required certificate'); D('cp.rb.save', '保存基本要求', 'Save base requirements'); D('cp.rb.rm', '移除', 'Remove');
  D('cp.rp.title', '各类作业的额外证书', 'Extra certificates by type of work'); D('cp.rp.hint', '点击证书类型，加入或移出该类作业的必备证书；基本要求始终适用。', 'Click a certificate type to add or remove it for that kind of work; the base requirements always apply.'); D('cp.rp.none', '（无额外要求）', '(no extra requirement)');
  D('cp.rules.upd', '规则最近更新：{t}', 'Rules last changed: {t}'); D('cp.rules.note', '原型提示：规则保存后立即生效，所有检查都按当前规则计算（暂不支持按生效日期保留历史版本）。', 'Prototype: rules apply as soon as they are saved, and every check uses the current rules (no effective-dated versions yet).');
  D('cp.e.days', '请输入 0–365 的整数', 'Enter a whole number from 0 to 365'); D('cp.e.type', '请选择证书类型', 'Choose a certificate type'); D('cp.e.dup', '该证书已在列表中', 'Already in the list'); D('cp.t.saved', '合规规则已保存', 'Compliance rules saved');
  D('cp.badge', '证件或证书不合规', 'A document or certificate is not valid');
  // events
  D('ev.title', '事件记录', 'Event log'); D('ev.sub', '各模块通过事件总线通知其他模块；这里是本次打开页面后的最近事件（刷新页面后清空）', 'Modules tell each other what happened through the event bus; this is what happened since the page was opened (cleared on reload)');
  D('ev.c.at', '时间', 'Time'); D('ev.c.type', '事件', 'Event'); D('ev.c.detail', '内容', 'Detail'); D('ev.none', '还没有事件。试试在人员名册里改一位外籍员工的准证到期日。', 'No events yet. Try changing a foreign worker’s work pass expiry in the roster.'); D('ev.clear', '清空记录', 'Clear'); D('ev.f.type', '事件类型', 'Event type');

  // ---------- roster additions ----------
  D('hr.f.passType', '准证类型', 'Work pass type'); D('hr.f.passExpiry', '准证到期日', 'Work pass expiry'); D('hr.f.passportNo', '护照号码', 'Passport number'); D('hr.f.passportExpiry', '护照到期日', 'Passport expiry'); D('hr.m.docs', '外籍人员证件', 'Foreign worker documents'); D('hr.f.docsHint', '准证与护照的到期日用于合规检查；缺少或过期时，该工人在闸机和作业许可中会被拦截。', 'Pass and passport expiry dates feed the compliance check; if one is missing or past, the worker is stopped at the gate and on permits.');
  D('hr.e.pass_type', '请选择准证类型', 'Choose a pass type'); D('hr.e.pass_exp', '准证到期日无效', 'The pass expiry is not a valid date'); D('hr.e.pp_no', '护照号码应为 6–12 位字母或数字', 'A passport number is 6–12 letters or digits'); D('hr.e.pp_exp', '护照到期日无效', 'The passport expiry is not a valid date');
  D('hr.v.docs', '证件', 'Documents'); D('hr.cmp.title', '合规', 'Compliance');

  // ---------- clients & subcontractors ----------
  D('co.type.main', '总包商', 'Main contractor');
  D('co.del.deps', '{n} 条人员部署涉及该单位', 'deployments involving it: {n}');

  // ---------- permissions: party types ----------
  D('pm.party.employer', '雇主（本公司员工）', 'Employer (own staff)'); D('pm.party.subcon', '分包商', 'Subcontractor'); D('pm.party.maincon', '总包商', 'Main contractor'); D('pm.party.training_centre', '培训中心', 'Training centre'); D('pm.party.dorm_operator', '宿舍运营商', 'Dormitory operator');
  D('pm.r.party', '组织类型', 'Organisation type'); D('pm.r.partyHint', '分包商、总包商角色的账号必须关联同类型的公司，并只能看到分包商 / 总包商相关的数据；总包商看不到工资等商业信息。', 'Accounts with a subcontractor or main-contractor role must belong to a company of that type and see only their own side of the data; a main contractor never sees wages.');
  D('pm.e.party', '请选择组织类型', 'Choose an organisation type'); D('pm.e.party_used', '已有账号使用这个角色，不能更改组织类型', 'Accounts already use this role, so its organisation type cannot change'); D('pm.e.company_type', '这个角色的账号必须关联类型相符的公司（分包商 / 总包商）', 'Accounts with this role must belong to a company of the matching type (subcontractor / main contractor)');

  // ---------- tenants: module entitlements ----------
  D('t.m.modules', '包含的第二阶段模块', 'Phase 2 modules included'); D('t.m.modSoon', '（开发中）', '(in development)'); D('t.m.modHint', '第一阶段功能（人员、考勤、薪资、请假等）所有租户都有；未勾选的模块在该租户的后台里不会出现。', 'Phase 1 features (people, attendance, payroll, leave …) are in every subscription; a module left unticked does not appear in that tenant’s dashboard.');
  D('t.col.modules', '第二阶段模块', 'Phase 2 modules');

  // ---------- audit ----------
  D('au.mod.deployment', '部署与合规', 'Deployments & compliance'); D('au.type.block', '拦截', 'Block'); D('au.type.unblock', '解除拦截', 'Unblock'); D('au.type.end', '结束', 'End');
})(window.BS);
