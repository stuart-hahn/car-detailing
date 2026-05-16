import type { StepInstance } from "../types";

/** Customer handoff steps on the delivery slot (excludes qc_delivery gate). */
export function getDeliveryHandoffSteps(steps: StepInstance[]): StepInstance[] {
  return steps.filter(
    (s) =>
      s.slot === "delivery" &&
      s.template_id !== "qc_delivery" &&
      s.status !== "locked" &&
      s.status !== "cancelled",
  );
}

export function getIncompleteDeliveryHandoffSteps(
  steps: StepInstance[],
): StepInstance[] {
  return getDeliveryHandoffSteps(steps).filter((s) => s.status !== "completed");
}

export function isDeliveryHandoffComplete(steps: StepInstance[]): boolean {
  const handoff = getDeliveryHandoffSteps(steps);
  if (handoff.length === 0) return true;
  return handoff.every((s) => s.status === "completed");
}
