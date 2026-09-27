import { describe, expect, it } from "vitest";
import { dedupe, titleKey, titleSimilarity, type ExistingItem } from "../src/pipeline/dedupe";
import { item } from "./helpers";

const existing = (overrides: Partial<ExistingItem> = {}): ExistingItem => ({
  id: 1,
  urlKey: "news.example.com/stored",
  externalId: null,
  title: "A stored headline that is already in the database",
  discussionUrl: null,
  score: null,
  imageUrl: null,
  ...overrides,
});

describe("titleKey and titleSimilarity", () => {
  it("normalizes case, accents, punctuation and HN prefixes", () => {
    expect(titleKey("Show HN: Café-Bot, an AI [pdf]")).toBe("cafe bot an ai");
  });

  it("scores identical titles 1 and unrelated titles low", () => {
    expect(titleSimilarity("OpenAI releases GPT-6", "openai releases gpt 6!")).toBe(1);
    expect(titleSimilarity("OpenAI releases GPT-6", "Robots learn to fold laundry")).toBeLessThan(0.3);
  });
});

describe("dedupe", () => {
  it("keeps distinct items and preserves order", () => {
    const a = item({ urlKey: "a.com/1", title: "First distinct headline about robotics research" });
    const b = item({ urlKey: "b.com/2", title: "Second distinct headline about chip export rules" });
    const result = dedupe([a, b], []);
    expect(result.fresh).toEqual([a, b]);
    expect(result.updates).toEqual([]);
    expect(result.duplicatesBySource).toEqual({});
  });

  it("drops a candidate whose URL key is already stored", () => {
    const result = dedupe([item({ urlKey: "news.example.com/stored", title: "Totally different wording here" })], [existing()]);
    expect(result.fresh).toEqual([]);
    expect(result.duplicatesBySource).toEqual({ "example-news": 1 });
  });

  it("drops repeats within the same batch, keeping the first", () => {
    const first = item({ sourceId: "hf-daily-papers", urlKey: "arxiv:2609.00001", externalId: "arxiv:2609.00001", title: "Sparse attention paper title" });
    const second = item({ sourceId: "arxiv", urlKey: "arxiv:2609.00001", externalId: "arxiv:2609.00001", title: "Sparse attention paper title" });
    const result = dedupe([first, second], []);
    expect(result.fresh).toEqual([first]);
    expect(result.duplicatesBySource).toEqual({ arxiv: 1 });
  });

  it("matches on external ID even when URL keys differ", () => {
    const result = dedupe([item({ urlKey: "other.com/x", externalId: "hn:42", title: "Unrelated words entirely" })], [existing({ externalId: "hn:42" })]);
    expect(result.fresh).toEqual([]);
  });

  it("treats near-identical titles as the same story", () => {
    const a = item({ urlKey: "a.com/1", title: "Nvidia unveils its next-generation AI chip for data centers" });
    const b = item({ sourceId: "other", urlKey: "b.com/2", title: "Nvidia Unveils Its Next Generation AI Chip for Data Centers" });
    expect(dedupe([a, b], []).fresh).toEqual([a]);
  });

  it("keeps different stories with overlapping words", () => {
    const a = item({ urlKey: "a.com/1", title: "Nvidia unveils its next-generation AI chip for data centers" });
    const b = item({ urlKey: "b.com/2", title: "AMD unveils its next-generation AI chip for laptops" });
    expect(dedupe([a, b], []).fresh).toHaveLength(2);
  });

  it("only matches short titles by URL", () => {
    const a = item({ urlKey: "a.com/1", title: "Introducing Gemini" });
    const b = item({ urlKey: "b.com/2", title: "Introducing Gemini" });
    expect(dedupe([a, b], []).fresh).toHaveLength(2);
  });

  it("merges an HN thread and points into a fresh item from another source", () => {
    const news = item({ urlKey: "news.example.com/a", imageUrl: null });
    const hn = item({
      sourceId: "hacker-news",
      type: "community",
      urlKey: "news.example.com/a",
      externalId: "hn:7",
      discussionUrl: "https://news.ycombinator.com/item?id=7",
      score: 300,
    });
    const result = dedupe([news, hn], []);
    expect(result.fresh).toHaveLength(1);
    expect(result.fresh[0]).toMatchObject({ sourceId: "example-news", discussionUrl: "https://news.ycombinator.com/item?id=7", score: 300 });
  });

  it("produces updates for stored items that gain a thread, image or higher score", () => {
    const stored = existing({ score: 100 });
    const hn = item({
      urlKey: stored.urlKey,
      discussionUrl: "https://news.ycombinator.com/item?id=9",
      score: 250,
      imageUrl: "https://cdn.example.com/x.png",
    });
    expect(dedupe([hn], [stored]).updates).toEqual([
      { id: 1, discussionUrl: "https://news.ycombinator.com/item?id=9", score: 250, imageUrl: "https://cdn.example.com/x.png" },
    ]);
  });

  it("does not overwrite details a stored item already has, or lower its score", () => {
    const stored = existing({ discussionUrl: "https://news.ycombinator.com/item?id=1", score: 500, imageUrl: "https://a/b.png" });
    const dup = item({ urlKey: stored.urlKey, discussionUrl: "https://news.ycombinator.com/item?id=2", score: 10, imageUrl: "https://c/d.png" });
    expect(dedupe([dup], [stored]).updates).toEqual([]);
  });
});
