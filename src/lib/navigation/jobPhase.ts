import type { JobRecord } from "../db";

export type JobPhaseScreen =
  | "intake"
  | "checklist"
  | "qc"
  | "delivery"
  | "refer_out";

export const STALE_DRAFT_MS = 24 * 60 * 60 * 1000;

export function isTerminalJob(job: JobRecord): boolean {
  return job.status === "completed" || job.status === "declined";
}

export function isInFlightJob(job: JobRecord): boolean {
  return !isTerminalJob(job);
}

export function isDraftOnly(job: JobRecord): boolean {
  if (job.status !== "draft") return false;
  if (job.intake?.completed_at) return false;
  return !job.generated_steps.some((s) => s.status === "completed");
}

export function isStaleDraft(job: JobRecord, now = Date.now()): boolean {
  if (!isDraftOnly(job)) return false;
  return now - new Date(job.created_at).getTime() >= STALE_DRAFT_MS;
}

export function hasRealWork(job: JobRecord): boolean {
  if (!isDraftOnly(job) && job.status !== "draft") return true;
  if (job.intake?.completed_at) return true;
  return job.generated_steps.some((s) => s.status === "completed");
}

/** Maps job FSM to the contextual phase screen (PR1 router). */
export function resolveJobPhaseScreen(job: JobRecord): JobPhaseScreen {
  if (job.status === "blocked_refer_out") return "refer_out";

  if (
    job.status === "draft" ||
    (job.phase === "intake" && !job.intake?.completed_at)
  ) {
    return "intake";
  }

  if (job.status === "active" || job.status === "awaiting_approval") {
    if (job.reopened_at) return "checklist";
    if (job.phase === "qc_delivery") return "delivery";
    if (job.phase === "qc_work") return "qc";
    return "checklist";
  }

  if (
    job.status === "completed" ||
    job.phase === "closed" ||
    job.phase === "qc_delivery" ||
    (job.qc &&
      (job.qc.fresh_eyes_complete_at || job.qc.fresh_eyes_skipped_at) &&
      !job.qc.delivery_passed_at)
  ) {
    return "delivery";
  }

  if (job.phase === "qc_work") return "qc";

  return "intake";
}

export type MacroStepId = "intake" | "work" | "qc" | "delivery";

export function resolveMacroStep(job: JobRecord): MacroStepId {
  const screen = resolveJobPhaseScreen(job);
  if (screen === "intake" || screen === "refer_out") return "intake";
  if (screen === "checklist") return "work";
  if (screen === "qc") return "qc";
  return "delivery";
}
