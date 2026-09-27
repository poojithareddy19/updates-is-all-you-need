/**
 * Keyword rules for topic tags. An item gets a tag when any keyword matches its
 * title or summary as a whole word. Matching is case-insensitive, except short
 * all-caps acronyms ("RL", "GPU"), which match case-sensitively and allow a
 * plural "s". Use `patterns` for anything a keyword list cannot express.
 *
 * Prefer specific phrases: "policy" alone would tag every reinforcement
 * learning paper as AI Policy, and "raises" alone matches "raises concerns".
 */

export interface TagRule {
  tag: string;
  keywords: string[];
  patterns?: RegExp[];
}

export const tagRules: TagRule[] = [
  {
    tag: "LLMs",
    keywords: [
      "large language model", "large language models", "language model", "language models", "LLM",
      "GPT", "ChatGPT", "Copilot", "Claude", "Gemini", "Llama", "Mistral", "Qwen", "DeepSeek", "chatbot",
      "chatbots", "reasoning model", "reasoning models", "instruction tuning", "RLHF", "tokenizer",
    ],
  },
  {
    tag: "Agents",
    keywords: ["AI agent", "AI agents", "LLM agents", "agentic", "tool use", "tool calling", "computer use", "multi-agent", "MCP"],
  },
  {
    tag: "Computer Vision",
    keywords: [
      "computer vision", "image generation", "image segmentation", "semantic segmentation",
      "object detection", "vision transformer", "ViT", "diffusion model", "diffusion models",
      "text-to-image", "video generation", "3D reconstruction", "image classification",
    ],
  },
  {
    tag: "Multimodal",
    keywords: [
      "multimodal", "multi-modal", "vision-language", "vision language model", "VLM",
      "text-to-video", "text-to-speech", "speech recognition", "audio generation", "voice model",
    ],
  },
  {
    tag: "Robotics",
    keywords: [
      "robot", "robots", "robotic", "robotics", "humanoid", "humanoids", "embodied",
      "autonomous driving", "self-driving", "robotic manipulation",
    ],
  },
  {
    tag: "AI Safety",
    keywords: [
      "AI safety", "AI alignment", "value alignment", "interpretability", "jailbreak", "jailbreaks",
      "red teaming", "red-teaming", "guardrails", "deceptive", "safety evaluation",
    ],
  },
  {
    tag: "AI Policy",
    keywords: [
      "AI policy", "AI regulation", "regulation", "regulators", "AI Act", "legislation", "lawsuit",
      "copyright", "Senate", "Congress", "executive order", "antitrust", "FTC", "European Commission",
      "Pentagon", "court", "policymakers",
    ],
  },
  {
    tag: "Open Source",
    keywords: ["open source", "open-source", "open weights", "open-weight", "open-weights", "Apache 2.0", "MIT license"],
  },
  {
    tag: "Funding",
    keywords: [
      "funding round", "Series A", "Series B", "Series C", "Series D", "seed round", "valuation",
      "acquires", "acquisition", "IPO", "venture capital", "unicorn",
    ],
    patterns: [/\braise[sd]?\s+(?:a\s+)?\$\d/i, /\$\d+(?:\.\d+)?\s?(?:million|billion|[mb]n?)\b.*\b(?:round|funding|investment)/i],
  },
  {
    tag: "Security",
    keywords: [
      "security", "cybersecurity", "vulnerability", "vulnerabilities", "exploit", "hacked", "hackers",
      "breach", "data leak", "malware", "ransomware", "phishing", "prompt injection", "privacy",
    ],
  },
  {
    tag: "Hardware",
    keywords: [
      "GPU", "Nvidia", "chip", "chips", "chipmaker", "semiconductor", "semiconductors", "TPU",
      "data center", "data centers", "datacenter", "accelerator", "accelerators",
    ],
  },
  {
    tag: "Healthcare",
    keywords: ["medical", "healthcare", "clinical", "drug discovery", "protein", "proteins", "diagnosis", "patients"],
  },
  {
    tag: "Reinforcement Learning",
    keywords: ["reinforcement learning", "reward model", "reward models", "policy gradient", "policy optimization", "RL"],
  },
];

export const TAG_NAMES: readonly string[] = tagRules.map((r) => r.tag);
