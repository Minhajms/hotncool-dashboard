"use client";

import { useActionState } from "react";
import { saveDailyFigures, type ActionResult } from "./actions";

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--cool)]";

export function DailyForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveDailyFigures,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={today}
            max={today}
            className={inputCls}
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Orders</span>
          <input
            type="number"
            name="orders"
            min="0"
            defaultValue={0}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">iOS installs</span>
          <input
            type="number"
            name="ios_installs"
            min="0"
            defaultValue={0}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Android installs</span>
          <input
            type="number"
            name="android_installs"
            min="0"
            defaultValue={0}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Ad spend (QAR)</span>
          <input
            type="number"
            name="spend_qar"
            min="0"
            step="0.01"
            defaultValue={0}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--foreground)" }}
        >
          {pending ? "Saving…" : "Save figures"}
        </button>
        {state && (
          <span
            className="text-sm"
            style={{ color: state.ok ? "var(--good)" : "var(--bad)" }}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
