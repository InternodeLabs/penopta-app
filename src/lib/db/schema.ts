import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A `project` is the basic owned entity in Penopta.
 * Extend this schema as product features land — keep ownership on portal user ids.
 */
export const projects = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull().default(""),
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
