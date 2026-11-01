/* Strings: 问卷管理 (surveys) admin and the phone's 问卷. */
(function (BS) {
  const D = BS.D;
  D('sv.tab.list', '问卷列表', 'Surveys'); D('sv.tab.records', '答卷记录', 'Answer records'); D('sv.crumb.cfg', '问卷配置', 'Configure questions');
  D('sv.title', '问卷列表', 'Surveys'); D('sv.sub', '管理问卷基本信息，并配置问答、单选、多选和判断题', 'Manage survey details and configure text, single-choice, multiple-choice and true / false questions');
  D('sv.new', '新增问卷', 'New survey'); D('sv.edit', '编辑问卷', 'Edit survey'); D('sv.count', '共 {n} 份问卷', '{n} surveys'); D('sv.count2', '共 {n} 条', '{n} records');
  D('sv.f.name', '问卷名称', 'Survey name'); D('sv.f.fill', '填写状态', 'Completion'); D('sv.f.allDone', '全部已填', 'Everyone answered'); D('sv.f.hasOpen', '仍有未填', 'Some not answered'); D('sv.f.person', '人员 / 工号', 'Person / ID'); D('sv.f.date', '提交日期', 'Submitted');
  D('sv.col.name', '问卷名称', 'Survey'); D('sv.col.qn', '题目数', 'Questions'); D('sv.col.scope', '发布范围', 'Audience'); D('sv.col.deadline', '截止时间', 'Deadline'); D('sv.col.fill', '已填 / 未填', 'Answered / not'); D('sv.col.status', '发布状态', 'Status');
  D('sv.req', '必填', 'Required'); D('sv.opt', '选填', 'Optional'); D('sv.st.draft', '草稿', 'Draft'); D('sv.st.published', '已发布', 'Published'); D('sv.st.closed', '已截止', 'Closed');
  D('sv.scope.all', '全体人员', 'All staff'); D('sv.scope.project', '指定项目', 'Selected projects'); D('sv.scope.new', '新入场人员', 'New joiners');
  D('sv.cfg', '配置问题', 'Questions');

  // basic info dialog
  D('sv.f.nameZh', '问卷名称（中文）', 'Name (Chinese)'); D('sv.f.nameZhPh', '请输入中文名称', 'Enter the Chinese name'); D('sv.f.nameEn', '问卷名称（英文）', 'Name (English)'); D('sv.f.scope', '发布范围', 'Audience'); D('sv.f.deadline', '截止时间', 'Deadline'); D('sv.f.required', '必填设置', 'Required setting');
  D('sv.f.est', '预计 {n} 人需要填写（仅在职启用人员）', 'About {n} people (active staff only)'); D('sv.f.reqHint', '标为必填的问卷在员工端显示“必填”标签', 'A required survey carries a “Required” tag on the phone');
  D('sv.f.draftHint', '草稿不会出现在员工端；配置好问题后可发布', 'A draft is not shown on the phone; publish it once the questions are set'); D('sv.f.pubHint', '已发布的问卷不能改回草稿', 'A published survey cannot go back to draft');

  // configuration
  D('sv.cfg.title', '问卷配置', 'Configure survey'); D('sv.cfg.titleRo', '问卷配置（只读）', 'Survey configuration (read-only)'); D('sv.cfg.sub', '查看问卷基本信息、发布规则及全部问题配置', 'Survey details, publishing rules and every question');
  D('sv.cfg.back', '返回问卷列表', 'Back to surveys'); D('sv.cfg.editInfo', '编辑基本信息', 'Edit details'); D('sv.cfg.publish', '发布问卷', 'Publish survey'); D('sv.cfg.locked', '问卷已发布，题目不能再修改，以免与已提交的答案不一致。', 'The survey is published, so its questions can no longer change; that would not match answers already given.');
  D('sv.cfg.info', '问卷基本信息', 'Survey details'); D('sv.cfg.saved', '最后保存：{d}', 'Last saved: {d}'); D('sv.cfg.all', '全部问题（{n}）', 'All questions ({n})'); D('sv.cfg.add', '添加问题', 'Add question'); D('sv.cfg.noq', '还没有问题，点击“添加问题”开始配置。', 'No questions yet. Click “Add question” to start.');
  D('sv.cfg.sum', '问题数量 {n} 题 · 必答问题 {m} 题', '{n} questions · {m} required'); D('sv.cfg.incomplete', '{n} 题待补全', '{n} to complete');
  D('sv.type.text', '问答题', 'Text'); D('sv.type.single', '单选题', 'Single choice'); D('sv.type.multi', '多选题', 'Multiple choice'); D('sv.type.bool', '判断题', 'True / false');
  D('sv.q.untitled', '（未填写题目）', '(untitled)'); D('sv.q.todo', '待补全', 'Incomplete'); D('sv.q.done', '中英文已填写', 'Both languages filled'); D('sv.q.n', '问题 {n}', 'Question {n}'); D('sv.q.must', '必答问题', 'Required question'); D('sv.q.opt', '选答', 'Optional question');
  D('sv.q.up', '上移', 'Move up'); D('sv.q.down', '下移', 'Move down'); D('sv.q.del', '删除问题', 'Delete question'); D('sv.q.zh', '题目内容（中文）', 'Question (Chinese)'); D('sv.q.en', '题目内容（英文）', 'Question (English)'); D('sv.q.bothHint', '中文、英文均需填写；用户端按所选语言显示。', 'Both languages are required; the phone shows the one the person picked.');
  D('sv.q.opts', '答案选项', 'Answer options'); D('sv.q.optsBool', '固定 2 个选项，不可新增或删除；文案可编辑', 'Always two options; the wording can be edited'); D('sv.q.optsSingle', '至少 2 个选项 · 用户仅可单选', 'At least 2 options · one answer only'); D('sv.q.optsMulti', '至少 2 个选项 · 用户可多选', 'At least 2 options · several answers allowed');
  D('sv.q.optZh', '答案内容（中文）', 'Option (Chinese)'); D('sv.q.optEn', '答案内容（英文）', 'Option (English)'); D('sv.q.addOpt', '添加选项', 'Add option'); D('sv.q.mustHint', '未填写答案时不可提交问卷', 'The survey cannot be submitted without an answer');
  D('sv.qe.zh', '请填写中文题目内容', 'Enter the Chinese question'); D('sv.qe.en', '请填写英文题目内容', 'Enter the English question'); D('sv.qe.opts', '至少需要 2 个选项', 'At least 2 options are needed'); D('sv.qe.optText', '每个选项的中文、英文都要填写', 'Fill both languages for every option');
  D('sv.add.title', '添加问题', 'Add question'); D('sv.add.sub', '选择题型后创建一个新问题', 'Choose a type to create a new question'); D('sv.add.text', '用户填写自由文本答案', 'The person types a free-text answer'); D('sv.add.single', '用户只能选择一个答案', 'The person picks one answer'); D('sv.add.multi', '用户可以选择多个答案', 'The person can pick several answers'); D('sv.add.bool', '固定为正确或错误', 'Fixed as true or false'); D('sv.add.ok', '确认添加', 'Add');

  // delete, people, records, detail
  D('sv.del.title', '删除问卷', 'Delete survey'); D('sv.del.sub', '请核对问卷信息后再确认删除', 'Check the survey before deleting'); D('sv.del.note', '删除后无法恢复。', 'Deleting cannot be undone.'); D('sv.del.warn', '该问卷已有 {n} 份答卷，将一并删除且无法恢复。', 'This survey has {n} answer sheets; they are deleted with it and cannot be restored.');
  D('sv.ppl.filled', '已填人员名单', 'People who answered'); D('sv.ppl.unfilled', '未填人员名单', 'People who have not answered'); D('sv.ppl.nFilled', '已填 {n}', 'Answered {n}'); D('sv.ppl.nUnfilled', '未填 {n}', 'Not answered {n}'); D('sv.ppl.kw', '姓名 / 工号 / 手机号', 'Name / ID / phone'); D('sv.ppl.export', '导出名单', 'Export list'); D('sv.ppl.total', '共 {n} 人', '{n} people');
  D('sv.ppl.c.person', '人员姓名', 'Name'); D('sv.ppl.c.empNo', '工号', 'ID'); D('sv.ppl.c.phone', '手机号', 'Phone'); D('sv.ppl.c.company', '所属公司', 'Employer'); D('sv.ppl.c.role', '默认角色', 'Role'); D('sv.ppl.c.state', '填写状态', 'State'); D('sv.ppl.done', '已填', 'Answered'); D('sv.ppl.todo', '未填', 'Not answered');
  D('sv.rec.title', '答卷记录', 'Answer records'); D('sv.rec.sub', '查看用户提交的问卷记录与完整答卷详情', 'Submitted surveys with the full answers'); D('sv.rec.person', '人员', 'Person'); D('sv.rec.survey', '问卷名称', 'Survey'); D('sv.rec.project', '所属项目', 'Project'); D('sv.rec.time', '提交时间', 'Submitted'); D('sv.rec.detail', '详情', 'Details');
  D('sv.d.title', '答卷详情', 'Answer sheet'); D('sv.d.sub', '查看用户提交的完整问卷内容', 'The full submitted survey'); D('sv.d.info', '答卷信息', 'Sheet details'); D('sv.d.person', '提交人员', 'Submitted by'); D('sv.d.notYet', '尚未提交', 'Not submitted'); D('sv.d.answers', '作答内容', 'Answers'); D('sv.d.total', '共 {n} 题', '{n} questions');
  D('sv.d.answer', '用户答案', 'Answer'); D('sv.d.blank', '未作答', 'No answer'); D('sv.d.unfilled', '该人员还没有提交这份问卷。', 'This person has not submitted the survey yet.'); D('sv.d.back', '返回名单', 'Back to the list'); D('sv.d.close', '关闭', 'Close');
  D('sv.toast.saved', '问卷已保存', 'Survey saved'); D('sv.toast.created', '问卷已创建，请配置问题', 'Survey created. Now add its questions'); D('sv.toast.published', '问卷已发布', 'Survey published'); D('sv.toast.deleted', '问卷已删除', 'Survey deleted');

  // validation
  const E = (k, zh, en) => D('sv.e.' + k, zh, en);
  E('zh', '请输入中文名称', 'Enter the Chinese name'); E('zh_len', '名称最多 40 个字符', 'At most 40 characters'); E('zh_dup', '已有同名问卷', 'A survey with this name exists'); E('en', '请输入英文名称', 'Enter the English name'); E('en_len', '英文名称最多 80 个字符', 'At most 80 characters');
  E('scope', '请选择发布范围', 'Choose the audience'); E('targets', '请至少选择一个项目', 'Choose at least one project'); E('deadline', '请选择截止时间', 'Choose the deadline'); E('past', '已发布问卷的截止时间必须晚于现在', 'A published survey needs a deadline in the future');
  E('noq', '请先配置问题再发布', 'Add questions before publishing'); E('incomplete', '有问题尚未补全，不能发布', 'Some questions are incomplete; it cannot be published'); E('unpublish', '已发布的问卷不能改回草稿', 'A published survey cannot go back to draft'); E('many', '最多 30 个问题', 'At most 30 questions'); E('locked', '已发布问卷不能修改题目', 'Questions of a published survey cannot change');
  E('pub_noq', '请先添加问题再发布', 'Add questions before publishing'); E('pub_incomplete', '有问题尚未补全，请先补全中英文内容', 'Some questions are incomplete; fill both languages first'); E('pub_past', '截止时间已过，请先在“编辑基本信息”中修改', 'The deadline has passed; change it in “Edit details” first'); E('pub_nobody', '发布范围内没有在职人员', 'Nobody active is in the chosen audience'); E('pub_already', '问卷已经发布', 'Already published'); E('pub_missing', '问卷不存在', 'Survey not found');

  // phone
  D('w.tile.survey', '问卷', 'Surveys');
  D('w.sv.title', '问卷', 'Surveys'); D('w.sv.tabPending', '待填写 {n}', 'To do {n}'); D('w.sv.tabDone', '已填写 {n}', 'Done {n}'); D('w.sv.submitted', '已提交', 'Submitted'); D('w.sv.todo', '待填写', 'To do'); D('w.sv.closed', '已截止', 'Closed');
  D('w.sv.meta', '{n} 题 · 预计 {m} 分钟', '{n} questions · about {m} min'); D('w.sv.deadline', '截止 {d}', 'Due {d}'); D('w.sv.hasDraft', '有暂存', 'Draft saved'); D('w.sv.start', '开始填写', 'Start'); D('w.sv.resume', '继续填写', 'Continue'); D('w.sv.closedNote', '已过截止时间，无法再填写。', 'The deadline has passed; it can no longer be answered.');
  D('w.sv.doneLine', '{n} 题 · 已全部作答 · {d}', '{n} questions · all answered · {d}'); D('w.sv.nonePending', '暂无待填写的问卷', 'Nothing to answer right now'); D('w.sv.noneDone', '还没有已填写的问卷', 'No submitted surveys yet'); D('w.sv.unavailable', '该问卷已不可填写', 'This survey is no longer available');
  D('w.sv.textPh', '请输入你的回答', 'Type your answer'); D('w.sv.multiHint', '可多选', 'Select all that apply'); D('w.sv.saveDraft', '暂存', 'Save draft'); D('w.sv.submit', '提交问卷', 'Submit');
  D('w.sv.e.req', '这道题必须作答', 'This question needs an answer'); D('w.sv.e.long', '回答最多 500 个字', 'At most 500 characters'); D('w.sv.e.fix', '请完成标红的题目', 'Please answer the highlighted questions'); D('w.sv.e.closed', '问卷已截止', 'The survey has closed'); D('w.sv.e.done', '你已提交过该问卷', 'You have already submitted it'); D('w.sv.e.audience', '该问卷不在你的发布范围内', 'This survey is not addressed to you'); D('w.sv.e.draft', '问卷尚未发布', 'The survey is not published'); D('w.sv.e.missing', '问卷不存在', 'Survey not found');
  D('w.sv.toast.draft', '已暂存，可稍后继续', 'Draft saved; continue later'); D('w.sv.toast.submitted', '问卷已提交', 'Survey submitted');
  D('w.sv.detail', '问卷详情', 'Survey details'); D('w.sv.submittedAt', '提交于 {d}', 'Submitted {d}'); D('w.sv.readonly', '问卷已提交，以下答案仅供查看，不可修改。', 'Submitted. These answers are read-only and cannot be changed.'); D('w.sv.blank', '未作答', 'No answer'); D('w.sv.nt', '新问卷', 'New survey');
})(window.BS);
