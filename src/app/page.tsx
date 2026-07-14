import { StatCard, SectionTitle, InfoBanner, Card } from "@/components/ui";
import { getDay, getAppMeta } from "@/lib/data";
import { qatarToday, addDays, formatQatar } from "@/lib/dates";
import { num, qar, pctChange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = qatarToday();
  const lastWeekSameDay = addDays(today, -7);

  const [todayRow, lastWeekRow, meta] = await Promise.all([
    getDay(today),
    getDay(lastWeekSameDay),
    getAppMeta(),
  ]);

  const t = {
    ios: todayRow?.ios_installs ?? 0,
    android: todayRow?.android_installs ?? 0,
    orders: todayRow?.orders ?? 0,
    spend: Number(todayRow?.spend_qar ?? 0),
  };
  const installs = t.ios + t.android;
  const lw = lastWeekRow
    ? {
        installs:
          (lastWeekRow.ios_installs ?? 0) + (lastWeekRow.android_installs ?? 0),
        orders: lastWeekRow.orders ?? 0,
        spend: Number(lastWeekRow.spend_qar ?? 0),
      }
    : null;

  const hasData = !!todayRow;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Today"
        subtitle={`${formatQatar(new Date()).split(",")[0]} · vs same day last week`}
      />

      {!hasData && (
        <InfoBanner>
          No live figures for today yet. Daily numbers fill in automatically
          once the API integrations (Search Console, GA4, Play, App Store, Meta)
          are connected. Until then, use the <b>Upload</b> page to enter figures
          manually.
        </InfoBanner>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Installs (total)"
          value={num(installs)}
          accent="var(--hot)"
          delta={lw ? pctChange(installs, lw.installs) : null}
          sub={lw ? `last wk: ${num(lw.installs)}` : "no comparison yet"}
        />
        <StatCard
          label="iOS installs"
          value={num(t.ios)}
          accent="var(--ios)"
          sub="App Store"
        />
        <StatCard
          label="Android installs"
          value={num(t.android)}
          accent="var(--android)"
          sub="Google Play"
        />
        <StatCard
          label="Orders"
          value={num(t.orders)}
          accent="var(--cool)"
          delta={lw ? pctChange(t.orders, lw.orders) : null}
          sub={lw ? `last wk: ${num(lw.orders)}` : "no comparison yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ad spend"
          value={qar(t.spend)}
          accent="var(--spend)"
          delta={lw ? pctChange(t.spend, lw.spend) : null}
          sub={lw ? `last wk: ${qar(lw.spend)}` : "no comparison yet"}
        />
        <StatCard
          label="Cost / install"
          value={installs > 0 ? qar(t.spend / installs) : "—"}
          accent="var(--spend)"
          sub="spend ÷ installs"
        />
        <StatCard
          label="Lifetime iOS downloads"
          value={num(meta.lifetime_ios_downloads)}
          accent="var(--ios)"
          sub="all-time"
        />
        <StatCard
          label="Android active base"
          value={num(meta.android_active_base)}
          accent="var(--android)"
          sub="active devices"
        />
      </div>

      <Card className="p-5">
        <p className="text-sm text-[var(--muted)]">
          This page compares <b>today</b> against the <b>same weekday last
          week</b>. Growth arrows turn green when today is ahead. All figures are
          in Qatar time (UTC+3).
        </p>
      </Card>
    </div>
  );
}
