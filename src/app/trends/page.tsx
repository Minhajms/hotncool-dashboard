import { SectionTitle, Card, BarChart, StatCard } from "@/components/ui";
import { getWeeklyMetrics, getSearchConsoleSummary, getGa4Summary } from "@/lib/data";
import { num, qar, signedPct, pctChange } from "@/lib/format";
import { weekLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const [weeks, seo, ga4] = await Promise.all([
    getWeeklyMetrics(),
    getSearchConsoleSummary(30),
    getGa4Summary(30),
  ]);

  const rows = weeks.map((w, i) => {
    const prev = i > 0 ? weeks[i - 1] : null;
    const installs = w.installs ?? 0;
    const spend = Number(w.spend_qar ?? 0);
    const cpi = installs > 0 ? spend / installs : 0;
    return {
      label: `W${w.week_number}`,
      range: weekLabel(w.week_start),
      installs,
      orders: w.orders ?? 0,
      spend,
      cpi,
      instDelta: prev ? pctChange(installs, prev.installs) : null,
      ordDelta: prev ? pctChange(w.orders, prev.orders) : null,
    };
  });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Trends"
        subtitle="Week-over-week performance (weeks run Thursday → Wednesday)"
      />

      {/* Website Search (Google Search Console) */}
      {seo.hasData && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold">
            Website Search — Google · last {seo.days.length} days{" "}
            <span className="font-normal text-[var(--muted)]">(auto)</span>
          </p>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Clicks" value={num(seo.totalClicks)} accent="var(--cool)" />
            <StatCard
              label="Impressions"
              value={num(seo.totalImpressions)}
              accent="var(--hot)"
            />
            <StatCard
              label="Avg CTR"
              value={`${(seo.avgCtr * 100).toFixed(2)}%`}
              accent="var(--android)"
            />
            <StatCard
              label="Avg position"
              value={seo.avgPosition.toFixed(1)}
              accent="var(--spend)"
            />
          </div>
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">
            Clicks per day (last 14)
          </p>
          <BarChart
            data={seo.days.slice(-14).map((d) => ({
              label: d.date.slice(8, 10),
              value: d.clicks,
            }))}
            color="var(--cool)"
            height={120}
            valueFormat={(n) => num(n)}
          />
        </Card>
      )}

      {/* Website Visitors (GA4) */}
      {ga4.hasData && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold">
            Website Visitors — GA4 · last 30 days{" "}
            <span className="font-normal text-[var(--muted)]">(auto)</span>
          </p>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Users" value={num(ga4.totalUsers)} accent="var(--hot)" />
            <StatCard
              label="Sessions"
              value={num(ga4.totalSessions)}
              accent="var(--cool)"
            />
            <StatCard
              label="Top channel"
              value={ga4.channels[0]?.channel ?? "—"}
              accent="var(--android)"
              sub={ga4.channels[0] ? `${num(ga4.channels[0].users)} users` : undefined}
            />
            <StatCard
              label="Channels"
              value={num(ga4.channels.length)}
              accent="var(--spend)"
            />
          </div>
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">
            Users by channel
          </p>
          <BarChart
            data={ga4.channels.slice(0, 6).map((c) => ({
              label: c.channel.split(" ")[0],
              value: c.users,
            }))}
            color="var(--hot)"
            height={130}
            valueFormat={(n) => num(n)}
          />
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Installs per week</p>
          <BarChart
            data={rows.map((r) => ({ label: r.label, value: r.installs }))}
            color="var(--hot)"
            valueFormat={(n) => num(n)}
          />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Orders per week</p>
          <BarChart
            data={rows.map((r) => ({ label: r.label, value: r.orders }))}
            color="var(--cool)"
            valueFormat={(n) => num(n)}
          />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Ad spend per week (QAR)</p>
          <BarChart
            data={rows.map((r) => ({ label: r.label, value: Math.round(r.spend) }))}
            color="var(--spend)"
            valueFormat={(n) => num(n)}
          />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Cost per install (QAR)</p>
          <BarChart
            data={rows.map((r) => ({
              label: r.label,
              value: Math.round(r.cpi * 100) / 100,
            }))}
            color="var(--android)"
            valueFormat={(n) => n.toFixed(2)}
          />
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Week</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium text-right">Installs</th>
              <th className="px-4 py-3 font-medium text-right">WoW</th>
              <th className="px-4 py-3 font-medium text-right">Orders</th>
              <th className="px-4 py-3 font-medium text-right">WoW</th>
              <th className="px-4 py-3 font-medium text-right">Spend</th>
              <th className="px-4 py-3 font-medium text-right">Cost/Install</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-4 py-3 font-semibold">{r.label}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{r.range}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {num(r.installs)}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    color:
                      r.instDelta === null
                        ? "var(--muted)"
                        : r.instDelta >= 0
                          ? "var(--good)"
                          : "var(--bad)",
                  }}
                >
                  {signedPct(r.instDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {num(r.orders)}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{
                    color:
                      r.ordDelta === null
                        ? "var(--muted)"
                        : r.ordDelta >= 0
                          ? "var(--good)"
                          : "var(--bad)",
                  }}
                >
                  {signedPct(r.ordDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {qar(r.spend)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.cpi > 0 ? qar(r.cpi) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
