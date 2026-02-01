# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the primary Next.js App Router UI, including `app/page.tsx`, `app/layout.tsx`, and API routes under `app/api/*`.
- `public/` holds static assets served by Next.js.
- `spec/` includes product documentation; the API spec lives at the repo root in `openapi.yaml`.
- Root configs such as `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, and `postcss.config.mjs` apply to the primary app.

## Build, Test, and Development Commands
- `npm install` installs dependencies (Node.js >= 22 required).
- `npm run dev` starts the primary app at `http://localhost:3000`.
- `npm run build` creates a production build for the primary app.
- `npm run start` runs the production build locally.
- `npm run lint` runs ESLint.

## Coding Style & Naming Conventions
- Use TypeScript + React with the Next.js App Router.
- Follow existing formatting: 2-space indentation, double quotes, and semicolons as seen in `app/**/*.tsx`.
- CSS is authored via Tailwind utility classes in JSX; global styles live in `app/globals.css`.
- Keep component/file names descriptive and in `PascalCase` for components (for example, `DebatePanel.tsx`).

## Testing Guidelines
- Tests use **Vitest** (`npm run test`), with `test:watch` for local iteration.
- If you add tests, prefer `__tests__/` folders or `*.test.ts(x)` naming.
- When you add or change features, update or add tests in the same PR so the contract stays current.

## Agent Instructions
- This repo configures the OpenAI developer docs MCP server in `.codex/config.toml`.
- Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex, or related docs without me having to explicitly ask.
- After any code change, run `npm run lint` unless the user explicitly says not to.

## Model Policy & Defaults
- Quality-first defaults: `OPENAI_MODEL=gpt-5.2`, `OPENAI_BASELINE_MODEL=gpt-5-mini`.
- Jurors, Chief Justice, and Evaluator use `OPENAI_MODEL`; the Baseline uses `OPENAI_BASELINE_MODEL`.
- If model policy changes, update `README.md`, `.env.example`, `spec/` docs, and `spec/KRITARCH_LITE_BUILD_PLAN.md` so project memory stays consistent.

## Commit & Pull Request Guidelines
- Use Conventional Commits strictly: `type(scope): subject`.
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Use lowercase scope matching the area (`app`, `api`, `spec`, `deps`).
- Examples: `feat(app): add debate status badge`, `fix(api): handle missing domain`, `docs(spec): clarify api schema`.
- PRs should describe intent, link relevant specs from `spec/`, and include UI screenshots or recordings for user-facing changes.

## Configuration & Security Notes
- API routes live under `app/api/*`; keep secrets in environment variables (not committed) and document required keys in the PR.
- Safety guardrails for `/api/debate` include prompt-injection heuristics, moderation checks (fail-closed), and output redaction; update `openapi.yaml` and tests when they change.
