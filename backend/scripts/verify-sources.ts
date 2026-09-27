/**
 * Fetches every source once and reports what it returned, without touching the
 * database. Run after adding or changing a source:
 *
 *   npm run verify-sources          # enabled sources
 *   npm run verify-sources -- --all # disabled ones too
 *
 * Exits with code 1 if any enabled source fails.
 */
import "./load-env";
import { sources } from "../src/config/sources";
import { defaultFetchContext, fetchSource } from "../src/fetchers";
import { normalizeItem } from "../src/pipeline/normalize";

const includeDisabled = process.argv.includes("--all");
const ctx = defaultFetchContext();
const selected = sources.filter((s) => s.enabled || includeDisabled);

console.log(`Checking ${selected.length} sources (lookback ${ctx.lookbackHours}h)\n`);

const results = await Promise.all(
  selected.map(async (source) => {
    const started = Date.now();
    try {
      const raw = await fetchSource(source, ctx);
      const items = raw.map((r) => normalizeItem(r, source, ctx.now)).filter((i) => i !== null);
      const newest = items.reduce<Date | undefined>((d, i) => (!d || i.publishedAt > d ? i.publishedAt : d), undefined);
      return { source, ok: true as const, raw: raw.length, items, newest, ms: Date.now() - started };
    } catch (err) {
      return { source, ok: false as const, error: err instanceof Error ? err.message : String(err), ms: Date.now() - started };
    }
  }),
);

let failures = 0;
for (const r of results) {
  const label = `${r.source.name} [${r.source.id}]${r.source.enabled ? "" : " (disabled)"}`;
  if (!r.ok) {
    if (r.source.enabled) failures++;
    console.log(`FAIL  ${label}  ${r.ms} ms\n      ${r.error}`);
    if (r.source.disabledReason) console.log(`      disabled because: ${r.source.disabledReason}`);
    continue;
  }
  const withImage = r.items.filter((i) => i.imageUrl).length;
  const tagged = r.items.filter((i) => i.tags.length).length;
  console.log(
    `ok    ${label}  ${r.ms} ms  raw=${r.raw} kept=${r.items.length} images=${withImage} tagged=${tagged}` +
      `  newest=${r.newest?.toISOString() ?? "-"}`,
  );
  const sample = r.items[0];
  if (sample) console.log(`      e.g. "${sample.title}" [${sample.tags.join(", ")}]`);
  if (r.items.length === 0) console.log("      warning: no items inside the lookback window");
}

console.log(`\n${failures === 0 ? "All enabled sources OK." : `${failures} enabled source(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
