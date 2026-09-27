import { and, count, desc, eq, gte, inArray, max, sql, type SQL } from "drizzle-orm";
import type { ItemType } from "../config/sources";
import { getDb } from "./client";
import { fetchRuns, items, type FetchRun } from "./schema";

export async function getItemCount(): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(items);
  return row?.value ?? 0;
}

export async function getLatestRun(): Promise<FetchRun | undefined> {
  const [run] = await getDb().select().from(fetchRuns).orderBy(desc(fetchRuns.startedAt)).limit(1);
  return run;
}

/** When the last run that stored anything (success or partial) finished. */
export async function getLastUpdated(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ at: fetchRuns.finishedAt })
    .from(fetchRuns)
    .where(inArray(fetchRuns.status, ["success", "partial"]))
    .orderBy(desc(fetchRuns.finishedAt))
    .limit(1);
  return row?.at ?? null;
}

/** "Today" is the 24 hours of fetching up to the newest item, so a missed run never empties it. */
export const TODAY_WINDOW_HOURS = 24;

export const FEED_PAGE_SIZE = 30;

export interface FeedQuery {
  /** Full-text search across all stored items. Without it, the feed is Today. */
  q?: string;
  type?: ItemType;
  tag?: string;
  /** 1-based. */
  page?: number;
}

/** The fields a card shows; leaves out the search vector and internal keys. */
export interface FeedItem {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  type: ItemType;
  summary: string | null;
  aiSummary: string | null;
  authors: string[];
  publishedAt: Date;
  fetchedAt: Date;
  tags: string[];
  discussionUrl: string | null;
  score: number | null;
}

export interface Feed {
  items: FeedItem[];
  /** Items matching every filter, across all pages. */
  total: number;
  page: number;
  pageCount: number;
  /** Counts per type for the current search/window and tag, ignoring the type filter (for tabs). */
  typeCounts: Record<ItemType, number>;
  /** Counts per tag for the current search/window and type, ignoring the tag filter. Most used first. */
  tagCounts: Array<{ tag: string; count: number }>;
  /** Start of the Today window, or null for a search or an empty database. */
  windowStart: Date | null;
}

const feedColumns = {
  id: items.id,
  title: items.title,
  url: items.url,
  sourceName: items.sourceName,
  type: items.type,
  summary: items.summary,
  aiSummary: items.aiSummary,
  authors: items.authors,
  publishedAt: items.publishedAt,
  fetchedAt: items.fetchedAt,
  tags: items.tags,
  discussionUrl: items.discussionUrl,
  score: items.score,
};

export async function getFeed(query: FeedQuery): Promise<Feed> {
  const db = getDb();
  const q = query.q?.trim();

  // The scope every count shares: a search, or the Today window.
  let scope: SQL;
  let windowStart: Date | null = null;
  const tsQuery = q ? sql`websearch_to_tsquery('english', ${q})` : undefined;
  if (tsQuery) {
    scope = sql`${items.searchVector} @@ ${tsQuery}`;
  } else {
    const [row] = await db.select({ newest: max(items.fetchedAt) }).from(items);
    if (!row?.newest) return emptyFeed();
    windowStart = new Date(row.newest.getTime() - TODAY_WINDOW_HOURS * 60 * 60 * 1000);
    scope = gte(items.fetchedAt, windowStart);
  }

  const typeFilter = query.type ? eq(items.type, query.type) : undefined;
  const tagFilter = query.tag ? sql`${items.tags} @> ARRAY[${query.tag}]::text[]` : undefined;

  const [typeRows, tagRows] = await Promise.all([
    db.select({ type: items.type, count: count() }).from(items).where(and(scope, tagFilter)).groupBy(items.type),
    db
      .select({ tag: sql<string>`t.tag`, count: count() })
      .from(sql`${items} cross join lateral unnest(${items.tags}) as t(tag)`)
      .where(and(scope, typeFilter))
      .groupBy(sql`t.tag`)
      .orderBy(desc(count()), sql`t.tag`),
  ]);

  const typeCounts: Record<ItemType, number> = { news: 0, article: 0, paper: 0, community: 0 };
  for (const r of typeRows) typeCounts[r.type] = r.count;
  const total = query.type ? typeCounts[query.type] : Object.values(typeCounts).reduce((a, b) => a + b, 0);

  const pageCount = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), pageCount);

  const order = tsQuery
    ? [desc(sql`ts_rank(${items.searchVector}, ${tsQuery})`), desc(items.publishedAt), desc(items.id)]
    : [desc(items.publishedAt), desc(items.id)];
  const rows = await db
    .select(feedColumns)
    .from(items)
    .where(and(scope, typeFilter, tagFilter))
    .orderBy(...order)
    .limit(FEED_PAGE_SIZE)
    .offset((page - 1) * FEED_PAGE_SIZE);

  return { items: rows, total, page, pageCount, typeCounts, tagCounts: tagRows, windowStart };
}

function emptyFeed(): Feed {
  return {
    items: [],
    total: 0,
    page: 1,
    pageCount: 1,
    typeCounts: { news: 0, article: 0, paper: 0, community: 0 },
    tagCounts: [],
    windowStart: null,
  };
}
