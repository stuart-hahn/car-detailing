import { describe, expect, it } from "vitest";
import master from "../../data/master_steps.json";
import type { JobRecord } from "../db";
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
