# Updates Is All You Need

A daily dashboard of AI news, articles, research papers and community discussion. Once a
day it collects items from 12 free sources, removes duplicates, tags them by topic and
shows them in a fast, searchable dashboard. Every item links back to the original.

**Live:** [updates-is-all-you-need.vercel.app](https://updates-is-all-you-need.vercel.app)

## Features

- **Today** (`/`): the items that arrived in the 24 hours up to the latest fetch, newest
  first. The window is anchored to the latest fetch rather than the clock, so a missed run
  shows the previous batch instead of an empty page.
- **Tabs** by type (News, Articles, Research Papers, Community) and **topic chips** (LLMs,
  Agents, Computer Vision, Robotics, AI Policy, Open Source, Funding and more), with counts.
  Filters live in the URL, so every view can be linked.
- **Search** (`/?q=...`) across titles and summaries of everything stored (the last 90
  days), with quotes, `OR` and `-exclude`.
- **Archive** (`/archive`): every day with items, by publish date in `APP_TIMEZONE`.
  `/archive/2026-09-24` shows one day with the same filters and links to the neighbouring
  days.
- **Bookmarks** (`/bookmarks`), kept in the browser's localStorage with no account. Each
  bookmark stores a full copy of the item, so it outlives the 90-day cleanup, and they sync
  between open tabs.
- **Dark and light mode**, following the system until you choose, with no flash of the
  wrong theme. Responsive down to phone width.
- **Last updated** time on every feed, plus loading skeletons, empty states and an error
  screen with retry.
- **Optional AI summaries and tags** with the Claude API (see below).

## Stack

Next.js 16 (App Router, Cache Components) with TypeScript, Tailwind CSS and shadcn/ui;
PostgreSQL with Drizzle ORM (Neon in production); Vercel for hosting and cron; Vitest for
tests.

## Layout

- `backend/`: source config, database schema and migrations, fetchers, the fetch pipeline,
  the optional AI step, scripts and tests. A plain TypeScript package, `@updates/backend`.
- `frontend/`: the Next.js dashboard and the cron routes. It imports the backend package.

The two are npm workspaces, installed together from the repo root.

## Sources

| Type | Sources |
|---|---|
| News | MIT Technology Review (AI), The Verge (AI), TechCrunch (AI), Ars Technica (AI) |
| Articles | OpenAI, Google DeepMind, Google AI Blog, Microsoft Research (AI posts only), Hugging Face Blog |
| Research papers | Hugging Face Daily Papers (all), arXiv cs.AI, cs.LG, cs.CL, cs.CV and stat.ML (newest 200 per run) |
| Community | Hacker News stories matching AI keywords with at least 50 points |

VentureBeat, Anthropic and Meta AI are listed in the config but disabled: VentureBeat
answers automated requests with HTTP 429, and Anthropic and Meta AI publish no RSS feed.
Their announcements still arrive through the news outlets and Hacker News.

## Local setup

Needs Node 20 or newer and a PostgreSQL database (a free Neon branch works well).

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and CRON_SECRET
npm run db:migrate
npm run fetch                # first data
npm run dev                  # http://localhost:3000
```

Other scripts, all run from the repo root:

| Command | What it does |
|---|---|
| `npm test` | Unit tests for fetchers, dedupe, tagging, the run pipeline and the AI step (no network) |
| `npm run typecheck`, `npm run lint` | Type checks and lint |
| `npm run build` | Production build (needs a reachable `DATABASE_URL`, because `/archive` is prerendered) |
| `npm run verify-sources` | Fetches every enabled source once and reports what came back, without touching the database |
| `npm run fetch` | One full fetch run against `DATABASE_URL` |
| `npm run enrich` | One AI run (only with `ANTHROPIC_API_KEY`) |
| `npm run db:generate` | New migration after a schema change |

## Environment variables

Every variable is explained in [`.env.example`](.env.example). Locally they go in
`.env.local` at the repo root; on Vercel, in Project Settings > Environment Variables.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. For Neon, the pooled one (host contains `-pooler`) |
| `CRON_SECRET` | Yes | Protects the cron routes; Vercel Cron sends it automatically |
| `NEXT_PUBLIC_SITE_URL` | In production | Public base URL, used for metadata and the fetchers' user agent |
| `APP_TIMEZONE` | No | IANA zone for archive days and dates (default `UTC`) |
| `ANTHROPIC_API_KEY` | No | Turns on AI summaries and tags |
| `AI_MODEL` | No | Claude model for the AI step (default `claude-opus-5`) |
| `AI_MAX_ITEMS_PER_RUN` | No | Most items per AI run (default 100) |

## Adding a source

1. Add an entry to `sources` in [`backend/src/config/sources.ts`](backend/src/config/sources.ts).
   For an RSS or Atom feed:

   ```ts
   {
     id: "example-blog",          // stable key stored on every item; never rename it
     name: "Example Blog",
     type: "article",             // news | article | paper | community
     kind: "rss",
     url: "https://example.com/feed.xml",
     homepage: "https://example.com/blog",
     enabled: true,
     aiFilter: true,              // optional: keep only AI-related posts
   },
   ```

2. Run `npm run verify-sources` and check that it reports items for the new source.
3. Commit. The next daily run picks it up.

To remove a source, delete it or set `enabled: false` with a `disabledReason`. Topic tag
rules live in [`backend/src/config/tags.ts`](backend/src/config/tags.ts).

## Daily fetch

`/api/cron/fetch` fetches every enabled source in parallel, normalizes items into one
shape, removes duplicates (by cleaned-up URL, arXiv or Hacker News ID, and near-identical
titles from the last 72 hours), tags them, stores what is new and deletes items older than
90 days. A Hacker News thread about an article already stored is attached to that article
instead of being stored twice. Each run is logged in the `fetch_runs` table with fetched,
new and duplicate counts, time taken and any error per source. A failing source is logged
and skipped; the rest still complete.

- **Schedule:** Vercel Cron, daily at 06:00 UTC (`frontend/vercel.json`). On the Hobby plan
  Vercel may start it any time within that hour.
- **Manual trigger:** send the secret as a bearer token. Without it the route answers 401.

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/fetch
  ```

  The response is the run's status and per-source stats.
- **From the command line:** `npm run fetch` does the same run without the web server. It
  cannot expire the site's cache, so a running site shows those items within a few hours.
- **Fallback scheduler:** if Vercel Cron ever misbehaves, the GitHub Actions workflow in
  [`.github/workflows/daily-fetch.yml`](.github/workflows/daily-fetch.yml) calls the same
  route. It only runs by hand until you uncomment its schedule.

Pages send a static shell immediately and stream the feed in. Feed queries are cached
(`frontend/src/lib/data.ts`), and the cron routes expire that cache after every run, so new
items show up on the next visit.

## Optional AI summaries and tags

Off unless `ANTHROPIC_API_KEY` is set. When it is, `/api/cron/enrich` (daily at 08:00 UTC,
two hours after the fetch, so Hobby's timing drift cannot reverse the order) or
`npm run enrich` sends recently fetched items to the Claude API in batches of 20 and
stores:

- a one or two sentence summary, shown on the card with an "AI summary" label and included
  in search. When an item has too little text to summarize faithfully (a bare Hacker News
  title, for example), no summary is stored and the card keeps its source text;
- up to three topic tags chosen from the same fixed list as the keyword rules, replacing
  the keyword tags for that item, so the topic filters keep working.

Each item is processed once (`items.enriched_at`). A run handles at most
`AI_MAX_ITEMS_PER_RUN` items (default 100), news, articles and community first, and stops
starting new batches after 200 seconds; whatever is left waits for the next run. A failed
batch does not stop the others, and its items are retried next run. The fetch never
depends on this step.

Requests use structured outputs (answers are validated against a schema), low effort, and
server-side refusal fallbacks. The model defaults to `claude-opus-5`; set `AI_MODEL` to
change it.

**Cost (estimate, not yet measured):** a batch of 20 items is roughly 4,000 input and
2,000 output tokens, so a full run of 100 items comes to about 20,000 input and 10,000
output tokens. At list prices that is about $0.35 per day with `claude-opus-5`, $0.14 with
`claude-sonnet-5` and $0.07 with `claude-haiku-4-5`. `npm run enrich` prints the real token
counts, so check them after the first run.

## Deployment

The app runs on Vercel's free Hobby plan with a free Neon database. One-time setup:

1. **Database.** Create a Neon project in the AWS US East region, close to Vercel's default
   `iad1` functions. Copy the **pooled** connection string.
2. **Migrate and seed it** from your machine, with the Neon URL only in the current shell
   (PowerShell shown):

   ```powershell
   $env:DATABASE_URL = "<neon pooled connection string>"
   npm run db:migrate
   npm run fetch
   Remove-Item Env:DATABASE_URL
   ```

3. **Vercel project.** In the Vercel dashboard, add a new project, import this GitHub repo
   and set **Root Directory** to `frontend`. Vercel detects Next.js and installs the
   workspaces from the repo root.
4. **Environment variables** for Production and Preview: `DATABASE_URL`, a new random
   `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL` (the production URL, for example
   `https://<project>.vercel.app`), and optionally `APP_TIMEZONE` and `ANTHROPIC_API_KEY`.
5. **Deploy.** The build prerenders `/archive` from the database, then the site is live.
   Both cron jobs appear under Settings > Cron Jobs.

After that, every push to `main` deploys to production and every pull request gets a
preview deployment. Schema changes need `npm run db:migrate` against Neon before the
deploy that uses them.
