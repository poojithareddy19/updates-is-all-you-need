/**
 * Runs the optional AI step once: summarizes and tags recently fetched items that
 * have not been processed yet. Does nothing unless ANTHROPIC_API_KEY is set.
 *
 *   npm run enrich
 */
import "./load-env";
import { aiConfig, createClaudeSummarizer } from "../src/ai/claude";
import { enrichItems } from "../src/ai/enrich";
import { closeDb, createEnrichStore } from "../src/db";

const config = aiConfig();
if (!config) {
  console.log("ANTHROPIC_API_KEY is not set, so AI summaries are off. Nothing to do.");
  process.exit(0);
}

const started = Date.now();
try {
  const stats = await enrichItems({
    store: createEnrichStore(),
    summarize: createClaudeSummarizer(config),
    maxItems: config.maxItems,
  });
  console.log(`Model ${config.model}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(
    `${stats.candidates} pending, ${stats.enriched} enriched (${stats.summarized} with a summary), ` +
      `${stats.failedBatches}/${stats.batches} batches failed, ${stats.skipped} left for next run`,
  );
  console.log(`Tokens: ${stats.inputTokens} input, ${stats.outputTokens} output`);
  for (const e of stats.errors) console.log(`error: ${e}`);
  process.exitCode = stats.failedBatches > 0 && stats.enriched === 0 ? 1 : 0;
} catch (err) {
  console.error("Enrich run failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
