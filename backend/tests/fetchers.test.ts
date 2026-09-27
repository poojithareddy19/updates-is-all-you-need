import { describe, expect, it } from "vitest";
import type { ArxivSource, HackerNewsSource, HfPapersSource, RssSource } from "../src/config/sources";
import { arxivQueryUrl, fetchArxiv, parseArxiv } from "../src/fetchers/arxiv";
import { hackerNewsQueryUrl, parseHackerNews } from "../src/fetchers/hackernews";
import { fetchHfPapers, parseHfPapers } from "../src/fetchers/hf-papers";
import { fetchRss, parseFeed } from "../src/fetchers/rss";
import { fixture, NOW, stubFetch, testContext } from "./helpers";

const rssSource: RssSource = {
  id: "example-news",
  name: "Example News",
  type: "news",
  kind: "rss",
  url: "https://news.example.com/feed",
  homepage: "https://news.example.com",
  enabled: true,
};

describe("parseFeed (RSS 2.0)", () => {
  const items = parseFeed(fixture("rss.xml"));

  it("reads every item", () => {
    expect(items).toHaveLength(4);
  });

  it("reads title, link, author, date, summary and media image", () => {
    const first = items[0]!;
    expect(first.title).toContain("benchmarks");
    expect(first.url).toBe("https://news.example.com/2026/09/25/new-model/?utm_source=rss&utm_medium=feed");
    expect(first.authors).toEqual(["Ada Writer"]);
    expect(first.publishedAt?.toISOString()).toBe("2026-09-25T09:00:00.000Z");
    expect(first.summary).toContain("large language model");
    expect(first.imageUrl).toBe("https://cdn.example.com/model.jpg");
  });

  it("keeps numeric-looking titles as strings", () => {
    expect(items[1]!.title).toBe("2026");
  });

  it("falls back to a permalink guid, content:encoded and its first image", () => {
    const second = items[1]!;
    expect(second.url).toBe("https://news.example.com/2026/09/24/year-in-review");
    expect(second.summary).toContain("robots");
    expect(second.imageUrl).toBe("https://cdn.example.com/review.png");
  });
});

describe("parseFeed (Atom)", () => {
  const [entry] = parseFeed(fixture("atom.xml"));

  it("uses the alternate link and all authors", () => {
    expect(entry!.url).toBe("https://blog.example.org/robots-laundry");
    expect(entry!.authors).toEqual(["Grace Researcher", "Alan Engineer"]);
  });

  it("prefers published over updated and reads the image from content", () => {
    expect(entry!.publishedAt?.toISOString()).toBe("2026-09-25T16:00:00.000Z");
    expect(entry!.imageUrl).toBe("https://blog.example.org/img/fold.jpg");
  });
});

describe("parseFeed errors", () => {
  it("rejects documents that are not feeds", () => {
    expect(() => parseFeed("<html><body>Not a feed</body></html>")).toThrow(/Not an RSS or Atom feed/);
  });
});

describe("fetchRss", () => {
  it("drops items outside the lookback window and items without a date", async () => {
    const { fetch } = stubFetch({ body: fixture("rss.xml") });
    const items = await fetchRss(rssSource, testContext(fetch));
    expect(items.map((i) => i.title)).toEqual([expect.stringContaining("benchmarks"), "2026"]);
  });

  it("applies the AI keyword filter when the source asks for it", async () => {
    const { fetch } = stubFetch({ body: fixture("rss.xml") });
    const items = await fetchRss({ ...rssSource, aiFilter: true }, testContext(fetch, { lookbackHours: 24 * 90 }));
    // Only the first item mentions a language model; robots and gardening do not match AI_KEYWORDS.
    expect(items.map((i) => i.url)).toEqual([expect.stringContaining("new-model")]);
  });

  it("does not retry a 429", async () => {
    const { fetch, calls } = stubFetch({ status: 429 });
    await expect(fetchRss(rssSource, testContext(fetch))).rejects.toThrow("HTTP 429 from news.example.com");
    expect(calls).toHaveLength(1);
  });

  it("retries once after a 5xx and succeeds", async () => {
    const { fetch, calls } = stubFetch({ status: 503 }, { body: fixture("rss.xml") });
    const items = await fetchRss(rssSource, testContext(fetch));
    expect(calls).toHaveLength(2);
    expect(items).toHaveLength(2);
  });

  it("reports network failures after one retry", async () => {
    const { fetch, calls } = stubFetch(new TypeError("fetch failed"));
    await expect(fetchRss(rssSource, testContext(fetch))).rejects.toThrow("Request to news.example.com failed");
    expect(calls).toHaveLength(2);
  });
});

