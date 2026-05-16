import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import master from "../data/master_steps.json";
import {
  areDependenciesMet,
  getDependentSteps,
  getStepTemplate,
  getUnmetDependencies,
} from "../lib/checklist/dependencies";
import { evaluateUndoPolicy } from "../lib/checklist/undo";
import {
  countLockedUpsellSteps,
  getActionableWorkSteps,
  hasPendingRework,
  isWorkChecklistComplete,
} from "../lib/qc/flow";
import { canUnlockWheels } from "../lib/intake/requirements";
import {
  hasJobPhoto,
  stepPhotoTag,
} from "../lib/photos/storage";
import type { JobRecord } from "../lib/db";
import type { MasterStepsFile, StepInstance } from "../lib/types";
import { useJobStore } from "../store/jobStore";
import { PhotoCapture } from "./PhotoCapture";
import { SwipeStepCard } from "./SwipeStepCard";

const masterFile = master as MasterStepsFile;

interface ChecklistScreenProps {
  job: JobRecord | null;
  onGoIntake: () => void;
}

export function ChecklistScreen({ job, onGoIntake }: ChecklistScreenProps) {
  const {
    startWork,
    completeStep,
    undoStep,
    refreshPhotoTags,
    enterQc,
    setScreen,
  } = useJobStore();
  const [photoStepId, setPhotoStepId] = useState<string | null>(null);
  const [stepPhotoMap, setStepPhotoMap] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [, tick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStepPhotos = useCallback(async () => {
    if (!job) return;
    const steps = job.generated_steps.filter((s) => s.slot !== "intake");
    const map: Record<string, boolean> = {};
    await Promise.all(
      steps.map(async (s) => {
        map[s.instance_id] = await hasJobPhoto(job.id, stepPhotoTag(s.instance_id));
      }),
    );
    setStepPhotoMap(map);
  }, [job]);

  useEffect(() => {
    void refreshStepPhotos();
  }, [refreshStepPhotos, job?.generated_steps]);

  useEffect(() => {
    tickRef.current = setInterval(() => tick((n) => n + 1), 30_000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const steps = useMemo(
    () => job?.generated_steps.filter((s) => s.slot !== "intake") ?? [],
    [job?.generated_steps],
  );

  if (!job) {
    return <p className="text-slate-400">No active job. Create one first.</p>;
  }

  if (!job.intake?.completed_at) {
    return (
      <section className="space-y-4">
        <p className="text-slate-300">Intake must be completed before work starts.</p>
        <button
          type="button"
          onClick={onGoIntake}
          className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white"
        >
          Go to intake
        </button>
      </section>
    );
  }

  const activeJob = job;
  const wheelsUnlocked = canUnlockWheels(activeJob);
  const workStarted = activeJob.status === "active";
  const actionableSteps = getActionableWorkSteps(activeJob.generated_steps);
  const completed = actionableSteps.filter((s) => s.status === "completed").length;
  const lockedUpsellCount = countLockedUpsellSteps(activeJob.generated_steps);
  const reworkPending = hasPendingRework(activeJob.generated_steps);
  const qcReady = isWorkChecklistComplete(activeJob.generated_steps);

  function lockState(step: StepInstance): { locked: boolean; reason?: string } {
    if (!wheelsUnlocked) {
      return { locked: true, reason: "intake incomplete" };
    }
    if (!workStarted) {
      return { locked: true, reason: "tap start work" };
    }
    if (step.status === "locked") {
      return { locked: true, reason: "approval required" };
    }
    if (step.status === "cancelled") {
      return { locked: true, reason: "cancelled" };
    }
    if (!areDependenciesMet(step, activeJob.generated_steps, masterFile)) {
      const unmet = getUnmetDependencies(step, activeJob.generated_steps, masterFile);
      return {
        locked: true,
        reason: `complete ${unmet.join(", ")} first`,
      };
    }
    return { locked: false };
  }

  function dependentWarning(step: StepInstance): string | undefined {
    const deps = getDependentSteps(step, activeJob.generated_steps, masterFile);
    if (!deps.length) return undefined;
    const names = deps
      .map((d) => getStepTemplate(masterFile, d.template_id)?.name ?? d.template_id)
      .join(", ");
    return `Note: ${names} already completed — verify if rework needed.`;
  }

  async function handleComplete(instanceId: string) {
    setActionError(null);
    const result = await completeStep(instanceId);
    if (!result.ok) setActionError(result.error);
    else await refreshStepPhotos();
  }

  async function handleUndo(instanceId: string, reason?: string) {
    setActionError(null);
    const result = await undoStep(instanceId, reason);
    if (!result.ok) setActionError(result.error);
    else await refreshStepPhotos();
  }

  const photoStep = photoStepId
    ? steps.find((s) => s.instance_id === photoStepId)
    : null;

  return (
    <section className="space-y-4 pb-8">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <p className="text-sm text-slate-400">
          {job.customer_name} · {job.vehicle_ymmt}
        </p>
        <p className="mt-1 font-medium capitalize">{job.tier}</p>
        {!workStarted && (
          <button
            type="button"
            onClick={() => void startWork()}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white"
          >
            Start work — unlock checklist
          </button>
        )}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{
              width: actionableSteps.length
                ? `${(completed / actionableSteps.length) * 100}%`
                : "0%",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {completed} / {actionableSteps.length} steps · swipe right to complete
        </p>
        {lockedUpsellCount > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {lockedUpsellCount} upsell step
            {lockedUpsellCount === 1 ? "" : "s"} locked (not sold) — does not
            block QC
          </p>
        )}
        {reworkPending && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Rework required — complete flagged steps, then return to QC.
          </p>
        )}
        {qcReady && workStarted && (
          <button
            type="button"
            onClick={() => {
              if (!activeJob.qc) void enterQc();
              else setScreen("qc");
            }}
            className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white"
          >
            {reworkPending ? "QC (after rework)" : "Continue to QC"}
          </button>
        )}
      </div>

      {actionError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {actionError}
        </p>
      )}

      {job.warn_banners.length > 0 && (
        <div className="space-y-2">
          {(job.warn_banners as { flag: string; message: string }[]).map((b) => (
            <p
              key={b.flag}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
            >
              {b.message}
            </p>
          ))}
        </div>
      )}

      {photoStep && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-3">
          <p className="mb-2 text-sm font-medium">Step photo</p>
          <PhotoCapture
            jobId={job.id}
            tag={stepPhotoTag(photoStep.instance_id)}
            label={getStepTemplate(masterFile, photoStep.template_id)?.name ?? "Step"}
            required
            onUploaded={() => {
              void refreshStepPhotos();
              void refreshPhotoTags();
              setPhotoStepId(null);
            }}
          />
          <button
            type="button"
            className="mt-2 text-xs text-slate-400"
            onClick={() => setPhotoStepId(null)}
          >
            Close
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {steps.map((step, index) => {
          const template = getStepTemplate(masterFile, step.template_id);
          const { locked, reason } = lockState(step);
          const undoPolicy =
            step.status === "completed"
              ? evaluateUndoPolicy(job, step)
              : null;

          return (
            <SwipeStepCard
              key={step.instance_id}
              step={step}
              index={index}
              template={template}
              locked={locked}
              lockReason={reason}
              undoPolicy={undoPolicy}
              dependentWarning={
                step.status === "completed" ? dependentWarning(step) : undefined
              }
              parallelHints={template?.parallel_hints}
              photoRequired={template?.photo_required}
              hasPhoto={stepPhotoMap[step.instance_id]}
              onComplete={() => void handleComplete(step.instance_id)}
              onUndo={(r) => void handleUndo(step.instance_id, r)}
              onCapturePhoto={() => setPhotoStepId(step.instance_id)}
            />
          );
        })}
      </ol>
    </section>
  );
}
