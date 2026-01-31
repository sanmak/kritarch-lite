---
name: api-route-contract
description: Use when adding or changing API routes under `app/api/*`.
---
# Goal
Preserve stable request/response contracts for Next.js API routes and streaming endpoints.

# Do
- Validate inputs and return clear error shapes.
- Keep response payloads consistent with existing routes and types.
- For streaming endpoints, preserve the current event format (`data: <json>\\n\\n`).
- Update `openapi.yaml` if the public API shape changes.

# Don't
- Change an API response format without updating docs and UI callers.

# Examples
- "Add a new route under `app/api/health`."
- "Change the `/api/debate` response payload."
