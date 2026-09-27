import { revalidatePath } from "next/cache";
import { createRunStore, isAuthorizedCronRequest, runFetch } from "@updates/backend";

// Vercel Hobby caps functions at 60 s. Each source has a 45 s deadline and they run
// in parallel, which leaves room for the database work.
export const maxDuration = 60;

/**
 * Runs the daily fetch. Vercel Cron calls it with GET once a day; trigger it by hand with
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/fetch
 *
 * Responds 401 without the right secret, 200 when the run finished (even if some
 * sources failed, see `status` and `stats`), and 500 when the run failed.
 */
async function handle(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trigger = request.headers.get("user-agent")?.startsWith("vercel-cron/") ? "cron" : "manual";
  try {
    const { runId, status, stats } = await runFetch({ trigger, store: createRunStore() });
    // Every page shows items or the last-updated time, so refresh them all.
    revalidatePath("/", "layout");
    return Response.json({ runId, status, stats }, { status: status === "failed" ? 500 : 200 });
  } catch (err) {
    console.error("Fetch run failed", err);
    return Response.json(
      { status: "failed", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
