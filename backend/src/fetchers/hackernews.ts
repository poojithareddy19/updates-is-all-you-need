import { z } from "zod";
import type { HackerNewsSource } from "../config/sources";
import { makeKeywordMatcher } from "../pipeline/text";
import { getJson } from "./http";
import type { FetchContext, RawItem } from "./types";

const hitSchema = z.object({
  objectID: z.string(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  author: z.string().nullish(),
  points: z.number().nullish(),
  created_at: z.string(),
  story_text: z.string().nullish(),
});

const responseSchema = z.object({ hits: z.array(z.unknown()) });

/**
 * All stories from the lookback window that already have `minPoints`, in one
 * request (Algolia allows up to 1000 hits). Keyword filtering happens locally
 * because Algolia treats multi-word queries as AND.
 */
export function hackerNewsQueryUrl(source: HackerNewsSource, ctx: FetchContext): string {
  const since = Math.floor(ctx.now.getTime() / 1000) - ctx.lookbackHours * 3600;
  const params = new URLSearchParams({
    tags: "story",
    numericFilters: `created_at_i>${since},points>=${source.minPoints}`,
    hitsPerPage: "1000",
  });
  return `https://hn.algolia.com/api/v1/search_by_date?${params}`;
}

export function parseHackerNews(json: unknown, keywords: string[]): RawItem[] {
  const matches = makeKeywordMatcher(keywords);
  const items: RawItem[] = [];
  for (const raw of responseSchema.parse(json).hits) {
    const parsed = hitSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.title) continue;
    const hit = parsed.data;
    if (!matches(`${hit.title} ${hit.url ?? ""}`)) continue;
    const thread = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    items.push({
      title: hit.title!,
      // Ask HN and similar posts have no external link; the thread is the item.
      url: hit.url || thread,
      externalId: `hn:${hit.objectID}`,
      summary: hit.story_text ?? undefined,
      authors: hit.author ? [hit.author] : [],
      publishedAt: new Date(hit.created_at),
      discussionUrl: thread,
      score: hit.points ?? undefined,
    });
  }
  return items;
}

export async function fetchHackerNews(source: HackerNewsSource, ctx: FetchContext): Promise<RawItem[]> {
  return parseHackerNews(await getJson(hackerNewsQueryUrl(source, ctx), ctx), source.keywords);
}
