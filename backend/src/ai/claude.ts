import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { TAG_NAMES } from "../config/tags";
import {
  DEFAULT_AI_MAX_ITEMS,
  DEFAULT_AI_MODEL,
  type BatchSummarizer,
  type EnrichCandidate,
} from "./enrich";

export interface AiConfig {
  model: string;
  maxItems: number;
}

/** AI settings from the environment, or null when ANTHROPIC_API_KEY is not set (the feature is off). */
export function aiConfig(): AiConfig | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const max = Number(process.env.AI_MAX_ITEMS_PER_RUN);
  return {
    model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
    maxItems: Number.isInteger(max) && max > 0 ? max : DEFAULT_AI_MAX_ITEMS,
  };
}

const SYSTEM_PROMPT = `You write the summary line and topic tags for items on a daily AI news dashboard. Readers skim dozens of items, so each summary should tell them what is new and why it matters, in one or two plain sentences (at most about 45 words).

Base every summary only on the title and text given for that item. Do not add facts, numbers or opinions that are not there. Write it as a standalone statement, without openers like "This article" or "The authors". If the text adds nothing beyond the title, or there is no text, set summary to null rather than restating the title.

For tags, choose up to three from the allowed list that clearly describe the item's main subject. Return an empty list when none clearly apply.

Return one entry for every item, using its id.`;

const ResultSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      summary: z.string().nullable(),
      tags: z.array(z.enum(TAG_NAMES as [string, ...string[]])),
    }),
  ),
});

/** Source text sent per item; summaries are already capped at 600 characters when stored. */
const MAX_TEXT_CHARS = 1200;

function batchPrompt(batch: EnrichCandidate[]): string {
  const items = batch.map((c) => ({
    id: c.id,
    type: c.type,
    source: c.sourceName,
    title: c.title,
    text: c.summary?.slice(0, MAX_TEXT_CHARS) ?? "",
  }));
  return `Allowed tags: ${TAG_NAMES.join(", ")}\n\nItems:\n${JSON.stringify(items, null, 1)}`;
}

/**
 * A BatchSummarizer backed by the Claude API. Uses structured outputs so the answer
 * always matches the schema, low effort because the task is short and simple, and
 * server-side refusal fallbacks so a declined batch is retried on another model.
 */
export function createClaudeSummarizer(config: AiConfig, client: Anthropic = new Anthropic()): BatchSummarizer {
  return async (batch) => {
    const response = await client.beta.messages.parse({
      model: config.model,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ResultSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: batchPrompt(batch) }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(`Claude declined the batch (${response.stop_details?.category ?? "no category"})`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("Claude's answer was cut off at max_tokens");
    }
    if (!response.parsed_output) {
      throw new Error("Claude's answer did not match the expected format");
    }
    return {
      results: response.parsed_output.items,
      inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0),
      outputTokens: response.usage.output_tokens,
    };
  };
}
