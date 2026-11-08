# BuildSync — Phase 2 framework

Planning document. Phase 1 (manpower records + payroll) is the prototype in this folder; Phase 2 is the concept deck *Built Sync Phase 2.pdf* (23 slides). This document says how Phase 2 hangs off Phase 1, what has to be added to the foundation first, and in which order to roll the modules out.

**Status (28 Oct 2026): all five modules are built as clickable prototypes.** Everything behind a simulated integration, an operator or centre portal, or a legal review is still to do. As built:

| Wave | What exists in `prototype/` | Where |
|---|---|---|
| 0 Foundations | event bus, compliance engine with rule table, deployments, party types with field-level projection, per-tenant module switches, passport / work-pass fields, CSOC certificate type | `js/bus.js`, `js/wire.js`, `js/comp/`, `js/dep/`, `js/perm/`, `js/tenant/` |
| 1 Compliance on site | deployments with subcontractor and main-contractor views (the same page, different projections), Permit to Work with the automatic hard stop, swap / renew / written override | `js/dep/`, `js/ptw/` |
| 2 Training hub | catalogue, schedule matrix, centre comparison, booking with conflict advisor and seat holds, bookings with the pass, portals page; a stopped permit's refresher leads here and a completed course renews the certificate | `js/train/` |
| 3 Incentives | points ledger, cash and course credit, award / deduct / redeem / reverse, rate versions, worker phone wallet; credit pays for bookings; completed courses earn points and reverse corrective deductions | `js/wallet/` |
| 4 Dormitory hub | five dormitories with modelled beds, filters, allocation, leases, address declaration with operator confirmation, standards | `js/dorm/` |

**Wave 5 (map, built):** a shared map component (`js/map/`) and the dormitory map view. **Agreed on 1 Nov 2026; Waves 6 and 7 are built.** Added afterwards on request: *Leave Check* (AI-assisted crew coverage for the leave approver, simulated, `docs/LEAVE-CHECK-LLM.md`), a shared-room *My bed* on the phone, and the *Skill Passport* profile modelled on the EZJOB site (`docs/SKILL-PASSPORT-INTEGRATION.md`). **Wave 8: Site chat & Kanban** (`js/kchat/`, `docs/KANBAN-CHAT.md`): the WhatsApp-style site chat per attendance group, a simulated crawler that turns messages into Kanban cards, the daily EHS digest, and links to Permit to Work, the rewards wallet, Leave Check and the audit log.

**Waves 6 and 7:**

| Wave | Scope (your answers) |
|---|---|
| 6 Training hub on Course Atlas (**built**) | The hub's catalogue is a slim snapshot imported from the Course Atlas site (`tools/import-atlas.py` → `data/atlas.js`; 3,114 intakes, 119 courses, 13 providers; no database, crawled data, seat figures are reports not inventory). "Book" is an **enrolment request with hand-off** to the provider's registration link, kept in BuildSync with its conflict advisor, approvals and wallet credit. Workers in the phone app browse and search courses, see a map of centres, get **suggestions that renew their expiring certificates** and **shortlist and ask the employer**; admin has a map of centres, a provider comparison and a data-sources page. Backend: static now, **API contract** in `docs/API-CONTRACT.md`. |
| 7 Spin & win (**built**) | Tokens from **checking in and out on a scheduled workday** (the attendance engine says what is scheduled); a **streak** counted on scheduled workdays (leave and rest days pause it) with bonus tokens at workday 3 / 7 / 14 / 30; **referral** rewards when the referred worker completes a first worked day (both sides paid, monthly cap); an 8-slice code-drawn wheel with optional image slots (`assets/spin/`) and prizes of reward points, course credit, cash voucher, bonus spin and no prize; weights, per-worker monthly caps and a monthly prize budget with a spend report (`js/spin/`). |

The README has a walkthrough and a list of decisions to confirm for each wave. Differences from the plan in sections 7 and 8: the subcontractor and main-contractor "portals" are not separate screens but the same deployment and permit pages seen through a role of that party type; the generic **workflow helper** was not extracted (each module keeps its own small state machine); the ledger, the booking-and-hold primitive and the integration (portal) list were built inside the wallet and training modules instead of as shared engines; the training and dormitory centre / operator portals do not exist.

