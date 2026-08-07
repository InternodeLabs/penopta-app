# Penopta

A Vercel-ready Next.js (App Router) app. Authentication is **Better Auth**
(Google + Passkey). Organizations and product data live in Postgres.

See [`docs/architecture.md`](docs/architecture.md) for the schema and env split;
[`AGENTS.md`](AGENTS.md) for agent-facing rules.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Better Auth (Google OAuth + Passkeys)
- Postgres + Drizzle ORM (`pg` locally, Neon serverless on Vercel)
- Deployable to Vercel with Neon for production data

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:up                # start local Postgres (Docker, port 5434)
npm run db:migrate
npm run db:seed
npm run dev -- -p 3200
```

Open http://localhost:3200 — you’ll see Google / Passkey sign-in until you authenticate.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | yes | Better Auth secret (`openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | yes | Public app origin, e.g. `http://localhost:3200`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes (for Google) | Google OAuth web client. Redirect: `{BETTER_AUTH_URL}/api/auth/callback/google`. |
| `DATABASE_URL` | yes | Postgres URL. Local Docker or Neon. |
| `APP_URL` | no | Public origin for absolute links (defaults alongside `BETTER_AUTH_URL`). |
| `PASSKEY_RP_ID` | no | WebAuthn rpID (defaults to hostname of `BETTER_AUTH_URL`). |
| `DB_DRIVER` | no | Force `pg` or `neon`. Normally inferred from the host. |

## How auth works

1. Sign-in UI on `/` calls Better Auth (`/api/auth/*`) for Google OAuth or Passkey.
2. Sessions are Better Auth cookies; `getSession()` reads them on the server.
3. First Google sign-in for a known legacy email keeps the old Internode user UUID
   so existing org/project rows still match (`LEGACY_USER_IDS` in `src/lib/auth/auth.ts`).
4. After sign-in, use **Add a passkey** in the workspace header to register a passkey
   for next time.
5. `GET|POST /api/auth/logout` signs out and returns to `/`.

GitHub / Apple can be wired later via Better Auth `socialProviders`.

## Project structure

```
src/
  app/
    api/auth/[...all]/route.ts     # Better Auth handler
    api/auth/logout/route.ts       # sign-out convenience
    page.tsx                       # sign-in / logged-in workspace
    integrations/page.tsx
    projects/[id]/page.tsx
  components/                      # SignInCard, WorkspaceEmpty, …
  lib/auth/                        # Better Auth server + client + session
  lib/db/                          # Drizzle client, schema (incl. auth tables), seed
docker-compose.yml
drizzle/
docs/architecture.md
```

## Data

Projects are Postgres rows (`project`). Reads in `src/lib/projects/data.ts`
return rows the signed-in viewer may see. Seed with `npm run db:seed`.
