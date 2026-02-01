# Kritarch Lite — Final Spec (Product + Engineering + Backend + Frontend + DevOps)

**Status:** Final baseline spec for implementation
**Last updated:** 2026-02-01
**Owner:** Sanket

---

## 1) Product

### One‑liner
“Watch AI models debate, critique, and reach consensus to reduce hallucinations.”

### Target track
**Multi‑Agent Systems & Workflows** (purposeful coordination: debate → critique → consensus).

### Core user flow (must be demo‑complete)
1. Select domain (Finance / Healthcare / Legal / General)
2. Enter question
3. **Round 1**: Parallel juror positions (streaming)
4. **Round 2**: Parallel critiques
5. **Round 3**: Parallel revisions
6. **Verdict**: Chief Justice synthesis
7. **Comparison**: Baselines vs Jury (fairness + efficiency context)

### Goals
- Demonstrate measurable improvement vs selected-model baseline (qualitative in demo, quantitative if time permits).
- Real‑time visibility of multi‑agent coordination.
- Polished, stable demo in < 2 minutes.

### Non‑goals (hackathon scope)
- Auth, multi‑tenant storage, billing
- External web search (optional later)

---

## 2) Engineering Principles

- **LTS‑only stack**: Node.js LTS, latest stable Next.js, and stable versions of deps.
- **12‑Factor compliant**: config via env vars, stateless processes, logs to stdout, Docker‑first.
- **OWASP‑aligned**: input validation, least privilege, secrets server‑only, safe error handling.
- **Fail‑safe demo**: graceful fallback if streaming fails.
- **Logging discipline**: structured logs in dev and prod; no secrets in logs; correlate requests with IDs.

---

## 3) System Architecture

### Stack
- **Frontend**: Next.js (App Router), Tailwind, shadcn/ui
- **Backend**: Next.js API routes (SSE)
- **AI Orchestration**: OpenAI Agents SDK
- **Schemas**: Zod
- **Deploy**: Docker → Railway
- **Client persistence**: LocalStorage or IndexedDB for debate history (no server DB for demo)

### Model policy (quality-first default)
- **Jurors + Chief Justice + Evaluator:** selected model (`gpt-5.2` default, `gpt-5-mini` optional)
- **Baseline (selected model, fairness):** matches selected model
- **Baseline (alternate model):** the other model (`gpt-5.2` <-> `gpt-5-mini`)
- Defaults controlled via env vars: `OPENAI_MODEL`, `OPENAI_BASELINE_MODEL`.

### Runtime data flow
- Client sends question + domain to `/api/debate` (POST)
- Server streams SSE events for phases + deltas
- Client renders streaming juror content and structured results

---

## 4) Backend Specification

### API: `POST /api/debate`
**Request:**
```json
{ "query": "string", "domain": "finance|healthcare|legal|general", "model": "gpt-5.2|gpt-5-mini" }
```

