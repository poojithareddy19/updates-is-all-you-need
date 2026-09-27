import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Source } from "../src/config/sources";
import type { FetchContext } from "../src/fetchers/types";
import type { NormalizedItem } from "../src/pipeline/normalize";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export const fixture = (name: string) => readFileSync(path.join(fixturesDir, name), "utf8");

export const NOW = new Date("2026-09-26T00:00:00Z");

/** A fetch stub that answers from a list of responses and records every call. */
export function stubFetch(...responses: Array<{ status?: number; body?: string } | Error>) {
  const calls: string[] = [];
  const fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    if (next instanceof Error) throw next;
    return new Response(next?.body ?? "", { status: next?.status ?? 200 });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

export function testContext(fetch: typeof globalThis.fetch, overrides: Partial<FetchContext> = {}): FetchContext {
  return { fetch, now: NOW, lookbackHours: 72, timeoutMs: 1000, userAgent: "UpdatesIsAllYouNeed/test", ...overrides };
}

export const newsSource: Source = {
  id: "example-news",
  name: "Example News",
  type: "news",
  kind: "rss",
  url: "https://news.example.com/feed",
  homepage: "https://news.example.com",
  enabled: true,
};

export function item(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    title: "A reasonably long headline about a new model release",
    url: "https://news.example.com/a",
    urlKey: "news.example.com/a",
    externalId: null,
    sourceId: "example-news",
    sourceName: "Example News",
    type: "news",
    summary: null,
    authors: [],
    publishedAt: NOW,
    imageUrl: null,
    discussionUrl: null,
    score: null,
    tags: [],
    ...overrides,
  };
}
