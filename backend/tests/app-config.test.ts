import { afterEach, describe, expect, it } from "vitest";
import { appTimeZone, isIsoDay } from "../src/config/app";

describe("isIsoDay", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDay("2026-09-24")).toBe(true);
    expect(isIsoDay("2028-02-29")).toBe(true);
  });

  it("rejects impossible dates and other formats", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2027-02-29", "2026-9-24", "24-09-2026", "banana", "2026-09-24T00:00"]) {
      expect(isIsoDay(bad), bad).toBe(false);
    }
  });
});

describe("appTimeZone", () => {
  const original = process.env.APP_TIMEZONE;
  afterEach(() => {
    process.env.APP_TIMEZONE = original;
  });

  it("uses APP_TIMEZONE when it is a valid zone", () => {
    process.env.APP_TIMEZONE = "America/New_York";
    expect(appTimeZone()).toBe("America/New_York");
  });

  it("falls back to UTC when unset or invalid", () => {
    process.env.APP_TIMEZONE = "";
    expect(appTimeZone()).toBe("UTC");
    process.env.APP_TIMEZONE = "Mars/Olympus_Mons";
    expect(appTimeZone()).toBe("UTC");
  });
});
