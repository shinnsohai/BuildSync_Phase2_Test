/* Strings: site chat accountability layer (owners and due times, proof, intake, rewards, appointments, results). */
(function (BS) {
  const D = BS.D;
  // ---- shown on another module's page (the permit card) ----
  D('kc.ptw.cards', '现场群聊里有 {n} 张未解决的安全卡片关联这张许可', 'Open safety cards from the site chat linked to this permit: {n}'); D('kc.ptw.open', '去看板', 'Open the board');
  // ---- room notices ----
  D('kc.sys.esc1', '⚠ {id} 已超过处理时限，已升级给 {n}（主管）', '⚠ {id} is past its due time. Escalated to {n} (supervisor).');
  D('kc.sys.esc2', '🚨 {id} 严重超时，已升级给 {n}', '🚨 {id} is far past its due time. Escalated to {n}.');
  D('kc.sys.unowned', '⚠ {id} 到现在还没有负责人，已通知 {n}', '⚠ {id} still has no owner. {n} has been told.');
  D('kc.sys.rejected', '{n} 判定卡片 {id} 不成立', '{n} marked card {id} as not valid');
  D('kc.sys.spotfail', '卡片 {id} 抽查未通过，已重新打开（{n}）', 'Card {id} failed the spot-check and is open again ({n})');
  D('kc.sys.held', '{n} 一小时内报告太多，这条消息转给负责人确认，没有自动建卡', 'Too many reports from {n} this hour. This one was sent to a manager to review; no card was made automatically.');
  // ---- time and owner on a card ----
  D('kc.sla.ok', '剩余 {t}', 'Due in {t}'); D('kc.sla.soon', '快到期：剩余 {t}', 'Due soon: {t} left'); D('kc.sla.overdue', '已超时 {t}', 'Overdue by {t}'); D('kc.sla.esc2', '严重超时 {t}', 'Far overdue: {t}');
  D('kc.sla.met', '按时关闭（用时 {t}）', 'Closed in time ({t})'); D('kc.sla.missed', '超时关闭（用时 {t}）', 'Closed late ({t})'); D('kc.sla.unowned', '没有负责人', 'No owner');
  D('kc.owner', '负责人：{n}', 'Owner: {n}'); D('kc.own', '我来负责', 'Take ownership'); D('kc.escLvl', '已升级到第 {n} 级', 'Escalated: level {n}'); D('kc.auto', '自动指派', 'auto-assigned');
  D('kc.dur.h', '{h} 小时 {m} 分', '{h} h {m} min'); D('kc.dur.m', '{m} 分钟', '{m} min'); D('kc.dur.d', '{d} 天 {h} 小时', '{d} d {h} h');
  D('kc.flag.lowconf', '系统不确定，请核对', 'System unsure: please check'); D('kc.flag.model', '语言模型建的卡', 'Made by the language model'); D('kc.via.tap', '点选报告', 'Tap report'); D('kc.via.review', '负责人确认', 'Confirmed by a manager');
  // ---- not valid ----
  D('kc.reject', '不成立', 'Not valid'); D('kc.rejectTitle', '判定为不成立', 'Mark as not valid'); D('kc.rejectWhy', '原因（必填，至少 5 个字符）', 'Reason (required, at least 5 characters)'); D('kc.rejectBtn', '确认不成立', 'Confirm not valid'); D('kc.rejectedChip', '不成立：{r}', 'Not valid: {r}');
  D('kc.e.reason', '请写明原因（至少 5 个字符）', 'Write the reason (at least 5 characters)'); D('kc.e.reason_long', '原因最多 200 个字符', 'The reason is 200 characters at most');
  // ---- why a closing is refused ----
  D('kc.e.scope', '你的任命没有覆盖这个项目或工区', 'Your appointment does not cover this project or site');
  D('kc.e.stale', '这张照片拍摄时间早于报告时间，不能当作整改证据', 'This picture was taken before the problem was reported, so it cannot show the fix');
  D('kc.e.before', '这是报告问题时的照片（整改前），不能当作整改证据', 'This is the picture that reported the problem (before the fix); it cannot show the fix');
  D('kc.e.camera', '这张卡片必须在应用内当场拍照；相册图片和文件不算', 'This card needs a photo taken in the app right now; gallery pictures and files do not count');
  D('kc.e.far', '照片拍摄位置不在这个工区的范围内', 'The photo was taken outside this site');
  D('kc.e.nogeo', '照片没有位置信息：请在工区内开启定位后拍照', 'The photo has no location: take it on site with location on');
  D('kc.e.spot_self', '不能抽查自己关闭或自己报告的卡片', 'You cannot check a card you closed or reported yourself');
  D('kc.e.hazard', '请选择一个问题类型', 'Choose what is wrong'); D('kc.e.long', '补充说明最多 200 个字符', 'The note is 200 characters at most');
  // ---- proof chips ----
  D('kc.pf.cam', '应用内拍摄', 'Taken in the app'); D('kc.pf.chat', '来自群聊', 'From the chat'); D('kc.pf.gallery', '来自相册', 'From the gallery'); D('kc.pf.far', '不在工区内', 'Outside the site'); D('kc.pf.nogeo', '没有定位', 'No location'); D('kc.pf.remote', '后台上传', 'Uploaded from the office'); D('kc.pf.unverifiable', '文件：无法核对时间和位置', 'File: time and place cannot be checked');
  D('kc.pf.pair', '同一对人反复报告和关闭', 'Same reporter and closer again and again'); D('kc.pf.sample', '随机抽查', 'Random sample'); D('kc.pf.in', '在工区内（距中心 {m} 米）', 'On site ({m} m from the centre)'); D('kc.pf.age', '拍摄于 {t}', 'Taken {t}');
  D('kc.takePhoto', '现场拍照', 'Take a photo'); D('kc.pickFile', '选文件或相册图片', 'Choose a file or gallery picture'); D('kc.needCam', '这张卡片必须当场拍照。', 'This card needs a photo taken now.'); D('kc.doneWhen', '算“完成”的标准', 'What counts as done');
  D('kc.done.Safety', '隐患已消除或已受控，并拍下整改后的现场。', 'The hazard is removed or controlled, and the area is photographed after the fix.'); D('kc.done.Quality', '已返工并验收合格，拍下合格的部位。', 'Reworked and inspected, with a photo of the accepted part.');
  D('kc.done.Material', '到货已确认，并写明新的到货时间。', 'Delivery confirmed, with the new arrival time written down.'); D('kc.done.Progress', '工作已完成并核对。', 'The work is finished and checked.');
  D('kc.award.cap', '本周奖励已达上限，这张卡片不再加分', 'Weekly points cap reached: no points for this card'); D('kc.award.pair', '同一对人反复出现，没有加分，已交抽查', 'Same pair again: no points, sent to spot-check'); D('kc.award.trust', '近期被判不成立的报告太多，没有加分', 'Too many recent invalid reports: no points');
  // ---- intake ----
  D('kc.rep', '点选报告', 'Report with taps'); D('kc.repTitle', '报告问题', 'Report a problem'); D('kc.repSub', '点一下哪里出了问题，不用打字。照片能让负责人更快处理。', 'Tap what is wrong. No typing needed. A photo helps the owner act faster.'); D('kc.repNote', '补充说明（可选）', 'Note (optional)'); D('kc.repSend', '发送报告', 'Send report'); D('kc.repPhoto', '加一张照片', 'Add a photo');
  D('kc.t.reported', '已报告，卡片 {id} 已建立', 'Reported: card {id} was made'); D('kc.t.heldrep', '报告已收到，已转给负责人确认（本小时报告次数已达上限）', 'Report received and sent to a manager (hourly limit reached)');
  D('kc.held', '待确认：没有自动建卡', 'Held: no card was made'); D('kc.held.lang', '系统看不懂这种文字', 'The system cannot read this script'); D('kc.held.media', '语音或视频，系统听不懂', 'Voice or video: the system cannot listen'); D('kc.held.rate', '一小时内报告太多', 'Too many reports this hour');
  D('kc.triage', '待确认的消息', 'Messages to review'); D('kc.triage.none', '没有需要确认的消息', 'No messages waiting'); D('kc.triage.sub', '系统读不懂，或发送人一小时内报告太多。请看一下，选一个类型建卡，或者标为无需处理。', 'The system could not read these, or the sender went over the hourly limit. Look, then pick a type to make a card, or mark as nothing to do.');
  D('kc.triage.make', '选类型建卡', 'Pick a type'); D('kc.triage.dismiss', '无需处理', 'Nothing to do'); D('kc.t.triaged', '已处理', 'Done'); D('kc.t.rejected', '卡片已标为不成立', 'The card was marked not valid');
  D('kc.pos', '我在哪里（演示）', 'Where am I (demo)'); D('kc.pos.onsite', '在工区内', 'On site'); D('kc.pos.off', '离工区约 2 公里', 'About 2 km away'); D('kc.pos.none', '没有定位信号', 'No GPS signal'); D('kc.posNote', '真实应用读取手机定位。这里用来演示照片位置检查。', 'The real app reads the phone’s GPS. This only demonstrates the photo location check.');
  // ---- spot-check ----
  D('kc.spot.pending', '等待抽查', 'Waiting for a spot-check'); D('kc.spot.pass', '抽查通过', 'Spot-check passed'); D('kc.spot.fail', '抽查未通过', 'Spot-check failed');
  // ---- admin: tabs and pages ----
  D('kca.tab.perf', '处理效果', 'Results'); D('kca.tab.spot', '抽查', 'Spot-check');
  D('kca.perf.title', '处理效果', 'Results'); D('kca.perf.sub', '一个主要指标：严重安全隐患从被报告到有证据地关闭，用了多久。', 'One main measure: how long a Critical safety hazard takes from report to an evidenced closure.');
  D('kca.perf.head', '严重隐患：报告到有证据关闭的中位时间', 'Critical hazards: median time from report to evidenced closure'); D('kca.perf.hours', '{h} 小时', '{h} h'); D('kca.perf.none', '这个时间段还没有关闭的严重隐患', 'No Critical hazard was closed in this period');
  D('kca.perf.target', '目标：{h} 小时内', 'Target: within {h} h'); D('kca.perf.met', '达标', 'On target'); D('kca.perf.miss', '未达标', 'Over target'); D('kca.perf.n', '基于 {n} 张已关闭的卡片', 'Based on {n} closed cards'); D('kca.perf.p90', '90% 的卡片在 {h} 小时内关闭', '9 in 10 cards closed within {h} h');
  D('kca.perf.within', '按时关闭率', 'Closed in time'); D('kca.perf.evid', '附证据率', 'With evidence'); D('kca.perf.high', '高危卡片中位时间', 'High cards: median time'); D('kca.perf.late', '现在超时或没人负责', 'Late or unowned now'); D('kca.perf.unowned', '没有负责人的高危/严重卡片', 'High/Critical cards with no owner');
  D('kca.perf.owned', '指派负责人的中位分钟数', 'Median minutes to a named owner'); D('kca.perf.reject', '被判不成立的报告', 'Reports marked not valid'); D('kca.perf.spot', '抽查：通过 / 未通过 / 等待', 'Spot-checks: passed / failed / waiting'); D('kca.perf.paid', '已发出的隐患奖励', 'Hazard rewards paid');
  D('kca.perf.days', '时间范围', 'Period'); D('kca.perf.d7', '最近 7 天', 'Last 7 days'); D('kca.perf.d30', '最近 30 天', 'Last 30 days'); D('kca.perf.d90', '最近 90 天', 'Last 90 days'); D('kca.perf.trend', '最近 14 天，每天关闭的严重隐患中位小时数', 'Last 14 days: median hours of Critical hazards closed each day');
  D('kca.perf.byRoom', '按聊天群', 'By room'); D('kca.perf.byOwner', '按负责人', 'By owner'); D('kca.perf.col.open', '未关闭', 'Open'); D('kca.perf.col.late', '超时/无人负责', 'Late/unowned'); D('kca.perf.col.med', '中位小时', 'Median h'); D('kca.perf.col.n', '已关闭', 'Closed'); D('kca.perf.noOwner', '（没有负责人）', '(no owner)');
  D('kca.spot.title', '抽查', 'Spot-check'); D('kca.spot.sub', '证据有疑点、同一对人反复出现，或被随机抽中的关闭，需要第二个人核对。抽查未通过会重新打开卡片，并收回积分。', 'Closings with doubtful evidence, a repeating pair, or picked at random need a second person. A fail reopens the card and takes the points back.');
  D('kca.spot.none', '没有等待抽查的关闭', 'Nothing is waiting for a spot-check'); D('kca.spot.pass', '通过', 'Pass'); D('kca.spot.fail', '不通过', 'Fail'); D('kca.spot.failTitle', '抽查不通过', 'Fail this closing'); D('kca.spot.failWhy', '请写明为什么证据不能接受（必填）', 'Say why the evidence is not acceptable (required)'); D('kca.spot.failBtn', '确认不通过', 'Confirm fail');
  D('kca.spot.why', '抽查原因', 'Why it was picked'); D('kca.spot.closedBy', '关闭人', 'Closed by'); D('kca.spot.reporter', '报告人', 'Reporter'); D('kca.t.spotpass', '已通过抽查', 'Spot-check passed'); D('kca.t.spotfail', '已标记为未通过，卡片重新打开，收回 {n} 分', 'Marked as failed: the card is open again and {n} points were taken back');
  D('kca.spot.done', '最近的抽查结果', 'Recent spot-check results');
  D('kca.triage.banner', '有 {n} 条消息等待确认', '{n} message(s) waiting for review'); D('kca.triage.open', '去看看', 'Review'); D('kca.late.only', '只看超时/无人负责', 'Late or unowned only'); D('kca.late.chip', '超时或无人负责', 'Late or unowned');
  D('kca.set.take', '改变规则会影响之后的判断；已关闭的卡片不会被重新判定。', 'Changing a rule affects later decisions; closed cards are not re-judged.');
  // ---- admin: settings ----
  D('kca.set.time', '处理时限与升级', 'Time to act, and escalation'); D('kca.set.sla', '各优先级的处理时限（小时）', 'Time allowed per priority (hours)'); D('kca.set.slaSub', '从报告开始算，到有证据地关闭为止。超过后自动升级，没有人为的“暂停”。', 'Counted from the report until an evidenced closing. When it runs out the card escalates by itself; there is no pause button.');
  D('kca.set.ownerMin', '高危和严重卡片必须在多少分钟内有负责人', 'Minutes a High or Critical card may stay without an owner'); D('kca.set.l1', '超过时限的百分之几，升级给主管', 'Escalate to the supervisor at this share of the time (%)'); D('kca.set.l2', '超过时限的百分之几，升级给看板负责人', 'Escalate to the board owner at this share (%)');
  D('kca.set.e.sla', '请填 1 到 720 的整数', 'Whole hours, 1 to 720'); D('kca.set.e.sla_order', '严重 ≤ 高 ≤ 中 ≤ 低', 'Critical ≤ High ≤ Medium ≤ Low'); D('kca.set.e.owner', '5 到 240 分钟', '5 to 240 minutes'); D('kca.set.e.esc', '50 到 600 之间的整数', 'A whole number, 50 to 600'); D('kca.set.e.esc_order', '第二次升级必须晚于第一次', 'The second escalation must come after the first');
  D('kca.set.proof', '证据的真实性', 'Is the evidence real?'); D('kca.set.capture', '必须在应用内当场拍照的卡片', 'Cards that need a photo taken in the app now'); D('kca.set.cap.off', '不要求', 'Not required'); D('kca.set.cap.critical', '严重卡片', 'Critical cards'); D('kca.set.cap.high', '高危和严重卡片', 'High and Critical cards');
  D('kca.set.capSub', '当场拍照时记录时间和位置；相册图片和文件在这些卡片上不算证据。', 'A photo taken in the app records its time and place. Gallery pictures and files do not count on these cards.');
  D('kca.set.geo', '照片位置检查（工区围栏来自“工区”设置）', 'Photo location check (the site fence comes from Sites)'); D('kca.set.geo.off', '不检查', 'Off'); D('kca.set.geo.flag', '不在工区内：标记并交抽查', 'Outside: flag it and send to spot-check'); D('kca.set.geo.block', '不在工区内：拒绝关闭', 'Outside: refuse the closing');
  D('kca.set.e.enum', '请选择一项', 'Choose one');
  D('kca.set.intake', '报告入口', 'Reporting'); D('kca.set.tagLimit', '每人每小时最多自动建几张卡（0 = 不限）', 'Cards one person may make per hour (0 = no limit)'); D('kca.set.tagLimitSub', '超过的消息不会丢：会放进“待确认”，由负责人决定。严重的安全报告不受限，除非这个人近期有 2 次被判不成立。', 'Extra messages are not lost: they wait in the review list for a manager. Critical safety reports are not limited unless the person had 2 reports marked not valid recently.');
  D('kca.set.e.limit', '0 到 20 的整数', 'A whole number, 0 to 20'); D('kca.set.e.rate', '0 到 100', '0 to 100');
  D('kca.set.reward', '奖励', 'Rewards'); D('kca.set.rewardCap', '每人每 7 天最多几次隐患奖励（0 = 不限）', 'Hazard rewards one person may earn in 7 days (0 = no limit)'); D('kca.set.pairLimit', '同一对（报告人、关闭人）30 天内最多几次（0 = 不限）', 'Times the same reporter and closer pair may repeat in 30 days (0 = no limit)'); D('kca.set.spotRate', '随机抽查比例（%）；有疑点的关闭一律抽查', 'Share picked at random for a spot-check (%); doubtful closings are always checked');
  D('kca.set.permit', '工作许可', 'Permits'); D('kca.set.permitHold', '严重安全卡片未关闭时，暂停该工区的工作许可', 'Put the permits of a site on hold while a Critical safety card there is open'); D('kca.set.permitHoldSub', '暂停期间不能批准或开工，卡片关闭后自动恢复。', 'Permits cannot be approved or started meanwhile; they resume once the card is closed.');
  // ---- admin: appointments ----
  D('kca.appt.title', '正式任命', 'Appointments'); D('kca.appt.sub', '安全员、质检和排程员是有范围、有期限、有编号的任命，不再按工种猜测。安全员必须持有有效的安全员 C 证。', 'Safety officer, QC and scheduler are appointments with a scope, dates and a reference, not a guess from the trade. A safety officer must hold a valid Safety Officer C certificate.');
  D('kca.appt.new', '新任命', 'New appointment'); D('kca.appt.end', '结束任命', 'End appointment'); D('kca.appt.person', '人员', 'Person'); D('kca.appt.role', '职责', 'Role'); D('kca.appt.scope', '范围', 'Scope'); D('kca.appt.valid', '有效期', 'Valid'); D('kca.appt.ref', '任命编号', 'Reference'); D('kca.appt.status', '状态', 'Status');
  D('kca.appt.allSites', '该项目所有工区', 'All sites of the project'); D('kca.appt.from', '开始日期', 'From'); D('kca.appt.to', '结束日期', 'Until'); D('kca.appt.refPh', '任命书编号，如 APL-2026-050', 'Appointment letter number, e.g. APL-2026-050'); D('kca.appt.none', '还没有任命', 'No appointments yet');
  D('kca.appt.st.active', '有效', 'Active'); D('kca.appt.st.ended', '已结束', 'Ended'); D('kca.appt.st.expired', '已过期', 'Expired'); D('kca.appt.st.upcoming', '未开始', 'Not started'); D('kca.appt.st.suspended', '暂停：安全员 C 证已失效', 'Suspended: Safety Officer C expired');
  D('kca.appt.e.emp', '请选择在职人员', 'Choose an active person'); D('kca.appt.e.cert', '安全员必须持有有效的安全员 C 证', 'A safety officer needs a valid Safety Officer C certificate'); D('kca.appt.e.dup', '这个人在这个范围内已有同样的任命', 'This person already holds the same appointment here'); D('kca.appt.e.role', '请选择职责', 'Choose a role'); D('kca.appt.e.project', '请选择项目', 'Choose a project'); D('kca.appt.e.site', '这个工区不属于所选项目', 'This site is not part of the chosen project');
  D('kca.appt.e.date', '请填写日期', 'Enter a date'); D('kca.appt.e.order', '结束日期不能早于开始日期', 'The end date cannot be before the start date'); D('kca.appt.e.long', '任命期限最长一年', 'An appointment lasts a year at most'); D('kca.appt.e.ref', '任命编号 3 到 40 个字符', 'The reference is 3 to 40 characters');
  D('kca.appt.e.reason', '请写明结束的原因（至少 5 个字符）', 'Write why it ends (at least 5 characters)'); D('kca.appt.endTitle', '结束任命', 'End this appointment'); D('kca.appt.endWhy', '结束原因', 'Reason'); D('kca.t.apptNew', '任命已保存', 'Appointment saved'); D('kca.t.apptEnd', '任命已结束', 'Appointment ended');
  D('kca.crew.derived', '人员当前的聊天角色（由任命和岗位得出，不能直接修改）', 'Each person’s chat role today (from appointments and assignment; not edited here)');
  // ---- digest ----
  D('kca.dg.sla', '超时或无人负责 {a} 张；高危/严重无人负责 {b} 张；待抽查 {c} 条；待确认消息 {d} 条。', 'Late or unowned: {a}. High/Critical with no owner: {b}. Waiting for spot-check: {c}. Messages to review: {d}.');
  D('kca.dg.mttc', '严重隐患关闭中位时间（30 天）：{m} 小时，目标 {g} 小时，基于 {n} 张。', 'Critical hazards, median time to closure (30 days): {m} h against a target of {g} h, from {n} cards.'); D('kca.dg.mttcNone', '严重隐患关闭中位时间（30 天）：暂无数据。', 'Critical hazards, median time to closure (30 days): no data yet.');
})(window.BS);
