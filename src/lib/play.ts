import { JWT } from "google-auth-library";
import { gunzipSync } from "node:zlib";
import { supabaseAdmin } from "./supabase";

export type PlayResult = {
  ok: boolean;
  daysWritten: number;
  totalInstalls: number;
  filesRead?: number;
  error?: string;
  note?: string;
};

const SCOPE = "https://www.googleapis.com/auth/devstorage.read_only";

function getSa() {
  const b64 = process.env.GSC_SA_KEY_B64;
  if (!b64) throw new Error("GSC_SA_KEY_B64 not set");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as { client_email: string; private_key: string };
}

/** Decode Play's UTF-16 (BOM) CSV. */
function decodeCsv(buf: Buffer): string {
  let b = buf;
  // gzip?
  if (b[0] === 0x1f && b[1] === 0x8b) b = Buffer.from(gunzipSync(b));
  // UTF-16LE BOM
  if (b[0] === 0xff && b[1] === 0xfe) return b.toString("utf16le").replace(/^﻿/, "");
  // UTF-16BE BOM
  if (b[0] === 0xfe && b[1] === 0xff) return b.swap16().toString("utf16le").replace(/^﻿/, "");
  return b.toString("utf8").replace(/^﻿/, "");
}

function splitCsvLine(line: string): string[] {
  // Play overview CSVs are simple comma-separated with quoted fields.
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Android installs from the Google Play "installs overview" CSVs in the reporting
 * GCS bucket. Files: stats/installs/installs_<package>_<YYYYMM>_overview.csv
 * We read the current + previous month, take "Daily Device Installs" per Date,
 * and upsert daily_metrics.android_installs.
 */
export async function syncPlay(): Promise<PlayResult> {
  const bucket = process.env.PLAY_BUCKET;
  if (!bucket) return { ok: false, daysWritten: 0, totalInstalls: 0, error: "PLAY_BUCKET not set" };

  try {
    const sa = getSa();
    const client = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE] });
    const { token } = await client.getAccessToken();
    const H = { Authorization: `Bearer ${token}` };

    // list install overview files
    const listRes = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=stats/installs/&maxResults=200`,
      { headers: H },
    );
    if (listRes.status === 403) {
      return { ok: true, daysWritten: 0, totalInstalls: 0, note: "Robot not yet granted bucket access (Google may still be applying the Play Console permission)." };
    }
    if (!listRes.ok) return { ok: false, daysWritten: 0, totalInstalls: 0, error: `list ${listRes.status}: ${(await listRes.text()).slice(0, 160)}` };
    const list = (await listRes.json()) as { items?: { name: string }[] };
    const overview = (list.items ?? [])
      .map((i) => i.name)
      .filter((n) => /_overview\.csv$/i.test(n))
      .sort()
      .slice(-3); // last few months
    if (overview.length === 0) return { ok: true, daysWritten: 0, totalInstalls: 0, note: "No install overview files found yet." };

    const byDate = new Map<string, number>();
    let filesRead = 0;
    for (const name of overview) {
      const objRes = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`,
        { headers: H },
      );
      if (!objRes.ok) continue;
      const text = decodeCsv(Buffer.from(await objRes.arrayBuffer()));
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) continue;
      filesRead++;
      const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
      const iDate = header.indexOf("date");
      const iInstalls = header.findIndex((h) => h.includes("daily device installs"));
      if (iDate < 0 || iInstalls < 0) continue;
      for (const line of lines.slice(1)) {
        const c = splitCsvLine(line);
        const date = c[iDate];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        byDate.set(date, (byDate.get(date) ?? 0) + (Number(c[iInstalls] ?? 0) || 0));
      }
    }

    let daysWritten = 0;
    let totalInstalls = 0;
    for (const [date, installs] of byDate) {
      const { error } = await supabaseAdmin
        .from("daily_metrics")
        .upsert({ metric_date: date, android_installs: installs, source: "play", updated_at: new Date().toISOString() }, { onConflict: "metric_date" });
      if (error) return { ok: false, daysWritten, totalInstalls, error: error.message };
      daysWritten++;
      totalInstalls += installs;
    }
    return { ok: true, daysWritten, totalInstalls, filesRead };
  } catch (e) {
    return { ok: false, daysWritten: 0, totalInstalls: 0, error: (e as Error).message };
  }
}
