import type { JobRecord } from "../../lib/db";
import { isStaleDraft } from "../../lib/navigation/jobPhase";

interface StaleDraftBannerProps {
  job: JobRecord;
  onResume: () => void;
  onDiscard: () => void;
}

export function StaleDraftBanner({
  job,
  onResume,
  onDiscard,
}: StaleDraftBannerProps) {
  if (!isStaleDraft(job)) return null;

  return (
    <section
      role="status"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
    >
      <p className="font-medium">Stale draft — {job.customer_name}</p>
      <p className="mt-1 text-amber-200/80">
        Started over 24 hours ago. Resume intake or discard this draft.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onResume}
          className="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
        >
          Resume intake
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 rounded-lg border border-amber-600/50 px-4 py-2 text-sm text-amber-100"
        >
          Discard draft
        </button>
      </div>
    </section>
  );
}
