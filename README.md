# BuiltSync – Phase 2 prototype

One clickable app: the **worker phone** (left) and the **admin dashboard** (right) share the same data, so an action on one side shows up on the other. Modules built so far (the first set is Phase 1, manpower records and payroll; the five marked *Phase 2* are the concept-deck modules planned in `PHASE2-FRAMEWORK.md`):

**About the numbers.** Demo data is generated around today's date and the clock, so counts quoted in the walkthroughs (people on an attendance day, payslips in the current month, seats left in a batch, days until an expiry) can differ by a little from what you see; the *relationships* they illustrate hold. 重置演示数据 always returns to the generated seed.

**Opening it.** It is plain HTML, CSS and JavaScript with no build step and no server calls, so double-clicking `index.html` should work (I could only test through a local server, because my browser preview treats `file://` pages as static snapshots); any static server also works ( `dev-server.py` in the parent folder serves it without caching). Data is kept in the browser's local storage; 重置演示数据 restores it. The page loads two web fonts from Google Fonts; offline it falls back to system fonts (Chinese text still renders). **Offline everything works, including Excel import and the template download.** Only a legacy `.xls` file needs a network (see Personnel rules).
**Screen sizes.** Checked at 1500, 1024, 768, 390 and 360 px wide: below 1000 px the phone stacks above the dashboard, and below 480 px it fills the screen instead of sitting in a device frame. Wide tables scroll sideways inside their card; dialogs keep their title and Save / Cancel buttons on screen and scroll only the form.

