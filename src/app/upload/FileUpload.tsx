"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FileUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setMsg({
          ok: true,
          text: `Imported ${data.imported} day(s): ${data.first} → ${data.last}. Dashboard updated.`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: data.error || "Upload failed." });
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Upload a <b>.csv</b> or <b>.xlsx</b> file. First row = headers. Recognised
        columns (any order, flexible names):{" "}
        <code className="rounded bg-[var(--surface-2)] px-1">date</code>,{" "}
        <code className="rounded bg-[var(--surface-2)] px-1">ios_installs</code>,{" "}
        <code className="rounded bg-[var(--surface-2)] px-1">android_installs</code>,{" "}
        <code className="rounded bg-[var(--surface-2)] px-1">orders</code>,{" "}
        <code className="rounded bg-[var(--surface-2)] px-1">spend_qar</code>.
      </p>
      <label
        className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-8 text-sm font-medium transition-colors hover:border-[var(--cool)]"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={onFile}
          disabled={busy}
          className="hidden"
        />
        {busy ? "Importing…" : "Click to choose a CSV / Excel file"}
      </label>
      {msg && (
        <p
          className="text-sm"
          style={{ color: msg.ok ? "var(--good)" : "var(--bad)" }}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
