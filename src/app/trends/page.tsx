import { SectionTitle, Card, BarChart, InfoBanner } from "@/components/ui";
import { getWeeklyMetrics } from "@/lib/data";
import { resolveRange, rangeLabel } from "@/lib/range";
import { num, qar, signedPct, pctChange } from "@/lib/format";
import { weekLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { from, to } = resolveRange(await searchParams);
  const allWeeks = await getWeeklyMetrics();
  // Keep weeks that overlap the selected period (WoW deltas still use the true previous week).
  const weeks = allWeeks.filter((w) => w.week_start <= to && w.week_end >= from);

  const rows = weeks.map((w) => {
    const idx = allWeeks.findIndex((x) => x.week_start === w.week_start);
    const prev = idx > 0 ? allWeeks[idx - 1] : null;
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
        subtitle={`Week-over-week history (weeks run Thursday → Wednesday) · showing weeks that overlap ${rangeLabel(from, to)}`}
      />

      {rows.length === 0 && (
        <InfoBanner tone="hot">
          No completed weeks overlap this period. Weekly history currently covers{" "}
          <b>{allWeeks.length > 0 ? `${weekLabel(allWeeks[0].week_start)} onwards` : "—"}</b> —
          pick a wider range (e.g. &ldquo;All time&rdquo;).
        </InfoBanner>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Installs per week</p>
          <BarChart data={rows.map((r) => ({ label: r.label, value: r.installs }))} color="var(--hot)" valueFormat={(n) => num(n)} />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Orders per week</p>
          <BarChart data={rows.map((r) => ({ label: r.label, value: r.orders }))} color="var(--cool)" valueFormat={(n) => num(n)} />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Ad spend per week (QAR)</p>
          <BarChart data={rows.map((r) => ({ label: r.label, value: Math.round(r.spend) }))} color="var(--spend)" valueFormat={(n) => num(n)} />
        </Card>
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Cost per install (QAR)</p>
          <BarChart
            data={rows.map((r) => ({ label: r.label, value: Math.round(r.cpi * 100) / 100 }))}
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
              <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-semibold">{r.label}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{r.range}</td>
                <td className="px-4 py-3 text-right tabular-nums">{num(r.installs)}</td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{ color: r.instDelta === null ? "var(--muted)" : r.instDelta >= 0 ? "var(--good)" : "var(--bad)" }}
                >
                  {signedPct(r.instDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{num(r.orders)}</td>
                <td
                  className="px-4 py-3 text-right tabular-nums"
                  style={{ color: r.ordDelta === null ? "var(--muted)" : r.ordDelta >= 0 ? "var(--good)" : "var(--bad)" }}
                >
                  {signedPct(r.ordDelta)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{qar(r.spend)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.cpi > 0 ? qar(r.cpi) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
