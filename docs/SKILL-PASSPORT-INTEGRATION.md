# Skill Passport: joining it to the EZJOB site

The phone app's *技能护照 / Skill Passport* copies the look and the five-step editor of the EZJOB Skill Passport (from the screenshots you shared; I have not seen that site's code). It is a mock on the BuildSync side: data lives in the browser (`bs_passport_proto_v1`, `js/passport/store.js`). This page says what each part would exchange when the two are joined.

## Who owns each field

| Field | Owner | Why |
|---|---|---|
| Name, country of origin, trades, assignment | **BuildSync** personnel record | the employer's master data; shown read-only in the editor |
| Certificates on the record (CSOC, work at height, welder…) | **BuildSync** | verified by the company; they show *Verified by your company* |
| Medical readiness (heavy lifting, audiometry) | **BuildSync** | recorded by the company's screening |
| Photo, bio, height, weight, blood type, colour-blindness answer | the **worker** | self-declared |
| Skills (sector → group → skill), total years, relocation, immediate start | the **worker** | self-declared |
| Video links, CV, extra certificates, work history | the **worker** | self-declared; extra certificates show *self-declared, not verified* |
| Profile integrity %, competency radar | the **passport site** | computed; the prototype uses a simple formula |

## Suggested exchange
```
GET  /api/passport/{workerRef}            full passport, with each field's source ("buildsync" | "worker")
PUT  /api/passport/{workerRef}            the worker's own fields only (the server rejects the others)
POST /api/passport/{workerRef}/certificates     a self-declared certificate, with the file
POST /api/passport/{workerRef}/sync       BuildSync pushes verified certificates, trades and medical results
GET  /api/passport/{workerRef}/share      a read-only link or PDF for an employer
```
- **Identity:** one worker reference joins the two sites (the prototype uses the staff number). Sign-in should be single sign-on; the prototype has no sign-in.
- **Verified certificates:** BuildSync publishes `cert.updated` events (the event bus already carries them) and the passport site stores them as verified. A certificate the worker adds stays self-declared until a company verifies it.
- **Files:** the prototype stores only the file name and size of the CV and certificate scans. The real site stores the files (2 MB limit as in the editor).
- **Skill taxonomy:** the prototype's sectors and skills (`TAX` in the store) are a starting list matching the five sectors in the EZJOB editor (Building & Construction; Process, Marine & Chemical; Semiconductor & Electronics; Power Generation & Utilities; Soft Skills & Computer Literacy). Replace it with the live site's list; the editor reads whatever it is given.
- **Videos:** only links from YouTube, TikTok, Instagram and Facebook over https are accepted, as in the editor's tip. Nothing is uploaded.

## What is deliberately not here
Employer-side search and matching, PDF export, the employer view (*I'm an employer* tab), sharing analytics, and the AI competency model.
