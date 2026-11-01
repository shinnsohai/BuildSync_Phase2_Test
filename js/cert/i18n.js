/* Strings: 证书管理 (certificates) admin + the phone's 我的证书. */
(function (BS) {
  const D = BS.D;
  D('cr.tab.people', '人员证书', 'Staff certificates'); D('cr.tab.types', '证书类型', 'Certificate types');
  D('cr.p.title', '人员证书', 'Staff certificates'); D('cr.p.sub', '支持每名人员上传多份证书，按证书独立查看、更新与管理到期状态', 'Several certificates per person, each viewed, updated and tracked for expiry on its own'); D('cr.p.add', '新增证书', 'Add certificate');
  D('cr.c.ok', '有效证书', 'Valid'); D('cr.c.soon', '即将到期', 'Expiring soon'); D('cr.c.expired', '已过期', 'Expired'); D('cr.c.none', '未上传', 'No certificate');
  D('cr.c.okSub', '当前有效', 'Currently valid'); D('cr.c.soonSub', '{n} 天内', 'Within {n} days'); D('cr.c.expiredSub', '需要处理', 'Needs action'); D('cr.c.noneSub', '等待上传证书', 'People waiting to upload');
  D('cr.f.person', '人员姓名 / 工号', 'Person name / ID'); D('cr.f.range', '到期范围', 'Expiry range'); D('cr.f.within', '{n} 天内到期', 'Expires within {n} days');
  D('cr.col.person', '人员', 'Person'); D('cr.col.name', '证书名称', 'Certificate'); D('cr.col.type', '证书类型', 'Type'); D('cr.col.no', '证书编号', 'Number'); D('cr.col.until', '有效期至', 'Valid until'); D('cr.col.image', '证书图片', 'Attachment'); D('cr.col.status', '证书状态', 'Status');
  D('cr.st.ok', '有效', 'Valid'); D('cr.st.none', '未上传', 'Not uploaded'); D('cr.up', '已上传', 'Uploaded'); D('cr.notUp', '未上传', 'Not uploaded');
  D('cr.daysLeft', '还剩 {n} 天', '{n} days left'); D('cr.daysOver', '已过期 {n} 天', '{n} days overdue'); D('cr.view', '查看', 'View'); D('cr.update', '更新证书', 'Update'); D('cr.upload', '上传证书', 'Upload'); D('cr.count', '共 {n} 条', '{n} records');

  // dialogs
  D('cr.f.holder', '持证人员', 'Holder'); D('cr.f.holderPh', '请选择持证人员', 'Select the holder'); D('cr.f.typePh', '请选择证书类型', 'Select the type'); D('cr.f.has', '已有', 'already held'); D('cr.f.noPh', '请输入证书编号', 'Enter the certificate number');
  D('cr.f.issued', '签发日期', 'Issue date'); D('cr.f.expiry', '到期日期', 'Expiry date'); D('cr.f.attach', '证书附件', 'Attachment'); D('cr.f.current', '当前证书附件', 'Current attachment'); D('cr.f.chosen', '已选择：{f}（{s}）', 'Selected: {f} ({s})');
  D('cr.f.replaceHint', '上传新文件后将替换当前附件。', 'A new file replaces the current attachment.'); D('cr.f.none', '尚未选择文件', 'No file selected'); D('cr.f.noFile', '尚未选择文件', 'No file selected'); D('cr.f.preview', '证书附件预览', 'Attachment preview');
  D('cr.f.fileHint', 'PDF / JPEG / PNG，单个文件不超过 10 MB。原型只记录文件名和大小，图片仅在本次打开期间可预览。', 'PDF / JPEG / PNG, up to 10 MB. The prototype keeps only the file name and size; an image can be previewed until the page is reloaded.');
  D('cr.rule.save', '保存规则', 'Saving'); D('cr.rule.upd', '更新规则', 'Updating');
  D('cr.add.title', '新增人员证书', 'Add a certificate'); D('cr.add.sub', '为所选人员添加一份证书，已有证书保持不变', 'Adds one certificate for the person; existing ones stay as they are'); D('cr.add.rule', '每人每种证书保存一份；保存后立即生效，不进入审核流程。', 'One certificate of each type per person. It takes effect at once, with no review.'); D('cr.add.ok', '保存证书', 'Save certificate');
  D('cr.upd.title', '上传 / 更新人员证书', 'Upload / update a certificate'); D('cr.upd.sub', '本次仅更新当前这份证书', 'Only this certificate is updated'); D('cr.upd.rule', '保存后立即生效，不进入审核流程；更新仅影响当前证书。', 'Takes effect at once, with no review, and changes only this certificate.'); D('cr.upd.ok', '保存更新', 'Save changes');
  D('cr.view.title', '查看证书', 'View certificate'); D('cr.view.sub', '查看当前证书信息及附件，所有内容仅供阅读', 'Read-only view of the certificate and its attachment'); D('cr.view.info', '证书信息', 'Certificate details');
  D('cr.view.placeholder', '原图展示区 · 原型占位', 'Original image area · prototype placeholder'); D('cr.view.noFile', '没有上传附件', 'No attachment uploaded'); D('cr.view.orig', '查看原图', 'View original'); D('cr.view.origToast', '原型不保存文件内容，无法打开原图', 'The prototype does not keep file contents, so the original cannot be opened');
  D('cr.view.edit', '如需修改，请使用“更新证书”。', 'To change anything, use “Update”.');
  D('cr.toast.added', '证书已保存', 'Certificate saved'); D('cr.toast.updated', '证书已更新', 'Certificate updated'); D('cr.toast.typeSaved', '证书类型已保存', 'Certificate type saved');

  // certificate types
  D('cr.t.title', '证书类型', 'Certificate types'); D('cr.t.sub', '配置证书名称、编码与多个到期提醒时间', 'Set certificate names, codes and several expiry reminders'); D('cr.t.add', '新增证书类型', 'Add type'); D('cr.t.kw', '证书名称 / 编码', 'Name / code');
  D('cr.t.col.type', '证书类型', 'Type'); D('cr.t.col.code', '编码', 'Code'); D('cr.t.col.remind', '提前提醒时间（可多个）', 'Reminders before expiry'); D('cr.t.col.used', '已登记证书', 'Certificates'); D('cr.t.col.status', '状态', 'Status'); D('cr.t.usedN', '{n} 份', '{n}');
  D('cr.days', '{n} 天', '{n} days'); D('cr.t.form', '新增 / 编辑证书类型', 'Add / edit certificate type'); D('cr.t.formSub', '维护证书类型及多个提前提醒时间', 'Maintain the type and its reminder days');
  D('cr.t.nameZh', '证书类型名称（中文）', 'Type name (Chinese)'); D('cr.t.nameZhPh', '请输入中文名称', 'Enter the Chinese name'); D('cr.t.nameEn', '证书类型名称（英文）', 'Type name (English)'); D('cr.t.codeL', '证书类型编码', 'Type code');
  D('cr.t.remindL', '提前提醒时间', 'Reminder days'); D('cr.t.before', '到期前 {n} 天', '{n} days before expiry'); D('cr.t.rnewPh', '输入天数，例如 14', 'Days, e.g. 14'); D('cr.t.radd', '添加提醒', 'Add reminder');
  D('cr.t.ruleL', '提醒规则', 'Reminder rule'); D('cr.t.rule', '可设置多个到期前提醒节点（最多 6 个），例如 90 天、30 天、7 天；同一天不重复提醒。', 'Set several reminder points (up to 6), e.g. 90, 30 and 7 days; nothing is sent twice on the same day.');
  D('cr.t.offHint', '停用后不能再为该类型新增证书，已有证书保留。', 'A stopped type takes no new certificates; existing ones stay.');

  // validation
  const E = (k, zh, en) => D('cr.e.' + k, zh, en);
  E('holder', '请选择持证人员', 'Select the holder'); E('type', '请选择证书类型', 'Select the type'); E('type_dup', '该人员已有此类证书，请使用“更新证书”', 'This person already holds this type; use “Update” instead');
  E('no', '请输入证书编号', 'Enter the certificate number'); E('no_len', '证书编号最多 40 个字符', 'At most 40 characters'); E('no_dup', '该类型下已有相同证书编号', 'This number already exists for the type');
  E('issued', '请选择有效的签发日期', 'Select a valid issue date'); E('issued_future', '签发日期不能晚于今天', 'The issue date cannot be in the future'); E('expiry', '请选择到期日期，或勾选永久', 'Select the expiry date, or tick permanent'); E('expiry_before', '到期日期不能早于签发日期', 'The expiry date cannot be before the issue date');
  E('file_type', '仅支持 PDF、JPEG、PNG', 'Only PDF, JPEG or PNG'); E('file_size', '文件不能超过 10 MB', 'The file must be 10 MB or smaller'); E('missing', '证书不存在', 'Certificate not found');
  E('zh', '请输入中文名称', 'Enter the Chinese name'); E('zh_len', '名称最多 30 个字符', 'At most 30 characters'); E('en_len', '英文名称最多 60 个字符', 'At most 60 characters');
  E('code', '请输入编码', 'Enter a code'); E('code_fmt', '编码以大写字母开头，只能用大写字母、数字、- 和 _', 'Start with a capital letter; capitals, digits, - and _ only'); E('code_dup', '该编码已存在', 'This code already exists');
  E('none', '请至少添加一个提醒', 'Add at least one reminder'); E('many', '最多 6 个提醒', 'At most 6 reminders'); E('range', '提醒天数应为 1–365 的整数', 'Days must be a whole number from 1 to 365'); E('dup', '该提醒天数已存在', 'This reminder already exists');

  // phone
  D('w.tile.cert', '我的证书', 'Certificates');
  D('w.cr.title', '我的证书', 'My certificates'); D('w.cr.none', '暂无证书，请联系管理员上传。', 'No certificates yet. Please ask your administrator to upload them.'); D('w.cr.perm', '永久有效', 'No expiry'); D('w.cr.until', '有效期至 {d}', 'Valid until {d}');
  D('w.cr.left', '还剩 {n} 天', '{n} days left'); D('w.cr.over', '已过期 {n} 天', '{n} days overdue'); D('w.cr.noFile', '尚未上传证书图片', 'No image uploaded yet');
  D('w.cr.d.head', '证书提醒', 'Certificate reminder'); D('w.cr.d.soon', '证书即将到期', 'Certificate expiring soon'); D('w.cr.d.expired', '证书已过期', 'Certificate expired'); D('w.cr.d.ok', '证书有效', 'Certificate valid');
  D('w.cr.d.left', '距离到期还有 {n} 天', '{n} days until it expires'); D('w.cr.d.over', '已过期 {n} 天', 'Expired {n} days ago'); D('w.cr.d.okSub', '有效期至 {d}', 'Valid until {d}'); D('w.cr.d.permSub', '永久有效', 'No expiry date');
  D('w.cr.d.name', '证书名称', 'Certificate'); D('w.cr.d.no', '证书编号', 'Number'); D('w.cr.d.holder', '持证人', 'Holder'); D('w.cr.d.issued', '签发日期', 'Issued'); D('w.cr.d.expiry', '到期日期', 'Expires'); D('w.cr.d.remain', '剩余时间', 'Time left'); D('w.cr.d.status', '当前状态', 'Status');
  D('w.cr.d.act', '请及时联系管理员更新证书', 'Please ask your administrator to update the certificate'); D('w.cr.d.note', '证书到期后可能影响相关工种排班和现场作业资格。', 'An expired certificate may affect scheduling and your right to work on site.');
  D('w.cr.d.source', '通知来源', 'Source'); D('w.cr.d.auto', '系统自动提醒', 'Automatic reminder'); D('w.cr.d.days', '{n} 天', '{n} days'); D('w.cr.d.dayOver', '已过期', 'Expired');
  D('w.cr.nt.soon', '证书即将到期', 'Certificate expiring soon'); D('w.cr.nt.expired', '证书已过期', 'Certificate expired'); D('w.cr.nt.updated', '证书已更新', 'Certificate updated'); D('w.cr.nt.msg', '{n} · 还剩 {d} 天', '{n} · {d} days left'); D('w.cr.nt.msgOver', '{n} · 已过期 {d} 天', '{n} · expired {d} days ago');
})(window.BS);
