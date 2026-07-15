import { SignJWT, importPKCS8 } from "jose";
import { gunzipSync } from "node:zlib";
import { supabaseAdmin } from "./supabase";

export type AppStoreResult = {
  ok: boolean;
  daysWritten: number;
  totalInstalls: number;
  provisioning?: boolean;
  error?: string;
  note?: string;
};

const API = "https://api.appstoreconnect.apple.com";
const REPORT_NAME = "App Downloads Standard";

async function appStoreToken(): Promise<string> {
  const p8b64 = process.env.APPSTORE_P8_B64;
  const keyId = process.env.APPSTORE_KEY_ID;
  const issuer = process.env.APPSTORE_ISSUER_ID;
  if (!p8b64 || !keyId || !issuer) throw new Error("Missing APPSTORE_P8_B64 / APPSTORE_KEY_ID / APPSTORE_ISSUER_ID");
  const key = await importPKCS8(Buffer.from(p8b64, "base64").toString("utf8"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("18m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

type ApiList = { data?: { id: string; attributes?: Record<string, unknown> }[] };

/** Case-insensitive header index lookup with fallbacks. */
function col(header: string[], ...names: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

/**
 * iOS installs via App Store Connect Analytics Reports ("App Downloads Standard").
 * Apple generates daily report instances ~24-48h after the ONGOING request is created;
 * until then instances=0 and we report `provisioning: true` (not an error).
 * Counts "first-time downloads" per date and upserts daily_metrics.ios_installs.
 */
export async function syncAppStore(maxDays = 30): Promise<AppStoreResult> {
  const reqId = process.env.APPSTORE_REPORT_REQUEST_ID;
  if (!reqId) return { ok: false, daysWritten: 0, totalInstalls: 0, error: "APPSTORE_REPORT_REQUEST_ID is not set" };

  try {
    const token = await appStoreToken();
    const H = { Authorization: `Bearer ${token}` };

    // 1. Find the "App Downloads Standard" report.
    const repRes = await fetch(`${API}/v1/analyticsReportRequests/${reqId}/reports?limit=200`, { headers: H });
    if (!repRes.ok) return { ok: false, daysWritten: 0, totalInstalls: 0, error: `reports ${repRes.status}: ${(await repRes.text()).slice(0, 160)}` };
    const reports = (await repRes.json()) as ApiList;
    const report = (reports.data ?? []).find((r) => r.attributes?.name === REPORT_NAME);
    if (!report) return { ok: false, daysWritten: 0, totalInstalls: 0, error: `"${REPORT_NAME}" report not found` };

    // 2. Daily instances (Apple fills these over time).
    const instRes = await fetch(`${API}/v1/analyticsReports/${report.id}/instances?filter[granularity]=DAILY&limit=${maxDays}`, { headers: H });
    const instances = (await instRes.json()) as ApiList;
    const list = (instances.data ?? []).sort((a, b) =>
      String(b.attributes?.processingDate ?? "").localeCompare(String(a.attributes?.processingDate ?? "")),
    );
    if (list.length === 0) {
      return { ok: true, daysWritten: 0, totalInstalls: 0, provisioning: true, note: "Apple is still generating the first daily reports (usually within 24-48h)." };
    }

    // 3. Download each recent instance's segment(s) and tally first-time downloads by date.
    const byDate = new Map<string, number>();
    for (const inst of list.slice(0, maxDays)) {
      const segRes = await fetch(`${API}/v1/analyticsReportInstances/${inst.id}/segments`, { headers: H });
      const segs = (await segRes.json()) as { data?: { attributes?: { url?: string } }[] };
      for (const s of segs.data ?? []) {
        const url = s.attributes?.url;
        if (!url) continue;
        const dl = await fetch(url);
        const buf = Buffer.from(await dl.arrayBuffer());
        let text: string;
        try { text = gunzipSync(buf).toString("utf8"); } catch { text = buf.toString("utf8"); }
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) continue;
        const header = lines[0].split("\t");
        const iDate = col(header, "Date");
        const iCount = col(header, "Counts", "Downloads", "Count");
        const iType = col(header, "Download Type");
        if (iDate < 0 || iCount < 0) continue;
        for (const line of lines.slice(1)) {
          const c = line.split("\t");
          const type = iType >= 0 ? (c[iType] ?? "").toLowerCase() : "first-time download";
          // installs = first-time downloads only (exclude redownloads/updates)
          if (iType >= 0 && !type.includes("first")) continue;
          const date = (c[iDate] ?? "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          byDate.set(date, (byDate.get(date) ?? 0) + (Number(c[iCount] ?? 0) || 0));
        }
      }
    }

    if (byDate.size === 0) {
      return { ok: true, daysWritten: 0, totalInstalls: 0, provisioning: true, note: "Report instances exist but no download rows parsed yet." };
    }

    let daysWritten = 0;
    let totalInstalls = 0;
    for (const [date, installs] of byDate) {
      const { error } = await supabaseAdmin
        .from("daily_metrics")
        .upsert({ metric_date: date, ios_installs: installs, source: "appstore", updated_at: new Date().toISOString() }, { onConflict: "metric_date" });
      if (error) return { ok: false, daysWritten, totalInstalls, error: error.message };
      daysWritten++;
      totalInstalls += installs;
    }
    return { ok: true, daysWritten, totalInstalls };
  } catch (e) {
    return { ok: false, daysWritten: 0, totalInstalls: 0, error: (e as Error).message };
  }
}
