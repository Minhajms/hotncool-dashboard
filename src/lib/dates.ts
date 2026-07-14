// Date + week helpers. Business rules:
//  - Timezone: Qatar (UTC+3), no daylight saving.
//  - Weeks run Thursday -> Wednesday, anchored on 2026-06-18 (= Week 1 start).

export const QATAR_TZ = "Asia/Qatar";
export const WEEK_ANCHOR = "2026-06-18"; // a Thursday, start of Week 1

/** Today's date in Qatar as "YYYY-MM-DD". */
export function qatarToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QATAR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Parse "YYYY-MM-DD" into a UTC-noon Date (avoids timezone drift in math). */
export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const d = parseYMD(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return toYMD(d);
}

/** Start (Thursday) of the Thu–Wed week containing `ymd`. */
export function weekStartFor(ymd: string): string {
  const d = parseYMD(ymd);
  const dow = d.getUTCDay(); // 0=Sun ... 4=Thu
  // days since the most recent Thursday
  const diff = (dow - 4 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return toYMD(d);
}

export function weekEndFor(ymd: string): string {
  return addDays(weekStartFor(ymd), 6);
}

/** Week number relative to the anchor (Week 1 = anchor week). */
export function weekNumberFor(ymd: string): number {
  const start = parseYMD(weekStartFor(ymd));
  const anchor = parseYMD(WEEK_ANCHOR);
  const days = Math.round((start.getTime() - anchor.getTime()) / 86400000);
  return Math.floor(days / 7) + 1;
}

/** Human label like "Thu 9 Jul – Wed 15 Jul 2026". */
export function weekLabel(weekStart: string): string {
  const s = parseYMD(weekStart);
  const e = parseYMD(addDays(weekStart, 6));
  const fmt = (d: Date, withYear = false) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(d);
  return `${fmt(s)} – ${fmt(e, true)}`;
}

/** Format a UTC timestamp as Qatar local, e.g. "14 Jul 2026, 18:42". */
export function formatQatar(ts: string | Date | null): string {
  if (!ts) return "—";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: QATAR_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
