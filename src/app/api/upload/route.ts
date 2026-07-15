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

  let parsed;
  try {
    parsed = await parseUploadFile(file.name, await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Could not read file: ${(e as Error).message}` },
      { status: 400 },
    );
  }
  const { rows, fields } = parsed;

  if (rows.length === 0 || fields.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No valid rows found. Make sure the first row has headers like: date, ios_installs, android_installs, orders, spend_qar.",
      },
      { status: 400 },
    );
  }

  // Only write the columns the file actually contained — a file with just
  // "date,orders" must never zero out installs fetched from the APIs.
  const upserts = rows.map((r) => {
    const rec: Record<string, unknown> = {
      metric_date: r.metric_date,
      source: "manual",
      updated_at: new Date().toISOString(),
    };
    for (const f of fields) rec[f] = r[f] ?? 0;
    return rec;
  });
  const { error } = await supabaseAdmin
    .from("daily_metrics")
    .upsert(upserts, { onConflict: "metric_date" });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const first = String(rows[0].metric_date);
  const last = String(rows[rows.length - 1].metric_date);
  await supabaseAdmin.from("upload_log").insert({
    filename: file.name,
    rows: rows.length,
    note: `Imported ${rows.length} day(s) [${fields.join(", ")}]: ${first} → ${last}`,
  });

  return NextResponse.json({ ok: true, imported: rows.length, columns: fields, first, last });
}
