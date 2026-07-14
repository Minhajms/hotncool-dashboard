import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/auth";
import { syncClarity } from "@/lib/clarity";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await syncClarity();
  return NextResponse.json({ integration: "clarity", ...result }, { status: result.ok ? 200 : 502 });
}
