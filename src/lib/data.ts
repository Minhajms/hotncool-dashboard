import { supabaseAdmin } from "./supabase";
import { qatarToday, weekStartFor, addDays } from "./dates";

export type WeeklyMetric = {
  week_start: string;
  week_end: string;
  week_number: number | null;
  installs: number | null;
  ios_installs: number | null;
  android_installs: number | null;
  orders: number | null;
  spend_qar: number | null;
  source: string | null;
  updated_at: string | null;
};

export type DailyMetric = {
  metric_date: string;
  ios_installs: number;
  android_installs: number;
  orders: number;
  spend_qar: number;
  source: string | null;
  updated_at: string | null;
};

export async function getWeeklyMetrics(): Promise<WeeklyMetric[]> {
  const { data, error } = await supabaseAdmin
    .from("weekly_metrics")
    .select("*")
    .order("week_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeeklyMetric[];
}

export async function getDailyRange(
  start: string,
  end: string,
): Promise<DailyMetric[]> {
  const { data, error } = await supabaseAdmin
    .from("daily_metrics")
    .select("*")
    .gte("metric_date", start)
    .lte("metric_date", end)
    .order("metric_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyMetric[];
}

/** One day's metrics (or null if no row yet). */
export async function getDay(date: string): Promise<DailyMetric | null> {
  const { data, error } = await supabaseAdmin
    .from("daily_metrics")
    .select("*")
    .eq("metric_date", date)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyMetric) ?? null;
}

export async function getAppMeta(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("app_meta")
    .select("key,value");
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of data ?? []) out[row.key] = Number(row.value);
  return out;
}

export async function getOrdersCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Most recent updated_at across the tables that feed the dashboard. */
export async function getLastUpdated(): Promise<string | null> {
  const tables = ["daily_metrics", "weekly_metrics"] as const;
  let latest: string | null = null;
  for (const t of tables) {
    const { data } = await supabaseAdmin
      .from(t)
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const u = (data as { updated_at?: string } | null)?.updated_at ?? null;
    if (u && (!latest || u > latest)) latest = u;
  }
  return latest;
}

export type SearchConsoleDay = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleSummary = {
  hasData: boolean;
  days: SearchConsoleDay[];
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
};

export async function getSearchConsoleSummary(
  days = 30,
): Promise<SearchConsoleSummary> {
  const { data } = await supabaseAdmin
    .from("search_console_daily")
    .select("date,clicks,impressions,ctr,position")
    .order("date", { ascending: true })
    .limit(days);
  const rows = (data ?? []) as SearchConsoleDay[];
  const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition =
    rows.length > 0
      ? rows.reduce((s, r) => s + Number(r.position ?? 0), 0) / rows.length
      : 0;
  return {
    hasData: rows.length > 0,
    days: rows,
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
  };
}

export type Ga4Summary = {
  hasData: boolean;
  totalUsers: number;
  totalSessions: number;
  channels: { channel: string; users: number; sessions: number }[];
};

export async function getGa4Summary(days = 30): Promise<Ga4Summary> {
  const { data } = await supabaseAdmin
    .from("ga4_daily")
    .select("channel,users,sessions");
  const rows = (data ?? []) as { channel: string; users: number; sessions: number }[];
  const byCh = new Map<string, { users: number; sessions: number }>();
  let totalUsers = 0;
  let totalSessions = 0;
  for (const r of rows) {
    totalUsers += r.users ?? 0;
    totalSessions += r.sessions ?? 0;
    const c = byCh.get(r.channel) ?? { users: 0, sessions: 0 };
    c.users += r.users ?? 0;
    c.sessions += r.sessions ?? 0;
    byCh.set(r.channel, c);
  }
  const channels = [...byCh.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.users - a.users);
  return { hasData: rows.length > 0, totalUsers, totalSessions, channels };
}

export type MetaSummary = {
  hasData: boolean;
  totalSpend: number;
  totalResults: number;
  from: string | null;
  to: string | null;
  dailySpend: { date: string; spend: number }[];
  campaigns: { campaign_name: string; spend: number; results: number }[];
};

