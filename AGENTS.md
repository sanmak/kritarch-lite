# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the primary Next.js App Router UI, including `app/page.tsx`, `app/layout.tsx`, and API routes under `app/api/*`.
- `public/` holds static assets served by Next.js.
- `spec/` includes product and API documentation (for example, `spec/openapi.yaml`).
- `web/` is a secondary Next.js app with its own `package.json` and `app/` directory.
- Root configs such as `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, and `postcss.config.mjs` apply to the primary app.

## Build, Test, and Development Commands
- `npm install` installs dependencies (Node.js >= 22 required).
- `npm run dev` starts the primary app at `http://localhost:3000`.
- `npm run build` creates a production build for the primary app.
- `npm run start` runs the production build locally.
- `npm run lint` runs ESLint.
- For the secondary app: `cd web && npm install`, then `npm run dev|build|start|lint`.

## Coding Style & Naming Conventions
- Use TypeScript + React with the Next.js App Router.
- Follow existing formatting: 2-space indentation, double quotes, and semicolons as seen in `app/**/*.tsx`.
- CSS is authored via Tailwind utility classes in JSX; global styles live in `app/globals.css`.
- Keep component/file names descriptive and in `PascalCase` for components (for example, `DebatePanel.tsx`).

## Testing Guidelines
- No automated test runner is configured in this repository.
- If you add tests, prefer `__tests__/` folders or `*.test.ts(x)` naming and document the runner you introduce in this file.

## Commit & Pull Request Guidelines
- Use Conventional Commits strictly: `type(scope): subject`.
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Use lowercase scope matching the area (`app`, `api`, `web`, `spec`, `deps`).
- Examples: `feat(app): add debate status badge`, `fix(api): handle missing domain`, `docs(spec): clarify api schema`.
- PRs should describe intent, link relevant specs from `spec/`, and include UI screenshots or recordings for user-facing changes.

## Configuration & Security Notes
- API routes live under `app/api/*`; keep secrets in environment variables (not committed) and document required keys in the PR.
