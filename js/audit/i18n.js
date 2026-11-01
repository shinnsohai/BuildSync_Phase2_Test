/* Strings: 操作日志 (audit log). */
(function (BS) {
  const D = BS.D;
  D('au.tab', '审计日志', 'Audit log'); D('au.title', '审计日志', 'Audit log'); D('au.sub', '追踪管理员对业务数据的新增、修改与审核', 'Tracks what administrators added, changed and approved'); D('au.count', '共 {n} 条', '{n} entries');
  D('au.f.date', '操作日期', 'Date'); D('au.col.at', '操作时间', 'Time'); D('au.col.admin', '管理员', 'Administrator'); D('au.col.module', '操作模块', 'Module'); D('au.col.type', '操作类型', 'Action'); D('au.col.object', '操作对象', 'Object'); D('au.col.ip', 'IP 地址', 'IP address'); D('au.col.result', '操作结果', 'Result');
  D('au.res.success', '成功', 'Success'); D('au.res.fail', '失败', 'Failed');
  D('au.note', '日志只增不改：页面上没有修改或删除记录的入口。原型只记录当前登录的“系统管理员”在本页面上的操作，员工在手机端的操作（打卡、提交申请等）不在其中。', 'The log only grows: nothing on this page edits or deletes an entry. The prototype records what the signed-in System Administrator does in the dashboard; what staff do on the phone (punching, submitting requests) is not included.');
  const M = { spin: ['转转乐', 'Spin & win'], people: ['人员管理', 'Personnel'], project: ['项目与工区', 'Projects & sites'], client: ['客户与分包商', 'Clients & subcontractors'], cert: ['证书管理', 'Certificates'], attendance: ['考勤管理', 'Attendance'], payroll: ['薪资发放', 'Payroll'], leave: ['请假管理', 'Leave'], notice: ['通知管理', 'Announcements'], survey: ['问卷管理', 'Surveys'], content: ['内容配置', 'Content'], tenant: ['租户管理', 'Tenants'], reimb: ['报销审核', 'Reimbursements'], system: ['权限管理', 'Permissions'] };
  Object.entries(M).forEach(([k, [zh, en]]) => D('au.mod.' + k, zh, en));
  const T = { create: ['新增', 'Create'], update: ['修改', 'Update'], delete: ['删除', 'Delete'], approve: ['审批', 'Approve'], reject: ['驳回', 'Reject'], enable: ['启用', 'Enable'], disable: ['停用', 'Disable'], import: ['导入', 'Import'], publish: ['发布', 'Publish'], verify: ['核对', 'Verify'], pay: ['发放', 'Pay'], adjust: ['调整', 'Adjust'], generate: ['生成', 'Generate'], complete: ['完成', 'Complete'], renew: ['续订', 'Renew'], cancel: ['退订', 'Cancel'], second: ['外派', 'Second'] };
  Object.entries(T).forEach(([k, [zh, en]]) => D('au.type.' + k, zh, en));
})(window.BS);
