# Leave Check: connecting a real LLM

**Where it is today.** The Leave Check tab (请假核查) and the supervisor's phone card use `BS.leaveCheck` in `js/leave/check.js`. It is a *rule engine*, not a model: it works out the crew coverage with plain rules and writes the answer in the shape and wording an LLM would be asked to produce. The prototype is a static site, so it cannot call a model itself (a key in the page would be public).

**What to replace.** One function: `BS.leaveCheck.analyse(requestId, answers)`. Everything else (the tab, the phone card, the question buttons) only reads its result. `BS.leaveCheck.context(requestId)` already builds exactly what a model should receive; the tab's *查看 AI 收到的资料 / See what the AI receives* link shows it for each request.

## 1. Server endpoint

```
POST /api/leave-check
{ "requestId": "LV-20261101-007", "answers": { "cover:WELDER": "yes" } }
→ the analysis object below
```
The server loads the facts (the `context`), calls the model with the prompt in section 2, validates the JSON against the schema in section 3, and returns it. If the model fails or answers with something invalid, return the rule engine's result (same shape) so the supervisor always sees an answer.

## 2. What the model is given

`context(requestId)` returns:

| Field | Meaning |
|---|---|
| `task` | the instruction (below) |
| `request` | id, type (annual / sick / personal …), from, to, hours, the worker's reason, the worker as `{ ref, roles[], group }` |
| `crew` | everyone in the worker's attendance group: `ref`, `roles[]`, and for each day of the leave whether they are scheduled, on approved leave, or have a pending request |
| `minimumCover` | per role the project needs on site each day: `{ role, min, critical, work }` (for example a rigger for façade lifting) |
| `permits` | approved or running permits that list the worker on those days |
| `training` | training requests the worker is already on |

Names, ID numbers, phones and addresses are **never** sent: the worker and crew are referred to by staff reference only, and the reply is mapped back to names on the server.

System prompt:
> You help a construction supervisor in Singapore decide a leave request. Use only the facts given. For each role in `minimumCover`, work out for each day how many people would still be on site if this leave is approved (people scheduled that day, minus those on approved leave, minus this worker if they have the role). Say whether approving it leaves each role covered. Explain in one or two short sentences. Suggest cover only from people who are not in this worker's group, have the role, and are free those days. Ask the supervisor at most three short questions whose answers would change the decision. If dates must change, suggest the nearest dates. Sick leave is never "hold": ask about cover and handover instead. Do not decide: the supervisor decides. Reply with JSON only.

Ask for the answer in both languages if the product shows both, or translate on the server; the screens take `params`, not sentences, for everything except the one-line `summary`.

## 3. What the model returns (schema)

```json
{
  "level": "ok | watch | warn | block",
  "verdict": "approve | approve_note | approve_cover | cover | ask_move_or_cover | ask_move | hold | decline | nogroup | norestday",
  "summary": { "zh": "…", "en": "…" },
  "findings": [
    { "kind": "crew", "role": "RIGGER", "level": "block", "dates": ["2026-11-09","2026-11-10"], "left": 0, "min": 1, "work": "Tower A façade lifting" },
    { "kind": "permit", "id": "PTW-2026-042", "date": "2026-11-09", "level": "block" },
    { "kind": "training", "id": "TR-2026-0004", "from": "2026-11-09", "to": "2026-11-10", "level": "warn" }
  ],
  "cover": [ { "role": "WELDER", "ref": "BS09872", "reason": "free on those days; their own group keeps its minimum" } ],
  "questions": [ { "id": "cover:WELDER", "kind": "cover", "role": "WELDER", "ref": "BS09872", "dates": ["2026-11-09","2026-11-10"] },
                 { "id": "resched:RIGGER", "kind": "resched", "role": "RIGGER", "work": "Tower A façade lifting", "to": "2026-11-10" } ],
  "suggestDates": { "from": "2026-11-11", "to": "2026-11-12" }
}
```
Rules the server should enforce, whatever the model says:
- `level` is never lower than what the facts show (a critical role with nobody left is `block`).
- `cover` lists only people the server can confirm are free and fit to work (the prototype checks leave, pending leave, and the compliance engine).
- `suggestDates` must not overlap another request or approved leave of the same worker.
- The model cannot approve or reject; the decision stays in 请假审批.

## 4. Questions and answers
The supervisor answers each question *yes / no*; the tab sends the answers back and the verdict is recomputed (`cover:*` yes → ok with cover; `resched:*` yes → ask the worker to move the work; all no → decline). With a real model, send `answers` in the request and let it update the summary; keep the rule of section 3 for the level.

## 5. Minimum cover rules
The per-crew requirements (`RULES` in `check.js`, shown at the bottom of the tab) are samples. In production they come from the project: the work plan, lifting plans and permits decide how many riggers, welders, electricians or safety officers a crew needs on a day. Store them per group and role with `{ min, critical, work }`.

## 6. Privacy and audit
Keep every request and response (prompt, model, version, answer, who saw it) in the audit log. The assistant only advises; log the supervisor's decision separately.
