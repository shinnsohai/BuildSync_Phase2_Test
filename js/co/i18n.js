/* Strings: 客户与分包商 (clients and subcontractors). */
(function (BS) {
  const D = BS.D;
  D('co.tab', '单位列表', 'Companies'); D('co.title', '客户与分包商', 'Clients & subcontractors'); D('co.sub', '维护客户主体、分包商及联系人、银行与名片资料', 'Maintain client and subcontractor companies with contacts, bank and business-card details');
  D('co.f.kw', '单位名称', 'Company name'); D('co.f.uenKw', 'UEN NO', 'UEN'); D('co.type.client', '客户', 'Client'); D('co.type.sub', '分包商', 'Subcontractor'); D('co.st.on', '正常', 'Normal'); D('co.st.off', '停用', 'Stopped');
  D('co.col.name', '单位名称', 'Company'); D('co.col.type', '单位类型', 'Type'); D('co.col.uen', 'UEN NO（唯一实体编号）', 'UEN (unique entity number)'); D('co.col.contact', '联系人', 'Contact'); D('co.col.phone', '联系电话', 'Phone'); D('co.col.status', '状态', 'Status');
  D('co.count', '共 {n} 家单位', '{n} companies'); D('co.add', '新增单位', 'New company'); D('co.edit', '编辑单位', 'Edit company'); D('co.ok', '确认', 'Confirm');
  D('co.f.name', '单位名称', 'Company name'); D('co.f.namePh', '请输入单位名称', 'Enter the company name'); D('co.f.nameEn', '英文名称（选填）', 'English name (optional)');
  D('co.f.uen', 'UEN NO（唯一实体编号）', 'UEN (unique entity number)'); D('co.f.uenPh', '请输入 UEN NO', 'Enter the UEN'); D('co.f.uenOpt', '境外分包商可不填', 'Optional for overseas subcontractors');
  D('co.f.contact', '联系人', 'Contact person'); D('co.f.contactPh', '请输入联系人', 'Enter the contact person'); D('co.f.phone', '国际联系电话（选填）', 'International phone (optional)');
  D('co.f.email', '电邮地址 / Email（选填）', 'Email (optional)'); D('co.f.emailPh', '请输入电邮地址', 'Enter the email address'); D('co.f.bank', '银行信息（选填）', 'Bank (optional)'); D('co.f.bankPh', '请输入银行名称及分行信息', 'Bank name and branch');
  D('co.f.bankNo', '银行户口（选填）', 'Bank account (optional)'); D('co.f.bankNoPh', '请输入银行户口号码', 'Enter the account number'); D('co.f.address', '注册地址', 'Registered address'); D('co.f.addressPh', '请输入注册地址', 'Enter the registered address');
  D('co.f.card', '名片附件（选填）', 'Business card (optional)'); D('co.f.cardHint', '支持 PDF、JPEG，单个文件不超过 10 MB', 'PDF or JPEG, up to 10 MB'); D('co.f.cardCur', '已选择：{f}（{s}）。原型只记录文件名和大小。', 'Selected: {f} ({s}). The prototype keeps only the file name and size.'); D('co.f.cardRemove', '移除', 'Remove');
  D('co.del.title', '删除单位', 'Delete company'); D('co.del.sub', '请核对单位信息后再确认删除', 'Check the company before deleting'); D('co.del.ok', '确认删除', 'Delete'); D('co.del.note', '删除后无法恢复。', 'Deleting cannot be undone.');
  D('co.del.people', '{n} 名人员的所属客户或所属公司是该单位', 'people list it as client or employer: {n}'); D('co.del.projects', '{n} 个项目归属该单位', 'projects owned by it: {n}'); D('co.del.how', '请先在人员或项目中改为其他单位，也可以先停用该单位。', 'Change those people or projects to another company first, or stop the company instead.');
  D('co.toast.created', '单位已新增', 'Company created'); D('co.toast.updated', '单位已保存', 'Company saved'); D('co.toast.deleted', '单位已删除', 'Company deleted'); D('co.toast.stopped', '单位已停用', 'Company stopped');
  const E = (k, zh, en) => D('co.e.' + k, zh, en);
  E('name', '请输入单位名称', 'Enter the company name'); E('name_len', '名称最多 80 个字符', 'At most 80 characters'); E('name_dup', '该单位名称已存在', 'This company name already exists'); E('type', '请选择单位类型', 'Select the type');
  E('uen', '客户必须填写 UEN NO', 'Clients need a UEN'); E('uen_fmt', 'UEN 应为 8–20 位字母或数字', 'A UEN is 8–20 letters or digits'); E('uen_dup', '该 UEN 已被其他单位使用', 'This UEN is used by another company');
  E('contact', '请输入联系人', 'Enter the contact person'); E('contact_len', '联系人最多 40 个字符', 'At most 40 characters'); E('phone', '请填写带国家区号的号码，例如 +65 8123 4567', 'Include the country code, e.g. +65 8123 4567'); E('email', '电邮地址格式不正确', 'The email address is not valid');
  E('bank_len', '银行信息最多 80 个字符', 'At most 80 characters'); E('bank_need', '填写银行户口时请同时填写银行信息', 'Enter the bank name together with the account'); E('bank_no', '银行户口应为 6–20 位数字', 'The account must be 6–20 digits');
  E('address', '请输入注册地址', 'Enter the registered address'); E('address_len', '地址最多 120 个字符', 'At most 120 characters'); E('card_type', '名片仅支持 PDF 或 JPEG', 'Only PDF or JPEG files'); E('card_size', '文件不能超过 10 MB', 'The file must be 10 MB or smaller');
})(window.BS);
