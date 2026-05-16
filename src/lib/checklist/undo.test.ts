import { describe, expect, it } from "vitest";
import { evaluateUndoPolicy, FREE_UNDO_MS, isDeliveryQcStarted } from "./undo";
import type { JobRecord } from "../db";
import type { StepInstance } from "../types";

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "j1",
    sop_version: "2026.05.1",
    status: "active",
    phase: "checklist",
    tier: "refresh",
    upholstery_type: "cloth",
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: [],
    warn_banners: [],
    customer_name: "A",
    customer_phone: "1",
    vehicle_ymmt: "Car",
    license_plate: "X",
    service_address: "Here",
    technician: "T",
    customer_concern: "",
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
      customer_concern: "",
      personal_items_ack: true,
      liability_scope_ack: true,
      expectation_ack: false,
      unsafe_environment: false,
      completed_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

function completedStep(completedAt: string): StepInstance {
  return {
    instance_id: "s1",
    template_id: "wheel_clean",
    slot: "wheels",
    status: "completed",
    completed_at: completedAt,
    photo_taken: false,
    tech_note: null,
  };
}

describe("undo policy", () => {
  it("allows free undo within 5 minutes", () => {
    const now = Date.now();
    const step = completedStep(new Date(now - 60_000).toISOString());
    const result = evaluateUndoPolicy(job(), step, now);
    expect(result.allowed).toBe(true);
    expect(result.needsReason).toBe(false);
  });

  it("requires reason after 5 minutes", () => {
    const now = Date.now();
    const step = completedStep(new Date(now - FREE_UNDO_MS - 1000).toISOString());
    const result = evaluateUndoPolicy(job(), step, now);
    expect(result.allowed).toBe(true);
    expect(result.needsReason).toBe(true);
  });

  it("blocks undo after delivery qc phase", () => {
    const step = completedStep(new Date().toISOString());
    const result = evaluateUndoPolicy(job({ phase: "qc_delivery" }), step);
    expect(result.allowed).toBe(false);
  });

  it("detects delivery qc started from completed delivery step", () => {
    expect(
      isDeliveryQcStarted(
        job({
          generated_steps: [
            {
              instance_id: "d1",
              template_id: "qc_delivery",
              slot: "delivery",
              status: "completed",
              completed_at: new Date().toISOString(),
              photo_taken: false,
              tech_note: null,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
