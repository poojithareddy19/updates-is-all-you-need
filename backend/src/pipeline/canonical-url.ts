/** URL cleanup for storage, and a looser key for duplicate detection. */

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "yclid", "igshid", "ref", "ref_src", "ref_url",
  "cmpid", "smid", "taid", "mkt_tok", "guccounter", "guce_referrer", "guce_referrer_sig",
]);
const TRACKING_PREFIXES = ["utm_", "mc_", "_hs", "pk_", "vero_"];

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  return TRACKING_PARAMS.has(lower) || TRACKING_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Parses and tidies a URL for storage and display: http(s) only, no fragment,
 * no credentials, no tracking parameters. Returns null for anything else,
 * which also keeps `javascript:` links out of the UI.
 */
export function cleanUrl(raw: string | undefined | null, base?: string): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim(), base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.username = "";
  url.password = "";
  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }
  return url.toString();
}

const ARXIV_HOSTS = new Set(["arxiv.org", "www.arxiv.org", "export.arxiv.org"]);
const ARXIV_ID = String.raw`(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?`;
const ARXIV_PATH = new RegExp(String.raw`^\/(?:abs|pdf|html)\/${ARXIV_ID}(?:\.pdf)?\/?$`);
const HF_PAPER_PATH = new RegExp(String.raw`^\/papers\/${ARXIV_ID}\/?$`);

/** arXiv ID (without version) for arXiv or Hugging Face paper links, else null. */
export function arxivIdFromUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (ARXIV_HOSTS.has(host)) return ARXIV_PATH.exec(url.pathname)?.[1] ?? null;
  if (host === "huggingface.co") return HF_PAPER_PATH.exec(url.pathname)?.[1] ?? null;
  return null;
}

export function arxivAbsUrl(id: string): string {
  return `https://arxiv.org/abs/${id}`;
}

/**
 * Key used to spot the same page behind different URLs: ignores protocol,
 * "www.", trailing slashes, index pages and query parameter order. All links to
 * one arXiv paper (abs, pdf, versions, Hugging Face page) share "arxiv:<id>".
 */
export function urlKey(cleanedUrl: string): string {
  const arxivId = arxivIdFromUrl(cleanedUrl);
  if (arxivId) return `arxiv:${arxivId}`;
  const url = new URL(cleanedUrl);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/index\.html?$/i, "").replace(/\/+$/, "");
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams(params).toString();
  return `${host}${path}${query ? `?${query}` : ""}`;
}
