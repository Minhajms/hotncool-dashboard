import { SectionTitle, Card, InfoBanner, StatCard, LineChart, BarChart } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase";
import { num } from "@/lib/format";
import { formatQatar } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Metric = { metricName: string; information: Record<string, unknown>[] };

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

async function getData() {
  const { data: rows } = await supabaseAdmin
    .from("clarity_daily")
    .select("*")
    .order("date", { ascending: true });
  const all = (rows ?? []) as Record<string, unknown>[];
  const latest = all[all.length - 1] ?? null;
  const raw = (latest?.raw ?? []) as Metric[];
  const by = (name: string) => raw.find((m) => m.metricName === name)?.information ?? [];
  return { all, latest, raw, by };
}

export default async function AppInsightsPage() {
  const { all, latest, raw, by } = await getData();

  if (!latest) {
    return (
      <div className="space-y-6">
        <SectionTitle title="App Insights" subtitle="Microsoft Clarity — how people use the Hot N Cool app" />
        <InfoBanner tone="hot">No Clarity data yet. It arrives with the next daily refresh.</InfoBanner>
      </div>
    );
  }

  const screens = by("PopularScreens")
    .map((s) => ({ name: String(s.name), sessions: n(s.sessionsCount) }))
    .filter((s) => !/FlutterViewController|FlutterActivity/i.test(s.name));
  const countries = by("Country").map((c) => ({ name: String(c.name), sessions: n(c.sessionsCount) }));
  const hasRaw = raw.length > 0;

  const ios = n(latest.ios_sessions);
  const android = n(latest.android_sessions);
  const sessions = n(latest.sessions);
  const users = n(latest.distinct_users);
  const deadTaps = n(latest.dead_taps);
  const rageTaps = n(latest.rage_taps);
  const errors = n(latest.errors);
  const active = n(latest.engagement_active);
  const total = n(latest.engagement_total);
  const spsRaw = Number(latest.screens_per_session ?? 0);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="App Insights"
        subtitle={`Microsoft Clarity · latest full day: ${latest.date} · updates automatically every morning`}
      />

      <InfoBanner>
        This mirrors your <b>Microsoft Clarity</b> project for the <b>Hot N Cool app</b>{" "}
        (iOS + Android). History builds one day at a time — the trend charts get richer
        every day.
      </InfoBanner>

      {/* Headline */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Yesterday in the app</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sessions" value={num(sessions)} accent="var(--cool)" sub="times the app was opened & used" />
          <StatCard label="People" value={num(users)} accent="var(--hot)" sub="distinct users" />
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
          <StatCard label="Time per session" value={`${total}s`} accent="var(--cool)" sub={`${active}s actively using`} />
          <StatCard label="Screens per session" value={spsRaw.toFixed(1)} accent="var(--hot)" sub="how deep people go" />
          <StatCard label="Dead taps" value={num(deadTaps)} accent="var(--spend)" sub={deadTaps > 300 ? "⚠ high — worth reviewing" : "confusing spots"} />
          <StatCard label="Rage taps / errors" value={`${num(rageTaps)} / ${num(errors)}`} accent="var(--bad)" sub="frustration / crashes" />
        </div>
      </section>

      {/* Popular screens */}
      {hasRaw && screens.length > 0 && (
        <section>
          <h3 className="mb-1 text-base font-semibold">Most-visited screens</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Where people actually spend time inside the app (yesterday).
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
      {hasRaw && countries.length > 0 && (
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
      {all.length > 1 && (
        <section>
          <h3 className="mb-3 text-base font-semibold">Sessions per day (history)</h3>
          <Card className="p-5">
            <LineChart
              data={all.map((r) => ({ label: String(r.date).slice(5), value: n(r.sessions) }))}
              color="var(--cool)"
              valueFormat={(v) => num(v)}
            />
          </Card>
        </section>
      )}
      {all.length <= 1 && (
        <InfoBanner>
          Trend charts appear from tomorrow — Clarity only shares recent days, so we save one
          day every morning and the history grows automatically.
        </InfoBanner>
      )}

      <p className="text-xs text-[var(--muted)]">
        Last updated: {formatQatar(String(latest.updated_at))} (Qatar time). Source: Microsoft
        Clarity Data Export API (app project).
      </p>
    </div>
  );
}
