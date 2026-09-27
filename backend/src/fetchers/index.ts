import { LOOKBACK_HOURS, type Source } from "../config/sources";
import { fetchArxiv } from "./arxiv";
import { fetchHackerNews } from "./hackernews";
import { fetchHfPapers } from "./hf-papers";
import { fetchRss } from "./rss";
import type { FetchContext, RawItem } from "./types";

export type { FetchContext, RawItem } from "./types";

export function fetchSource(source: Source, ctx: FetchContext): Promise<RawItem[]> {
  switch (source.kind) {
    case "rss":
      return fetchRss(source, ctx);
    case "arxiv":
      return fetchArxiv(source, ctx);
    case "hf-papers":
      return fetchHfPapers(source, ctx);
    case "hackernews":
      return fetchHackerNews(source, ctx);
  }
}

export function defaultFetchContext(overrides: Partial<FetchContext> = {}): FetchContext {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    fetch: globalThis.fetch,
    now: new Date(),
    lookbackHours: LOOKBACK_HOURS,
    timeoutMs: 20_000,
    userAgent: `UpdatesIsAllYouNeed/1.0 (daily AI news digest${site ? `; +${site}` : ""})`,
    ...overrides,
  };
}
