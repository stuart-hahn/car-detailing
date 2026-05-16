import { describe, expect, it } from "vitest";
import master from "../../data/master_steps.json";
import type { JobRecord } from "../db";
import { generateChecklist } from "../generator";
import type { MasterStepsFile } from "../types";
import { collectRequiredPhotoTags } from "./photoTags";

const masterFile = master as MasterStepsFile;

function stubJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "01JOB",
    sop_version: masterFile.version,
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
    customer_phone: "",
    vehicle_ymmt: "",
    license_plate: "",
    service_address: "",
    technician: "Tech",
    customer_concern: "",
    created_at: new Date().toISOString(),
    audit_log: [],
    ...overrides,
  };
}

describe("collectRequiredPhotoTags", () => {
  it("includes corner photos for maintenance intake", () => {
    const tags = collectRequiredPhotoTags(stubJob(), masterFile);
    expect(tags).toContain("corner_fl");
    expect(tags).toContain("corner_rr");
    expect(tags).not.toContain("interior_wide_front");
  });

  it("includes final QC photos for maintenance tier", () => {
    const tags = collectRequiredPhotoTags(stubJob(), masterFile);
    expect(tags).toContain("qc_final_01");
    expect(tags).toContain("qc_odometer");
    expect(tags.filter((t) => t.startsWith("qc_final_"))).toHaveLength(4);
  });

  it("includes severity flag photos when odor is heavy", () => {
    const tags = collectRequiredPhotoTags(
      stubJob({
        intake: {
          booking_upholstery: "cloth",
          confirmed_upholstery: "cloth",
          material_tags: [],
          material_zones: [],
          damage_tags: [],
          odor_severity: 3,
          pet_hair_severity: 0,
          condition_flag_ids: [],
          primary_goal: "maintenance",
          customer_concern: "",
          personal_items_ack: true,
          liability_scope_ack: true,
          expectation_ack: false,
          unsafe_environment: false,
        },
        flags: ["odor_3"],
      }),
      masterFile,
    );
    expect(tags).toContain("flag_odor_3");
  });

  it("includes approval evidence photos for pending ozone upsell", () => {
    const tags = collectRequiredPhotoTags(
      stubJob({
        tier: "refresh",
        flags: ["odor_3"],
        generated_steps: generateChecklist(
          {
            tier: "refresh",
            upholstery_type: "cloth",
            flags: ["odor_3"],
            pre_sold_addons: [],
            approvals: [],
            sop_version: masterFile.version,
          },
          { master: masterFile },
        ).generated_steps,
      }),
      masterFile,
    );
    expect(tags).toContain("approval_addon_ozone_treatment");
  });

  it("includes step photo tags when template requires photo", () => {
    const tags = collectRequiredPhotoTags(
      stubJob({
        generated_steps: [
          {
            instance_id: "01STEP",
            template_id: "prep_walkaround",
            slot: "intake",
            status: "pending",
            completed_at: null,
            photo_taken: false,
            tech_note: null,
          },
        ],
      }),
      masterFile,
    );
    expect(tags).toContain("step_01STEP");
  });
});
