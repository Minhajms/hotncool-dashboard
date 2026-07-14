import { getGoogleAccessToken } from "./google";
import { supabaseAdmin } from "./supabase";
import { qatarToday, addDays } from "./dates";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type SyncResult = {
  ok: boolean;
  rows: number;
  from: string;
  to: string;
  site: string;
  error?: string;
};

/**
 * Pull daily Search Console performance (clicks, impressions, ctr, position)
 * for the last `days` days and upsert into search_console_daily.
 * Search Console data lags ~2 days, so we re-fetch a rolling window each run.
 */
export async function syncSearchConsole(days = 30): Promise<SyncResult> {
  const site = process.env.GSC_SITE_URL;
  if (!site) return blank("GSC_SITE_URL is not set");

  const to = qatarToday();
  const from = addDays(to, -days);

  try {
    const token = await getGoogleAccessToken([SCOPE]);
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      site,
    )}/searchAnalytics/query`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: from,
        endDate: to,
        dimensions: ["date"],
        rowLimit: 1000,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, rows: 0, from, to, site, error: `${res.status}: ${text.slice(0, 300)}` };
    }

    const data = (await res.json()) as {
      rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
    };
    const rows = data.rows ?? [];

    if (rows.length > 0) {
      const upserts = rows.map((r) => ({
        date: r.keys[0],
        clicks: Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
        ctr: Number((r.ctr ?? 0).toFixed(4)),
        position: Number((r.position ?? 0).toFixed(2)),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabaseAdmin
        .from("search_console_daily")
        .upsert(upserts, { onConflict: "date" });
      if (error) return { ok: false, rows: 0, from, to, site, error: error.message };
    }

    return { ok: true, rows: rows.length, from, to, site };
  } catch (e) {
    return { ok: false, rows: 0, from, to, site, error: (e as Error).message };
  }

  function blank(msg: string): SyncResult {
    return { ok: false, rows: 0, from: "", to: "", site: site ?? "", error: msg };
  }
}
