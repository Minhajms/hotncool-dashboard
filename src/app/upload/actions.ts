"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

export type ActionResult = { ok: boolean; message: string };

/** Manually upsert one day's figures into daily_metrics. */
export async function saveDailyFigures(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const date = String(formData.get("date") || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: "Please choose a valid date." };
  }
  const toInt = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v >= 0 ? Math.round(v) : 0;
  };
  const toNum = (k: string) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };

  const row = {
    metric_date: date,
    ios_installs: toInt("ios_installs"),
    android_installs: toInt("android_installs"),
    orders: toInt("orders"),
    spend_qar: toNum("spend_qar"),
    source: "manual",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("daily_metrics")
    .upsert(row, { onConflict: "metric_date" });

  if (error) {
    return { ok: false, message: `Could not save: ${error.message}` };
  }

  await supabaseAdmin.from("upload_log").insert({
    filename: "manual-daily-form",
    rows: 1,
    note: `Daily figures for ${date}`,
  });

  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath("/upload");
  return {
    ok: true,
    message: `Saved figures for ${date}. Today & This Week are now updated.`,
  };
}
