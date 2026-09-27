import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | undefined;
let db: Db | undefined;

/**
 * Lazily connects so importing this module never needs DATABASE_URL
 * (for example during `next build`).
 */
export function getDb(): Db {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    client = postgres(url, {
      // Neon's pooler (PgBouncer, transaction mode) does not support prepared statements.
      prepare: false,
      // Serverless functions each hold their own connection; keep it to one there.
      max: process.env.VERCEL ? 1 : 5,
      onnotice: () => {},
    });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  await client?.end({ timeout: 5 });
  client = undefined;
  db = undefined;
}
