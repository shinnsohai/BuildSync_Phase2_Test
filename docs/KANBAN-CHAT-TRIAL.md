# Site chat & Kanban: closure-evidence flow, role trial and critique

Trial run in the prototype as a **worker** (许玲 / BS10115), a **supervisor** (张强 / SG-0312, plus the safety officer 吴东 / BS10116 as the second person) and the **manager** (admin account, owner). Each row says what happened and whether it is fixed. Numbers come from the seeded data on a fresh reset.

## 1. What was built

Closing a card now goes through a closing dialog (phone sheet / admin modal). The owner controls it in **设置 / Settings**: master switch, which categories need evidence, minimum count (1 to 3), closing note required, safety cards only closed by safety managers, and the reporter cannot close their own High or Critical card. Details: `KANBAN-CHAT.md` section 5a.

## 2. The trial

Status is as of the first trial. Section 4 says what changed afterwards (several "Open" rows below are now handled).

### Worker (reports; does not close)

| # | What I did | Result | Status |
|---|---|---|---|
| W1 | Posted a photo with "no harness at open edge" | Card made, bubble shows chip. Fast; this part works. | OK |
| W2 | Posted "all good at level 3" | No card (negation rule). | OK |
| W3 | Reported the same hazard twice | Second card flagged as a duplicate of the newest open one (it pointed at the oldest first). | Fixed |
| W4 | Tried to move or close a card | Read-only board, no buttons; API returns `denied`. | OK |
| W5 | Posted "Great job team, the harness checks were done well" and "Is the harness inspection done?" | Both became High safety cards (a keyword hit on *harness*). | **Fixed**: praise and questions without a tag no longer make cards |
| W6 | Wrote a hazard in slang ("guys r working on d edge no belt"), short Chinese ("边上没挂带"), Tamil and Bengali | All four were missed. | **Partly fixed**: phrases added. A keyword list will always lag; this needs the real model (see 3.4) |
| W7 | Tagged five throwaway messages `#Safety` | Five cards, no limit. | **Open** (see 3.5) |
| W8 | After the fix, looked for the result | The room shows a closing notice with the proof photo and who closed it; the reward lands once, at closure. | OK |

### Supervisor (takes up and closes)

| # | What I did | Result | Status |
|---|---|---|---|
| S1 | Took up a card (待审核 → 处理中) | Notice in the room. In the first version this already paid the reporter's points. | **Fixed**: points are paid only at closure with evidence |
| S2 | Tried to close with no evidence, then with a note only | Blocked with the reason in the sheet. | OK |
| S3 | Closed with a chat photo | Closed; picker only offered photos posted *after* the card was raised. The "before" photo and old photos were first offered as proof. | Fixed |
| S4 | Closed a second card with the same photo | Rejected (`reused`). | Fixed |
| S5 | Reported a Critical card himself and closed it with an unrelated PDF | Allowed. | **Fixed for the self-close** (second person required, switchable). Unrelated evidence is **open** (3.2) |
| S6 | QC role closed a Safety card | Allowed at first. | **Fixed**: safety managers only (switchable) |
| S7 | Reopened a closed card | Recorded in the history with a notice; the closure is cleared. | OK |
| S8 | Assigned a card to a crew member | Works, listed on the card. | OK |

### Manager (owner)

| # | What I did | Result | Status |
|---|---|---|---|
| M1 | Switched evidence off | Cards close with one tap. Category and minimum controls grey out. | OK |
| M2 | Saved min = 5, no category ticked | Refused with a message per field. | OK |
| M3 | Opened the legacy list | Cards closed before the rule are listed as *without evidence*. | OK |
| M4 | Generated the digest | Counts closed cards and cards with evidence. | OK |
| M5 | Looked at open High and Critical cards | 8 of 9 have nobody assigned. | **Open** (3.3) |
| M6 | Opened every other admin page after the changes | No page crashed; no console errors. | OK |

## 3. Criticism of the workflow (about the design, not the code)

You asked for honesty, so here it is, most important first.

**3.1 The specification defined how a problem *enters* the system and not what it takes to *leave* it.** Reporting got a crawler, a language layer and an AI summary; "Resolved" was a column anyone could drag a card into. A board where closing is free measures how fast people click, not how safe the site is. The evidence flow is the missing half. It should have been in the first specification, not the second request.

**3.2 A photo is not proof of a fix.** Evidence here is "a file exists". It can be last year's picture, a picture from another room, or a PDF with any name. I blocked reuse and the "before" photo, but the real rule needs the server: time of capture, location, and ideally the camera inside the app (no gallery upload for Critical cards). Decide that policy first, because it changes the worker's phone flow, not just the checks. A person comparing before and after is still the strongest control; the pairing view is the next feature worth building.

**3.3 Nobody owns a card.** The specification assigns a *role* (the safety officer) but never a named person or a time. Eight of nine open High/Critical cards have no owner and nothing makes them age loudly. A role owning a problem means no one owns it. Add an owner, a due time by priority, and an escalation to the manager if the time passes. That is worth more than any extra AI feature.

