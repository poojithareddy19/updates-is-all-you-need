import { AI_KEYWORDS, type RssSource } from "../config/sources";
import { firstImageSrc, makeKeywordMatcher, stripHtml } from "../pipeline/text";
import { getText } from "./http";
import type { FetchContext, RawItem } from "./types";
import { asArray, attr, nodeText, parseDate, xmlParser } from "./xml";

type Node = Record<string, unknown>;

/** Most items kept from one feed per run, newest first. */
const MAX_ITEMS_PER_FEED = 100;

const isImage = (node: unknown) => {
  const type = attr(node, "type") ?? "";
  const medium = attr(node, "medium") ?? "";
  const url = attr(node, "url") ?? "";
  return medium === "image" || type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
};

function rssImage(item: Node, html: string): string | undefined {
  for (const media of asArray(item["media:content"])) {
    if (isImage(media)) return attr(media, "url");
    const thumb = (media as Node)?.["media:thumbnail"];
    if (attr(thumb, "url")) return attr(thumb, "url");
  }
  const thumb = attr(item["media:thumbnail"], "url");
  if (thumb) return thumb;
  const enclosure = asArray(item.enclosure).find(isImage);
  if (enclosure) return attr(enclosure, "url");
  return firstImageSrc(html);
}

function splitAuthors(values: string[]): string[] {
  return values
    .flatMap((v) => stripHtml(v).split(/\s*,\s*|\s+and\s+/))
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseRssItem(item: Node): RawItem {
  const guid = item.guid;
  const link = nodeText(asArray(item.link)[0]) || (attr(guid, "isPermaLink") !== "false" ? nodeText(guid) : "");
  const description = nodeText(item.description);
  const content = nodeText(item["content:encoded"]);
  return {
    title: nodeText(item.title),
    url: link,
    summary: description || content,
    authors: splitAuthors([...asArray(item["dc:creator"]).map(nodeText), nodeText(item.author)]),
    publishedAt: parseDate(nodeText(item.pubDate) || nodeText(item["dc:date"])),
    imageUrl: rssImage(item, description || content),
  };
}

function parseAtomEntry(entry: Node): RawItem {
  const links = asArray(entry.link);
  const link = links.find((l) => !attr(l, "rel") || attr(l, "rel") === "alternate") ?? links[0];
  const summary = nodeText(entry.summary);
  const content = nodeText(entry.content);
  return {
    title: nodeText(entry.title),
    url: attr(link, "href") ?? nodeText(link),
    summary: summary || content,
    authors: asArray(entry.author).map((a) => nodeText((a as Node)?.name)).filter(Boolean),
    publishedAt: parseDate(nodeText(entry.published) || nodeText(entry.updated)),
    imageUrl: attr(entry["media:thumbnail"], "url") ?? firstImageSrc(content || summary),
  };
}

/** Parses RSS 2.0 or Atom into raw items. Throws if the document is neither. */
export function parseFeed(xml: string): RawItem[] {
  const doc = xmlParser.parse(xml) as Node;
  const rss = doc.rss as Node | undefined;
  if (rss?.channel) {
    return asArray((rss.channel as Node).item as Node[]).map(parseRssItem);
  }
  const feed = doc.feed as Node | undefined;
  if (feed) return asArray(feed.entry as Node[]).map(parseAtomEntry);
  throw new Error("Not an RSS or Atom feed");
}

const matchesAi = makeKeywordMatcher(AI_KEYWORDS);

export async function fetchRss(source: RssSource, ctx: FetchContext): Promise<RawItem[]> {
  const xml = await getText(source.url, ctx, "application/rss+xml, application/atom+xml, application/xml, text/xml");
  const cutoff = ctx.now.getTime() - ctx.lookbackHours * 3_600_000;
  return parseFeed(xml)
    .filter((item) => item.publishedAt && item.publishedAt.getTime() >= cutoff)
    .filter((item) => !source.aiFilter || matchesAi(`${item.title} ${stripHtml(item.summary ?? "")}`))
    .sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime())
    .slice(0, MAX_ITEMS_PER_FEED);
}
