import { describe, expect, it } from "vitest";
import type { JobRecord } from "../db";
import { getQcUiStage, hasPendingRework, isWorkChecklistComplete } from "./flow";
import { finalPhotoTag, ODOMETER_PHOTO_TAG } from "./requirements";
import type { StepInstance } from "../types";

function inst(
  slot: StepInstance["slot"],
  status: StepInstance["status"] = "completed",
  template_id = "step",
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

function baseJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "job1",
    sop_version: "1",
    status: "active",
    phase: "qc_work",
    tier: "maintenance",
    upholstery_type: "cloth",
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: [
      inst("wash", "completed"),
      inst("qc", "pending", "qc_work"),
    ],
    warn_banners: [],
    customer_name: "Test",
    customer_phone: "555",
    vehicle_ymmt: "2020 Car",
    license_plate: "ABC",
    service_address: "1 Main",
    technician: "Tech",
    customer_concern: "Clean",
    created_at: "2026-05-16T10:00:00Z",
    audit_log: [],
    ...overrides,
  };
}

describe("QC flow", () => {
  it("detects pending rework", () => {
    expect(
      hasPendingRework([inst("glass", "needs_rework", "glass_full")]),
    ).toBe(true);
  });

  it("requires all non-qc work steps complete", () => {
    expect(
      isWorkChecklistComplete([
        inst("wash", "completed"),
        inst("dry", "pending"),
      ]),
    ).toBe(false);
    expect(
      isWorkChecklistComplete([
        inst("wash", "completed"),
        inst("dry", "completed"),
      ]),
    ).toBe(true);
  });

  it("blocks final photos when rework pending", () => {
    const job = baseJob({
      generated_steps: [
        inst("glass", "needs_rework", "glass_full"),
        inst("wash", "completed"),
      ],
      qc: {
        attempts: [],
        work_complete_passed_at: "2026-05-16T12:00:00Z",
      },
    });
    expect(getQcUiStage(job, [])).toBe("blocked_rework");
  });

  it("advances to final photos after work qc pass", () => {
    const job = baseJob({
      qc: {
        attempts: [],
        work_complete_passed_at: "2026-05-16T12:00:00Z",
      },
    });
    expect(getQcUiStage(job, [])).toBe("final_photos");
  });

  it("advances to fresh eyes when photos confirmed", () => {
    const tags = [
      finalPhotoTag(1),
      finalPhotoTag(2),
      finalPhotoTag(3),
      finalPhotoTag(4),
      ODOMETER_PHOTO_TAG,
    ];
    const job = baseJob({
      qc: {
        attempts: [],
        work_complete_passed_at: "2026-05-16T12:00:00Z",
        final_photos_complete_at: "2026-05-16T12:05:00Z",
      },
    });
    expect(getQcUiStage(job, tags)).toBe("fresh_eyes");
  });
});
