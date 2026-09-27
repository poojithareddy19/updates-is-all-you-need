"use client";

import { useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/feed-states";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { clearBookmarks, useBookmarks, type BookmarkedItem } from "@/lib/bookmarks";

const noopSubscribe = () => () => {};

export function BookmarkList() {
  const bookmarks = useBookmarks();
  // False during server render and hydration, true after: avoids flashing "no bookmarks".
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [confirming, setConfirming] = useState(false);

  if (!mounted) return <p className="text-muted-foreground text-sm">Loading bookmarks...</p>;

  if (bookmarks.length === 0) {
    return (
      <EmptyState title="No bookmarks yet" action={{ href: "/", label: "Go to Today" }}>
        Use the bookmark icon on any item to save it here.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {bookmarks.length} saved {bookmarks.length === 1 ? "item" : "items"}
        </p>
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm">Remove all?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                clearBookmarks();
                setConfirming(false);
              }}
            >
              Remove all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Clear all
          </Button>
        )}
      </div>
      <SavedItems items={bookmarks} />
    </div>
  );
}

/** Only rendered in the browser, so reading the clock here never runs during prerendering. */
function SavedItems({ items }: { items: BookmarkedItem[] }) {
  const [now] = useState(() => new Date());
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} now={now} />
        </li>
      ))}
    </ul>
  );
}
