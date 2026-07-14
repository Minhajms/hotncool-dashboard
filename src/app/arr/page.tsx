import Link from "next/link";
import { SectionTitle, Card, InfoBanner, StatCard } from "@/components/ui";
import { getOrdersCount } from "@/lib/data";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

const DEFS = [
  {
    key: "Active",
    color: "var(--hot)",
    text: "Customers who ordered in the last 30 days.",
  },
  {
    key: "Retained",
    color: "var(--cool)",
    text: "Customers who ordered this month AND last month.",
  },
  {
    key: "Recovered",
    color: "var(--android)",
    text: "Customers who ordered again after a gap of 30+ days.",
  },
];

export default async function ArrPage() {
  const ordersCount = await getOrdersCount();
  const hasOrders = ordersCount > 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="ARR — Active · Retained · Recovered"
        subtitle="Customer health, powered by the backend Orders API"
      />

      {!hasOrders ? (
        <InfoBanner tone="hot">
          <b>Waiting for data.</b> ARR needs order-level history (who ordered
          and when). This arrives once the Hot N Cool tech team delivers the{" "}
          <b>daily Orders API</b>. I&apos;ve prepared the exact request to send
          them — see below. You can also seed history now via the{" "}
          <Link href="/upload" className="underline">
            Upload
          </Link>{" "}
          page.
        </InfoBanner>
      ) : (
        <InfoBanner>
          {num(ordersCount)} orders loaded. ARR calculations are live.
        </InfoBanner>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DEFS.map((d) => (
          <StatCard
            key={d.key}
            label={d.key}
            value={hasOrders ? "—" : "Pending"}
            accent={d.color}
            sub={d.text}
          />
        ))}
      </div>

      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold">
          Backend request to send your tech team
        </p>
        <p className="text-sm text-[var(--muted)]">
          Copy the message below to your app developer. Once they reply with the
          endpoint URL + API key, paste it to me and I&apos;ll connect it — then
          this page fills in automatically.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-4 text-xs leading-relaxed">
{`Subject: Request for a daily Orders API for our growth dashboard

Hi team, for our app-growth dashboard we need a secure API endpoint
that returns order data.

Please provide an HTTPS endpoint, e.g.  GET /api/orders?date=YYYY-MM-DD
protected by an API key (send us the key + how to pass it, e.g. header
"x-api-key"). For each order return JSON with:
  - order_id
  - order_datetime   (ISO 8601, Qatar time)
  - order_value      (QAR, number)
  - customer_id      (or a hashed phone number)
  - platform         ("ios" or "android")

Support fetching one day at a time and a date range. Example response:
[
  {
    "order_id": "A123",
    "order_datetime": "2026-07-13T20:15:00+03:00",
    "order_value": 84.50,
    "customer_id": "c_9981",
    "platform": "ios"
  }
]

Please also confirm rate limits and whether historical dates back to
8 June 2026 are available.`}
        </pre>
      </Card>
    </div>
  );
}
