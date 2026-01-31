---
name: conventional-commits
description: Use when asked to craft commit messages or PR titles.
---
# Goal
Follow strict Conventional Commits for this repo.

# Do
- Format: `type(scope): subject`.
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Use lowercase scopes: `app`, `api`, `spec`, `deps`.
- Keep the subject imperative, short, and without a trailing period.
- When asked to generate a commit message, review staged changes (`git status -sb` and `git diff --staged`) and base the message on what is staged.
- If nothing is staged, ask the user to stage changes or provide a summary before proposing a message.

# Examples
- `feat(app): add debate status badge`
- `fix(api): handle missing domain`
