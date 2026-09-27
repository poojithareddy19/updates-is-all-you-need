import { describe, expect, it } from "vitest";
import { arxivIdFromUrl, cleanUrl, urlKey } from "../src/pipeline/canonical-url";

describe("cleanUrl", () => {
  it("removes tracking parameters, fragments and credentials", () => {
    expect(cleanUrl("https://user:pw@Example.com/a?utm_source=rss&id=7&fbclid=x&ref=hn#section")).toBe("https://example.com/a?id=7");
  });

  it("drops the empty query string once all parameters are removed", () => {
    expect(cleanUrl("https://example.com/a/?utm_medium=feed")).toBe("https://example.com/a/");
  });

  it("rejects non-http schemes and garbage", () => {
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("mailto:a@b.c")).toBeNull();
    expect(cleanUrl("not a url")).toBeNull();
    expect(cleanUrl("")).toBeNull();
    expect(cleanUrl(undefined)).toBeNull();
  });

  it("resolves relative URLs against a base", () => {
    expect(cleanUrl("/img/a.png", "https://example.com/post/1")).toBe("https://example.com/img/a.png");
  });
});

describe("urlKey", () => {
  it("ignores protocol, www, trailing slash, index pages and parameter order", () => {
    const keys = [
      "http://www.example.com/story/?b=2&a=1",
      "https://example.com/story?a=1&b=2",
      "https://example.com/story/index.html?a=1&b=2",
    ].map((u) => urlKey(cleanUrl(u)!));
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("example.com/story?a=1&b=2");
  });

  it("keeps different paths apart", () => {
    expect(urlKey("https://example.com/a")).not.toBe(urlKey("https://example.com/b"));
  });

  it("gives every link to one arXiv paper the same key", () => {
    const links = [
      "https://arxiv.org/abs/2609.00001",
      "http://arxiv.org/abs/2609.00001v3",
      "https://arxiv.org/pdf/2609.00001v1.pdf",
      "https://export.arxiv.org/abs/2609.00001",
      "https://huggingface.co/papers/2609.00001",
    ];
    expect(new Set(links.map(urlKey))).toEqual(new Set(["arxiv:2609.00001"]));
  });
});

describe("arxivIdFromUrl", () => {
  it("handles new and old style identifiers", () => {
    expect(arxivIdFromUrl("https://arxiv.org/abs/2609.12345v2")).toBe("2609.12345");
    expect(arxivIdFromUrl("https://arxiv.org/abs/cs/0112017v1")).toBe("cs/0112017");
  });

  it("ignores non-paper pages", () => {
    expect(arxivIdFromUrl("https://arxiv.org/list/cs.AI/recent")).toBeNull();
    expect(arxivIdFromUrl("https://huggingface.co/blog/some-post")).toBeNull();
    expect(arxivIdFromUrl("https://example.com/abs/2609.00001")).toBeNull();
  });
});
