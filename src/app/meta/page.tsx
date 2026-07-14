import { SectionTitle, Card, InfoBanner, StatCard, LineChart } from "@/components/ui";
import { getMetaSummary } from "@/lib/data";
import { resolveRange, rangeLabel } from "@/lib/range";
import { num, qar } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MetaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { from, to } = resolveRange(await searchParams);
  const m = await getMetaSummary(from, to);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Meta Ads"
        subtitle="Facebook & Instagram advertising — spend, results, and campaigns"
      />

      {!m.hasData ? (
        <InfoBanner tone="hot">
          <b>Waiting for data.</b> Once your Meta access token is connected, this
          page fills automatically with daily spend, results, cost per result,
          and a breakdown of every campaign. Ad account:{" "}
          <b>561606594634055</b>.
        </InfoBanner>
      ) : (
        <InfoBanner>
          Selected period: {rangeLabel(from, to)}. Meta has spend on {m.dailySpend.length}{" "}
          day{m.dailySpend.length === 1 ? "" : "s"} in this period. Refreshes daily.
        </InfoBanner>
      )}

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={m.hasData ? qar(m.totalSpend) : "—"}
          accent="var(--spend)"
          sub={rangeLabel(from, to)}
        />
        <StatCard
          label="Link clicks"
          value={m.hasData ? num(m.totalResults) : "—"}
          accent="var(--cool)"
          sub="clicks on your ads"
        />
        <StatCard
          label="Cost per click"
          value={m.hasData && m.totalResults > 0 ? qar(m.totalSpend / m.totalResults) : "—"}
          accent="var(--hot)"
          sub="spend ÷ clicks"
        />
        <StatCard
          label="Active campaigns"
          value={m.hasData ? num(m.campaigns.length) : "—"}
          accent="var(--android)"
        />
      </div>

      {/* Daily spend trend */}
      {m.hasData && m.dailySpend.length > 0 && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">
            Spend per day (QAR) · {m.dailySpend.length} days with spend
          </p>
          <LineChart
            data={m.dailySpend.map((d) => ({ label: d.date.slice(5), value: Math.round(d.spend) }))}
            color="var(--spend)"
            height={200}
            valueFormat={(n) => num(n)}
          />
        </Card>
      )}

      {/* Campaign breakdown */}
      {m.hasData && (
        <Card className="overflow-x-auto">
          <div className="px-5 pt-4 text-sm font-semibold">
            Campaign breakdown
          </div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="px-5 py-2 font-medium">Campaign</th>
                <th className="px-5 py-2 font-medium text-right">Spend</th>
                <th className="px-5 py-2 font-medium text-right">Clicks</th>
                <th className="px-5 py-2 font-medium text-right">Cost / click</th>
              </tr>
            </thead>
            <tbody>
              {m.campaigns.map((c, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-2">{c.campaign_name}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{qar(c.spend)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{num(c.results)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {c.results > 0 ? qar(c.spend / c.results) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
