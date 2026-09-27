/**
 * Content sources for the daily fetch.
 *
 * To add a source, append an entry to `sources` and run `npm run verify-sources`.
 * To remove one, delete it or set `enabled: false` with a `disabledReason`.
 */

export const ITEM_TYPES = ["news", "article", "paper", "community"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

interface BaseSource {
  /** Stable key stored on every item. Never rename once data exists. */
  id: string;
  name: string;
  type: ItemType;
  homepage: string;
  enabled: boolean;
  /** Why a source is disabled, shown in verify-sources output. */
  disabledReason?: string;
}

export interface RssSource extends BaseSource {
  kind: "rss";
  url: string;
  /** Keep only items matching the AI keyword list (for feeds that are not AI-only). */
  aiFilter?: boolean;
}

export interface ArxivSource extends BaseSource {
  kind: "arxiv";
  categories: string[];
  /** Upper bound on papers stored per run, newest first. */
  maxResults: number;
}

export interface HfPapersSource extends BaseSource {
  kind: "hf-papers";
  url: string;
}

export interface HackerNewsSource extends BaseSource {
  kind: "hackernews";
  /** Stories matching any of these (title or URL) are kept. */
  keywords: string[];
  minPoints: number;
}

export type Source = RssSource | ArxivSource | HfPapersSource | HackerNewsSource;

/**
 * Words that mark a story as AI-related. Used for Hacker News and for feeds with
 * `aiFilter: true`. Short all-caps acronyms match case-sensitively.
 */
export const AI_KEYWORDS = [
  "AI", "A.I.", "AGI", "LLM", "GPT", "ChatGPT", "Claude", "Gemini", "Llama", "Mistral", "DeepSeek", "Qwen",
  "OpenAI", "Anthropic", "DeepMind", "Hugging Face", "Copilot", "artificial intelligence",
  "machine learning", "deep learning", "neural network", "neural networks", "language model",
  "language models", "transformer", "transformers", "diffusion model", "reinforcement learning",
  "inference", "fine-tuning", "embedding", "embeddings", "chatbot", "agentic", "robotics",
];

/** Items older than this (by published date) are ignored on each run. */
export const LOOKBACK_HOURS = 72;

/** Items older than this are deleted at the end of each run. */
export const RETENTION_DAYS = 90;

export const sources: Source[] = [
  // News outlets
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    type: "news",
    kind: "rss",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    homepage: "https://www.technologyreview.com/topic/artificial-intelligence/",
    enabled: true,
  },
  {
    id: "the-verge",
    name: "The Verge",
    type: "news",
    kind: "rss",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    homepage: "https://www.theverge.com/ai-artificial-intelligence",
    enabled: true,
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    type: "news",
    kind: "rss",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    homepage: "https://techcrunch.com/category/artificial-intelligence/",
    enabled: true,
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    type: "news",
    kind: "rss",
    url: "https://arstechnica.com/ai/feed/",
    homepage: "https://arstechnica.com/ai/",
    enabled: true,
  },
  {
    id: "venturebeat",
    name: "VentureBeat",
    type: "news",
    kind: "rss",
    url: "https://venturebeat.com/category/ai/feed/",
    homepage: "https://venturebeat.com/category/ai/",
    enabled: false,
    disabledReason: "Feed answers HTTP 429 to automated clients (checked 2026-09-26).",
  },

  // Official blogs
  {
    id: "openai",
    name: "OpenAI",
    type: "article",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    homepage: "https://openai.com/news/",
    enabled: true,
  },
  {
    id: "google-deepmind",
    name: "Google DeepMind",
    type: "article",
    kind: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    homepage: "https://deepmind.google/discover/blog/",
    enabled: true,
  },
  {
    id: "google-ai",
    name: "Google AI Blog",
    type: "article",
    kind: "rss",
    url: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    homepage: "https://blog.google/technology/ai/",
    enabled: true,
  },
  {
    id: "microsoft-research",
    name: "Microsoft Research",
    type: "article",
    kind: "rss",
    url: "https://www.microsoft.com/en-us/research/feed/",
    homepage: "https://www.microsoft.com/en-us/research/blog/",
    enabled: true,
    aiFilter: true,
  },
  {
    id: "hugging-face-blog",
    name: "Hugging Face Blog",
    type: "article",
    kind: "rss",
    url: "https://huggingface.co/blog/feed.xml",
    homepage: "https://huggingface.co/blog",
    enabled: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "article",
    kind: "rss",
    url: "https://www.anthropic.com/rss.xml",
    homepage: "https://www.anthropic.com/news",
    enabled: false,
    disabledReason: "No official RSS feed (404, checked 2026-09-26). Covered via news and Hacker News.",
  },
  {
    id: "meta-ai",
    name: "Meta AI",
    type: "article",
    kind: "rss",
    url: "https://ai.meta.com/blog/rss/",
    homepage: "https://ai.meta.com/blog/",
    enabled: false,
    disabledReason: "No official RSS feed (404, checked 2026-09-26). Covered via news and Hacker News.",
  },

  // Research papers
  {
    id: "hf-daily-papers",
    name: "Hugging Face Daily Papers",
    type: "paper",
    kind: "hf-papers",
    url: "https://huggingface.co/api/daily_papers",
    homepage: "https://huggingface.co/papers",
    enabled: true,
  },
  {
    id: "arxiv",
    name: "arXiv",
    type: "paper",
    kind: "arxiv",
    categories: ["cs.AI", "cs.LG", "cs.CL", "cs.CV", "stat.ML"],
    maxResults: 200,
    homepage: "https://arxiv.org/",
    enabled: true,
  },

  // Community
  {
    id: "hacker-news",
    name: "Hacker News",
    type: "community",
    kind: "hackernews",
    keywords: AI_KEYWORDS,
    minPoints: 50,
    homepage: "https://news.ycombinator.com/",
    enabled: true,
  },
];

export function enabledSources(): Source[] {
  return sources.filter((s) => s.enabled);
}
