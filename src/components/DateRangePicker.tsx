"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thismonth", label: "This month" },
  { key: "all", label: "All time" },
];

// Pages where a date range has no meaning (static/manual pages).
const RANGE_FREE_PAGES = ["/arr", "/upload", "/sources"];

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  // Hide the picker where it would do nothing — honesty over decoration.
  if (RANGE_FREE_PAGES.some((p) => pathname.startsWith(p))) return null;

  const currentPreset = sp.get("preset") || (sp.get("from") ? "custom" : "last30");
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";

  function applyPreset(key: string) {
    const params = new URLSearchParams();
    params.set("preset", key);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function applyCustom(f: string, t: string) {
    if (!f || !t) return;
    const params = new URLSearchParams();
    params.set("preset", "custom");
    params.set("from", f);
    params.set("to", t);
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeLabel =
    PRESETS.find((p) => p.key === currentPreset)?.label ||
    (currentPreset === "custom" ? `${from} → ${to}` : "Last 30 days");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-sm font-medium"
      >
        <span aria-hidden>📅</span>
        <span>{activeLabel}</span>
        <span className="text-[var(--muted)]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
            <div className="flex flex-col gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                  style={
                    currentPreset === p.key
                      ? { background: "var(--foreground)", color: "var(--surface)" }
                      : undefined
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                Custom range
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  defaultValue={from}
                  onChange={(e) => (window as unknown as { _f?: string })._f = e.target.value}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  defaultValue={to}
                  onChange={(e) => (window as unknown as { _t?: string })._t = e.target.value}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => {
                    const w = window as unknown as { _f?: string; _t?: string };
                    applyCustom(w._f || from, w._t || to);
                    setOpen(false);
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                  style={{ background: "var(--cool)" }}
                >
                  Apply custom range
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
