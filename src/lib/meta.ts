import { supabaseAdmin } from "./supabase";
import { qatarToday, addDays } from "./dates";

const API = "https://graph.facebook.com/v21.0";

// Action types we count as a "result" (conversion), best-effort across objectives.
const RESULT_ACTIONS = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
  "mobile_app_install",
  "app_install",
  "omni_app_install",
  "lead",
  "onsite_conversion.lead_grouped",
]);

export type MetaResult = {
  ok: boolean;
  rows: number;
  from: string;
  to: string;
  account?: string;
  error?: string;
};

type InsightRow = {
  date_start: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  inline_link_clicks?: string;
  actions?: { action_type: string; value: string }[];
};

// Prefer real conversions (purchases/installs/leads); if none are tracked,
// fall back to link clicks. We surface which one it is in the UI label.
function deriveResults(row: InsightRow): number {
  const actions = row.actions ?? [];
  let sum = 0;
  for (const a of actions) {
    if (RESULT_ACTIONS.has(a.action_type)) sum += Number(a.value ?? 0);
  }
  if (sum === 0) sum = Number(row.inline_link_clicks ?? 0);
  return Math.round(sum);
}

/**
 * Pull daily, per-campaign Meta ad spend + results for the last `days` days
 * and upsert into meta_spend_daily (keyed on date + campaign_id).
 */
export async function syncMeta(days = 30): Promise<MetaResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const account = process.env.META_AD_ACCOUNT_ID; // e.g. act_561606594634055
  const to = qatarToday();
  const from = addDays(to, -days);

  if (!token || !account) {
    return { ok: false, rows: 0, from, to, error: "META_ACCESS_TOKEN / META_AD_ACCOUNT_ID not set" };
  }

  try {
    const params = new URLSearchParams({
      level: "campaign",
      time_increment: "1",
      fields: "campaign_id,campaign_name,spend,actions,inline_link_clicks",
      time_range: JSON.stringify({ since: from, until: to }),
      limit: "500",
      access_token: token,
    });
    let url: string | null = `${API}/${account}/insights?${params.toString()}`;

    const collected: InsightRow[] = [];
    let guard = 0;
    while (url && guard < 20) {
      guard++;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, rows: 0, from, to, account, error: `${res.status}: ${text.slice(0, 300)}` };
      }
      const json = (await res.json()) as { data?: InsightRow[]; paging?: { next?: string } };
      collected.push(...(json.data ?? []));
      url = json.paging?.next ?? null;
    }

    if (collected.length > 0) {
      const upserts = collected.map((r) => ({
        date: r.date_start,
        campaign_id: r.campaign_id ?? "unknown",
        campaign_name: r.campaign_name ?? "(unnamed)",
        spend_qar: Number(r.spend ?? 0),
        results: deriveResults(r),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabaseAdmin
        .from("meta_spend_daily")
        .upsert(upserts, { onConflict: "date,campaign_id" });
      if (error) return { ok: false, rows: 0, from, to, account, error: error.message };
    }

    return { ok: true, rows: collected.length, from, to, account };
  } catch (e) {
    return { ok: false, rows: 0, from, to, account, error: (e as Error).message };
  }
}
