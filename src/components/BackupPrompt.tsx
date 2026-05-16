import { useState } from "react";
import { exportJobsZip } from "../lib/backup/io";
import { dismissBackupPrompt } from "../lib/backup/prompt";

interface BackupPromptProps {
  jobId: string;
  customerName: string;
  onDismiss: () => void;
}

export function BackupPrompt({
  jobId,
  customerName,
  onDismiss,
}: BackupPromptProps) {
  const [busy, setBusy] = useState(false);

  function dismiss() {
    dismissBackupPrompt(jobId);
    onDismiss();
  }

  return (
    <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
      <p className="font-medium text-sky-100">Save a backup?</p>
      <p className="text-sm text-sky-200/90">
        {customerName} is complete. Download a ZIP with photos so this job is
        safe if you clear browser data.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void exportJobsZip([jobId])
              .then(() => dismiss())
              .finally(() => setBusy(false));
          }}
          className="rounded-lg bg-sky-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Export ZIP"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={dismiss}
          className="rounded-lg border border-slate-600 py-2 text-sm text-slate-300"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
