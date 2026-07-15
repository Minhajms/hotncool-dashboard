import { supabaseAdmin } from "./supabase";

export type SourceStatus = {
  name: string;
  icon: string;
  tracks: string;
  category: "App" | "Website" | "Ads" | "Search";
  status: "live" | "pending" | "not_connected";
  lastDate: string | null;
  detail: string;
};

async function maxDate(table: string, dateCol: string, filter?: { col: string; op: string; val: string }) {
  let q = supabaseAdmin.from(table).select(`${dateCol}`).order(dateCol, { ascending: false }).limit(1);
  if (filter) q = q.filter(filter.col, filter.op, filter.val);
  const { data } = await q.maybeSingle();
  return (data as Record<string, string> | null)?.[dateCol] ?? null;
}

async function countRows(table: string, filter?: { col: string; op: string; val: string }) {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.filter(filter.col, filter.op, filter.val);
  const { count } = await q;
  return count ?? 0;
}

/** Live status + freshness for every data source — the agency coverage view. */
export async function getSourceStatuses(): Promise<SourceStatus[]> {
  const [scDate, ga4Date, metaDate, clarityDate, iosDate, androidDate, iosCount, androidCount] = await Promise.all([
    maxDate("search_console_daily", "date"),
    maxDate("ga4_daily", "date"),
    maxDate("meta_spend_daily", "date"),
    maxDate("clarity_daily", "date"),
    maxDate("daily_metrics", "metric_date", { col: "source", op: "eq", val: "appstore" }),
    maxDate("daily_metrics", "metric_date", { col: "source", op: "eq", val: "play" }),
    countRows("daily_metrics", { col: "source", op: "eq", val: "appstore" }),
    countRows("daily_metrics", { col: "source", op: "eq", val: "play" }),
  ]);

  return [
    {
      name: "Microsoft Clarity", icon: "📲", category: "App",
      tracks: "In-app behaviour: sessions, screens, dead/rage taps, engagement",
      status: clarityDate ? "live" : "pending",
      lastDate: clarityDate,
      detail: clarityDate ? "Daily snapshots; history builds each morning" : "Awaiting first snapshot",
    },
    {
      name: "App Store Connect (iOS)", icon: "🍎", category: "App",
      tracks: "iPhone first-time downloads (installs)",
      status: iosCount > 0 ? "live" : "pending",
      lastDate: iosDate,
      detail: iosCount > 0 ? "Analytics Reports API" : "Set up — Apple generating first reports (~24–48h)",
    },
    {
      name: "Google Play (Android)", icon: "🤖", category: "App",
      tracks: "Android daily device installs",
      status: androidCount > 0 ? "live" : "pending",
      lastDate: androidDate,
      detail: androidCount > 0 ? "Bulk report CSVs" : "Set up — awaiting Google to apply bucket access",
    },
    {
      name: "Firebase (app analytics)", icon: "🔥", category: "App",
      tracks: "App DAU/WAU/MAU, retention, crash-free rate, screen views",
      status: "not_connected",
      lastDate: null,
      detail: "Not connected — needs the app's GA4/Firebase Property ID + robot access",
    },
    {
      name: "Google Analytics (GA4)", icon: "🌐", category: "Website",
      tracks: "Website visitors, sessions, channels (hotncool.qa)",
      status: ga4Date ? "live" : "pending",
      lastDate: ga4Date,
      detail: "Property 402884012 (website)",
    },
    {
      name: "Google Search Console", icon: "🔎", category: "Search",
      tracks: "Search clicks, impressions, position, top queries",
      status: scDate ? "live" : "pending",
      lastDate: scDate,
      detail: "Domain property sc-domain:hotncool.qa",
    },
    {
      name: "Meta Ads", icon: "💸", category: "Ads",
      tracks: "Spend, link clicks, cost per click, per-campaign",
      status: metaDate ? "live" : "pending",
      lastDate: metaDate,
      detail: "Ad account 561606594634055 (QAR)",
    },
  ];
}
