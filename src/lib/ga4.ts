import { getGoogleAccessToken } from "./google";
import { supabaseAdmin } from "./supabase";
import { qatarToday, addDays } from "./dates";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export type Ga4Result = {
  ok: boolean;
  rows: number;
  from: string;
  to: string;
  property?: string;
  error?: string;
};

/**
 * Pull daily users/sessions per channel from GA4 and upsert into ga4_daily.
 * Rolling window of `days` days, re-fetched each run (upsert on date+channel).
 */
export async function syncGa4(days = 30): Promise<Ga4Result> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const to = qatarToday();
  const from = addDays(to, -days);
  if (!propertyId) {
    return { ok: false, rows: 0, from, to, error: "GA4_PROPERTY_ID is not set" };
  }

  try {
    const token = await getGoogleAccessToken([SCOPE]);
    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }],
        limit: 10000,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, rows: 0, from, to, property: propertyId, error: `${res.status}: ${text.slice(0, 300)}` };
    }

    const data = (await res.json()) as {
      rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
    };
    const rows = data.rows ?? [];

    if (rows.length > 0) {
      const upserts = rows.map((r) => {
        const ymd = r.dimensionValues[0].value; // "YYYYMMDD"
        const date = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
        return {
          date,
          channel: r.dimensionValues[1].value || "(unknown)",
          users: Math.round(Number(r.metricValues[0].value ?? 0)),
          sessions: Math.round(Number(r.metricValues[1].value ?? 0)),
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabaseAdmin
        .from("ga4_daily")
        .upsert(upserts, { onConflict: "date,channel" });
      if (error) return { ok: false, rows: 0, from, to, property: propertyId, error: error.message };
    }

    return { ok: true, rows: rows.length, from, to, property: propertyId };
  } catch (e) {
    return { ok: false, rows: 0, from, to, property: propertyId, error: (e as Error).message };
  }
}
