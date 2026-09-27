import type { Metadata } from "next";
import { BookmarkList } from "@/components/bookmark-list";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Items you saved in this browser.",
};

export default function BookmarksPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground text-sm">
          Saved in this browser only. A bookmark keeps its own copy, so it stays after the item leaves the 90-day archive.
        </p>
      </div>
      <BookmarkList />
    </div>
  );
}
