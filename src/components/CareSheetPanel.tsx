import { useEffect, useMemo, useState } from "react";
import type { AppSettings } from "../lib/db";
import type { JobRecord } from "../lib/db";
import { careSheetFromJob } from "../lib/careSheet/generate";
import { shareCareSheetText, type ShareResult } from "../lib/careSheet/share";

interface CareSheetPanelProps {
  job: JobRecord;
  settings: AppSettings;
  /** Saved content from job record (post-delivery). */
  savedContent?: string;
  savedAt?: string;
}

export function CareSheetPanel({
  job,
  settings,
  savedContent,
  savedAt,
}: CareSheetPanelProps) {
  const preview = useMemo(
    () => careSheetFromJob(job, settings),
    [job, settings],
  );
  const content = savedContent ?? preview;
  const isMaintenance = job.tier === "maintenance";

  const [shareStatus, setShareStatus] = useState<ShareResult | null>(null);

  useEffect(() => {
    if (!shareStatus) return;
    const id = setTimeout(() => setShareStatus(null), 3000);
    return () => clearTimeout(id);
  }, [shareStatus]);

  async function handleShare() {
    const result = await shareCareSheetText(
      content,
      `${settings.business_name} — care sheet`,
    );
    setShareStatus(result);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div>
        <h3 className="font-medium">Care sheet</h3>
        <p className="mt-1 text-sm text-slate-400">
          {isMaintenance
            ? "Optional short handoff snippet for maintenance visits."
            : "Auto-generated from tier, add-ons, and your product picklist."}
        </p>
        {savedAt && (
          <p className="mt-1 text-xs text-slate-500">
            Saved {new Date(savedAt).toLocaleString()}
          </p>
        )}
      </div>

      <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
        {content}
      </pre>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          className="rounded-lg bg-sky-600 py-2 text-sm font-medium text-white"
        >
          {typeof navigator.share === "function" ? "Share" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard.writeText(content).then(() =>
              setShareStatus("copied"),
            )
          }
          className="rounded-lg border border-slate-600 py-2 text-sm text-slate-300"
        >
          Copy text
        </button>
      </div>

      {shareStatus === "shared" && (
        <p className="mt-2 text-xs text-emerald-400">Shared via device sheet.</p>
      )}
      {shareStatus === "copied" && (
        <p className="mt-2 text-xs text-emerald-400">Copied to clipboard.</p>
      )}
      {shareStatus === "failed" && (
        <p className="mt-2 text-xs text-red-300">Could not share or copy.</p>
      )}
    </div>
  );
}
