import { ITEM_TYPES } from "@updates/backend/config";
import type { Feed } from "@updates/backend";
import { NavLink } from "@/components/nav-link";
import { feedHref, type FeedParams } from "@/lib/feed-params";
import { formatCount, TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

/** All / News / Articles / Research Papers / Community, with counts for the current search and tag. */
export function TypeTabs({ params, counts, basePath }: { params: FeedParams; counts: Feed["typeCounts"]; basePath: string }) {
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [
    { type: undefined, label: "All", count: all },
    ...ITEM_TYPES.map((type) => ({ type, label: TYPE_LABELS[type], count: counts[type] })),
  ];
  return (
    <nav aria-label="Item type" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 border-b">
        {tabs.map(({ type, label, count }) => {
          const active = params.type === type;
          return (
            <li key={label}>
              <NavLink
                href={feedHref({ ...params, type, page: undefined }, basePath)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-foreground text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {label}
                <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{formatCount(count)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Topic chips. The active one links back to "no tag". */
export function TagFilter({ params, counts, basePath }: { params: FeedParams; counts: Feed["tagCounts"]; basePath: string }) {
  if (counts.length === 0 && !params.tag) return null;
  const shown = params.tag && !counts.some((c) => c.tag === params.tag) ? [{ tag: params.tag, count: 0 }, ...counts] : counts;
  return (
    <nav aria-label="Topic" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
        {shown.map(({ tag, count }) => {
          const active = params.tag === tag;
          return (
            <li key={tag}>
              <NavLink
                href={feedHref({ ...params, tag: active ? undefined : tag, page: undefined }, basePath)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-2.5 text-xs whitespace-nowrap transition-colors",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-muted text-foreground",
                )}
              >
                {tag}
                <span className={cn("ml-1 tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                  {formatCount(count)}
                </span>
                {active && <span className="sr-only"> (selected, click to remove)</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
