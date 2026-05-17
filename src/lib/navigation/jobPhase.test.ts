import { describe, expect, it } from "vitest";
import type { JobRecord } from "../db";
import {
  isDraftOnly,
  isInFlightJob,
  isStaleDraft,
  resolveJobPhaseScreen,
  STALE_DRAFT_MS,
} from "./jobPhase";

function baseJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "j1",
    sop_version: "2026.05.2",
    status: "draft",
    phase: "intake",
    tier: "refresh",
    upholstery_type: "cloth",
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: [],
    warn_banners: [],
    customer_name: "Test",
    customer_phone: "555",
    vehicle_ymmt: "2020 Test",
    license_plate: "ABC",
    service_address: "1 Main",
    technician: "Tech",
    customer_concern: "",
    created_at: new Date().toISOString(),
    audit_log: [],
    ...overrides,
  };
}

describe("jobPhase", () => {
  it("detects in-flight vs terminal", () => {
    expect(isInFlightJob(baseJob())).toBe(true);
    expect(isInFlightJob(baseJob({ status: "completed" }))).toBe(false);
    expect(isInFlightJob(baseJob({ status: "declined" }))).toBe(false);
  });

  it("detects draft-only jobs", () => {
    expect(isDraftOnly(baseJob())).toBe(true);
    expect(
      isDraftOnly(
        baseJob({
          generated_steps: [
            {
              instance_id: "s1",
              template_id: "wash_1",
              slot: "wash",
              status: "completed",
              completed_at: new Date().toISOString(),
              photo_taken: false,
              tech_note: "",
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("flags stale drafts after 24h", () => {
    const old = new Date(Date.now() - STALE_DRAFT_MS - 1000).toISOString();
    expect(isStaleDraft(baseJob({ created_at: old }))).toBe(true);
    expect(isStaleDraft(baseJob())).toBe(false);
  });

  it("routes active work to checklist", () => {
    expect(
      resolveJobPhaseScreen(
        baseJob({
          status: "active",
          phase: "checklist",
          intake: { completed_at: "x" } as JobRecord["intake"],
        }),
      ),
    ).toBe("checklist");
  });

  it("routes blocked refer-out to refer_out screen", () => {
    expect(
      resolveJobPhaseScreen(baseJob({ status: "blocked_refer_out" })),
    ).toBe("refer_out");
  });

  it("routes qc_work phase to qc", () => {
    expect(
      resolveJobPhaseScreen(
        baseJob({ status: "intake_complete", phase: "qc_work" }),
      ),
    ).toBe("qc");
  });
});
