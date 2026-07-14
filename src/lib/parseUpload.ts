import ExcelJS from "exceljs";

export type ParsedDay = {
  metric_date: string;
  ios_installs: number;
  android_installs: number;
  orders: number;
  spend_qar: number;
};

// Flexible header matching: maps many spellings to our fields.
const HEADER_MAP: Record<string, keyof ParsedDay> = {
  date: "metric_date",
  day: "metric_date",
  ios: "ios_installs",
  ios_installs: "ios_installs",
  "ios installs": "ios_installs",
  iphone: "ios_installs",
  apple: "ios_installs",
  android: "android_installs",
  android_installs: "android_installs",
  "android installs": "android_installs",
  google: "android_installs",
  orders: "orders",
  order: "orders",
  spend: "spend_qar",
  spend_qar: "spend_qar",
  "spend qar": "spend_qar",
  cost: "spend_qar",
  "ad spend": "spend_qar",
};

function normHeader(h: string): keyof ParsedDay | null {
  const key = h.trim().toLowerCase();
  return HEADER_MAP[key] ?? null;
}

function toDateStr(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or MM/DD/YYYY -> best-effort (assume DD/MM/YYYY, common outside US)
  const m = s.match(/^(\d{1,2})[/](\d{1,2})[/](\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    const dd = a.padStart(2, "0");
    const mm = b.padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toNum(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowsToParsed(headerRow: string[], dataRows: unknown[][]): ParsedDay[] {
  const cols = headerRow.map(normHeader);
  const out: ParsedDay[] = [];
  for (const r of dataRows) {
    const rec: Partial<ParsedDay> = {};
    cols.forEach((field, i) => {
      if (!field) return;
      if (field === "metric_date") {
        const d = toDateStr(r[i]);
        if (d) rec.metric_date = d;
      } else {
        rec[field] = toNum(r[i]);
      }
    });
    if (rec.metric_date) {
      out.push({
        metric_date: rec.metric_date,
        ios_installs: rec.ios_installs ?? 0,
        android_installs: rec.android_installs ?? 0,
        orders: rec.orders ?? 0,
        spend_qar: rec.spend_qar ?? 0,
      });
    }
  }
  return out;
}

function parseCsv(text: string): ParsedDay[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const header = split(lines[0]);
  const data = lines.slice(1).map(split);
  return rowsToParsed(header, data);
}

async function parseXlsx(buf: ArrayBuffer): Promise<ParsedDay[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: unknown[][] = [];
  ws.eachRow((row) => {
    const vals = (row.values as unknown[]).slice(1); // exceljs is 1-indexed
    rows.push(vals);
  });
  if (rows.length < 2) return [];
  const header = rows[0].map((v) => String(v ?? ""));
  return rowsToParsed(header, rows.slice(1));
}

export async function parseUploadFile(
  filename: string,
  buf: ArrayBuffer,
): Promise<ParsedDay[]> {
  if (/\.csv$/i.test(filename)) {
    return parseCsv(new TextDecoder().decode(buf));
  }
  if (/\.xlsx$/i.test(filename)) {
    return parseXlsx(buf);
  }
  // try csv as a fallback
  return parseCsv(new TextDecoder().decode(buf));
}
