import type { StepInstance } from "../types";

const QC_SLOTS = new Set<StepInstance["slot"]>(["qc", "delivery"]);

/** Work-phase steps shown on the checklist (excludes intake and QC/delivery slots). */
export function getChecklistWorkSteps(steps: StepInstance[]): StepInstance[] {
  return steps.filter(
    (s) => s.slot !== "intake" && !QC_SLOTS.has(s.slot),
  );
}

/** First step the tech should act on: rework, then next incomplete non-upsell-locked. */
export function findUpNextStep(steps: StepInstance[]): StepInstance | null {
  const work = getChecklistWorkSteps(steps);
  const rework = work.find((s) => s.status === "needs_rework");
  if (rework) return rework;
  return (
    work.find(
      (s) =>
        s.status !== "completed" &&
        s.status !== "cancelled" &&
        s.status !== "locked",
    ) ?? null
  );
}

export function partitionChecklistSteps(steps: StepInstance[]): {
  workSteps: StepInstance[];
  doneSteps: StepInstance[];
  upNext: StepInstance | null;
} {
  const workSteps = getChecklistWorkSteps(steps);
  const upNext = findUpNextStep(steps);
  const doneSteps = workSteps.filter((s) => s.status === "completed");
  return { workSteps, doneSteps, upNext };
}
