import { NextResponse } from "next/server";
import { parseUploadFile } from "@/lib/parseUpload";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }

  let rows;
  try {
    rows = await parseUploadFile(file.name, await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Could not read file: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No valid rows found. Make sure the first row has headers like: date, ios_installs, android_installs, orders, spend_qar.",
      },
      { status: 400 },
    );
  }

  const upserts = rows.map((r) => ({ ...r, source: "manual", updated_at: new Date().toISOString() }));
  const { error } = await supabaseAdmin
    .from("daily_metrics")
    .upsert(upserts, { onConflict: "metric_date" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("upload_log").insert({
    filename: file.name,
    rows: rows.length,
    note: `Imported ${rows.length} day(s): ${rows[0].metric_date} → ${rows[rows.length - 1].metric_date}`,
  });

  return NextResponse.json({ ok: true, imported: rows.length, first: rows[0].metric_date, last: rows[rows.length - 1].metric_date });
}
