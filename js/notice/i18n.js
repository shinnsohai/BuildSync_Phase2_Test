/* Strings: 通知管理 (announcements) admin and the phone's 广播. */
(function (BS) {
  const D = BS.D;
  D('nt.tab', '通知记录', 'Notification log'); D('nt.title', '平台公告发送记录', 'Platform announcement log'); D('nt.sub', '查看后台发布的平台公告及发送结果', 'Announcements published from the dashboard and how they were delivered');
  D('nt.publish', '发布公告', 'Publish announcement'); D('nt.count', '共 {n} 条', '{n} announcements');
  D('nt.f.title', '公告标题', 'Announcement title'); D('nt.f.date', '发送日期', 'Date');
  D('nt.col.title', '公告标题', 'Title'); D('nt.col.type', '公告类型', 'Type'); D('nt.col.scope', '发送范围', 'Audience'); D('nt.col.channel', '发送渠道', 'Channel'); D('nt.col.time', '发送时间', 'Send time'); D('nt.col.count', '发送人数', 'Recipients'); D('nt.col.status', '发送状态', 'Status');
  D('nt.type.platform', '平台公告', 'Platform announcement'); D('nt.scope.all', '全部', 'Everyone'); D('nt.scope.company', '公司', 'Companies'); D('nt.scope.project', '项目', 'Projects');
  D('nt.ch.app', '站内通知', 'In-app'); D('nt.ch.sms', '短信', 'SMS'); D('nt.st.success', '发送成功', 'Sent'); D('nt.st.partial', '部分失败', 'Partly failed'); D('nt.st.scheduled', '待发送', 'Scheduled');
  D('nt.view', '查看详情', 'View'); D('nt.est', '预计 {n} 人', 'about {n}'); D('nt.failedN', '{n} 人失败', '{n} failed');

  // publish
  D('nt.f.type', '公告类型', 'Type'); D('nt.f.targets', '关联对象', 'Companies / projects'); D('nt.allUsers', '全部用户', 'All users'); D('nt.f.targetsHint', '按发送范围选择公司或项目（可多选）', 'Pick companies or projects (several allowed)');
  D('nt.f.est', '预计发送 {n} 人（仅统计在职启用人员）', 'About {n} people (active staff only)'); D('nt.f.when', '发送时间', 'Send time'); D('nt.when.now', '立即发送', 'Send now'); D('nt.when.later', '定时发送', 'Schedule'); D('nt.f.at', '定时发送时间', 'Scheduled time');
  D('nt.f.smsHint', '短信送达为模拟结果，部分号码会失败', 'SMS delivery is simulated; some numbers fail'); D('nt.f.appHint', '员工端“广播”中显示', 'Shown in the app’s Broadcast tab');
  D('nt.f.langs', '公告语言', 'Language'); D('nt.f.langHint', '中文、英文均需填写，切换时保留内容。', 'Both Chinese and English are required; content is kept when you switch.');
  D('nt.f.titleZh', '公告标题（中文）', 'Title (Chinese)'); D('nt.f.titleEn', '公告标题（英文）', 'Title (English)'); D('nt.f.titlePhZh', '请输入中文公告标题', 'Enter the Chinese title'); D('nt.f.titlePhEn', 'Enter announcement title', 'Enter the English title');
  D('nt.f.bodyZh', '公告内容（中文，富文本）', 'Content (Chinese, rich text)'); D('nt.f.bodyEn', '公告内容（英文，富文本）', 'Content (English, rich text)'); D('nt.f.bodyPhZh', '请输入公告正文…', 'Enter the Chinese content…'); D('nt.f.bodyPhEn', 'Enter announcement content…', 'Enter the English content…');
  D('nt.tb', '格式', 'Formatting'); D('nt.tb.p', '正文', 'Body'); D('nt.tb.h2', '标题 2', 'Heading 2'); D('nt.tb.b', '加粗', 'Bold'); D('nt.tb.i', '斜体', 'Italic'); D('nt.tb.u', '下划线', 'Underline'); D('nt.tb.ul', '项目符号列表', 'Bulleted list'); D('nt.tb.ol', '编号列表', 'Numbered list'); D('nt.tb.clear', '清除格式', 'Clear formatting');
  D('nt.tb.para', '段落', 'Paragraph'); D('nt.tb.chars', '{n} 字', '{n} characters');
  D('nt.send', '确认发送', 'Send'); D('nt.schedule', '确认定时发送', 'Schedule');
  D('nt.toast.sent', '公告已发送，共 {n} 人', 'Announcement sent to {n} people'); D('nt.toast.scheduled', '公告已设为定时发送', 'Announcement scheduled'); D('nt.toast.deleted', '公告已删除', 'Announcement deleted');

  // detail / delete
  D('nt.d.title', '平台公告详情', 'Announcement details'); D('nt.d.sub', '只读查看公告内容与发送信息', 'Read-only view of the content and delivery'); D('nt.d.sent', '已发送', 'Sent'); D('nt.d.time', '发送时间', 'Sent at'); D('nt.d.sender', '发布单位', 'Published by');
  D('nt.d.readLang', '阅读语言', 'Reading language'); D('nt.d.readNote', '仅切换阅读语言', 'Only changes the language you read it in'); D('nt.d.close', '关闭', 'Close');
  D('nt.d.failedWho', '短信未送达', 'SMS not delivered to'); D('nt.d.simNote', '原型按固定规则模拟失败。', 'The prototype simulates failures by a fixed rule.');
  D('nt.del.title', '删除公告', 'Delete announcement'); D('nt.del.sub', '请核对公告信息后再确认删除', 'Check the announcement before deleting'); D('nt.del.note', '删除后员工端“广播”中也不再显示，且无法恢复。', 'It also disappears from the app’s Broadcast tab and cannot be restored.'); D('nt.del.noteSched', '该公告尚未发送，删除后不会再发送。', 'It has not been sent yet; deleting it cancels the send.');

  // validation
  const E = (k, zh, en) => D('nt.e.' + k, zh, en);
  E('scope', '请选择发送范围', 'Choose the audience'); E('targets', '请至少选择一个公司或项目', 'Choose at least one company or project'); E('nobody', '所选对象下没有在职人员', 'Nobody active belongs to the chosen companies or projects'); E('channel', '请选择发送渠道', 'Choose a channel');
  E('at', '请选择定时发送时间', 'Choose the scheduled time'); E('at_past', '定时时间必须晚于现在', 'The scheduled time must be in the future'); E('at_far', '定时发送最多提前 90 天', 'At most 90 days ahead');
  E('title', '请输入公告标题', 'Enter the title'); E('title_len', '标题过长（中文最多 60 字，英文最多 100 字符）', 'The title is too long (60 characters Chinese, 100 English)'); E('body', '请输入公告内容', 'Enter the content'); E('body_len', '内容过长', 'The content is too long');

  // phone
  D('w.bc.title', '广播', 'Broadcast'); D('w.bc.readAll', '全部已读', 'Mark all read'); D('w.bc.latest', '最新公告', 'Latest announcements'); D('w.bc.none', '暂无公告', 'No announcements yet');
  D('w.bc.d.title', '系统公告', 'System announcement'); D('w.bc.d.by', '发布单位', 'Published by'); D('w.bc.d.at', '发布时间', 'Published'); D('w.bc.allRead', '已全部标为已读', 'All marked as read'); D('w.bc.nt', '新公告', 'New announcement');
})(window.BS);
