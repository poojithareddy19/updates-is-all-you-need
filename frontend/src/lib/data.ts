import { cacheLife, cacheTag } from "next/cache";
import {
  getArchiveDays as queryArchiveDays,
  getFeed as queryFeed,
  getLastUpdated as queryLastUpdated,
  type FeedQuery,
} from "@updates/backend";

/** Every cached read of items carries this tag; the fetch route expires it after each run. */
export const ITEMS_TAG = "items";

// Data only changes when a fetch run finishes, which expires the tag. The "hours"
// lifetime is a safety net in case that invalidation is ever missed.

export async function getFeed(query: FeedQuery) {
  "use cache";
  cacheTag(ITEMS_TAG);
  cacheLife("hours");
  return queryFeed(query);
}

export async function getLastUpdated() {
  "use cache";
  cacheTag(ITEMS_TAG);
  cacheLife("hours");
  return queryLastUpdated();
}

export async function getArchiveDays() {
  "use cache";
  cacheTag(ITEMS_TAG);
  cacheLife("hours");
  return queryArchiveDays();
}
