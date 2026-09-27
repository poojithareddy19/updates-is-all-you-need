# AI Pulse

A daily dashboard of AI news, articles, research papers and community discussion.

Work in progress. Full setup, source and deployment docs land with the final phase.

## Layout

- `backend/` - source config, database schema and migrations, fetchers, pipeline, tests
- `frontend/` - Next.js App Router dashboard (Tailwind CSS, shadcn/ui)

The two are npm workspaces. The frontend imports the backend as `@ai-pulse/backend`.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and CRON_SECRET
npm run db:migrate
npm run dev
```
