import { supabaseAdmin } from "./supabase";
import { qatarToday, addDays } from "./dates";

const ENDPOINT =
  "https://www.clarity.ms/export-data/api/v1/project-live-insights";

export type ClarityResult = {
  ok: boolean;
  date?: string;
  error?: string;
};

type Metric = {
  metricName: string;
  information: Record<string, unknown>[];
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

/**
 * Clarity's export API returns aggregated metrics for the last `numOfDays`
 * (no per-day breakdown, max 3 days, ~10 calls/day). We pull the last full day
 * and store one snapshot row keyed by that date, building history over time.
 * NOTE: this Clarity project tracks the MOBILE APP (Flutter, iOS+Android),
 * not the website — confirmed via PopularScreens (FlutterActivity etc.).
 */
export async function syncClarity(): Promise<ClarityResult> {
  const token = process.env.CLARITY_TOKEN;
  if (!token) return { ok: false, error: "CLARITY_TOKEN is not set" };

  // numOfDays=1 = the most recent complete day (yesterday in Qatar).
  const date = addDays(qatarToday(), -1);

  try {
    const res = await fetch(`${ENDPOINT}?numOfDays=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, date, error: `${res.status}: ${t.slice(0, 200)}` };
    }
    const metrics = (await res.json()) as Metric[];
    const by = (name: string) =>
      metrics.find((m) => m.metricName === name)?.information ?? [];

    const traffic = by("Traffic")[0] ?? {};
    const engage = by("EngagementTime")[0] ?? {};
    const os = by("OS");
    const country = by("Country");
    const iosSessions = n(os.find((o) => String(o.name).toUpperCase() === "IOS")?.sessionsCount);
    const androidSessions = n(os.find((o) => String(o.name).toUpperCase() === "ANDROID")?.sessionsCount);

    const row = {
      date,
      sessions: n(traffic.totalSessionCount),
      distinct_users: n(traffic.distinctUserCount),
      bot_sessions: n(traffic.totalBotSessionCount),
      screens_per_session: Number(traffic.screensPerSessionPercentage ?? 0),
      engagement_total: n(engage.totalTime),
      engagement_active: n(engage.activeTime),
      dead_taps: n(by("DeadTapCount")[0]?.subTotal),
      rage_taps: n(by("RageTapCount")[0]?.subTotal),
      errors: n(by("ApplicationErrorCount")[0]?.subTotal),
      ios_sessions: iosSessions,
      android_sessions: androidSessions,
      top_country: String(country[0]?.name ?? ""),
      raw: metrics, // full API snapshot (screens, countries, …) for the detail page
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabaseAdmin
      .from("clarity_daily")
      .upsert(row, { onConflict: "date" });
    if (error && /raw/.test(error.message)) {
      // 'raw' column not created yet — store the numeric snapshot without it.
      const { raw: _omit, ...withoutRaw } = row;
      void _omit;
      ({ error } = await supabaseAdmin
        .from("clarity_daily")
        .upsert(withoutRaw, { onConflict: "date" }));
    }
    if (error) return { ok: false, date, error: error.message };

    return { ok: true, date };
  } catch (e) {
    return { ok: false, date, error: (e as Error).message };
  }
}
