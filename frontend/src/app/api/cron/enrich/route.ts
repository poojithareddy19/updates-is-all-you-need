import { revalidateTag } from "next/cache";
import { aiConfig, createClaudeSummarizer, createEnrichStore, enrichItems, isAuthorizedCronRequest } from "@updates/backend";
import { ITEMS_TAG } from "@/lib/data";

// Batches stop starting at 200 s (ENRICH_DEADLINE_MS), leaving room for requests in
// flight within Vercel Hobby's 300 s limit.
export const maxDuration = 300;

/**
 * Optional AI step: summarizes and tags items the fetch stored. Vercel Cron calls it
 * two hours after the fetch (Hobby cron times can drift by up to 59 minutes, so this
 * keeps the order); items it does not reach wait for the next run.
 * Answers 200 with status "disabled" when ANTHROPIC_API_KEY is not set.
 */
async function handle(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = aiConfig();
  if (!config) return Response.json({ status: "disabled", reason: "ANTHROPIC_API_KEY is not set" });

  try {
    const stats = await enrichItems({
      store: createEnrichStore(),
      summarize: createClaudeSummarizer(config),
      maxItems: config.maxItems,
    });
    console.log("Enrich run", { model: config.model, ...stats });
    if (stats.enriched > 0) revalidateTag(ITEMS_TAG, { expire: 0 });
    const failed = stats.batches > 0 && stats.failedBatches === stats.batches;
    return Response.json({ status: failed ? "failed" : "done", model: config.model, stats }, { status: failed ? 500 : 200 });
  } catch (err) {
    console.error("Enrich run failed", err);
    return Response.json({ status: "failed", error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
