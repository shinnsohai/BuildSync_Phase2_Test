# Training hub: API contract for a real backend

The prototype is static: `js/train/store.js` reads `data/atlas.js` (a snapshot of the Course Atlas site) and keeps enrolment requests in the browser's localStorage. This page lists what a server has to provide so that file can be replaced by HTTP calls without changing the admin or phone screens. Names match the store's methods.

All times are Singapore time, dates are `YYYY-MM-DD`. Every response is JSON. Errors are `{ "ok": false, "error": "<code>" }` or `{ "ok": false, "errors": { "<field>": "<code>" } }`; the codes are the ones the store returns today (see "Error codes").

## 1. Course data (read-only, from Course Atlas)

Course Atlas publishes static files, not an API: `data/courses.json`, `locations.json`, `providers.json`, `metadata.json`. The server has two choices; the screens do not care which.

| Option | How |
|---|---|
| **A. Mirror the files** | A nightly job downloads the four files, runs the same filters as `tools/import-atlas.py` and stores intakes, courses, providers and locations in a database. |
| **B. Ask the site's owner for an API** | Same shapes as below, served live. |

### `GET /api/courses`
Query: `kw`, `lang`, `provider` (id), `locId`, `from`, `to`, `maxFee`, `certOnly=1`, `scope` (`construction` or `pcm`), `page`, `size`.
Returns courses (a course = intakes with the same cleaned title; courses that renew a worker certificate are merged across providers and languages) with their matching intakes:
```json
{ "courses": [ { "id": "cert:CSOC", "title": "Construction Safety Orientation Course (CSOC / AWSHCS)", "alias": "CSOC", "cert": "CSOC",
    "intakes": 751, "providers": 7, "feeMin": 65.78, "feeMax": 130.8, "next": "2026-11-01" } ], "total": 119 }
```
### `GET /api/courses/{id}/intakes`
Same filters. An intake:
```json
{ "id": "d2175fa38fca9f9a2a1ced06", "provider": 0, "title": "OPERATE BOOM LIFT", "dates": ["2026-11-01"], "time": "09:00–18:30",
  "venue": "Woodlands Loop #01-01b Room:B1", "locId": "wfa-woodlands", "language": "Chinese",
  "fee": 260, "gst": "excluded", "seatsReported": 5, "availability": "available",
  "bookingUrl": "https://…", "checkedAt": "2026-10-26", "type": "fresh", "scope": ["pcm", "construction"] }
```
`fee`, `locId` and `seatsReported` may be null: a fee the provider did not publish is **not** guessed. `seatsReported` is what the provider's page showed on `checkedAt`; it is not a reservation and the UI says so.
### `GET /api/intakes/{id}`
One intake, or 404 when the provider dropped it (the request screens keep the copy stored on the request).
### `GET /api/providers` and `GET /api/locations`
Providers: `{ id, name, frameworks[], site }`. Locations: `{ id, provider, name, address, lat, lng, basis }` where `basis` is `published_venue` or `provider_address`; OpenStreetMap contributors, ODbL, attribution must be shown.
### `GET /api/meta`
`{ source, generatedAt, checkedOn, first, last, records, recordsInAtlas, limitations[] }`. The UI warns when `last` is in the past.

## 2. A worker's own view (phone app)

All of these act for the signed-in worker; the server takes the worker from the session, never from the body.

