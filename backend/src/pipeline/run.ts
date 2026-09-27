import { enabledSources, LOOKBACK_HOURS, RETENTION_DAYS, type Source } from "../config/sources";
import type { RunStats, SourceRunStats } from "../db/schema";
import { defaultFetchContext, fetchSource } from "../fetchers";
import type { FetchContext, RawItem } from "../fetchers/types";
import { dedupe, type ExistingItem, type ItemUpdate } from "./dedupe";
import { normalizeItem, type NormalizedItem } from "./normalize";

/** A source that has not answered within this time is recorded as failed and skipped. */
export const SOURCE_DEADLINE_MS = 45_000;

/** Runs still marked "running" after this long were cut off (e.g. a function timeout). */
export const STALE_RUN_MINUTES = 15;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type RunTrigger = "cron" | "manual" | "script";
export type RunStatus = "success" | "partial" | "failed";

/** Everything a run needs from the database. See db/run-store.ts for the Postgres version. */
export interface RunStore {
  /** Marks runs started before `before` and still running as failed. Returns how many. */
  failStaleRuns(before: Date): Promise<number>;
  startRun(trigger: RunTrigger): Promise<number>;
  /** Items that share a URL key or external ID with a candidate, or were published since `since`. */
  loadExisting(candidates: NormalizedItem[], since: Date): Promise<ExistingItem[]>;
  /** Inserts, skipping any row that hits a unique constraint. Returns the rows actually inserted. */
  insertItems(items: NormalizedItem[]): Promise<Array<{ sourceId: string }>>;
  applyUpdates(updates: ItemUpdate[]): Promise<void>;
  /** Deletes items published before `before`. Returns how many. */
  prune(before: Date): Promise<number>;
  finishRun(id: number, status: RunStatus, stats: RunStats): Promise<void>;
}

export type Fetcher = (source: Source, ctx: FetchContext) => Promise<RawItem[]>;

export interface SourceResult {
  source: Source;
  items: NormalizedItem[];
  durationMs: number;
  error?: string;
}

export interface RunResult {
  runId: number;
  status: RunStatus;
  stats: RunStats;
}

export interface RunOptions {
  trigger: RunTrigger;
  store: RunStore;
  sources?: Source[];
  ctx?: FetchContext;
  fetcher?: Fetcher;
  deadlineMs?: number;
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer within ${ms} ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Fetches and normalizes every source in parallel. A source that throws or misses
 * the deadline comes back with `error` set and no items; it never affects the others.
 */
export async function fetchAll(
  sources: Source[],
  ctx: FetchContext,
  fetcher: Fetcher = fetchSource,
  deadlineMs = SOURCE_DEADLINE_MS,
): Promise<SourceResult[]> {
  return Promise.all(
    sources.map(async (source) => {
      const started = Date.now();
      try {
        const raw = await withDeadline(fetcher(source, ctx), deadlineMs);
        const items = raw.map((r) => normalizeItem(r, source, ctx.now)).filter((i) => i !== null);
        return { source, items, durationMs: Date.now() - started };
      } catch (err) {
        return { source, items: [], durationMs: Date.now() - started, error: errorMessage(err) };
      }
    }),
  );
}

/**
 * Per-source counts. `fetched` equals `new + duplicates`, except when nothing was
 * stored (`insertedBySource` null, the database step failed), where both are 0.
 */
export function buildStats(
  results: SourceResult[],
  insertedBySource: Record<string, number> | null,
  pruned: number,
): RunStats {
  const sources: Record<string, SourceRunStats> = {};
  const totals = { fetched: 0, new: 0, duplicates: 0, failedSources: 0 };
  for (const r of results) {
    const fetched = r.items.length;
    const inserted = insertedBySource?.[r.source.id] ?? 0;
    const duplicates = insertedBySource ? fetched - inserted : 0;
    const s: SourceRunStats = { fetched, new: inserted, duplicates, durationMs: r.durationMs };
    if (r.error) s.error = r.error;
    sources[r.source.id] = s;
    totals.fetched += fetched;
    totals.new += inserted;
    totals.duplicates += s.duplicates;
    if (r.error) totals.failedSources++;
  }
  return { sources, totals, pruned };
}

export function overallStatus(results: SourceResult[]): RunStatus {
  const failed = results.filter((r) => r.error).length;
  if (failed === 0) return "success";
  return failed === results.length ? "failed" : "partial";
}

/**
 * One full daily run: fetch every enabled source, normalize, dedupe against each
 * other and the database, insert what is new, enrich what already exists, delete
 * items past retention, and record the outcome in fetch_runs.
 *
 * Source failures are part of the result, not exceptions. Only a database error
 * throws, after the run has been marked failed where possible.
 */
export async function runFetch(options: RunOptions): Promise<RunResult> {
  const { store, trigger } = options;
  const sources = options.sources ?? enabledSources();
  const ctx = options.ctx ?? defaultFetchContext();
  const now = ctx.now;

  await store.failStaleRuns(new Date(now.getTime() - STALE_RUN_MINUTES * 60 * 1000));
  const runId = await store.startRun(trigger);

  const results = await fetchAll(sources, ctx, options.fetcher, options.deadlineMs);

  try {
    // Config order decides which copy of a story is kept: news and official blogs
    // before papers, Hacker News last so its threads attach to existing articles.
    const candidates = results.flatMap((r) => r.items);
    const existing = await store.loadExisting(candidates, new Date(now.getTime() - LOOKBACK_HOURS * HOUR_MS));
    const { fresh, updates } = dedupe(candidates, existing);

    const inserted = await store.insertItems(fresh);
    const insertedBySource: Record<string, number> = {};
    for (const row of inserted) insertedBySource[row.sourceId] = (insertedBySource[row.sourceId] ?? 0) + 1;

    await store.applyUpdates(updates);
    const pruned = await store.prune(new Date(now.getTime() - RETENTION_DAYS * DAY_MS));

    const stats = buildStats(results, insertedBySource, pruned);
    const status = overallStatus(results);
    await store.finishRun(runId, status, stats);
    return { runId, status, stats };
  } catch (err) {
    const stats = { ...buildStats(results, null, 0), error: errorMessage(err) };
    await store.finishRun(runId, "failed", stats).catch(() => {});
    throw err;
  }
}
