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
```

Defined in `src/lib/db/schema.ts`. Queried via `src/lib/projects/data.ts`.

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
    login/page.tsx                 # forwards auth errors to `/?error=`
    authenticating/page.tsx        # brief pause before PKCE login
    page.tsx                       # sign-in (logged out) / workspace (logged in)
    integrations/page.tsx          # connect agents (auth required)
    projects/[id]/page.tsx         # project detail (auth required)
  lib/
    auth/                          # session, PKCE, portal config
    db/                            # client, schema, seed
    projects/data.ts               # visibility-aware reads
docker-compose.yml                 # local Postgres
drizzle/                           # SQL migrations
```
