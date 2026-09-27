import { describe, expect, it } from "vitest";
import { tagItem } from "../src/pipeline/tagging";

describe("tagItem", () => {
  it("tags from title and summary", () => {
    expect(tagItem("New open-weights LLM released", "Available under Apache 2.0")).toEqual(["LLMs", "Open Source"]);
  });

  it("does not treat reinforcement learning policies as AI Policy", () => {
    const tags = tagItem("Policy optimization for robotic manipulation", "We train a policy with reinforcement learning.");
    expect(tags).toContain("Reinforcement Learning");
    expect(tags).toContain("Robotics");
    expect(tags).not.toContain("AI Policy");
  });

  it("tags funding news but not 'raises concerns'", () => {
    expect(tagItem("Startup raises $40 million to build AI agents")).toContain("Funding");
    expect(tagItem("New model raises concerns among researchers")).not.toContain("Funding");
  });

  it("matches acronyms case-sensitively", () => {
    expect(tagItem("Scaling RL for reasoning")).toContain("Reinforcement Learning");
    expect(tagItem("Girl scouts visit the lab")).not.toContain("Reinforcement Learning");
  });

  it("returns no tags for unrelated text", () => {
    expect(tagItem("The mayor said the bridge reopens Monday")).toEqual([]);
  });
});
