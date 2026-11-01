/* Strings: 内容配置 (content configuration). */
(function (BS) {
  const D = BS.D;
  D('ct.tab.popups', '弹窗内容', 'Pop-up content'); D('ct.tab.reminders', '安全提醒', 'Safety reminders'); D('ct.count', '共 {n} 条', '{n} items');
  D('ct.p.title', '签到 / 签退弹窗内容', 'Sign-in / sign-out pop-ups'); D('ct.p.sub', '分别配置签到与签退的通用图片和提示文案', 'Set the picture and message shown when someone signs in and signs out');
  D('ct.col.name', '弹窗名称', 'Name'); D('ct.col.type', '弹窗类型', 'Pop-up type'); D('ct.col.image', '图片预览', 'Picture'); D('ct.col.msg', '文案', 'Message'); D('ct.col.status', '发布状态', 'Status');
  D('ct.type.in', '签到弹窗', 'Sign-in pop-up'); D('ct.type.out', '签退弹窗', 'Sign-out pop-up'); D('ct.st.published', '已发布', 'Published'); D('ct.st.draft', '未发布', 'Unpublished'); D('ct.up', '已上传', 'Uploaded'); D('ct.notUp', '未上传', 'Not uploaded'); D('ct.preview', '预览', 'Preview');
  D('ct.pe.title', '编辑弹窗内容', 'Edit pop-up content'); D('ct.pe.nameZh', '弹窗名称（中文）', 'Name (Chinese)'); D('ct.pe.nameZhPh', '请输入中文名称', 'Enter the Chinese name'); D('ct.pe.nameEn', '弹窗名称（英文）', 'Name (English)'); D('ct.pe.typeHint', '每种弹窗只有一份内容，类型不可更改', 'There is one pop-up of each kind; its type cannot change');
  D('ct.pe.msgZh', '文案（中文）', 'Message (Chinese)'); D('ct.pe.msgZhPh', '请输入中文文案', 'Enter the Chinese message'); D('ct.pe.msgEn', '文案（英文）', 'Message (English)'); D('ct.pe.image', '通用图片', 'Picture'); D('ct.pe.stHint', '未发布时，员工端只显示内置的默认提示文字', 'While unpublished the phone shows its built-in text instead');
  D('ct.f.upload', '点击上传图片', 'Upload a picture'); D('ct.f.reupload', '点击重新上传', 'Upload another'); D('ct.f.imgHint', 'PNG、JPG，≤ 2 MB。原型会把图片压缩到约 360 px 后保存在浏览器中。', 'PNG or JPG, up to 2 MB. The prototype shrinks it to about 360 px and keeps it in the browser.'); D('ct.f.busy', '正在处理图片…', 'Processing the picture…');
  D('ct.pv.title', '弹窗预览', 'Pop-up preview'); D('ct.pv.sub', '查看用户端展示效果，不会触发签到或签退', 'See what the phone shows; nothing is signed in or out'); D('ct.pv.noImg', '尚未上传图片', 'No picture uploaded'); D('ct.pv.demo', '用户端弹窗 · 定位与时间为演示数据', 'Phone pop-up · location and time are demo data');
  D('ct.pv.lang', '预览语言', 'Preview language'); D('ct.pv.note', '仅预览，不执行打卡。修改内容请返回列表选择“编辑”。', 'Preview only; nothing is punched. To change it, go back and choose Edit.'); D('ct.pv.draft', '当前未发布，员工端不会显示这些内容。', 'It is unpublished, so the phone does not show this.'); D('ct.pv.close', '关闭预览', 'Close preview');
  D('ct.toast.popup', '弹窗内容已保存', 'Pop-up saved');

  D('ct.r.title', '安全提醒内容', 'Safety reminders'); D('ct.r.sub', '配置用户端工作中心展示的安全提醒内容与样式', 'Set the reminders and styling shown on the phone’s work centre'); D('ct.r.add', '新增安全提醒', 'New reminder'); D('ct.r.edit', '编辑安全提醒', 'Edit reminder');
  D('ct.r.addSub', '配置用户端工作中心展示的安全提醒内容', 'Set a reminder for the phone’s work centre'); D('ct.r.editSub', '修改用户端工作中心展示的安全提醒内容', 'Change a reminder shown on the phone'); D('ct.r.kw', '标题 / 副标题', 'Title / subtitle');
  D('ct.col.icon', '图标', 'Icon'); D('ct.col.title', '标题', 'Title'); D('ct.col.sub', '副标题', 'Subtitle'); D('ct.col.color', '背景颜色', 'Background'); D('ct.col.def', '默认状态', 'Default'); D('ct.def.yes', '默认', 'Default'); D('ct.def.no', '非默认', 'Not default');
  D('ct.r.noDel', '不可删除', 'Cannot delete'); D('ct.r.setDef', '设为默认', 'Set as default'); D('ct.r.iconImg', '图标图片', 'Icon'); D('ct.r.iconHint', 'PNG、JPG，建议 1:1，≤ 2 MB', 'PNG or JPG, ideally square, up to 2 MB');
  D('ct.r.titleZh', '标题（中文）', 'Title (Chinese)'); D('ct.r.titleEn', '标题（英文）', 'Title (English)'); D('ct.r.titlePh', '请输入安全提醒标题', 'Enter the title'); D('ct.r.subZh', '副标题（中文）', 'Subtitle (Chinese)'); D('ct.r.subEn', '副标题（英文）', 'Subtitle (English)'); D('ct.r.subPh', '请输入安全提醒副标题', 'Enter the subtitle');
  D('ct.r.preview', '效果预览', 'Preview'); D('ct.r.titleDemo', '安全提醒标题', 'Safety reminder title'); D('ct.r.subDemo', '安全提醒副标题将在这里展示。', 'The subtitle appears here.'); D('ct.r.defHint', '默认内容将优先展示在用户端工作中心', 'The default reminder is shown first on the phone'); D('ct.r.isDefHint', '这是当前默认内容；要换默认，请在另一条上选择“设为默认”', 'This is the default now; to change it, set another reminder as default'); D('ct.r.addOk', '确认新增', 'Add');
  D('ct.rd.title', '删除安全提醒', 'Delete reminder'); D('ct.rd.msg', '删除后，该内容将不再在用户端工作中心展示，且无法恢复。是否继续删除？', 'Once deleted, this reminder is no longer shown on the phone and cannot be restored. Delete it?');
  D('ct.rf.title', '设为默认安全提醒', 'Set as default reminder'); D('ct.rf.msg', '设置后，“{n}”将成为用户端默认展示内容，原默认内容将自动取消默认。', '“{n}” becomes the default shown on the phone, and the current default stops being the default.'); D('ct.rf.ok', '确认设置', 'Set default');
  D('ct.toast.rSaved', '安全提醒已保存', 'Reminder saved'); D('ct.toast.rAdded', '安全提醒已新增', 'Reminder added'); D('ct.toast.rDef', '已设为默认', 'Set as default'); D('ct.toast.rDel', '安全提醒已删除', 'Reminder deleted');

  const E = (k, zh, en) => D('ct.e.' + k, zh, en);
  E('zh', '请输入中文名称', 'Enter the Chinese name'); E('zh_len', '名称最多 30 个字符', 'At most 30 characters'); E('en', '请输入英文名称', 'Enter the English name'); E('en_len', '英文名称最多 60 个字符', 'At most 60 characters');
  E('msgZh', '请输入中文文案', 'Enter the Chinese message'); E('msgEn', '请输入英文文案', 'Enter the English message'); E('msg_len', '文案过长（中文最多 60 字，英文最多 120 字符）', 'The message is too long (60 characters Chinese, 120 English)');
  E('status', '请选择发布状态', 'Choose a status'); E('need_img', '发布前请先上传图片', 'Upload a picture before publishing');
  E('titleZh', '请输入中文标题', 'Enter the Chinese title'); E('titleEn', '请输入英文标题', 'Enter the English title'); E('title_len', '标题过长（中文最多 40 字，英文最多 80 字符）', 'The title is too long (40 characters Chinese, 80 English)');
  E('subZh', '请输入中文副标题', 'Enter the Chinese subtitle'); E('subEn', '请输入英文副标题', 'Enter the English subtitle'); E('sub_len', '副标题过长（中文最多 80 字，英文最多 160 字符）', 'The subtitle is too long (80 characters Chinese, 160 English)');
  E('color', '颜色应为 #RRGGBB 格式', 'Use the #RRGGBB format'); E('max', '最多 6 条安全提醒', 'At most 6 reminders'); E('default', '默认内容不能删除', 'The default reminder cannot be deleted');
  E('img_type', '仅支持 PNG、JPG 图片', 'Only PNG or JPG pictures'); E('img_size', '图片不能超过 2 MB', 'The picture must be 2 MB or smaller'); E('img_read', '无法读取这张图片', 'Could not read this picture');

  // phone
  D('w.safety', '安全提醒', 'Safety reminders');
})(window.BS);
