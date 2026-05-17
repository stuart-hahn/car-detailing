import { useState } from "react";
import master from "../data/master_steps.json";
import { fillRequiredPhotos } from "../lib/dev/fillPhotos";
import { completeAllWorkSteps } from "../lib/dev/completeWork";
import { logDevToolError, logDevToolStart } from "../lib/dev/log";
import {
  advanceQcPastFreshEyes,
  skipFreshEyesPause,
} from "../lib/dev/qcShortcuts";
import { DEMO_NEW_JOB } from "../lib/dev/demoJob";
import { clearAllJobHistory } from "../lib/dev/clearHistory";
import { seedDemoMaintenanceJob } from "../lib/dev/seed";
import type { JobRecord } from "../lib/db";
import type { MasterStepsFile } from "../lib/types";
import { useJobStore } from "../store/jobStore";

const masterFile = master as MasterStepsFile;

export function DevToolsPanel() {
  const {
    activeJob,
    loadJob,
    refreshPhotoTags,
    setJobPhaseScreen,
    enterQc,
    prefillNewJobForm,
    resetAfterHistoryClear,
  } = useJobStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<string | void>) {
    setBusy(true);
    setMessage(null);
    logDevToolStart(action);
    try {
      const detail = await fn();
      if (detail) setMessage(detail);
    } catch (error) {
      logDevToolError(action, error, {
        jobId: activeJob?.id,
        jobPhaseScreen: useJobStore.getState().jobPhaseScreen,
      });
      const text =
        error instanceof Error ? error.message : "Dev tool failed";
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  const btn =
    "rounded-lg border border-amber-700/60 bg-amber-950/80 px-2 py-1.5 text-left text-xs text-amber-100 hover:bg-amber-900/60 disabled:opacity-40";
  const dangerBtn =
    "rounded-lg border border-red-700/70 bg-red-950/80 px-2 py-1.5 text-left text-xs text-red-100 hover:bg-red-900/50 disabled:opacity-40 sm:col-span-2";
  const hasJob = Boolean(activeJob);

  return (
    <DevToolsShell
      open={open}
      busy={busy}
      message={message}
      hasJob={hasJob}
      btn={btn}
      onToggle={() => setOpen((v) => !v)}
      onFillPhotos={() =>
        run("fillRequiredPhotos", async () => {
          const job = requireJob(activeJob);
          const r = await fillRequiredPhotos(job, masterFile);
          await refreshPhotoTags();
          await loadJob(job.id);
          if (r.failed > 0) {
            const detail = r.errors
              .map((e) => `${e.tag}: ${e.message}`)
              .join("; ");
            throw new Error(`${r.failed} photo(s) failed: ${detail}`);
          }
          return `Filled ${r.filled} photo(s) (${r.skipped} already had)`;
        })
      }
      onFillNewJob={() => {
        try {
          logDevToolStart("prefillNewJobForm");
          prefillNewJobForm(DEMO_NEW_JOB);
          setMessage("New job form filled");
        } catch (error) {
          logDevToolError("prefillNewJobForm", error);
          setMessage(
            error instanceof Error ? error.message : "Prefill failed",
          );
        }
      }}
      onSeedIntake={() =>
        run("seedDemoMaintenanceJob:intake", async () => {
          const id = await seedDemoMaintenanceJob({ target: "intake" });
          await loadJob(id);
          setJobPhaseScreen("intake");
          return "Maintenance demo at intake";
        })
      }
      onSeedChecklist={() =>
        run("seedDemoMaintenanceJob:checklist", async () => {
          const id = await seedDemoMaintenanceJob({ target: "checklist" });
          await loadJob(id);
          setJobPhaseScreen("checklist");
          return "Maintenance demo on checklist";
        })
      }
      onSeedQc={() =>
        run("seedDemoMaintenanceJob:qc", async () => {
          const id = await seedDemoMaintenanceJob({ target: "qc" });
          await loadJob(id);
          setJobPhaseScreen("qc");
          return "Maintenance demo at QC (work QC passed)";
        })
      }
      onCompleteWork={() =>
        run("completeAllWorkSteps", async () => {
          const job = requireJob(activeJob);
          const r = await completeAllWorkSteps(job);
          await loadJob(job.id);
          return (
            `Completed ${r.completed} step(s)` +
            (r.remaining ? ` · ${r.remaining} still blocked` : "")
          );
        })
      }
      onEnterQc={() =>
        run("enterQc", async () => {
          const r = await enterQc();
          if (!r.ok) throw new Error(r.error);
          return "QC screen ready";
        })
      }
      onAdvanceQc={() =>
        run("advanceQcPastFreshEyes", async () => {
          const job = requireJob(activeJob);
          await advanceQcPastFreshEyes(job);
          await refreshPhotoTags();
          await loadJob(job.id);
          setJobPhaseScreen("qc");
          return "Work QC + final photos + fresh-eyes skip";
        })
      }
      onSkipFreshEyes={() =>
        run("skipFreshEyesPause", async () => {
          const job = requireJob(activeJob);
          await skipFreshEyesPause(job);
          await loadJob(job.id);
          return "Fresh-eyes pause skipped";
        })
      }
      dangerBtn={dangerBtn}
      onClearHistory={() =>
        run("clearAllJobHistory", async () => {
          const ok = window.confirm(
            "Delete ALL jobs, photos, and customers from this device? Settings are kept. This cannot be undone.",
          );
          if (!ok) return "Clear history cancelled";

          const counts = await clearAllJobHistory();
          resetAfterHistoryClear();
          return `Cleared ${counts.jobs} job(s), ${counts.photos} photo(s), ${counts.customers} customer(s)`;
        })
      }
    />
  );
}

function DevToolsShell({
  open,
  busy,
  message,
  hasJob,
  btn,
  onToggle,
  onFillPhotos,
  onFillNewJob,
  onSeedIntake,
  onSeedChecklist,
  onSeedQc,
  onCompleteWork,
  onEnterQc,
  onAdvanceQc,
  onSkipFreshEyes,
  dangerBtn,
  onClearHistory,
}: {
  open: boolean;
  busy: boolean;
  message: string | null;
  hasJob: boolean;
  btn: string;
  onToggle: () => void;
  onFillPhotos: () => void;
  onFillNewJob: () => void;
  onSeedIntake: () => void;
  onSeedChecklist: () => void;
  onSeedQc: () => void;
  onCompleteWork: () => void;
  onEnterQc: () => void;
  onAdvanceQc: () => void;
  onSkipFreshEyes: () => void;
  dangerBtn: string;
  onClearHistory: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-600/40 bg-slate-950/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
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
            onClick={onFillPhotos}
          >
            Fill required photos
          </button>
          <button type="button" disabled={busy} className={btn} onClick={onFillNewJob}>
            Fill new job form
          </button>
          <button type="button" disabled={busy} className={btn} onClick={onSeedIntake}>
            Seed demo → intake
          </button>
          <button type="button" disabled={busy} className={btn} onClick={onSeedChecklist}>
            Seed demo → checklist
          </button>
          <button type="button" disabled={busy} className={btn} onClick={onSeedQc}>
            Seed demo → QC
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={onCompleteWork}
          >
            Complete all work steps
          </button>
          <button type="button" disabled={busy || !hasJob} className={btn} onClick={onEnterQc}>
            Enter QC
          </button>
          <button type="button" disabled={busy || !hasJob} className={btn} onClick={onAdvanceQc}>
            QC: pass work + fill finals + skip pause
          </button>
          <button
            type="button"
            disabled={busy || !hasJob}
            className={btn}
            onClick={onSkipFreshEyes}
          >
            Skip fresh-eyes pause
          </button>
          <button
            type="button"
            disabled={busy}
            className={dangerBtn}
            onClick={onClearHistory}
          >
            Clear all job history
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
