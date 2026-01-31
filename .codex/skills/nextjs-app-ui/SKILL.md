---
name: nextjs-app-ui
description: Use when editing UI in `app/` or `components/` (layout, Tailwind classes, styling, or view logic).
---
# Goal
Keep the Next.js App Router UI consistent with existing layout, Tailwind patterns, and component structure.

# Do
- Prefer shared UI in `components/` and page composition in `app/`.
- Keep Tailwind utility usage consistent with nearby code (spacing, colors, typography).
- Validate responsive behavior for small and large screens.
- Preserve `"use client"` only where needed.

# Don't
- Introduce new UI libraries or global style changes without asking.

# Examples
- "Adjust hero layout in `app/page.tsx`."
- "Extract a reusable panel into `components/`."
