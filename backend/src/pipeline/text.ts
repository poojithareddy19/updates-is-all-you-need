/** Small text helpers shared by fetchers, normalization and tagging. */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  eacute: "é",
  egrave: "è",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
};

/** Decodes HTML entities. Feeds often double-encode them (TechCrunch titles do). */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Turns an HTML fragment into plain text with collapsed whitespace. */
export function stripHtml(input: string): string {
  const withoutTags = input
    .replace(/<(script|style|figure|figcaption)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Only strip things that look like tags, so text such as "a < b" survives.
    .replace(/<\/?[a-z][^<>]*>/gi, " ");
  return decodeEntities(decodeEntities(withoutTags)).replace(/\s+/g, " ").trim();
}

/** Cuts text to at most `max` characters on a word boundary, adding an ellipsis. */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** First `<img src>` in an HTML fragment, if any. */
export function firstImageSrc(html: string): string | undefined {
  return /<img\b[^>]*?\bsrc=["']([^"']+)["']/i.exec(html)?.[1];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word, case-insensitive regex for a keyword. Short all-caps acronyms
 * ("AI", "LLM", "RL") match case-sensitively and allow a plural "s".
 */
export function keywordRegex(keyword: string): RegExp {
  const isAcronym = /^[A-Z][A-Z0-9]{1,4}$/.test(keyword);
  const body = escapeRegex(keyword).replace(/\s+/g, "\\s+") + (isAcronym ? "s?" : "");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, isAcronym ? "u" : "iu");
}

export function makeKeywordMatcher(keywords: string[]): (text: string) => boolean {
  const regexes = keywords.map(keywordRegex);
  return (text) => regexes.some((re) => re.test(text));
}
