---
name: Supabase migrations require manual apply
description: This project's Supabase instance has no DATABASE_URL/DB password available to the agent — new migration SQL must be applied by the user via the Supabase Dashboard SQL Editor.
---

Only `SUPABASE_SERVICE_ROLE_KEY` is available as a secret (works via PostgREST/service-role client for row-level reads/writes), not a raw Postgres connection string or password. There is no way for the agent to run DDL (`CREATE TABLE`, `ALTER TABLE`, etc.) directly against this Supabase project.

**Why:** Confirmed by checking available secrets and testing — no `DATABASE_URL` or DB password secret exists, only the service-role key, which authenticates through Supabase's REST API and cannot execute arbitrary SQL/DDL.

**How to apply:** Whenever a new migration file is added to `supabase/migrations/`, it is NOT auto-applied. Tell the user to copy its contents into the Supabase Dashboard → SQL Editor and run it manually, before the corresponding feature can work against the live database. After they confirm, verify success with a read query against the new tables/columns via the service-role client.
