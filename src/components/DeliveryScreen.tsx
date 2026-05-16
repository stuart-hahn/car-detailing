import { useEffect, useMemo, useState } from "react";
import master from "../data/master_steps.json";
import { getStepTemplate } from "../lib/checklist/dependencies";
import {
  getDeliveryHandoffSteps,
  isDeliveryHandoffComplete,
} from "../lib/delivery/handoff";
import { getOrCreateSettings, type AppSettings, type JobRecord } from "../lib/db";
import { getQcUiStage, isFreshEyesDone } from "../lib/qc/flow";
import { shouldShowBackupPrompt } from "../lib/backup/prompt";
import {
  canReopenJob,
  formatReopenTimeLeft,
  isJobImmutable,
  msUntilReopenCloses,
} from "../lib/jobs/reopen";
import type { MasterStepsFile } from "../lib/types";
import { useJobStore } from "../store/jobStore";
import { BackupPrompt } from "./BackupPrompt";
import { CareSheetPanel } from "./CareSheetPanel";

const masterFile = master as MasterStepsFile;

interface DeliveryScreenProps {
  job: JobRecord | null;
  onGoQc: () => void;
}

export function DeliveryScreen({ job, onGoQc }: DeliveryScreenProps) {
  const {
    intakePhotoTags,
    refreshPhotoTags,
    completeStep,
    startDeliveryQc,
    completeDeliveryQc,
    reopenJob,
    setScreen,
    backupPromptJobId,
    clearBackupPrompt,
  } = useJobStore();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => {
    void getOrCreateSettings().then(setSettings);
  }, []);

  useEffect(() => {
    void refreshPhotoTags();
  }, [job?.id, refreshPhotoTags]);

  const handoffSteps = useMemo(
    () => (job ? getDeliveryHandoffSteps(job.generated_steps) : []),
    [job?.generated_steps],
  );

  const handoffComplete = useMemo(
    () => (job ? isDeliveryHandoffComplete(job.generated_steps) : false),
    [job?.generated_steps],
  );

  const stage = job ? getQcUiStage(job, intakePhotoTags) : null;

  if (!job) {
    return (
      <p className="text-slate-400">
        No active job. Open one from history or start a new job.
      </p>
    );
  }

  if (!job.intake?.completed_at) {
    return (
      <p className="text-slate-400">Complete intake before customer delivery.</p>
    );
  }

  async function run<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>,
  ) {
    setActionError(null);
    setSubmitting(true);
    const result = await fn();
    setSubmitting(false);
    if (!result.ok && "error" in result && result.error) {
      setActionError(result.error);
    }
  }

  if (job.status === "completed" || stage === "complete") {
    const reopenLeft = msUntilReopenCloses(job);
    const showReopen = canReopenJob(job);
    const locked = isJobImmutable(job);

    return (
      <section className="space-y-4 pb-8">
        <header className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-slate-400">
            {job.customer_name} · {job.vehicle_ymmt}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-200">
            Job delivered
          </h2>
          {job.completed_at && (
            <p className="mt-1 text-xs text-slate-500">
              Completed {new Date(job.completed_at).toLocaleString()}
            </p>
          )}
          {job.reopened_at && job.reopen_reason && (
            <p className="mt-2 text-xs text-amber-300/90">
              Reopened {new Date(job.reopened_at).toLocaleString()} —{" "}
              {job.reopen_reason}
            </p>
          )}
        </header>

        {settings && (
          <CareSheetPanel
            job={job}
            settings={settings}
            savedContent={job.care_sheet_content}
            savedAt={job.care_sheet_generated_at}
          />
        )}

        {backupPromptJobId === job.id && shouldShowBackupPrompt(job.id) && (
          <BackupPrompt
            jobId={job.id}
            customerName={job.customer_name}
            onDismiss={clearBackupPrompt}
          />
        )}

        {showReopen && (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div>
                <h3 className="font-medium text-amber-100">Reopen job</h3>
                {reopenLeft != null && (
                  <p className="mt-1 text-xs text-amber-200/80">
                    Editable for {formatReopenTimeLeft(reopenLeft)} more
                  </p>
                )}
              </div>
            <label className="block text-sm text-slate-300">
              Reason
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={2}
                placeholder="Why are you reopening this job?"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            {actionError && (
              <p className="text-sm text-red-200">{actionError}</p>
            )}
            <button
              type="button"
              disabled={submitting || !reopenReason.trim()}
              onClick={() => void run(() => reopenJob(reopenReason))}
              className="w-full rounded-xl bg-amber-600 py-3 font-medium text-white disabled:opacity-50"
            >
              Reopen for edits
            </button>
          </div>
        )}

        {locked && (
          <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
            This job is locked. Completed jobs can only be edited within 24
            hours of delivery.
          </p>
        )}

        <button
          type="button"
          onClick={() => setScreen("history")}
          className="w-full rounded-xl border border-slate-700 py-3 text-slate-200"
        >
          Job history
        </button>
      </section>
    );
  }

  const freshDone = isFreshEyesDone(job);
  const readyForHandoff = freshDone && stage === "delivery_qc";

  if (!readyForHandoff) {
    const hint =
      stage === "blocked_rework"
        ? "Clear rework on the checklist, then continue QC."
        : !job.qc
          ? "Start quality control when work steps are done."
          : !job.qc.work_complete_passed_at
            ? "Pass work-complete QC first."
            : !job.qc.final_photos_complete_at
              ? "Capture and confirm final photos in QC."
              : !freshDone
                ? "Complete or skip the fresh-eyes pause in QC."
                : "Continue in QC to unlock delivery.";

    return (
      <section className="space-y-4">
        <header className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-400">
            {job.customer_name} · {job.vehicle_ymmt}
          </p>
          <h2 className="mt-1 text-lg font-semibold">Customer delivery</h2>
          <p className="mt-2 text-sm text-slate-400">{hint}</p>
        </header>
        <button
          type="button"
          onClick={onGoQc}
          className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white"
        >
          Go to QC
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4 pb-8">
      <header className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-sm text-slate-400">
          {job.customer_name} · {job.vehicle_ymmt}
        </p>
        <h2 className="mt-1 text-lg font-semibold">Customer delivery</h2>
        <p className="mt-2 text-sm text-slate-400">
          Walk through completed work, share the care sheet, then pass delivery QC
          to close the job.
        </p>
      </header>

      {actionError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {actionError}
        </p>
      )}

      {handoffSteps.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Handoff steps</h3>
          <ul className="space-y-2">
            {handoffSteps.map((step, index) => {
              const template = getStepTemplate(masterFile, step.template_id);
              const done = step.status === "completed";
              return (
                <li
                  key={step.instance_id}
                  className={`rounded-xl border px-4 py-3 ${
                    done
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <p className="text-sm font-medium">
                    {index + 1}. {template?.name ?? step.template_id}
                  </p>
                  {template?.instructions && (
                    <p className="mt-1 text-sm text-slate-400">
                      {template.instructions}
                    </p>
                  )}
                  {!done && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        void run(() => completeStep(step.instance_id))
                      }
                      className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Mark complete
                    </button>
                  )}
                  {done && (
                    <p className="mt-2 text-xs text-emerald-400">Complete</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {settings && <CareSheetPanel job={job} settings={settings} />}

      {job.phase !== "qc_delivery" ? (
        <button
          type="button"
          disabled={submitting || !handoffComplete}
          onClick={() => void run(startDeliveryQc)}
          className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {handoffComplete
            ? "Start delivery QC"
            : "Complete handoff steps first"}
        </button>
      ) : (
        <button
          type="button"
          disabled={submitting || !handoffComplete}
          onClick={() => void run(completeDeliveryQc)}
          className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-50"
        >
          Pass delivery QC — complete job
        </button>
      )}

      <button
        type="button"
        onClick={onGoQc}
        className="w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-400"
      >
        QC checklist
      </button>
    </section>
  );
}
