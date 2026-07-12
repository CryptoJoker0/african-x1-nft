---
name: Supabase env var source of truth
description: Where this project's Supabase env vars live and why a committed .env file caused a project mismatch.
---

This project's Supabase URL/keys are defined in `.replit`'s `[userenv.shared]` block, not in a
local `.env` file. A GitHub-imported copy of this repo carried a stale, committed `.env` pointing
at an older Supabase project (`yftokrdaluslbvvixukh`) that conflicted with the correct one
(`loerakigzqdromadabnm`) already set in `.replit`.

**Why:** two Supabase projects' credentials mixed together silently break auth/DB calls with no
obvious error — the anon key won't match the project URL. `.env` files survive git import even
when they shouldn't be committed, so a re-import can reintroduce stale values.

**How to apply:** if Supabase (or similar) auth/DB calls behave oddly after a re-import, check for
a committed `.env` that disagrees with `.replit`'s `userenv.shared`. Prefer deleting the redundant
`.env` over editing it — the edit tool blocks direct `.env` writes anyway.
