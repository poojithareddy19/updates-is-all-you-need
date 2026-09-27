import { XMLParser } from "fast-xml-parser";

const ARRAY_TAGS = new Set(["item", "entry", "link", "author", "category", "enclosure", "dc:creator", "media:content"]);

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  // Keep every value a string: a title like "2026" must not become a number.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (tagName) => ARRAY_TAGS.has(tagName),
});

/** Text content of a parsed node, whether it is a string or `{ "#text": ... }`. */
export function nodeText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node && typeof node === "object" && "#text" in node) return nodeText((node as Record<string, unknown>)["#text"]);
  return "";
}

export function attr(node: unknown, name: string): string | undefined {
  if (node && typeof node === "object") {
    const value = (node as Record<string, unknown>)[`@_${name}`];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
