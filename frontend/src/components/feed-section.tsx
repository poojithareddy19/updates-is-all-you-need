import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { TypeTabs, TagFilter } from "@/components/feed-filters";
import { EmptyState, Pagination } from "@/components/feed-states";
import { ItemCard } from "@/components/item-card";
import { SearchForm } from "@/components/search-form";
import { buttonVariants } from "@/components/ui/button";
import { getArchiveDays, getFeed, getLastUpdated } from "@/lib/data";
import { feedHref, parseFeedParams } from "@/lib/feed-params";
import { formatCount, formatDateTime, formatDay, formatRelative, TYPE_LABELS } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Today, search results or one archive day, depending on `day` and the URL.
 * Streams in behind the page shell.
 */
export async function FeedSection({ searchParams, day }: { searchParams: SearchParams; day?: string }) {
  const params = parseFeedParams(await searchParams);
  // Search is global; an archive day only filters by type and tag.
  if (day) delete params.q;
  const basePath = day ? `/archive/${day}` : "/";

  const [feed, lastUpdated] = await Promise.all([getFeed({ ...params, day }), getLastUpdated()]);
  const now = new Date();

  const scope = params.type ? TYPE_LABELS[params.type].toLowerCase() : "items";
  const heading = day ? formatDay(day) : params.q ? "Search results" : "Today";
  const summary = day
    ? `${formatCount(feed.total)} ${scope} published this day`
    : params.q
      ? `${formatCount(feed.total)} ${scope} matching “${params.q}” from the last 90 days`
      : `${formatCount(feed.total)} new ${scope} in the 24 hours up to the latest fetch`;
  const filtered = Boolean(params.type || params.tag);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-muted-foreground text-sm">{summary}</p>
        </div>
        {lastUpdated && (
          <p className="text-muted-foreground text-xs">
            Updated{" "}
            <time dateTime={lastUpdated.toISOString()} title={formatDateTime(lastUpdated)}>
              {formatRelative(lastUpdated, now)}
            </time>
          </p>
        )}
      </div>

      {day ? <DayNav day={day} /> : <SearchForm params={params} />}
      <TypeTabs params={params} counts={feed.typeCounts} basePath={basePath} />
      <TagFilter params={params} counts={feed.tagCounts} basePath={basePath} />

      {feed.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {feed.items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} now={now} />
              </li>
            ))}
          </ul>
          <Pagination params={params} page={feed.page} pageCount={feed.pageCount} basePath={basePath} />
        </>
      ) : day ? (
        <EmptyState
          title={filtered ? `No ${scope} this day` : "Nothing stored for this day"}
          action={filtered ? { href: basePath, label: "Show everything this day" } : { href: "/archive", label: "Browse the archive" }}
        >
          {filtered ? "Nothing published this day matches these filters." : "Items are kept for 90 days, and days before the first fetch are empty."}
        </EmptyState>
      ) : !params.q && !lastUpdated ? (
        <EmptyState title="Nothing here yet">
          No fetch has run so far. Items appear after the first daily run, or trigger one by hand as described in the README.
        </EmptyState>
      ) : params.q ? (
        <EmptyState
          title="No matches"
          action={filtered ? { href: feedHref({ q: params.q }), label: "Search all types and topics" } : undefined}
        >
          Nothing in the last 90 days matches that search{filtered ? " with these filters" : ""}. Try fewer or different words.
        </EmptyState>
      ) : (
        <EmptyState title={`No ${scope} today`} action={filtered ? { href: "/", label: "Show everything" } : undefined}>
          Nothing new matched these filters in the latest fetch.
        </EmptyState>
      )}
    </div>
  );
}

/** Links to the nearest newer and older days that have items. */
async function DayNav({ day }: { day: string }) {
  const days = (await getArchiveDays()).map((d) => d.day);
  // Days are newest first.
  const newer = days.filter((d) => d > day).at(-1);
  const older = days.find((d) => d < day);
  const link = buttonVariants({ variant: "outline", size: "sm" });
  return (
    <nav aria-label="Other days" className="flex items-center justify-between gap-2">
      {older ? (
        <Link href={`/archive/${older}`} className={link} rel="prev">
          <ChevronLeftIcon aria-hidden /> {formatDay(older, "short")}
        </Link>
      ) : (
        <span />
      )}
      <Link href="/archive" className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline">
        All days
      </Link>
      {newer ? (
        <Link href={`/archive/${newer}`} className={link} rel="next">
          {formatDay(newer, "short")} <ChevronRightIcon aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