Scope note: everything below is derived from the deck's screens and the prototype's code. Where the deck is silent or inconsistent, it is listed in section 9 for you to decide, not assumed.

---

## 1. What the deck adds

The deck is one product, "Built Sync Enterprise", with the same company switcher (Apex Builders & Engineering Pte Ltd, UEN) and a sidebar that now has three groups.

| Sidebar item in deck | What it is | Phase 1 counterpart |
|---|---|---|
| Overview / Attendance / Leave Calendar / Claims / Employees | Core manpower admin | **Built** (people, attendance, leave, reimbursement) |
| Incentives & Wallet (2× Upskill) | Points ledger, Cash Wallet and Course Upskill Wallet, award / deduct / redeem, reversible deductions | none |
| Permit to Work (PTW) | Work permits per task/site, credential gatekeeper, **hard stop** when a worker's passport / CSOC / work pass is expired, swap worker / book refresher / quick renew | certificates + expiry reminders (built) |
| Subcon Portal | Subcon deploys workers to a main contractor's site; sees own private wage data and the maincon gate status | clients & subcontractors (built, as master data only) |
| Maincon Portal | Main contractor sees every subcon worker at the gate: work pass, CSOC, RFID turnstile, lock / unblock gate; **subcon wages are masked** | none |
| Admin Portal / Worker Portal | Role portals (admin, worker phone app) | built (admin, phone app) |
| ATTC Course Booking: Book Courses, Schedule Matrix, Centres Comparison, Conflict Advisor, My Bookings, External Portals | Training-centre marketplace: catalogue, subsidised vs full price (70% SDF), centre × date seat matrix, centre scoring, clash detection against leave and other bookings, QR confirmation pass, integration health | leave (built) is the input to the conflict check |
| Dormitory Match Hub | Dorm and bed search, bed-to-worker allocation, lease and deposit, OFWAS address registration, shuttle routes | none |

One sentence summary of how it fits together: **a worker is only allowed on site (PTW, gate) if their credentials are valid; when they are not, the system routes the employer to a booking (training or renewal) that must not clash with leave; training can be paid from the points the worker earned; housing is a parallel marketplace tied to the same worker record.** Phase 1's roster, certificates, leave and attendance are the inputs to all of it.

---

## 2. Target architecture

Five layers. Phase 1 is layer 1 plus most of layer 0; Phase 2 adds layer 2 (shared engines) and layer 3 (modules).

```
 L4  Portals            Admin (zh/en) · Worker phone app · Subcon · Maincon · Training centre · Dorm operator
 L3  Phase 2 modules    Incentive wallets · PTW · Deployments/Maincon/Subcon · Training hub · Dorm hub
 L2  Shared engines     Compliance (fit-to-work) · Ledger · Booking & holds · Workflow/approval · Integration hub · Event bus
 L1  Phase 1 core       People master (BS.hr) · Attendance · Payroll/CPF · Leave · Certificates · Reimbursement · Notices · Surveys
 L0  Platform           Tenancy & subscriptions · Roles/scope/field visibility · Audit · Dictionaries · System config
```

Rules of the road:

1. **Modules depend downward only.** A Phase 2 module may call Phase 1 through its public store API (`BS.hr.*`, `BS.leave.*`, `BS.att.*`), never through storage keys or DOM. Phase 1 never imports Phase 2.
2. **Phase 1 tells Phase 2 what happened through events, not calls.** New: a tiny `BS.bus` (publish / subscribe). The audit log already wraps store methods in `js/audit/hooks.js`; the same hook point can emit events.
3. **One worker, many views.** There is a single employee record. What the Maincon, the Subcon, the Training centre and the Dorm operator may see of it is a projection decided by policy (section 4.3), never a copy.
4. **Every external system sits behind an adapter** with the same shape: capabilities, health, sync mode (poll / webhook / socket), last-sync. The prototype's `BS.sys` services (map, SMS, file) already look like this; generalise them.
5. **Module switch per tenant.** Subscriptions (`BS.tenant`) are currently seats and price only. Add `modules: []` so Phase 2 can be sold and rolled out per customer.

