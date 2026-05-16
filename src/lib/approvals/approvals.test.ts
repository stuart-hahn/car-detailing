import { describe, expect, it } from "vitest";
import { generateChecklist } from "../generator";
import master from "../../data/master_steps.json";
import type { JobRecord } from "../db";
import type { MasterStepsFile } from "../types";
import {
  approvalEvidencePhotoTag,
  buildApprovalRecord,
  getPendingApprovals,
  hasBlockingPendingApproval,
  requiresEvidencePhoto,
  resolveJobStatusAfterApproval,
} from "./index";

const masterFile = master as MasterStepsFile;

function jobFromInput(
  input: Parameters<typeof generateChecklist>[0],
  overrides: Partial<JobRecord> = {},
): JobRecord {
  const generated = generateChecklist(input, { master: masterFile });
  return {
    id: "job1",
    sop_version: input.sop_version,
    status: "active",
    phase: "checklist",
    tier: input.tier,
    upholstery_type: input.upholstery_type,
    pre_sold_addons: input.pre_sold_addons,
    flags: input.flags,
    approvals: input.approvals,
    generated_steps: generated.generated_steps,
    warn_banners: generated.warn_banners,
    customer_name: "Test",
    customer_phone: "",
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

describe("getPendingApprovals", () => {
  it("lists ozone upsell when odor_3 on refresh without approval", () => {
    const job = jobFromInput({
      tier: "refresh",
      upholstery_type: "cloth",
      flags: ["odor_3"],
      pre_sold_addons: [],
      approvals: [],
      sop_version: masterFile.version,
    });
    const pending = getPendingApprovals(job);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.key).toBe("addon_ozone_treatment");
    expect(pending[0]?.lockedStepCount).toBeGreaterThan(0);
    expect(pending[0]?.blocking).toBe(false);
  });

  it("marks maintenance odor_3 as blocking", () => {
    const job = jobFromInput({
      tier: "maintenance",
      upholstery_type: "cloth",
      flags: ["odor_3"],
      pre_sold_addons: [],
      approvals: [],
      sop_version: masterFile.version,
    });
    const pending = getPendingApprovals(job);
    expect(pending[0]?.blocking).toBe(true);
    expect(hasBlockingPendingApproval(job)).toBe(true);
  });

  it("returns empty when upsell was declined", () => {
    const job = jobFromInput({
      tier: "refresh",
      upholstery_type: "cloth",
      flags: ["odor_3"],
      pre_sold_addons: [],
      approvals: [],
      sop_version: masterFile.version,
    });
    job.declined_approvals = ["addon_ozone_treatment"];
    expect(getPendingApprovals(job)).toHaveLength(0);
  });

  it("returns empty when addon already approved", () => {
    const job = jobFromInput({
      tier: "refresh",
      upholstery_type: "cloth",
      flags: ["odor_3"],
      pre_sold_addons: [],
      approvals: ["addon_ozone_treatment"],
      sop_version: masterFile.version,
    });
    expect(getPendingApprovals(job)).toHaveLength(0);
  });
});

describe("requiresEvidencePhoto", () => {
  const ozoneItem = {
    key: "addon_ozone_treatment",
    kind: "addon" as const,
    flag: "odor_3",
    addonId: "addon_ozone_treatment",
    displayName: "Ozone",
    description: "",
    laborMinutes: 30,
    templateIds: [],
    approvalKeys: ["addon_ozone_treatment"],
    blocking: false,
    lockedStepCount: 2,
  };

  it("requires photo for odor / ozone", () => {
    expect(requiresEvidencePhoto(ozoneItem, 0)).toBe(true);
  });

  it("requires photo when price over threshold", () => {
    const petItem = { ...ozoneItem, flag: "pet_hair_severe", key: "addon_pet_hair_removal", addonId: "addon_pet_hair_removal" };
    expect(requiresEvidencePhoto(petItem, 200)).toBe(true);
    expect(requiresEvidencePhoto(petItem, 50)).toBe(false);
  });

  it("requires photo when labor over threshold", () => {
    const heavy = { ...ozoneItem, laborMinutes: 90 };
    expect(requiresEvidencePhoto(heavy, 0)).toBe(true);
  });
});

describe("resolveJobStatusAfterApproval", () => {
  it("clears awaiting_approval when blocking item approved", () => {
    const job = jobFromInput(
      {
        tier: "maintenance",
        upholstery_type: "cloth",
        flags: ["odor_3"],
        pre_sold_addons: [],
        approvals: ["addon_ozone_treatment"],
        sop_version: masterFile.version,
      },
      { status: "awaiting_approval" },
    );
    expect(resolveJobStatusAfterApproval(job, true)).toBe("active");
  });
});

describe("approvalEvidencePhotoTag", () => {
  it("sanitizes keys for photo storage", () => {
    expect(approvalEvidencePhotoTag("addon_ozone_treatment")).toBe(
      "approval_addon_ozone_treatment",
    );
  });
});

describe("buildApprovalRecord", () => {
  it("stores dual attest timestamps", () => {
    const item = getPendingApprovals(
      jobFromInput({
        tier: "refresh",
        upholstery_type: "cloth",
        flags: ["odor_3"],
        pre_sold_addons: [],
        approvals: [],
        sop_version: masterFile.version,
      }),
    )[0]!;
    const at = "2026-05-16T12:00:00.000Z";
    const record = buildApprovalRecord(item, "Ozone add-on", 175, at);
    expect(record.customer_attested_at).toBe(at);
    expect(record.tech_attested_at).toBe(at);
    expect(record.price_dollars).toBe(175);
  });
});
