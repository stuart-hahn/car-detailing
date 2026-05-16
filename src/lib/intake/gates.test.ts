import { describe, expect, it } from "vitest";
import { evaluateIntakeGate } from "./gates";
import { getRequiredPhotoRequirements } from "./requirements";
import type { JobRecord } from "../db";

function baseJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "job1",
    sop_version: "2026.05.1",
    status: "draft",
    phase: "intake",
    tier: "maintenance",
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
    service_address: "1 Main St",
    technician: "Tech",
    customer_concern: "Regular wash",
    created_at: new Date().toISOString(),
    audit_log: [],
    intake: {
      booking_upholstery: "cloth",
      confirmed_upholstery: "cloth",
      material_tags: [],
      material_zones: [],
      damage_tags: [],
      odor_severity: 0,
      pet_hair_severity: 0,
      condition_flag_ids: [],
      primary_goal: "maintenance",
      customer_concern: "Regular wash",
      personal_items_ack: true,
      liability_scope_ack: true,
      expectation_ack: false,
      unsafe_environment: false,
    },
    ...overrides,
  };
}

describe("intake photo requirements", () => {
  it("requires 4 corners for maintenance", () => {
    const reqs = getRequiredPhotoRequirements(baseJob());
    expect(reqs.filter((r) => r.required).map((r) => r.tag)).toEqual([
      "corner_fl",
      "corner_fr",
      "corner_rl",
      "corner_rr",
    ]);
  });

  it("requires interior wide for refresh", () => {
    const reqs = getRequiredPhotoRequirements(baseJob({ tier: "refresh" }));
    const tags = reqs.map((r) => r.tag);
    expect(tags).toContain("interior_wide_front");
    expect(tags).not.toContain("engine_bay_wide");
  });

  it("requires panel macros and engine for showroom", () => {
    const reqs = getRequiredPhotoRequirements(baseJob({ tier: "showroom" }));
    const tags = reqs.map((r) => r.tag);
    expect(tags).toContain("panel_hood");
    expect(tags).toContain("engine_bay_wide");
  });
});

describe("evaluateIntakeGate", () => {
  it("passes maintenance with corners and acks", () => {
    const result = evaluateIntakeGate(
      baseJob(),
      ["corner_fl", "corner_fr", "corner_rl", "corner_rr"],
    );
    expect(result.canComplete).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it("blocks mold", () => {
    const job = baseJob({
      flags: ["mold"],
      intake: {
        ...baseJob().intake!,
        condition_flag_ids: ["mold"],
      },
    });
    const result = evaluateIntakeGate(
      job,
      ["corner_fl", "corner_fr", "corner_rl", "corner_rr"],
    );
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toBe("mold");
    expect(result.canComplete).toBe(false);
  });

  it("requires expectation ack for maintenance gloss goal", () => {
    const job = baseJob({
      intake: {
        ...baseJob().intake!,
        primary_goal: "gloss_improvement",
        expectation_ack: false,
      },
    });
    const result = evaluateIntakeGate(
      job,
      ["corner_fl", "corner_fr", "corner_rl", "corner_rr"],
    );
    expect(result.canComplete).toBe(false);
    expect(result.fieldErrors.some((e) => e.field === "expectation_ack")).toBe(
      true,
    );
  });
});
