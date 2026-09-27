import type { ItemType, Source } from "../config/sources";
import type { RawItem } from "../fetchers/types";
import { cleanUrl, urlKey } from "./canonical-url";
import { tagItem } from "./tagging";
import { stripHtml, truncate } from "./text";

export const MAX_TITLE_LENGTH = 300;
export const MAX_SUMMARY_LENGTH = 600;
export const MAX_AUTHORS = 10;

/** One item in the shape the database stores, ready for dedupe. */
export interface NormalizedItem {
  title: string;
  url: string;
  urlKey: string;
  externalId: string | null;
  sourceId: string;
  sourceName: string;
  type: ItemType;
  summary: string | null;
  authors: string[];
  publishedAt: Date;
  imageUrl: string | null;
  discussionUrl: string | null;
  score: number | null;
  tags: string[];
}

/**
 * Cleans a raw item. Returns null when it has no usable title or link.
 * Missing or future dates become `now`, so nothing sorts above today.
 */
export function normalizeItem(raw: RawItem, source: Source, now: Date): NormalizedItem | null {
  const title = truncate(stripHtml(raw.title ?? ""), MAX_TITLE_LENGTH);
  const url = cleanUrl(raw.url);
  if (!title || !url) return null;

  const plainSummary = stripHtml(raw.summary ?? "");
  const summary = plainSummary && plainSummary !== title ? truncate(plainSummary, MAX_SUMMARY_LENGTH) : null;

  const authors = [...new Set((raw.authors ?? []).map((a) => stripHtml(a)).filter(Boolean))].slice(0, MAX_AUTHORS);

  const published = raw.publishedAt && !Number.isNaN(raw.publishedAt.getTime()) ? raw.publishedAt : now;
  const publishedAt = published.getTime() > now.getTime() ? now : published;

  return {
    title,
    url,
    urlKey: urlKey(url),
    externalId: raw.externalId ?? null,
    sourceId: source.id,
    sourceName: source.name,
    type: source.type,
    summary,
    authors,
    publishedAt,
    imageUrl: cleanUrl(raw.imageUrl, url),
    discussionUrl: cleanUrl(raw.discussionUrl),
    score: typeof raw.score === "number" && Number.isFinite(raw.score) ? Math.round(raw.score) : null,
    tags: tagItem(title, summary),
  };
}
