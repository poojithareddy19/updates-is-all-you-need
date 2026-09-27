import type { FetchContext } from "./types";

const MAX_BYTES = 8 * 1024 * 1024;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** False for answers that retrying will not change (4xx, bad content). */
    readonly retryable = false,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** One attempt: request plus body read, both inside the same timeout. */
async function attempt(url: string, ctx: FetchContext, accept: string): Promise<string> {
  const host = new URL(url).host;
  try {
    const res = await ctx.fetch(url, {
      headers: { "User-Agent": ctx.userAgent, Accept: accept },
      signal: AbortSignal.timeout(ctx.timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) throw new HttpError(`HTTP ${res.status} from ${host}`, res.status, res.status >= 500);
    const declared = Number(res.headers.get("content-length"));
    if (declared > MAX_BYTES) throw new HttpError(`Response from ${host} is too large (${declared} bytes)`);
    const body = await res.text();
    if (body.length > MAX_BYTES) throw new HttpError(`Response from ${host} is too large`);
    return body;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const reason =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
        ? `timed out after ${ctx.timeoutMs} ms`
        : err instanceof Error
          ? (err.cause instanceof Error ? err.cause.message : err.message)
          : String(err);
    throw new HttpError(`Request to ${host} failed: ${reason}`, undefined, true);
  }
}

/**
 * GETs a URL as text. Retries once after a network error, timeout or 5xx. Never
 * retries 4xx (including 429), so a source that asks us to back off is left alone.
 */
export async function getText(url: string, ctx: FetchContext, accept = "*/*"): Promise<string> {
  try {
    return await attempt(url, ctx, accept);
  } catch (err) {
    if (!(err instanceof HttpError) || !err.retryable) throw err;
    await new Promise((r) => setTimeout(r, 1000));
    return attempt(url, ctx, accept);
  }
}

export async function getJson(url: string, ctx: FetchContext): Promise<unknown> {
  const body = await getText(url, ctx, "application/json");
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(`Invalid JSON from ${new URL(url).host}`);
  }
}
