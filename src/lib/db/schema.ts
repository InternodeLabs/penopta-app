import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
