---
name: security-env
description: Use when adding config, credentials, external services, or environment variables.
---
# Goal
Keep secrets out of the repo and document required configuration safely.

# Do
- Store secrets in `.env` only; never commit real keys.
- Update `.env.example` with new variable names and defaults.
- Prefer server-only env usage for secrets (API routes, server components).
- Sanitize logs to avoid leaking tokens.

# Don't
- Commit secrets or embed keys in client code.

# Examples
- "Add a new API key and update `.env.example`."
- "Move client-only env usage to a server route."
