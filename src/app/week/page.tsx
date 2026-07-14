import { StatCard, SectionTitle, InfoBanner, Card } from "@/components/ui";
import { getCurrentWeekTotals, getWeeklyMetrics } from "@/lib/data";
import { weekLabel, weekNumberFor } from "@/lib/dates";
import { num, qar, pctChange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const [{ weekStart, totals }, weekly] = await Promise.all([
    getCurrentWeekTotals(),
    getWeeklyMetrics(),
  ]);

  const weekNo = weekNumberFor(weekStart);
  // Most recent completed baseline/weekly row for a reference comparison.
  const lastCompleted = weekly.length ? weekly[weekly.length - 1] : null;

  return (
    <div className="space-y-6">
      <SectionTitle
        title={`This Week · Week ${weekNo}`}
        subtitle={weekLabel(weekStart)}
      />

      {!totals.hasDaily && (
        <InfoBanner>
          No daily rows have arrived for this week yet, so totals show zero.
          They will build up automatically each day once the integrations run.
          The <b>Trends</b> page already shows your verified weekly history.
        </InfoBanner>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Installs (total)"
          value={num(totals.installs)}
          accent="var(--hot)"
          delta={
            lastCompleted ? pctChange(totals.installs, lastCompleted.installs) : null
          }
          sub={
            lastCompleted
              ? `wk ${lastCompleted.week_number}: ${num(lastCompleted.installs)}`
              : undefined
          }
        />
        <StatCard label="iOS" value={num(totals.ios)} accent="var(--ios)" />
        <StatCard
          label="Android"
          value={num(totals.android)}
          accent="var(--android)"
        />
        <StatCard
          label="Orders"
          value={num(totals.orders)}
          accent="var(--cool)"
          delta={
            lastCompleted ? pctChange(totals.orders, lastCompleted.orders) : null
          }
          sub={
            lastCompleted
              ? `wk ${lastCompleted.week_number}: ${num(lastCompleted.orders)}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Ad spend"
          value={qar(totals.spend)}
          accent="var(--spend)"
        />
        <StatCard
          label="Cost / install"
          value={totals.installs > 0 ? qar(totals.spend / totals.installs) : "—"}
          accent="var(--spend)"
          sub="spend ÷ installs"
        />
        <StatCard
          label="Cost / order"
          value={totals.orders > 0 ? qar(totals.spend / totals.orders) : "—"}
          accent="var(--spend)"
          sub="spend ÷ orders"
        />
      </div>

      {lastCompleted && (
        <Card className="p-5">
          <p className="text-sm text-[var(--muted)]">
            Reference — most recent completed week (
            <b>Week {lastCompleted.week_number}</b>,{" "}
            {weekLabel(lastCompleted.week_start)}):{" "}
            {num(lastCompleted.installs)} installs, {num(lastCompleted.orders)}{" "}
            orders, {qar(lastCompleted.spend_qar)} spend.
          </p>
        </Card>
      )}
    </div>
  );
}
