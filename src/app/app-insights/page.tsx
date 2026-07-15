import { SectionTitle, Card, InfoBanner, StatCard, LineChart, BarChart, InsightList } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveRange, rangeLabel } from "@/lib/range";
import { clarityInsights } from "@/lib/insights";
import { num } from "@/lib/format";
import { formatQatar } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Metric = { metricName: string; information: Record<string, unknown>[] };

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

/** Merge PopularScreens / Country lists across daily snapshots (sum sessions by name). */
function mergeRaw(rows: Record<string, unknown>[], metricName: string) {
  const acc = new Map<string, number>();
  for (const row of rows) {
    const raw = (row.raw ?? []) as Metric[];
    const list = raw.find((m) => m.metricName === metricName)?.information ?? [];
    for (const item of list) {
      const name = String(item.name ?? "");
      acc.set(name, (acc.get(name) ?? 0) + n(item.sessionsCount));
    }
  }
  return [...acc.entries()]
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

export default async function AppInsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { from, to } = resolveRange(await searchParams);

  const [{ data: inRange }, { data: latestAny }] = await Promise.all([
    supabaseAdmin
      .from("clarity_daily")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true }),
    supabaseAdmin
      .from("clarity_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const rows = (inRange ?? []) as Record<string, unknown>[];
  const newestSavedDate = (latestAny as { date?: string } | null)?.date ?? null;

  // ---------- Honest empty state ----------
  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <SectionTitle title="App Insights" subtitle={`Microsoft Clarity · ${rangeLabel(from, to)}`} />
        <InfoBanner tone="hot">
          <b>No saved app data for this period.</b>{" "}
          {newestSavedDate ? (
            <>
              Clarity data arrives with about a 1-day delay, and we started saving history on{" "}
              <b>2026-07-13</b>. The most recent saved day is <b>{newestSavedDate}</b> — pick a
              range that includes it (e.g. &ldquo;Last 7 days&rdquo;).
            </>
          ) : (
            <>Data starts arriving with the next daily refresh.</>
          )}
        </InfoBanner>
      </div>
    );
  }

  // ---------- Aggregate over the days we actually have ----------
  const daysCount = rows.length;
  const first = String(rows[0].date);
  const last = String(rows[rows.length - 1].date);
  const sum = (k: string) => rows.reduce((s, r) => s + n(r[k]), 0);

  const sessions = sum("sessions");
  const users = sum("distinct_users");
  const ios = sum("ios_sessions");
  const android = sum("android_sessions");
  const deadTaps = sum("dead_taps");
  const rageTaps = sum("rage_taps");
  const errors = sum("errors");
  // engagement seconds are per-session averages → weight by sessions
  const wAvg = (k: string) => {
    const totalW = rows.reduce((s, r) => s + n(r.sessions), 0);
    if (totalW === 0) return 0;
    return Math.round(rows.reduce((s, r) => s + n(r[k]) * n(r.sessions), 0) / totalW);
  };
  const totalTime = wAvg("engagement_total");
  const activeTime = wAvg("engagement_active");
  const sps =
    rows.reduce((s, r) => s + Number(r.screens_per_session ?? 0) * n(r.sessions), 0) /
    Math.max(1, sessions);

  const screens = mergeRaw(rows, "PopularScreens").filter(
    (s) => !/FlutterViewController|FlutterActivity/i.test(s.name),
  );
  const countries = mergeRaw(rows, "Country");
  const periodLabel = daysCount === 1 ? `on ${first}` : `${first} → ${last}`;

  const insights = clarityInsights({
    sessions, ios, android, deadTaps, rageTaps, activeSecs: activeTime,
    screensPerSession: sps, topScreen: screens[0]?.name.replace(/ page$/i, ""), days: daysCount,
  });

  return (
    <div className="space-y-8">
      <SectionTitle
        title="App Insights"
        subtitle={`Microsoft Clarity · selected: ${rangeLabel(from, to)} · updates every morning`}
      />

      <InfoBanner>
        Showing <b>{daysCount} day{daysCount > 1 ? "s" : ""} of saved app data</b> ({periodLabel}).
        Clarity only shares recent days, so we bank one day each morning — history started{" "}
        <b>2026-07-13</b> and grows daily. Numbers below are totals for these {daysCount} day
        {daysCount > 1 ? "s" : ""}.
      </InfoBanner>

      <InsightList insights={insights} />


      {/* Headline */}
      <section>
        <h3 className="mb-3 text-base font-semibold">
          {daysCount === 1 ? `The app on ${first}` : `The app, ${periodLabel}`}
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sessions" value={num(sessions)} accent="var(--cool)" sub="times the app was opened & used" />
          <StatCard label="People" value={num(users)} accent="var(--hot)" sub={daysCount > 1 ? "sum of daily users" : "distinct users"} />
          <StatCard label="iPhone sessions" value={num(ios)} accent="var(--ios)" sub={`${sessions > 0 ? Math.round((ios / sessions) * 100) : 0}% of total`} />
          <StatCard label="Android sessions" value={num(android)} accent="var(--android)" sub={`${sessions > 0 ? Math.round((android / sessions) * 100) : 0}% of total`} />
        </div>
      </section>

      {/* Engagement + quality */}
      <section>
        <h3 className="mb-1 text-base font-semibold">Engagement & app quality</h3>
        <p className="mb-3 text-sm text-[var(--muted)]">
          <b>Dead taps</b> = taps that did nothing (a confusing button or screen).{" "}
          <b>Rage taps</b> = fast repeated tapping (frustration). <b>Errors</b> = app crashes/errors Clarity caught.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Time per session" value={`${totalTime}s`} accent="var(--cool)" sub={`${activeTime}s actively using (avg)`} />
          <StatCard label="Screens per session" value={sps.toFixed(1)} accent="var(--hot)" sub="how deep people go (avg)" />
          <StatCard label="Dead taps" value={num(deadTaps)} accent="var(--spend)" sub={deadTaps / daysCount > 300 ? "⚠ high — worth reviewing" : `total in ${daysCount} day${daysCount > 1 ? "s" : ""}`} />
          <StatCard label="Rage taps / errors" value={`${num(rageTaps)} / ${num(errors)}`} accent="var(--bad)" sub="frustration / crashes" />
        </div>
      </section>

      {/* Popular screens */}
      {screens.length > 0 && (
        <section>
          <h3 className="mb-1 text-base font-semibold">Most-visited screens</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Where people actually spend time inside the app ({periodLabel}).
          </p>
          <Card className="p-5">
            <BarChart
              data={screens.slice(0, 8).map((s) => ({
                label: s.name.replace(/ page$/i, "").slice(0, 14),
                value: s.sessions,
              }))}
              color="var(--cool)"
              height={170}
              valueFormat={(v) => num(v)}
            />
          </Card>
        </section>
      )}

      {/* Countries */}
      {countries.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-semibold">Where sessions come from</h3>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="px-5 py-2 font-medium">Country</th>
                  <th className="px-5 py-2 font-medium text-right">Sessions</th>
                  <th className="px-5 py-2 font-medium text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {countries.slice(0, 8).map((c, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-2">{c.name}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{num(c.sessions)}</td>
                    <td className="px-5 py-2 text-right tabular-nums">
                      {sessions > 0 ? `${Math.round((c.sessions / sessions) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* Trend over days */}
      {daysCount > 1 ? (
        <section>
          <h3 className="mb-3 text-base font-semibold">Sessions per day</h3>
          <Card className="p-5">
            <LineChart
              data={rows.map((r) => ({ label: String(r.date).slice(5), value: n(r.sessions) }))}
              color="var(--cool)"
              valueFormat={(v) => num(v)}
            />
          </Card>
        </section>
      ) : (
        <InfoBanner>
          Only <b>one day</b> of history exists so far, so 7-day and 30-day views currently show
          the same single day. From tomorrow the days accumulate and the ranges become genuinely
          different — no action needed.
        </InfoBanner>
      )}

      <p className="text-xs text-[var(--muted)]">
        Last updated: {formatQatar(String(rows[rows.length - 1].updated_at))} (Qatar time).
        Source: Microsoft Clarity Data Export API (app project).
      </p>
    </div>
  );
}