export async function getMetaSummary(days = 30): Promise<MetaSummary> {
  const { data } = await supabaseAdmin
    .from("meta_spend_daily")
    .select("date,campaign_name,spend_qar,results")
    .order("date", { ascending: true });
  const rows = (data ?? []) as {
    date: string;
    campaign_name: string;
    spend_qar: number;
    results: number;
  }[];

  const byDay = new Map<string, number>();
  const byCampaign = new Map<string, { spend: number; results: number }>();
  let totalSpend = 0;
  let totalResults = 0;
  for (const r of rows) {
    const spend = Number(r.spend_qar ?? 0);
    const results = r.results ?? 0;
    totalSpend += spend;
    totalResults += results;
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + spend);
    const c = byCampaign.get(r.campaign_name) ?? { spend: 0, results: 0 };
    c.spend += spend;
    c.results += results;
    byCampaign.set(r.campaign_name, c);
  }
  const dailySpend = [...byDay.entries()]
    .map(([date, spend]) => ({ date, spend }))
    .slice(-days);
  const campaigns = [...byCampaign.entries()]
    .map(([campaign_name, v]) => ({ campaign_name, ...v }))
    .sort((a, b) => b.spend - a.spend);

  return {
    hasData: rows.length > 0,
    totalSpend,
    totalResults,
    from: rows[0]?.date ?? null,
    to: rows[rows.length - 1]?.date ?? null,
    dailySpend,
    campaigns,
  };
}

export type ClarityLatest = {
  hasData: boolean;
  date: string | null;
  sessions: number;
  distinctUsers: number;
  iosSessions: number;
  androidSessions: number;
  screensPerSession: number;
  engagementActive: number;
  deadTaps: number;
  rageTaps: number;
  topCountry: string;
};

export async function getClarityLatest(): Promise<ClarityLatest> {
  const { data } = await supabaseAdmin
    .from("clarity_daily")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = data as Record<string, unknown> | null;
  if (!r) {
    return {
      hasData: false,
      date: null,
      sessions: 0,
      distinctUsers: 0,
      iosSessions: 0,
      androidSessions: 0,
      screensPerSession: 0,
      engagementActive: 0,
      deadTaps: 0,
      rageTaps: 0,
      topCountry: "",
    };
  }
  return {
    hasData: true,
    date: String(r.date),
    sessions: Number(r.sessions ?? 0),
    distinctUsers: Number(r.distinct_users ?? 0),
    iosSessions: Number(r.ios_sessions ?? 0),
    androidSessions: Number(r.android_sessions ?? 0),
    screensPerSession: Number(r.screens_per_session ?? 0),
    engagementActive: Number(r.engagement_active ?? 0),
    deadTaps: Number(r.dead_taps ?? 0),
    rageTaps: Number(r.rage_taps ?? 0),
    topCountry: String(r.top_country ?? ""),
  };
}

export type WeekTotals = {
  installs: number;
  ios: number;
  android: number;
  orders: number;
  spend: number;
  hasDaily: boolean;
};

/** Sum daily rows for the current Thu–Wed week (up to today). */
export async function getCurrentWeekTotals(): Promise<{
  weekStart: string;
  weekEnd: string;
  totals: WeekTotals;
}> {
  const today = qatarToday();
  const weekStart = weekStartFor(today);
  const weekEnd = addDays(weekStart, 6);
  const rows = await getDailyRange(weekStart, today);
  const totals: WeekTotals = {
    installs: 0,
    ios: 0,
    android: 0,
    orders: 0,
    spend: 0,
    hasDaily: rows.length > 0,
  };
  for (const r of rows) {
    totals.ios += r.ios_installs ?? 0;
    totals.android += r.android_installs ?? 0;
    totals.orders += r.orders ?? 0;
    totals.spend += Number(r.spend_qar ?? 0);
  }
  totals.installs = totals.ios + totals.android;
  return { weekStart, weekEnd, totals };
}
