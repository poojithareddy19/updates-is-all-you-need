import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/feed-states";
import { Skeleton } from "@/components/ui/skeleton";
import { getArchiveDays } from "@/lib/data";
import { formatCount, formatDay, formatMonth, TYPE_BADGES } from "@/lib/format";
import { ITEM_TYPES } from "@updates/backend/config";

export const metadata: Metadata = {
  title: "Archive",
  description: "Browse AI news, articles, papers and discussion by day, for the last 90 days.",
};

export default function ArchivePage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="text-muted-foreground text-sm">Every day with items, by publish date. Items are kept for 90 days.</p>
      </div>
      <Suspense fallback={<ArchiveSkeleton />}>
        <ArchiveDays />
      </Suspense>
    </div>
  );
}

async function ArchiveDays() {
  const days = await getArchiveDays();
  if (days.length === 0) {
    return <EmptyState title="The archive is empty">Days appear here after the first fetch.</EmptyState>;
  }

  const months = new Map<string, typeof days>();
  for (const d of days) {
    const key = d.day.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), d]);
  }

  return (
    <div className="flex flex-col gap-6">
      {[...months.values()].map((monthDays) => (
        <section key={monthDays[0]!.day} aria-labelledby={`m-${monthDays[0]!.day}`}>
          <h2 id={`m-${monthDays[0]!.day}`} className="text-muted-foreground mb-2 text-sm font-medium">
            {formatMonth(monthDays[0]!.day)}
          </h2>
          <ul className="divide-y rounded-xl border">
            {monthDays.map((d) => (
              <li key={d.day}>
                <Link
                  href={`/archive/${d.day}`}
                  className="hover:bg-muted/50 flex flex-col gap-1 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{formatDay(d.day)}</span>
                  <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs tabular-nums">
                    <span className="text-foreground">{formatCount(d.total)} items</span>
                    {ITEM_TYPES.filter((t) => d.byType[t] > 0).map((t) => (
                      <span key={t}>
                        {formatCount(d.byType[t])} {TYPE_BADGES[t].toLowerCase()}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ArchiveSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading days">
      <Skeleton className="mb-1 h-4 w-32" />
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
