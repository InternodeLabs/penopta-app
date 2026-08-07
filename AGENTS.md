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

- Plain Postgres + Drizzle. Ownership stays on portal user ids — Penopta is not an identity provider, even for orgs.
- **Organizations are the ownership layer.** `organization` + `organization_membership` (role `owner`|`member`) are local tables keyed by portal user ids. Every user gets an auto-created **personal** org; they can belong to many orgs but act in exactly one **active** org at a time (`user_active_org`). Resolve it with `resolveActiveOrg(userId)` (guarantees a personal org, validates/falls back). Never scope reads by `owner_user_id` alone — scope by the active org.
- Every owned row carries `org_id` (`project`, `user_api_key`, `agent_sync_run`, `agent_thread`, `agent_thread_snapshot`). `owner_user_id` remains for attribution.
- `project` is the starter owned entity (`public` | `private`). Reads require a session and are scoped to the active org; within an org a project is visible when `public` or `owner_user_id = viewer`.
- `user_api_key`: one active opaque key per user **per org** (30-day TTL), minted for the active org. Re-mint (rotate) or invalidate anytime. Appended to the skill URL as `key=…`; `resolveOwnerByApiKey` returns `{ ownerUserId, orgId }`. Expired/invalidated keys fail lookup.
- Agent ingest: `POST /api/v1/agent-sync` with `Authorization: Bearer <token>`.
  Token may be an OAuth access token (`pat_…`, same flow as MCP) or a user API
  key (`pk_…`). Identity + target org come from the token; `penopta_user_id` in
  the body is optional and only checked for mismatch when present. Persists
  `agent_sync_run` + upserts `agent_thread` (+ snapshots), all stamped with the
  resolved `org_id`. OAuth uses the user's **active** org at request time; API
  keys use the org stamped at mint.
- MCP also exposes `penopta_track_thread` for on-demand single-thread pushes
  (live “track this chat”); it wraps the same ingest path. `penopta_sync_now`
  force-starts a full tracked-project sync in live chat (returns window +
  instructions; agent still delivers with `sync_threads`). Hourly skill
  delivery still uses `sync_threads` for tracked projects only.

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
