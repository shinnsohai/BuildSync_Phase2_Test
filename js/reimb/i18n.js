/* Strings (中文 / English). D(key, zh, en). */
(function (BS) {
  const D = BS.D;

  // ---- common ----
  D('common.back', '返回', 'Back'); D('common.close', '关闭', 'Close'); D('common.cancel', '取消', 'Cancel'); D('common.remove', '移除', 'Remove');
  D('reviewer', '项目管理员', 'Project Admin');
  ['transport:交通费:Transport', 'meal:餐饮费:Meals', 'lodging:住宿费:Lodging', 'material:材料费:Materials', 'other:其他:Other'].forEach((s) => { const [k, z, e] = s.split(':'); D('type.' + k, z, e); });
  ['transport:交通:Transport', 'meal:餐饮:Meals', 'lodging:住宿:Lodging', 'material:材料:Materials', 'other:其他:Other'].forEach((s) => { const [k, z, e] = s.split(':'); D('type.s.' + k, z, e); });
  D('rc.pdfPlaceholder', '原型中未保存此 PDF 的内容；正式版将在应用内预览。', 'This PDF’s contents are not stored in the prototype; the real app previews it in-app.');

  // ---- worker app ----
  D('w.status.pending', '审核中', 'Under review'); D('w.status.approved', '已通过', 'Approved'); D('w.status.rejected', '已拒绝', 'Rejected'); D('w.status.withdrawn', '已撤回', 'Withdrawn');
  D('w.home.title', '工作中心', 'Work Center'); D('w.home.emp', '员工 · {name}', 'Employee · {name}');
  D('w.home.project', '当前项目 / 工区', 'Current project / site'); D('w.home.switch', '切换', 'Switch');
  D('w.home.common', '常用功能', 'Quick access'); D('w.home.services', '{n}项服务', '{n} services');
  D('w.tile.att', '考勤记录', 'Attendance'); D('w.tile.survey', '问卷', 'Surveys'); D('w.tile.salary', '工资', 'Payslips'); D('w.tile.leave', '请假', 'Leave'); D('w.tile.profile', '个人档案', 'Profile'); D('w.tile.reimb', '报销', 'Claims');
  D('w.tab.home', '工作台', 'Home'); D('w.tab.work', '工作中心', 'Work'); D('w.tab.att', '考勤', 'Check-in'); D('w.tab.bc', '广播', 'Broadcast'); D('w.tab.set', '设置', 'Settings');
  D('w.toast.inert', '原型提示：仅接通「报销」和「请假」', 'Prototype: only Claims and Leave are wired up');

  D('w.form.title', '提交报销', 'Submit claim'); D('w.form.viewRecords', '查看报销记录', 'View claim records'); D('w.form.total', '共 {n} 条', '{n} total');
  D('w.form.type', '报销类型', 'Claim type'); D('w.form.typePh', '请选择报销类型', 'Select a claim type');
  D('w.form.amount', '费用金额', 'Amount'); D('w.form.note', '备注', 'Note'); D('w.form.optional', '可选', 'optional'); D('w.form.notePh', '例如：项目现场往返交通', 'e.g. Travel to and from site');
  D('w.form.receipts', '上传凭证', 'Receipts'); D('w.form.upload', '点击上传凭证', 'Tap to add receipts'); D('w.form.uploadMax', '最多 9 张', 'Up to 9');
  D('w.form.submit', '提交报销', 'Submit claim'); D('w.form.resubmitting', '正在重新提交 {id}，请重新上传凭证', 'Resubmitting {id}. Please attach receipts again');
  D('w.err.type.req', '请选择报销类型', 'Please select a claim type');
  D('w.err.amt.req', '请输入有效金额（最多两位小数）', 'Enter a valid amount (up to 2 decimals)');
  D('w.err.amt.zero', '金额必须大于 0', 'Amount must be greater than 0');
  D('w.err.amt.max', '单笔金额不能超过 S$ 99,999.99', 'Amount cannot exceed S$ 99,999.99');
  D('w.err.files.req', '请至少上传 1 份凭证', 'Attach at least 1 receipt');
  D('w.err.max', '最多只能上传 9 份凭证，多余文件已忽略', 'Maximum 9 receipts; extra files were skipped');
  D('w.err.big', '部分文件超过 10 MB，已忽略', 'Some files exceed 10 MB and were skipped');
  D('w.err.type', '仅支持图片和 PDF', 'Only images and PDFs are supported');
  D('w.up.title', '上传凭证', 'Add receipts'); D('w.up.sub', '最多可上传 9 张，支持图片和 PDF', 'Up to 9 files; images and PDF supported');
  D('w.up.pdf', '选择 PDF', 'Choose PDF'); D('w.up.gallery', '从相册上传图片', 'Choose from gallery'); D('w.up.camera', '拍照', 'Take photo');
  D('w.discardTitle', '放弃本次报销？', 'Discard this claim?'); D('w.discardMsg', '已填写的内容将不会保存。', 'What you entered will not be saved.'); D('w.discard', '放弃', 'Discard');
  D('w.replaceTitle', '替换当前草稿？', 'Replace current draft?'); D('w.replaceMsg', '当前未提交的内容将被替换。', 'Your unsubmitted entries will be replaced.'); D('w.replace', '替换', 'Replace');
  D('w.toast.submitted', '报销已提交，等待审核', 'Claim submitted, awaiting review');
  D('w.toast.notSaved', '已提交，但浏览器存储已满，凭证图片未保存', 'Submitted, but browser storage is full so receipt images were not kept');
  D('w.toast.reattach', '请重新上传凭证后提交', 'Please attach receipts again before submitting');

  D('w.rec.title', '报销记录', 'Claim records'); D('w.rec.all', '全部', 'All'); D('w.rec.submitted', '提交时间', 'Submitted'); D('w.rec.amount', '金额', 'Amount'); D('w.rec.empty', '暂无报销记录', 'No claims yet');

  D('w.det.title', '报销详情', 'Claim details'); D('w.det.missing', '未找到该报销单', 'Claim not found');
  D('w.det.h.pending', '申请已提交，等待审批', 'Submitted, awaiting approval'); D('w.det.s.pending', '提交于 {at}', 'Submitted {at}');
  D('w.det.h.approved', '报销申请已通过', 'Claim approved'); D('w.det.s.approved', '款项将进入后续发放流程', 'Payment will follow the payout process');
  D('w.det.h.rejected', '报销申请未通过', 'Claim not approved'); D('w.det.s.rejected', '请根据拒绝原因补充后重新提交', 'Please address the reason and resubmit');
  D('w.det.h.withdrawn', '报销申请已撤回', 'Claim withdrawn'); D('w.det.s.withdrawn', '该申请不再进入审核', 'This claim will not be reviewed');
  D('w.det.type', '报销类型', 'Type'); D('w.det.amount', '费用金额', 'Amount'); D('w.det.id', '报销编号', 'Claim no.'); D('w.det.receipts', '上传凭证', 'Receipts');
  D('w.det.receiptsN', '{n} 份 · 查看详情', '{n} · View'); D('w.det.at', '提交时间', 'Submitted'); D('w.det.note', '备注', 'Note');
  D('w.det.progress', '审核进度', 'Review progress'); D('w.det.p.sub', '报销已提交', 'Claim submitted'); D('w.det.p.wait', '等待管理员审核', 'Awaiting admin review'); D('w.det.p.cur', '当前状态', 'Current status');
  D('w.det.pendingNote', '审核完成后系统会发送通知。当前申请不可重复提交。', 'You will be notified once reviewed. This claim cannot be submitted again.');
  D('w.det.result', '审核结果', 'Result'); D('w.det.by', '审核人', 'Reviewer'); D('w.det.rat', '审核时间', 'Reviewed'); D('w.det.reason', '拒绝原因', 'Reason'); D('w.det.comment', '审核意见', 'Comment');
  D('w.det.approvedNote', '本次报销已通过，款项将按公司流程发放。', 'Approved. Payment will be made per company process.');
  D('w.det.withdraw', '撤回报销', 'Withdraw claim'); D('w.det.resubmit', '重新提交', 'Resubmit');
  D('w.wd.title', '撤回这笔报销？', 'Withdraw this claim?'); D('w.wd.msg', '撤回后将不再进入审核，你可以重新提交。', 'It will no longer be reviewed. You can submit again later.');
  D('w.toast.withdrawn', '已撤回报销', 'Claim withdrawn'); D('w.toast.already', '无法撤回：该单据当前为「{s}」', 'Cannot withdraw: claim is now “{s}”');

  D('w.rc.title', '凭证详情', 'Receipt details'); D('w.rc.id', '报销编号', 'Claim no.'); D('w.rc.count', '共 {n} 份', '{n} files'); D('w.rc.sub', '{d} 提交', 'submitted {d}');
  D('w.rc.image', '图片', 'Image'); D('w.rc.openImg', '查看大图', 'View'); D('w.rc.openPdf', '打开 PDF', 'Open PDF'); D('w.rc.hint', '图片支持放大查看，PDF 支持应用内预览。', 'Images open full-size; PDFs preview in-app.');
  D('w.nt.approved', '报销已通过', 'Claim approved'); D('w.nt.rejected', '报销未通过', 'Claim rejected');

  // ---- admin ----
  D('a.status.pending', '待审核', 'Pending'); D('a.status.approved', '通过', 'Approved'); D('a.status.rejected', '拒绝', 'Rejected'); D('a.status.withdrawn', '已撤回', 'Withdrawn');
  D('a.nav.stats', '数据统计', 'Dashboard'); D('a.nav.people', '人员管理', 'Personnel'); D('a.nav.projects', '项目与工区', 'Projects & Sites'); D('a.nav.clients', '客户与分包商', 'Clients & Subcontractors');
  D('a.nav.certs', '证书管理', 'Certificates'); D('a.nav.att', '考勤管理', 'Attendance'); D('a.nav.pay', '薪资发放', 'Payroll'); D('a.nav.leave', '请假管理', 'Leave');
  D('a.nav.notice', '通知管理', 'Notices'); D('a.nav.survey', '问卷管理', 'Surveys'); D('a.nav.content', '内容配置', 'Content'); D('a.nav.audit', '操作日志', 'Audit log');
  D('a.nav.sys', '系统与三方配置', 'System & Integrations'); D('a.nav.perm', '权限管理', 'Permissions'); D('a.nav.tenant', '租户管理', 'Tenants'); D('a.nav.reimb', '报销审核', 'Claim review');
  D('a.collapse', '收起菜单', 'Collapse'); D('a.user', '系统管理员', 'System Admin'); D('a.role', '超级管理员', 'Super Admin'); D('a.userShort', '系', 'SA'); D('a.admin', '系统管理员', 'System Admin');
  D('a.crumb.root', '后台管理', 'Admin');
  D('a.toast.inert', '原型提示：该菜单暂未接入', 'Prototype: this menu is not wired up'); D('a.toast.tab', '原型提示：该标签页暂未接入', 'Prototype: this tab is not wired up');

  D('a.title', '报销审核', 'Claim review'); D('a.sub', '审核员工提交的报销申请，待审核单据可通过或拒绝', 'Review claims submitted by workers. Pending claims can be approved or rejected.');
  D('a.pendingN', '待审核 {n} 单', '{n} pending');
  D('a.f.kw', '姓名 / 工号 / 单号', 'Name / ID / claim no.'); D('a.f.type', '报销类型', 'Claim type'); D('a.f.status', '状态', 'Status'); D('a.f.from', '提交日期起', 'Submitted from'); D('a.f.to', '提交日期止', 'Submitted to');
  D('a.f.reset', '重置', 'Reset'); D('a.f.query', '查询', 'Search');
  D('a.col.applicant', '申请人', 'Applicant'); D('a.col.emp', '工号', 'Emp. ID'); D('a.col.id', '报销单号', 'Claim no.'); D('a.col.type', '类型', 'Type'); D('a.col.amount', '费用 S$', 'Amount S$');
  D('a.col.note', '备注摘要', 'Note'); D('a.col.files', '凭证数', 'Files'); D('a.col.at', '提交时间', 'Submitted'); D('a.col.status', '状态', 'Status'); D('a.col.act', '操作', 'Actions');
  D('a.act.detail', '详情', 'Details'); D('a.act.approve', '通过', 'Approve'); D('a.act.reject', '拒绝', 'Reject'); D('a.act.pass', '审核通过', 'Approve');
  D('a.none', '没有符合条件的报销单', 'No claims match the filters'); D('a.total', '共 {n} 条', '{n} total'); D('a.perPage', '每页 {n} 条', '{n} per page'); D('a.pager', '分页', 'Pagination'); D('a.prev', '上一页', 'Previous'); D('a.next', '下一页', 'Next');
  D('a.back', '返回列表', 'Back to list'); D('a.missing', '未找到该报销单', 'Claim not found');
  D('a.d.title', '报销申请详情', 'Claim details'); D('a.d.id', '报销单号', 'Claim no.'); D('a.d.applicant', '申请人信息', 'Applicant'); D('a.d.name', '姓名', 'Name'); D('a.d.emp', '工号', 'Emp. ID'); D('a.d.project', '所属项目', 'Project');
  D('a.d.submit', '用户端提交信息', 'Submitted in worker app'); D('a.d.amount', '费用金额', 'Amount'); D('a.d.receipts', '凭证', 'Receipts'); D('a.d.image', '图片', 'Image'); D('a.d.resub', '重新提交自', 'Resubmission of');
  D('a.d.log', '审核记录', 'Review log'); D('a.d.reason', '拒绝原因', 'Reason'); D('a.d.comment', '审核意见', 'Comment'); D('a.d.closed', '该申请已处理（{s}），不可再次审核。', 'This claim is closed ({s}) and cannot be reviewed again.');
  D('a.log.submitted', '申请已提交', 'Claim submitted'); D('a.log.approved', '审核通过', 'Approved'); D('a.log.rejected', '已拒绝', 'Rejected'); D('a.log.withdrawn', '申请人已撤回', 'Withdrawn by applicant');
  D('a.log.wait', '等待管理员审核', 'Awaiting admin review'); D('a.log.cur', '当前节点', 'Current step');

  D('a.m.rejectTitle', '拒绝报销申请', 'Reject claim'); D('a.m.rejectSub', '确认后将通知申请人，单据状态变更为“拒绝”', 'The applicant will be notified and the claim marked “Rejected”.');
  D('a.m.approveTitle', '审核通过', 'Approve claim'); D('a.m.approveSub', '确认后将通知申请人，单据状态变更为“通过”', 'The applicant will be notified and the claim marked “Approved”.');
  D('a.m.summary', '单据摘要', 'Claim summary'); D('a.m.reason', '拒绝原因', 'Reason'); D('a.m.reasonPh', '请输入拒绝原因，最多 200 字', 'Enter a reason (max 200 characters)');
  D('a.m.reasonHint', '必填，将同步给申请人', 'Required. Shared with the applicant.'); D('a.m.reasonReq', '请填写拒绝原因', 'A reason is required');
  D('a.m.comment', '审核意见', 'Comment'); D('a.m.commentPh', '可选，最多 200 字', 'Optional, max 200 characters'); D('a.m.commentHint', '可选，将同步给申请人', 'Optional. Shared with the applicant.'); D('a.m.defaultComment', '同意报销', 'Approved');
  D('a.m.confirmReject', '确认拒绝', 'Confirm reject'); D('a.m.confirmApprove', '确认通过', 'Confirm approve');
  D('a.toast.approved', '已通过 {id}', 'Approved {id}'); D('a.toast.rejected', '已拒绝 {id}', 'Rejected {id}');
  D('a.toast.notPending', '操作失败：该单据当前为「{s}」', 'Not done: this claim is now “{s}”');
  D('a.toast.new', '新报销申请：{name} · {id}', 'New claim: {name} · {id}'); D('a.toast.withdrawn', '申请人已撤回 {id}', 'Applicant withdrew {id}');

  // ---- shell ----
  D('s.title', 'BuiltSync · 阶段二原型', 'BuiltSync · Phase 2 prototype');
  D('s.view.both', '并排', 'Side by side'); D('s.view.app', '用户端', 'Worker app'); D('s.view.admin', '后台', 'Admin');
  D('s.reset', '重置演示数据', 'Reset demo data'); D('s.resetDone', '演示数据已重置', 'Demo data reset');
  D('s.app', '用户端 · 张强', 'Worker app · Zhang Qiang'); D('s.admin', '后台管理', 'Admin dashboard');
  D('s.try', '试试看', 'Try this');
  D('s.t1', '报销：手机里 工作中心 → 报销 提交 → 后台「报销审核」通过或拒绝 → 手机状态实时更新', 'Claims: submit in the phone (Work Center → Claims), approve or reject in admin 报销审核, watch the phone update');
  D('s.t2', '请假额度：后台「请假管理」里调整张强的年假 → 手机「请假」页余额和通知同步变化', 'Leave quotas: in admin 请假管理 adjust 张强’s annual leave → the phone’s Leave page and a banner update');
  D('s.t3', '加班兑换：后台「薪资发放 → 薪资模板」编辑日薪模板，把加班兑换方式改为「休假时间」', 'Overtime exchange: in 薪资发放 → 薪资模板 edit the daily template and set the exchange to “Time off”');
  D('s.t4', '然后点「登记加班（演示）」：加班小时进入张强的调休余额，可在手机和额度汇总中看到', 'Then “Log overtime (demo)”: hours land in 张强’s time-off balance, visible in the phone and the quota page');
  D('s.storageFull', '浏览器存储空间不足，较早的凭证图片已被清理', 'Browser storage is full; older receipt images were dropped');
})(window.BS);
