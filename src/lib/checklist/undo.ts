import type { JobPhase, StepInstance } from "../types";
import type { JobRecord } from "../db";

export const FREE_UNDO_MS = 5 * 60 * 1000;

export interface UndoPolicyResult {
  allowed: boolean;
  needsReason: boolean;
  blockMessage?: string;
}

export function isDeliveryQcStarted(job: JobRecord): boolean {
  if (job.phase === "qc_delivery" || job.phase === "closed") return true;
  return job.generated_steps.some(
    (s) =>
      s.slot === "delivery" &&
      (s.status === "completed" || s.status === "in_progress"),
  );
}

export function evaluateUndoPolicy(
  job: JobRecord,
  step: StepInstance,
  now = Date.now(),
): UndoPolicyResult {
  if (step.status !== "completed") {
    return { allowed: false, needsReason: false, blockMessage: "Step not completed" };
  }

  if (isDeliveryQcStarted(job)) {
    return {
      allowed: false,
      needsReason: false,
      blockMessage: "Cannot undo after delivery QC has started",
    };
  }

  if (!step.completed_at) {
    return { allowed: true, needsReason: true };
  }

  const elapsed = now - new Date(step.completed_at).getTime();
  if (elapsed <= FREE_UNDO_MS) {
    return { allowed: true, needsReason: false };
  }

  return { allowed: true, needsReason: true };
}

export function remainingFreeUndoMs(
  step: StepInstance,
  now = Date.now(),
): number | null {
  if (step.status !== "completed" || !step.completed_at) return null;
  const elapsed = now - new Date(step.completed_at).getTime();
  const left = FREE_UNDO_MS - elapsed;
  return left > 0 ? left : null;
}

export function formatRemainingMs(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.ceil(sec / 60)}m`;
}

export function canStartStepWork(job: JobRecord, phase: JobPhase): boolean {
  return (
    Boolean(job.intake?.completed_at) &&
    (job.status === "active" || job.status === "awaiting_approval") &&
    phase === "checklist"
  );
}
