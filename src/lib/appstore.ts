import { SignJWT, importPKCS8 } from "jose";
import { gunzipSync } from "node:zlib";
import { supabaseAdmin } from "./supabase";
import { qatarToday, addDays } from "./dates";

export type AppStoreResult = {
  ok: boolean;
  daysWritten: number;
  totalInstalls: number;
  from: string;
  to: string;
  error?: string;
  note?: string;
};

// Product Type Identifiers that represent a download/install (not updates "7*", not in-app).
const DOWNLOAD_TYPES = /^(1|1F|1T|1E|1EP|1EU|F1|FI)$/;

async function appStoreToken(): Promise<string> {
  const p8b64 = process.env.APPSTORE_P8_B64;
  const keyId = process.env.APPSTORE_KEY_ID;
  const issuer = process.env.APPSTORE_ISSUER_ID;
  if (!p8b64 || !keyId || !issuer) throw new Error("Missing APPSTORE_P8_B64 / APPSTORE_KEY_ID / APPSTORE_ISSUER_ID");
  const pem = Buffer.from(p8b64, "base64").toString("utf8");
  const key = await importPKCS8(pem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("18m")
    .setAudience("appstoreconnect-v1")
    .sign(key);
}

/** Fetch & parse one day's SALES SUMMARY report → iOS downloads for our app. */
async function installsForDate(token: string, vendor: string, appId: string, date: string): Promise<number | null> {
  const params = new URLSearchParams({
    "filter[frequency]": "DAILY",
    "filter[reportType]": "SALES",
    "filter[reportSubType]": "SUMMARY",
    "filter[vendorNumber]": vendor,
    "filter[reportDate]": date,
  });
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" },
  });
  if (res.status === 404) return null; // no report for that day yet
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const tsv = gunzipSync(buf).toString("utf8");
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return 0;
  const header = lines[0].split("\t");
  const iType = header.indexOf("Product Type Identifier");
  const iUnits = header.indexOf("Units");
  const iAppId = header.indexOf("Apple Identifier");
  let installs = 0;
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (iAppId >= 0 && appId && c[iAppId] !== appId) continue;
    const ptype = (c[iType] ?? "").trim();
    if (!DOWNLOAD_TYPES.test(ptype)) continue;
    installs += Number(c[iUnits] ?? 0) || 0;
  }
  return installs;
}

/** Pull the last `days` days of iOS installs and upsert into daily_metrics.ios_installs. */
export async function syncAppStore(days = 14): Promise<AppStoreResult> {
  const vendor = process.env.APPSTORE_VENDOR_NUMBER;
  const appId = process.env.APPLE_APP_ID ?? "";
  const to = addDays(qatarToday(), -1); // yesterday is the newest available report
  const from = addDays(to, -(days - 1));
  if (!vendor) return { ok: false, daysWritten: 0, totalInstalls: 0, from, to, error: "APPSTORE_VENDOR_NUMBER is not set" };

  try {
    const token = await appStoreToken();
    let daysWritten = 0;
    let totalInstalls = 0;
    let missing = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const installs = await installsForDate(token, vendor, appId, d);
      if (installs === null) { missing++; continue; }
      const { error } = await supabaseAdmin
        .from("daily_metrics")
        .upsert({ metric_date: d, ios_installs: installs, source: "appstore", updated_at: new Date().toISOString() }, { onConflict: "metric_date" });
      if (error) return { ok: false, daysWritten, totalInstalls, from, to, error: error.message };
      daysWritten++;
      totalInstalls += installs;
    }
    return {
      ok: true,
      daysWritten,
      totalInstalls,
      from,
      to,
      note: missing > 0 ? `${missing} day(s) had no report yet (normal for very recent days)` : undefined,
    };
  } catch (e) {
    return { ok: false, daysWritten: 0, totalInstalls: 0, from, to, error: (e as Error).message };
  }
}
