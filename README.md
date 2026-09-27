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
  prints a table of per-source counts.
