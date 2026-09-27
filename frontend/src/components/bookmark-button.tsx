"use client";

import { BookmarkIcon } from "lucide-react";
import type { FeedItem } from "@updates/backend";
import { buttonVariants } from "@/components/ui/button";
import { toggleBookmark, useBookmarks, type BookmarkedItem } from "@/lib/bookmarks";
import { cn } from "@/lib/utils";

export function BookmarkButton({ item }: { item: FeedItem | BookmarkedItem }) {
  const saved = useBookmarks().some((b) => b.id === item.id);
  return (
    // A plain button: 30 of these hydrate on every feed page, so keep each one cheap.
    <button
      type="button"
      onClick={() => toggleBookmark(item)}
      aria-pressed={saved}
      aria-label={saved ? `Remove bookmark: ${item.title}` : `Bookmark: ${item.title}`}
      title={saved ? "Remove bookmark" : "Bookmark"}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "-mt-1 -mr-1.5")}
    >
      <BookmarkIcon aria-hidden className={cn(saved && "fill-current")} />
    </button>
  );
}
