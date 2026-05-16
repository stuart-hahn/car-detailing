import { useState } from "react";
import master from "../data/master_steps.json";
import { fillRequiredPhotos } from "../lib/dev/fillPhotos";
import { completeAllWorkSteps } from "../lib/dev/completeWork";
import {
  advanceQcPastFreshEyes,
  skipFreshEyesPause,
} from "../lib/dev/qcShortcuts";
import { seedDemoMaintenanceJob } from "../lib/dev/seed";
import type { JobRecord } from "../lib/db";
import type { MasterStepsFile } from "../lib/types";
import { useJobStore } from "../store/jobStore";

const masterFile = master as MasterStepsFile;

export function DevToolsPanel() {
  const { activeJob, loadJob, refreshPhotoTags, setScreen, enterQc } =
    useJobStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setMessage(null);
    try {
      const detail = await fn();
      if (detail) setMessage(detail);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-lg border border-amber-700/60 bg-amber-950/80 px-2 py-1.5 text-left text-xs text-amber-100 hover:bg-amber-900/60 disabled:opacity-40";
  const hasJob = Boolean(activeJob);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-600/40 bg-slate-950/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold uppercase tracking-wide text-amber-400"
        >
          Dev tools {open ? "▾" : "▸"}
        </button>
        {message && (
          <p className="truncate text-xs text-amber-200/90">{message}</p>
        )}
      </div>
      {open && (
        <div className="mx-auto mt-2 grid max-w-lg gap-2 pb-1 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs text-amber-200/70">
            Development only — not included in production builds.
          </p>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={() =>
              run(async () => {
                const job = requireJob(activeJob);
                const r = await fillRequiredPhotos(job, masterFile);
                await refreshPhotoTags();
                await loadJob(job.id);
                return `Filled ${r.filled} photo(s) (${r.skipped} already had)`;
              })
            }
          >
            Fill required photos
          </button>
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() =>
              run(async () => {
                const id = await seedDemoMaintenanceJob({ target: "intake" });
                await loadJob(id);
                setScreen("intake");
                return "Maintenance demo at intake";
              })
            }
          >
            Seed demo → intake
          </button>
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() =>
              run(async () => {
                const id = await seedDemoMaintenanceJob({ target: "checklist" });
                await loadJob(id);
                setScreen("checklist");
                return "Maintenance demo on checklist";
              })
            }
          >
            Seed demo → checklist
          </button>
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() =>
              run(async () => {
                const id = await seedDemoMaintenanceJob({ target: "qc" });
                await loadJob(id);
                setScreen("qc");
                return "Maintenance demo at QC (work QC passed)";
              })
            }
          >
            Seed demo → QC
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={() =>
              run(async () => {
                const job = requireJob(activeJob);
                const r = await completeAllWorkSteps(job);
                await loadJob(job.id);
                return (
                  `Completed ${r.completed} step(s)` +
                  (r.remaining ? ` · ${r.remaining} still blocked` : "")
                );
              })
            }
          >
            Complete all work steps
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={() =>
              run(async () => {
                const r = await enterQc();
                if (!r.ok) throw new Error(r.error);
                return "QC screen ready";
              })
            }
          >
            Enter QC
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={() =>
              run(async () => {
                const job = requireJob(activeJob);
                await advanceQcPastFreshEyes(job);
                await refreshPhotoTags();
                await loadJob(job.id);
                setScreen("qc");
                return "Work QC + final photos + fresh-eyes skip";
              })
            }
          >
            QC: pass work + fill finals + skip pause
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={() =>
              run(async () => {
                const job = requireJob(activeJob);
                await skipFreshEyesPause(job);
                await loadJob(job.id);
                return "Fresh-eyes pause skipped";
              })
            }
          >
            Skip fresh-eyes pause
          </button>
        </div>
      )}
    </div>
  );
}

function requireJob(job: JobRecord | null): JobRecord {
  if (!job) throw new Error("No active job");
  return job;
}
