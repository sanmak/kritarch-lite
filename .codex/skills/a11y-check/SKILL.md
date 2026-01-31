---
name: a11y-check
description: Use when adding or changing UI, forms, or interactive elements.
---
# Goal
Keep UI accessible and keyboard-friendly.

# Do
- Ensure semantic elements are used (`button`, `label`, `nav`, `main`).
- Add accessible labels to inputs and interactive controls.
- Keep focus states visible and avoid `div`/`span` for clickable controls.
- Check contrast when introducing new colors.

# Don't
- Ship interactive UI without keyboard access or labels.

# Examples
- "Add a new form input and label it."
- "Replace a clickable div with a button."
