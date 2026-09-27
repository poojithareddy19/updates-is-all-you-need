import { useSyncExternalStore } from "react";
import type { FeedItem } from "@updates/backend";

/**
 * Bookmarks live in localStorage as full copies of each item, so they outlive the
 * 90-day cleanup and need no account. Dates are stored as ISO strings.
 */
export type BookmarkedItem = Omit<FeedItem, "publishedAt" | "fetchedAt"> & {
  publishedAt: string;
  fetchedAt: string;
  savedAt: string;
};

const STORAGE_KEY = "bookmarks:v1";
const EMPTY: BookmarkedItem[] = [];

let cache: BookmarkedItem[] | null = null;
const listeners = new Set<() => void>();

function isBookmark(value: unknown): value is BookmarkedItem {
  const v = value as BookmarkedItem;
  return typeof v === "object" && v !== null && typeof v.id === "number" && typeof v.title === "string" && typeof v.url === "string";
}

function load(): BookmarkedItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isBookmark) : [];
  } catch {
    return [];
  }
}

function save(next: BookmarkedItem[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or disabled: keep the change for this page view.
  }
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  // Another tab changed the bookmarks.
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  cache = load();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): BookmarkedItem[] {
  cache ??= load();
  return cache;
}

/** Newest saved first. Empty on the server and during hydration. */
export function useBookmarks(): BookmarkedItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function toggleBookmark(item: FeedItem | BookmarkedItem): void {
  const current = getSnapshot();
  if (current.some((b) => b.id === item.id)) {
    save(current.filter((b) => b.id !== item.id));
    return;
  }
  const copy: BookmarkedItem = {
    ...item,
    publishedAt: new Date(item.publishedAt).toISOString(),
    fetchedAt: new Date(item.fetchedAt).toISOString(),
    savedAt: new Date().toISOString(),
  };
  save([copy, ...current]);
}

export function clearBookmarks(): void {
  save([]);
}
