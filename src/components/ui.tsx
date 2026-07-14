import React from "react";
import { signedPct } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "var(--foreground)",
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delta?: number | null;
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const up = hasDelta && (delta as number) >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: accent }}
        />
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {sub && <p className="text-xs text-[var(--muted)]">{sub}</p>}
        {hasDelta && (
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: up ? "var(--good)" : "var(--bad)" }}
          >
            {up ? "▲" : "▼"} {signedPct(delta as number)}
          </span>
        )}
      </div>
    </Card>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && (
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      )}
    </div>
  );
}

export function InfoBanner({
  children,
  tone = "cool",
}: {
  children: React.ReactNode;
  tone?: "cool" | "hot";
}) {
  const bg = tone === "cool" ? "var(--cool-soft)" : "var(--hot-soft)";
  const fg = tone === "cool" ? "var(--cool)" : "var(--hot)";
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: bg, color: fg }}
    >
      {children}
    </div>
  );
}

/** Pure-SVG line chart with area fill (server-rendered). */
export function LineChart({
  data,
  color = "var(--cool)",
  height = 180,
  valueFormat = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  valueFormat?: (n: number) => string;
}) {
  const w = 720;
  const padX = 8;
  const padTop = 24;
  const padBottom = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const stepX = n > 1 ? (w - padX * 2) / (n - 1) : 0;
  const yFor = (v: number) => padTop + (1 - v / max) * (height - padTop - padBottom);
  const xFor = (i: number) => padX + i * stepX;
  const pts = data.map((d, i) => `${xFor(i)},${yFor(d.value)}`);
  const line = pts.length ? `M ${pts.join(" L ")}` : "";
  const area =
    pts.length > 1
      ? `M ${xFor(0)},${height - padBottom} L ${pts.join(" L ")} L ${xFor(n - 1)},${height - padBottom} Z`
      : "";
  // show a subset of x labels to avoid crowding
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img">
      {area && <path d={area} style={{ fill: color, opacity: 0.12 }} />}
      {line && <path d={line} style={{ stroke: color, fill: "none", strokeWidth: 2.5 }} />}
      {data.map((d, i) =>
        n <= 40 ? (
          <circle key={i} cx={xFor(i)} cy={yFor(d.value)} r={2.5} style={{ fill: color }} />
        ) : null,
      )}
      {/* peak label */}
      {data.length > 0 &&
        (() => {
          const peakI = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0);
          return (
            <text
              x={Math.min(Math.max(xFor(peakI), 20), w - 20)}
              y={yFor(data[peakI].value) - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              style={{ fill: "var(--foreground)" }}
            >
              {valueFormat(data[peakI].value)}
            </text>
          );
        })()}
      {data.map((d, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={xFor(i)}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            style={{ fill: "var(--muted)" }}
          >
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Pure-SVG vertical bar chart (server-rendered, no client JS). */
export function BarChart({
  data,
  color = "var(--cool)",
  height = 160,
  valueFormat = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  valueFormat?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 44;
  const gap = 28;
  const topPad = 26; // headroom for value labels
  const chartH = height;
  const width = data.length * (barW + gap) + gap;
  return (
    <svg
      viewBox={`0 0 ${width} ${chartH + 44}`}
      width="100%"
      height={chartH + 44}
      role="img"
    >
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * (chartH - topPad));
        const x = gap + i * (barW + gap);
        const y = chartH - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={6}
              style={{ fill: color, opacity: 0.92 }}
            />
            <text
              x={x + barW / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              style={{ fill: "var(--foreground)" }}
            >
              {valueFormat(d.value)}
            </text>
            <text
              x={x + barW / 2}
              y={chartH + 20}
              textAnchor="middle"
              fontSize="12"
              style={{ fill: "var(--muted)" }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
