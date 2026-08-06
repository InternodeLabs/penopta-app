# Available + tracked projects (sync discovery)

Split agent sync into **discover → choose → sync**. Today the skill syncs every non-private project automatically. After this change, Penopta only pulls transcripts for projects the user has opted to track.

## Goals

1. Skill discovers provider projects and registers unknown ones in Penopta as **available** (metadata only).
2. User chooses which available projects to **track** in the app UI.
3. Skill syncs thread transcripts only for **tracked** projects.
4. Private-prefixed projects appear in the catalog but cannot be tracked or synced.

Out of scope for this pass: per-thread tracking (future MCP tool `penopta_track_thread`).

## Concepts

| Concept | Meaning |
|--------|---------|
| **Available project** | Metadata catalog entry from ChatGPT/Claude: name, stable provider project id, created. No transcripts. |
| **Tracked project** | User-selected subset of available (non-private) projects. |
| **Private project** | Name starts with `p:` or `private:` (case-insensitive). Shown in UI as disabled; never trackable/syncable. |

Tracking is **project-level**. Sync still pulls all member threads inside each tracked project. The stable provider project id must be enough for the skill to later say “get all activity from threads in this project.”

## MCP tools

| Tool | Role |
|------|------|
| `known_projects` | Return projects already stored as available (so the skill only pushes unknowns). |
| `make_projects_available` | Accept an array of unknown projects; persist metadata only (name, provider project id, created). |
| `tracked_projects` | Return the subset the user opted to track (skill uses this as the sync allowlist). |

No track/untrack MCP tool in this pass — tracking is set only in the app UI.

Existing tools stay: `sync_threads` remains the transcript delivery path; read tools (`list_projects`, etc.) are unchanged unless they need to reflect available/tracked semantics later.

### Deferred

- `penopta_track_thread` — mark individual threads for tracking when we need that layer.

## Skill flow

Rewrite `sync-skill.md` so each hourly run:

1. List projects in the provider environment.
2. Call `known_projects`.
3. Push unknowns via `make_projects_available` (metadata only — never transcripts at this step).
4. Call `tracked_projects`.
5. For each tracked project, enumerate member threads and collect transcript / working-state payloads as today.
6. Deliver via `sync_threads`.
7. Never sync (or offer to track) private-prefixed projects; treat them as out of scope for content, same prefix rules as today.

Private projects may still be registered as **available** so the UI can show them disabled.

## App UI

On `/integrations/[provider]`, add a section that:

- Lists all **available** projects for the active org (scoped like other owned data).
- Annotates which are **tracked**.
- Shows private-prefixed projects but **disables** interaction (no toggle).
- Lets the user toggle tracking on/off for non-private available projects.

## Data model (implementation notes)

New persistence for available/tracked catalog entries, org-scoped (`org_id` + attribution `owner_user_id`), keyed by provider + stable external project id. Store display metadata only; do not store transcripts here — those continue to flow through `agent_thread` / snapshots via `sync_threads`.

Exact table/column names left to implementation; uniqueness should be `(org_id, provider, external_project_id)` or equivalent.

## Non-goals

- Thread-level track toggles or `penopta_track` / `penopta_track_thread`.
- Changing Penopta’s own `project` entity (app projects) — this catalog is about **provider** projects discovered by the skill.
- Syncing standalone chats with no project membership (still out of scope).

## Acceptance checks

- [ ] Skill can register unknown projects without reading transcripts.
- [ ] `tracked_projects` returns only user-opted non-private projects.
- [ ] Hourly sync only includes threads from tracked projects.
- [ ] Integrations page lists available projects, marks tracked, disables `p:` / `private:` names.
- [ ] Toggling track updates what the next skill run syncs.
