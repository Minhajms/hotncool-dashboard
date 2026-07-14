import { qatarToday, addDays, parseYMD, toYMD } from "./dates";

export type DateRange = { from: string; to: string; preset: string };

// Earliest data we care about (project baseline started mid-June 2026).
export const DATA_START = "2026-06-01";

/** Resolve a range from URL search params, with sensible presets + defaults. */
export function resolveRange(sp: Record<string, string | string[] | undefined>): DateRange {
  const today = qatarToday();
  const preset = (typeof sp.preset === "string" ? sp.preset : "") || "";
  const rawFrom = typeof sp.from === "string" ? sp.from : "";
  const rawTo = typeof sp.to === "string" ? sp.to : "";

  const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  switch (preset) {
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y, preset };
    }
    case "last7":
      return { from: addDays(today, -6), to: today, preset };
    case "last30":
      return { from: addDays(today, -29), to: today, preset };
    case "thismonth":
      return { from: today.slice(0, 8) + "01", to: today, preset };
    case "all":
      return { from: DATA_START, to: today, preset };
  }

  // custom or default
  if (valid(rawFrom) && valid(rawTo)) {
    const from = rawFrom <= rawTo ? rawFrom : rawTo;
    const to = rawFrom <= rawTo ? rawTo : rawFrom;
    return { from, to, preset: "custom" };
  }

  // default: last 30 days
  return { from: addDays(today, -29), to: today, preset: "last30" };
}

/** All dates (YYYY-MM-DD) inclusive between from and to. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let d = parseYMD(from);
  const end = parseYMD(to);
  let guard = 0;
  while (d.getTime() <= end.getTime() && guard < 1000) {
    out.push(toYMD(d));
    d = parseYMD(addDays(toYMD(d), 1));
    guard++;
  }
  return out;
}

export function rangeDays(from: string, to: string): number {
  return eachDate(from, to).length;
}

/** Human label, e.g. "15 Jun – 14 Jul 2026" or a single day. */
export function rangeLabel(from: string, to: string): string {
  const fmt = (ymd: string, withYear = true) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(parseYMD(ymd));
  if (from === to) return fmt(from);
  return `${fmt(from, false)} – ${fmt(to)}`;
}
