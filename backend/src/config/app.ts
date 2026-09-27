/**
 * IANA time zone that decides where one archive day ends and the next begins
 * (APP_TIMEZONE, default UTC). An invalid value falls back to UTC rather than
 * breaking every page.
 */
export function appTimeZone(): string {
  const tz = process.env.APP_TIMEZONE || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
