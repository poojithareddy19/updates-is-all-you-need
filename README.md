# Updates Is All You Need

A daily dashboard of AI news, articles, research papers and community discussion.

Work in progress. Full setup, source and deployment docs land with the final phase.

## Layout

- `backend/` - source config, database schema and migrations, fetchers, pipeline, tests
- `frontend/` - Next.js App Router dashboard (Tailwind CSS, shadcn/ui)

The two are npm workspaces. The frontend imports the backend as `@updates/backend`.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and CRON_SECRET
npm run db:migrate
npm run dev
```

## Dashboard

- **Today** (`/`) lists the items that arrived in the 24 hours up to the latest fetch, newest
  first. Anchoring the window to the latest fetch rather than the clock means a missed run
  shows yesterday's batch instead of an empty page.
- **Tabs** filter by type (News, Articles, Research Papers, Community) and **topic chips** by
  tag. Both show counts and live in the URL, so every view can be linked and bookmarked.
- **Search** (`/?q=...`) covers titles and summaries of everything stored (the last 90
  days) and supports quotes, `OR` and `-exclude`.

- **Archive** (`/archive`) lists every day with items, by publish date in `APP_TIMEZONE`;
  `/archive/2026-09-24` shows one day with the same tabs and topic filters, plus links to
  the neighbouring days.
- **Bookmarks** (`/bookmarks`) are kept in the browser's localStorage, no account needed.
  Each bookmark stores a full copy of the item, so it stays after the 90-day cleanup.
  They sync between open tabs.
- **Dark mode** follows the system setting until you pick one with the header toggle; the
  choice is applied before the first paint, so there is no flash of the wrong theme.

Pages send a static shell immediately and stream the feed in. Feed queries are cached
(`frontend/src/lib/data.ts`) and the cron route expires that cache after every run, so a
fetch shows up on the next visit. `/archive` is prerendered at build time, so
`npm run build` needs a reachable `DATABASE_URL` (Vercel provides it during the build).

## Daily fetch

`/api/cron/fetch` fetches every enabled source, removes duplicates, stores new items,
deletes items older than 90 days and logs the run in the `fetch_runs` table. One failing
source is logged and skipped; the rest still complete.

- **Schedule:** Vercel Cron calls it every day at 06:00 UTC (`frontend/vercel.json`).
- **Manual trigger:** send the secret as a bearer token. Without it the route answers 401.

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/fetch
  ```

- **From the command line:** `npm run fetch` does the same run without the web server and
  prints a table of per-source counts. It cannot expire the site's cache, so a running site
  shows those items within a few hours rather than right away.
