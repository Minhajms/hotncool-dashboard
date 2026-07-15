import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncPlay } from "@/lib/play";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await syncPlay();
  return NextResponse.json({ integration: "play", ...result }, { status: result.ok ? 200 : 502 });
}
