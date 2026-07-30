import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });
const isoDateTimeOrNull = z.union([isoDateTime, z.null()]);

export const sourceActivitySchema = z.object({
  timestamp: isoDateTimeOrNull,
  role: z.string().min(1),
  text: z.string(),
  isExact: z.boolean(),
});

export const workingStateSchema = z.object({
  objective: z.string(),
  statusSummary: z.string(),
  decisions: z.array(z.string()),
  completedWork: z.array(z.string()),
  artifacts: z.array(z.string()),
  openQuestions: z.array(z.string()),
  nextAction: z.string(),
});

export const threadPayloadSchema = z.object({
  threadId: z.string().min(1),
  title: z.string(),
  kind: z.string().min(1),
  status: z.string().min(1),
  createdAt: isoDateTimeOrNull,
  updatedAt: isoDateTimeOrNull,
  projectContext: z.union([z.string(), z.null()]),
  sourceActivity: z.array(sourceActivitySchema),
  workingState: workingStateSchema,
});

export const agentSyncPayloadSchema = z.object({
  schemaVersion: z.string().min(1),
  agentId: z.string().min(1),
  penopta_user_id: z.string().min(1),
  runId: z.string().min(1),
  windowStart: isoDateTime,
  windowEnd: isoDateTime,
  agent: z.object({
    name: z.string().min(1),
    model: z.string().min(1),
    effort: z.string().min(1).optional(),
  }),
  captureCoverage: z.object({
    enumerationAvailable: z.boolean(),
    transcriptsAvailable: z.boolean(),
    limitation: z.union([z.string(), z.null()]),
  }),
  threads: z.array(threadPayloadSchema),
  runSummary: z.object({
    threadsReviewed: z.number().int().nonnegative(),
    threadsChanged: z.number().int().nonnegative(),
    threadsUnavailable: z.number().int().nonnegative(),
    importantUpdates: z.array(z.string()),
  }),
});

export type AgentSyncPayload = z.infer<typeof agentSyncPayloadSchema>;