| Module | Admin | Worker app |
|---|---|---|
| **Dormitory hub** *(Phase 2)* | 宿舍床位: **查找床位** (five dormitories, filters for region, worksite distance, room type, immediate move-in, air-conditioning, shuttle and a budget slider; bed matrix per room; shuttle routes), **分配** foreign workers to chosen beds with lease term, deposit and the address declaration; **公司床位租约** (confirm as the operator, cancel, end, view the declaration slip with QR); **宿舍标准** (illustrative checklist) | — |
| **Incentives & wallets** *(Phase 2)* | 激励与钱包: **员工钱包** (points pool, cash and course-wallet values, per-worker balances; **award**, **deduct**, **redeem**), **audit ledger** (rewards, deductions, reversals, redemptions; reverse a deduction), **规则与汇率** (earning / deduction rules, effective-dated conversion rates) | 工作中心 → **积分钱包**: balance, what it is worth as a cash voucher or as 2× course credit, redeem with a stepper, history |
| **Training hub** *(Phase 2, Wave 6)* | 培训预订 on a **Course Atlas snapshot** (real providers' intakes: dates, venue, language, published fee): **课程目录** (search, filters, courses that renew a certificate first), **课表矩阵** (provider × date), **培训中心地图** (OpenFreeMap), **机构对比**, **冲突顾问**, **报名申请** (a request that is approved, handed off to the provider's page, registered, confirmed, completed), **数据来源**. Phone app: **培训课程** (suggestions that renew expiring certificates, browse, map, saved, ask my employer) and **我的住宿** | — |
| **Spin & win** *(Phase 2, Wave 7)* | 转转乐: **奖品支出** (monthly prize budget vs spend, each slice's odds and times won, tokens issued, recent spins, CSV), **代币规则** (daily token, streak bonuses, referral rewards and cap), **转盘奖品** (8 slices: type, amount, weight, cap per worker per month, names, live odds and cost per spin, the budget), **邀请好友**, **工人代币** (balance, streak, today, token history, manual adjustment), **转盘素材** (the image slots and ChatGPT prompts) | **转转乐**: tokens, today's check-in / check-out, streak with milestones, the wheel with a spin animation and result card, invite code and friends, how it works, token history |
| **Permit to Work** *(Phase 2)* | 工作许可（PTW）: permit cards (hot work, work at height, heavy lifting, confined space, general), **apply** with a team chosen from workers deployed on the site, approve / reject, start, close, cancel; **automatic stop-work order** when anyone on the team fails the check; per worker **换人** (swap), **快速续期** (renew a document), **书面放行** (written override, certificates only); filters, search, CSV export, detail with history | — |
| **Deployments & compliance** *(Phase 2 foundation)* | 部署与合规: **人员部署** (a subcontractor's worker placed on a main contractor's site: request, accept / reject, block / unblock at the gate, end), **合规状态** (who may work today, by type of work), **合规规则** (base requirements and extra certificates per type of work), **事件记录** (the event bus) | — (the roster shows a red *不合规* badge; the roster form has passport and work-pass fields) |
| **System & third-party** | 系统与三方配置: 第三方服务 (map, SMS, file storage: configure, simulated **connection test**, enable / stop), 手机号地区 (fixed, read-only), 用户端内容 (privacy policy, terms, about, "awaiting assignment" message; Chinese + English rich text, version, publish), 字典管理 (countries, cities, company types, rounding units, template types, PCP operators: add / edit / delete) | **设置** tab lists the published agreements and About; the work centre shows the "awaiting assignment" message when the user has no project; country and PCP choices in the personnel forms come from the dictionaries |
| **Permissions** | 权限管理 → 后台角色: add / edit / delete roles, **配置权限** (pages, operations, data scope); 管理员账号: add / edit, reset password, **act as** an account | The whole dashboard follows the signed-in account: menus, buttons and the audit log (account menu at the bottom left of the sidebar) |
| **Content configuration** | 内容配置 → 弹窗内容: edit the sign-in and sign-out pop-up picture and message (Chinese + English), publish / unpublish, **preview** (with language switch); 安全提醒: add / edit / delete reminders (icon, background colour, title, subtitle), **set default** | The attendance sign-in / sign-out confirmation shows the published picture and message; the work centre shows the safety reminders (default first) |
| **Audit log** | 操作日志 → 审计日志: a read-only trail of administrator actions across all the modules above (time, administrator, module, action, object, IP, result), with filters and CSV export | — |
| **Surveys** | 问卷管理 → 问卷列表: filter, new / edit, **配置问题** (text, single, multiple choice, true / false, in Chinese and English, reorder, required flag), publish, delete, answered / not-answered **people lists**; 答卷记录: all submitted answers with detail and export | 工作中心 → **问卷**: to-do and done tabs, answering with **save draft**, submit, read-only submitted answers, a banner when a new one is published |
| **Announcements** | 通知管理 → 通知记录: send log with filters, **publish** (audience, channel, now or scheduled, Chinese + English, rich text), detail with a reading-language switch, delete, CSV export | **广播** tab: announcements for the user, unread dots and tab badge, mark all read, announcement detail, a banner when a new one arrives |
| **Certificates** | 证书管理 → 人员证书: status cards (valid / expiring / expired / none), filters, **add**, **update**, view (with attachment preview); 证书类型: add / edit types with several **reminder days**, stop | 工作中心 → **我的证书**: list, a "certificate expiring" reminder detail, a reminder banner and a count on the tile |
| **Clients & subcontractors** | 客户与分包商 → 单位列表: filter, add / edit (UEN, contact, masked phone, email, bank, business card), delete (blocked while in use), CSV export | The roster's client list and employer suggestions come from here |
| **Projects & sites** | 项目与工区 → 项目列表: filter, add / edit, **adjust end date** (delayed projects), **confirm complete**, per-project site list; 工区列表: add / edit with address search, map and **electronic fence**, stop / enable, delete (blocked while in use), CSV export | 考勤 follows the site: a stopped site blocks punching; a site that does not allow outside punches blocks them; fence radius and address come from the site |
| **Personnel** | 人员管理: roster (add / edit / view / enable-disable / secondment), **Excel/CSV import with row-level validation**, export, trade dictionary, project staffing + project role | A disabled employee sees an "account disabled" screen |
| **Attendance** | 考勤管理: daily summary, daily detail (view / **adjust**), monthly summary, attendance groups (shift, break and rounding rules) | 考勤: check-in / check-out with face check, 考勤记录 calendar; **time & location simulator** |
| **Payslips** | 薪资发放 → 工资单: generate from attendance, **verify**, handle disputes, mark paid | 工资: list, detail, confirm, dispute, re-confirm |
| **Reimbursement** | 报销审核: list, filters, detail, approve, reject (reason required) | 工作中心 → 报销: submit, records, detail, receipts, withdraw, resubmit |
| **CPF deduction rules** | 薪资发放 → 公积金扣除规则: citizen and PR rate tables, edit one rule, bulk edit, default PR rule, adjustment log, **deduction preview** by employee/month | — |
| **Tenants & subscriptions** | 租户管理: tenant list (create / edit / logo / enable-disable), 订阅记录: list, create, **renew**, detail, **adjust seats**, cancel; 数据统计 → 人员开通统计 | When the user's tenant is disabled or its subscription isn't valid, the app shows a "service paused" screen |
| **Leave application & approval** | 请假管理 → 请假审批: month calendar, day list, approve / reject, detail, **add leave on behalf of staff**, date picker | 工作中心 → 请假: apply, records, detail (withdraw / cancel / reapply) and, as supervisor, **请假审批** |
| **Leave quotas** | 请假管理 → 请假额度汇总: quota table, adjust, batch adjust, change log (now also shows leave used / returned) | 请假 balance cards + banner when a quota changes |
| **Overtime exchange** | 薪资发放 → 薪资模板: create/edit/delete templates, **加班兑换方式 = 工资 / 休假时间**, overtime-logging demo | Time-off balance (调休) appears in 请假 |

**Run:** open `index.html` in a browser (no build). Data is stored in the browser (`localStorage`); **重置演示数据 / Reset demo data** restores everything. For development, `python dev-server.py` (project root) serves this folder without caching.

## Try the Phase 2 foundations (≈4 minutes)
1. Admin → **部署与合规** (visible because the tenant's subscription includes the module). 人员部署 lists twelve deployments of two subcontractors' workers on two main contractors' sites. Four are 闸机拦截 (closed): hover the red tag for the reason: 陈建国 and Ravi Kumar have an expired CSOC, 赵磊's work pass is expired, 周强 was blocked by the main contractor.
2. **合规状态**: 18 people checked, 5 not valid, 3 expiring. Choose a type of work (动火作业) and the list is re-checked with the extra certificates it needs (16 are then not valid because most have no 焊工证).
3. **Fix a document and watch it cascade.** 人员管理 → 编辑 赵磊: set 准证到期日 a year ahead and save. Back in 部署与合规: his gate is now *准入*, and 事件记录 shows `employee.updated` followed by `compliance.changed ok→…`. Put the date back and the gate closes again.
4. **合规规则**: add *高处作业证* as a required certificate (save: nine more people become not valid, each with an event), then remove it. Tick *密闭空间作业 → 建筑业安全入门课程* chip. A reminder of 999 days is refused.
5. **申请部署**: leave the form empty (four errors); pick 张强 for 总包商 Pinnacle, Maritime → B2 and send. Because 张强 is a citizen with a valid CSOC he will pass; the request waits for the main contractor. 确认上场 issues an RFID card; **拦截** needs a reason; 结束部署 refuses a date before the start. Everything appears in 操作日志 under 部署与合规.
6. **Who sees what.** Account menu (bottom left) → **华东劳务 周经理** (subcontractor): only that company's six deployments, wages visible, no accept / block buttons, the request form is fixed to the company. Then **Pinnacle 项目协调员** (main contractor): only workers deployed to Pinnacle, the wage column shows *保密*, open 详情 and a note lists what is hidden (wage, bank, contact, personal details); accept a pending request or block a worker. Neither account sees any other page.
7. 租户管理 → 编辑 星瀚建设: untick 部署与合规 and save: the menu item disappears at once (and for every account); all five Phase 2 modules are now available. 权限管理 → 后台角色 → 新增: 组织类型 chooses whether a role belongs to the employer, a subcontractor or a main contractor; accounts of those roles must belong to a company of the matching type (客户与分包商 now has a third type, 总包商).

## Try Permit to Work and the hard stop (≈5 minutes)
1. Admin → **工作许可（PTW）**. Five permits: one running and clear (041, with a certificate that expires in 25 days shown as an amber name), **two under a stop-work order** (042 hot work, 043 formwork), one awaiting approval, one closed. A red banner and the 停工令 count say so; click **查看停工许可**.
2. 042 lists why, per worker: 赵磊's work pass expired, Ravi Kumar's CSOC expired and no welding certificate. Try **快速续期** on 赵磊: an empty date or one in the past is refused; give a date a year ahead and save: his name leaves the stop list at once, the permit is still stopped because of Ravi Kumar.
3. **换人** on Ravi Kumar: the list shows only people deployed on that site; 赵峰 is greyed out (no welding certificate), 周建国 is selectable. Swap: the permit is re-checked, **resumes by itself** and its history shows *stopped → swapped → resumed*. 预订复训课程 opens the training hub with the course and the worker already chosen (see the training walkthrough).
4. 043 has a CSOC lapse (陈建国) *and* a gate block on 周强 by the main contractor: no override is offered, the note says why. In 部署与合规 lift 周强's block (解除拦截): now only the certificate is left and **书面放行** appears. A reason under 10 characters is refused; give a real one and the permit shows *已书面放行（仅今天）* and runs for today. Renewing 陈建国's CSOC (证书管理 → 更新证书) lifts the stop for good.
5. **Cause and effect across modules.** In 证书管理 set 陈浩's 高处作业证 expiry to yesterday: permit 041 stops by itself (certificate: overridable). In 部署与合规 end 林晓雨's deployment: 041 now also shows *没有在该工区的有效部署* for her, which cannot be overridden. 事件记录 shows `ptw.suspended` / `ptw.resumed` after the `compliance.changed` that caused them.
6. **申请工作许可**: leave it empty (errors), choose *动火作业* at Maritime A1 for Pinnacle: both listed workers are greyed out with *不合规* (no welding certificate), choose *高处作业* and pick 陈浩. Submit, **批准**, **开工** (only on the work date), **完工关闭**. All in 操作日志 under 工作许可.
7. **Who may do what.** *华东劳务 周经理* (subcontractor): sees permits with its own workers, can apply, swap, renew and cancel its own, cannot approve or override. *Pinnacle 项目协调员* (main contractor): sees permits on Pinnacle's sites, can approve, reject, start and close, cannot swap, renew or override. 张经理 (project administrator) is limited to his two projects; 王人事 can only look.

## Try the training hub (≈8 minutes)
Courses come from a snapshot of your Course Atlas site (see *Training hub: decisions* below for what it does and does not hold).
1. Admin → **培训预订 → 课程目录**: 119 courses from 13 providers. The courses that renew a certificate (CSOC, work at height, rigger and signalman) are listed first with *更新…* tags. Search *scaffold*, filter by language or by a maximum fee, or tick *只看可更新证书的课程*. Each card shows the intakes, providers, next date and the *published* fee range; a class with no fee says so, nothing is guessed.
2. **查看 N 个班次**: every intake grouped by provider: dates, time, venue, language, fee (with *about S$ … after the grant (estimate)*), what the provider's page showed (*可报名* or *名额未知*) and a link to the provider's page that opens in a new tab.
3. **课表矩阵**: pick a course and see which provider starts on which of the next 10 days, with language and fee. **培训中心地图**: the numbers are intakes per centre; click one to list its classes; filter by course or language; *在课程目录查看全部* jumps to the catalogue for that centre. About half of the intakes have no placed venue (the provider did not publish one Course Atlas could match), the page says how many. **机构对比**: up to four providers side by side (registers, courses, languages, fee range, mapped venues, next intake, last checked). There are no ratings or pass rates because the source has none.
4. **Request a course.** In the catalogue press *申请报名* on an intake (or *快速申请*): the dialog checks every chosen worker against approved or pending leave, other requests and work permits. Ravi Kumar has a permit that day, so a red advisor appears; a leave or permit clash can be overridden in writing (at least 10 characters, employer account with approval right), a double booking cannot. Pay by *公司直接向机构付款* or, where the provider published a fee, by the worker's *课程钱包额度*.
5. **The hand-off.** After submitting you land in **报名申请**. The card says *待注册* with *打开机构注册页* (the provider's own page): register there, then press **已注册** and optionally paste the provider's reference. Then **机构已确认**, and later **模拟完成课程**: a course that renews a certificate gives each trainee a new expiry, the compliance engine and the permits see it, and the wallet reverses any deduction that named that certificate as its corrective training and awards the completion points. **申请单** shows the printable request slip, trainees and history. BuildSync never registers or pays on the provider's side.
6. **A worker asks.** Seeded request TR-…0003 comes from 张强's phone (*工人申请*): **批准并提交申请** (clashes checked again, payment chosen) or **婉拒** (a reason is required, the worker sees it on the phone). Phone app → **培训课程**: *为我推荐* lists the certificates that expire soon or are missing with the best matching intake; *全部课程* searches the catalogue; *地图* shows the centres (language chips with ★ for your own language); open a course, press **请雇主安排**, add a note; the request appears in *我的申请* and in the admin list. *收藏* keeps a shortlist.
7. **The whole loop.** 工作许可: permit 042 is stopped (Ravi Kumar's CSOC expired). **预订复训课程** opens the CSOC course with him already chosen; request an intake; the permit shows *已有申请 … 将更新这张证书*. Simulate completion: his certificate is renewed, and, once 周强's gate block is lifted in 部署与合规, permit 043 (the other problem was 陈建国's CSOC, covered by the seeded request TR-…0001; complete that one first) resumes by itself.
8. **数据来源** (employer accounts only): when the snapshot was taken, what it covers, its limits, how to refresh it, the API the production backend would need (`docs/API-CONTRACT.md`) and the providers.
9. Accounts: *华东劳务 周经理* can request only for her own company's workers and sees only her requests; she cannot approve, decline, confirm or simulate completion and has no 数据来源 tab. 王人事 can only look. 张经理 sees requests that include people in his two projects.

## Try incentives and wallets (≈5 minutes)
1. Admin → **激励与钱包**: a dark banner, four cards (total pool 2,200 pts, cash value S$ 220, course value S$ 440 at the 2× rate, reversed deductions 0) and, below, each worker's balance with *现金钱包* and *课程钱包* values (the same points read at the two rates) and an audit ledger on the right. Filter the ledger by 奖励 / 扣分 / 撤销 / 兑换.
2. **奖励积分** for 陈浩: leave it empty (points and reason refused); choose the rule *安全之星* (points fill in at 400) and confirm: his balance and the pool change, the ledger gets an entry. **扣分** for 林晓雨 of 5000 is refused (more than she has); deduct 60 with a reason and a *纠正培训* course (工人高处作业): the entry says it will be reversed after that course.
3. **兑换**: 吴东 (650 pts) shows both routes with their value for 100 points (S$ 10 cash voucher vs S$ 20 course credit). 150 is refused (multiples of 100). Redeem 300 as cash: a voucher code is issued and shown in the ledger. A manual deduction in the ledger (张强's late arrival) has **撤销**: give a reason; the points come back as a new entry and a second reversal is refused.
4. **The corrective loop.** The two *不安全行为* deductions (陈建国, 刘海) name the CSOC course as their corrective training. In 培训预订 → 报名申请 simulate completion of the CSOC request TR-…0001 (their request): both deductions are reversed automatically and each earns 100 points for finishing a course, as *system* entries; the *已撤销的扣分* card shows 2.
5. **Pay for training with the credit.** 林晓雨 holds S$ 40 of course credit (redeemed earlier). In the training hub request a work-at-height intake that has a published fee for her with **课程钱包额度**: her credit drops by the course's net price and a *spend* entry appears. Choosing someone without credit is refused with the name. Cancelling the request returns the credit; swapping the trainee refunds her and charges the new person, who must have enough.
6. **规则与汇率**: change a rule's points (0 is refused), add a new rate version dated a week ahead (cash 0.12, course 0.30): today's redemptions still use the current rate, a redemption after that date will use the new one, and the ledger records the rate used.
7. **Phone**: the 工作中心 → **积分钱包** tile (张强, 500 pts). Two route cards with values; open *课程额度*, step the amount with + / − in steps of 100 (it stops at his balance), switch to *现金券* and confirm: a voucher code is shown and the balance falls.
8. Accounts: 刘会计 (finance, own company scope) can look and redeem on a worker's behalf; 王人事 can only look; 张经理 can award, deduct and redeem for his two projects; subcontractor and main-contractor accounts do not see the module.

## Try the dormitory hub (≈5 minutes)
1. Admin → **宿舍床位 → 查找床位**: a green banner with four figures (islandwide vacant beds, average monthly rate, your housed workers, declaration compliance: 75%, three of four registered), a filter bar and five dormitories with open beds and the monthly range. Choose **工地远近 = Loading Bay**: dormitories sort by distance to that site and show whether a shuttle reaches it; tick **工地班车** to keep only those. Drag the **月租上限** slider to S$ 420 (fewer dormitories) and tick **冷气** (only air-conditioned rooms count).
2. **查看床位** on a dormitory: class and licence, the operator, shuttle routes with morning departures and evening returns (the one to your chosen site is highlighted), amenities, and a bed matrix by block and room. Grey beds are taken; beds that free up later carry a date badge; beds outside your filters are dimmed.
3. Pick two free beds: the footer totals the rent. **为所选床位分配工人**: leaving the workers empty is refused; the lists offer only foreign (FIN) workers you may house who are not already housed, and a worker chosen for one bed is greyed out for the other. A move-in date in the past is refused; choose 12 months and confirm.
4. **公司床位租约**: the new leases are *待运营商确认* with a declaration *已提交*. **模拟运营商确认** on the one for 赵磊: the operator sets the effective date to the later of the date asked and the day the bed becomes free, the declaration becomes *已登记*, and the worker's **residential address in the roster** changes to the dormitory. 申报凭证 shows the sample slip with QR and the history. Declaration compliance rises from 75% to 100%.
5. **取消申请** on a pending lease frees the bed and withdraws the declaration. **结束租约** on a confirmed lease refuses a date before the effective date, then closes the declaration and marks the deposit for refund.
6. **宿舍标准**: licence class and bed counts per dormitory plus an illustrative checklist (marked as such).
7. **地图 / Map view.** Beside the 列表 / 地图 switch above the results: the map shows the five dormitories as numbered pins (the number is their free beds under your filters), the worksites as small green squares (tick *显示工地* to hide them), and the shuttle routes of the selected dormitory as dashed lines (a straight line, not the road route). Zoom with the + / − buttons, the mouse wheel, double-click or pinch; drag to move; *适应全部* fits every pin. Click a pin to select that dormitory (the card and the bed matrix follow); click a cluster to zoom into it; click a worksite square to measure distance from that site (it sets 工地远近, the cards show kilometres and the route to that site turns bold). Change a filter and the pins follow. Switch to 列表 and back: the map keeps its place.
8. *新城分包 黄主管* (subcontractor) can house only her own company's foreign workers, sees only leases she made, cannot confirm as the operator; *王人事* can only look; the main contractor and finance accounts do not see the module.

## Try spin & win (≈7 minutes)
Today is whatever day you open it: tokens come from the attendance the prototype already has (the last week of seeded punches), so the numbers differ by day. On a Sunday nobody is scheduled.
1. Phone → **转转乐** tile. The dark card is the token balance; *今天* says whether today is a scheduled workday (both punches earn the day's token; a rest day or leave says the streak is **paused, not broken**); *连续出勤* shows the streak with the bonus milestones (3 / 7 / 14 / 30 workdays); the wheel is below.
2. Press **转一次**. The prize is decided at that moment; the wheel spins about four seconds and stops on it; the card says what you won. Points go straight to 积分钱包; *课程额度* is course credit you can pay a training request with; *现金券* has a voucher code to show a supervisor; *再转一次* gives the token back; *谢谢参与* wins nothing. Spin until the tokens run out: the button disables and says how to earn more.
3. **怎么玩** lists the rules as they are now (they come from the admin settings) and which slices a worker can no longer win this month. **邀请好友** shows your code and the friends you invited; **代币记录** lists every token in and out.
4. Admin → **转转乐 → 奖品支出**: the month's budget bar (S$ 500 by default, points counted at the cash rate), how often each slice came up, the most active workers and every spin with its reference. In **转盘奖品** set the budget to S$ 5 and save: once the month's spend passes it the report warns and the costly slices can no longer come up (only *再转一次* and *谢谢参与*); the phone's *怎么玩* shows them as *本月已发完*. Put a **cap per worker** of 1 on a points slice: after one win by a worker it cannot come up for that worker again this month.
5. **转盘奖品**: change a weight and the odds and the average cost per spin follow; remove every free slice and saving is refused. **代币规则**: change the streak days (they must go up) or the tokens; changes apply from today and never recalculate earlier days.
6. **Earning a token.** A missed day (one punch only) loses the streak. In 考勤管理 adjust that day's punches (*调整*): within 14 days the worker still gets that day's token (the streak is not repaired). Leave and rest days never break a streak.
7. **邀请好友 (admin)**: record that a new colleague registered with someone's code (the colleague must have joined within the number of days set in the rules). It stays *等好友出勤* until the friend completes a first worked day after it was recorded, then the inviter gets 3 tokens and the friend 2; past the inviter's monthly cap the friend is still paid and the referral shows *超出每月上限*. A pending one can be voided with a reason.
8. **工人代币**: balances, streaks and today's state per worker; *调整代币* adds or removes tokens with a reason (approve right needed). **转盘素材**: every image slot with its suggested size and a **复制提示词** button; drop a generated file into `assets/spin/` and press *重新检查图片*: the wheel picks it up (the missing ones are drawn in code).
9. Accounts: *王人事* can look but not adjust or change rules; finance, subcontractor and main-contractor accounts do not see 转转乐.

## Try system & third-party configuration (≈3 minutes)
1. Admin → 系统与三方配置 → 第三方服务. **配置** 国际短信服务: a Sender ID that is too short and a key under 8 characters are refused; save a key containing the word "bad": the service switches itself off and shows 未测试. **测试** it: 连接失败 (密钥无效). Try **启用** (refused until a test succeeds). In 通知管理 → 发布公告 choose the SMS channel: refused while the service is off. Save a normal key, test (连接成功) and enable it again.
2. 手机号地区 is a fixed, read-only table (filter only). 用户端内容: **编辑** 隐私协议 (bad version like `v1` refused; an empty Chinese body refused and you are taken to the tab that is missing), save with a new body. Phone → 设置: the agreements and About are listed, newest wording included; set one to 未发布 and it disappears.
3. 字典管理: pick **国家**, add one with a code that exists (refused), then a new one, stop it, delete it. Try to delete 新加坡: refused with how many records use it, with a *Stop instead* button. Pick **PCP 运营商**, rename A区: the people who had it follow, and the roster's PCP list shows the new name.
4. To see the "awaiting assignment" message on the phone, remove 张强's project assignment in 人员管理, then open 工作中心.

## Try data scope (≈2 minutes)
1. As 系统管理员 (全部数据) note the counts: 人员花名册 共 19 人, 证书 34, 项目 7, 工资单 16 (current month), 报销 32, and the attendance day list.
2. Switch to **张经理** (项目管理员, scope: Raffles + Maritime projects). A blue note says so at the top of each page, and every list, count and export shrinks: 13 people, about half the people on the attendance day, 23 certificates, 2 projects, 4 sites, leave quotas and approvals only for those people.
3. Add a person as 张经理 without giving them a project: they stay visible to him (anything an administrator creates is always visible to them).
4. Switch to **刘会计** (财务管理员, scope: own company = 华东建设劳务): 工资单 and 报销审核 only show that company's people (9 and 3 here). 管理员账号 shows which company each account belongs to.
5. In 后台角色 → 项目管理员 → 配置权限 try 仅本人创建 or 所属公司, then switch to 张经理 again: the first shows only people he created, the second shows nothing until the account has a company.

## Try permissions (≈3 minutes)
1. Admin → 权限管理 → 后台角色. Click **配置权限** on 项目管理员: open the three sections, untick a page (its operations disappear), tick an operation (查看 is ticked for you), choose 指定项目 with no project and save (refused), then pick projects and save.
2. Click the account at the bottom left of the sidebar and choose **刘会计** (finance). The menu shrinks to 数据统计 / 薪资发放 / 报销审核, and the page you were on moves to one you may open. On 薪资发放, 新增 or 删除 is refused with "你的角色没有此操作权限" while 核对 and 导出 work.
3. Switch to **张经理** and do something (for example stop an employee): 操作日志 now shows it under 张经理 with his IP. Switch back to **系统管理员**.
4. 管理员账号 tab: add an account (each field has a message), try to disable or change the role of 系统管理员 (refused: the last super administrator), and 重置密码 (a temporary password is shown once). 删除 a role that has an administrator: that account keeps existing but cannot be used (no role).

## Try content configuration (≈2 minutes)
1. Admin → 内容配置 → 弹窗内容. Click **预览** on the sign-in pop-up and switch 中文 / English; then **编辑**, clear the Chinese message and save (refused), type a new one and save.
2. Upload your own picture (PNG or JPG; a GIF is refused). Phone → 考勤, use the simulator to reach a sign-in or sign-out, and press the button: the confirmation sheet now shows your picture and message. Set the pop-up to 未发布 and it falls back to the built-in text.
3. 安全提醒 tab: **新增** one with a colour (the preview follows what you type and pick), then **设为默认** on another: the first row and the phone's work centre order change. The default has no 删除.
4. Phone → 工作中心: the safety reminders sit under the project card.

## Try the audit log (≈1 minute)
1. Admin → 操作日志. It opens with 26 seeded entries from several administrators (项目管理员, 薪资专员, 人事专员, ops01 …).
2. Do something in the dashboard, for example stop and then delete the unused site 暂存场地 in 项目与工区, approve a reimbursement, or publish an announcement. Come back: each action is at the top as 系统管理员 from 127.0.0.1, with the module, the action, the object's name and 成功.
3. Try an action the system refuses (for example 调整 attendance on a day with no punches): it is logged as 失败. A form that simply fails validation is not logged.
4. Filter by 管理员, 操作模块, 操作类型 and date; switch to English to see the module, action and object names in English.

## Try surveys (≈3 minutes)
1. Admin → 问卷管理. The 已填 / 未填 numbers are links: open them for the people lists (search, export, 详情; an unanswered person shows an empty sheet).
2. **新增问卷**: submit empty, then with the name of an existing survey, then with a deadline in the past while choosing 已发布 (each is refused). Choose **指定项目** → Raffles, pick a deadline a few days away, leave it as 草稿, save: you land on the question page.
3. **发布问卷** with no questions (refused). Add one of each type with **添加问题**; fill only the Chinese side of one and see 待补全 and the publish refusal. Add options, remove one (at least 2 stay), try the true / false question (its two options are fixed, only the wording can change), reorder with ↑ ↓, untick 必答 on one, then publish. The questions are now read-only.
4. Phone → 工作中心 → **问卷** (the tile shows how many are waiting): open the new survey, press 提交问卷 empty to see which questions are highlighted, fill some, **暂存**, go back (the card says 有暂存), continue and submit. It moves to 已填写 and opens read-only.
5. Back in the admin: the answer is in 答卷记录, and 已填 on the list went up by one. *住宿与后勤服务反馈* has passed its deadline: the phone shows it as 已截止 and it cannot be answered.

## Try announcements (≈2 minutes)
1. Admin → 通知管理 → **发布公告**. Press 确认发送 empty: both languages are required, and the tab with the problem shows a red dot. Pick 发送范围 **项目** → *Raffles Place 综合项目*: it says how many active people will get it (张强 is one).
2. Fill the Chinese title and content (try the toolbar: heading, bold, lists; pasted text arrives as plain text), switch to **English** (nothing is lost), fill that, and send. The phone shows a banner and an unread count on the 广播 tab.
3. Phone → 广播: unread items have a dot; open one for the detail (read it in either app language); **全部已读** clears the rest.
4. Publish again with **定时发送** and a time a few minutes ahead: it shows 待发送 and nothing reaches the phone until the time arrives (the page checks every 10 seconds).
5. Open a record → switch the reading language, then **删除**: it vanishes from the phone too. The seeded *防暑降温工作安排* went out by SMS and shows 部分失败 with who was missed.

## Try certificates (≈2 minutes)
1. Admin → 证书管理. Click the 已过期 and 即将到期 cards to filter; people with no certificate show **上传证书** (they are counted in the 未上传 card).
2. Click **上传证书** on 周强: submit empty (required fields), then with an expiry before the issue date, then properly with a PDF or JPEG. Try adding the same type to the same person again: it is refused and points to **更新证书**.
3. **更新证书** on any row, tick 永久 (the expiry field greys out) and save. On 陈建国's row, set a number that another 高处作业证 already has: refused.
4. 证书类型 tab: add a type, add reminder days (a duplicate or 500 is refused), remove all of them (refused), then rename the code of an existing type: its certificates follow.
5. Phone: 工作中心 → **我的证书** (张强 has one expiring in 28 days, so the tile shows a count and a banner appears a moment after the page loads). Open it for the reminder detail. In the admin, update 张强's expiry: the phone shows a "certificate updated" banner.

## Try clients & subcontractors (≈1 minute)
1. Admin → 客户与分包商. Click **新增**, save with a duplicate name, a bad UEN and a phone without a country code to see each message; then fill it in properly. The phone shows masked in the list, the bank account as `•••• 6789`.
2. **删除** Marina Bay Pte. Ltd.: blocked because people list it as their client (with a *Stop instead* button). Stop it, then open 人员管理 → 新增: it is gone from the client list. 删除 the stopped *Old Harbour Services* (unused) and it goes.
3. **编辑** Raffles Developments and rename it: the people who had it as their client follow the new name. In 人员管理 → 新增, the employer field now suggests the active subcontractors.

## Try projects & sites (≈2 minutes)
1. Admin → 项目与工区 → 项目列表. **Old Dock 改造一期** is 已延期 (its end date has passed): click **延期**, enter a date in the past (rejected), then a future date: the project turns 进行中 and the dialog shows how many days it grows.
2. Click **完成** on a project: the dialog counts the people and sites still open. Confirm, and the status stays 已完成 whatever the dates say; the project then disappears from the roster's project picker and its import button is disabled.
3. Click a project's **“N 个工区”** link for its site list, then **管理工区** to jump to 工区列表 filtered to that project.
4. **新增工区**: search “marina”, pick a result (address and coordinates fill in), click the map to nudge the pin, change the radius and watch the fence circle follow; saving checks code, radius and coordinates.
5. Try **删除** on Tower A (blocked: people and an attendance group use it, with a *Stop instead* shortcut) and on an unused site such as 暂存场地 (deleted).
6. **停用** Tower A, then open the phone's 考勤 tab: punching is blocked with a notice. Enable it again, switch **围栏外打卡** off, set the phone simulator to 围栏外: the punch button disappears with an explanation.

## Try the whole chain: people → attendance → payslip (≈3 minutes)
1. **Personnel.** Admin → 人员管理 → 人员花名册 → **导入** → 下载导入模板 → fill a row (or use the sample rows) and upload it; an invalid row shows its row number and reason and blocks the import. Then **新增** one person (the password is checked and never stored; ID and bank numbers are saved masked).
2. **Attendance.** Phone → 考勤 tab → open **时间与定位模拟器**: set the time to 08:17, tap **迟到签到** → confirm → face check (switch it to *失败* to see the failure and retry). Move the time to the shift end and **签退**; tap **更新打卡** to replace the sign-out (the old one stays, marked 已失效).
3. Admin → 考勤管理 → 日考勤明细: the punch shows up with its source. **调整** a time (a reason is required) and watch the result change from 迟到 to 正常.
4. **Payslips.** Admin → 薪资发放 → 工资单 → **生成工资单** for the current month (computed from attendance, the salary template, approved leave and CPF) → **核对** one (you can enter an incentive or other deduction) → it reaches the phone (工资 tile and banner).
5. Phone → 工资 → open it → **有异议** (needs a few words). Admin → **调整** (add 2 overtime hours and a note) → the phone shows 待再次确认 and the net change → **确认无误** → admin **确认发放** → the phone shows the salary as paid.
6. In 薪资模板 set the daily template's overtime exchange to **休假时间**, generate and verify a month: the overtime hours are credited to 调休 (请假额度汇总 → 变更记录 → 加班兑换).

## Try CPF deduction rules (≈1 minute)
1. Admin → 薪资发放 → 公积金扣除规则. Scroll to **公积金扣除试算**: pick 陈浩 (PR in year 1 → 5%), 林晓雨 (PR year 2 → 15%), 刘洋 (PR year 3, 51 → 20%), 周建国 (citizen, 57 → 18%), 赵磊 (FIN → no CPF).
2. Open 永久居民 → tick **默认** on one row: every PR in the preview now uses it ("按默认规则"); untick to go back to stage/age matching.
3. 编辑 a rule → change the rate with a **future** effective date: the table shows "{date} 起 x%", the preview uses the old rate for months before it and the new rate after. 调整记录 lists it.
4. **编辑规则** edits a whole tab at once with one effective date and reason.

## Try tenants & subscriptions (≈1 minute)
1. Admin → 租户管理 → 租户列表 → **停用** 星瀚建设 Pte. Ltd. (the phone user's tenant). The phone immediately shows *账号已停用*. **启用** it and the app comes back.
2. 订阅记录 → open **Lion City Engineering** → **调整可用人数** to 150 (try 80: blocked, 86 are in use) → a record appears under 可用人数调整记录.
3. Open 星瀚建设's subscription → **退订** → the phone shows *订阅已退订*. Click **续约** (it says it will reactivate) and pick a later date → the phone recovers and a renewal record is kept.
4. **新增租户** (try a duplicate name or a weak password), then **创建订阅记录** for it: the total price updates as you type.
5. 数据统计 → 人员开通统计: change the month or tenant; the four cards and the detail list follow.

## Try leave application & approval (≈1 minute)
1. Phone → 工作中心 → 请假 → **申请请假**: pick 年假, two days next week, a reason → submit. It appears as 待审批 and the *available* quota drops by 2 (reserved).
2. Admin → 请假管理 → 请假审批: click that date on the calendar → **通过**. The phone shows a banner, the request turns 已通过, and 请假额度汇总 → 变更记录 → 请假扣减 shows the quota used.
3. Back on the phone open the request → **撤回请假** (allowed until it starts) → the quota is returned.
4. Phone → 请假 → **请假审批** (you are also a project supervisor): approve one request, or tap 驳回 (a comment is required). Admin's calendar and the approver name (项目主管 · 张强) update.
5. Admin → **新加请假** for 吴东 (same project): the phone gets a "new request to review" banner. Your own requests never appear in your supervisor list.

## Try the overtime loop (≈1 minute)
1. Admin → 请假管理 → 请假额度汇总 → **调整额度** on 张强 → add 2 days of 年假. The phone's 请假 page updates and shows a banner.
2. Admin → 薪资发放 → 薪资模板 → edit **日薪模板** → set 加班兑换方式 to **休假时间** → save (a confirm dialog warns it affects 86 people).
3. Click **登记加班（演示）** → 张强, Saturday, 10 hours worked → preview shows base pay only and **+4 h 调休**. Confirm.
4. The phone shows the 调休 card (+4 小时); the quota table has a new 调休 column; 变更记录 → 加班兑换 shows the entry.
5. Switch the template back to **工资** and log again: the same hours are paid at ×1.5 instead.

## Rules implemented
**System & third-party configuration** (designs: 第三方服务, 手机号地区, 用户端内容 and its edit dialog in both languages, 字典管理 with add / edit and delete confirmation)
- **Services:** map, SMS, file storage. Each has its own required settings (project ID and key; access key, secret and Sender ID; bucket, endpoint and keys). Keys are kept only as `•••• last4`; typing a new one replaces it, leaving the masked text keeps it. Changing any setting clears the test result and **switches the service off**; enabling needs a successful test. The test is simulated (it succeeds when the settings are complete and the key does not look invalid: shorter than 12 characters or containing "bad", "invalid" or "wrong").
- **SMS link:** while the SMS service is off, announcements cannot use the SMS channel.
- **Phone regions** are fixed reference data (10 countries) and cannot be edited.
- **App content:** four records (privacy policy, terms, About, awaiting-assignment message), each with Chinese and English title and rich-text body (same editor and sanitising as announcements), a version like `V1.2` and a published / draft state. Both languages are required. The phone shows only published ones.
- **Dictionaries:** name (Chinese and English), unique code, sort order, status; cities need a country. **Delete is refused while records use the item** (people, projects, companies, attendance groups, pay templates, cities under a country, PCP on people) and *Stop instead* is offered. **Countries and PCP operators feed the personnel and project forms** (stopped ones disappear from the choices but stay on records that already use them; renaming a PCP operator renames it on people). The other four dictionaries are maintained here but the forms that would use them still have built-in choices (the screen says so).

**Permissions** (designs: 后台角色, 配置权限 (页面 / 操作 / 数据范围), 管理员账号, 编辑角色, 删除角色确认, 编辑管理员账号)
- **Three layers:** a role grants *pages* (menu items), then *operations* on those pages (查看 / 新增 / 编辑 / 删除 / 导出 / 审批, only the ones that make sense for the page), then a *data scope* (全部数据 / 所属公司 / 指定项目 (several) / 仅本人创建). Removing a page drops its operations; ticking any operation ticks 查看; unticking 查看 clears the rest.
- **Enforcement in the prototype:** the sidebar shows only granted pages and the page that was open moves if it is no longer granted. A button is blocked when it performs an operation the role lacks. The operation is judged from the button's name (`export`, `new / add`, `edit / upd`, `del / remove`, `approve / reject / verify`), so a button with an unusual name is not checked.
- **Data scope** cuts down the lists of 人员管理, 项目与工区, 考勤管理, 薪资发放, 请假管理, 证书管理, 问卷管理 and 报销审核 (rows, counts, cards and exports). 全部数据 shows everything. 指定项目: people assigned to a chosen project, and those projects and their sites. 所属公司: people whose client or employer is the account's company (set on 管理员账号), and projects they work on. 仅本人创建: only people the administrator created. **Anything an administrator creates stays visible to them whatever the scope.** A blue note at the top of those pages states the scope.
- **Not scoped yet:** 数据统计 and 租户管理 (tenant-level), 通知管理, 内容配置, 系统与三方配置, 操作日志, and the pickers inside forms (for example the project list when adding someone). The phone app is not an admin view and is unaffected.
- **System role:** 超级管理员 has everything, cannot be edited (except its description), disabled or deleted. The last enabled super administrator cannot be disabled or moved to another role; you cannot disable, or change the role of, the account you are signed in as, nor delete or disable your own role.
- **Accounts:** account name is 3–20 lowercase letters, digits, dots or underscores, unique; password at least 8 characters with a letter and a digit (never stored — only the time of the last change); a disabled account or an account whose role is disabled or deleted cannot be acted as. 重置密码 shows a temporary password once.
- **Deleting a role** keeps its accounts but leaves them without a role (so without access).

**Content configuration** (designs: 弹窗内容 list, 编辑弹窗内容, 签到 / 签退预览 in both languages, 安全提醒 list, 新增 / 编辑, 删除确认, 设置默认确认)
- There is **one pop-up per kind** (sign-in, sign-out): they can be edited, previewed, published or unpublished, not added or deleted. Name, message and picture are needed in both languages (the picture is shared); **publishing needs a picture**. Unpublished means the phone shows its built-in text.
- Pictures: PNG or JPG up to 2 MB, shrunk to about 360 px and kept in local storage so they really appear on the phone.
- **Safety reminders** (up to 6): icon (optional), background colour as `#RRGGBB`, title and subtitle in both languages. **Exactly one is the default**: the first one added becomes it, ticking 设为默认 or using the row action moves it (the old one is un-defaulted), and **the default cannot be deleted**. The phone lists the default first.

**Audit log** (design: 审计日志)
- Each entry is: time (to the second), administrator, module, action, object, IP address, result. The list is newest first, only grows (the page has no edit or delete), keeps the latest 1000 entries, and is cleared back to the seed by 重置演示数据.
- **What is recorded:** actions an administrator performs in the dashboard that change business data — people (add, edit, enable / disable, second, import, trades), projects and sites, clients and subcontractors, certificates and types, attendance groups and adjustments, payroll (generate, verify, resolve a dispute, pay, pay templates, CPF rules), leave (quota changes, approvals, leave added on someone's behalf), tenants and subscriptions, reimbursement decisions, announcements, surveys. Entries are made by wrapping the store methods (`js/audit/hooks.js`), so a new screen that uses them is logged automatically.
- **What is not:** anything staff do on the phone (punching, applying, confirming a payslip, answering a survey), a supervisor approving on the phone, automatic changes (reminders, scheduled sends, seeded history), and forms that fail validation. A *refused operation* (for example deleting a site that is in use) is logged with result 失败.
- Bulk actions are one entry (an import of 6 people is one "导入" entry, not six "新增").

**Surveys** (designs: 问卷列表, 编辑弹窗, 问卷配置 (添加问题题型, 单选, 多选, 判断), 未填 / 已填人员名单, 答卷记录, 答卷详情, and the phone's 问卷列表, 问卷填写, 问卷已填写详情)
- A survey is a **draft** (invisible on the phone), **published** (shown until its deadline) or **closed** (published and past its deadline, derived). Names must be unique in Chinese; English is required.
- **Audience:** 全体人员, selected projects, or 新入场人员 (joined in the last 30 days). Who has or has not answered is counted against that audience of *active* staff **right now**, so it changes if people join, leave or move.
- **Questions:** text (up to 500 characters), single choice, multiple choice (2–8 options each), true / false (two fixed options, wording editable). Question and every option need Chinese **and** English. A survey can be published only when it has at least one question, none incomplete, a future deadline and a non-empty audience.
- **Once published, the questions are locked** (so they always match the answers given); name, deadline, audience and required tag can still be edited, and it cannot go back to draft. Deleting a survey deletes its answers (the dialog says how many).
- **Answering:** each person answers once; required questions must be answered; a draft can be saved and resumed; a submitted sheet is read-only. After the deadline nothing can be submitted. The 必填 tag on a survey is a label only.

**Announcements** (designs: 平台公告发送记录, 发布平台公告 (Chinese and English, editing states), 平台公告详情, 删除确认, and the phone's 广播 and 系统公告 detail)
- Audience is **全部**, **公司** (clients or employers from 客户与分包商) or **项目**; several companies or projects can be picked. Recipients are the *active* staff in that audience **at the moment of sending** and are then fixed; the number shown is that count.
- Title and content are required in **both** languages (title 60 / 100 characters). The editor keeps bold, italic, underline, headings, lists and line breaks and drops everything else, on save and when loading; pasting inserts plain text.
- Sending now marks it sent at once; **scheduled** needs a time later than now (up to 90 days) and stays 待发送 until then, with the audience worked out at send time. Deleting a scheduled one cancels it.
- Status is 发送成功, 部分失败 (text messages that did not arrive) or 待发送. **SMS failures are simulated** by a fixed rule (about one recipient in eight); in-app messages never fail.
- On the phone, only announcements the person received show up, newest first; reading one marks it read, and the 广播 tab shows how many are unread.

**Certificates** (designs: 人员证书, 上传与更新, 新增, 查看, 证书类型, 新增与编辑类型, and the phone's 证书即将到期 notice)
- Status: **有效**, **即将到期** (30 days or fewer left), **已过期**, or **永久有效** (no expiry date). A person with no certificate at all is 未上传 and gets an 上传证书 row; only active staff are listed.
- **Add** needs an active holder, an active type, a number, and an expiry date or 永久; issue date is optional and not in the future; expiry cannot precede issue. A person can hold **one certificate of each type**, and a number is unique within its type. **Update** changes only that certificate (holder and type are fixed), and a new file replaces the old attachment. Both take effect at once, with no review.
- Attachments: PDF / JPEG / PNG up to 10 MB. Only the file name and size are kept; an image chosen in this session can be previewed until reload.
- **Types** carry up to 6 reminder days (1–365, no duplicates, at least one). A stopped type takes no new certificates; renaming a type's code updates its certificates. There is no delete.
- **Reminders on the phone:** for each certificate, the closest reminder day already reached (e.g. the 30-day point once 28 days are left) or "expired". The tile shows how many are due, a banner appears on load, and the reminder detail follows the design.
- The roster form's certificate section edits the same records.

**Clients & subcontractors** (designs: 单位列表, 编辑弹窗, 删除确认)
- Type is 客户 (client) or 分包商 (subcontractor). Company name and UEN are each unique. UEN is 8–20 letters/digits (covers Singapore UENs and Chinese 18-character codes); **required for clients, optional for subcontractors** (the design lists one without).
- Phone is stored with its country code (`+65 8123 4567`) and shown masked in the list; the bank account is kept masked like the employee one, and typing a new number replaces it. A bank account needs a bank name.
- Business card: PDF or JPEG up to 10 MB. The prototype keeps only the file name and size (browser storage cannot hold 10 MB files).
- People and projects refer to a company by name: renaming a company renames it on them; **deleting is refused while anyone uses it** (the dialog says how many and offers *Stop instead*). A stopped company drops out of the roster's client list and employer suggestions.

**Projects & sites** (designs: 项目列表, 编辑弹窗, 调整结束日期, 确认项目完成, 工区列表弹窗, 工区列表, 停用确认, 删除确认, 编辑工区)
- Project status follows the dates: before the start date 未开启, within the period 进行中, past the end date 已延期; **已完成 is set by hand** and never changes with dates again.
- Only a delayed project can be given a new end date, and it must be later than the old one and not before today (otherwise it would stay delayed). Completing needs a confirmation that shows how many people and active sites are still attached.
- A project's code is unique (`A–Z 0–9 - _`). Country, city, contact and address are required; the English name falls back to the Chinese one.
- A site belongs to exactly one project. Code is unique across all sites; radius 50–5000 m; latitude −90…90, longitude −180…180. A site cannot be added to, or re-enabled in, a completed project, and cannot change project while people or attendance groups use it.
- **Stopping** a site keeps its history and blocks new punches from people assigned there. **Deleting** is refused while any person or attendance group still points at the site (the dialog says how many and offers *Stop instead*).
- A site's **围栏外打卡** switch decides whether a punch outside the fence is recorded and flagged (on) or refused on the phone (off).
- Roster, import and attendance-group pickers offer only active sites of projects that are not completed.

**Personnel** (designs: 人员花名册, 新增/编辑/查看, 外派, 批量导入, 工种字典, 项目人员分布)
- One employee record feeds leave, CPF, attendance, payroll and the phone. Unique: login account, phone, NRIC/FIN. NRIC/FIN format is `[STFGM]` + 7 digits + a letter; FIN starts with F/G/M, NRIC with S/T. Foreign workers need a WP number and are not subject to CPF; PRs need a PR start date.
- Sensitive numbers are kept **masked** (S****567A, •••• 4567); editing shows the mask and only a newly typed number replaces it. Passwords are validated and not stored.
- Disabling stops attendance from the disable date and blocks the phone; history stays. Secondment moves the employee to another tenant and remembers the origin.
- **Import:** .xlsx or .csv work **offline** (a small built-in reader in `js/xlsx-lite.js` handles .xlsx: first sheet, shared and inline strings, date cells, no formulas); a legacy .xls, or an .xlsx the built-in reader cannot parse, falls back to SheetJS from a CDN and says so if there is no network. The template download is also built in. Up to 10 MB and 500 rows. Every row is validated with the same rules as the form (trades and templates are looked up by name); duplicates inside the file are caught; **nothing is imported unless every row passes**.

**Attendance** (designs: 每日考勤统计, 日考勤明细, 月考勤统计, 考勤组, worker 考勤 / 考勤记录)
- A day is judged from the group's shift for that date (Mon–Fri / Sat / Sun / special dates; overnight shifts belong to their start date). Sign-in later than start + **5 min** is late; sign-out earlier than end − 5 min is early; no sign-out after the shift ended is a missed punch; a punch outside the fence is recorded and flagged. Precedence: leave > missed > outside > late > early > normal.
- **Paid hours = sign-out − sign-in − break − leave overlap**, rounded by the group's unit and direction; late/early only set the status. Break modes: auto-deduct (overlap with the window), fixed, none.
- A sign-out can be replaced (the old punch is kept and marked invalid). Admin adjustments need a reason, keep the old punches, and are logged. Sign-in opens 2 h before the shift; leave covering the whole shift blocks punching.

**Payslips** (designs: 工资单 list / 核对 / 异议调整 / 确认发放 / 明细, worker 工资记录 / 明细 / 异议 / 二次确认)
- Daily-rate staff: base hours at rate ÷ 8 using the template's base/overtime hours per day type; overtime × multiplier (pay mode) or credited to 调休 at verification (time-off mode); approved annual, sick and time-off leave is paid, personal leave is not. Monthly staff: the salary, unpaid personal leave deducted at salary ÷ 176 h, overtime only after the monthly hours threshold.
- 应发 = base + overtime + paid leave + incentive; 实发 = 应发 − unpaid-leave deduction − CPF (on 应发 − deduction) − other. Amounts are kept to 4 decimals and shown to 2.
- Status flow: 待核对 → (admin) 已核对 → worker 确认 → 待发放 → (admin) 已发放; or worker 有异议 → 处理中 → (admin adjusts) → 已核对 / 待再次确认. The worker only sees slips after verification; a disputed slip is locked; payment is only possible after the worker confirmed. Verified slips are never overwritten by regeneration.

**CPF deduction rules** (designs: 公积金扣除规则 公民 / 永久居民 / 手动修改弹窗)
- Only NRIC holders (citizens, PRs) are deducted; FIN holders are not. Employee share only.
- Citizens: five age bands. PRs: year 1 (5%) and year 2 (15%) by PR start date for all ages, then the age bands from year 3. Age is completed years on the 1st of the pay month; PR year counts months since the PR date.
- **Default rule (PR only):** at most one; when set, every PR uses it regardless of stage and age.
- Edits are **versioned by effective date** and never rewrite history: the effective date can't be before the version in force or the 1st of the current month; a later date keeps the old rate until then; the same date as an existing version corrects it. A rate range of 0–50% (2 decimals), a reason and a change are required. Every change is logged.
- Preview: deduction = wage × rate, kept to 4 decimals and shown to 2 (same rounding note as payroll).

**Tenants & subscriptions** (designs: 租户管理, 订阅记录, 订阅详情, 创建/续约/调整弹窗, 人员开通统计)
- Tenant: company name and login account must be unique (case-insensitive); account is 3–30 chars of letters/digits/`._-`; password ≥ 8 with a letter and a digit (checked but **never stored**); logo PNG/JPG/SVG ≤ 2 MB (raster is cropped to 128 px; SVG ≤ 150 KB).
- 用户总量 = active + expired users; 可用人数 = active users; 到期数量 = the rest. **已使用人数** on a subscription is the tenant's active users.
- Subscription status is derived from dates: 待生效 (not started) · 生效中 · 即将到期 (ends within 30 days) · 已到期; 已退订 wins over the rest. One subscription per tenant; **总价格 = users × price per user** (not prorated by period).
- Create needs seats ≥ the tenant's active users, price > 0 (2 dp), end ≥ start, ≤ 10 years. **Renew** needs a new end date after the current one (after *today* if expired/cancelled; renewing a cancelled subscription reactivates it). **Adjust seats** can't go below users in use, can't be unchanged, and is blocked once expired/cancelled. Every renewal and seat change is logged with who and when.
- **人员开通统计:** cards for the month — opened to date, active at month end, opened this month, disabled this month — plus a searchable detail list; tenant and month filters apply to both.

**Leave application** (designs: 请假申请 / 请假详情 / 请假记录, admin 请假审批)
- Duration is calculated from 08:00–17:00 with a 12:00–13:00 break = 8 h/day, calendar days (weekends count). 1 day = 8 h; under 8 h shows as hours.
- Required: type, end after start, reason (≤200), duration > 0, ≤ 60 days, no overlap with your pending/approved leave, and **enough available quota** (remaining − pending requests of the same type). Workers can't start before today (sick leave: up to 7 days back); admin can.
- Statuses: 待审批 → 已通过 / 已驳回 / 已撤回. **Approval uses the quota** (days; 调休 in hours) and re-checks it at that moment; cancelling an approved leave that hasn't started returns it.
- Anyone can decide once: admin or the project supervisor; a decision on a request that was withdrawn/decided meanwhile is refused with a message. Rejecting needs a comment. Supervisors can't approve their own request.
- Seed requests are dated relative to today, so the calendar always has data around the current month.

**Quota adjustment** (design: 调整请假额度 dialog)
- Type, add/deduct, amount (steps of 0.5, max 365) and reason (≤200 chars) are required.
- Deduct cannot take *remaining* below 0. Batch is all-or-nothing and names who is short.
- An adjustment changes both total and remaining by the same amount; every one is logged (操作人, 备注).
- Past years (2025) are read-only. Filters: keyword, leave type (shows that column), status (default 在职), year.

**Overtime exchange** (design: 新增日薪模板 · 加班兑换工资 / 休假时间)
- *Pay:* base hours at hourly rate (= daily rate ÷ standard hours) + overtime hours × multiplier. Kept to 4 decimals, shown to 2.
- *Time off:* overtime hours are **not** paid; payslip settles base hours only; overtime hours are credited 1:1 to 调休 (hours).
- Multiplier column hides in time-off mode. Special-date row is optional (blank = off).
- Monthly templates always pay overtime (the design only offers exchange on daily templates).
- Validation: names (中/EN), hours 0–24 with base + overtime ≤ 24, multiplier 1.0–5.0, monthly salary/threshold.
- A template with linked staff can't be deleted; type can't be changed after creation.

## Leave application: decisions I made where the designs were silent — please confirm
1. **调休 can be spent** through the same application form (hours, 8 h = a full day). No expiry yet — you didn't answer that; say if it should lapse (e.g. end of year).
2. **No overdraft:** a request that exceeds available quota is blocked (also for sick leave). If sick leave should be allowed to go unpaid/negative, that's a rule change.
3. **Pending requests reserve quota** so two requests can't both use the same days; the reservation shows as a lower "可用额度".
4. **Weekends and holidays count as leave days.** The designs show Fri–Sat = 2 天. A proper working-day calendar (attendance group / public holidays) is needed to do better.
5. **Default times are 08:00–17:00** (the worker design example used 09:00–17:00 → "2 天", which doesn't match any 8 h/day rule).
6. **Approving from the day list uses a default comment 同意**; opening 查看详情 lets the approver write one. The admin calendar hides withdrawn requests.
7. **Cancelling an approved leave** is allowed for the worker until it starts (the design shows 撤回请假 on an approved request, with no rule).
8. **Supervisor scope** = requests from the same project, excluding their own. The designs don't say who may approve what.
9. **Roster grew to 19 people** (the people named in the approval designs) so calendar and supervisor list look like the designs; the quota table now has 2 pages.
10. **Terms:** admin list says 拒绝 and the worker app says 驳回 — kept as designed.

## CPF rules: decisions where the designs were silent — please confirm
1. **"编辑规则" (top button) had no screen.** I made it a bulk-edit mode for the current tab (one effective date and reason for all changed rates), and added a separate **调整记录** button for the log the dialog mentions.
2. **Effective-dated versions** (not in the designs) protect closed months; "当前状态 生效" in the dialog is the version in force, and a future one shows as pending.
3. **No wage ceiling or rounding to whole dollars.** Real CPF has an ordinary-wage ceiling and rounds contributions; the designs mention neither, so the preview is a plain wage × rate.
4. **Age band boundaries** use completed years (≤55, 56–60, 61–65, 66–70, >70) on the 1st of the month; real CPF switches the month after the birthday.
5. **ID type, date of birth and PR date** come from a seed table for the demo roster (the personnel module isn't built).
6. Citizen and PR default tabs follow the designs' rates (20 / 18 / 12.5 / 7.5 / 5; PR 5 / 15 then the same bands) — please check them against current CPF tables before relying on them.

## Tenants & subscriptions: decisions where the designs disagreed or were silent — please confirm
1. **Two different tenant lists were designed** (one with 用户总量/可用人数/到期数量, one with 到期时间). I built the first; expiry lives on the subscription.
2. **The tenant list and subscription list used different companies.** I merged them into 12 tenants (the 6 from the tenant list + the 6 from the subscription list), each with a customer ID (TEN-xxxxx); 星瀚建设 is the phone user's tenant, matching the personnel design.
3. **Status thresholds:** the design shows 生效中 and 即将到期 for the same end date, so I used a fixed 30-day rule; seeds are relative to today so every status appears.
4. **"Service paused" screen on the phone** (tenant disabled / subscription expired, cancelled or not yet started) is **my assumption** — the designs don't say what workers see. Delete `js/tenant/worker.js` to remove it.
5. **退订 (cancel)** has no screen in the designs, though 已退订 is a status; I added a confirm dialog on the detail page. **Adjusting seats is blocked after expiry/cancellation.**
6. **Disabling a tenant doesn't touch its subscription**, and vice-versa; both gate access.
7. **Renewal has no price field** in the design, so renewing doesn't create a charge; 总价格 exists only at creation.
8. **Counts are seed data.** Tenant user totals aren't linked to the personnel module (not built); the per-user provisioning list is generated from the counts.
9. **Passwords are validated, not stored.** A real build needs hashing and a reset flow.

## Data scope: decisions I made — please confirm
1. **Company scope needs a company on the account** (new field 所属公司 on 管理员账号, required when the role's scope is 所属公司); the seeded finance account is set to 华东建设劳务. Without one, nothing is shown.
2. **"Own company" matches the client or the named employer** of the person, as the personnel form stores both.
3. **Project scope on companies, clients, sites:** a project-scoped role sees those projects and their sites; a company-scoped role sees the projects its people work on.
4. **Creator tracking exists only for new people** (the seeded 19 have none), so 仅本人创建 starts empty. Other record types would need their own creator field.
5. **Cards, totals, pager counts and CSV exports follow the scope** because they are built from the same filtered rows.
6. **Scope is a display filter in the prototype**, not security: the stores still hold everything, and direct links into records (for example opening a survey's people list) go through the same filtered data, but a real build must enforce it on the server.

## System & third-party configuration: decisions where the designs were silent or inconsistent — please confirm
1. **The services list has 配置 and 测试 buttons but no dialogs.** I designed the configuration dialog (fields per service type) and made the test a simulation, since nothing real can be called.
2. **Secrets are never stored in full**, so a real connection test is impossible here; the rule above stands in for it.
3. **"最近测试 / 测试结果" reset on any change and the service stops** — my rule, so a service cannot stay on with untested settings.
4. **The content list shows one language per row in the design** (隐私协议 简体中文, 用户协议 English), yet the edit dialog needs both languages. I made one record per document with both languages, shown as "中文 / English".
5. **Content types are fixed** (no add or delete): privacy policy, terms, About, and the "awaiting assignment" message. The design has no add button.
6. **Dictionary wiring is partial:** countries and PCP operators drive the real forms; cities, company types, rounding units and template types are kept but their forms are not connected yet (the page tells you).
7. **Country codes in the design are ISO-3 letters** (CHN, SGP) while the data uses short keys (`sg`, `cn`); the keys stay as they are and the code is only a label.
8. **Phone regions** are not used for validating phone numbers yet (the roster still checks 8–15 digits).
9. **Settings tab on the phone** is a minimal page (agreements, About, version); the design file's other settings pages (language dialog, profile edits) are not built.

## Permissions: decisions where the designs were silent or inconsistent — please confirm
1. **No login page.** To make permissions visible I added "act as" (account menu in the sidebar and a button per account row). A real build signs in with account and password.
2. **Operation checks are by button name** (see the rules) because the earlier screens were not built with permission codes; page-level checks are exact.
3. **Data scope is now applied** (see the rules) but on my reading of "belongs to": a record belongs to a person, and a person to projects (assignments), a company (client or employer) or a creator. Records without a person (announcements, tenants, dictionaries) are not scoped. 仅本人创建 only knows who created *people*, so for other records it sees only data about people the administrator created.
4. **Page permission is per module,** not per tab. The design shows a module with its sub-pages as one card (“花名册、项目人员分布”), so a role cannot get 人员证书 but not 证书类型.
5. **角色编码 is generated** from the English name (the design shows a code but the edit dialog has no field for it).
6. **English names** for roles and accounts were added, like the other modules.
7. **Seeded roles** besides 超级管理员 (项目管理员, 财务管理员, 人事专员) and their accounts are my own; 系统与三方配置 (a page in the list) is not built yet.
8. **The audit log now records the signed-in account** and the seeded history was mapped onto these accounts.
9. A role with no pages gives an account with nothing to open (the dashboard shows "no pages").

## Content configuration: decisions where the designs were silent or inconsistent — please confirm
1. **English text for reminders.** The design's reminder dialog has one title and one subtitle; the app is bilingual, so I added English fields (required), like the pop-up form already has.
2. **The pop-up list has no add or delete** (the subtitle says sign-in and sign-out are configured separately), so I fixed it at two records.
3. **The design's list shows 128 rows and a pager;** with two fixed pop-ups and at most 6 reminders there is nothing to page.
4. **Publishing requires a picture**, and an unpublished pop-up falls back to the built-in text (the design does not say).
5. **Reminder icon is optional** (a shield is shown without one); the design's seed icons are replaced by small drawn placeholders.
6. **The phone shows all reminders, default first.** The design says the default "is shown first"; whether others show at all is not stated, and its 工作台 screen shows both.
7. **The design's 工作台 overview** also has 重要证件 and 最新消息 sections; they are not part of this module and not built.
8. **Pictures are shrunk** so they fit browser storage; a real system would keep the original files.

## Audit log: decisions where the designs were silent or inconsistent — please confirm
1. **The signed-in account is recorded.** With 权限管理 built, new entries carry whichever account you are acting as (and its IP). The seeded history was mapped onto the seeded accounts.
2. **The design shows only successes**; I added 失败 for operations the system refused (not for validation errors).
3. **Actions are logged at the store level, not per button.** The object text is built from the record (name and code), and it is stored as text in both languages when it happens, so it never changes after a rename.
4. **No detail view, no before / after values.** The design has only the list; a "what changed" column would need each store to report field changes.
5. **Exports are not logged**, and the log is not tamper-proof (it lives in the browser's local storage like all prototype data).
6. **Seeded entries are invented** and some refer to records that do not exist in the demo data.
7. **Role and account changes** are logged under the module 权限管理.

## Surveys: decisions where the designs were silent or inconsistent — please confirm
1. **Locking questions after publishing** is my rule (the design offers 继续编辑 on a not-yet-published survey only). The alternative is to allow edits and keep old answers matched by question; say if you want that.
2. **"填写状态" filter** has no listed options in the design; I used "everyone answered" and "some not answered".
3. **"必填设置" is a label** on the survey. The design does not say what it blocks, so it blocks nothing (the app does not force people to answer before doing other things).
4. **Audience counts are live, not frozen at publish time** (unlike announcements). A new joiner in the audience appears as 未填.
5. **"新入场人员" means joined in the last 30 days**; the seed moves two people's join dates to recent days so it is not empty.
6. **An unanswered person's 查看详情** opens an empty sheet (the design shows the button on unanswered rows too).
7. **Closed surveys** that someone never answered appear on the phone under 待填写 with a 已截止 tag and no button, but are not counted in the tab number.
8. **Estimated time** is questions ÷ 2, rounded up (the design shows 4 → 2 min and 8 → 4 min).
9. **Scores and "correct" answers do not exist**: the surveys are not quizzes. The seed answers are made up.
10. **Draft saving** is per person and survey, kept on the device; no autosave.
11. Question order can be changed with ↑ ↓ buttons (not in the design). There is no copy or template feature.

## Announcements: decisions where the designs were silent or inconsistent — please confirm
1. **Channel (站内通知 / 短信)** appears in the log rows but not in the publish dialog, so I added a channel choice to the dialog (default in-app). The log also has no 渠道 column header, so I added one.
2. **A 发送人数 column is in the header but not in the rows**; I show the number of recipients, and "about N" for scheduled ones.
3. **SMS results are simulated** (fixed rule), since nothing real is sent.
4. **Recipients are fixed at send time**: someone who joins a project later does not receive an earlier announcement.
5. **A sent announcement cannot be edited or recalled**, only deleted (the design has detail and delete only). Deleting also removes it from the phone.
6. **The sender label** is a fixed department (shown on the phone as 发布单位); the dialog has no field for it, so the seed uses several departments and new ones use "BuiltSync 项目管理部".
7. **Rich text** is a small editor (the design's toolbar shows paragraph style, size and a character count): the size is tied to the style (body 14 px, heading 18 px) rather than free, and there are no colours, images or links.
8. **Scheduled sending** relies on the page being open (it checks every 10 seconds). A real system would send from the server.
9. The design's certificate-expiry notice is the earlier certificate reminder, not part of this list; the 广播 tab only lists platform announcements.

## Certificates: decisions where the designs were silent or inconsistent — please confirm
1. **One certificate per type per person.** The design says several certificates per person but shows different types; allowing duplicates of one type makes "which one is current" ambiguous, so a repeat must go through 更新证书. Say if you want renewals kept as history instead.
2. **"即将到期" is fixed at 30 days** (the card says so), while reminders follow each type's own days (90/60/30/7). The two are independent.
3. **Reminders are computed, not sent.** There is no notification centre or push in the prototype, so the phone shows a tile count, a banner and the detail screen. "Same day, no repeat" holds because only one reminder is shown per certificate at a time.
4. **Design gaps:** the type list's subtitle mentions 适用工种, but the dialog has no trade field, so I left it out. The phone notice shows a 签发机构 (issuer) that no admin form collects, so I left that out too.
5. **No delete** for certificates or types (none in the design); the roster form can still remove a certificate it lists.
6. **"未上传" counts people with no certificate at all.** A certificate with no attachment shows 未上传 in the attachment column only.
7. **Files are not stored** (see the rules) and "查看原图" is a placeholder, as in the design.
8. The seed holds 11 invented certificates (expiries relative to today) plus the five types, replacing the free-text certificate types the roster form used before.

## Clients & subcontractors: decisions where the designs were silent or inconsistent — please confirm
1. **UEN required for clients only.** The edit form marks it like the other required fields, yet the list shows “—” for a subcontractor. The delete dialog also shows an 18-character Chinese code, so I accept any 8–20 letters/digits instead of the Singapore format only.
2. **Delete is blocked while in use** (people, or projects, that name the company), which the design does not say. It matches how site deletion works.
3. **Linking is by name.** The roster's client is now a pick-list of active clients; the employer stays free text with suggestions from active subcontractors (imports and older records may use any name).
4. **Status is 正常 / 停用** (the design says 正常 in the list and an open choice in the form). Stopping a company does not touch people already linked to it.
5. **The business card is not really stored** (name and size only), and cannot be previewed.
6. **Phone is shown masked in the list but visible in the edit form**, as the design list masks it; the bank account is masked in both.
7. Added: English name, CSV export, UEN and status filters. The seed has made-up companies, including the clients already used by the roster.

## Projects & sites: decisions where the designs were silent or inconsistent — please confirm
1. **Two designs for the site list.** The file holds an older 工区列表 (地图 / 编辑, 围栏状态 filter, 范围处理 column) and a newer one (code, coordinates, stop / delete). I built the newer one and kept the 范围处理 column and the 地图 view from the older one.
2. **Project “未开启” shown as 未开启 / Not started**, and delayed = past the end date and not confirmed complete. The design shows 延期 only on delayed projects, so I allowed extending only those, and only to a date that is today or later.
3. **Completing a project is not blocked by open people or sites** (the design only asks the admin to confirm). People stay assigned and can still punch; only *new* assignments, new sites and enabling sites are blocked. There is no way to reopen a completed project — say if you want one.
4. **Projects cannot be deleted** (no delete in the design).
5. **Sites in the old data were shared between projects** (“Loading Bay” under two projects); the design says a site belongs to one project, so each project now has its own sites and the seed has new ones (Riverside, Old Dock, Harbourfront, Johor).
6. **Map:** the design places a Google Maps picker. The prototype has a schematic map and a small built-in address list instead; a click nudges the pin by the clicked offset. A real map needs an API key.
7. **Contact** is a free text field with suggestions from supervisors and safety officers, because client contacts are not employees. City is free text rather than a country-linked list.
8. **Stopping a site does not move people**; they simply cannot punch until moved or the site is enabled, and the dialog says how many are affected.
9. Added: CSV export for both lists, a 国家 filter on projects, and the 管理工区 shortcut from a project to its sites.
10. **Seed projects now carry country, city, contact and address** that I invented (Singapore clients, one Johor project) so the list looks real.

## Personnel, attendance and payslips: decisions where the designs were silent or inconsistent — please confirm
1. **The design amounts are placeholders** (¥50/h, S$18/day). The prototype uses plausible Singapore daily rates (S$110–140/day) so payslips look real, and S$ replaces ¥ in the payslip designs.
2. **Pay-rate source:** the designs show a "工种单价"; I used each person's own rate (daily or monthly), entered on the employee form next to the salary template, because the template editor says the rate is set when binding staff.
3. **Attendance tolerance** (5 min), the 2 h early sign-in window and the 4 h late sign-out window are inferred from the sample times in the designs, not specified.
4. **Absent with no punches counts as a missed punch** (no separate "absent" status in the monthly columns); I added a 围栏外 column to the monthly table because outside-fence is abnormal in the daily view.
5. **The face check is simulated** (no camera) and there is no face-enrolment flow. The phone has a *prototype-only* simulator for time, location and face result because the browser has no real GPS. Seeded history is generated relative to today.
6. **Monthly staff on the 260-hour threshold** almost never unlock overtime on an 8 h/day schedule. That is how the rule reads, but please confirm the intent.
7. **Overtime above the template's "overtime hours" for a day is not counted** (same assumption as before). Paid hours for a day with a missed punch are 0 until an admin adjusts it.
8. **Overtime exchanged for time off is credited when the payslip is verified** (once), not day by day.
9. **Added to the designs:** 生成工资单 (slips have to come from somewhere), 全部核对, incentive and other-deduction fields at verification, CSV export of roster, attendance and payslips, an adjustment history on payslips, and one shared employee table for leave, CPF, tenants, attendance and payroll.
10. **Disputes:** the type list (工时或加班 / 扣款 / 其他) follows the design's example; a note of at least 5 characters is required.
11. **Payment is a status only** — no bank file or payout integration.

## Where the designs were silent or inconsistent (leave quota / overtime) — please confirm
1. **调休 is a new leave type.** The quota table design only has 年假/事假/病假, but "加班时长将计入可用休假时间" needs somewhere to land. I added a 4th column, stored in **hours** (shown on the worker's 请假 page only when it has a balance or the template is in time-off mode). *How is it spent, and does it expire?*
2. **Units.** The quota page shows 事假 in 天; the worker apply screen shows 事假 in 小时 (40 小时) and the rules page sets 事假 to 小时. I followed the quota page (all 天), 调休 in 小时.
3. **What "基础时长 / 加班时长" mean.** I read them as per-day limits: hours worked up to *base* are base pay, the next *overtime-hours* are overtime, **anything beyond base + overtime is not counted** (shown as a warning in the preview). Sunday = 0 base, so all hours are overtime. Please confirm — this affects payroll.
4. **Exchange ratio** is 1 hour of overtime = 1 hour of time off (no multiplier). Not stated in the design.
5. **Change log columns** 调整前/调整后 show the year *total* (matches the sample rows); the adjust dialog shows *remaining*. I added a footnote and a 加班兑换 filter next to 手动调整 / 自动顺延.
6. **Switching a template's exchange mode** when people are linked wasn't designed. Added a confirm dialog; existing 调休 hours are kept, locked payslips are unaffected.
7. **Template list "基础标准":** the design shows "日薪 S$18 / 8h" but the editor says the amount is entered when binding people, so the list shows "日薪 / 8h (rate set per person)".
8. **Both template names required** (the design stars them only on the monthly form).
9. **张强 added** to the quota roster (7 rows instead of the design's 6) so the phone user can see changes; 孙伟 is a disabled employee to make the 在职 filter meaningful.
10. **Overtime logging is a demo.** In production overtime would come from attendance records; the dialog exists to exercise the calculation and the exchange.

## Phase 2 foundations: decisions I made — please confirm
1. **A deployment belongs to the subcontractor** (it is their worker) and points at a main contractor's site; the main contractor accepts it. Status is `requested → accepted | rejected → ended`; *active* and *scheduled* are derived from the dates. A worker cannot have two live deployments that overlap.
2. **"Fit to work" is computed, never stored.** Base rules: passport and work pass valid (foreign workers only), CSOC valid (everyone); a type of work can add certificates. A missing or expired document blocks; one expiring within the warning days only warns (passport 60, pass 30, certificates 30 by default). Approved or pending leave does not block unless a caller asks (permits and bookings will).
3. **The gate** is closed when the person is not fit **or** the main contractor has blocked them; the reasons are shown on the tag. Reopening requires the document to be fixed *and* any manual block lifted.
4. **CSOC is a certificate type** (added to the certificate dictionary) and every seeded worker now holds one, four of them lapsed or missing to show the states. This is why the certificate counts in the walkthroughs went up.
5. **Foreign workers get four new fields**: pass type (WP / S Pass / EP), pass expiry, passport number and expiry. Optional on entry, but a foreign worker without them counts as *not valid*, so a newly added FIN worker is blocked until the documents are entered.
6. **Rules apply from the moment they are saved**; there is no effective-dated history yet (the CPF rules have it; the framework document suggests the same for compliance later).
7. **Party types are set on the role**, not the account: employer, subcontractor, main contractor (training centre and dormitory operator are defined but have no role UI yet). Accounts of an external role must belong to a company of the matching type. The seeded external accounts are `sub01`, `sub02`, `main01`.
8. **What each party sees of a worker** is one table in `js/perm/store.js` (`FIELD_GROUPS` / `VISIBLE`): a main contractor gets identity, documents and employer; a subcontractor everything about its own people. It is enforced when the screen is built (`BS.perm.project`); a real build must enforce it in the API.
9. **Module entitlements are per tenant**, only for Phase 2 modules; Phase 1 pages are always available. A disabled tenant or an unusable subscription loses Phase 2 modules too. All five Phase 2 modules are now available and cannot be ticked yet.
10. **Events are in memory** (the last 200, cleared on reload and on reset); they are for modules to react to, not an audit trail. The audit log still records who did what.
11. The company list gained **总包商 (main contractor)**; a company with deployments cannot be deleted.
12. Resetting demo data also resets the compliance rules and deployments. Storage keys changed (`bs_hr_proto_v6`, `bs_perm_proto_v3`), so a browser that already had the older demo data starts from the new seed once.

## Permit to Work: decisions I made — please confirm
1. **Hard stop = documents and deployment, not leave.** A running or approved permit stops when any team member fails the compliance check *for that type of work* (passport, work pass, CSOC and the type's extra certificates), has no active deployment on the permit's site, or is blocked at the gate. Being on leave does not stop a permit.
2. **It lifts by itself** the moment everyone passes again, and every stop, swap, override and resume goes into the permit's history. A permit that has only been *requested* is not stopped; it simply cannot be approved while someone fails.
3. **Overrides are narrow.** Only a stop made *entirely of certificate problems* can be overridden, by an employer-side account that holds the approve right, with a written reason of at least 10 characters, **valid for that day only**. Passports, work passes, missing deployments and main-contractor gate blocks can never be overridden: replace the worker or fix the document. This is the open question about who may override; please say who should.
4. **Approving needs a fit team; starting needs the work date.** Approval and start are refused while anyone fails (unless an override is active for start); a permit cannot start before its work date. Closing and cancelling are always allowed.
5. **The team comes from the deployment list.** For a permit on a main contractor's site a worker must have an *accepted, active* deployment on that site; workers who do not meet the type's requirements are listed but cannot be chosen. Without a main contractor the team is people assigned to the site.
6. **Subcontractors apply, main contractors decide.** A subcontractor can apply for permits for its own workers and swap, renew documents and cancel on its own permits; approving, starting and closing belong to the main contractor (or the employer's administrators). The employer's administrators may do everything their role allows.
7. **Quick renew edits the personnel record** (passport / work-pass expiry, or a certificate's expiry and number), with the same rules as the roster: the new date must be in the future and later than the old one. 预订复训课程 opens the training hub with the course and the worker chosen; the permit then shows the request.
8. **Evaluation date.** A permit is checked as of today, or as of its work date when that is in the future, so a document that will have expired by then already blocks approval.
9. **Re-checks are event driven.** Anything that changes a worker's documents, certificates, status, deployment or the compliance rules re-checks the open permits immediately; nothing re-checks just because midnight passed, so a document that expires overnight shows up at the next change or reload.
10. Seeded permits: five (41–45) so each state is visible; two more deployments (吴东 at Maritime B2, 周建国 at Loading Bay) exist so a swap is possible. Storage keys of the permission and tenant stores changed again (`bs_perm_proto_v4`, `bs_tenant_proto_v2`, `bs_dep_proto_v2`).

## Training hub: decisions I made — please confirm
1. **The catalogue is a snapshot of Course Atlas.** `tools/import-atlas.py` turns your site's `courses.json` (5,484 crawled intakes), `locations.json` (15 venues with coordinates), `providers.json` and `metadata.json` into `data/atlas.js` (about 1.5 MB). It keeps intakes Course Atlas tags construction or PCM, plus titles that match a construction-site course: 3,114 intakes, 119 courses, 13 providers, start dates 2026-11-01 to 2027-02-07. After 7 Feb 2027 the hub warns that the snapshot is stale. Refresh with `python tools/import-atlas.py --fetch` (needs internet); `--from folder` converts files you already downloaded.
2. **Nothing is invented.** A fee Course Atlas could not read stays *费用未公布* (about 1,090 of 3,114 have one); a venue it could not match to a mapped location is not on the map (about half); seat figures are the provider's own report on the crawl day, shown as *机构显示余 n 位*, never as a reservation; there are no ratings or pass rates, so the comparison does not have them. A class time is shown only when one session has both a start and an end and the end is after the start (52 provider records had an end before the start, so they show *时间未注明*).
3. **"Book" is an enrolment request with a hand-off.** BuildSync keeps who, which intake, the clash check, who approved, how it is paid and the history; the registration itself happens on the provider's page (the link opens in a new tab) and the employer records it (*已注册*, optional reference, *机构已确认*). Status flow: *工人申请* → *待注册* → *已在机构注册* → *机构已确认* → *已完成*, or *已婉拒* / *已取消*.
4. **Courses that renew a certificate** are grouped across providers and languages into one course each: CSOC / AWSHCS, Work at Height, Rigger and Signalman (welding has none in the snapshot). Manager, supervisor, refresher and instructor titles are *not* grouped under a worker certificate. Completing such a course gives each trainee a new expiry (CSOC 3 years, work at height 2, rigger 3, welding 2) from today.
5. **Price is an estimate.** Where a fee is published the net amount assumes the fixed 70% skills-grant baseline and is labelled *估算*; the real grant depends on the employer, the trainee and the course. Where no fee is published the course cannot be paid from course credit.
6. **What counts as a clash** is unchanged: approved or pending leave on the dates, another open request on overlapping dates, an approved or running work permit that day. Leave and permit clashes can be overridden in writing by an employer account with the approve right; a double booking cannot.
7. **Worker app:** *为我推荐* uses expiry dates (expired, within 90 days, or a required certificate never held) and prefers the worker's own language (from the country on file), a placed venue, a published fee and a start at least two days away. A worker never registers or pays: they *ask*; the employer approves (or declines with a reason the worker sees). One open ask per worker and course.
8. **Maps:** the same shared component as the dormitory map (Leaflet, OpenFreeMap). Offline, the pins still draw and the lists work. Centre coordinates are Course Atlas's, from OpenStreetMap (ODbL): the attribution shown must stay.
9. **Backend:** static for now. `docs/API-CONTRACT.md` describes the endpoints a real backend needs so `js/train/store.js` can be swapped without changing the screens.
10. **Removed with the fictional hub:** the seat holds, the six simulated portals, the official pass with entry checklist, centre ratings and amenities. Their replacements are the data sources tab, the request slip and the provider comparison above. Storage key `bs_train_proto_v2` (request ids now start `TR-`; the seeded three are made fresh each reset, not read from the snapshot).
11. **Not built:** attendance days for training, invoicing, provider-side results (completion is simulated, everyone passes), notifications to the worker (the phone shows status on open), several workers asking for the same intake as one group, waiting lists.

## Incentives & wallets: decisions I made — please confirm
1. **One points balance, two ways out.** The deck shows the same points valued twice (1,450 pts = S$ 145 cash or S$ 290 course); I read that as a choice made at redemption, not two separate balances. Redeeming turns points into a cash voucher (S$ 0.10 per point) or into course credit (S$ 0.20 per point, the 2× boost); the points are gone either way.
2. **Course credit is the only thing that pays for training**, and only in the training hub (GIRO and invoice stay available). It is S$ per worker, spent per trainee at the booking's net price and returned on cancel or roster change.
3. **Everything is an entry in an append-only ledger**: award, deduct, reversal, redeem, spend, refund. Nothing is edited. A deduction can be reversed once (by hand with the approve right, or automatically); the reversal points at it.
4. **Corrective training is optional per deduction.** If a deduction names a course, completing a booking of that course for that worker reverses it automatically; otherwise only a person can reverse it. Completing any course also earns the *completed a course* points once per booking and worker.
5. **Redeem rules:** multiples of 100 points, never more than the balance. The rate in force on the day is recorded on the entry. A new rate version can only start today or later, must start after the latest version, and the course rate cannot be below the cash rate.
6. **Deductions cannot take the balance below zero** (the deduction is refused). Limit per entry 2,000 points.
7. **Separate from payroll.** No entry changes a payslip, a wage or CPF. Cash vouchers are a record only; paying them out (and any tax or employment-law treatment of docking incentives for conduct) needs HR / legal review before launch. This was already an open question in the framework.
8. **Who may do what:** awarding needs create, deducting needs update, redeeming and reversing need approve (project and finance roles have it, HR can only look). Workers redeem for themselves on the phone without approval; those entries are not in the audit log (they are the worker's own act) but are in the ledger.
9. **Not built:** automatic awards from attendance (punctuality, full attendance: the deck's rewards are entered by hand or by rule choice here), expiry of points, a manager approval step on phone redemptions, voucher partners and payout, points for referrals. Seeded balances are demo data.
10. Storage keys changed again (`bs_perm_proto_v6`, `bs_tenant_proto_v4`) and a new one was added (`bs_wallet_proto_v1`).

## Dormitory hub: decisions I made — please confirm
0. **The map** is Leaflet with an OpenFreeMap basemap (the same stack as your Course Atlas site: Leaflet and protomaps-leaflet are copied into `vendor/`, the base map is drawn on canvas so no WebGL is needed). Only the map tiles come from the internet: offline, the pins still draw on a plain background with a notice, and the list beside the map keeps working. The OpenFreeMap / OpenMapTiles / OpenStreetMap attribution is shown on the map and must stay. Dormitory coordinates are fictional like the dormitories; worksite pins use the coordinates in 项目与工区. The component is `js/map/map.js` and is reused by the next waves.
1. **Names, licences and addresses are fictional**, and the inventory is modelled: each dormitory shows two blocks of five rooms of six beds, with a stable share already taken. The headline "licensed beds" counts (for example 1,800) are only labels; vacancy figures are the modelled free beds.
2. **Only foreign (FIN) workers** can be housed here, one live lease each. Citizens and PRs do not appear in the lists.
3. **The move-in date is not simply the user's choice.** This settles the open question: the employer asks for a date; the operator's confirmation sets the effective date to the later of that date and the day the chosen beds become available (shown to the user as the earliest date). The date picker only prevents past dates and anything over 90 days ahead.
4. **Request, then confirm.** An allocation is a *request* (bed held, declaration *submitted*). The operator's answer is simulated by an employer account with the approve right. Confirming registers the declaration and updates the worker's address in the roster; there is no operator portal.
5. **Rent and deposit:** rent is the bed's monthly price including utilities; the refundable deposit is one month. Nothing is billed or deducted from wages; payroll is untouched (rent deduction from salary would need the same HR / legal review as the incentive deductions).
6. **Distance** is the straight-line distance between the dormitory and the site's coordinates; a shuttle route list per dormitory says which worksites have a direct service. Times are examples.
7. **Declaration slip:** a sample slip with a drawn QR; the real address declaration to the ministry is not filed. Registration is marked closed when a lease ends.
8. **Standards tab is illustrative.** I did not put real regulatory figures in it; it must be replaced with the authority's current rules before launch.
9. **Ownership:** leases made by the employer's own accounts are visible to the employer only (not to the worker's subcontractor); a subcontractor sees only the leases it made.
10. **Not built:** the dormitory operator's portal, waiting lists, moving a housed worker to another bed, rent invoicing, and the check-in gate (the worker's phone view of the bed and shuttle is the *我的住宿* tile, added in Wave 6). Storage keys changed again (`bs_perm_proto_v7`, `bs_tenant_proto_v5`) and a new one was added (`bs_dorm_proto_v1`).

## Spin & win: decisions I made — please confirm
1. **A token needs both punches on a scheduled workday.** The attendance engine decides what is scheduled: rest days, special rest dates and full-day leave are not, and neither earn nor break anything. Late or early still counts as going to work. A day is judged once it is over (the shift end plus the four-hour punch-out window); a day with one punch ends the streak.
2. **Days are processed once, in order, with the rules of that day.** Changing a rule never recalculates a past day; the cursor per worker moves forward only. Programme start date is a setting (default one week before the seed date); nothing before it earns.
3. **Streak bonuses** pay once per streak at workday 3 / 7 / 14 / 30 (+1, +2, +3, +5 tokens), all editable (1 to 6 milestones). The streak keeps counting past the last milestone. A fixed missing punch gives the day's token but does not repair the streak.
4. **Referrals** are recorded by an administrator (the real sign-up form is not in the prototype). The colleague must have joined within 45 days, cannot already have been referred, and cannot refer their own referrer. Both sides are paid when the friend completes a first worked day on or after the day the referral was recorded: 3 tokens to the inviter, 2 to the friend, at most 5 rewarded friends per inviter per month (past that the friend is still paid).
5. **One spin costs 1 token.** The slice is drawn with the weights among the slices that can come up for that worker at that moment: weight above 0, the worker under that slice's monthly cap, and the slice's cost within what is left of the monthly budget. If none of the costly ones qualify the free slices share the chance. The server-side rule is "decided at the press": the animation only shows it.
6. **Seed prizes (all editable):** 10, 20, 50, 200 points (25 / 12 / 4 / 1), course credit S$3 (6), cash voucher S$2 (5), bonus spin (10), no prize (37). The cash voucher and course credit land in the rewards wallet as *win* entries; points as an *award* with the spin's reference. **Budget:** S$ 500 a month; points are valued at the wallet's cash rate (S$ 0.10 each), course credit and voucher at their face value. Average cost at these weights is about S$ 1.17 a spin.
7. **The wheel always has 8 slices**, drawn in code. The images are optional slots in `assets/spin/` (file names, sizes and prompts in `docs/SPIN-ARTWORK.md` and the 转盘素材 tab). The browser console shows a harmless "404" for each image you have not added.
8. **Not built:** push notifications ("you earned a token"), a daily limit on spins, expiring tokens, a leaderboard, the real sign-up code field, seasonal events, sound. Tokens and spins are a separate ledger from payroll and the points wallet. Storage keys: new `bs_spin_proto_v1`; `bs_perm_proto_v8` and `bs_tenant_proto_v6` changed (so the new page and module appear), which resets custom roles and subscriptions made earlier.

## Not built (out of scope here)
Permit to Work: printing / PDF permits, risk-assessment attachments, QR check-in at the work face, inspection records, fatigue / working-hours checks. Phase 2 foundations: the gate itself (RFID taps, turnstile events), notifications to the subcontractor when a worker is blocked, training-centre and dormitory-operator portals. Projects & sites: real map search and picking (Google Maps), change log for project edits, reopening a completed project. Certificates: real file storage and original-image viewing, a notification centre (reminders are only computed), the 个人档案 screen that would also list them. Personnel, attendance and payroll: PDF payslip export, push notifications, profile editing in the worker app, payroll lock and top-up rules.

Two tabs are stubbed and show a "not wired up" toast: 请假管理 → 请假规则 (annual allowances, carry-over) and 租户管理 → 基础设置. Other items the designs show but this prototype leaves out: a notification centre for leave and payslip events, push notifications, and the other "inert" menu entries in the sidebar.

## Layout
```
index.html            shell: view switch, language, reset
css/                  spin, map, base, worker, admin, modules, leave-requests, tenant, cpf, hr, att, att-worker, payroll, prj, cert, notice, survey, audit, content, perm, sys, dep, ptw, train, wallet, dorm, responsive
js/core.js            safe html templating, icons, i18n, formatting, receipt viewer
js/bus.js             event bus (BS.bus: on / emit / log); js/wire.js republishes Phase 1 store changes as named events
js/comp/              合规引擎 (BS.comp): the rule table and fit(employee, {date, permit}); emits compliance.changed
js/map/map.js         shared map component (Leaflet + OpenFreeMap, clustered pins, lines, offline notice); vendor/ holds Leaflet and protomaps-leaflet with their licences
js/dorm/              宿舍床位: store (dormitories, modelled beds, leases, address declaration, distances), admin (find, leases, standards), worker (我的住宿), i18n; js/qr.js is the shared QR-style drawing
js/wallet/            激励与钱包: store (ledger, rates, rules, redeem, automatic awards and reversals from training), admin (wallets, ledger, rules), worker (积分钱包), i18n
js/spin/              转转乐: store (token ledger, streak, referrals, wheel draw with weights / caps / budget, report), wheel (the SVG wheel and the image slots), admin (six tabs), worker (转转乐 screens), i18n
assets/spin/          optional wheel images (see docs/SPIN-ARTWORK.md)
docs/SPIN-ARTWORK.md  the images to generate in ChatGPT: names, sizes, prompts
js/train/             培训预订: store (the Course Atlas snapshot, requests, clashes, shortlist, suggestions), admin (seven tabs and dialogs), worker (培训课程), i18n
data/atlas.js         the Course Atlas snapshot (generated; do not edit)
tools/import-atlas.py converts Course Atlas's JSON files into data/atlas.js
docs/API-CONTRACT.md  the endpoints a real backend needs for the training hub
js/ptw/               工作许可: store (permits, hard-stop engine, override, swap, renew), admin (permit cards, dialogs), i18n
js/dep/               部署与合规: store (deployments, gate), admin (list, status, rules, events), i18n for all Phase 2 foundation strings
PHASE2-FRAMEWORK.md   the plan these foundations come from (layers, modules, roll-out order, open questions)
js/xlsx-lite.js       offline .xlsx reader / writer (import and the template)
js/shell.js           admin shell + module registry (add a module = BS.registerAdmin({...})); the sidebar groups are the `NAV` list at its top; each group folds by clicking (or Enter / Space on) its heading, remembered in the browser under `bs_nav_closed`, and opening a page inside a folded group unfolds it
js/hr/                seed (one table), store (employees, trades, projects, import checks), roster, misc (trades, projects, module), worker gate
js/sys/               系统与三方配置: store (services, regions, content, dictionaries; feeds hr.COUNTRIES and hr.PCPS), admin (4 tabs), worker (设置)
js/perm/              权限管理: store (roles, accounts, permission checks, "act as"), admin (roles, permission page, accounts); js/shell.js uses it for the menu, the account switcher and the button guard
js/content/           内容配置: store (pop-ups, reminders, picture shrinking), admin (two tabs); used by the phone's attendance sheet and work centre
js/audit/             操作日志: store (entries, method wrapper), hooks (which store methods are logged), admin (审计日志)
js/survey/            问卷管理: store (surveys, questions, audience, answers, drafts), admin (list, question configuration, records), worker (问卷)
js/notice/            通知管理: store (announcements, recipients, scheduling, read marks), admin (log, publish, detail), worker (广播)
js/cert/              证书管理 admin (staff certificates, types) and the phone's 我的证书; the data lives in js/hr/store.js
js/co/                客户与分包商 admin; the company data lives in js/hr/store.js
js/prj/               项目与工区 admin (project list, site list, map sketch); the data lives in js/hr/store.js (projects, sites)
js/att/               store (groups, punches, day engine, seed), admin (4 tabs), worker (check-in, face, records)
js/payroll/           store (calc, generate, status flow), admin (工资单), worker (list, detail, dispute)
js/leave/ js/pay/ js/tenant/ js/reimb/   earlier modules
js/main.js            wires phone + admin, reset, view switch
```
Each `store.js` is the seam to swap for API calls later. Design source screens are in `../screens` and `../reimb_src`.
