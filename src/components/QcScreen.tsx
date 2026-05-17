import { useEffect, useMemo, useState } from "react";
import { formatRemainingMs } from "../lib/checklist/undo";
import {
  countLockedUpsellSteps,
  getIncompleteActionableSteps,
  getQcUiStage,
  isWorkChecklistComplete,
} from "../lib/qc/flow";
import {
  FRESH_EYES_DELIVERY_MS,
  FRESH_EYES_TOTAL_MS,
  getFreshEyesProgress,
} from "../lib/qc/freshEyes";
import {
  evaluateFinalPhotoGate,
  getFinalPhotoRequirements,
} from "../lib/qc/requirements";
import { QC_REWORK_MAPPINGS } from "../lib/qc/rework";
import type { JobRecord } from "../lib/db";
import { useJobStore } from "../store/jobStore";
import { PhotoCapture } from "./PhotoCapture";

interface QcScreenProps {
  job: JobRecord | null;
  onGoChecklist: () => void;
}

export function QcScreen({ job, onGoChecklist }: QcScreenProps) {
  const {
    intakePhotoTags,
    refreshPhotoTags,
    enterQc,
    submitWorkQc,
    confirmFinalPhotos,
    startFreshEyes,
    skipFreshEyes,
    completeFreshEyes,
    setJobPhaseScreen,
  } = useJobStore();

  const [selectedFails, setSelectedFails] = useState<string[]>([]);
  const [skipReason, setSkipReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    void refreshPhotoTags();
  }, [job?.id, refreshPhotoTags]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const photoReqs = useMemo(
    () => (job ? getFinalPhotoRequirements(job.tier) : []),
    [job?.tier],
  );

  const photoGate = useMemo(
    () =>
      job
        ? evaluateFinalPhotoGate(intakePhotoTags, job.tier)
        : { met: false, required: 0, have: 0, missingOdometer: true },
    [job, intakePhotoTags],
  );

  const stage = job ? getQcUiStage(job, intakePhotoTags) : null;

  const freshProgress = useMemo(() => {
    const started = job?.qc?.fresh_eyes_started_at;
    if (!started) return null;
    return getFreshEyesProgress(started);
  }, [job?.qc?.fresh_eyes_started_at, tick]);

  if (!job) {
    return <p className="text-slate-400">No active job. Create one first.</p>;
  }

  if (!job.intake?.completed_at) {
    return (
      <p className="text-slate-400">Complete intake before quality control.</p>
    );
  }

  const workReady = isWorkChecklistComplete(job.generated_steps);
  const abbreviated = Boolean(job.qc?.abbreviated_work_qc);

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
    await refreshPhotoTags();
  }

  function toggleFail(code: string) {
    setSelectedFails((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  if (!workReady && stage !== "blocked_rework") {
    const incomplete = getIncompleteActionableSteps(job.generated_steps);
    const lockedCount = countLockedUpsellSteps(job.generated_steps);
    return (
      <section className="space-y-4">
        <p className="text-slate-300">
          Finish all active work steps on the checklist before starting QC.
          {lockedCount > 0
            ? ` Locked upsell steps (${lockedCount}) do not count toward completion.`
            : ""}
        </p>
        {incomplete.length > 0 && (
          <ul className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
            {incomplete.slice(0, 6).map((s) => (
              <li key={s.instance_id} className="capitalize">
                · {s.slot.replace(/_/g, " ")}
                {s.status === "needs_rework" ? " (rework)" : ""}
              </li>
            ))}
            {incomplete.length > 6 && (
              <li className="text-slate-500">
                · …and {incomplete.length - 6} more
              </li>
            )}
          </ul>
        )}
        <button
          type="button"
          onClick={onGoChecklist}
          className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white"
        >
          Back to checklist
        </button>
      </section>
    );
  }

  if (!job.qc && workReady) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-400">
            {job.customer_name} · {job.vehicle_ymmt}
          </p>
          <h2 className="mt-1 text-lg font-semibold">Ready for QC</h2>
          <p className="mt-2 text-sm text-slate-400">
            Work steps are complete. Start the two-pass quality control flow.
          </p>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void run(enterQc)}
          className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white disabled:opacity-50"
        >
          Start QC
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
        <h2 className="mt-1 text-lg font-semibold">Quality control</h2>
        <p className="mt-1 text-xs capitalize text-slate-500">
          {job.tier} · phase {job.phase}
        </p>
        {abbreviated && job.qc?.fail_codes?.length ? (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Abbreviated pass — verify rework for:{" "}
            {job.qc.fail_codes
              .map(
                (c) =>
                  QC_REWORK_MAPPINGS.find((m) => m.fail_code === c)?.label ??
                  c,
              )
              .join(", ")}
          </p>
        ) : null}
      </header>

      {actionError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {actionError}
        </p>
      )}

      {stage === "blocked_rework" && (
        <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-100">Rework required</p>
          <p className="text-sm text-amber-200/90">
            Complete flagged steps on the checklist. Final photos and delivery QC
            stay locked until rework is done.
          </p>
          <button
            type="button"
            onClick={onGoChecklist}
            className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white"
          >
            Go to checklist
          </button>
        </div>
      )}

      {stage === "work_qc" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Work-complete QC</h3>
            <p className="mt-1 text-sm text-slate-400">
              Inspect all surfaces before final photos. Failures reopen affected
              steps for rework.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-400">
              Issues found (select if failing)
            </legend>
            {QC_REWORK_MAPPINGS.map((m) => (
              <label
                key={m.fail_code}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedFails.includes(m.fail_code)}
                  onChange={() => toggleFail(m.fail_code)}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </fieldset>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={submitting || selectedFails.length === 0}
              onClick={() =>
                void run(() => submitWorkQc(false, selectedFails))
              }
              className="rounded-xl border border-red-500/50 py-3 text-sm font-medium text-red-200 disabled:opacity-40"
            >
              Fail — send to rework
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void run(() => submitWorkQc(true))}
              className="rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Pass work QC
            </button>
          </div>
        </div>
      )}

      {stage === "final_photos" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Final photos</h3>
            <p className="mt-1 text-sm text-slate-400">
              {photoGate.have} / {photoGate.required} final photos
              {photoGate.missingOdometer ? " · odometer needed" : " · odometer ✓"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {photoReqs.map((req) => (
              <PhotoCapture
                key={req.tag}
                jobId={job.id}
                tag={req.tag}
                label={req.label}
                required={req.required}
                onUploaded={() => void refreshPhotoTags()}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={submitting || !photoGate.met}
            onClick={() => void run(confirmFinalPhotos)}
            className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-50"
          >
            Confirm final photos
          </button>
        </div>
      )}

      {stage === "fresh_eyes" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Fresh-eyes pause</h3>
            <p className="mt-1 text-sm text-slate-400">
              Step away before customer handoff. Soft 5-minute pause; delivery
              QC unlocks at 2:00.
            </p>
          </div>

          {!job.qc?.fresh_eyes_started_at ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void run(startFreshEyes)}
              className="w-full rounded-xl bg-slate-700 py-3 font-medium text-white disabled:opacity-50"
            >
              Start 5-minute pause
            </button>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums">
                {freshProgress
                  ? formatRemainingMs(freshProgress.remainingMs)
                  : "5:00"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                of {formatRemainingMs(FRESH_EYES_TOTAL_MS)} total
              </p>
              {freshProgress?.canStartDelivery &&
              !job.qc?.fresh_eyes_complete_at ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    void run(async () => {
                      const result = await completeFreshEyes();
                      if (result.ok) setJobPhaseScreen("delivery");
                      return result;
                    })
                  }
                  className="mt-4 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Continue to delivery
                </button>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Delivery QC unlocks in{" "}
                  {freshProgress
                    ? formatRemainingMs(
                        Math.max(
                          0,
                          FRESH_EYES_DELIVERY_MS - freshProgress.elapsedMs,
                        ),
                      )
                    : "2:00"}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-800 p-3">
            <label className="block space-y-1">
              <span className="text-sm text-slate-400">Skip pause (reason)</span>
              <input
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                placeholder="e.g. customer waiting on site"
              />
            </label>
            <button
              type="button"
              disabled={submitting || !skipReason.trim()}
              onClick={() =>
                void run(async () => {
                  const result = await skipFreshEyes(skipReason);
                  if (result.ok) setJobPhaseScreen("delivery");
                  return result;
                })
              }
              className="mt-2 w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 disabled:opacity-40"
            >
              Skip with reason
            </button>
          </div>
        </div>
      )}

      {stage === "delivery_qc" && (
        <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <p className="font-medium text-sky-100">Ready for customer delivery</p>
          <p className="text-sm text-sky-200/90">
            Fresh-eyes pause is done. Continue on the Delivery screen for
            walkthrough, care sheet, and delivery QC.
          </p>
          <button
            type="button"
            onClick={() => setJobPhaseScreen("delivery")}
            className="w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white"
          >
            Go to delivery
          </button>
        </div>
      )}

      {stage === "complete" && (
        <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-medium text-emerald-200">Job complete</p>
          <button
            type="button"
            onClick={() => setJobPhaseScreen("delivery")}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white"
          >
            View delivery summary
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onGoChecklist}
        className="w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-400"
      >
        Checklist
      </button>
    </section>
  );
}
