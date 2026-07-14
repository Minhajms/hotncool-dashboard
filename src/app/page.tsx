import Link from "next/link";
import { StatCard, SectionTitle, InfoBanner, Card, LineChart } from "@/components/ui";
import { getOverview, getSearchConsoleSummary, getClarityRange, getAppMeta } from "@/lib/data";
import { fetchSearchConsoleDetail } from "@/lib/searchConsole";
import { resolveRange, rangeLabel, rangeDays } from "@/lib/range";
import { num, qar } from "@/lib/format";

export const dynamic = "force-dynamic";

function secs(s: number) {
  if (s >= 60) return `${Math.round(s / 60)}m`;
  return `${s}s`;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { from, to } = resolveRange(sp);
  const [o, sc, clarity, scDetail, meta] = await Promise.all([
    getOverview(from, to),
    getSearchConsoleSummary(from, to),
    getClarityRange(from, to),
    fetchSearchConsoleDetail(from, to),
    getAppMeta(),
  ]);
  const days = rangeDays(from, to);
  const cl = clarity.latest as Record<string, number | string> | null;

  const bits: string[] = [];
  if (o.metaHasData) bits.push(`spent ${qar(o.metaSpend)} on Meta ads`);
  if (o.ga4HasData) bits.push(`had ${num(o.ga4Users)} website visitors`);
  if (o.scHasData) bits.push(`got ${num(o.scClicks)} clicks from Google Search`);
  const summary =
    bits.length > 0
      ? `In this period you ${bits.slice(0, -1).join(", ")}${bits.length > 1 ? " and " : ""}${bits[bits.length - 1]}.`
      : "No data yet for this period — pick a wider range or connect more sources.";

  return (
    <div className="space-y-8">
      <SectionTitle title="Overview" subtitle={`${rangeLabel(from, to)} · ${days} day${days > 1 ? "s" : ""}`} />
      <Card className="p-5">
        <p className="text-sm leading-relaxed">{summary}</p>
      </Card>

      {/* ============ THE APP ============ */}
      <section>
        <h3 className="text-base font-semibold">📱 Your app (iOS & Android)</h3>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Installs and orders come from the App Store, Play Console and your Orders API —
          those are being connected. Ad spend (Meta) is live now.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="App installs" value={o.hasAppData ? num(o.installs) : "Soon"} accent="var(--hot)" sub={o.hasAppData ? `iOS ${num(o.iosInstalls)} · Android ${num(o.androidInstalls)}` : "waiting for App Store / Play"} />
          <StatCard label="Orders" value={o.hasAppData ? num(o.orders) : "Soon"} accent="var(--cool)" sub={o.hasAppData ? undefined : "waiting for Orders API"} />
          <StatCard label="Ad spend (Meta)" value={o.metaHasData ? qar(o.metaSpend) : "—"} accent="var(--spend)" sub="live" />
          <StatCard label="Cost per install" value={o.costPerInstall !== null ? qar(o.costPerInstall) : "Soon"} accent="var(--spend)" sub="spend ÷ installs" />
        </div>
      </section>

      {/* ============ THE WEBSITE ============ */}
      <section>
        <h3 className="text-base font-semibold">🌐 Your website (hotncool.qa)</h3>
        <p className="mb-3 text-sm text-[var(--muted)]">
          How many people visited your website and how they found you on Google. All live.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Website visitors" value={o.ga4HasData ? num(o.ga4Users) : "—"} accent="var(--hot)" sub="unique people (GA4)" />
          <StatCard label="Website sessions" value={o.ga4HasData ? num(o.ga4Sessions) : "—"} accent="var(--cool)" sub="visits (GA4)" />
          <StatCard label="Google Search clicks" value={o.scHasData ? num(o.scClicks) : "—"} accent="var(--android)" sub={`${num(o.scImpressions)} times shown`} />
          <StatCard label="Avg Google position" value={sc.hasData ? sc.avgPosition.toFixed(1) : "—"} accent="var(--spend)" sub="lower is better" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {o.ga4HasData && (
            <Card className="p-5">
              <p className="mb-1 text-sm font-semibold">Website visitors per day</p>
              <LineChart data={o.series.map((d) => ({ label: d.date.slice(5), value: d.users }))} color="var(--hot)" valueFormat={(n) => num(n)} />
            </Card>
          )}
          {o.scHasData && (
            <Card className="p-5">
              <p className="mb-1 text-sm font-semibold">Google Search clicks per day</p>
              <LineChart data={o.series.map((d) => ({ label: d.date.slice(5), value: d.clicks }))} color="var(--android)" valueFormat={(n) => num(n)} />
            </Card>
          )}
        </div>
      </section>

      {/* ============ WHAT PEOPLE SEARCH ============ */}
      {(scDetail.queries.length > 0 || scDetail.pages.length > 0) && (
        <section>
          <h3 className="text-base font-semibold">🔎 What people search on Google to find you</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">
            The exact searches and pages that brought people to your website in this period.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="overflow-x-auto">
              <div className="px-5 pt-4 text-sm font-semibold">Top searches</div>
              <MiniTable rows={scDetail.queries} labelHead="Search term" />
            </Card>
            <Card className="overflow-x-auto">
              <div className="px-5 pt-4 text-sm font-semibold">Top pages</div>
              <MiniTable rows={scDetail.pages} labelHead="Page" trim />
            </Card>
          </div>
        </section>
      )}

      {/* ============ APP BEHAVIOUR (Clarity = the mobile app) ============ */}
      {clarity.hasData && cl && (
        <section>
          <h3 className="text-base font-semibold">📲 Inside the app (Microsoft Clarity)</h3>
          <p className="mb-3 text-sm text-[var(--muted)]">
            How people actually use the Hot N Cool app — sessions, iPhone vs Android, and
            frustration signals.{" "}
            <Link href="/app-insights" className="font-semibold underline" style={{ color: "var(--cool)" }}>
              Open the detailed App Insights dashboard →
            </Link>
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="App sessions" value={num(clarity.sessions)} accent="var(--cool)" sub={`iPhone ${num(clarity.ios)} · Android ${num(clarity.android)}`} />
            <StatCard label="Time per session" value={secs(Number(cl.engagement_active ?? 0))} accent="var(--hot)" sub="actively using" />
            <StatCard label="Dead taps" value={num(Number(cl.dead_taps ?? 0))} accent="var(--spend)" sub="taps that did nothing" />
            <StatCard label="Rage taps" value={num(Number(cl.rage_taps ?? 0))} accent="var(--bad)" sub="frustration signal" />
          </div>
        </section>
      )}

      {/* ============ AD SPEND ============ */}
      {o.metaHasData && (
        <section>
          <h3 className="text-base font-semibold">💸 Ad spend (Meta)</h3>
          <Card className="mt-3 p-5">
            <p className="mb-1 text-sm font-semibold">Spend per day (QAR)</p>
            <LineChart data={o.series.map((d) => ({ label: d.date.slice(5), value: Math.round(d.spend) }))} color="var(--spend)" valueFormat={(n) => num(n)} />
          </Card>
        </section>
      )}

      {!o.hasAppData && (
        <InfoBanner>
          <b>App installs & orders</b> turn on automatically once App Store, Play Console and
          the Orders API are connected. Everything else above is live. You can also enter
          figures manually on the <b>Upload</b> page.
        </InfoBanner>
      )}

      <Card className="p-5">
        <p className="text-sm text-[var(--muted)]">
          Lifetime iOS downloads: <b>{num(meta.lifetime_ios_downloads)}</b> · Android active
          base: <b>{num(meta.android_active_base)}</b>. Change the period with the 📅 picker
          (top right) — every number and chart updates.
        </p>
      </Card>
    </div>
  );
}

function MiniTable({ rows, labelHead, trim }: { rows: { name: string; clicks: number; impressions: number }[]; labelHead: string; trim?: boolean }) {
  return (
    <table className="mt-2 w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
          <th className="px-5 py-2 font-medium">{labelHead}</th>
          <th className="px-5 py-2 font-medium text-right">Clicks</th>
          <th className="px-5 py-2 font-medium text-right">Shown</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td className="px-5 py-3 text-[var(--muted)]" colSpan={3}>No data.</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-[var(--border)] last:border-0">
            <td className="max-w-[220px] truncate px-5 py-2" title={r.name}>
              {trim ? r.name.replace(/^https?:\/\/[^/]+/, "") || "/" : r.name}
            </td>
            <td className="px-5 py-2 text-right tabular-nums">{num(r.clicks)}</td>
            <td className="px-5 py-2 text-right tabular-nums">{num(r.impressions)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
