# Penopta

A Vercel-ready Next.js (App Router) app. Authentication is delegated to the
central **portal-frontend** (`internode`) auth authority — Penopta is a
*consumer*, exactly like Skillbase, the Chrome extension, and the iOS app. It
does not run its own identity provider.

Data lives in Postgres (Docker locally, Neon in production) via Drizzle ORM.
See [`docs/architecture.md`](docs/architecture.md) for the schema and env split;
[`AGENTS.md`](AGENTS.md) for agent-facing rules.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Postgres + Drizzle ORM (`pg` locally, Neon serverless on Vercel)
- Deployable to Vercel with Neon for production data

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:up                # start local Postgres (Docker, port 5434)
npm run db:migrate
npm run db:seed
npm run dev -- -p 3200       # 3200 if the portal owns 3000 / skillbase owns 3100
```

Open http://localhost:3200 — the project list is public. Sign in when you need
gated features.

> If the portal runs locally on port 3000, keep Penopta on 3200 and set
> `PORTAL_BASE_URL=http://localhost:3000`.

## Environment variables

| Variable          | Required | Description |
| ----------------- | -------- | ----------- |
| `PORTAL_BASE_URL` | yes      | Base URL of the portal central auth authority. |
| `SESSION_SECRET`  | yes      | Secret to sign the local session cookie (`openssl rand -base64 32`). |
| `DATABASE_URL`    | yes      | Postgres URL. Local: Docker (`…@localhost:5434/penopta`). Prod: Neon (set by Vercel). |
| `APP_URL`         | no       | Force this app's public origin for the OAuth `redirect_uri`. |
| `DB_DRIVER`       | no       | Force `pg` or `neon`. Normally inferred from the host. |

Local day-to-day work uses `.env.local` + Docker. Production uses Vercel’s
Production env only (no Preview/stage DB for now). Neon may inject many extra
`DATABASE_*` aliases — the app only needs `DATABASE_URL`.

## How auth works (web PKCE flow)

Penopta mirrors Skillbase / the Chrome extension's PKCE flow, adapted for the web:

1. `GET /api/auth/login` — generates a PKCE `code_verifier` + `state`, stores them
   in short-lived httpOnly cookies, and redirects to
   `PORTAL_BASE_URL/api/auth/web/start` with `redirect_uri`, `state`,
   `code_challenge`, and `code_challenge_method=S256`.
2. The **portal** authenticates the user via its own NextAuth session (redirecting
   to `/signin` if needed), mints a one-time auth code bound to the challenge, and
   redirects back to `redirect_uri` with `?code=&state=`.
3. `GET /api/auth/callback` — validates `state`, then POSTs
   `{ code, codeVerifier, redirectUri }` to `PORTAL_BASE_URL/api/auth/web/exchange`
   and receives `{ apiToken, expiresAt, user }`.
4. The `apiToken` + user are stored in a signed, httpOnly session cookie. Use it as
   `Authorization: Bearer <apiToken>` for portal API calls.
5. Browsing (`/` and `/projects/[id]`) is public. Auth is feature-gated.
6. `GET|POST /api/auth/logout` clears the session and returns to `/`.

### Portal-side integration required

The portal must expose a **web** redirect flow (allowlisted origins):

- **`GET /api/auth/web/start`** — query: `redirect_uri`, `state`, `code_challenge`,
  `code_challenge_method=S256`; requires a portal session.
- **`POST /api/auth/web/exchange`** — body `{ code, codeVerifier, redirectUri }` →
  `{ apiToken, expiresAt, user }`.
- An env-driven **redirect URI allowlist**, e.g.
  `WEB_APP_ALLOWED_REDIRECT_URIS=https://penopta.example.com/api/auth/callback,http://localhost:3200/api/auth/callback`.

## Project structure

```
src/
  app/
    api/auth/{login,callback,logout}/route.ts  # web PKCE flow
    login/page.tsx                             # auth error interstitial
    authenticating/page.tsx                    # brief pause before PKCE
    page.tsx                                   # project list (public)
    projects/[id]/page.tsx                     # project detail (public)
  components/                                  # AppHeader, Brand, ProjectList
  lib/auth/                                    # config, pkce, session, server helpers
  lib/db/                                      # Drizzle client, schema, seed
  lib/projects/data.ts                         # visibility-aware project reads
docker-compose.yml                             # local Postgres on 5434
drizzle/                                       # migrations
docs/architecture.md                           # schema, env split
```

## Data

Projects are Postgres rows (`project`). Reads in `src/lib/projects/data.ts`
return rows the viewer may see (public for everyone; owners also see private).
Seed with `npm run db:seed`.
