import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncGa4 } from "@/lib/ga4";
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
  const result = await syncGa4(days);
  return NextResponse.json(
    { integration: "ga4", service_account: SA_EMAIL(), ...result },
    { status: result.ok ? 200 : 502 },
  );
}
