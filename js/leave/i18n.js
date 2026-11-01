/* Strings: leave quotas + worker leave balances. */
(function (BS) {
  const D = BS.D;
  D('l.tab.approve', '请假审批', 'Leave approval'); D('l.tab.rules', '请假规则', 'Leave rules'); D('l.tab.quota', '请假额度汇总', 'Leave quotas');
  D('l.type.annual', '年假', 'Annual leave'); D('l.type.personal', '事假', 'Personal leave'); D('l.type.sick', '病假', 'Sick leave'); D('l.type.toil', '调休', 'Time off in lieu');
  D('l.unit.day', '天', 'days'); D('l.unit.hour', '小时', 'h');
  D('l.title', '请假额度汇总', 'Leave quota summary'); D('l.sub', '查看并维护所有员工的请假额度', 'View and maintain every employee’s leave quotas');
  D('l.selected', '已选择 {n} 人', '{n} selected'); D('l.batch', '批量调整额度', 'Batch adjust'); D('l.selAll', '全选当前页', 'Select this page');
  D('l.readonly', '历史年度仅供查看，不能调整额度', 'Past years are read-only; quotas cannot be adjusted');
  D('l.f.kw', '姓名 / 工号 / 手机号', 'Name / ID / phone'); D('l.f.type', '请假类型 ·', 'Leave type ·'); D('l.f.status', '员工状态 ·', 'Status ·'); D('l.f.year', '额度年度 ·', 'Year ·'); D('l.f.all', '全部', 'All');
  D('l.s.active', '在职', 'Active'); D('l.s.disabled', '已停用', 'Disabled');
  D('l.col.person', '人员', 'Employee'); D('l.col.phone', '手机号', 'Phone'); D('l.col.last', '最后调整时间', 'Last adjusted');
  D('l.total', '总额', 'Total'); D('l.left', '剩余', 'Left'); D('l.none', '没有符合条件的员工', 'No employees match the filters');
  D('l.act.adjust', '调整额度', 'Adjust'); D('l.act.log', '变更记录', 'History');

  D('l.m.title', '调整请假额度', 'Adjust leave quota'); D('l.m.batchTitle', '批量调整请假额度', 'Batch adjust leave quota');
  D('l.m.sub', '为员工增加或扣减指定类型的请假额度', 'Add or deduct quota of a chosen leave type');
  D('l.m.emp', '员工', 'Employee'); D('l.m.batchN', '已选 {n} 人', '{n} employees selected');
  D('l.m.type', '请假类型', 'Leave type'); D('l.m.typePh', '请选择请假类型', 'Select a leave type'); D('l.m.typeFirst', '请先选择请假类型', 'Choose a leave type first');
  D('l.m.mode', '调整方式', 'Adjustment'); D('l.m.add', '增加额度', 'Add quota'); D('l.m.deduct', '扣减额度', 'Deduct quota');
  D('l.m.days', '调整天数', 'Days'); D('l.m.hours', '调整时长', 'Hours');
  D('l.m.amtHint', '支持 {step} {u}；扣减后剩余额度不能小于 0', 'Steps of {step} {u}; remaining quota cannot go below 0');
  D('l.m.cur', '当前剩余额度', 'Current remaining'); D('l.m.after', '调整后剩余额度', 'Remaining after');
  D('l.m.pickType', '请先选择请假类型', 'Choose a leave type first'); D('l.m.batchIdle', '将对 {n} 人生效', 'Applies to {n} employees');
  D('l.m.batchShort', '剩余额度不足，无法扣减：{names}', 'Not enough remaining quota: {names}'); D('l.m.batchOk', '将对 {n} 人各调整 {v}', 'Each of {n} employees will get {v}');
  D('l.m.reason', '调整原因', 'Reason'); D('l.m.reasonPh', '例如：年度额度补充，已与员工及项目负责人确认。', 'e.g. Annual top-up, confirmed with the employee and project lead.');
  D('l.m.audit', '增加或扣减额度都会留下操作记录，可在审计日志中追溯。', 'Every adjustment is recorded and traceable in the audit log.');
  D('l.m.confirm', '确认调整', 'Confirm');
  D('l.e.type', '请选择请假类型', 'Select a leave type'); D('l.e.amount', '请输入大于 0 的数值', 'Enter a value greater than 0');
  D('l.e.max', '单次最多调整 {n}', 'At most {n} per adjustment'); D('l.e.step', '数值须为 {step} 的整数倍', 'Value must be a multiple of {step}');
  D('l.e.reason', '请填写调整原因', 'A reason is required'); D('l.e.short', '剩余额度不足，无法扣减：{names}', 'Not enough remaining quota: {names}'); D('l.e.generic', '无法完成调整，请检查输入', 'Could not apply the adjustment');
  D('l.toast.adjusted', '已调整 {who} 的{type} {v}', 'Adjusted {who}: {type} {v}'); D('l.toast.notSaved', '浏览器存储已满，本次改动未保存', 'Browser storage is full; this change was not saved');

  D('l.log.title', '请假额度变更记录', 'Leave quota history'); D('l.log.sub', '查看员工每条请假额度调整记录', 'Every quota change for this employee');
  D('l.log.at', '调整时间', 'Time'); D('l.log.type', '请假类型', 'Type'); D('l.log.kind', '变更方式', 'Change'); D('l.log.before', '调整前', 'Before'); D('l.log.delta', '变更值', 'Change');
  D('l.log.after', '调整后', 'After'); D('l.log.by', '操作人/来源', 'By / source'); D('l.log.note', '备注', 'Note'); D('l.log.none', '暂无记录', 'No records');
  D('l.log.hint', '调整前 / 调整后为该类型的年度总额。', 'Before / After show the type’s total for the year.'); D('l.log.close', '关闭', 'Close');
  D('l.kind.manual', '手动调整', 'Manual'); D('l.kind.carry', '自动顺延', 'Carry-over'); D('l.kind.overtime', '加班兑换', 'Overtime');
  D('l.by.admin', '管理员 系统管理员', 'Admin · System Admin'); D('l.by.system', '系统自动', 'System');

  // worker app
  D('w.lv.title', '请假', 'Leave'); D('w.lv.balance', '假期余额', 'Leave balance'); D('w.lv.swipe', '左右滑动', 'Swipe');
  D('w.lv.toilNote', '加班兑换的调休时间会计入此处，单位为小时。', 'Overtime exchanged for leave is added here, in hours.');
  D('w.lv.state', '当前状态', 'Status'); D('w.lv.working', '正常上班', 'Working');
  D('w.lv.apply', '申请请假', 'Apply for leave'); D('w.lv.approve', '请假审批', 'Leave approvals'); D('w.lv.approveSub', '主管功能 · 审核员工请假申请', 'Supervisor · review leave requests');
  D('w.lv.recent', '最近申请', 'Recent requests'); D('w.lv.st.pending', '待审批', 'Pending'); D('w.lv.st.approved', '已通过', 'Approved'); D('w.lv.dates', '请假日期', 'Dates'); D('w.lv.dur', '时长', 'Duration');
  D('w.lv.inert', '原型提示：申请与审批不在本次演示范围内', 'Prototype: applying and approving leave are not part of this demo');
  D('w.lv.nt.adjusted', '请假额度已调整', 'Leave quota adjusted'); D('w.lv.nt.toil', '加班已兑换为调休', 'Overtime added as time off');
})(window.BS);