**Safety guardrails:**
- Preflight prompt-injection heuristics + moderation gate (fail-closed when moderation is unavailable). Unsafe requests return **403**/**503** with a safe error.
- Output safety pass screens structured rounds (positions/critiques/rebuttals/revisions/verdict/evaluation) and redacts unsafe content before streaming.

**SSE Events (ordered):**
- `phase`: `baseline | positions | critique | rebuttal | revision | verdict | complete`
- `baseline_mini`: single‑model output (alternate model)
- `baseline_fair`: single‑model output (selected model)
- `juror_delta`: streaming text per juror
- `positions_complete`: structured positions
- `critiques_complete`: structured critiques
- `rebuttal_delta`: streaming rebuttal text (deep deliberation only)
- `rebuttals_complete`: structured rebuttals
- `revisions_complete`: structured revisions
- `verdict`: structured consensus verdict
- `evaluation`: evaluator scorecard comparing jury vs selected-model baseline
- `usage`: token + cost snapshots per agent
- `coordination`: agreement + skip/deep-deliberation decision
- `complete`: debate finished
- `error`: sanitized error message

### Debate orchestration
- **Round 0**: Baselines (selected model + alternate model) in parallel
- **Round 1**: 3 jurors parallel (streaming)
- **Round 2**: critiques in parallel
- **Round 2.5**: rebuttals in parallel (deep deliberation only)
- **Round 3**: revisions in parallel
- **Verdict**: Chief Justice synthesis

### Structured outputs
All agent outputs are validated with Zod.

---

## 5) Frontend Specification

### Pages
- `app/page.tsx` (single‑page app)

### Components
- Domain selector cards (4)
- Question input + example prompt
- Round progress stepper
- Juror panels (streaming)
- Verdict panel (agreement/confidence)
- Comparison panel (baselines vs jury + evaluator scorecard)

### UX requirements
- Streaming cursor indicator
- Round transitions visibly marked
- Elapsed time
- Responsive layout (stacked on mobile)
- Debate history view (local-only) with ability to revisit past debates

---

## 6) Security & OWASP Controls

- Validate input with Zod
- Safety guardrails: prompt-injection heuristics + moderation gate (fail-closed) + output redaction across all structured rounds
- Sanitize error responses (no stack traces)
- Rate limit per IP (in‑memory baseline)
- Server‑only secret usage (`OPENAI_API_KEY`)
- Secure headers (CSP, X‑Frame‑Options, etc.)

---

## 7) 12‑Factor Compliance

- Config via env vars: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASELINE_MODEL`, `NODE_ENV`, `PORT`
- Logs to stdout (JSON)
- Stateless process (no DB for demo)
- Dockerized build & run

---

## 11) Logging & Observability

### Development logging
- Emit structured JSON logs for all API routes.
- Include `requestId`, `route`, `phase`, and durations.
- Log agent milestones: baseline start/end, each round start/end, verdict start/end.
- Log validation errors with safe summaries (no sensitive content).
- Use middleware to inject `X-Request-Id` and a request start timestamp for consistent correlation.

### Production logging
- Log to stdout/stderr only (Railway captures).
- Redact user inputs longer than a small max length (avoid leaking sensitive data).
- Include a stable `requestId` in every log entry for correlation.
- Capture error details without stack traces in responses (stack traces are okay in logs).
- Add `Server-Timing` headers where applicable for quick latency inspection.

---

## 8) Docker + Railway

### Docker requirements
- Multi‑stage build
- Node LTS base image
- Non‑root runtime user
- `PORT` env for Railway

### Railway deployment
- Deploy from Dockerfile
- Set env vars in Railway UI
- Optional healthcheck: `/api/health`

---

## 9) Repo Structure

```
app/
  api/debate/route.ts
  api/health/route.ts
  layout.tsx
  page.tsx
components/
  domain-selector.tsx
  debate-input.tsx
  round-progress.tsx
  juror-panel.tsx
  verdict-panel.tsx
  comparison-panel.tsx
  confidence-bar.tsx
  critique-card.tsx
lib/
  agents/
    jurors.ts
    chief-justice.ts
    schemas.ts
  debate-engine.ts
  types.ts
  security/
    rate-limit.ts
    headers.ts
public/
  logo.svg
openapi.yaml
Dockerfile
README.md
```

---

## 10) Demo deliverables
- README with what it does, how to run, demo steps
- 500‑char project write‑up
- 500‑char OpenAI usage write‑up
- 2‑minute demo video
- Railway deployment URL

---

## 12) Debate History (Client‑Only)

- Store completed debates in LocalStorage or IndexedDB (client‑only).
- Schema includes: timestamp, domain, query, baselineFair, baselineMini, positions, critiques, rebuttals, revisions, verdict.
- Provide a lightweight history panel to list and reload past debates.
- Keep data size bounded (e.g., last 10–20 debates).

---

## 13) Intelligent Model Routing

- Route queries by domain/complexity to an appropriate model tier.
- Example policy:
  - Finance/Legal → higher‑end model
  - General/simple → cost‑effective model
- Routing can be a simple heuristic (keyword + domain) for hackathon, with upgrade to classifier later.
