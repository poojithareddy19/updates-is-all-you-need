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

function timeZone(): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
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
