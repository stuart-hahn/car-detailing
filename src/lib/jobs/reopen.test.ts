import { describe, expect, it } from "vitest";
import type { JobRecord } from "../db";
import {
  applyJobReopen,
  canReopenJob,
  isJobImmutable,
  msUntilReopenCloses,
  REOPEN_WINDOW_MS,
} from "./reopen";

function completedJob(overrides: Partial<JobRecord> = {}): JobRecord {
  const completedAt = new Date().toISOString();
  return {
    id: "j1",
    sop_version: "2026.05.2",
    status: "completed",
    phase: "closed",
    tier: "refresh",
    upholstery_type: "cloth",
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: [
      {
        instance_id: "d1",
        template_id: "delivery_walkthrough",
        slot: "delivery",
        status: "completed",
        completed_at: completedAt,
        photo_taken: false,
        tech_note: null,
      },
      {
        instance_id: "q1",
        template_id: "qc_delivery",
        slot: "delivery",
        status: "completed",
        completed_at: completedAt,
        photo_taken: false,
        tech_note: null,
      },
    ],
    warn_banners: [],
    customer_name: "Pat",
    customer_phone: "555",
    vehicle_ymmt: "2020 Sedan",
    license_plate: "ABC",
    service_address: "1 Main",
    technician: "Tech",
    customer_concern: "",
    created_at: completedAt,
    completed_at: completedAt,
    qc: {
      work_complete_passed_at: completedAt,
      final_photos_complete_at: completedAt,
      fresh_eyes_complete_at: completedAt,
      delivery_passed_at: completedAt,
      attempts: [],
    },
    audit_log: [],
    ...overrides,
  };
}

describe("job reopen", () => {
  it("allows reopen within 24h of completion", () => {
    const completedAt = new Date("2026-05-16T12:00:00Z");
    const now = completedAt.getTime() + REOPEN_WINDOW_MS - 60_000;
    const job = completedJob({
      completed_at: completedAt.toISOString(),
    });
    expect(canReopenJob(job, now)).toBe(true);
    expect(isJobImmutable(job, now)).toBe(false);
  });

  it("locks job after 24h", () => {
    const completedAt = new Date("2026-05-16T12:00:00Z");
    const now = completedAt.getTime() + REOPEN_WINDOW_MS + 1;
    const job = completedJob({
      completed_at: completedAt.toISOString(),
    });
    expect(canReopenJob(job, now)).toBe(false);
    expect(isJobImmutable(job, now)).toBe(true);
  });

  it("reports time left until reopen closes", () => {
    const completedAt = new Date("2026-05-16T12:00:00Z");
    const now = completedAt.getTime() + 60 * 60 * 1000;
    const left = msUntilReopenCloses(
      completedJob({ completed_at: completedAt.toISOString() }),
      now,
    );
    expect(left).toBe(23 * 60 * 60 * 1000);
  });

  it("reopens to active checklist and resets delivery", () => {
    const job = completedJob();
    const updated = applyJobReopen(job, "Missed interior spot");
    expect(updated.status).toBe("active");
    expect(updated.phase).toBe("checklist");
    expect(updated.reopened_at).toBeTruthy();
    expect(updated.reopen_reason).toBe("Missed interior spot");
    expect(updated.qc?.delivery_passed_at).toBeUndefined();
    expect(updated.generated_steps.every((s) => s.slot !== "delivery" || s.status === "pending")).toBe(
      true,
    );
    expect(updated.audit_log.at(-1)?.action).toBe("job_reopened");
  });
});
