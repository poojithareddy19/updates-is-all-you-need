import { describe, expect, it } from "vitest";
import { MAX_AUTHORS, MAX_SUMMARY_LENGTH, normalizeItem } from "../src/pipeline/normalize";
import { newsSource, NOW } from "./helpers";

describe("normalizeItem", () => {
  it("cleans title, URL and summary and fills source fields", () => {
    const item = normalizeItem(
      {
        title: "  Lab&#8217;s <em>new</em> large language model  ",
        url: "https://www.news.example.com/story/?utm_source=rss",
        summary: "<p>It is &amp; fast.</p>",
        authors: ["Ada", "Ada", " <b>Bob</b> "],
        publishedAt: new Date("2026-09-25T09:00:00Z"),
        imageUrl: "/img/a.png",
      },
      newsSource,
      NOW,
    )!;
    expect(item).toMatchObject({
      title: "Lab’s new large language model",
      url: "https://www.news.example.com/story/",
      urlKey: "news.example.com/story",
      summary: "It is & fast.",
      authors: ["Ada", "Bob"],
      sourceId: "example-news",
      sourceName: "Example News",
      type: "news",
      imageUrl: "https://www.news.example.com/img/a.png",
      externalId: null,
      score: null,
    });
    expect(item.tags).toContain("LLMs");
  });

  it("rejects items without a title or with an unusable link", () => {
    expect(normalizeItem({ title: "  ", url: "https://e.com/a" }, newsSource, NOW)).toBeNull();
    expect(normalizeItem({ title: "Title", url: "javascript:alert(1)" }, newsSource, NOW)).toBeNull();
    expect(normalizeItem({ title: "Title", url: "" }, newsSource, NOW)).toBeNull();
  });

  it("uses now for missing, invalid or future dates", () => {
    const base = { title: "Title", url: "https://e.com/a" };
    expect(normalizeItem(base, newsSource, NOW)!.publishedAt).toEqual(NOW);
    expect(normalizeItem({ ...base, publishedAt: new Date("nope") }, newsSource, NOW)!.publishedAt).toEqual(NOW);
    expect(normalizeItem({ ...base, publishedAt: new Date("2030-01-01") }, newsSource, NOW)!.publishedAt).toEqual(NOW);
  });

  it("drops a summary that only repeats the title and caps long ones", () => {
    expect(normalizeItem({ title: "Same", url: "https://e.com/a", summary: "<p>Same</p>" }, newsSource, NOW)!.summary).toBeNull();
    const long = normalizeItem({ title: "T", url: "https://e.com/a", summary: "word ".repeat(500) }, newsSource, NOW)!;
    expect(long.summary!.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
  });

  it("caps authors and keeps HN-style score and discussion links", () => {
    const item = normalizeItem(
      {
        title: "T",
        url: "https://e.com/a",
        authors: Array.from({ length: 30 }, (_, i) => `Author ${i}`),
        discussionUrl: "https://news.ycombinator.com/item?id=1",
        score: 12.6,
        externalId: "hn:1",
      },
      newsSource,
      NOW,
    )!;
    expect(item.authors).toHaveLength(MAX_AUTHORS);
    expect(item).toMatchObject({ discussionUrl: "https://news.ycombinator.com/item?id=1", score: 13, externalId: "hn:1" });
  });
});
