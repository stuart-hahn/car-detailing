import { describe, expect, it } from "vitest";
import type { StepInstance } from "../types";
import {
  getDeliveryHandoffSteps,
  getIncompleteDeliveryHandoffSteps,
  isDeliveryHandoffComplete,
} from "./handoff";

function step(
  overrides: Partial<StepInstance> & Pick<StepInstance, "template_id">,
): StepInstance {
  const { template_id, instance_id, slot, status, completed_at, ...rest } =
    overrides;
  return {
    instance_id: instance_id ?? template_id,
    template_id,
    slot: slot ?? "delivery",
    status: status ?? "pending",
    completed_at: completed_at ?? null,
    photo_taken: false,
    tech_note: "",
    ...rest,
  };
}

describe("delivery handoff helpers", () => {
  it("excludes qc_delivery from handoff steps", () => {
    const steps = [
      step({ template_id: "qc_delivery" }),
      step({ template_id: "del_customer_walkthrough" }),
    ];
    expect(getDeliveryHandoffSteps(steps).map((s) => s.template_id)).toEqual([
      "del_customer_walkthrough",
    ]);
  });

  it("detects incomplete walkthrough", () => {
    const steps = [
      step({ template_id: "del_customer_walkthrough", status: "pending" }),
    ];
    expect(getIncompleteDeliveryHandoffSteps(steps)).toHaveLength(1);
    expect(isDeliveryHandoffComplete(steps)).toBe(false);
  });

  it("treats empty handoff list as complete", () => {
    const steps = [step({ template_id: "qc_delivery", slot: "delivery" })];
    expect(isDeliveryHandoffComplete(steps)).toBe(true);
  });
});