### `GET /api/me/training/suggestions`
Courses that renew what the worker is missing or about to lose: a certificate expired, expiring within `horizon` days (default 90), or a required certificate never held. Each item: `{ cert, why: "expired" | "soon" | "missing", course, intake, count }`. The server picks `intake` by: the worker's language (derived from the country on file), a start at least two days away, a placed venue, a published fee, then the earliest date.
### `GET /api/me/training/shortlist` · `PUT /api/me/training/shortlist/{courseId}` · `DELETE …/{courseId}`
The worker's saved courses.
### `GET /api/me/training/requests`
Requests the worker asked for or is a trainee on, newest first, with `status`, `log[]` and (for `declined`) the reason.
### `POST /api/me/training/requests` (ask my employer)
Body `{ "intakeId": "…", "note": "" }`. Creates a request with status `asked`, `source: "worker"`, `trainees: [me]`, payment `direct`. Errors: `emp`, `intake`, `past`, `already` (one open ask per worker and course).
### `DELETE /api/me/training/requests/{id}`
Withdraw an `asked` request.
### `GET /api/me/accommodation`
`{ lease, dormitory, bed, site, shuttle, distanceKm }` or `{ lease: null }`. (The phone's *My bed* screen.)

## 3. Enrolment requests (employer and subcontractor)

A request keeps a **copy** of what it needs from the intake (title, provider, venue, dates, time, language, fee, booking URL, checkedAt) so it still reads correctly after the snapshot is replaced.

```json
{ "id": "TR-2026-0001", "intakeId": "…", "groupId": "cert:CSOC", "title": "…", "cert": "CSOC", "provider": "…", "venue": "…", "locId": "…",
  "dates": ["2026-11-03", "2026-11-04"], "start": "2026-11-03", "end": "2026-11-04", "time": "08:30–18:30", "lang": "English", "fee": 111.11, "bookingUrl": "https://…",
  "trainees": ["BS10110", "BS10114"], "status": "registered", "source": "admin", "askedBy": "", "requestedBy": "admin", "orgId": "", "payment": "direct",
  "override": null, "ref": "PROVIDER-REF-1", "note": "", "at": "2026-10-31 10:20", "results": [], "log": [ { "at": "…", "by": "…", "type": "requested", "note": "" } ] }
```
Status flow: `asked → requested → registered → confirmed → completed`; any of `asked/requested/registered/confirmed` can go to `cancelled` before the start (an `asked` one can also be `declined`).

| Call | Who | Does |
|---|---|---|
| `GET /api/training/requests?status=&kw=` | employer (data-scope filtered), subcontractor (own `orgId` only) | list |
| `GET /api/training/requests/{id}` | same | one, with the log |
| `POST /api/training/requests` | employer, subcontractor | `{ intakeId, trainees[], payment, override?, overrideNote? }` → `createRequest`: validates trainees (active, in scope, ≤10, no duplicates), payment (`direct` or `wallet`; wallet needs a published fee and enough course credit per trainee), runs the **conflict check**, spends wallet credit. |
| `POST …/{id}/approve` | employer with approve right | `{ payment, override?, overrideNote? }` for a `status: asked` request; re-checks clashes; spends credit; status → `requested` |
| `POST …/{id}/decline` | employer with approve right | `{ reason }` (required, ≤ 160 characters) for an `asked` request |
| `POST …/{id}/register` | employer, owning subcontractor | `{ ref? }` (≤ 60 characters): the registration was done on the provider's page; status → `registered` |
| `POST …/{id}/confirm` | employer | the provider confirmed; status → `confirmed` |
| `PUT …/{id}/trainees` | employer, owning subcontractor | swap or remove trainees on a request that has not started (refunds and re-spends wallet credit) |
| `POST …/{id}/cancel` | owner | before the start; refunds wallet credit |
| `POST …/{id}/complete` | employer | results arrive from the provider (the prototype simulates "everyone passed"); renews each trainee's certificate when the course has one; emits `training.completed` |
| `GET /api/training/conflicts` | employer, subcontractor | open requests with a leave, double-booking or permit clash |

### The conflict check
For each trainee and the intake's dates: approved or pending **leave** overlapping; another open request (`requested`, `registered`, `confirmed`) on an overlapping date (a **hard** clash, cannot be overridden); an approved or running **work permit** on one of the dates. Leave and permit clashes can be overridden in writing (≥ 10 characters) by an employer account with the approve right; the override is stored on the request and shown in the log.

### Certificate renewal on completion
`CSOC` 3 years, `WORK-HEIGHT` 2, `CRANE` 3, `WELDER` 2, counted from the completion date. The personnel service updates (or adds) the certificate; the compliance engine and permits re-evaluate.

### Events the server should publish
`training.asked`, `training.requested`, `training.declined`, `training.registered`, `training.confirmed`, `training.cancelled`, `training.completed` `{ id, groupId, certTypes[], empNos[], certified[] }`. The wallet service listens to `training.completed` (completion points and reversal of deductions whose corrective training names one of `certTypes`).

## 4. Error codes
`missing`, `state` (wrong status for this step), `emp`, `none`, `many`, `dup`, `intake`, `past`, `started`, `payment`, `wallet_nofee`, `wallet_short`, `overlap` (double booking), `clash` (needs an override), `denied` (no override right), `note` (reason or override grounds missing or too short), `note_len`, `ref_len`, `already`.

## 5. What the prototype keeps in the browser
Requests and each worker's shortlist (`bs_train_proto_v2`). Nothing else is written. Replacing `js/train/store.js` with calls to the endpoints above (keeping its method names) changes no screen.

## 6. Refreshing the data without a server
`python tools/import-atlas.py --fetch` downloads the four Course Atlas files, applies the filters (construction or PCM scope, or a title that matches a construction-site course) and rewrites `data/atlas.js`.
