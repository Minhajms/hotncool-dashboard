import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncAppStore } from "@/lib/appstore";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days")) || 14;
  const result = await syncAppStore(days);
  return NextResponse.json({ integration: "appstore", ...result }, { status: result.ok ? 200 : 502 });
}
