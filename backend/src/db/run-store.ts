import { and, eq, gte, inArray, lt, or, type SQL } from "drizzle-orm";
import type { RunStore } from "../pipeline/run";
import { getDb, type Db } from "./client";
import { fetchRuns, items } from "./schema";

/** Rows per INSERT; 14 columns each keeps well under Postgres' parameter limit. */
const INSERT_CHUNK = 200;

/** The RunStore backed by Postgres. */
export function createRunStore(db: Db = getDb()): RunStore {
  return {
    async failStaleRuns(before) {
      const rows = await db
        .update(fetchRuns)
        .set({ status: "failed", finishedAt: new Date() })
        .where(and(eq(fetchRuns.status, "running"), lt(fetchRuns.startedAt, before)))
        .returning({ id: fetchRuns.id });
      return rows.length;
    },

    async startRun(trigger) {
      const [row] = await db.insert(fetchRuns).values({ trigger }).returning({ id: fetchRuns.id });
      if (!row) throw new Error("Could not create a fetch_runs row");
      return row.id;
    },

    async loadExisting(candidates, since) {
      const urlKeys = [...new Set(candidates.map((c) => c.urlKey))];
      const externalIds = [...new Set(candidates.flatMap((c) => (c.externalId ? [c.externalId] : [])))];
      const conditions: SQL[] = [gte(items.publishedAt, since)];
      if (urlKeys.length) conditions.push(inArray(items.urlKey, urlKeys));
      if (externalIds.length) conditions.push(inArray(items.externalId, externalIds));
      return db
        .select({
          id: items.id,
          urlKey: items.urlKey,
          externalId: items.externalId,
          title: items.title,
          discussionUrl: items.discussionUrl,
          score: items.score,
          imageUrl: items.imageUrl,
        })
        .from(items)
        .where(or(...conditions));
    },

    async insertItems(rows) {
      const inserted: Array<{ sourceId: string }> = [];
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        const chunk = rows.slice(i, i + INSERT_CHUNK);
        // A concurrent run may have inserted the same story; skip it rather than fail.
        const out = await db.insert(items).values(chunk).onConflictDoNothing().returning({ sourceId: items.sourceId });
        inserted.push(...out);
      }
      return inserted;
    },

    async applyUpdates(updates) {
      for (const { id, ...fields } of updates) {
        await db.update(items).set(fields).where(eq(items.id, id));
      }
    },

    async prune(before) {
      const rows = await db.delete(items).where(lt(items.publishedAt, before)).returning({ id: items.id });
      return rows.length;
    },

    async finishRun(id, status, stats) {
      await db.update(fetchRuns).set({ status, stats, finishedAt: new Date() }).where(eq(fetchRuns.id, id));
    },
  };
}
