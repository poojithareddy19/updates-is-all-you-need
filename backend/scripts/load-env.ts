import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Scripts read the same env files as the Next.js app: .env.local, then .env, at the repo root.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")], quiet: true });
