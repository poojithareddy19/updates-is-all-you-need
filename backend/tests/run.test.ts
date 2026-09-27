import { describe, expect, it } from "vitest";
import type { Source } from "../src/config/sources";
import type { RunStats } from "../src/db/schema";
import type { RawItem } from "../src/fetchers/types";
import type { ExistingItem, ItemUpdate } from "../src/pipeline/dedupe";
import type { NormalizedItem } from "../src/pipeline/normalize";
import { fetchAll, runFetch, type Fetcher, type RunStatus, type RunStore } from "../src/pipeline/run";
import { NOW, newsSource, stubFetch, testContext } from "./helpers";

const hnSource: Source = {
  id: "example-hn",
  name: "Example HN",
  type: "community",
  kind: "hackernews",
  keywords: ["AI"],
  minPoints: 1,
  homepage: "https://hn.example.com",
  enabled: true,
};

const blogSource: Source = { ...newsSource, id: "example-blog", name: "Example Blog", type: "article" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** An in-memory RunStore that mimics the unique constraints of the real table. */
class MemoryStore implements RunStore {
  items: Array<NormalizedItem & { id: number }> = [];
  runs: Array<{ id: number; trigger: string; status: RunStatus | "running"; startedAt: Date; stats?: RunStats }> = [];
  updates: ItemUpdate[] = [];
  failInsert = false;

  async failStaleRuns(before: Date) {
    const stale = this.runs.filter((r) => r.status === "running" && r.startedAt < before);
    for (const r of stale) r.status = "failed";
    return stale.length;
  }
  async startRun(trigger: string) {
    const id = this.runs.length + 1;
    this.runs.push({ id, trigger, status: "running", startedAt: NOW });
    return id;
  }
  async loadExisting(candidates: NormalizedItem[], since: Date): Promise<ExistingItem[]> {
    const keys = new Set(candidates.map((c) => c.urlKey));
    return this.items
      .filter((i) => i.publishedAt >= since || keys.has(i.urlKey))
      .map((i) => ({ ...i, externalId: i.externalId }));
  }
  async insertItems(rows: NormalizedItem[]) {
    if (this.failInsert) throw new Error("connection lost");
    const out: Array<{ sourceId: string }> = [];
    for (const row of rows) {
      const clash = this.items.some(
        (i) => i.urlKey === row.urlKey || (row.externalId !== null && i.externalId === row.externalId),
      );
      if (clash) continue;
      this.items.push({ ...row, id: this.items.length + 1 });
      out.push({ sourceId: row.sourceId });
    }
    return out;
  }
  async applyUpdates(updates: ItemUpdate[]) {
    this.updates.push(...updates);
  }
  async prune(before: Date) {
    const kept = this.items.filter((i) => i.publishedAt >= before);
    const removed = this.items.length - kept.length;
    this.items = kept;
    return removed;
  }
  async finishRun(id: number, status: RunStatus, stats: RunStats) {
    const run = this.runs.find((r) => r.id === id)!;
    run.status = status;
    run.stats = stats;
  }
}

const HEADLINES = [
  "Lab releases an open weights reasoning model",
  "Chip maker unveils a faster inference accelerator",
  "Regulators publish draft rules for frontier AI systems",
  "Startup raises a large round for robot foundation models",
  "Researchers find benchmark contamination in popular evals",
  "New vision model segments anything in video",
  "Browser vendor ships an on-device assistant",
  "Survey shows developers rely on coding agents daily",
  "Court rules on training data copyright dispute",
  "Old story that should be pruned from the archive",
];

const raw = (n: number, overrides: Partial<RawItem> = {}): RawItem => ({
  title: HEADLINES[n]!,
  url: `https://news.example.com/story-${n}`,
  publishedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
  ...overrides,
});

/** A fetcher that answers per source ID; an Error value makes that source throw. */
const fetcherFrom =
  (answers: Record<string, RawItem[] | Error | "hang">): Fetcher =>
  async (source) => {
    const answer = answers[source.id];
    if (answer instanceof Error) throw answer;
    if (answer === "hang") return new Promise<never>(() => {});
    return answer ?? [];
  };

const ctx = testContext(stubFetch().fetch);

describe("fetchAll", () => {
  it("keeps going when one source throws or hangs", async () => {
    const results = await fetchAll(
      [newsSource, blogSource, hnSource],
      ctx,
      fetcherFrom({ "example-news": [raw(1), raw(2)], "example-blog": new Error("HTTP 503"), "example-hn": "hang" }),
      50,
    );
    expect(results.map((r) => [r.source.id, r.items.length, r.error])).toEqual([
      ["example-news", 2, undefined],
      ["example-blog", 0, "HTTP 503"],
      ["example-hn", 0, "no answer within 50 ms"],
    ]);
  });

  it("drops raw items without a usable title or link", async () => {
    const [result] = await fetchAll([newsSource], ctx, fetcherFrom({ "example-news": [raw(1), raw(2, { url: "" })] }));
    expect(result!.items).toHaveLength(1);
  });
});

describe("runFetch", () => {
  it("stores new items and records per-source stats", async () => {
    const store = new MemoryStore();
    const result = await runFetch({
      trigger: "manual",
      store,
      ctx,
      sources: [newsSource, blogSource],
      fetcher: fetcherFrom({
        "example-news": [raw(1), raw(2)],
        "example-blog": [raw(3, { url: "https://blog.example.com/post" })],
      }),
    });

    expect(result.status).toBe("success");
    expect(store.items).toHaveLength(3);
    expect(result.stats.sources["example-news"]).toMatchObject({ fetched: 2, new: 2, duplicates: 0 });
    expect(result.stats.totals).toEqual({ fetched: 3, new: 3, duplicates: 0, failedSources: 0 });
    expect(store.runs[0]).toMatchObject({ trigger: "manual", status: "success" });
  });

  it("stores nothing new on an identical second run", async () => {
    const store = new MemoryStore();
    const options = { trigger: "script" as const, store, ctx, sources: [newsSource], fetcher: fetcherFrom({ "example-news": [raw(1), raw(2)] }) };
    await runFetch(options);
    const second = await runFetch(options);
    expect(store.items).toHaveLength(2);
    expect(second.stats.sources["example-news"]).toMatchObject({ fetched: 2, new: 0, duplicates: 2 });
  });

  it("attaches a Hacker News thread to the article it links to instead of storing it twice", async () => {
    const store = new MemoryStore();
    await runFetch({
      trigger: "cron",
      store,
      ctx,
      sources: [newsSource, hnSource],
      fetcher: fetcherFrom({
        "example-news": [raw(1)],
        "example-hn": [raw(1, { discussionUrl: "https://news.ycombinator.com/item?id=1", score: 250, externalId: "hn:1" })],
      }),
    });
    expect(store.items).toHaveLength(1);
    expect(store.items[0]).toMatchObject({ sourceId: "example-news", discussionUrl: "https://news.ycombinator.com/item?id=1", score: 250 });
  });

  it("enriches an item from an earlier run when the thread shows up later", async () => {
    const store = new MemoryStore();
    await runFetch({ trigger: "cron", store, ctx, sources: [newsSource], fetcher: fetcherFrom({ "example-news": [raw(1)] }) });
    await runFetch({
      trigger: "cron",
      store,
      ctx,
      sources: [hnSource],
      fetcher: fetcherFrom({ "example-hn": [raw(1, { discussionUrl: "https://news.ycombinator.com/item?id=1", score: 90 })] }),
    });
    expect(store.items).toHaveLength(1);
    expect(store.updates).toEqual([{ id: 1, discussionUrl: "https://news.ycombinator.com/item?id=1", score: 90 }]);
  });

  it("reports partial when some sources fail and failed when all do", async () => {
    const partial = await runFetch({
      trigger: "cron",
      store: new MemoryStore(),
      ctx,
      sources: [newsSource, blogSource],
      fetcher: fetcherFrom({ "example-news": [raw(1)], "example-blog": new Error("HTTP 429 from blog.example.com") }),
    });
    expect(partial.status).toBe("partial");
    expect(partial.stats.sources["example-blog"]).toMatchObject({ fetched: 0, error: "HTTP 429 from blog.example.com" });
    expect(partial.stats.totals.failedSources).toBe(1);

    const failed = await runFetch({
      trigger: "cron",
      store: new MemoryStore(),
      ctx,
      sources: [newsSource],
      fetcher: fetcherFrom({ "example-news": new Error("DNS lookup failed") }),
    });
    expect(failed.status).toBe("failed");
  });

  it("deletes items older than the retention window", async () => {
    const store = new MemoryStore();
    const old = new Date(NOW.getTime() - 91 * DAY_MS);
    store.items.push({ ...(await fetchAll([newsSource], ctx, fetcherFrom({ "example-news": [raw(9)] })))[0]!.items[0]!, id: 1, publishedAt: old });
    const result = await runFetch({ trigger: "cron", store, ctx, sources: [newsSource], fetcher: fetcherFrom({ "example-news": [raw(1)] }) });
    expect(result.stats.pruned).toBe(1);
    expect(store.items.map((i) => i.title)).toEqual([HEADLINES[1]]);
  });

  it("marks runs stuck in running from an earlier timeout as failed", async () => {
    const store = new MemoryStore();
    store.runs.push({ id: 1, trigger: "cron", status: "running", startedAt: new Date(NOW.getTime() - DAY_MS) });
    await runFetch({ trigger: "cron", store, ctx, sources: [newsSource], fetcher: fetcherFrom({}) });
    expect(store.runs[0]!.status).toBe("failed");
  });

  it("marks the run failed and rethrows when the database step fails", async () => {
    const store = new MemoryStore();
    store.failInsert = true;
    await expect(
      runFetch({ trigger: "cron", store, ctx, sources: [newsSource], fetcher: fetcherFrom({ "example-news": [raw(1)] }) }),
    ).rejects.toThrow("connection lost");
    expect(store.runs[0]).toMatchObject({ status: "failed" });
    expect(store.runs[0]!.stats).toMatchObject({ error: "connection lost", totals: { fetched: 1, new: 0, duplicates: 0 } });
  });
});
