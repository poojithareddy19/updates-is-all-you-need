import Link from "next/link";
import { MessageSquareIcon } from "lucide-react";
import type { FeedItem } from "@updates/backend";
import { badgeVariants } from "@/components/ui/badge";
import { feedHref } from "@/lib/feed-params";
import { formatCount, formatDateTime, formatRelative, TYPE_BADGES } from "@/lib/format";

const MAX_AUTHORS_SHOWN = 3;

function discussionLabel(url: string): string {
  const host = new URL(url).hostname;
  if (host === "news.ycombinator.com") return "Hacker News";
  if (host === "huggingface.co") return "Hugging Face";
  return "Discussion";
}

function authorLine(authors: string[]): string | null {
  if (authors.length === 0) return null;
  const shown = authors.slice(0, MAX_AUTHORS_SHOWN).join(", ");
  return authors.length > MAX_AUTHORS_SHOWN ? `${shown} et al.` : shown;
}

export function ItemCard({ item, now }: { item: FeedItem; now: Date }) {
  const summary = item.aiSummary ?? item.summary;
  const authors = item.type === "paper" ? authorLine(item.authors) : null;

  return (
    <article className="bg-card flex flex-col gap-2 rounded-xl border p-4">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={badgeVariants({ variant: "secondary" })}>{TYPE_BADGES[item.type]}</span>
        <span className="text-foreground font-medium">{item.sourceName}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt.toISOString()} title={formatDateTime(item.publishedAt)}>
          {formatRelative(item.publishedAt, now)}
        </time>
      </div>

      <h2 className="text-base leading-snug font-semibold">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </h2>

      {authors && <p className="text-muted-foreground text-xs">{authors}</p>}
      {summary && <p className="text-muted-foreground line-clamp-3 text-sm">{summary}</p>}

      {(item.tags.length > 0 || item.discussionUrl) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {item.tags.map((tag) => (
            <Link key={tag} href={feedHref({ tag })} className={badgeVariants({ variant: "outline" })}>
              {tag}
            </Link>
          ))}
          {item.discussionUrl && (
            <a
              href={item.discussionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 text-xs"
            >
              <MessageSquareIcon aria-hidden className="size-3.5" />
              {item.score !== null && <span className="tabular-nums">{formatCount(item.score)} points ·</span>}
              {discussionLabel(item.discussionUrl)}
              <span className="sr-only"> discussion (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </article>
  );
}