---

## 3. What Phase 1 already gives, and the gaps

| Phase 2 need | Phase 1 asset | Gap to close first |
|---|---|---|
| Worker identity, pass type, nationality, trade | `BS.hr` employees (`createdBy`, trades, countries) | Passport and work-pass numbers/expiries are not first-class fields; they are only certificate types today |
| Credentials valid / expired | Certificates + cert types + reminder nodes (`BS.hr.dueReminders`) | No single "can this person work today?" answer |
| Who employs whom, who works where | `companies` (type client / subcontractor), `projects`, `sites`, employee → project | **No deployment model**: no "worker X of subcon S is deployed to maincon M's site Z from date A to B". This is the key missing entity |
| Clash with leave | `BS.leave` requests + calendar | Needs a query "is employee E on approved/pending leave between D1–D2" |
| Attendance at the gate | `BS.att` punches, site fences | Gate/turnstile events are a second source of punches; attendance must accept an event source |
| Payroll effects | `BS.payroll` templates, items, CPF | Wallet deductions must **not** reach payroll silently (see 9, Q4) |
| Different organisations log in | `BS.perm` accounts with `companyId` and data scope | Accounts belong to one admin org; no party types (maincon / subcon / training centre / dorm operator), no field-level visibility |
| Plans / modules | `BS.tenant` seats + price | No module entitlements |
| Integrations | `BS.sys` service switches with simulated tests | Only three services; no health history, mode or sync log |
| Audit | `BS.audit.wrap` | Extend hooks to every new store; add before/after for ledger entries |

---

## 4. Shared engines (layer 2) — build these before the modules

### 4.1 Compliance engine — "fit to work"

A pure function, not a stored flag: `fit(employee, date, context) → { ok, reasons:[{type, ref, expiresOn}] }`.

Inputs: certificates (CSOC, WAH, lifting, etc. by cert type), passport expiry, work-pass expiry, approved leave, active training booking, deployment status. Rules are data (per trade / per permit type, effective-dated like the CPF versions), so adding "Confined-space assessor needs X" is configuration.

