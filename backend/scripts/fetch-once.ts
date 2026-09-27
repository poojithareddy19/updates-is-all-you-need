/**
 * Runs the daily fetch once from the command line, against DATABASE_URL:
 *
 *   npm run fetch
 *
 * Does the same work as /api/cron/fetch and is logged in fetch_runs with trigger
 * "script". Exits with code 1 if the run failed.
 */
import "./load-env";
import { sources } from "../src/config/sources";
import { closeDb, createRunStore } from "../src/db";
import { runFetch } from "../src/pipeline/run";

const started = Date.now();
try {
  const { runId, status, stats } = await runFetch({ trigger: "script", store: createRunStore() });
  const names = new Map(sources.map((s) => [s.id, s.name]));
  const width = Math.max(...Object.keys(stats.sources).map((id) => (names.get(id) ?? id).length));

  console.log(`Run ${runId}: ${status} in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
  console.log(`${"source".padEnd(width)}  fetched      new     dupes     time`);
  for (const [id, s] of Object.entries(stats.sources)) {
    const cols = [s.fetched, s.new, s.duplicates].map((n) => String(n).padStart(7)).join("  ");
    console.log(`${(names.get(id) ?? id).padEnd(width)}  ${cols}  ${String(s.durationMs).padStart(6)} ms`);
    if (s.error) console.log(`${"".padEnd(width)}  error: ${s.error}`);
  }
  const t = stats.totals;
  console.log(`\nTotal: ${t.fetched} fetched, ${t.new} new, ${t.duplicates} duplicates, ${t.failedSources} failed sources, ${stats.pruned} pruned`);
  process.exitCode = status === "failed" ? 1 : 0;
} catch (err) {
  console.error("Run failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
