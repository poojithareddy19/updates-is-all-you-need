import { tagRules } from "../config/tags";
import { keywordRegex } from "./text";

const compiled = tagRules.map((rule) => ({
  tag: rule.tag,
  regexes: [...rule.keywords.map(keywordRegex), ...(rule.patterns ?? [])],
}));

/** Keyword-rule tags for an item, in the order the rules are declared. */
export function tagItem(title: string, summary?: string | null): string[] {
  const text = `${title}\n${summary ?? ""}`;
  return compiled.filter((rule) => rule.regexes.some((re) => re.test(text))).map((rule) => rule.tag);
}
