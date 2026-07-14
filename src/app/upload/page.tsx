import { SectionTitle, Card, InfoBanner } from "@/components/ui";
import { DailyForm } from "./DailyForm";
import { FileUpload } from "./FileUpload";
import { qatarToday, formatQatar } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getRecentUploads() {
  const { data } = await supabaseAdmin
    .from("upload_log")
    .select("filename, uploaded_at, rows, note")
    .order("uploaded_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

export default async function UploadPage() {
  const today = qatarToday();
  const recent = await getRecentUploads();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Upload"
        subtitle="Manual fallback for any data not yet automated"
      />

      <InfoBanner>
        Use this while APIs are being connected. Anything you enter here flows
        straight into the dashboard (Today, This Week, Trends).
      </InfoBanner>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Enter daily figures</p>
        <DailyForm today={today} />
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold">Upload an Excel / CSV file</p>
        <FileUpload />
      </Card>

      <Card className="overflow-x-auto">
        <div className="px-5 pt-4 text-sm font-semibold">Recent entries</div>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="px-5 py-2 font-medium">When</th>
              <th className="px-5 py-2 font-medium">Source</th>
              <th className="px-5 py-2 font-medium text-right">Rows</th>
              <th className="px-5 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td className="px-5 py-3 text-[var(--muted)]" colSpan={4}>
                  No manual entries yet.
                </td>
              </tr>
            )}
            {recent.map((r, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-2">{formatQatar(r.uploaded_at)}</td>
                <td className="px-5 py-2">{r.filename}</td>
                <td className="px-5 py-2 text-right tabular-nums">{r.rows}</td>
                <td className="px-5 py-2 text-[var(--muted)]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
