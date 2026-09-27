import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Local env files live at the repo root, shared with the backend scripts.
// Already-set variables win, so on Vercel (no files) this does nothing.
for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), "..", file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const nextConfig: NextConfig = {};

export default nextConfig;
