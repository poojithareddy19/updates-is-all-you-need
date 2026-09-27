import { z } from "zod";
import type { HfPapersSource } from "../config/sources";
import { arxivAbsUrl } from "../pipeline/canonical-url";
import { getJson } from "./http";
import type { FetchContext, RawItem } from "./types";

const entrySchema = z.object({
  title: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnail: z.string().optional(),
  paper: z.object({
    id: z.string(),
    title: z.string().optional(),
    summary: z.string().optional(),
    publishedAt: z.string().optional(),
    upvotes: z.number().optional(),
    authors: z.array(z.object({ name: z.string().optional() })).optional(),
  }),
});

const toDate = (value: string | undefined) => {
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
};

/**
 * Daily Papers entries are arXiv papers, so they share the arXiv identity and
 * link to the abstract page. The Hugging Face page becomes the discussion link.
 * The date is when the paper was listed, which is what "today" means here.
 */
export function parseHfPapers(json: unknown): RawItem[] {
  if (!Array.isArray(json)) throw new Error("Hugging Face Daily Papers response is not an array");
  const items: RawItem[] = [];
  for (const raw of json) {
    const parsed = entrySchema.safeParse(raw);
    if (!parsed.success) continue;
    const { paper, ...entry } = parsed.data;
    items.push({
      title: entry.title ?? paper.title ?? "",
      url: arxivAbsUrl(paper.id),
      externalId: `arxiv:${paper.id}`,
      summary: paper.summary,
      authors: (paper.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
      publishedAt: toDate(entry.publishedAt) ?? toDate(paper.publishedAt),
      imageUrl: entry.thumbnail,
      discussionUrl: `https://huggingface.co/papers/${paper.id}`,
      score: paper.upvotes,
    });
  }
  return items;
}

export async function fetchHfPapers(source: HfPapersSource, ctx: FetchContext): Promise<RawItem[]> {
  return parseHfPapers(await getJson(source.url, ctx));
}
