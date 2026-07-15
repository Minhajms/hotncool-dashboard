import { SectionTitle, Card } from "@/components/ui";
import { getSourceStatuses } from "@/lib/sources";
import { qatarToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  live: { label: "● Live", bg: "var(--cool-soft)", fg: "var(--good)" },
  pending: { label: "◐ Connecting", bg: "var(--hot-soft)", fg: "var(--hot)" },
  not_connected: { label: "○ Not connected", bg: "var(--surface-2)", fg: "var(--muted)" },
};

function freshness(lastDate: string | null, today: string): string {
  if (!lastDate) return "—";
  if (lastDate === today) return "today";
  const days = Math.round((Date.parse(today) - Date.parse(lastDate)) / 86400000);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function SourcesPage() {
  const sources = await getSourceStatuses();
  const today = qatarToday();
  const live = sources.filter((s) => s.status === "live").length;

  const groups = ["App", "Website", "Search", "Ads"] as const;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Data Sources"
        subtitle={`${live} of ${sources.length} sources live · every metric on this dashboard flows from here`}
      />

      <Card className="p-5">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          This is your coverage map. Each source below feeds specific parts of the dashboard and
          refreshes automatically every morning. &ldquo;Data through&rdquo; shows the latest day
          each source has provided, so you always know how fresh a number is.
        </p>
      </Card>

      {groups.map((g) => {
        const items = sources.filter((s) => s.category === g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{g}</p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {items.map((s) => {
                const st = STATUS_STYLE[s.status];
                return (
                  <Card key={s.name} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden>{s.icon}</span>
                        <div>
                          <p className="font-semibold leading-tight">{s.name}</p>
                          <p className="text-xs text-[var(--muted)]">{s.tracks}</p>
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                      <span className="text-[var(--muted)]">{s.detail}</span>
                      <span className="tabular-nums">
                        Data through:{" "}
                        <b>{s.lastDate ?? "—"}</b>
                        {s.lastDate && (
                          <span className="text-[var(--muted)]"> ({freshness(s.lastDate, today)})</span>
                        )}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
