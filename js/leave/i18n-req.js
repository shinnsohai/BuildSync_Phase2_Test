/* Strings: leave application and approval (admin calendar + worker app). */
(function (BS) {
  const D = BS.D;
  ['日', '一', '二', '三', '四', '五', '六'].forEach((z, i) => { D('lv.wd.' + i, '周' + z, ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]); D('lv.wds.' + i, z, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]); });
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((e, i) => D('lv.mon.' + (i + 1), (i + 1) + ' 月', e));
  D('lv.monthTitle', '{y} 年 {m} 月', ''); D('lv.dayTitle', '{y} 年 {m} 月 {d} 日 · {w}', '');
  D('lv.st.pending', '待审批', 'Pending'); D('lv.st.approved', '已通过', 'Approved'); D('lv.st.rejected', '已驳回', 'Rejected'); D('lv.st.withdrawn', '已撤回', 'Withdrawn');
  D('lv.dur.days', '{n} 天', '{n} day(s)'); D('lv.dur.daysH', '{n} 天（{h} 小时）', '{n} day(s) ({h} h)'); D('lv.dur.hours', '{n} 小时', '{n} h');
  D('lv.by.admin', '系统管理员', 'System Admin'); D('lv.by.sup', '项目主管 · {name}', 'Supervisor · {name}');
  D('lv.defaultComment', '同意', 'Approved');

  // admin calendar
  D('lv.title', '请假审批', 'Leave approval'); D('lv.sub', '按月查看全部请假安排，点击日期查看人员并审批', 'See every leave in a month; click a date to review and approve');
  D('lv.add', '新加请假', 'Add leave'); D('lv.today', '今天', 'Today'); D('lv.n', '{n} 人', '{n}'); D('lv.more', '+ {n} 人 · 查看全部', '+ {n} more · view all');
  D('lv.hint', '每天最多显示 {n} 位请假人 · 点击日期查看全部', 'Up to {n} people per day · click a date to see everyone');
  D('lv.f.name', '申请人', 'Applicant'); D('lv.f.project', '项目', 'Project'); D('lv.f.type', '请假类型', 'Leave type'); D('lv.f.status', '审批状态', 'Status'); D('lv.f.applied', '申请日期', 'Applied on');
  D('lv.pick', '选择日期', 'Pick a date'); D('lv.selected', '已选 {d}', 'Selected {d}'); D('lv.backToday', '回到今天', 'Back to today');
  D('lv.day.sub', '当日请假 {n} 人', '{n} on leave that day'); D('lv.day.multi', '，包含跨天申请', ', including multi-day requests');
  D('lv.day.list', '请假人列表（{n}）', 'People on leave ({n})'); D('lv.day.stats', '{a} 人待审批 · {b} 人已通过 · {c} 人已驳回', '{a} pending · {b} approved · {c} rejected');
  D('lv.day.none', '当日暂无请假申请', 'No leave requests that day'); D('lv.day.noneHint', '可新加请假，或返回月历查看其他日期。', 'Add a leave, or go back to the calendar.');
  D('lv.act.detail', '查看详情', 'Details');
  D('lv.rej.label', '拒绝原因（审批意见）', 'Reason for rejection (comment)'); D('lv.rej.ph', '请输入拒绝原因，确认后将记录在审批意见中', 'Enter a reason; it is saved as the approval comment');
  D('lv.rej.hint', '填写原因后可确认拒绝', 'Enter a reason to confirm');
  D('lv.d.applicant', '申请人', 'Applicant'); D('lv.d.company', '公司', 'Company'); D('lv.d.project', '项目', 'Project'); D('lv.d.site', '工区', 'Site'); D('lv.d.type', '请假类型', 'Leave type');
  D('lv.d.dur', '请假时长', 'Duration'); D('lv.d.start', '开始时间', 'Start'); D('lv.d.end', '结束时间', 'End'); D('lv.d.reason', '请假原因', 'Reason'); D('lv.d.by', '提交', 'Submitted by'); D('lv.d.byAdmin', '管理员代提交', 'Admin (on behalf)'); D('lv.d.resub', '重新申请自', 'Resubmission of');
  D('lv.rv.title', '请假详情 · 审批', 'Leave details · review'); D('lv.rv.detail', '请假详情', 'Leave details'); D('lv.rv.sub', '申请信息仅供查看，仅审批意见可填写', 'Request details are read-only; only the comment can be edited');
  D('lv.rv.detailSub', '申请信息与审批记录仅供查看，不可修改', 'Request and review record are read-only');
  D('lv.rv.info', '申请信息', 'Request'); D('lv.rv.ro', '仅供查看', 'read-only'); D('lv.rv.approver', '审批人', 'Approver'); D('lv.rv.me', '系统管理员（当前登录）', 'System Admin (you)'); D('lv.rv.state', '当前状态', 'Status');
  D('lv.rv.result', '审批结果', 'Result'); D('lv.rv.at', '审批时间', 'Reviewed'); D('lv.rv.comment', '审批意见', 'Comment'); D('lv.rv.commentHint', '可填写 · 驳回时必填', 'optional · required to reject'); D('lv.rv.commentPh', '请输入审批意见，驳回时必填', 'Enter a comment; required when rejecting');
  D('lv.rv.reasonOut', '驳回原因', 'Rejection reason'); D('lv.rv.withdrawn', '申请人已撤回', 'Withdrawn by the applicant'); D('lv.rv.back', '返回名单', 'Back to list'); D('lv.rv.reject', '驳回申请', 'Reject'); D('lv.rv.approve', '通过申请', 'Approve'); D('lv.rv.done', '已审批', 'Reviewed');
  D('lv.add.sub', '为员工填写请假信息，提交后进入待审批', 'Fill in leave for an employee; it goes to pending after submitting'); D('lv.add.by', '代提交人', 'Submitted by'); D('lv.add.emp', '请假人', 'Employee'); D('lv.add.auto', '选择人员后自动显示', 'Shown after choosing an employee');
  D('lv.add.avail', '可用额度：{v} {u}', 'Available: {v} {u}'); D('lv.add.durHint', '选择时间后，按当前规则自动计算（每天 8 小时）', 'Calculated automatically (8 h per day)');
  D('lv.add.reasonPh', '请输入请假原因及需要交接的事项', 'Reason and anything that needs handing over'); D('lv.add.note', '结束时间不得早于开始时间；标 * 的项目为必填项。', 'End must be after start; fields marked * are required.'); D('lv.add.submit', '提交申请', 'Submit');
  D('lv.toast.approved', '已通过 {name} 的请假', 'Approved {name}’s leave'); D('lv.toast.rejected', '已驳回 {name} 的请假', 'Rejected {name}’s leave'); D('lv.toast.added', '已为 {name} 提交请假 {id}，待审批', 'Submitted {id} for {name}; pending approval');

  D('lv.e.person', '请选择在职员工', 'Choose an active employee'); D('lv.e.type', '请选择请假类型', 'Choose a leave type'); D('lv.e.dates', '请填写完整的开始和结束时间', 'Enter both start and end times');
  D('lv.e.range', '结束时间必须晚于开始时间', 'End must be later than start'); D('lv.e.zero', '所选时段不在工作时间内（08:00–17:00），时长为 0', 'That period is outside working hours (08:00–17:00): duration is 0');
  D('lv.e.reason', '请填写请假原因', 'Please give a reason'); D('lv.e.reasonLen', '原因最多 200 字', 'Reason is limited to 200 characters');
  D('lv.e.long', '单次请假不能超过 {n} 天', 'A single request cannot exceed {n} days'); D('lv.e.past', '不能申请 {d} 之前的日期', 'Dates before {d} cannot be requested');
  D('lv.e.overlap', '与已有请假 {id} 的时间重叠', 'Overlaps your existing leave {id}'); D('lv.e.quota', '额度不足：可用 {have}，本次需要 {need}', 'Not enough quota: {have} available, {need} needed');
  D('lv.e.notPending', '该申请当前为「{s}」，无法再审批', 'This request is now “{s}” and can no longer be reviewed');
  D('lv.e.insufficient', '员工剩余额度不足（剩余 {left}，需要 {need}），无法通过', 'Not enough remaining quota ({left} left, {need} needed); cannot approve');
  D('lv.e.rejectReason', '驳回时必须填写审批意见', 'A comment is required to reject'); D('lv.e.generic', '操作失败，请检查输入', 'Could not complete the action');

  // quota log additions
  D('l.kind.leave', '请假扣减', 'Leave'); D('l.log.left', '剩余', 'left');

  // worker app
  D('w.lv.onLeave', '休假中', 'On leave'); D('w.lv.pendingN', '{n} 条待处理', '{n} pending'); D('w.lv.all', '查看全部', 'View all'); D('w.lv.none', '暂无请假记录', 'No leave requests yet');
  D('w.lv.applyTitle', '请假申请', 'Apply for leave'); D('w.lv.avail', '可用额度', 'Available quota'); D('w.lv.resub', '正在重新申请 {id}，请核对时间后提交', 'Reapplying from {id}; check the dates and submit');
  D('w.lv.startAt', '开始日期与时间', 'Start date & time'); D('w.lv.endAt', '结束日期与时间', 'End date & time'); D('w.lv.auto', '自动计算', 'Automatic');
  D('w.lv.reasonPh', '例如：家庭事务', 'e.g. Family matters'); D('w.lv.submit', '提交申请', 'Submit request');
  D('w.lv.recTitle', '请假记录', 'Leave records'); D('w.lv.detTitle', '请假详情', 'Leave details'); D('w.lv.missing', '未找到该请假申请', 'Request not found');
  D('w.lv.h.pending', '申请已提交，等待审批', 'Submitted, awaiting approval'); D('w.lv.s.pending', '提交于 {at}', 'Submitted {at}');
  D('w.lv.h.approved', '请假申请已批准', 'Leave approved'); D('w.lv.s.approved', '请假时段内无需签到或签退', 'No check-in or check-out needed during this period');
  D('w.lv.h.rejected', '请假申请未通过', 'Leave not approved'); D('w.lv.s.rejected', '请根据驳回原因修改后重新申请', 'Please address the reason and apply again');
  D('w.lv.h.withdrawn', '请假申请已撤回', 'Request withdrawn'); D('w.lv.s.withdrawn', '该申请不再进入审批', 'This request will not be reviewed');
  D('w.lv.p.sub', '申请已提交', 'Request submitted'); D('w.lv.p.wait', '等待管理员审批', 'Awaiting approval');
  D('w.lv.pendingNote', '审批完成后系统会发送通知。当前申请不可重复提交。', 'You will be notified once it is reviewed. This request cannot be submitted again.');
  D('w.lv.rejReason', '驳回原因', 'Rejection reason');
  D('w.lv.effective', '本次请假已生效。请假时段内对应班次无需签到或签退。', 'This leave is in effect. No check-in or check-out is needed for these shifts.');
  D('w.lv.effectiveFuture', '本次请假已批准，额度已扣减。开始前可撤回，额度将返还。', 'Approved and quota used. You can cancel before it starts to get the quota back.');
  D('w.lv.cancelledNote', '已撤销已批准的请假，额度已返还。', 'The approved leave was cancelled and the quota returned.'); D('w.lv.withdrawnNote', '申请已撤回，未占用额度。', 'Request withdrawn; no quota was used.');
  D('w.lv.withdraw', '撤回申请', 'Withdraw request'); D('w.lv.cancelLeave', '撤回请假', 'Cancel leave'); D('w.lv.reapply', '重新申请', 'Apply again');
  D('w.lv.wdTitle', '撤回这份请假申请？', 'Withdraw this request?'); D('w.lv.wdMsg', '撤回后将不再进入审批，你可以重新申请。', 'It will no longer be reviewed. You can apply again.');
  D('w.lv.cancelTitle', '撤回已批准的请假？', 'Cancel approved leave?'); D('w.lv.cancelMsg', '请假将取消，已扣减的额度会返还。', 'The leave will be cancelled and the quota returned.');
  D('w.lv.e.started', '请假已开始，无法撤回', 'This leave has already started and cannot be cancelled');
  D('w.lv.toast.submitted', '请假已提交，等待审批', 'Leave submitted, awaiting approval'); D('w.lv.toast.withdrawn', '已撤回申请', 'Request withdrawn'); D('w.lv.toast.cancelled', '已撤回请假，额度已返还', 'Leave cancelled, quota returned');
  D('w.lv.nt.approved', '请假已通过', 'Leave approved'); D('w.lv.nt.rejected', '请假未通过', 'Leave rejected'); D('w.lv.nt.new', '新的请假待审批', 'New leave request to review');

  D('w.lv.supTitle', '工人请假申请', 'Worker leave requests'); D('w.lv.proj', '项目：', 'Project: '); D('w.lv.time', '时间：本月', 'Period: this month');
  D('w.lv.waiting', '{n} 条申请等待审批', '{n} requests waiting'); D('w.lv.prior', '优先处理', 'Show first'); D('w.lv.showAll', '显示全部', 'Show all');
  D('w.lv.supRecords', '申请记录', 'Requests'); D('w.lv.total', '共 {n} 条', '{n} total'); D('w.lv.worker', '工人', 'Worker');
  D('w.lv.decidedAt', '已于 {at} {s}', '{s} on {at}'); D('w.lv.viewDetail', '查看详情', 'Details'); D('w.lv.supNone', '没有需要处理的申请', 'Nothing to review');
  D('w.lv.supDetTitle', '请假审批详情', 'Leave request'); D('w.lv.relProject', '关联项目', 'Project');
  D('w.lv.opinion', '审批意见', 'Comment'); D('w.lv.opinionHint', '驳回时必填', 'required to reject'); D('w.lv.opinionPh', '填写审批意见，驳回时必填', 'Enter a comment; required when rejecting');
  D('w.lv.supDone', '该请假记录已生效，并计入考勤。', 'This leave is recorded and counted in attendance.');
  D('w.lv.toast.approved', '已通过该请假', 'Leave approved'); D('w.lv.toast.rejected', '已驳回该请假', 'Leave rejected');
  D('w.lv.state', '当前状态', 'Status'); D('w.lv.rejectBtn', '驳回', 'Reject'); D('w.lv.approveBtn', '通过', 'Approve');
})(window.BS);
