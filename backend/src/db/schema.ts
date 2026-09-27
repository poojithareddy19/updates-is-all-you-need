import { sql, type SQL } from "drizzle-orm";
import {
  bigserial,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { ITEM_TYPES } from "../config/sources";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const itemType = pgEnum("item_type", ITEM_TYPES);
export const runStatus = pgEnum("run_status", ["running", "success", "partial", "failed"]);
export const runTrigger = pgEnum("run_trigger", ["cron", "manual", "script"]);

export const items = pgTable(
  "items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: text("title").notNull(),
    /** Link to the original, with tracking parameters and fragments removed. */
    url: text("url").notNull(),
    /** Looser form of the URL used to detect duplicates (see pipeline/canonical-url.ts). */
    urlKey: text("url_key").notNull().unique(),
    /** Cross-source identity, e.g. "arxiv:2509.01234" or "hn:45123456". */
    externalId: text("external_id").unique(),
    sourceId: text("source_id").notNull(),
    sourceName: text("source_name").notNull(),
    type: itemType("type").notNull(),
    summary: text("summary"),
    aiSummary: text("ai_summary"),
    authors: text("authors").array().notNull().default(sql`'{}'::text[]`),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    imageUrl: text("image_url"),
    /** Hacker News thread for this item, when there is one. */
    discussionUrl: text("discussion_url"),
    /** Hacker News points, when known. */
    score: integer("score"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      (): SQL => sql`setweight(to_tsvector('english', coalesce(${items.title}, '')), 'A') || setweight(to_tsvector('english', coalesce(${items.summary}, '') || ' ' || coalesce(${items.aiSummary}, '')), 'B')`,
    ),
  },
  (t) => [
    index("items_published_at_idx").on(t.publishedAt.desc()),
    index("items_type_published_at_idx").on(t.type, t.publishedAt.desc()),
    index("items_tags_idx").using("gin", t.tags),
    index("items_search_idx").using("gin", t.searchVector),
  ],
);

export interface SourceRunStats {
  fetched: number;
  new: number;
  duplicates: number;
  durationMs: number;
  error?: string;
}

export interface RunStats {
  sources: Record<string, SourceRunStats>;
  totals: { fetched: number; new: number; duplicates: number; failedSources: number };
  pruned: number;
  error?: string;
}

export const fetchRuns = pgTable(
  "fetch_runs",
  {
    id: serial("id").primaryKey(),
    trigger: runTrigger("trigger").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: runStatus("status").notNull().default("running"),
    stats: jsonb("stats").$type<RunStats>(),
  },
  (t) => [index("fetch_runs_started_at_idx").on(t.startedAt.desc())],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type FetchRun = typeof fetchRuns.$inferSelect;
