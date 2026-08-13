# JobPilot — Personal AI Job-Search Assistant + Application Tracker

A real, working job-search assistant built around a **tested matching engine**. It
ingests jobs from legitimate sources, scores each one against your resume with a
transparent 0–100 breakdown, **never claims a skill you don't have**, and tracks
every application through your pipeline.

Built for Hanvita's search (Data/Product/Business Analyst & rotational new-grad
roles, Dec 2026 grad) and seeded with the real resume + the existing tracker.

---

## ✅ What's actually verified (not asserted)

The "brain" is framework-independent TypeScript and is **tested in `scripts/test-engine.ts`**
against the real resume. Run it yourself: `npm run test:engine`. It proves:

- **Resume parsing** — name, grad date (Dec 2026), skills, ~1.1 yrs experience extracted from the real PDF text.
- **No hallucination (the core rule)** — Tableau (on the resume) is marked present; **AWS/Snowflake (not on the resume) are marked absent and never appear as a strength** — only ever as a truthful gap. The cover-letter and resume-tailoring generators were separately tested to confirm they never fabricate a missing skill.
- **Hard filters** — a "Senior Data Scientist, 5+ years" role is filtered out for an early-career candidate.
- **Cross-source dedup** — the same Google role from LinkedIn + Greenhouse collapses to one job.

A full pipeline test also ran against **341 real jobs** pulled live from a public
GitHub new-grad list: 341 ingested → 329 after dedup → 24 senior roles filtered →
305 matched, with sensible top hits (Associate Data Analyst 98%, Data Analytics
Associate 96%). The GitHub connector is verified against the live repo format.

---

## Architecture

```
src/lib/                     the tested engine (no framework deps)
  types.ts                   domain types
  taxonomy.ts                skill synonyms + role families (semantic matching, no LLM needed)
  parseResume.ts             resume text -> structured profile
  matcher.ts                 hard filters + weighted 0–100 score + truthful keyword table
  dedup.ts                   canonical fingerprint + cross-source merge
  ai.ts                      AIProvider interface: DemoProvider (offline) + AnthropicProvider
  connectors/
    atsBoards.ts             Greenhouse + Lever public JSON APIs (real)
    github.ts                curated GitHub markdown lists (real) + honest manual stubs
app/                         Next.js 14 App Router (UI + API routes)
prisma/                      schema (SQLite default) + seed (real profile, demo jobs, your tracker)
scripts/                     test-engine.ts, ingest.ts (cron)
extension/                   one-click browser quick-add (the compliant LinkedIn alternative)
```

**Stack:** Next.js 14 + React 18 + Tailwind, Prisma + SQLite (swappable to Postgres/
Supabase), Recharts. AI is optional — with no key it uses a deterministic, truthful
demo provider so the whole app works offline.

---

## Quick start (local, ~2 minutes)

```bash
npm install
cp .env.example .env          # defaults to a local SQLite file — no edits needed
npm run setup                 # prisma generate + migrate + seed (real profile, demo jobs, your tracker)
npm run dev                   # http://localhost:3000
```

`npm run setup` seeds your parsed resume as the active profile, 8 clearly-labeled
DEMO jobs (with real match scores), and the 5 applications from your Google Sheet
(the 3 Capital One rotational roles w/ Praval referral, Bosch, OpenAI).

To pull **real** live jobs: open **Settings → Run ingestion now** (or `npm run ingest`).

> Note: `prisma generate` downloads a query-engine binary on first run. That's why
> the CI sandbox this was built in couldn't run it — but it works on any normal machine.

---

## What works with zero configuration

Resume upload & parsing · job matching with full breakdown · the job feed with
filters · save / dismiss / apply-tracking · the application tracker (add/edit/status/
CSV import + export) · skills-gap analysis · analytics charts · the AI assistant
(offline demo mode) · Greenhouse/Lever/GitHub ingestion · cover-letter & resume-
tailoring (offline demo mode) · the daily-digest payload endpoint.

## What needs credentials (all optional)

| Feature | Needs | Where |
|---|---|---|
| Free-form AI cover letters / assistant | `ANTHROPIC_API_KEY` | `.env` |
| 9 AM email digest | Gmail API OAuth creds | `.env` + deployed cron |
| SMS alerts | Twilio account | `.env` + deployed cron |
| Multi-user login | NextAuth + Google OAuth | `.env` |
| Hosted Postgres | Supabase / Postgres URL | `.env` + schema provider swap |

Without any of these the app is fully usable in single-user local/demo mode.

---

## Deploy (Vercel + Supabase)

1. In `prisma/schema.prisma` change `provider = "sqlite"` → `"postgresql"`.
2. Create a Supabase project; set `DATABASE_URL` to its Postgres connection string.
3. `npx prisma migrate deploy` against it.
4. Push to Vercel; add env vars from `.env.example`.
5. `vercel.json` already schedules hourly ingestion + a 9 AM digest. (A GitHub
   Action alternative is in `.github/workflows/ingest.yml`.)

---

## Configure this first (for Hanvita)

Everything is pre-seeded from your data, but review in **Settings**:
- **Target roles** — pre-filled (Data/Product/Business Analyst, rotational, AI analyst…).
- **Locations** — Princeton NJ + NYC; location filtering is OFF by default so you see nationwide roles.
- **Exclude senior roles** — ON. **Min match to show** — 55. **Alert threshold** — 85.
- Then **Resume** → confirm the parsed profile, and **Settings → Run ingestion** to fill the feed with live jobs.

---

## The honest limitation: LinkedIn / Indeed / Handshake

These have **no public jobs API**, and their Terms of Service prohibit scraping.
Building an auto-scraper would be brittle and against their ToS, so JobPilot does
**not** pretend to. Instead:

- **Legitimate auto-ingestion** works from Greenhouse & Lever public APIs (huge
  numbers of companies post there) and curated GitHub new-grad lists.
- For a LinkedIn/Indeed/Handshake posting, use the **browser quick-add extension**
  (`extension/`) — one click grabs the company/title/URL into your tracker while
  you're already on the page. This is the compliant equivalent of "import from LinkedIn."

---

## Recommended next features

1. **NextAuth Google login** to go multi-user (the schema is already per-user).
2. **Wire Gmail API + Twilio** for the 9 AM digest and ≥85% real-time alerts (payloads already built).
3. **More ATS connectors** — Ashby, Workday, SmartRecruiters (Bosch/OpenAI in your tracker use these) via their public endpoints.
4. **Interview prep** — auto-generate likely questions from a job's description + your matched experience.
5. **Referral graph** — surface which of your contacts (like Praval at Capital One) map to companies in your feed.
6. **Auto-close detection** — mark jobs closed when they disappear from source (schema field `closed` is ready).

---

## Scripts

```bash
npm run dev          # start the app
npm run setup        # generate + migrate + seed
npm run seed         # re-seed only
npm run ingest       # pull live jobs from all connectors (cron entrypoint)
npm run test:engine  # run the matching-engine test suite
npm run db:studio    # browse the database
```
