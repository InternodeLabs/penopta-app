# Architecture

Penopta is a Next.js App Router app. Auth is delegated to Internode. App data
lives in Postgres via Drizzle (not a specialized versioned database).

This architecture intentionally mirrors Skillbase: same portal PKCE consumer
pattern, same local Docker / prod Neon split, same Drizzle driver selection.

## Schema

```
project
───────
id (uuid, URL id)
slug (unique)
name
summary
owner_user_id (portal id)
visibility: public | private
created_at
updated_at

user_api_key
───────────
id (uuid)
owner_user_id (portal id)
key (unique opaque secret)
expires_at
created_at

agent_sync_run
──────────────
id (uuid)
owner_user_id (portal id)
schema_version, agent_id, run_id
window_start / window_end
agent_name / agent_model / agent_effort
capture_coverage (jsonb), run_summary (jsonb)
created_at
unique (owner_user_id, run_id)

agent_thread
────────────
id (uuid)
owner_user_id + thread_id (unique, stable agent id)
title, kind, status, project_context
source_activity / working_state (jsonb)
last_agent_* facets + last_run_id / last_synced_at

agent_thread_snapshot
─────────────────────
per-run copy of a thread (history), FK → agent_sync_run
```

Defined in `src/lib/db/schema.ts`. Queried via `src/lib/projects/data.ts` and
`src/lib/keys/data.ts`. Ingest via `src/lib/ingest/`.

One active (non-expired) key per user. Users can **re-mint** (invalidate + new
key) or **invalidate** anytime. Mint appends `key=…` to the Skillbase skill URL
on the integrations setup pages. External apps can resolve the portal user with
`resolveUserIdByApiKey` (expired/invalidated keys do not match).

### Agent sync ingest

`POST /api/v1/agent-sync` accepts windowed thread-context payloads from external
agents. Auth is `Authorization: Bearer <user_api_key>`; the body field
`penopta_user_id` must match the key’s owner. Each `runId` is ingested once
(duplicate → 200). Threads are upserted for current-state reads; snapshots keep
per-run history for facets like agent/model over time.

### Reads

- All project routes require a session. Logged-out users are sent to sign-in.
- Visible if `visibility = 'public'` **or** `owner_user_id = viewer` (sharing later).
- URL param `/projects/[id]` accepts the project UUID (or slug).

## Hosting split

| Env        | DB                         | Config                          |
| ---------- | -------------------------- | ------------------------------- |
| Local      | Docker Postgres (`5434`)   | `.env.local` → `DATABASE_URL`   |
| Production | Neon (Vercel Marketplace)  | Vercel Production env only      |

No Preview/stage Neon branch for this phase. Local never uses Neon for day-to-day
dev. The Neon integration injects many aliases; only `DATABASE_URL` is required.

`src/lib/db/client.ts` picks the driver: `*.neon.tech` → Neon HTTP; otherwise
`node-postgres` for Docker TCP.

### Common commands

```bash
npm run db:up        # docker compose up -d
npm run db:migrate   # apply drizzle migrations (loads .env.local)
npm run db:seed      # idempotent sample project
npm run db:generate  # after schema edits
```

Production migrate/seed: run once against the Neon `DATABASE_URL` (e.g. from the
dashboard or a one-off local env that points at Neon). Do not bake that into
`.env.local`.

## Auth (web PKCE)

Same flow as Skillbase:

1. `GET /api/auth/login` — stash verifier/state cookies, redirect to portal
   `/api/auth/web/start`.
2. Portal signs the user in, redirects back with `?code=&state=`.
3. `GET /api/auth/callback` — exchange code for `{ apiToken, expiresAt, user }`,
   store in a signed httpOnly session cookie.
4. `/` is sign-in when logged out. Continue CTAs go to `/authenticating?returnTo=…`,
   which pauses briefly then continues to `/api/auth/login?returnTo=…`. `/login`
   only forwards callback errors onto `/?error=…`.

Portal allowlist must include this app’s callback origin (local `3200` and the
production hostname).

## Project map

```
src/
  app/
    api/auth/{login,callback,logout}/route.ts
    api/v1/agent-sync/route.ts     # Bearer-key agent thread ingest
    login/page.tsx                 # forwards auth errors to `/?error=`
    authenticating/page.tsx        # brief pause before PKCE login
    page.tsx                       # sign-in (logged out) / workspace (logged in)
    integrations/page.tsx          # connect agents (auth required)
    projects/[id]/page.tsx         # project detail (auth required)
  lib/
    auth/                          # session, PKCE, portal config
    db/                            # client, schema, seed
    keys/                          # user API key mint / resolve
    ingest/                        # agent-sync validate + persist
    projects/data.ts               # visibility-aware reads
docker-compose.yml                 # local Postgres
drizzle/                           # SQL migrations
```
