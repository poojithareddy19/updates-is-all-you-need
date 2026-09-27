import type { ArxivSource } from "../config/sources";
import { arxivAbsUrl, arxivIdFromUrl } from "../pipeline/canonical-url";
import { getText } from "./http";
import type { FetchContext, RawItem } from "./types";
import { asArray, nodeText, parseDate, xmlParser } from "./xml";

type Node = Record<string, unknown>;

/**
 * One query covering every category, newest first. arXiv asks for at most one
 * request every 3 seconds; a single request per run is well inside that.
 * Cross-listed papers appear once because the query ORs the categories.
 */
export function arxivQueryUrl(source: ArxivSource): string {
  const query = source.categories.map((c) => `cat:${c}`).join(" OR ");
  const params = new URLSearchParams({
    search_query: query,
    sortBy: "submittedDate",
    sortOrder: "descending",
    start: "0",
    max_results: String(source.maxResults),
  });
  return `https://export.arxiv.org/api/query?${params}`;
}

export function parseArxiv(xml: string): RawItem[] {
  const doc = xmlParser.parse(xml) as Node;
  const feed = doc.feed as Node | undefined;
  if (!feed) throw new Error("arXiv response is not an Atom feed");
  const entries = asArray(feed.entry as Node[]);
  const first = entries[0];
  if (first && nodeText(first.id).includes("/api/errors")) {
    throw new Error(`arXiv API error: ${nodeText(first.summary)}`);
  }
  const items: RawItem[] = [];
  for (const entry of entries) {
    const id = arxivIdFromUrl(nodeText(entry.id).replace(/^http:/, "https:"));
    if (!id) continue;
    items.push({
      title: nodeText(entry.title),
      url: arxivAbsUrl(id),
      externalId: `arxiv:${id}`,
      summary: nodeText(entry.summary),
      authors: asArray(entry.author).map((a) => nodeText((a as Node)?.name)).filter(Boolean),
      publishedAt: parseDate(nodeText(entry.published)),
    });
  }
  return items;
}

export async function fetchArxiv(source: ArxivSource, ctx: FetchContext): Promise<RawItem[]> {
  // arXiv can be slow to answer large queries; give it more room than the default.
  const xml = await getText(arxivQueryUrl(source), { ...ctx, timeoutMs: Math.max(ctx.timeoutMs, 45_000) }, "application/atom+xml");
  return parseArxiv(xml);
}
