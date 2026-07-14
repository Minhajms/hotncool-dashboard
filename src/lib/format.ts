// Number / currency formatting helpers (currency = QAR).

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function qar(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (
    "QAR " +
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)
  );
}

/** Percentage change from `prev` to `curr`, e.g. +18.5%. Returns null if not comparable. */
export function pctChange(
  curr: number | null | undefined,
  prev: number | null | undefined,
): number | null {
  if (curr === null || curr === undefined) return null;
  if (prev === null || prev === undefined || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

export function signedPct(p: number | null): string {
  if (p === null) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}
