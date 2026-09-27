/** What every fetcher returns before normalization. Strings may still contain HTML. */
export interface RawItem {
  title: string;
  url: string;
  summary?: string;
  authors?: string[];
  publishedAt?: Date;
  imageUrl?: string;
  /** Cross-source identity, e.g. "arxiv:2509.01234" or "hn:45123456". */
  externalId?: string;
  discussionUrl?: string;
  score?: number;
}

export interface FetchContext {
  fetch: typeof fetch;
  now: Date;
  /** RSS and Hacker News items published before now minus this are skipped. */
  lookbackHours: number;
  timeoutMs: number;
  userAgent: string;
}
