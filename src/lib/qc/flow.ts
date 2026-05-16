import type { JobRecord } from "../db";
import type { StepInstance } from "../types";
import { evaluateFinalPhotoGate } from "./requirements";

export type QcUiStage =
  | "blocked_rework"
  | "work_qc"
  | "final_photos"
  | "fresh_eyes"
  | "delivery_qc"
  | "complete";

const QC_SLOTS = new Set(["qc", "delivery"]);

export function hasPendingRework(steps: StepInstance[]): boolean {
  return steps.some((s) => s.status === "needs_rework");
}

export function isWorkChecklistComplete(steps: StepInstance[]): boolean {
  const workSteps = steps.filter(
    (s) => s.slot !== "intake" && !QC_SLOTS.has(s.slot),
  );
  return (
    workSteps.length > 0 &&
    workSteps.every((s) => s.status === "completed")
  );
}

export function isFreshEyesDone(job: JobRecord): boolean {
  const qc = job.qc;
  return Boolean(qc?.fresh_eyes_complete_at || qc?.fresh_eyes_skipped_at);
}

export function getQcUiStage(
  job: JobRecord,
  photoTags: string[],
): QcUiStage {
  if (hasPendingRework(job.generated_steps)) return "blocked_rework";

  const qc = job.qc;
  if (!qc?.work_complete_passed_at) return "work_qc";

  const photoGate = evaluateFinalPhotoGate(photoTags, job.tier);
  if (!qc.final_photos_complete_at || !photoGate.met) return "final_photos";

  if (!isFreshEyesDone(job)) return "fresh_eyes";

  if (!qc.delivery_passed_at) return "delivery_qc";

  return "complete";
}
