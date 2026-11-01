/* Strings: tenant management, subscriptions, provisioning stats, worker "service paused" screen. */
(function (BS) {
  const D = BS.D;
  D('t.tab.tenants', '租户列表', 'Tenants'); D('t.tab.subs', '订阅记录', 'Subscriptions');
  D('t.title', '租户管理', 'Tenant management'); D('t.sub', '创建并维护租户的独立登录账号与服务有效期', 'Create and maintain each tenant’s own login account and service validity');
  D('t.new', '新增租户', 'New tenant'); D('t.f.kw', '搜索公司名称 / 登录账号', 'Search company / login account'); D('t.f.status', '租户状态', 'Tenant status');
  D('t.st.active', '正常', 'Active'); D('t.st.disabled', '停用', 'Disabled');
  D('t.col.info', '租户信息', 'Tenant'); D('t.col.account', '登录账号', 'Login account'); D('t.col.total', '用户总量', 'Total users'); D('t.col.usable', '可用人数', 'Active users'); D('t.col.expired', '到期数量', 'Expired / inactive'); D('t.col.status', '状态', 'Status'); D('t.col.created', '创建时间', 'Created');
  D('t.people', '{n} 人', '{n} users'); D('t.ppl', '人', 'users'); D('t.disable', '停用', 'Disable'); D('t.enable', '启用', 'Enable'); D('t.none', '没有符合条件的记录', 'No records match the filters');

  D('t.m.title', '新增 / 编辑租户', 'Add / edit tenant'); D('t.m.sub', '新增与编辑复用同一表单', 'The same form is used to create and edit');
  D('t.m.logo', '公司 Logo', 'Company logo'); D('t.m.upload', '上传 Logo', 'Upload logo'); D('t.m.remove', '移除', 'Remove'); D('t.m.logoHint1', '建议尺寸 256 × 256px', 'Recommended 256 × 256 px'); D('t.m.logoHint2', 'PNG、JPG、SVG，最大 2MB', 'PNG, JPG or SVG, up to 2 MB');
  D('t.m.name', '公司名称', 'Company name'); D('t.m.namePh', '请输入公司名称', 'Enter the company name'); D('t.m.account', '登录账号', 'Login account'); D('t.m.accountPh', '请输入独立登录账号', 'Enter a unique login account');
  D('t.m.password', '登录密码', 'Password'); D('t.m.passwordPh', '请输入登录密码', 'Enter a password'); D('t.m.show', '显示', 'Show'); D('t.m.hide', '隐藏', 'Hide');
  D('t.m.pwRule', '至少 8 位，须包含字母和数字', 'At least 8 characters with a letter and a digit'); D('t.m.pwEdit', '编辑时留空表示不修改密码', 'Leave blank to keep the current password');
  D('t.m.status', '租户状态', 'Tenant status'); D('t.m.create', '确认创建', 'Create'); D('t.m.note', '备注', 'Note');
  D('t.m.protoPw', '原型不会保存密码，仅校验格式。', 'The prototype never stores passwords; it only checks the format.');
  D('t.c.offTitle', '停用「{name}」？', 'Disable “{name}”?'); D('t.c.offMsg', '停用后，该租户下所有用户将无法登录用户端。可随时重新启用。', 'All users of this tenant will be unable to use the worker app. You can enable it again at any time.');
  D('t.c.onTitle', '启用「{name}」？', 'Enable “{name}”?'); D('t.c.onMsg', '启用后租户用户可恢复使用（订阅仍须在有效期内）。', 'Users can use the app again (the subscription must also be valid).');
  D('t.toast.saved', '已保存租户「{name}」', 'Saved tenant “{name}”'); D('t.toast.created', '已创建租户「{name}」', 'Created tenant “{name}”'); D('t.toast.on', '已启用「{name}」', 'Enabled “{name}”'); D('t.toast.off', '已停用「{name}」', 'Disabled “{name}”');
  D('t.toast.subCreated', '已为「{name}」创建订阅', 'Created a subscription for “{name}”'); D('t.toast.renewed', '「{name}」已续约至 {d}', '“{name}” renewed until {d}'); D('t.toast.reactivated', '「{name}」已重新订阅，到期时间 {d}', '“{name}” resubscribed until {d}');
  D('t.toast.seats', '已调整「{name}」的可用人数', 'Updated available users for “{name}”'); D('t.toast.cancelled', '已退订「{name}」', 'Cancelled the subscription of “{name}”');

  D('t.e.name', '请输入公司名称', 'Enter the company name'); D('t.e.name_len', '公司名称最多 60 个字符', 'At most 60 characters'); D('t.e.name_dup', '该公司名称已存在', 'This company name already exists');
  D('t.e.account', '请输入登录账号', 'Enter a login account'); D('t.e.account_fmt', '3–30 位字母、数字、点、下划线或连字符', '3–30 letters, digits, dots, underscores or hyphens'); D('t.e.account_dup', '该登录账号已被使用', 'This login account is already taken');
  D('t.e.pw', '请输入登录密码', 'Enter a password'); D('t.e.pw_fmt', '密码至少 8 位，须包含字母和数字', 'Use at least 8 characters with a letter and a digit'); D('t.e.status', '请选择状态', 'Choose a status');
  D('t.e.logo_type', '仅支持 PNG、JPG、SVG 图片', 'Only PNG, JPG or SVG images'); D('t.e.logo_big', '图片不能超过 2MB', 'Image must be 2 MB or smaller'); D('t.e.logo_svg', 'SVG 过大（原型限制 150KB）', 'SVG is too large (prototype limit 150 KB)');
  D('t.e.missing', '记录不存在', 'Record not found'); D('t.e.tenant', '请选择租户', 'Choose a tenant'); D('t.e.exists', '该租户已有订阅，请在订阅记录中续约', 'This tenant already has a subscription; renew it instead');
  D('t.e.seats', '请输入 1–100,000 的整数', 'Enter a whole number from 1 to 100,000'); D('t.e.seats_used', '不能少于该租户当前有效人数', 'Cannot be fewer than the tenant’s current active users');
  D('t.e.price', '请输入大于 0 的单价（最多两位小数）', 'Enter a price above 0 (up to 2 decimals)'); D('t.e.start', '请选择开始日期', 'Choose a start date'); D('t.e.end', '请选择结束日期', 'Choose an end date');
  D('t.e.end_before', '结束日期不能早于开始日期', 'End date cannot be before the start date'); D('t.e.end_long', '订阅周期最长 10 年', 'A subscription can last at most 10 years');
  D('t.e.date', '请选择新的到期时间', 'Choose a new end date'); D('t.e.not_later', '新到期时间必须晚于 {d}', 'The new end date must be after {d}'); D('t.e.too_long', '订阅周期最长 10 年', 'A subscription can last at most 10 years'); D('t.e.note_len', '备注最多 200 字', 'Note is limited to 200 characters');
  D('t.e.same', '与当前可用人数相同，无需调整', 'Same as the current number; nothing to change'); D('t.e.below_used', '不能低于已使用人数（{n} 人）', 'Cannot be below the users already in use ({n})'); D('t.e.inactive', '订阅已到期或已退订，不能调整人数', 'The subscription has ended or was cancelled; seats cannot be changed');

  D('t.s.title', '订阅记录', 'Subscription records'); D('t.s.sub', '查看并维护租户订阅周期与级别变更', 'View and maintain tenants’ subscription periods and changes'); D('t.s.new', '创建订阅记录', 'New subscription');
  D('t.s.f.kw', '租户名称 / 客户 ID', 'Tenant name / customer ID'); D('t.s.f.status', '当前状态', 'Status'); D('t.s.f.from', '周期开始不晚于…', 'Period overlaps from'); D('t.s.f.to', '周期结束不早于…', 'Period overlaps to');
  D('t.s.col.cid', '客户 ID', 'Customer ID'); D('t.s.col.name', '租户 / 公司名称', 'Tenant / company'); D('t.s.col.price', '用户单价', 'Price per user'); D('t.s.col.start', '开始时间', 'Start'); D('t.s.col.end', '结束时间', 'End'); D('t.s.col.status', '当前状态', 'Status');
  D('t.s.view', '查看', 'View'); D('t.s.renew', '续约', 'Renew'); D('t.s.none', '没有符合条件的订阅记录', 'No subscriptions match the filters'); D('t.s.perPage', '{n} 条 / 页', '{n} per page'); D('t.s.missing', '未找到该订阅', 'Subscription not found');
  D('t.sst.active', '生效中', 'Active'); D('t.sst.upcoming', '待生效', 'Upcoming'); D('t.sst.soon', '即将到期', 'Expiring soon'); D('t.sst.expired', '已到期', 'Expired'); D('t.sst.cancelled', '已退订', 'Cancelled');

  D('t.d.title', '订阅详情', 'Subscription details'); D('t.d.sub', '查看租户订阅信息、续约记录与可用人数变更', 'Subscription info, renewals and seat changes');
  D('t.d.adjust', '调整可用人数', 'Adjust seats'); D('t.d.cancel', '退订', 'Cancel subscription'); D('t.d.seatsOff', '订阅已到期或已退订，不能调整人数', 'Not available after the subscription ended');
  D('t.d.basic', '订阅基础信息', 'Subscription'); D('t.d.seats', '当前可用人数', 'Seats'); D('t.d.end', '到期时间', 'Expires'); D('t.d.used', '已使用人数', 'In use'); D('t.d.left', '剩余可用人数', 'Remaining'); D('t.d.daysLeft', '还剩 {n} 天到期', '{n} day(s) left'); D('t.d.note', '备注', 'Note');
  D('t.d.renewals', '续约记录', 'Renewals'); D('t.d.renewalsSub', '每次续约保留到期时间变更轨迹', 'Every renewal keeps the change of expiry date'); D('t.d.all', '查看全部', 'View all'); D('t.d.less', '收起', 'Show less'); D('t.d.noRenewals', '暂无续约记录', 'No renewals yet');
  D('t.d.seatLog', '可用人数调整记录', 'Seat changes'); D('t.d.seatLogSub', '调整后实时生效并保留变更记录', 'Changes take effect immediately and are logged'); D('t.d.noSeatLog', '暂无调整记录', 'No changes yet');
  D('t.d.col.at', '操作时间', 'Time'); D('t.d.col.from', '原到期时间', 'Previous expiry'); D('t.d.col.to', '新到期时间', 'New expiry'); D('t.d.col.by', '操作人', 'By'); D('t.d.col.note', '备注', 'Note'); D('t.d.col.before', '调整前', 'Before'); D('t.d.col.after', '调整后', 'After'); D('t.d.col.delta', '变动', 'Change');
  D('t.by.admin', '系统管理员', 'System Admin'); D('t.by.ops', '运营管理员', 'Operations Admin');

  D('t.c.title', '创建订阅', 'Create subscription'); D('t.c.sub', '填写租户订阅信息，系统将根据人数与单价自动计算总价格', 'Enter the subscription; the total is calculated from seats × price');
  D('t.c.tenant', '选择租户', 'Tenant'); D('t.c.tenantPh', '请选择租户', 'Choose a tenant'); D('t.c.allHave', '所有租户都已有订阅，请在订阅记录中续约。', 'Every tenant already has a subscription; renew it from the list.');
  D('t.c.seats', '可用用户数量', 'Available users'); D('t.c.seatsPh', '请输入可用用户数量', 'Enter the number of users'); D('t.c.price', '用户单价', 'Price per user'); D('t.c.pricePh', '请输入用户单价（S$）', 'Enter the price per user (S$)');
  D('t.c.total', '总价格', 'Total price'); D('t.c.totalPh', '根据数量与单价自动计算', 'Calculated from seats and price'); D('t.c.totalHint', '总价格 = 可用用户数量 × 用户单价', 'Total = users × price per user'); D('t.c.notePh', '请输入备注信息（选填）', 'Notes (optional)');
  D('t.r.title', '续约订阅', 'Renew subscription'); D('t.r.sub', '选择新的到期时间，提交后保留本次续约记录', 'Pick a new end date; the renewal is kept in the history'); D('t.r.basic', '基础信息', 'Subscription'); D('t.r.curEnd', '当前到期时间', 'Current end');
  D('t.r.newEnd', '新到期时间', 'New end date'); D('t.r.notePh', '请输入续约说明（选填）', 'Renewal notes (optional)'); D('t.r.hint', '续约成功后将更新订阅到期时间，并在详情页生成续约记录。', 'The end date is updated and a renewal record appears on the detail page.');
  D('t.r.ok', '确认续约', 'Renew'); D('t.r.reactivate', '该订阅已退订，续约将重新启用订阅。', 'This subscription was cancelled; renewing will reactivate it.');
  D('t.a.sub', '修改该租户可使用 App 的用户总额度', 'Change how many users of this tenant may use the app'); D('t.a.info', '租户信息', 'Tenant'); D('t.a.cur', '当前可用人数', 'Current seats'); D('t.a.new', '调整后可用人数', 'New number of seats');
  D('t.a.previewIdle', '请输入新的可用人数', 'Enter the new number of seats'); D('t.a.same', '与当前可用人数相同', 'Same as the current number'); D('t.a.preview', '本次调整：{a} 人 → {b} 人（{w} {d} 人）', 'This change: {a} → {b} users ({w} {d})'); D('t.a.inc', '增加', '+'); D('t.a.dec', '减少', '−');
  D('t.a.note', '调整备注', 'Note'); D('t.a.notePh', '请输入调整原因（选填）', 'Reason (optional)'); D('t.a.hint', '确认后立即生效，并在详情页生成一条人数调整记录。', 'Takes effect immediately and adds a record on the detail page.'); D('t.a.ok', '确认调整', 'Confirm');
  D('t.x.title', '退订订阅？', 'Cancel subscription?'); D('t.x.msg', '「{name}」的订阅将被标记为已退订，用户端将暂停服务。之后可通过「续约」重新启用。', '“{name}”’s subscription will be marked cancelled and the worker app will be paused. You can reactivate it with “Renew”.');

  // stats
  D('t.st.basic', '基础统计', 'Basic stats'); D('t.st.prov', '人员开通统计', 'User provisioning'); D('t.st.title', '人员开通统计', 'User provisioning'); D('t.st.sub', '按月查看用户开通、有效和停用情况，支持人员费用核算与对账', 'Monthly view of users opened, active and disabled, for billing and reconciliation');
  D('t.st.range', '统计范围', 'Month'); D('t.st.allTenants', '全部租户', 'All tenants'); D('t.st.tenant', '租户', 'Tenant'); D('t.st.scope', '当前范围：{t} · {a} 至 {b}', 'Scope: {t} · {a} to {b}');
  D('t.st.total', '已开通总人数', 'Users opened'); D('t.st.totalSub', '截至当月月底累计开通', 'Cumulative to the end of the month'); D('t.st.valid', '当前有效人数', 'Active users'); D('t.st.validSub', '截至当月月底处于正常使用状态', 'In normal use at month end');
  D('t.st.added', '本月新增开通人数', 'Opened this month'); D('t.st.addedSub', '{m} 新开通用户', 'Users opened in {m}'); D('t.st.off', '本月停用人数', 'Disabled this month'); D('t.st.offSub', '{m} 停用或取消使用', 'Users disabled in {m}');
  D('t.st.detail', '人员开通明细', 'Provisioning details'); D('t.st.detailSub', '查看用户开通日期、使用状态及停用记录', 'Opening date, status and disabling date per user'); D('t.st.kw', '搜索用户姓名 / 账号', 'Search name / account'); D('t.st.opened', '开通日期', 'Opened on');
  D('t.st.col.name', '用户姓名', 'User'); D('t.st.col.account', '账号', 'Account'); D('t.st.col.opened', '开通日期', 'Opened'); D('t.st.col.status', '当前状态', 'Status'); D('t.st.col.disabled', '停用日期', 'Disabled on'); D('t.st.shown', '当前显示 {a} 条，共 {b} 条', 'Showing {a} of {b}');

  // worker app: service paused
  D('w.gate.tenant_disabled', '账号已停用', 'Account disabled'); D('w.gate.sub_expired', '订阅已到期', 'Subscription expired'); D('w.gate.sub_cancelled', '订阅已退订', 'Subscription cancelled'); D('w.gate.sub_upcoming', '订阅尚未生效', 'Subscription not started yet');
  D('w.gate.msg', '「{name}」的服务当前不可用，请联系你的公司管理员。', 'Service for “{name}” is currently unavailable. Please contact your company administrator.'); D('w.gate.contact', '联系管理员', 'Contact admin');
  D('w.gate.proto', '原型提示：由后台「租户管理」的租户 / 订阅状态触发，恢复后自动解除。', 'Prototype: triggered by the tenant / subscription status in admin; it clears automatically once restored.'); D('w.gate.toast', '原型提示：请在后台恢复租户或续约', 'Prototype: restore the tenant or renew in admin');
})(window.BS);
