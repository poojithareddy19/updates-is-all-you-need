import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_QUERY_LENGTH, type FeedParams } from "@/lib/feed-params";

/**
 * A plain GET form, so search works before JavaScript loads. It keeps the current
 * type tab and starts again from page 1 with no tag.
 */
export function SearchForm({ params }: { params: FeedParams }) {
  return (
    <form action="/" role="search" className="flex gap-2">
      <label htmlFor="search" className="sr-only">
        Search titles and summaries
      </label>
      <div className="relative flex-1">
        <SearchIcon aria-hidden className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          id="search"
          type="search"
          name="q"
          defaultValue={params.q}
          maxLength={MAX_QUERY_LENGTH}
          placeholder='Search, e.g. "open weights" robotics -video'
          className="pl-8"
        />
      </div>
      {params.type && <input type="hidden" name="type" value={params.type} />}
      <Button type="submit">Search</Button>
      {params.q && (
        <Link href={params.type ? `/?type=${params.type}` : "/"} className={buttonVariants({ variant: "ghost" })}>
          Clear
        </Link>
      )}
    </form>
  );
}
