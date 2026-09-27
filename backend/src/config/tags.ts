/**
 * Keyword rules for topic tags. An item gets a tag when any keyword matches its
 * title or summary as a whole word (case-insensitive, except where noted).
 */

export interface TagRule {
  tag: string;
  keywords: string[];
  /** Keywords matched case-sensitively, for short acronyms like "AI" or "RL". */
  caseSensitive?: string[];
}

export const tagRules: TagRule[] = [
  {
    tag: "LLMs",
    keywords: [
      "large language model", "language model", "llm", "llms", "gpt", "chatgpt", "claude",
      "gemini", "llama", "mistral", "qwen", "deepseek", "chatbot", "prompt", "tokenizer",
      "reasoning model", "instruction tuning", "rlhf",
    ],
  },
  {
    tag: "Agents",
    keywords: ["agent", "agents", "agentic", "tool use", "tool calling", "computer use", "mcp"],
  },
  {
    tag: "Computer Vision",
    keywords: [
      "computer vision", "image generation", "image segmentation", "object detection",
      "vision transformer", "diffusion model", "text-to-image", "video generation", "3d reconstruction",
    ],
    caseSensitive: ["ViT"],
  },
  {
    tag: "Multimodal",
    keywords: ["multimodal", "vision-language", "vision language model", "vlm", "text-to-video", "speech", "audio"],
  },
  {
    tag: "Robotics",
    keywords: ["robot", "robots", "robotics", "humanoid", "embodied", "manipulation", "autonomous driving", "self-driving"],
  },
  {
    tag: "AI Safety",
    keywords: ["ai safety", "alignment", "interpretability", "jailbreak", "red teaming", "misuse", "guardrail", "guardrails"],
  },
  {
    tag: "AI Policy",
    keywords: [
      "regulation", "regulators", "policy", "ai act", "legislation", "lawsuit", "copyright",
      "senate", "congress", "executive order", "antitrust", "ftc", "eu commission",
    ],
  },
  {
    tag: "Open Source",
    keywords: ["open source", "open-source", "open weights", "open-weight", "open model", "github", "apache 2.0"],
  },
  {
    tag: "Funding",
    keywords: [
      "raises", "raised", "funding", "series a", "series b", "series c", "seed round",
      "valuation", "acquires", "acquisition", "ipo", "investment", "investors",
    ],
  },
  {
    tag: "Hardware",
    keywords: ["gpu", "gpus", "nvidia", "chip", "chips", "semiconductor", "tpu", "data center", "datacenter", "accelerator"],
  },
  {
    tag: "Healthcare",
    keywords: ["medical", "healthcare", "clinical", "drug discovery", "protein", "biology", "diagnosis"],
  },
  {
    tag: "Reinforcement Learning",
    keywords: ["reinforcement learning", "reward model", "policy gradient"],
    caseSensitive: ["RL"],
  },
];
