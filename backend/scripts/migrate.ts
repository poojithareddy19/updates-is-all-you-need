import "./load-env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, getDb } from "../src/db";

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

const db = getDb();
try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied.");
} finally {
  await closeDb();
}
