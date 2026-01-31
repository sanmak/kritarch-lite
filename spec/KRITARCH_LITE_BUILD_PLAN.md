# Kritarch Lite — Phase Plan (1–5) + Session Memory

**Last updated:** 2026-01-31
**Purpose:** Single source of truth for status, decisions, and next steps across sessions.

---

## How to use this file (Codex 2026 memory best‑practice)
- Update **Last updated** each session.
- Check off items as you complete them.
- Add a short entry to **Work Log** with what changed and where.
- Keep **Open Decisions** current.

---

## Phase 1 — Scaffold + Core API (CRITICAL)
**Outcome:** Next.js app runs locally + Docker builds + SSE endpoint streams mock events

- [x] Initialize Next.js app (App Router, Tailwind)
- [x] Add Dockerfile (multi‑stage, Node LTS)
- [x] Add `/api/health` endpoint
- [x] Add `/api/debate` SSE endpoint (mock events)
- [x] Basic UI shell in `app/page.tsx`
- [ ] Verify `npm run dev` and `docker run` work

---

## Phase 2 — Agents + Orchestration (CRITICAL)
**Outcome:** Debate engine runs with real OpenAI calls

- [x] Add Zod schemas in `lib/agents/schemas.ts`
- [x] Add juror agents + chief justice
- [x] Implement `lib/debate-engine.ts`
- [x] Wire `/api/debate` to real debate engine
- [x] Add env config validation
- [x] Add structured logging (dev + prod) with requestId + phase markers
- [x] Add middleware to inject request IDs and start timestamps
- [x] Adaptive coordination (agreement detection + conditional critique/revision)

---

## Phase 3 — Streaming UI (HIGH)
**Outcome:** End‑to‑end debate visible in browser

- [x] Stream juror deltas to panels
- [x] Round progress indicator
- [x] Verdict panel rendering
- [x] Error state + retry

---

## Phase 4 — Comparison + Polish (MEDIUM)
**Outcome:** “Money shot” demo ready

- [x] Comparison panel (single vs jury)
- [x] Hallucination flag UI
- [x] Example questions per domain
- [x] Animation polish (if time)
- [x] Client-side debate history (LocalStorage/IndexedDB)
- [x] Evaluator scorecard (baseline vs jury metrics)
- [x] Demo script updated with evaluator scorecard + candidate prompt
- [ ] Golden demo question locked (tested & repeatable)

---

## Phase 5 — Deploy + Submission (CRITICAL)
**Outcome:** Ready for judging

- [ ] Deploy to Railway (Docker)
- [ ] README finalized
- [ ] 500‑char write‑ups finalized
- [ ] 2‑minute demo video recorded

---

## Open Decisions
- [x] Final model choice for demo (quality-first: `gpt-5.2` jury/justice/evaluator, `gpt-5-mini` baseline)
- [ ] Hallucination flag heuristic (how to compute?)
- [ ] Final demo question
- [x] Debate history storage choice (LocalStorage)
- [x] Evaluator rubric (consistency/specificity/reasoning/coverage)
- [ ] Routing policy rules (domain/complexity thresholds)
- [x] Logging format (JSON schema fields: ts, level, message, requestId, route, method, phase, durationMs)

---

## Work Log
**2026-01-31**
- Added final spec and phase plan docs in `spec/`.
- Scaffolded Next.js app at repo root, added Dockerfile, SSE API routes, and UI shell.
- Attempted `npm install` at repo root; timed out. Node_modules partially created, no lockfile yet.
- Cleaned `node_modules` and completed `npm install` successfully.
- Wired Agents SDK + Zod schemas, added debate engine, security headers, and rate limiting scaffolds.
- Installed `@openai/agents`, `openai`, and `zod` dependencies.
- Added `/api/samples` endpoint with 12 hard demo questions (4 per domain).
- Implemented structured logging utility and added request/phase logs to API routes and debate engine.
- Added middleware to inject X-Request-Id and request start timestamp for correlation.
- Added runtime env validation module and wired it into `/api/debate`.
- Added fail-fast env validation (runtimeConfig), baseline model fallback, and logging env flags.
- Built Phase 3 streaming UI with round progress, juror panels, verdict panel, and error handling.
- Added critique and revision panels under each juror and the comparison panel.
- Added hallucination flags to comparison panel, sample prompts from `/api/samples`, and subtle round reveal transitions.
- Implemented client-side debate history using LocalStorage with quick reload from history cards.
- Updated plan status and open decisions to reflect current repo state.
- Added adaptive coordination with agreement detection and conditional rounds.
- Added evaluator scorecard to compare baseline vs jury answers.
- Updated demo script to include a specific finance prompt and evaluator scorecard.
- Refreshed README and 500-char writeups to include evaluator scorecard and demo prompt.
- Set model policy to `gpt-5.2` for jury/justice/evaluator and `gpt-5-mini` for baseline; documented across repo.

---

## Current Status
- **Phase 1:** In progress (needs dev + Docker run verification)
- **Phase 2:** Complete
- **Phase 3:** Complete
- **Phase 4:** In progress (golden demo question not locked)
- **Phase 5:** Not started
