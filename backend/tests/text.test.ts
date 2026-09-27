import { describe, expect, it } from "vitest";
import { decodeEntities, firstImageSrc, keywordRegex, makeKeywordMatcher, stripHtml, truncate } from "../src/pipeline/text";

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Tom &amp; Jerry&#8217;s &#x2014; &hellip;")).toBe("Tom & Jerry’s — …");
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&notanentity; &#0;")).toBe("&notanentity; &#0;");
  });
});

describe("stripHtml", () => {
  it("removes tags, figures and double-encoded entities", () => {
    expect(stripHtml("<figure><img src='x'><figcaption>cap</figcaption></figure><p>Hello&amp;#8217;s <b>world</b></p>")).toBe(
      "Hello’s world",
    );
  });

  it("keeps comparison signs that are not tags", () => {
    expect(stripHtml("a < b and c > d")).toBe("a < b and c > d");
  });
});

describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("cuts on a word boundary and adds an ellipsis", () => {
    const out = truncate("one two three four five six seven", 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out).toBe("one two three four…");
  });
});

describe("firstImageSrc", () => {
  it("finds the first image source", () => {
    expect(firstImageSrc('<p>x</p><img alt="a" src="https://e.com/a.png"><img src="b.png">')).toBe("https://e.com/a.png");
    expect(firstImageSrc("<p>none</p>")).toBeUndefined();
  });
});

describe("keywordRegex", () => {
  it("matches acronyms case-sensitively as whole words, with plurals", () => {
    const re = keywordRegex("AI");
    expect(re.test("New AI model")).toBe(true);
    expect(re.test("AI-powered tools")).toBe(true);
    expect(re.test("Rogue AIs")).toBe(true);
    expect(re.test("the mayor said")).toBe(false);
    expect(re.test("OpenAI ships")).toBe(false);
    expect(re.test("ai")).toBe(false);
  });

  it("matches phrases case-insensitively across whitespace", () => {
    const re = keywordRegex("open source");
    expect(re.test("Fully Open  Source release")).toBe(true);
    expect(re.test("opensource")).toBe(false);
  });

  it("escapes regex characters", () => {
    expect(keywordRegex("Apache 2.0").test("Licensed under Apache 2.0.")).toBe(true);
    expect(keywordRegex("Apache 2.0").test("Apache 2x0")).toBe(false);
  });
});

describe("makeKeywordMatcher", () => {
  it("matches when any keyword is present", () => {
    const matches = makeKeywordMatcher(["LLM", "machine learning"]);
    expect(matches("Scaling LLMs")).toBe(true);
    expect(matches("Machine Learning at scale")).toBe(true);
    expect(matches("Gardening tips")).toBe(false);
  });
});
