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

/** Steps the tech must complete before QC (excludes unsold/locked upsells). */
export function getActionableWorkSteps(steps: StepInstance[]): StepInstance[] {
  return steps.filter(
    (s) =>
      s.slot !== "intake" &&
      !QC_SLOTS.has(s.slot) &&
      s.status !== "locked" &&
      s.status !== "cancelled",
  );
}

export function getIncompleteActionableSteps(
  steps: StepInstance[],
): StepInstance[] {
  return getActionableWorkSteps(steps).filter((s) => s.status !== "completed");
}

export function countLockedUpsellSteps(steps: StepInstance[]): number {
  return steps.filter(
    (s) =>
      s.slot !== "intake" &&
      !QC_SLOTS.has(s.slot) &&
      s.status === "locked",
  ).length;
}

export function hasPendingRework(steps: StepInstance[]): boolean {
  return steps.some((s) => s.status === "needs_rework");
}

export function isWorkChecklistComplete(steps: StepInstance[]): boolean {
  const actionable = getActionableWorkSteps(steps);
  if (actionable.length === 0) return false;
  return actionable.every((s) => s.status === "completed");
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
