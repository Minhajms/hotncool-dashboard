import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncSearchConsole } from "@/lib/searchConsole";
import { SA_EMAIL } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", hint: "pass ?key=CRON_SECRET" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days")) || 30;

  const result = await syncSearchConsole(days);
  return NextResponse.json(
    { integration: "search-console", service_account: SA_EMAIL(), ...result },
    { status: result.ok ? 200 : 502 },
  );
}
