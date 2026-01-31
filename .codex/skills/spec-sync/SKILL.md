---
name: spec-sync
description: Use when behavior or API changes require updating documentation or specs.
---
# Goal
Keep product docs and API specs consistent with code changes.

# Do
- Update relevant files in `spec/` for product behavior changes.
- Update the root `openapi.yaml` when API shapes, endpoints, or examples change.
- Keep examples aligned with actual request/response payloads.

# Don't
- Leave docs/specs stale after changing behavior.

# Examples
- "Add a new endpoint and update `openapi.yaml`."
- "Change debate flow and update the related spec in `spec/`."
