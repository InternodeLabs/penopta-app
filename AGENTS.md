<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Penopta — agent notes

Deeper rationale: [`docs/architecture.md`](docs/architecture.md). Human how-to: [`README.md`](README.md).

## Non-negotiable decisions

### Auth

- Penopta is an auth _consumer_ of Internode (`portal-frontend`). Do not add a local identity provider.
- The app is **login-required**. There is no logged-out product UI and no public project list.
- `/` is the sign-in page when logged out (mockup-styled card). After sign-in it is the workspace.
- Sign-in CTAs go to `/authenticating?returnTo=…` (brief interstitial), which then
  continues to `/api/auth/login?returnTo=…` (Internode PKCE start). Do **not** send
  users to `/login` as the normal path — that route only forwards auth errors onto `/?error=…`.
- Session user id comes from the portal (`session.user.id`). Use that string as `owner_user_id`.

### Data model

- Plain Postgres + Drizzle. Keep ownership on portal user ids.
- `project` is the starter owned entity (`public` | `private` visibility).
- All project reads require a session. Owners see their rows; `visibility` still matters for sharing later.
- `user_api_key`: each user may have one active opaque key (30-day TTL). They can re-mint (rotate) or invalidate anytime. Appended to the skill URL as `key=…` so external agents can match posts to the portal user. Expired/invalidated keys fail lookup.
- Agent ingest: `POST /api/v1/agent-sync` with `Authorization: Bearer <key>`. Body `penopta_user_id` must equal the key owner. Persists `agent_sync_run` + upserts `agent_thread` (+ snapshots).

### Environments

- **Local:** Docker Postgres via `docker compose` (`localhost:5434`). Use `.env.local`. Do not point daily local work at Neon.
- **Production:** Neon via Vercel Marketplace. Only the **Production** env is wired for now — no Preview/stage DB.
- Neon creates many env aliases (`DATABASE_POSTGRES_*`, `DATABASE_PG*`, etc.). The app only reads **`DATABASE_URL`**. Ignore the rest.
- Driver is auto-selected from the URL in `src/lib/db/client.ts` (Neon host → neon-http; else `pg`). Override with `DB_DRIVER=pg|neon` only if needed.
- Do not dump Neon vars into `.env.local`. Only add Neon `DATABASE_URL` to a local production env file when deliberately migrating/seeding prod from a laptop.

### Stack defaults

- Drizzle ORM + `@neondatabase/serverless` (prod) + `pg` (local).
- Stay within Vercel Hobby + Neon free unless the user explicitly opts out.
- Architecture mirrors Skillbase (`~/repos/skillbase`) — keep auth/db/env patterns aligned.

### Dependencies

- Before writing new helpers/utilities, check `package.json` for an existing dependency that already covers the need.
- Prefer adding a well-maintained NPM package over a custom implementation when the problem is solved by a common library.
