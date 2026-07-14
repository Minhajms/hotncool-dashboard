import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncSearchConsole } from "@/lib/searchConsole";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily aggregator. Vercel Cron calls this once a day (it automatically sends
 * Authorization: Bearer $CRON_SECRET). Runs every connected integration and
 * reports per-source status. New integrations get added to `jobs` as they land.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const jobs: Record<string, unknown> = {};

  // 1. Google Search Console
  jobs["search-console"] = await syncSearchConsole(30);

  const anyFailed = Object.values(jobs).some(
    (j) => (j as { ok?: boolean })?.ok === false,
  );

  return NextResponse.json(
    { ran_at: new Date().toISOString(), jobs },
    { status: anyFailed ? 207 : 200 },
  );
}
