import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { aiConfig, createClaudeSummarizer } from "../src/ai/claude";
import {
  enrichItems,
  sanitizeResults,
  type BatchSummarizer,
  type EnrichCandidate,
  type EnrichResult,
  type EnrichStore,
} from "../src/ai/enrich";
import { NOW } from "./helpers";

const candidate = (id: number, overrides: Partial<EnrichCandidate> = {}): EnrichCandidate => ({
  id,
  type: "news",
  sourceName: "Example News",
  title: `Headline ${id}`,
  summary: `Some source text for item ${id}.`,
  ...overrides,
});

class MemoryEnrichStore implements EnrichStore {
  saved: EnrichResult[] = [];
  lastSince?: Date;
  lastLimit?: number;
  constructor(private pending: EnrichCandidate[]) {}
  async pendingItems(since: Date, limit: number) {
    this.lastSince = since;
    this.lastLimit = limit;
    return this.pending.slice(0, limit);
  }
  async saveEnrichment(results: EnrichResult[]) {
    this.saved.push(...results);
  }
}

/** Answers every item with a summary and the LLMs tag; batches containing a listed id fail. */
const fakeSummarizer = (failIds: number[] = []): BatchSummarizer & { calls: number[][] } => {
  const calls: number[][] = [];
  const fn = (async (batch: EnrichCandidate[]) => {
    calls.push(batch.map((c) => c.id));
    if (batch.some((c) => failIds.includes(c.id))) throw new Error("Claude declined the batch (cyber)");
    return {
      results: batch.map((c) => ({ id: c.id, summary: `Summary of ${c.id}.`, tags: ["LLMs"] })),
      inputTokens: 100 * batch.length,
      outputTokens: 30 * batch.length,
    };
  }) as BatchSummarizer & { calls: number[][] };
  fn.calls = calls;
  return fn;
};

describe("sanitizeResults", () => {
  it("drops unknown ids, duplicates and tags outside the fixed list", () => {
    const batch = [candidate(1), candidate(2)];
    const clean = sanitizeResults(batch, [
      { id: 1, summary: "  First.  ", tags: ["LLMs", "Made Up Tag", "LLMs", "Agents", "Robotics", "Funding"] },
      { id: 1, summary: "Duplicate.", tags: [] },
      { id: 99, summary: "Not in the batch.", tags: ["LLMs"] },
      { id: 2, summary: "   ", tags: [] },
    ]);
    expect(clean).toEqual([
      { id: 1, summary: "First.", tags: ["LLMs", "Agents", "Robotics"] },
      { id: 2, summary: null, tags: [] },
    ]);
  });
});

describe("enrichItems", () => {
  it("processes pending items in batches and reports token use", async () => {
    const store = new MemoryEnrichStore(Array.from({ length: 45 }, (_, i) => candidate(i + 1)));
    const summarize = fakeSummarizer();
    const stats = await enrichItems({ store, summarize, now: NOW, batchSize: 20, maxItems: 100 });

    expect(summarize.calls.map((c) => c.length).sort()).toEqual([20, 20, 5]);
    expect(store.saved).toHaveLength(45);
    expect(stats).toMatchObject({ candidates: 45, enriched: 45, summarized: 45, batches: 3, failedBatches: 0, inputTokens: 4500, outputTokens: 1350 });
    expect(store.lastSince).toEqual(new Date(NOW.getTime() - 48 * 60 * 60 * 1000));
  });

  it("respects the per-run cap", async () => {
    const store = new MemoryEnrichStore(Array.from({ length: 50 }, (_, i) => candidate(i + 1)));
    const stats = await enrichItems({ store, summarize: fakeSummarizer(), now: NOW, maxItems: 10 });
    expect(store.lastLimit).toBe(10);
    expect(stats.enriched).toBe(10);
  });

  it("keeps going when one batch fails and leaves its items pending", async () => {
    const store = new MemoryEnrichStore(Array.from({ length: 6 }, (_, i) => candidate(i + 1)));
    const stats = await enrichItems({ store, summarize: fakeSummarizer([4]), now: NOW, batchSize: 3 });
    expect(store.saved.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(stats).toMatchObject({ enriched: 3, batches: 2, failedBatches: 1, errors: ["Claude declined the batch (cyber)"] });
  });

  it("starts no new batch after the deadline", async () => {
    const store = new MemoryEnrichStore(Array.from({ length: 6 }, (_, i) => candidate(i + 1)));
    const summarize = fakeSummarizer();
    const stats = await enrichItems({ store, summarize, now: NOW, batchSize: 2, deadlineMs: 0 });
    expect(summarize.calls).toHaveLength(0);
    expect(stats).toMatchObject({ enriched: 0, skipped: 6 });
  });

  it("does nothing when nothing is pending", async () => {
    const summarize = fakeSummarizer();
    const stats = await enrichItems({ store: new MemoryEnrichStore([]), summarize, now: NOW });
    expect(summarize.calls).toHaveLength(0);
    expect(stats.candidates).toBe(0);
  });
});

describe("aiConfig", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("is off without an API key", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(aiConfig()).toBeNull();
  });

  it("defaults the model and cap, and reads overrides", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.AI_MODEL;
    delete process.env.AI_MAX_ITEMS_PER_RUN;
    expect(aiConfig()).toEqual({ model: "claude-opus-5", maxItems: 100 });
    process.env.AI_MODEL = "claude-sonnet-5";
    process.env.AI_MAX_ITEMS_PER_RUN = "40";
    expect(aiConfig()).toEqual({ model: "claude-sonnet-5", maxItems: 40 });
    process.env.AI_MAX_ITEMS_PER_RUN = "lots";
    expect(aiConfig()?.maxItems).toBe(100);
  });
});

describe("createClaudeSummarizer", () => {
  /** A client stub that records the request and answers with the given message fields. */
  const stubClient = (message: Record<string, unknown>) => {
    const requests: Array<Record<string, unknown>> = [];
    const client = {
      beta: {
        messages: {
          parse: async (params: Record<string, unknown>) => {
            requests.push(params);
            return { usage: { input_tokens: 500, output_tokens: 120, cache_read_input_tokens: 0 }, ...message };
          },
        },
      },
    } as unknown as Anthropic;
    return { client, requests };
  };
  const config = { model: "claude-opus-5", maxItems: 100 };

  it("sends the batch with structured output, low effort and refusal fallbacks", async () => {
    const { client, requests } = stubClient({
      stop_reason: "end_turn",
      parsed_output: { items: [{ id: 7, summary: "What changed.", tags: ["Agents"] }] },
    });
    const outcome = await createClaudeSummarizer(config, client)([candidate(7, { title: "Agents ship" })]);

    expect(outcome).toEqual({ results: [{ id: 7, summary: "What changed.", tags: ["Agents"] }], inputTokens: 500, outputTokens: 120 });
    const req = requests[0]!;
    expect(req).toMatchObject({ model: "claude-opus-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect((req.output_config as { effort: string }).effort).toBe("low");
    expect(JSON.stringify(req.messages)).toContain("Agents ship");
  });

  it("throws on a refusal, a truncated answer or an unparseable one", async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ stop_reason: "refusal", stop_details: { category: "cyber" }, parsed_output: null }, "declined the batch (cyber)"],
      [{ stop_reason: "max_tokens", parsed_output: null }, "cut off"],
      [{ stop_reason: "end_turn", parsed_output: null }, "did not match"],
    ];
    for (const [message, error] of cases) {
      const { client } = stubClient(message);
      await expect(createClaudeSummarizer(config, client)([candidate(1)])).rejects.toThrow(error);
    }
  });
});
