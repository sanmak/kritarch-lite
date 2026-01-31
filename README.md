# Kritarch Lite — AI Jury

Kritarch Lite is a real‑time AI adjudication system where multiple AI agents debate, critique each other, and converge on a consensus verdict to reduce hallucinations.

## Live demo
https://kritarch-lite-production.up.railway.app/

## Name and pronunciation
- Pronounced: "KRIT-ark lite".
- Meaning in this project: critique-led adjudication where answers are governed by structured debate, revision, and consensus.

## Tech stack
- Next.js (App Router), Tailwind
- OpenAI Agents SDK + Zod structured outputs
- SSE streaming API
- Dockerized for Railway deployment

## Requirements
- Node.js >= 22

## Environment
Copy the sample file and fill in your values:
```bash
cp .env.example .env
```

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.2
OPENAI_BASELINE_MODEL=gpt-5-mini
LOG_LEVEL=debug
LOG_SAMPLE_RATE=1
LOG_TRUNCATE_LENGTH=200
```

## Model policy (quality-first)
- **Jurors + Chief Justice + Evaluator:** `gpt-5.2`
- **Baseline single model:** `gpt-5-mini`
- Sampling params (like `temperature`) are only sent when the model supports them.

## Codex memory
`spec/KRITARCH_LITE_BUILD_PLAN.md` acts as project memory for Codex. Keep it current and concise so Codex can stay aligned across sessions.

## Config validation
Runtime configuration is validated at startup using Zod. Missing or invalid
variables will cause the server to fail fast with a clear error. Use
`.env.example` as the baseline for required keys.

## Run locally
```bash
npm install
npm run dev
```

## Run with Docker
```bash
docker build -t kritarch-lite .
docker run -p 3000:3000 -e OPENAI_API_KEY=... kritarch-lite
```

## API
- `GET /api/health` → `{ "status": "ok" }`
- `POST /api/debate` → `text/event-stream` SSE
- `GET /api/samples` → sample prompts (16 total, 4 per domain)

Example:
```bash
curl -N -X POST http://localhost:3000/api/debate \
  -H "Content-Type: application/json" \
  -d '{"query":"Should a fund manager increase NVIDIA exposure given AI regulation uncertainty?","domain":"finance"}'
```

Sample prompts:
```bash
curl http://localhost:3000/api/samples
```

## Security scaffolds
- Strict input validation via Zod
- Basic in‑memory rate limiting per IP
- Security headers applied on all routes
- No secrets exposed to the client

## Railway deployment (Docker)
1. Connect repo in Railway
2. Select Dockerfile deploy
3. Set env vars: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASELINE_MODEL`

## Demo steps
1. Choose a domain (Finance/Healthcare/Legal/General)
2. Enter a question and click **Start Debate**
3. Watch Round 1–3 stream live
4. Review the Jury Verdict + Comparison panel with evaluator scores

## Suggested demo prompt
Legal: "Should AI-generated content be completely banned from use as evidence in US courtrooms?"
