import { TAG_NAMES } from "../config/tags";
import type { ItemType } from "../config/sources";

/** Items fetched longer ago than this are left to keyword tags and their source summary. */
export const ENRICH_WINDOW_HOURS = 48;

/** Items per Claude request. Small enough that one bad answer costs little to retry. */
export const ENRICH_BATCH_SIZE = 20;

/** Requests in flight at once. */
export const ENRICH_CONCURRENCY = 3;

/** No new batch starts after this, so a run fits Vercel's 60 s function limit. */
export const ENRICH_DEADLINE_MS = 40_000;

export const DEFAULT_AI_MODEL = "claude-opus-5";
export const DEFAULT_AI_MAX_ITEMS = 100;

/** What the AI step reads about an item. */
export interface EnrichCandidate {
  id: number;
  type: ItemType;
  sourceName: string;
  title: string;
  summary: string | null;
}

/** What it writes back. `summary` is null when the source text was too thin to summarize faithfully. */
export interface EnrichResult {
  id: number;
  summary: string | null;
  tags: string[];
}

export interface BatchOutcome {
  results: EnrichResult[];
  inputTokens: number;
  outputTokens: number;
}

/** Summarizes and tags one batch. Throws when the whole batch failed (refusal, truncation, API error). */
export type BatchSummarizer = (batch: EnrichCandidate[]) => Promise<BatchOutcome>;

export interface EnrichStore {
  /** Unprocessed items fetched since `since`: news, articles and community before papers, newest first. */
  pendingItems(since: Date, limit: number): Promise<EnrichCandidate[]>;
  /** Writes summaries and tags and marks the items processed at `at`. */
  saveEnrichment(results: EnrichResult[], at: Date): Promise<void>;
}

export interface EnrichStats {
  candidates: number;
  enriched: number;
  summarized: number;
  batches: number;
  failedBatches: number;
  /** Candidates left for the next run because the deadline was reached. */
  skipped: number;
  inputTokens: number;
  outputTokens: number;
  errors: string[];
}

export interface EnrichOptions {
  store: EnrichStore;
  summarize: BatchSummarizer;
  maxItems?: number;
  now?: Date;
  batchSize?: number;
  concurrency?: number;
  deadlineMs?: number;
}

const ALLOWED_TAGS = new Set(TAG_NAMES);

/**
 * Keeps only answers for items that were in the batch, once each, with tags from
 * the fixed list (so the dashboard's topic filters keep working).
 */
export function sanitizeResults(batch: EnrichCandidate[], results: EnrichResult[]): EnrichResult[] {
  const ids = new Set(batch.map((c) => c.id));
  const seen = new Set<number>();
  const clean: EnrichResult[] = [];
  for (const r of results) {
    if (!ids.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    const summary = r.summary?.trim() || null;
    const tags = [...new Set(r.tags.filter((t) => ALLOWED_TAGS.has(t)))].slice(0, 3);
    clean.push({ id: r.id, summary, tags });
  }
  return clean;
}

/**
 * Summarizes and tags recently fetched items that have not been processed yet.
 * A failed batch is recorded and its items stay pending for the next run; the
 * other batches still complete.
 */
export async function enrichItems(options: EnrichOptions): Promise<EnrichStats> {
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? ENRICH_BATCH_SIZE;
  const concurrency = options.concurrency ?? ENRICH_CONCURRENCY;
  const deadline = Date.now() + (options.deadlineMs ?? ENRICH_DEADLINE_MS);

  const since = new Date(now.getTime() - ENRICH_WINDOW_HOURS * 60 * 60 * 1000);
  const candidates = await options.store.pendingItems(since, options.maxItems ?? DEFAULT_AI_MAX_ITEMS);

  const batches: EnrichCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += batchSize) batches.push(candidates.slice(i, i + batchSize));

  const stats: EnrichStats = {
    candidates: candidates.length,
    enriched: 0,
    summarized: 0,
    batches: 0,
    failedBatches: 0,
    skipped: 0,
    inputTokens: 0,
    outputTokens: 0,
    errors: [],
  };

  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next++]!;
      if (Date.now() >= deadline) {
        stats.skipped += batch.length;
        continue;
      }
      stats.batches++;
      try {
        const outcome = await options.summarize(batch);
        stats.inputTokens += outcome.inputTokens;
        stats.outputTokens += outcome.outputTokens;
        const results = sanitizeResults(batch, outcome.results);
        await options.store.saveEnrichment(results, now);
        stats.enriched += results.length;
        stats.summarized += results.filter((r) => r.summary).length;
      } catch (err) {
        stats.failedBatches++;
        stats.errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return stats;
}
