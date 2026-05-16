import type { JobRecord } from "../db";
import type { StepInstance } from "../types";

export const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getReopenAnchor(job: JobRecord): Date | null {
  if (!job.completed_at) return null;
  return new Date(job.completed_at);
}

export function canReopenJob(job: JobRecord, now = Date.now()): boolean {
  if (job.status !== "completed") return false;
  const anchor = getReopenAnchor(job);
  if (!anchor) return false;
  return now - anchor.getTime() <= REOPEN_WINDOW_MS;
}

export function isJobImmutable(job: JobRecord, now = Date.now()): boolean {
  return job.status === "completed" && !canReopenJob(job, now);
}

export function msUntilReopenCloses(
  job: JobRecord,
  now = Date.now(),
): number | null {
  const anchor = getReopenAnchor(job);
  if (!anchor || job.status !== "completed") return null;
  return Math.max(0, anchor.getTime() + REOPEN_WINDOW_MS - now);
}

function resetDeliverySteps(steps: StepInstance[]): StepInstance[] {
  return steps.map((step) => {
    if (step.slot !== "delivery") return step;
    if (step.status === "locked" || step.status === "cancelled") return step;
    return {
      ...step,
      status: "pending",
      completed_at: null,
      photo_taken: false,
    };
  });
}

export function applyJobReopen(
  job: JobRecord,
  reason: string,
  now = new Date(),
): JobRecord {
  const at = now.toISOString();
  const trimmed = reason.trim();
  const qc = job.qc
    ? { ...job.qc, delivery_passed_at: undefined }
    : job.qc;

  return {
    ...job,
    status: "active",
    phase: "checklist",
    reopened_at: at,
    reopen_reason: trimmed,
    generated_steps: resetDeliverySteps(job.generated_steps),
    qc,
    audit_log: [
      ...job.audit_log,
      { at, action: "job_reopened", detail: trimmed },
    ],
  };
}

export function formatReopenTimeLeft(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.ceil((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
