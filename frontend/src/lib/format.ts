import { appTimeZone } from "@updates/backend/config";
import type { ItemType } from "@updates/backend";

export const TYPE_LABELS: Record<ItemType, string> = {
  news: "News",
  article: "Articles",
  paper: "Research Papers",
  community: "Community",
};

export const TYPE_BADGES: Record<ItemType, string> = {
  news: "News",
  article: "Article",
  paper: "Paper",
  community: "Community",
};

/** APP_TIMEZONE on the server; the reader's own zone in the browser (bookmarks render there). */
function timeZone(): string | undefined {
  return typeof window === "undefined" ? appTimeZone() : undefined;
}

/** "Sep 27, 2026, 9:14 AM UTC" in APP_TIMEZONE. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone(),
    timeZoneName: "short",
  }).format(date);
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "5 minutes ago", "yesterday", "3 days ago". Falls back to the date after a month. */
export function formatRelative(date: Date, now: Date): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 30 * 86400) return relative.format(Math.round(seconds / 86400), "day");
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: timeZone() }).format(date);
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** "Thursday, September 24, 2026" for a YYYY-MM-DD archive day (a calendar date, no zone shift). */
export function formatDay(day: string, weekday: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday,
    year: "numeric",
    month: weekday === "long" ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/** "September 2026" for a YYYY-MM-DD day. */
export function formatMonth(day: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}
