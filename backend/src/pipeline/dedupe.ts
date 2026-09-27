import type { NormalizedItem } from "./normalize";

/** Titles at least this similar (Dice coefficient on character bigrams) are the same story. */
export const TITLE_SIMILARITY_THRESHOLD = 0.9;

/** Titles shorter than this (after normalization) are only matched by URL. */
const MIN_TITLE_KEY_LENGTH = 20;

/** An item already in the database, as far as dedupe needs to know. */
export interface ExistingItem {
  id: number;
  urlKey: string;
  externalId: string | null;
  title: string;
  discussionUrl: string | null;
  score: number | null;
  imageUrl: string | null;
}

/** Details a duplicate can add to an item already stored. */
export interface ItemUpdate {
  id: number;
  discussionUrl?: string;
  score?: number;
  imageUrl?: string;
}

export interface DedupeResult {
  fresh: NormalizedItem[];
  updates: ItemUpdate[];
  duplicatesBySource: Record<string, number>;
}

/** Lowercased, accent-free, punctuation-free title without HN prefixes or "[pdf]" tags. */
export function titleKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^(show|ask|tell|launch) hn:\s*/, "")
    .replace(/\[(pdf|video|audio)\]|\((pdf|video|\d{4})\)/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function bigrams(key: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i < key.length - 1; i++) grams.add(key.slice(i, i + 2));
  return grams;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return (2 * shared) / (a.size + b.size);
}

export function titleSimilarity(a: string, b: string): number {
  const ka = titleKey(a);
  const kb = titleKey(b);
  if (ka === kb) return ka ? 1 : 0;
  return dice(bigrams(ka), bigrams(kb));
}

type Entry =
  | { kind: "existing"; item: ExistingItem; update: ItemUpdate }
  | { kind: "fresh"; item: NormalizedItem };

interface TitleIndexEntry {
  key: string;
  grams: Set<string>;
  entry: Entry;
}

/** Copies details the kept entry lacks from a duplicate (HN thread, points, image). */
function enrich(entry: Entry, dup: NormalizedItem): void {
  if (entry.kind === "fresh") {
    const kept = entry.item;
    kept.discussionUrl ??= dup.discussionUrl;
    kept.imageUrl ??= dup.imageUrl;
    if (dup.score !== null && (kept.score === null || dup.score > kept.score)) kept.score = dup.score;
    return;
  }
  const { item, update } = entry;
  if (!item.discussionUrl && !update.discussionUrl && dup.discussionUrl) update.discussionUrl = dup.discussionUrl;
  if (!item.imageUrl && !update.imageUrl && dup.imageUrl) update.imageUrl = dup.imageUrl;
  const best = update.score ?? item.score;
  if (dup.score !== null && (best === null || dup.score > best)) update.score = dup.score;
}

/**
 * Drops candidates that match an existing item or an earlier candidate by URL key,
 * external ID or near-identical title. Candidates are processed in order, so put
 * preferred sources first. A duplicate is not wasted: its discussion link, score
 * and image are merged into the item that is kept.
 */
export function dedupe(candidates: NormalizedItem[], existing: ExistingItem[]): DedupeResult {
  const byUrlKey = new Map<string, Entry>();
  const byExternalId = new Map<string, Entry>();
  const titles: TitleIndexEntry[] = [];

  const index = (entry: Entry, key: { urlKey: string; externalId: string | null; title: string }) => {
    if (!byUrlKey.has(key.urlKey)) byUrlKey.set(key.urlKey, entry);
    if (key.externalId && !byExternalId.has(key.externalId)) byExternalId.set(key.externalId, entry);
    const tk = titleKey(key.title);
    if (tk.length >= MIN_TITLE_KEY_LENGTH) titles.push({ key: tk, grams: bigrams(tk), entry });
  };

  const findByTitle = (title: string): Entry | undefined => {
    const key = titleKey(title);
    if (key.length < MIN_TITLE_KEY_LENGTH) return undefined;
    const grams = bigrams(key);
    for (const t of titles) {
      if (t.key === key) return t.entry;
      const ratio = t.key.length / key.length;
      if (ratio < 0.8 || ratio > 1.25) continue;
      if (dice(grams, t.grams) >= TITLE_SIMILARITY_THRESHOLD) return t.entry;
    }
    return undefined;
  };

  const updateEntries: Extract<Entry, { kind: "existing" }>[] = [];
  for (const item of existing) {
    const entry: Entry = { kind: "existing", item, update: { id: item.id } };
    updateEntries.push(entry);
    index(entry, item);
  }

  const fresh: NormalizedItem[] = [];
  const duplicatesBySource: Record<string, number> = {};
  for (const candidate of candidates) {
    const match =
      byUrlKey.get(candidate.urlKey) ??
      (candidate.externalId ? byExternalId.get(candidate.externalId) : undefined) ??
      findByTitle(candidate.title);
    if (match) {
      duplicatesBySource[candidate.sourceId] = (duplicatesBySource[candidate.sourceId] ?? 0) + 1;
      enrich(match, candidate);
      index(match, candidate);
      continue;
    }
    const entry: Entry = { kind: "fresh", item: candidate };
    fresh.push(candidate);
    index(entry, candidate);
  }

  const updates = updateEntries.map((e) => e.update).filter((u) => Object.keys(u).length > 1);
  return { fresh, updates, duplicatesBySource };
}
