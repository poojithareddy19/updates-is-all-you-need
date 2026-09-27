import { ITEM_TYPES, TAG_NAMES, type ItemType } from "@updates/backend";

export const MAX_QUERY_LENGTH = 200;

export interface FeedParams {
  q?: string;
  type?: ItemType;
  tag?: string;
  page?: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads the feed filters from the URL, dropping anything invalid instead of failing. */
export function parseFeedParams(raw: RawParams): FeedParams {
  const params: FeedParams = {};
  const q = first(raw.q)?.trim().slice(0, MAX_QUERY_LENGTH);
  if (q) params.q = q;
  const type = first(raw.type);
  if (type && (ITEM_TYPES as readonly string[]).includes(type)) params.type = type as ItemType;
  const tag = first(raw.tag);
  if (tag && TAG_NAMES.includes(tag)) params.tag = tag;
  const page = Number(first(raw.page));
  if (Number.isInteger(page) && page > 1) params.page = page;
  return params;
}

/** Link to the feed with these filters. Omitted or empty values are left out of the URL. */
export function feedHref(params: FeedParams): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.tag) search.set("tag", params.tag);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/?${qs}` : "/";
}
