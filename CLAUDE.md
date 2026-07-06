# Learnor — Autonomous Course Engine

Learnor is a **ready, pre-built marketplace** of complete single-page reading courses, plus a "learn whatever you want" request flow. Claude autonomously stocks and restocks the shelf through one pipeline: **build → verify → Itish reviews → publish.** Nothing goes live without Itish's sign-off, and reading beats video — articles are ~2x faster and people drift less.

This repo carries the whole engine. This file tells a Claude Code session (or any operator) how it fits together and how to run THE LOOP.

## Where everything lives

| Piece | Location |
|---|---|
| Data model + launch catalog seed | `supabase-learnor.sql` (run in the Supabase SQL editor) |
| The pipeline (intake AI, worker, verification gate, approval gate, emails) | `learnor.mjs`, mounted at `/api/learnor` in `server.mjs` |
| Intake chat UI | `/request` → `src/pages/Request.tsx` |
| Course renderer (Notes · Quiz · Exercises + highlight-to-ask) | `/course/:slug` → `src/pages/Course.tsx` |
| Review page (Itish only) | `/admin/review` → `src/pages/AdminReview.tsx` |
| The shelf | `/browse` → `src/pages/Browse.tsx` |
| Headless loop wrapper | `learnor-worker.sh` |

Course *content* lives in Supabase (`courses.content` jsonb) — the repo can't be written at runtime on Vercel. A staged course renders only at its **unlisted preview URL** (`/course/<slug>?key=<preview_token>`) until approved.

## Environment variables

- `GEMINI_API_KEY` — generation + intake + verification.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — queue + content storage.
- `LEARNOR_ADMIN_TOKEN` — gates `/admin/review` API + signs review magic links. **Required in production.**
- `LEARNOR_WORKER_TOKEN` — gates `/api/learnor/worker/pass` (falls back to admin token).
- `RESEND_API_KEY`, `LEARNOR_FROM_EMAIL` — email; without a key, emails are logged to the server console instead of sent.
- `LEARNOR_REVIEW_EMAIL` — where review emails go (defaults to Itish's).
- `LEARNOR_SITE_URL` — used in preview/live links (defaults to https://www.learnor.io).

## Three entry points, one pipeline

1. **Seed catalog (launch priority).** `supabase-learnor.sql` loads 20 flagship end-to-end courses (Python, SQL, React, ML…) as `course_requests` rows with `built_by='itish'`. The loop grinds through them tier by tier.
2. **Queue-driven (long tail).** `/request` runs a 3–5 exchange AI intake conversation, then inserts a structured brief with `status='pending'`.
3. **Direct.** Itish says "build a course on X" → insert a row with a brief, same pipeline.

All three land in **`pending_review`** before going live. The approval gate applies to everything, catalog included.

## THE LOOP (one request per pass)

`POST /api/learnor/worker/pass` (bearer worker token) executes exactly one pass:

1. **CLAIM** — oldest `pending`/`changes_requested` row → `building` (stale `building` rows >30 min are auto-reset first). `changes_requested` rows carry `review_notes` — the rebuild honors them above everything.
2. **READ THE BRIEF** — build to the requester's brief + expectations, not a generic version of the topic. Thin brief → `needs_clarification` + flag Itish (catalog rows get the standard catalog brief).
3. **PLAN** — 5–12 sections, first principles → applied; quiz (6–10) and exercises (2–4) decided up front.
4. **GENERATE** — full single-page course in the Learnor design system (Notes/Quiz/Exercises), every abstract idea followed by a concrete example.
5. **VERIFY (hard gate)** — structural checks, skeptic fact-pass with corrections, expectations-fit judgment. Fail → `attempts+1`; `<3` retries as `pending`, `>=3` → `failed` + flag Itish.
6. **STAGE FOR REVIEW** — write content to `courses` (unpublished), set `pending_review` + `preview_url`, email Itish with signed Approve / Request-changes magic links. **STOP. Never publish, never email the requester.**

Guardrail: 3 consecutive build failures halt the loop (HTTP 423) until `{"resume": true}` is passed.

Run it continuously with `./learnor-worker.sh` against a long-lived server (local/Railway — a full pass exceeds Vercel's 60s function cap). Closing the editor loses nothing; all state is in `course_requests.status`.

## APPROVAL GATE (Itish only)

Via `/admin/review` (admin token, stored in localStorage) or the magic links in the review email:

- **Approve** → `approved` → `courses.published_at` set → `published` → READY email to the requester (with the 60/40 marketplace offer). Catalog rows skip the requester email.
- **Request changes** → notes saved to `review_notes`, status `changes_requested`, the loop rebuilds around the notes. No requester email.
- Requester replies "list it" → `POST /api/learnor/marketplace/:slug` flips `is_marketplace`.

## For a Claude Code session working here

- Keep the existing Learnor UI as-is — same theme tokens, serif/mono design system. This was a content + backend pivot, not a redesign.
- One pass at a time; the loop always stops at `pending_review` — that's the designed handoff, not an error.
- To run a pass manually: `curl -X POST -H "Authorization: Bearer $LEARNOR_WORKER_TOKEN" <base>/api/learnor/worker/pass`.
- Queue state: `curl <base>/api/learnor/health`.
- Stop conditions that pause instead of building: thin brief, unsafe/disallowed content, copyright-dependent topics, repeated failures.

**Launch = Tier 1 live on the shelf + one requested course completed end-to-end** (intake → pending → pending_review → approve → published → requester email). Resist polishing past it.
