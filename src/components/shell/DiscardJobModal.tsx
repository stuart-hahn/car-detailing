import { useState } from "react";

interface DiscardJobModalProps {
  customerName: string;
  needsReason: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function DiscardJobModal({
  customerName,
  needsReason,
  onConfirm,
  onCancel,
}: DiscardJobModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-title"
    >
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h2 id="discard-title" className="text-lg font-semibold text-white">
          Switch jobs?
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {needsReason ? (
            <>
              Work has started on <strong className="text-slate-200">{customerName}</strong>.
              Decline this job with a reason before starting another.
            </>
          ) : (
            <>
              Discard the draft for <strong className="text-slate-200">{customerName}</strong>?
            </>
          )}
        </p>
        {needsReason && (
          <label className="mt-4 block space-y-1">
            <span className="text-sm text-slate-400">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Customer rescheduled, wrong vehicle, etc."
            />
          </label>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={needsReason && !reason.trim()}
            onClick={() => onConfirm(needsReason ? reason.trim() : undefined)}
            className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {needsReason ? "Decline & continue" : "Discard draft"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
