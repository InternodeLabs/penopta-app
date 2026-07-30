import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * An `organization` groups owned entities (projects, keys, agent data) and the
 * members allowed to see them. Penopta owns this layer locally — membership
 * still references portal user ids (Penopta is not an identity provider).
 * A `personal` org is auto-created for every user so ownership always resolves.
 */
export const organizations = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Portal user id of whoever created the org. */
  createdByUserId: text("created_by_user_id").notNull(),
  /** Auto-created single-member org for a user; not deletable in the UI. */
  isPersonal: boolean("is_personal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrganizationRow = typeof organizations.$inferSelect;

/** Membership of a portal user in an organization, with a coarse role. */
export const organizationMemberships = pgTable(
  "organization_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Portal user id of the member. */
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("organization_membership_org_user_uidx").on(t.orgId, t.userId),
    index("organization_membership_user_idx").on(t.userId),
  ],
);

export type OrganizationMembershipRow =
  typeof organizationMemberships.$inferSelect;

/** The org a user is currently acting in (one active org at a time). */
export const userActiveOrgs = pgTable("user_active_org", {
  /** Portal user id. */
  userId: text("user_id").primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserActiveOrgRow = typeof userActiveOrgs.$inferSelect;

/**
 * A `project` is the basic owned entity in Penopta. Scoped to an organization;
 * `owner_user_id` records the portal user who created it (for attribution).
 */
export const projects = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull(),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProjectRow = typeof projects.$inferSelect;

/**
 * Per-user API key for matching external posts (e.g. agents) back to a portal user.
 * Only one non-expired key may be minted at a time — remint after `expires_at`.
 */
export const userApiKeys = pgTable("user_api_key", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  ownerUserId: text("owner_user_id").notNull(),
  /** Opaque secret appended to the skill URL as `key=…`. */
  key: text("key").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserApiKeyRow = typeof userApiKeys.$inferSelect;

/** One ingested agent sync POST (immutable run log). */
export const agentSyncRuns = pgTable(
  "agent_sync_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    ownerUserId: text("owner_user_id").notNull(),
    schemaVersion: text("schema_version").notNull(),
    /** Skill / producer id, e.g. `hourly-thread-context-sync`. */
    agentId: text("agent_id").notNull(),
    runId: text("run_id").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    agentName: text("agent_name").notNull(),
    agentModel: text("agent_model").notNull(),
    agentEffort: text("agent_effort"),
    captureCoverage: jsonb("capture_coverage").$type<{
      enumerationAvailable: boolean;
      transcriptsAvailable: boolean;
      limitation: string | null;
    }>(),
    runSummary: jsonb("run_summary").$type<{
      threadsReviewed: number;
      threadsChanged: number;
      threadsUnavailable: number;
      importantUpdates: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("agent_sync_run_owner_run_uidx").on(t.ownerUserId, t.runId),
    index("agent_sync_run_org_created_idx").on(t.orgId, t.createdAt),
    index("agent_sync_run_owner_created_idx").on(t.ownerUserId, t.createdAt),
    index("agent_sync_run_owner_agent_name_idx").on(t.ownerUserId, t.agentName),
    index("agent_sync_run_owner_agent_model_idx").on(
      t.ownerUserId,
      t.agentModel,
    ),
  ],
);

export type AgentSyncRunRow = typeof agentSyncRuns.$inferSelect;

export type SourceActivityItem = {
  timestamp: string | null;
  role: string;
  text: string;
  isExact: boolean;
};

export type WorkingState = {
  objective: string;
  statusSummary: string;
  decisions: string[];
  completedWork: string[];
  artifacts: string[];
  openQuestions: string[];
  nextAction: string;
};

/**
 * Latest known state of a thread for a portal user.
 * Upserted on each sync; facets denormalized for filtering.
 */
export const agentThreads = pgTable(
  "agent_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    ownerUserId: text("owner_user_id").notNull(),
    /** Stable id from the producing agent. */
    threadId: text("thread_id").notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    threadCreatedAt: timestamp("thread_created_at", { withTimezone: true }),
    threadUpdatedAt: timestamp("thread_updated_at", { withTimezone: true }),
    projectContext: text("project_context"),
    sourceActivity: jsonb("source_activity")
      .$type<SourceActivityItem[]>()
      .notNull()
      .default([]),
    workingState: jsonb("working_state").$type<WorkingState>(),
    lastAgentName: text("last_agent_name").notNull(),
    lastAgentModel: text("last_agent_model").notNull(),
    lastAgentEffort: text("last_agent_effort"),
    lastAgentId: text("last_agent_id").notNull(),
    lastRunId: text("last_run_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("agent_thread_owner_thread_uidx").on(t.ownerUserId, t.threadId),
    index("agent_thread_org_synced_idx").on(t.orgId, t.lastSyncedAt),
    index("agent_thread_owner_agent_name_idx").on(
      t.ownerUserId,
      t.lastAgentName,
    ),
    index("agent_thread_owner_agent_model_idx").on(
      t.ownerUserId,
      t.lastAgentModel,
    ),
    index("agent_thread_owner_kind_idx").on(t.ownerUserId, t.kind),
    index("agent_thread_owner_status_idx").on(t.ownerUserId, t.status),
  ],
);

export type AgentThreadRow = typeof agentThreads.$inferSelect;

/** Per-run thread payload for history / time travel. */
export const agentThreadSnapshots = pgTable(
  "agent_thread_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    syncRunId: uuid("sync_run_id")
      .notNull()
      .references(() => agentSyncRuns.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    ownerUserId: text("owner_user_id").notNull(),
    threadId: text("thread_id").notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    threadCreatedAt: timestamp("thread_created_at", { withTimezone: true }),
    threadUpdatedAt: timestamp("thread_updated_at", { withTimezone: true }),
    projectContext: text("project_context"),
    sourceActivity: jsonb("source_activity")
      .$type<SourceActivityItem[]>()
      .notNull()
      .default([]),
    workingState: jsonb("working_state").$type<WorkingState>(),
    agentName: text("agent_name").notNull(),
    agentModel: text("agent_model").notNull(),
    agentEffort: text("agent_effort"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_thread_snapshot_owner_thread_idx").on(
      t.ownerUserId,
      t.threadId,
    ),
    index("agent_thread_snapshot_run_idx").on(t.syncRunId),
  ],
);

export type AgentThreadSnapshotRow = typeof agentThreadSnapshots.$inferSelect;

/**
 * Join table: agent threads a user has selected into a project (many-to-many).
 * A thread may belong to several projects; rows are removed when either the
 * project or the thread is deleted.
 */
export const projectThreads = pgTable(
  "project_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentThreadId: uuid("agent_thread_id")
      .notNull()
      .references(() => agentThreads.id, { onDelete: "cascade" }),
    /** Portal user id who added the thread to the project. */
    addedByUserId: text("added_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_thread_project_thread_uidx").on(
      t.projectId,
      t.agentThreadId,
    ),
    index("project_thread_project_idx").on(t.projectId),
    index("project_thread_thread_idx").on(t.agentThreadId),
  ],
);

export type ProjectThreadRow = typeof projectThreads.$inferSelect;

/**
 * OAuth 2.1 client registered with Penopta's MCP authorization server. Clients
 * are created via Dynamic Client Registration (RFC 7591) or seeded from a Client
 * ID Metadata Document (CIMD) URL. All clients are public (PKCE, no secret);
 * ChatGPT/Claude connectors register themselves here before authorizing.
 */
export const oauthClients = pgTable(
  "oauth_client",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public client identifier handed to the client (opaque or a CIMD URL). */
    clientId: text("client_id").notNull().unique(),
    clientName: text("client_name"),
    /** Allowed redirect URIs (exact match required at authorize time). */
    redirectUris: jsonb("redirect_uris").$type<string[]>().notNull().default([]),
    grantTypes: jsonb("grant_types")
      .$type<string[]>()
      .notNull()
      .default(["authorization_code", "refresh_token"]),
    tokenEndpointAuthMethod: text("token_endpoint_auth_method")
      .notNull()
      .default("none"),
    /** Set when the client_id is a CIMD URL we resolved metadata from. */
    metadataUrl: text("metadata_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("oauth_client_client_id_idx").on(t.clientId)],
);

export type OAuthClientRow = typeof oauthClients.$inferSelect;

/**
 * A short-lived authorization code issued after the user approves a connector.
 * Bound to the portal user, the client, the redirect URI, and the PKCE
 * challenge. Single-use: `consumedAt` is stamped on redemption.
 */
export const oauthAuthorizationCodes = pgTable(
  "oauth_authorization_code",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 hash of the issued code (the raw code is never stored). */
    codeHash: text("code_hash").notNull().unique(),
    clientId: text("client_id").notNull(),
    /** Portal user id who approved the grant. */
    userId: text("user_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scope: text("scope").notNull().default(""),
    /** RFC 8707 resource indicator the token is bound to. */
    resource: text("resource"),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("oauth_authorization_code_client_idx").on(t.clientId)],
);

export type OAuthAuthorizationCodeRow =
  typeof oauthAuthorizationCodes.$inferSelect;

/**
 * An issued access token (with optional refresh token) for an MCP connector.
 * Tokens are opaque and stored only as SHA-256 hashes; lookup resolves the
 * portal user, and the active org is resolved live per request. Revoke by
 * stamping `revokedAt`.
 */
export const oauthTokens = pgTable(
  "oauth_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accessTokenHash: text("access_token_hash").notNull().unique(),
    refreshTokenHash: text("refresh_token_hash").unique(),
    clientId: text("client_id").notNull(),
    /** Portal user id the token acts as. */
    userId: text("user_id").notNull(),
    scope: text("scope").notNull().default(""),
    resource: text("resource"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }).notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("oauth_token_user_idx").on(t.userId),
    index("oauth_token_client_idx").on(t.clientId),
  ],
);

export type OAuthTokenRow = typeof oauthTokens.$inferSelect;
