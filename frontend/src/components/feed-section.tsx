import { TypeTabs, TagFilter } from "@/components/feed-filters";
import { EmptyState, Pagination } from "@/components/feed-states";
import { ItemCard } from "@/components/item-card";
import { SearchForm } from "@/components/search-form";
import { getFeed, getLastUpdated } from "@/lib/data";
import { feedHref, parseFeedParams } from "@/lib/feed-params";
import { formatCount, formatDateTime, formatRelative, TYPE_LABELS } from "@/lib/format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Today view or search results, depending on the URL. Streams in behind the page shell. */
export async function FeedSection({ searchParams }: { searchParams: SearchParams }) {
  const params = parseFeedParams(await searchParams);
  const [feed, lastUpdated] = await Promise.all([getFeed(params), getLastUpdated()]);
  const now = new Date();

  const heading = params.q ? "Search results" : "Today";
  const scope = params.type ? TYPE_LABELS[params.type].toLowerCase() : "items";
  const summary = params.q
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

      <SearchForm params={params} />
      <TypeTabs params={params} counts={feed.typeCounts} />
      <TagFilter params={params} counts={feed.tagCounts} />

      {feed.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {feed.items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} now={now} />
              </li>
            ))}
          </ul>
          <Pagination params={params} page={feed.page} pageCount={feed.pageCount} />
        </>
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
