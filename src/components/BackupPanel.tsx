import { useRef, useState } from "react";
import {
  exportJobsJson,
  exportJobsZip,
  importFromFile,
} from "../lib/backup/io";

interface BackupPanelProps {
  jobId?: string;
  compact?: boolean;
  onExported?: () => void;
  onImported?: () => void;
}

export function BackupPanel({
  jobId,
  compact,
  onExported,
  onImported,
}: BackupPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  const title = jobId ? "Backup this job" : "Backup & restore";
  const actionsClass = compact
    ? "flex flex-wrap gap-2"
    : "grid gap-2 sm:grid-cols-2";

  return (
    <section
      className={
        compact
          ? "space-y-2"
          : "space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
      }
    >
      {!compact && (
        <>
          <h3 className="font-medium text-slate-200">{title}</h3>
          <p className="text-sm text-slate-400">
            Export JSON for records, or ZIP to include photos. Import merges by
            ID into this device.
          </p>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}

      <div className={actionsClass}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await exportJobsJson(jobId ? [jobId] : undefined, false);
              setMessage(jobId ? "Job JSON downloaded." : "All jobs JSON downloaded.");
              onExported?.();
            })
          }
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
        >
          Export JSON
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await exportJobsZip(jobId ? [jobId] : undefined);
              setMessage(
                jobId ? "Job ZIP (with photos) downloaded." : "Full ZIP downloaded.",
              );
              onExported?.();
            })
          }
          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 disabled:opacity-50"
        >
          Export ZIP + photos
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.zip,application/json,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void run(async () => {
            const result = await importFromFile(file);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(
              `Imported ${result.jobs} job(s), ${result.photos} photo(s), ${result.customers} customer(s).`,
            );
            onImported?.();
          });
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 disabled:opacity-50"
      >
        Import backup…
      </button>
    </section>
  );
}
