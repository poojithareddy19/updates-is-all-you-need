import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * True when an Authorization header is exactly "Bearer <secret>". Vercel Cron
 * sends this header automatically when CRON_SECRET is set. An unset or empty
 * secret rejects everything, so a missing env var never leaves the route open.
 */
export function isAuthorizedCronRequest(authorization: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  // Hashing first gives equal-length buffers, so the comparison is constant time.
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