Consumers: PTW (hard stop), Maincon gate status, attendance warnings, booking suggestions ("book refresher"), roster badges (the deck's red *CSOC Expired* chip).
Emits: `compliance.changed {employeeId, from, to, reasons}` — PTW and the gate subscribe to this to suspend / release.

### 4.2 Ledger — points and wallets

Append-only entries: `{id, employeeId, wallet: cash|course, kind: award|deduct|reversal|redeem, points, amount, ruleVersion, reason, by, refId, at}`. Balances are sums; nothing is edited, a reversal is a new entry pointing at the one it cancels (the deck's "Reversals" tab). Conversion rates are effective-dated rule versions (Cash 100 pts = S$10, Course 100 pts = S$20), same pattern as CPF.

Also reusable later for: attendance bonuses, referral credits, subcon retention holdbacks.

### 4.3 Party model and field-level visibility

Add to `perm` an organisation `partyType`: `employer | maincon | subcon | training_centre | dorm_operator`. Data scope today is *people/projects/company*; add a **visibility policy per party and field group**:

- Subcon sees own workers, wage fields, deployments.
- Maincon sees workers *deployed to its sites*: identity, trade, MOM pass, CSOC, gate status — **wage group is masked** (the deck's "Confidential — subcon rates redacted").
- Training centre sees only trainees on its own batches, name + FIN + trade + nationality.
- Dorm operator sees only workers allocated to its beds.

Implementation in the prototype: `BS.perm.project(viewer, employee)` returns a filtered copy; modules must call it instead of reading `BS.hr.emp()` directly when the viewer is not the employer. In production this must be enforced server-side.

### 4.4 Booking and holds

One primitive for course seats and dorm beds: `inventory(item, slot, capacity)`, `hold(item, slot, qty, ttl)`, `confirm(hold)`, `release`, `cancel`. A hold expires automatically (deck says 10 min on the course drawer and 5 min in the integration feed — pick one). The same engine drives: schedule matrix, "x seats left", My Bookings, dorm allocation.

### 4.5 Workflow / approval

Phase 1 has three separate hand-written flows (reimbursement, leave, payroll status). Phase 2 adds more (PTW approve → activate → suspend → close; booking requested → confirmed → completed; deployment requested → accepted by maincon → active). Extract a small state-machine helper (`states`, `transitions`, `guard`, `onEnter`) so new flows are declarative; do **not** rewrite the three existing ones yet.

### 4.6 Integration hub

Adapter contract: `{id, party, mode: poll|webhook|socket, endpoint, capabilities[], health(), sync()}`. The deck lists: MOM ACE onboarding (5-min poll), BCA/MOM ATTC central feed (webhook + 3-min fallback), SSG SkillsConnect subsidy (per query), per-centre TMS feeds (socket), MOM OFWAS (address declaration). In the prototype every adapter is a **simulator**; the deck's "6 connected, 58 ms" page is the UI for the hub. Real endpoints and access are a business dependency (section 9, Q1), not an engineering one.

### 4.7 Event bus

`BS.bus.on(type, fn)` / `emit(type, payload)`; events are logged (and shown on the audit page). Initial events: `employee.updated`, `cert.changed`, `leave.approved`, `deployment.changed`, `compliance.changed`, `ptw.suspended`, `booking.confirmed`, `wallet.entry`.

---

## 5. Phase 2 modules (layer 3)

| # | Module | Depends on | New entities | Portals / roles | Integrations | Size |
|---|---|---|---|---|---|---|
| A | **Deployments + Subcon / Maincon portals** | people, companies, projects, compliance, field visibility | `deployment` (employee, subcon, maincon, site, from, to, status, rfidCard), `gateEvent`, `gateOverride` | Subcon user, Maincon user | turnstile/RFID (simulated) | L |
| B | **PTW & credential gatekeeper** | compliance, deployments, sites, workflow | `permit` (no., type, site, shift, RA ref, assessor, team[], status), `permitEvent` | Admin, WSHO, Maincon read | none (MOM rule set is config) | L |
| C | **Training Centre Match Hub** | compliance, leave, booking, integration hub, notices | `course`, `centre`, `batch`, `booking`, `trainee`, `pass` | Admin, Worker (view pass), Training centre (batches) | ATTC feed, MOM ACE, SSG subsidy, TMS | XL |
| D | **Incentive & wallets** | ledger, attendance, certificates, training hub (to spend) | `wallet`, `ledgerEntry`, `rule`, `redemption` | Admin/WSHO, Worker app | voucher partner (TBD) | M |
| E | **Dorm Match Hub** | people, booking, field visibility | `dorm`, `room`, `bed`, `lease`, `allocation`, `shuttle` | Admin, Dorm operator | OFWAS declaration | L |

Dependencies in one line: **A and B both need the Compliance engine; C needs A/B (the "book a refresher" action) and Leave; D needs C to be useful (Course Wallet pays for bookings) but its Cash Wallet part is standalone; E is almost independent.**

### Module detail notes

**A. Deployments + portals**
- A deployment is the join the prototype lacks. It belongs to the *subcon* (employer of record), points at a *maincon site*, has dates and a status: `requested → accepted → active → ended | blocked`.
- Gate status is derived: `blocked` if compliance not ok **or** maincon manually blocked; turnstile event = tap RFID. Both portals show the same row, different columns (the deck's two roster screens).
- Wage masking is the test case for 4.3: write one automated check that the maincon projection never contains wage fields.

**B. PTW**
- Permit types from the deck: hot work, work at height (>2 m), heavy lifting; each type maps to required cert types in the compliance rule table.
- Hard stop: on `compliance.changed` for any assigned worker → permit becomes `suspended (stop-work order)` with reasons; actions: swap worker (re-check compliance of the replacement), book refresher (hand-off to C), quick renew (hand-off to certificates). Release only when the engine returns ok again, or a named authority overrides (audited).
- KPI tiles in the deck (total permits, stop-work orders, in-progress, non-compliant workers) are all derived.

**C. Training hub**
- Catalogue shows *subsidised employer rate vs full fee* (deck: from S$29.40, was S$110, 70% SDF). Treat the subsidy as an SSG adapter call per query, with a configurable fallback percentage in the prototype.
- Conflict Advisor = query leave (approved and pending) and other bookings for each chosen trainee and batch dates; result tags (*Training Clash*), actions: auto-swap, remove, or a Safety-Manager override (audited).
- A confirmed booking creates a leave-like "training day" on attendance so absence is not flagged; the QR pass lists trainees; centre-side check-in is a later portal.

**D. Incentive wallets**
- Reasons come from a rule table (punctuality, full attendance, hazard report, zero-incident milestone; deductions for late, unexcused absence, unsafe act). Manual award/deduct requires a reason and the awarding person (the deck shows "By: Tan Boon Keng (WSHO)").
- "Reversible deduction": completing a corrective training booking (C) raises a reversal entry for the deduction it was tied to.
- Redeem Cash → voucher record (no payroll). Redeem Course → becomes a payment line on a booking (C).

**E. Dorm hub**
- Search by region / room type / budget / amenities / worksite proximity; allocation modal assigns named workers to named beds, collects start date, lease period, deposit, and generates the OFWAS declaration + QR.
- Deck conflict: the concept notes say the effective date is set by the supplier allocation, the screen shows a user-picked date (Q6).

---

## 6. Roles and portals

| Party | Signs in to | Sees | Can do |
|---|---|---|---|
| Employer admin (HR / finance / ops / WSHO) | Admin portal (zh/en) | All own data, scoped by role | everything in Phase 1; PTW, wallets, bookings, dorm |
| Worker | Phone app | Own record, payslips, leave, wallet, booking pass, dorm | submit claims/leave, view/redeem points, view pass |
| Subcontractor | Subcon portal | Own workers, deployments, own wages | deploy worker to maincon, view gate status |
| Main contractor | Maincon portal | Deployed workers on own sites (no wages), PTW read | lock/unblock gate, request replacement, audit ledger |
| Training centre | Centre portal (later) | Batches, trainee list | publish batches, mark attendance/pass |
| Dorm operator | Operator portal (later) | Own dorms, allocations | publish beds, confirm lease |

In the prototype: no real login exists, so the existing "act as" switcher gets the new accounts and the shell hides everything not allowed — same mechanism as the permissions module.

---

## 7. Roll-out sequence

**Wave 0 — Foundations (no new screens beyond small config pages).** Needed by everything.
1. Deployment entity in `BS.hr` (and migrate seed: some seed employees become subcon workers deployed to a maincon site).
2. Compliance engine + rule table + passport / work-pass fields on the employee.
3. `BS.bus`; hook it into the audit wrappers.
4. Party types + field visibility in `BS.perm`; module entitlements in `BS.tenant`.
5. Generic adapter shape in `BS.sys` (service list becomes an integration list).
6. Workflow helper, ledger and booking primitives with unit-style self-tests.

**Wave 1 — Compliance on site.** A (deployments + both portals) then B (PTW). This is the regulatory core, it uses what Phase 1 already knows best (certificates, roster), and it creates the "book a refresher" demand for C.

**Wave 2 — Training hub.** C: catalogue → compare / matrix → booking with conflict advisor → My Bookings and pass → integration page. Then the PTW "Book refresher" and roster "CSOC expired" actions link into it.

**Wave 3 — Incentives.** D: ledger UI and worker app wallet; then course-wallet redemption inside C's booking.

**Wave 4 — Dorm hub.** E: independent; put last because it needs supplier supply (Q2) and has the weakest link to Phase 1.

Reasonable parallel split if two people are available: Wave 3's cash-wallet half can run alongside Wave 1.

---

## 8. Prototype build plan (as built)

The prototype followed one folder per module under `prototype/js/` (`store.js`, `admin.js`, `i18n.js`, optional `worker.js`), CSS under `css/`, registered in `index.html` and the README:

| Step | Planned | Built as |
|---|---|---|
| 0a | `js/core/bus.js`, `js/comp/` | `js/bus.js`, `js/wire.js`, `js/comp/` (engine, rule table) with the roster badge and the new employee document fields |
| 0b | `js/dep/` | `js/dep/` (store and the admin page for all three kinds of viewer) |
| 0c | `js/perm` extension | party type on the role, `BS.perm.project()`, module entitlements in `BS.tenant` |
| 1 | `js/portal/` | folded into `js/dep/` and `js/ptw/` as role views |
| 2 | `js/ptw/` | `js/ptw/` |
| 3 | `js/train/` | `js/train/` plus `js/qr.js` (shared QR-style drawing) |
| 4 | `js/wallet/` | `js/wallet/` (admin and worker app) |
| 5 | `js/dorm/` | `js/dorm/` |

Each step keeps the existing conventions: global `BS`, localStorage key per store with a version, subscribe → re-render, safe `html` templates, zh/en strings through `BS.D`, tests by script at desktop and 390 px, README section "Rules implemented / decisions to confirm".

Admin navigation: the deck uses a flat sidebar with a separate "ATTC Course Booking" group. The prototype's sidebar is page-gated by the permission module; add one nav group per entitled module so tenants without a module do not see it.

---

## 9. Open questions for you

The prototype had to assume an answer to most of these; the assumption is in brackets, and the README lists the detail per module.

1. **External systems.** Do you have, or will you obtain, API access to MOM ACE, BCA/MOM ATTC central feed, SSG subsidy calculation and per-centre TMS? The deck shows endpoints and latencies but I cannot verify they exist for a private vendor. Plan assumes simulators first; this decides whether Wave 2 is a prototype or a launch module. [Prototype: six simulated portals with manual connect / disconnect.]
2. **Supply side.** Training centres and dorm operators are suppliers. Are any signed? If not, C and E start with a curated catalogue managed by BuildSync staff, not self-service portals. [Prototype: a generated catalogue and bed inventory, no supplier portals.]
3. **Employer of record.** In the deck Apex Builders appears as both the employer on the admin side and, in the Subcon portal, "Apex Civil & Specialist Engineering" deploying to Woh Hup. Confirm the tenant is normally the *employer*, with maincons as external parties (my assumption), and whether one tenant can be both a maincon and a subcon. [Prototype: the tenant is the employer; maincons and subcons are external company types.]
4. **Points and pay.** Points deducted for lateness and a "reversible deduction" feel like pay-related. Confirm they stay **separate from payroll** (incentive pool only, no wage reduction) and whether HR/legal must review the rules before launch. Cash redemption is assumed to be vouchers, not salary. [Prototype: ledger separate from payroll, vouchers are a record only.]
5. **Hard-stop authority.** Who may override a PTW suspension or unblock a gate (Safety Manager? Maincon only?) and must it need two people? [Prototype: only certificate stops can be overridden, by an employer-side account with the approve right, in writing, for one day; no second signer.]
6. **Hold time and dorm date.** Seat lock is 10 min in one slide and 5 min in another; dorm effective date is "set by supplier" in the notes but selectable in the modal. Pick one rule each. [Prototype: 10 minutes; the operator's confirmation sets the dorm date, never before the beds are free.]
7. **Overlap with Phase 1 claims.** The deck's "Claims" is the reimbursement module already built; confirm there are no new claim types in Phase 2.
8. **Naming.** The deck calls the integration hub text "TrainGoda" and the product "Built Sync" (the prototype uses BuildSync). Confirm product and module names before they are baked into strings.
9. **Languages.** Phase 1 admin is zh/en. The deck is English only and mentions Bengali / Tamil / Mandarin / Burmese as *course languages*. Confirm the worker app and centre portal languages.
10. **Sequencing.** Is the wave order above right for the business, or should incentives (worker engagement) come before the portals?

---

## 10. Things in the deck worth fixing before build

- Worker FIN numbers differ between slides for the same person (e.g. Md Hasan Ali is G2819401K in the roster and G8291048K in the booking). Real data will come from the roster; mock data should be unified.
- "2 STOP" badges and "0 clashes" are hard-coded in the mockups; in the build they are derived counts.
- Prices are shown *after* subsidy in some views and before in others; define one display rule (net employer price large, full fee struck through).
- Deck dates are September 2026; the prototype was built in late October 2026, so any seed data should be generated relative to today as Phase 1's seed already does.
