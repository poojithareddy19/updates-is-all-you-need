import { count, desc } from "drizzle-orm";
import { getDb } from "./client";
import { fetchRuns, items, type FetchRun } from "./schema";

export async function getItemCount(): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(items);
  return row?.value ?? 0;
}

export async function getLatestRun(): Promise<FetchRun | undefined> {
  const [run] = await getDb().select().from(fetchRuns).orderBy(desc(fetchRuns.startedAt)).limit(1);
  return run;
}
