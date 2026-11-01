/* Strings: 激励与钱包 (incentives and wallets). */
(function (BS) {
  const D = BS.D;
  D('a.nav.wallet', '激励与钱包', 'Incentives & wallets'); D('pg.wallet', '积分账本、现金与课程钱包、奖励与扣分、可撤销的扣分', 'Points ledger, cash and course wallets, awards and deductions, reversible deductions');
  D('wl.tab.wallets', '员工钱包', 'Wallets'); D('wl.tab.rules', '规则与汇率', 'Rules & rates');
  D('wl.hero.kicker', '智能激励与技能提升引擎', 'Smart workforce incentive & upskilling engine'); D('wl.hero.title', '可撤销扣分与双钱包激励', 'Reversible deduction & dual-wallet incentive system');
  D('wl.hero.body', '鼓励安全勤勉与持续提升技能。积分可兑换现金券，或按 2 倍提升汇率兑换课程额度，用于培训预订；扣分在完成纠正培训后自动撤销。', 'Rewards for safety diligence and continuous upskilling. Points convert to a cash voucher, or at the boosted rate into course credit that pays for training. Deductions are reversed automatically once the worker completes the corrective training.');
  D('wl.hero.btn', '用课程额度去培训', 'Use course credit to upskill');
  D('wl.k.pool', '激励积分总池', 'Total incentive pool'); D('wl.k.poolSub', '{n} 位员工有积分记录', 'Across {n} workers with a record'); D('wl.k.cash', '现金钱包价值', 'Cash wallet value'); D('wl.k.cashSub', '汇率 S$ {r} / 分', 'Rate S$ {r} per point');
  D('wl.k.course', '课程钱包价值（2 倍）', 'Course upskill wallet (2× boost)'); D('wl.k.courseSub', '汇率 S$ {r} / 分', 'Rate S$ {r} per point'); D('wl.k.reversed', '已撤销的扣分', 'Reversed deductions'); D('wl.k.reversedSub', '纠正培训后恢复的积分', 'Points restored after corrective training');
  D('wl.emps.title', '员工钱包与积分余额', 'Employee wallets & incentive balances'); D('wl.emps.sub', '积分可兑换为现金券或 2 倍的课程额度', 'Convert points into cash vouchers or 2× course credit'); D('wl.f.kw', '姓名 / 工号', 'Name / employee no.'); D('wl.none', '没有符合条件的员工', 'No workers match'); D('wl.count', '共 {n} 人', '{n} workers');
  D('wl.cash', '现金钱包', 'Cash wallet'); D('wl.course', '课程钱包', 'Course wallet'); D('wl.creditHeld', '持有课程额度', 'Course credit held'); D('wl.award', '奖励积分', 'Award points'); D('wl.deduct', '扣分', 'Deduct'); D('wl.redeem', '兑换', 'Redeem');
  D('wl.led.title', '审计账本', 'Audit ledger'); D('wl.led.sub', '奖励、扣分、撤销与兑换，只增不改', 'Points awarded, deducted, reversed and redeemed; entries are never edited'); D('wl.led.award', '奖励', 'Rewards'); D('wl.led.deduct', '扣分', 'Deductions'); D('wl.led.reversal', '撤销', 'Reversals'); D('wl.led.redeem', '兑换', 'Redemptions');
  D('wl.led.none', '没有记录', 'No entries'); D('wl.led.more', '显示其余 {n} 条', 'Show {n} more'); D('wl.led.less', '收起', 'Show less');
  D('wl.by', '经办', 'By'); D('wl.voucher', '现金券', 'voucher'); D('wl.credit', '课程额度', 'course credit'); D('wl.fromCredit', '预订 {ref} 使用课程额度', 'used for booking {ref}'); D('wl.backCredit', '预订 {ref} 退回课程额度', 'returned from booking {ref}');
  D('wl.reversed', '已撤销（{id}）', 'Reversed ({id})'); D('wl.reversible', '完成纠正培训后撤销：{c}', 'Reversed after corrective training: {c}'); D('wl.reversibleManual', '可由有权限的人手动撤销', 'Can be reversed manually'); D('wl.reverse', '撤销', 'Reverse'); D('wl.reverses', '撤销扣分 {id}', 'Reverses {id}');
  D('wl.proto', '原型提示：积分与钱包独立于工资，不会改动任何工资单；现金券与课程额度为模拟。试试在“培训预订 → 报名申请”里完成已注册的 CSOC 申请（陈建国、刘海）：两人的“不安全行为”扣分会自动撤销，并各得完成课程的积分。', 'Prototype: points and wallets are separate from payroll and never change a payslip; vouchers and course credit are simulated. Try completing the seeded CSOC request in the training hub (Enrolment requests): the unsafe-act deductions of the two workers are reversed automatically and each earns points for the course.');
  // dialogs
  D('wl.m.award', '奖励积分', 'Award points'); D('wl.m.deduct', '扣分', 'Deduct points'); D('wl.m.redeem', '兑换积分', 'Redeem points'); D('wl.m.awardOk', '确认奖励', 'Award'); D('wl.m.deductOk', '确认扣分', 'Deduct'); D('wl.m.balance', '现有 {n} 分', 'Balance {n} pts'); D('wl.m.rule', '规则', 'Rule'); D('wl.m.custom', '（自定义）', '(custom)');
  D('wl.m.points', '积分', 'Points'); D('wl.m.after', '操作后余额：{n} 分', 'Balance afterwards: {n} pts'); D('wl.m.reason', '原因', 'Reason'); D('wl.m.reasonPh', '例如：发现并上报隐患', 'For example: reported an unsafe condition'); D('wl.m.corrective', '纠正培训（选填）', 'Corrective training (optional)'); D('wl.m.noCorrective', '（无：只能手动撤销）', '(none: manual reversal only)');
  D('wl.m.correctiveHint', '员工完成这门课程后，这次扣分自动撤销。', 'When the worker completes this course the deduction is reversed automatically.');
  D('wl.m.redeemPts', '兑换积分', 'Points to redeem'); D('wl.m.redeemHint', '每次为 {s} 分的整数倍', 'In multiples of {s} points'); D('wl.m.redeemOk', '兑换 {v}', 'Redeem {v}');
  D('wl.route.cash', '现金券', 'Cash voucher'); D('wl.route.cashSub', 'S$ {r} / 分', 'S$ {r} per point'); D('wl.route.course', '课程额度（2 倍提升）', 'Course credit (2× boost)'); D('wl.route.courseSub', 'S$ {r} / 分，只能用于培训预订', 'S$ {r} per point, for training bookings only');
  D('wl.route.cashPlain', '现金券', 'Cash voucher'); D('wl.route.coursePlain', '课程额度', 'Course credit'); D('wl.rs.spend', '预订培训使用课程额度', 'Course credit used for a training booking'); D('wl.rs.refund', '课程额度退回', 'Course credit returned'); D('wl.rs.corrective', '完成纠正培训（{id}），扣分自动撤销', 'Corrective training completed ({id}): deduction reversed'); D('wl.rs.reversed', '扣分已撤销', 'Deduction reversed');
  D('wl.rv.title', '撤销扣分', 'Reverse the deduction'); D('wl.rv.msg', '将恢复 {n} 分（原因：{r}）。每笔扣分只能撤销一次。', 'This gives back {n} points (deducted for: {r}). A deduction can be reversed once.'); D('wl.rv.ph', '撤销原因（选填）', 'Why it is reversed (optional)');
  const E = (k, zh, en) => D('wl.e.' + k, zh, en);
  E('emp', '请选择在职员工', 'Choose an active worker'); E('rule', '规则不可用', 'This rule is not available'); E('points', '积分为 1–2000 的整数', 'Points are a whole number from 1 to 2000'); E('reason', '请填写原因', 'Enter a reason'); E('reason_len', '原因至少 3 个字', 'The reason needs at least 3 characters'); E('insufficient', '余额不足', 'Not enough points');
  E('course', '请选择有效的课程', 'Choose a valid course'); E('wallet', '请选择兑换方式', 'Choose how to redeem'); E('step', '兑换积分须为 100 的整数倍', 'Redeem in multiples of 100 points'); E('date', '请选择生效日期', 'Choose an effective date'); E('past', '生效日期不能早于今天', 'The date cannot be in the past'); E('later', '必须晚于现有最新版本的生效日期', 'It must be later than the latest version’s date');
  E('cash', '现金汇率应在 0.01–1 之间', 'The cash rate is between 0.01 and 1'); E('course_rate', '课程汇率应在 0.01–2 之间', 'The course rate is between 0.01 and 2'); E('lower', '课程汇率不能低于现金汇率', 'The course rate cannot be below the cash rate');
  D('wl.t.awarded', '已奖励积分', 'Points awarded'); D('wl.t.deducted', '已扣分', 'Points deducted'); D('wl.t.reversed', '扣分已撤销', 'Deduction reversed'); D('wl.t.voucher', '现金券已发放：{c}（{v}）', 'Cash voucher issued: {c} ({v})'); D('wl.t.credit', '课程额度已到账：{v}', 'Course credit added: {v}');
  D('wl.t.rules', '规则已保存', 'Rules saved'); D('wl.t.rate', '新汇率版本已添加', 'New rate version added'); D('wl.t.stale', '这条记录已变化，请刷新后再试', 'This entry has changed; please look again'); D('wl.t.already', '这笔扣分已撤销过', 'This deduction was already reversed');
  // rules tab
  D('wl.rules.title', '激励规则与汇率', 'Incentive rules & rates'); D('wl.rules.sub', '哪些行为奖励或扣多少分，以及积分兑换成现金和课程额度的汇率', 'What earns or loses points, and what a point is worth as cash or course credit'); D('wl.rules.earn', '奖励与扣分规则', 'Earning and deduction rules'); D('wl.rules.award', '奖励', 'Rewards'); D('wl.rules.deduct', '扣分', 'Deductions'); D('wl.rules.pts', '积分', 'Points'); D('wl.rules.save', '保存规则', 'Save rules');
  D('wl.rates.title', '兑换汇率（按生效日期）', 'Conversion rates (effective-dated)'); D('wl.rates.hint', '兑换时使用当天生效的版本，并记在账本里；新版本只能从今天或以后生效。', 'A redemption uses the version in force that day and records it; a new version can only start today or later.'); D('wl.rates.from', '生效日期', 'Effective from'); D('wl.rates.cash', '现金汇率（S$/分）', 'Cash rate (S$/pt)'); D('wl.rates.course', '课程汇率（S$/分）', 'Course rate (S$/pt)'); D('wl.rates.mult', '倍数', 'Multiple');
  D('wl.rates.now', '现行', 'In force'); D('wl.rates.future', '待生效', 'Scheduled'); D('wl.rates.old', '已过期', 'Superseded'); D('wl.rates.add', '添加新版本', 'Add a version');
  // training payment
  
  // worker app
  D('w.tile.wallet', '积分钱包', 'Rewards wallet');
  D('w.wl.title', '积分钱包', 'Rewards wallet'); D('w.wl.balance', '积分余额', 'Points balance'); D('w.wl.rate', '1 分 = 现金 S$ {c}，或课程额度 S$ {k}', '1 point = S$ {c} cash, or S$ {k} course credit'); D('w.wl.cash', '现金券', 'Cash voucher'); D('w.wl.course', '课程额度', 'Course credit');
  D('w.wl.redeemCash', '兑换现金券', 'Redeem as cash'); D('w.wl.redeemCourse', '兑换课程额度', 'Redeem for courses'); D('w.wl.credit', '已有课程额度', 'Course credit held'); D('w.wl.creditHint', '预订培训时可用', 'Use it when booking training'); D('w.wl.history', '积分记录', 'History'); D('w.wl.none', '还没有积分记录', 'No points yet');
  D('w.wl.redeemTitle', '兑换积分', 'Redeem points'); D('w.wl.youGet', '你将得到', 'You get'); D('w.wl.getCash', '现金券编号会显示在提示里，向主管出示领取。', 'The voucher code appears in the confirmation; show it to your supervisor.'); D('w.wl.getCourse', '额度加入课程钱包，预订培训时扣除。', 'The credit joins your course wallet and pays for training bookings.'); D('w.wl.confirm', '确认兑换', 'Confirm');
  D('w.wl.e.step', '兑换积分须为 100 的整数倍', 'Redeem in multiples of 100 points'); D('w.wl.e.insufficient', '积分不足', 'Not enough points'); D('w.wl.e.emp', '账号不可用', 'Account unavailable'); D('w.wl.e.wallet', '请选择兑换方式', 'Choose how to redeem');
  D('w.wl.t.cash', '现金券已发放：{c}', 'Voucher issued: {c}'); D('w.wl.t.course', '课程额度已到账：{v}', 'Course credit added: {v}');
  // audit
  D('au.mod.wallet', '激励与钱包', 'Incentives & wallets'); D('au.type.award', '奖励', 'Award'); D('au.type.deduct', '扣分', 'Deduct'); D('au.type.reverse', '撤销', 'Reverse'); D('au.type.redeem', '兑换', 'Redeem');
  // prizes from the spin-and-win wheel
  D('wl.led.win', '转盘奖品', 'Wheel prizes'); D('wl.rs.win', '转盘奖品（{ref}）', 'Spin & win prize ({ref})'); D('wl.rs.spinPts', '转盘奖品积分（{ref}）', 'Spin & win points ({ref})');
})(window.BS);
