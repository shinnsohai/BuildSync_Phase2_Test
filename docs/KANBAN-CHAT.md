# Kanban Chat in BuiltSync: how the specification maps onto the prototype

The module is *现场群聊看板 / Site chat & Kanban* (`js/kchat/`). It follows the "Kanban Chat for Construction" specification (WhatsApp-style site chat; messages turned into Kanban cards; daily EHS digest; role-based access) but is built the BuiltSync way: a static prototype with a local store, simulated AI, and a written contract for the real backend.

## 1. What is real, what is simulated

| Part | In the prototype |
|---|---|
| Rooms, members, people | **Real BuiltSync data.** Each attendance group is a room; its members are the people on that group; project, site, trade and subcontractor come from the personnel record. Custom "special team" rooms can be added. |
| Chat roles | *Supervisor* from the person's assignment; *Safety officer*, *Quality control* and *Scheduler* only from a formal **appointment** (person, project and site scope, dates, reference number; a safety officer also needs a valid Safety Officer C certificate); *Kanban owner* from the Super administrator account; everyone else is a *Worker*. Nobody becomes a safety officer by trade alone. |
| Messages, tags, cards, digests | Saved in the browser (`bs_kchat_proto_v1`). Messages and card history are append-only. |
| Photos | Real: picked or captured, resized to 640 px and stored (the newest ten keep their pixels). |
| Voice memos and short video | Simulated tiles with a duration (a static site cannot store audio or video). |
| Real-time | The phone and the admin share one store, so a message appears on both at once; other browser tabs update through the storage event. A server would use the WebSocket events in section 4. |
| AI crawler | A rule engine (`BS.kchat.analyse`) that returns the specification's JSON. |
| Daily digest | Built by rules from that day's real messages and cards, in the specification's five sections. |
| Translation | Seeded messages carry a translation; typed ones say it is not available in the prototype. |

## 2. Chat role matrix (as in the specification)

| Action | Owner | Supervisor | Safety officer | QC | Scheduler | Worker |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Send, tag, upload, read cards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Move or create cards | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete cards | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consolidate all chats, generate digest | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create rooms, change room fields, set roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage members of a special-team room | ✅ | ✅ (member only) | ❌ | ❌ | ❌ | ❌ |

In the admin dashboard two layers apply: the page's operations in 权限管理 (view, create, update, delete, export, approve) and the chat role the account maps to. The phone enforces only the chat role. *Consolidate* and *digest* are "approve" operations; *new card* is create; *move/edit* is update.

## 3. The crawler: the one function a real LLM replaces

