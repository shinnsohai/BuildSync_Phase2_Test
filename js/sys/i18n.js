/* Strings: 系统与三方配置 and the phone's 设置. */
(function (BS) {
  const D = BS.D;
  D('sy.tab.svc', '第三方服务', 'Third-party services'); D('sy.tab.reg', '手机号地区', 'Phone regions'); D('sy.tab.cnt', '用户端内容', 'App content'); D('sy.tab.dict', '字典管理', 'Dictionaries'); D('sy.count', '共 {n} 条', '{n} items');
  D('sy.col.svc', '服务名称', 'Service'); D('sy.col.stype', '服务类型', 'Type'); D('sy.col.sum', '配置摘要', 'Settings'); D('sy.col.last', '最近测试', 'Last test'); D('sy.col.res', '测试结果', 'Result'); D('sy.col.on', '启用状态', 'Status');
  D('sy.col.sms', '短信状态', 'SMS'); D('sy.col.country', '国家 / 地区', 'Country / region'); D('sy.col.code', '国际区号', 'Dial code'); D('sy.col.rule', '手机号规则', 'Number rule'); D('sy.col.lang', '默认语言', 'Default language');
  D('sy.col.ctype', '内容类型', 'Type'); D('sy.col.title', '内容标题', 'Title'); D('sy.col.clang', '语言', 'Languages'); D('sy.col.ver', '版本', 'Version'); D('sy.col.upd', '更新时间', 'Updated'); D('sy.col.pub', '发布状态', 'Published');
  D('sy.col.dzh', '中文名称', 'Chinese name'); D('sy.col.den', '英文名称', 'English name'); D('sy.col.dcode', '字典编码', 'Code'); D('sy.col.dparent', '上级字典项', 'Parent'); D('sy.col.dsort', '排序', 'Order');

  // services
  D('sy.svc.title', '第三方服务配置', 'Third-party services'); D('sy.svc.sub', '集中管理地图、短信、对象存储等服务', 'Maps, SMS and file storage in one place'); D('sy.svc.name', '服务名称', 'Service name');
  D('sy.svc.note', '密钥只保存末 4 位用于核对，不保存完整密钥。“测试”为模拟：设置完整且密钥有效才会连接成功。修改设置后服务会自动停用，需重新测试通过才能启用。国际短信服务停用后，不能再用短信渠道发布公告。', 'Only the last four characters of a key are kept for checking, never the whole key. “Test” is simulated: it succeeds when the settings are complete and the keys look valid. Changing a setting switches the service off until it is tested again. While the SMS service is off, announcements cannot be sent by SMS.');
  D('sy.type.map', '地图服务', 'Map service'); D('sy.type.sms', '短信服务', 'SMS service'); D('sy.type.file', '文件服务', 'File service'); D('sy.testing', '测试中…', 'Testing…'); D('sy.res.ok', '连接成功', 'Connected'); D('sy.res.fail', '连接失败', 'Failed'); D('sy.res.none', '未测试', 'Not tested');
  D('sy.why.auth', '密钥无效', 'invalid key'); D('sy.why.incomplete', '配置不完整', 'incomplete'); D('sy.cfg', '配置', 'Configure'); D('sy.test', '测试', 'Test'); D('sy.stop', '停用', 'Stop'); D('sy.start', '启用', 'Enable');
  D('sy.cfg.title', '配置 · {n}', 'Configure · {n}'); D('sy.cfg.sub', '修改后需重新测试', 'Test again after changing'); D('sy.cfg.after', '保存有改动时，测试结果会清空，服务自动停用。', 'If anything changes, the test result is cleared and the service is switched off.');
  D('sy.f.projectId', '项目 ID', 'Project ID'); D('sy.f.projectIdPh', '例如 builtsync-prod', 'e.g. builtsync-prod'); D('sy.f.apiKey', 'API Key', 'API key'); D('sy.f.accessKey', 'Access Key', 'Access key'); D('sy.f.secret', 'Secret', 'Secret'); D('sy.f.senderId', 'Sender ID', 'Sender ID'); D('sy.f.senderIdPh', '3–11 位字母或数字', '3–11 letters or digits');
  D('sy.f.bucket', 'Bucket', 'Bucket'); D('sy.f.bucketPh', '存储桶名称', 'Bucket name'); D('sy.f.endpoint', 'Endpoint', 'Endpoint'); D('sy.f.endpointPh', 'https://…', 'https://…'); D('sy.f.secretPh', '输入新密钥', 'Enter the key'); D('sy.f.maskedHint', '已脱敏显示；输入新密钥即可更换。', 'Shown masked; type a new key to replace it.');
  D('sy.toast.saved', '配置已保存', 'Saved'); D('sy.toast.savedRetest', '配置已保存，服务已停用，请重新测试后启用', 'Saved. The service is off; test it again before enabling'); D('sy.toast.testOk', '连接成功', 'Connection succeeded'); D('sy.toast.testFail', '连接失败，请检查配置', 'Connection failed; check the settings'); D('sy.toast.on', '服务已启用', 'Service enabled'); D('sy.toast.off', '服务已停用', 'Service stopped');

  // regions
  D('sy.reg.title', '手机号地区', 'Phone regions'); D('sy.reg.sub', '国际区号为系统固定数据，仅供查看，不支持编辑', 'Dial codes are fixed system data: view only'); D('sy.reg.kw', '国家 / 区号', 'Country / code'); D('sy.reg.digits', '{n} 位手机号', '{n}-digit number'); D('sy.sms.yes', '支持', 'Supported'); D('sy.sms.no', '不支持', 'Not supported');

  // content
  D('sy.cnt.title', '用户端内容配置', 'App content'); D('sy.cnt.sub', '维护协议、关于我们和待分配提示内容', 'Agreements, About us and the "awaiting assignment" message'); D('sy.cnt.kw', '内容标题', 'Content title'); D('sy.cnt.edit', '编辑用户端内容', 'Edit app content');
  D('sy.ctype.agreement', '协议', 'Agreement'); D('sy.ctype.product', '产品信息', 'Product info'); D('sy.ctype.hint', '提示', 'Message'); D('sy.cnt.titleZh', '内容标题（中文）', 'Title (Chinese)'); D('sy.cnt.titleEn', '内容标题（英文）', 'Title (English)'); D('sy.cnt.bodyZh', '正文内容（中文，富文本）', 'Body (Chinese, rich text)'); D('sy.cnt.bodyEn', '正文内容（英文，富文本）', 'Body (English, rich text)');
  D('sy.cnt.stHint', '未发布时，员工端不显示该内容', 'Unpublished content is not shown on the phone'); D('sy.toast.cSaved', '内容已保存', 'Content saved');

  // dictionaries
  D('sy.dict.title', '字典管理', 'Dictionaries'); D('sy.dict.sub', '集中维护系统基础字典，修改后同步到相关业务表单', 'Base data in one place; changes reach the related forms'); D('sy.dict.add', '新增字典项', 'New item'); D('sy.dict.edit', '编辑字典项', 'Edit item'); D('sy.dict.formSub', '保存后同步到对应业务表单', 'Saved items reach the related forms');
  D('sy.dict.type', '字典类型', 'Dictionary'); D('sy.dict.typeHint', '选择需要维护的基础数据', 'Choose the data to maintain'); D('sy.dict.n', '共 {n} 个字典项', '{n} items'); D('sy.dict.notWired', '对应表单暂仍使用内置选项', 'Forms still use built-in choices'); D('sy.dict.kw', '名称 / 编码', 'Name / code');
  D('sy.dict.parent', '所属国家', 'Country'); D('sy.dict.parentHint', '仅城市字典显示此字段，并且必须选择所属国家', 'Cities only; a country is required');
  D('sy.dict.delTitle', '删除字典项', 'Delete item'); D('sy.dict.delSub', '请确认是否删除以下字典项', 'Confirm deleting this item'); D('sy.dict.delNote', '删除后不可恢复。若该字典项已被人员、项目、单位、考勤组、薪资模板或下级城市引用，将禁止删除，可改为停用。', 'Deleting cannot be undone. An item used by people, projects, companies, attendance groups, pay templates or cities cannot be deleted; stop it instead.');
  D('sy.dict.used', '仍有 {n} 处在使用该字典项。', '{n} records still use it.'); D('sy.dict.useHow', '请先改用其他选项，或直接停用。', 'Switch them to another choice first, or stop the item.');
  const T = { country: ['国家', 'Countries', '用于人员、项目及手机号地区', 'People, projects and phone regions'], city: ['城市', 'Cities', '关联国家，用于项目地址', 'Linked to a country, for project addresses'], companyType: ['单位类型', 'Company types', '用于创建与编辑单位', 'For creating and editing companies'], roundUnit: ['取整单位', 'Rounding units', '用于考勤组计时规则', 'For attendance group timing rules'], templateType: ['模板类型', 'Template types', '用于薪资模板', 'For pay templates'], pcp: ['PCP 运营商', 'PCP operators', '用于维护 PCP 运营商', 'For maintaining PCP operators'] };
  Object.entries(T).forEach(([k, [zh, en, dzh, den]]) => { D('sy.dt.' + k, zh, en); D('sy.dt.' + k + '.d', dzh, den); });
  D('sy.toast.dSaved', '字典项已保存', 'Item saved'); D('sy.toast.dAdded', '字典项已新增', 'Item added'); D('sy.toast.dDel', '字典项已删除', 'Item deleted'); D('sy.toast.dStopped', '字典项已停用', 'Item stopped');

  const E = (k, zh, en) => D('sy.e.' + k, zh, en);
  E('req', '请填写此项', 'Required'); E('secret_len', '密钥应为 8–128 个字符', 'A key is 8–128 characters'); E('len', '内容过长', 'Too long'); E('url', '请输入有效的 http(s) 地址', 'Enter a valid http(s) address'); E('sender', 'Sender ID 为 3–11 位字母或数字', 'Sender ID is 3–11 letters or digits'); E('untested', '请先测试连接成功，再启用', 'Test the connection successfully before enabling');
  E('titleZh', '请输入中文标题', 'Enter the Chinese title'); E('titleEn', '请输入英文标题', 'Enter the English title'); E('title_len', '标题过长', 'The title is too long'); E('bodyZh', '请输入中文正文', 'Enter the Chinese body'); E('bodyEn', '请输入英文正文', 'Enter the English body'); E('body_len', '正文过长', 'The body is too long'); E('version', '版本格式应为 V1.0', 'Use a version like V1.0'); E('status', '请选择状态', 'Choose a status');
  E('zh', '请输入中文名称', 'Enter the Chinese name'); E('zh_len', '名称最多 30 个字符', 'At most 30 characters'); E('zh_dup', '该名称已存在', 'This name already exists'); E('en', '请输入英文名称', 'Enter the English name'); E('en_len', '英文名称最多 60 个字符', 'At most 60 characters');
  E('code', '请输入编码', 'Enter a code'); E('code_fmt', '编码只能用大写字母、数字、- 和 _', 'Capital letters, digits, - and _ only'); E('code_dup', '该编码已存在', 'This code already exists'); E('parent', '请选择所属国家', 'Choose the country'); E('sort', '排序应为 1–999 的整数', 'Order is a whole number from 1 to 999');
  D('nt.e.sms_off', '国际短信服务已停用，不能用短信发布', 'The SMS service is off, so announcements cannot be sent by SMS');

  // phone settings
  D('w.set.title', '设置', 'Settings'); D('w.set.legal', '协议与信息', 'Agreements and information'); D('w.set.version', '版本', 'Version'); D('w.set.lang', '语言', 'Language'); D('w.set.langNote', '语言可在页面顶部的“中文 / EN”切换。', 'Switch the language with 中文 / EN at the top of the page.'); D('w.set.none', '暂无内容', 'Nothing here yet'); D('w.set.updated', '更新于 {d}', 'Updated {d}');
  D('w.home.unassignedTitle', '待分配', 'Awaiting assignment');
})(window.BS);
