import { StatCard, SectionTitle, InfoBanner, Card, LineChart } from "@/components/ui";
import { getOverview, getAppMeta } from "@/lib/data";
import { resolveRange, rangeLabel, rangeDays } from "@/lib/range";
import { num, qar } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { from, to } = resolveRange(sp);
  const [o, meta] = await Promise.all([getOverview(from, to), getAppMeta()]);
  const days = rangeDays(from, to);

  // Plain-English summary of what happened.
  const bits: string[] = [];
  if (o.metaHasData) bits.push(`spent ${qar(o.metaSpend)} on Meta ads`);
  if (o.ga4HasData) bits.push(`drew ${num(o.ga4Users)} website visitors`);
  if (o.scHasData) bits.push(`got ${num(o.scClicks)} clicks from Google Search`);
  if (o.clarityHasData) bits.push(`saw ${num(o.claritySessions)} app sessions`);
  const summary =
    bits.length > 0
      ? `In this period you ${bits.slice(0, -1).join(", ")}${bits.length > 1 ? " and " : ""}${bits[bits.length - 1]}.`
      : "No data yet for this period.";

  return (
    <div className="space-y-6">
      <SectionTitle title="Overview" subtitle={`${rangeLabel(from, to)} · ${days} day${days > 1 ? "s" : ""}`} />

      <Card className="p-5">
        <p className="text-sm leading-relaxed">{summary}</p>
      </Card>

      {/* Headline results */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          App results
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Installs"
            value={o.hasAppData ? num(o.installs) : "—"}
            accent="var(--hot)"
            sub={o.hasAppData ? `iOS ${num(o.iosInstalls)} · Android ${num(o.androidInstalls)}` : "waiting for App Store / Play"}
          />
          <StatCard
            label="Orders"
            value={o.hasAppData ? num(o.orders) : "—"}
            accent="var(--cool)"
            sub={o.hasAppData ? undefined : "waiting for Orders API"}
          />
          <StatCard label="Ad spend" value={o.metaHasData ? qar(o.metaSpend) : "—"} accent="var(--spend)" sub="Meta" />
          <StatCard
            label="Cost / install"
            value={o.costPerInstall !== null ? qar(o.costPerInstall) : "—"}
            accent="var(--spend)"
            sub="spend ÷ installs"
          />
        </div>
      </div>

      {/* Audience */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Audience & reach
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Website visitors" value={o.ga4HasData ? num(o.ga4Users) : "—"} accent="var(--hot)" sub="GA4" />
          <StatCard label="Website sessions" value={o.ga4HasData ? num(o.ga4Sessions) : "—"} accent="var(--cool)" sub="GA4" />
          <StatCard label="Search clicks" value={o.scHasData ? num(o.scClicks) : "—"} accent="var(--android)" sub="Google Search" />
          <StatCard label="App sessions" value={o.clarityHasData ? num(o.claritySessions) : "—"} accent="var(--spend)" sub="Clarity" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {o.metaHasData && (
          <Card className="p-5">
            <p className="mb-1 text-sm font-semibold">Ad spend per day (QAR)</p>
            <LineChart
              data={o.series.map((d) => ({ label: d.date.slice(5), value: Math.round(d.spend) }))}
              color="var(--spend)"
              valueFormat={(n) => num(n)}
            />
          </Card>
        )}
        {o.ga4HasData && (
          <Card className="p-5">
            <p className="mb-1 text-sm font-semibold">Website visitors per day</p>
            <LineChart
              data={o.series.map((d) => ({ label: d.date.slice(5), value: d.users }))}
              color="var(--hot)"
              valueFormat={(n) => num(n)}
            />
          </Card>
        )}
        {o.scHasData && (
          <Card className="p-5">
            <p className="mb-1 text-sm font-semibold">Search clicks per day</p>
            <LineChart
              data={o.series.map((d) => ({ label: d.date.slice(5), value: d.clicks }))}
              color="var(--cool)"
              valueFormat={(n) => num(n)}
            />
          </Card>
        )}
      </div>

      {(!o.hasAppData) && (
        <InfoBanner>
          <b>Installs & orders</b> will appear here automatically once App Store,
          Play Console and the Orders API are connected. Everything else above is
          live. You can also enter figures manually on the <b>Upload</b> page.
        </InfoBanner>
      )}

      <Card className="p-5">
        <p className="text-sm text-[var(--muted)]">
          Lifetime iOS downloads: <b>{num(meta.lifetime_ios_downloads)}</b> ·
          Android active base: <b>{num(meta.android_active_base)}</b>. Use the date
          picker (top right) to change the period — every number and chart updates.
        </p>
      </Card>
    </div>
  );
}