`BS.kchat.analyse(text, tag, { media, room })` returns:
```json
{ "is_kanban_item": true, "title": "…", "category": "Safety|Progress|Quality|Material", "priority": "Low|Medium|High|Critical",
  "assigned_role": "SAFETY_OFFICER|…", "recommended_column": "Backlog|Pending_Review|In_Progress|Resolved",
  "location_tag": "Level 3 east corridor", "action_summary": "…" }
```
Rules in the prototype (the specification's, plus examples in Chinese): casual chatter ("ok copy", "good morning") makes no card; a quick tag forces the category; safety words or missing PPE, exposed edges, loose scaffolds, leaks → *Safety* (High; Critical for falls, electric shock, fire, injuries, or water near electrical equipment) for the safety officer in *Pending review*; honeycomb, cracks, misalignment, failed tests → *Quality* for QC (High on columns, slabs, beams); deliveries, shortages, delays → *Material* for the scheduler; finished work → *Progress* for the supervisor (*Resolved* when it says done, else *In progress*). The location comes from the text ("Level 3 east corridor", "Shaft #2", "二楼") or, if none, from the room's building / level / zone.

To use a real model: call it from a server with the specification's system prompt and JSON schema, validate the reply, and fall back to this function on failure. The message text, quick tag and a description of any photo are the input; no names, phone numbers or ID numbers are needed. Keep the raw reply in the card's history for audit.

## 4. API and events for a real backend
The specification's REST routes map one-to-one onto the store methods:

| Spec route | Store method |
|---|---|
| `GET /api/data` | `rooms()`, `messages(roomId)`, `cards()` |
| `POST /api/messages` | `send(roomId, senderNo, { text, tag, media, autoCrawl })` |
| `POST /api/messages/:id/crawl` | `crawl(id)` |
| `POST /api/gemini/crawl-chats` | `consolidate(actor, roomId?)` |
| `POST /api/gemini/daily-report` | `digest({ date, roomId }, actor)` |
| `POST /api/cards` / `PATCH` / `DELETE` | `createCard` / `moveCard`, `updateCard` / `deleteCard` |
| `POST /api/groups`, members | `createRoom`, `updateRoom`, `setMembers` |
| users (create/update/delete) | not here: people are the BuiltSync personnel record; `setRole` assigns the chat role |

Every call takes an `actor` `{ role, no }`; the server must take the role from the signed-in session, not from a header the client sets. WebSocket events from the specification (`message:created`, `card:created`, `card:updated`, `card:deleted`, `group:created`) correspond to the store's `message`, `card` and `room` events and the event-bus names `kchat.message`, `kchat.card.created`, `kchat.card.moved`, `kchat.card.deleted`.

## 5. How it joins the other BuiltSync modules
- **Permit to Work:** a High or Critical safety card in a room whose site has an approved or running permit (today or tomorrow) is linked to that permit; the permit card then shows how many open safety cards it has, with a link to the board. Nothing is stopped automatically: the decision to stop work stays with the people who hold the permit.
- **Spin & win / rewards wallet:** when a manager (owner, supervisor, safety officer) closes a worker's High or Critical safety report (with its evidence, when evidence is required), the reporter earns the existing *hazard star* points once; the card records it. Taking the card up pays nothing.
- **Leave and attendance:** each room header shows how many of the crew are on leave or have not shown up today; the daily digest includes the same counts; Leave Check shows the number of open cards in the crew's room.
- **Audit and permissions:** card creation, moves, edits, deletes, consolidation, digests, room changes and role changes are in the audit log; the page, its operations and the module appear in role permissions and tenant subscriptions.

## 5a. Closing a card: the evidence flow (Settings tab)
A card only counts as *Resolved* when it is closed through a closing dialog (phone sheet or admin modal). What the dialog asks for is set by the owner in **设置 / Settings**:

| Setting | Default | Effect |
|---|---|---|
| Closing needs evidence | on | Master switch. Off: cards close with one tap and nothing is asked. |
| Categories that need it | Safety, Quality | Material and Progress close freely. |
| Minimum pieces of evidence | 1 (1 to 3) | Photos picked from the room's chat or uploaded; a file (PDF, image) is accepted. |
| Closing note required | off | At least 5 characters on what was done. |
| Safety cards only closed by owner, supervisor, safety officer | on | QC and scheduler cannot close a safety card. |
| Reporter cannot close their own High or Critical card | on | A second person confirms. |

Rules the store enforces (`validateClosure`, `closeBlock`): the picture that *reported* the problem and pictures posted before the card was raised are not offered as proof; one picture cannot close two cards (`reused`); a closed card keeps who, when, the note and the evidence; the room gets a notice with the photo; reopening a card is recorded and clears the closure. Cards closed before the rule existed are listed under Settings as *without evidence*. The digest counts closed cards and how many carry evidence.

What a real backend must add: evidence is only a reference to a picture here. The server should keep the original file with time and location metadata, and check them against the card (see the trial notes in `docs/KANBAN-CHAT-TRIAL.md`).

## 5b. The accountability layer (`js/kchat/ops.js`)
Each row answers one problem found in `KANBAN-CHAT-TRIAL.md`. Every threshold is a switch or number in **Settings** and is stored with the board.

| Problem | Measure | Where it is enforced |
|---|---|---|
| Nobody owns a card | Every card gets a **named owner** when it is made: the appointed officer for that kind of problem at that site who is not on leave and has the fewest open cards, else a supervisor of the room. Taking a card up names you as the owner. High and Critical cards must have one within *N* minutes. | `_autoOwner`, `assignCard`, `sla()` |
| No due time, no escalation | **Time allowed per priority** (default Critical 4 h, High 12 h, Medium 72 h, Low 168 h), counted from the report to the evidenced closing. At 100% of the time the supervisor is told (the board owner if the supervisor is the owner); at 150% the board owner. Each level is written to the room and the card once; there is no pause. | `sweep()` runs on load and every minute |
| A photo is not proof | Evidence is checked: taken **after** the report; not the "before" picture (same message, or a near-identical image by a 64-bit average hash); not used on another card (hash too); for the priority you choose, **taken in the app now** (gallery pictures and files do not count); **position** against the site fence from Sites: outside the fence, or no position, is a flag (sent to spot-check) or a refusal. | `proofOf`, `validateClosure` |
| The crawler cannot read every language | **Tap-driven report**: eleven tiles with an icon and Chinese, English, Tamil and Bengali labels, no typing; it creates a card straight from the type. Messages the rules cannot read (other scripts, voice or video without text) are **held for a person** in the review list, never silently dropped. A rule hit in an uncovered script carries low confidence ("please check"). `setModel(fn)` plugs in a real model: held messages go to it and its answer becomes a card marked "model". | `reportHazard`, `_holdReason`, `triage`, `resolveHeld`, `setModel` |
| Tags are a free pass | **Hourly limit per person** (default 3 cards). Over the limit the message is kept and held for review, except Critical safety reports from a person without two invalid reports this week. A manager can mark a card **not valid** with a reason; it closes without evidence or points and counts in the reporter's record. | `_holdReason`, `rejectCard` |
| Rewards can be gamed | Points need evidence, are **capped per person per 7 days** (default 2), are refused when the same reporter and closer pair repeats more than twice in 30 days or the reporter had 3 invalid reports in 30 days, and a **spot-check** by a second person (not the closer, not the reporter) is required for flagged closings and a sample (default 25%). A failed check reopens the card and takes the points back as far as the wallet still holds them. | `_confirm`, `_spot`, `spotCheck` |
| Two systems for one hazard | A **Critical safety card open at a site puts that site's permits on hold**: they cannot be approved or started and resume when the card is closed. The permit page shows the card and a link. Switchable. | `permitHoldCards`, `ptw.hold()` |
| Roles are guessed | **Appointments** (above). A safety officer whose certificate lapses is suspended automatically; an appointed officer can only close cards in the project and site of the appointment. | `appoint`, `apptStatus`, `closeBlock` |
| No success measure | **Results** tab: the median hours from a Critical report to an evidenced closing against the target (the Critical time allowed), the 90th percentile, share closed in time, share with evidence, a 14-day trend, late and unowned cards, minutes to a named owner, invalid and spot-check rates, by room and by owner. The digest carries the same number. | `metrics` |

Every check here is run by the browser in the prototype. A real backend must repeat them on the server: it alone can trust the time a photo was taken, where it was taken, and who pressed the button.

## 5c. The conversation layer (`js/kchat/social.js`, `ui.js`, `emoji.js`)

| Feature | How it works |
|---|---|
| Reactions | Long-press (or right-click) a message: a row of six quick emoji (your three most recent, then 👍 ✅ ❤️ 😂 😮 🙏) and **＋** for the full library (nine groups, about 600 emoji). One reaction per person per message; tap your own chip to take it back. |
| Reply | Swipe a message to the left past the arrow, or long-press → Reply. The reply shows a quote of the original (tap it to jump there). The original must be in the same room. |
| Message menu | Long-press: Reply, Forward, **Pin** (supervisors, safety officers and the owner), **Star** (everyone), Copy. |
| Forward | To up to 5 rooms you belong to. The copy says "Forwarded" and keeps the original sender. A forwarded picture is **never offered as closing evidence**, and a forwarded message never makes a card. |
| Pin | At most 3 pinned messages per room, shown in a bar above the chat. Pinning leaves a notice in the room. |
| Star | A personal bookmark list (**My stars**, the star button on the room list) that works as action items: tick them off. Only you see it. |
| Profile | Tap a name. Everyone sees trade, employer, project and site, rooms, appointments and valid certificate names. Managers also see phone, today's attendance, certificate numbers and expiry, and the person's record (reports, invalid reports, open cards owned, points). |
| Photo markup | Open any picture (chat, notice, closing evidence), tap **Mark up**, scribble (6 colours, 3 widths, undo, clear), save. The scribble is a separate transparent layer with an author and a time; **the original is never changed**, so evidence stays evidence. Up to 5 layers per picture; you can remove your own; the owner can remove any. |
| Timemark camera | Pictures taken with the in-app camera get a stamp with project title, time, date, address, optional coordinates, the photographer, construction content, and a **photo code** that is a checksum of person, time, room and position. Four templates (site report, compact strip, time only, full details), five colours, a field switch each. Settings: on/off, template, colour, title, fields, "workers may switch it off / change template", and **"closing evidence must carry the timemark"**. A picture whose code does not match its time or position is shown as a mismatch and its closing goes to spot-check. Gallery pictures are never stamped. |
| Tap report | A **#Safety #Progress #Quality #Material** filter (several can be on), and three views: **Pinned** (chosen by the administrator in Settings, up to 6, shown first), **Most used** (the project's issues of the last 30 days, with counts) and **All**. |

Not built: a live camera preview with the stamp (the prototype stamps the picture the phone's camera app returns), weather, altitude and compass fields, custom issue types, administrator-defined stamp logos, search inside the emoji library.

## 6. Not built
Trusted time and location of photos (the prototype takes them from the browser; the "Where am I" switch stands in for GPS), AI comparison of the before and after pictures, a real language model behind `setModel`, push notifications for escalations, voice/video storage and playback, push notifications, read receipts from real recipients (ticks are simulated), message edit/delete, reply-to, groups of unlimited members, real translation, the specification's separate user CRUD (replaced by the personnel record), and a card detail history view (the history is stored).