const arxivSource: ArxivSource = {
  id: "arxiv",
  name: "arXiv",
  type: "paper",
  kind: "arxiv",
  categories: ["cs.AI", "cs.CL"],
  maxResults: 50,
  homepage: "https://arxiv.org/",
  enabled: true,
};

describe("arXiv", () => {
  it("builds one OR query across categories", () => {
    const url = new URL(arxivQueryUrl(arxivSource));
    expect(url.host).toBe("export.arxiv.org");
    expect(url.searchParams.get("search_query")).toBe("cat:cs.AI OR cat:cs.CL");
    expect(url.searchParams.get("max_results")).toBe("50");
    expect(url.searchParams.get("sortBy")).toBe("submittedDate");
  });

  it("parses entries with versionless IDs and abstract URLs", () => {
    const [paper, solo] = parseArxiv(fixture("arxiv.xml"));
    expect(paper).toMatchObject({
      url: "https://arxiv.org/abs/2609.00001",
      externalId: "arxiv:2609.00001",
      authors: ["First Author", "Second Author"],
    });
    expect(paper!.title).toMatch(/^Sparse Attention for\s+Long Context Language Models$/);
    expect(solo!.authors).toEqual(["Solo Author"]);
  });

  it("surfaces API errors", async () => {
    const { fetch } = stubFetch({ body: fixture("arxiv-error.xml") });
    await expect(fetchArxiv(arxivSource, testContext(fetch))).rejects.toThrow(/arXiv API error: incorrect id format/);
  });
});

const hfSource: HfPapersSource = {
  id: "hf-daily-papers",
  name: "Hugging Face Daily Papers",
  type: "paper",
  kind: "hf-papers",
  url: "https://huggingface.co/api/daily_papers",
  homepage: "https://huggingface.co/papers",
  enabled: true,
};

describe("Hugging Face Daily Papers", () => {
  it("maps papers to their arXiv identity with the HF page as discussion", () => {
    const items = parseHfPapers(JSON.parse(fixture("hf-papers.json")));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      url: "https://arxiv.org/abs/2609.00001",
      externalId: "arxiv:2609.00001",
      discussionUrl: "https://huggingface.co/papers/2609.00001",
      score: 42,
      authors: ["First Author", "Second Author"],
    });
    // The listing date, not the arXiv submission date.
    expect(items[0]!.publishedAt?.toISOString()).toBe("2026-09-25T20:00:00.000Z");
  });

  it("rejects a response that is not a list", async () => {
    const { fetch } = stubFetch({ body: '{"error":"nope"}' });
    await expect(fetchHfPapers(hfSource, testContext(fetch))).rejects.toThrow(/not an array/);
  });
});

const hnSource: HackerNewsSource = {
  id: "hacker-news",
  name: "Hacker News",
  type: "community",
  kind: "hackernews",
  keywords: ["AI", "LLM", "OpenAI"],
  minPoints: 50,
  homepage: "https://news.ycombinator.com/",
  enabled: true,
};

describe("Hacker News", () => {
  it("asks Algolia for recent stories above the points threshold", () => {
    const url = new URL(hackerNewsQueryUrl(hnSource, testContext(fetch)));
    const since = NOW.getTime() / 1000 - 72 * 3600;
    expect(url.searchParams.get("tags")).toBe("story");
    expect(url.searchParams.get("numericFilters")).toBe(`created_at_i>${since},points>=50`);
  });

  it("keeps AI stories only, matching titles or URLs", () => {
    const items = parseHackerNews(JSON.parse(fixture("hackernews.json")), hnSource.keywords);
    expect(items.map((i) => i.externalId)).toEqual(["hn:1001", "hn:1002", "hn:1004"]);
  });

  it("links Ask HN posts to their thread and records points", () => {
    const items = parseHackerNews(JSON.parse(fixture("hackernews.json")), hnSource.keywords);
    const ask = items.find((i) => i.externalId === "hn:1002")!;
    expect(ask.url).toBe("https://news.ycombinator.com/item?id=1002");
    expect(ask.discussionUrl).toBe(ask.url);
    expect(items[0]).toMatchObject({ score: 250, authors: ["alice"], discussionUrl: "https://news.ycombinator.com/item?id=1001" });
  });
});
