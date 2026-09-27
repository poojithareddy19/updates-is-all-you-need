import { connection } from "next/server";
import { enabledSources, getItemCount, getLatestRun } from "@ai-pulse/backend";

// Phase 1 placeholder: proves the frontend can reach the backend package and the database.
export default async function Home() {
  await connection();
  const [itemCount, lastRun] = await Promise.all([getItemCount(), getLatestRun()]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">AI Pulse</h1>
      <p className="text-muted-foreground">Setup check. The dashboard arrives in Phase 4.</p>
      <ul className="list-disc pl-6">
        <li>Database connected, {itemCount} items stored</li>
        <li>{enabledSources().length} sources enabled</li>
        <li>Last fetch run: {lastRun ? lastRun.startedAt.toISOString() : "never"}</li>
      </ul>
    </main>
  );
}
