import { describe, expect, it } from "vitest";
import { applyQcRework, abbreviatedQcStepIds, getReworkMapping } from "./rework";
import type { StepInstance } from "../types";

function inst(
  template_id: string,
  slot: StepInstance["slot"],
  status: StepInstance["status"] = "completed",
): StepInstance {
  return {
    instance_id: `${template_id}-1`,
    template_id,
    slot,
    status,
    completed_at: status === "completed" ? "2026-05-16T12:00:00Z" : null,
    photo_taken: false,
    tech_note: null,
  };
}

describe("QC rework mapping", () => {
  it("maps streaked windshield to glass slot", () => {
    const m = getReworkMapping("streaked_windshield");
    expect(m?.reopen_slots).toContain("glass");
    expect(m?.reopen_templates).toContain("glass_full");
  });

  it("marks glass steps as needs_rework", () => {
    const instances = [
      inst("glass_full", "glass"),
      inst("final_tire_dressing", "finalization"),
    ];
    const updated = applyQcRework(instances, ["streaked_windshield"]);
    expect(updated.find((s) => s.template_id === "glass_full")?.status).toBe(
      "needs_rework",
    );
    expect(
      updated.find((s) => s.template_id === "final_tire_dressing")?.status,
    ).toBe("completed");
  });

  it("returns abbreviated qc step ids for failed categories only", () => {
    const instances = applyQcRework(
      [
        inst("glass_full", "glass"),
        inst("int_extract", "interior_wet"),
      ],
      ["streaked_windshield"],
    );
    const ids = abbreviatedQcStepIds(instances, ["streaked_windshield"]);
    expect(ids).toEqual(["glass_full"]);
  });
});