**3.4 You asked an English/Chinese keyword engine to serve a crew that writes Tamil and Bengali.** The seed data in your own spec contains those languages; the rules still missed Tamil and Bengali phrases and slang. I patched phrases, but a keyword list is a demo, not a design. Either commit to a real model for classification with a human-visible confidence, or make the worker flow tap-driven (pick a category and a hazard icon, then add a photo) so language is not the gate.

**3.5 The tag is a free pass.** Anyone may tag any message `#Safety` and make a card, and there is no throttle, so a bored or angry user can flood the safety officer. The crawler also decides alone whether a message becomes a card. Rate-limit per person, and let the safety officer reject a card with a reason (this is a bigger fix than it looks because a rejection also needs a worker-facing message).

**3.6 Rewards pull behaviour.** Paying points for hazard reports is a good idea; paying them when somebody *takes up* a card (my first version) paid for a click. Now it pays at closure with evidence, once. It is still open to collusion (a friend reports and a supervisor closes). A weekly cap and a spot-check list for the safety officer would close that without punishing honest reporters.

**3.7 Two systems for one hazard.** A safety card and a permit to work are linked, not unified: a Critical card can sit open while the permit stays valid. I kept this as a link and a warning on purpose (a static prototype must not stop work). Decide which system owns the hazard's life cycle, because auditors will ask.

**3.8 Roles are guessed from trade and assignment.** A "safety officer" derived from a trade name is not a formally appointed person. For the real build, appointments should be explicit records with dates, because the closing rights now depend on them.

**3.9 Scope and success measure.** The spec bundled chat, board, AI, digest and administration with no number to move. Pick one, such as *median time from a Critical report to a closed, evidenced card*, and let the digest report it. The prototype can already show age; it cannot judge whether the flow works until someone says what "good" is.

## 4. What was done about each point

Second round, after the critique above. Measures and defaults are in `KANBAN-CHAT.md` section 5b; the README walkthrough "Try who owns a card, proof, and the permit hold" shows each one.

| Point | Done | What it still cannot do |
|---|---|---|
| 3.1 Closing was undefined | Closing dialog with what counts as done per category, evidence rules, second person, spot-check of the closing itself. | A written site procedure should define "done" per hazard type. |
| 3.2 A photo is not proof | Photo must be taken after the report, not the before picture, not used before (also caught when re-saved: average hash), camera-only for the priority the owner picks, position checked against the site fence from Sites (flag or refuse). | The prototype reads time and position from the browser. A real server must take them from the device and the upload, and ideally compare before and after pictures. |
| 3.3 Nobody owns a card | Named owner on every card (auto-picked from appointed officers not on leave), owner required within 30 min for High/Critical, due time by priority, escalation to the supervisor then the board owner, shown in the room and on the card, "late or unowned" filter, per-owner table. | Escalation is a room notice and a card mark; there is no phone push or SMS yet. |
| 3.4 Languages | Tap-driven report in four languages (no typing needed); unreadable messages held for a person, not dropped; low-confidence mark on rule hits in Tamil/Bengali; `setModel()` for a real model. | The Tamil and Bengali labels are my wording and need native review; no real model is connected. |
| 3.5 Tags are a free pass | Hourly limit per person with a review list, Critical reports exempt unless the person has recent invalid reports, reject-with-reason that counts against the reporter. | Limits are per person, not per device. |
| 3.6 Rewards | Points at evidenced closing only, weekly cap, repeating reporter/closer pair refused, invalid-report record, spot-check of flagged and sampled closings with clawback. | Collusion between two different closers is only caught by the sample. |
| 3.7 Two systems for one hazard | A Critical safety card puts that site's permits on hold (no approval, no start) until closed. Roles come from formal appointments (scope, dates, reference, certificate), not the trade. | The permit holder does not yet have to acknowledge the card; there is no formal link to an incident report. |
| 3.8 Roles are guessed | Appointments with scope and dates; Safety Officer C certificate required and checked each time it is used (suspended when it lapses); an appointed officer only closes cards at their own project and site. | Appointment letters are a reference number, not an uploaded document. |
| 3.9 No success measure | Results tab: median hours from Critical report to evidenced closing against the target, 14-day trend, by room and owner; the digest carries it. | The target (4 h) is my default; the owner must decide it. |

A finding of its own: with roles guessed from trade, the seed data had one safety officer in the whole company (Maritime Square) and none for Tower A or Raffles Place. The old board would have routed Tower A hazards to "a role" nobody held. Appointments made that visible and the seed now appoints a Tower A officer explicitly.

## 5. Still open

Phone push or SMS for escalations; before/after picture comparison; permit holder acknowledgement of a card; uploaded appointment letters; native-speaker review of the Tamil and Bengali labels; a connected language model; server-side repeats of every check.
