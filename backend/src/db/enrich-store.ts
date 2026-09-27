import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { EnrichStore } from "../ai/enrich";
import { getDb, type Db } from "./client";
import { items } from "./schema";

/** The EnrichStore backed by Postgres. */
export function createEnrichStore(db: Db = getDb()): EnrichStore {
  return {
    async pendingItems(since, limit) {
      return db
        .select({ id: items.id, type: items.type, sourceName: items.sourceName, title: items.title, summary: items.summary })
        .from(items)
        .where(and(isNull(items.enrichedAt), gte(items.fetchedAt, since)))
        // Papers last: they are the most numerous and already come with an abstract.
        .orderBy(sql`case when ${items.type} = 'paper' then 1 else 0 end`, desc(items.publishedAt), desc(items.id))
        .limit(limit);
    },

    async saveEnrichment(results, at) {
      for (const r of results) {
        await db
          .update(items)
          .set({ aiSummary: r.summary, tags: r.tags, enrichedAt: at })
          .where(eq(items.id, r.id));
      }
    },
  };
}
