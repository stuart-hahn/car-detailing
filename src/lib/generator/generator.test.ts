import { describe, expect, it } from "vitest";
import master from "../../data/master_steps.json";
import { generateChecklist, appendApprovedSteps } from "./index";
import type { JobInput, MasterStepsFile } from "../types";
import { slotIndex } from "../slots";

const masterFile = master as MasterStepsFile;

function baseInput(overrides: Partial<JobInput> = {}): JobInput {
  return {
    tier: "maintenance",
    upholstery_type: "cloth",
    flags: [],
    pre_sold_addons: [],
    approvals: [],
    sop_version: masterFile.version,
    ...overrides,
  };
}

describe("generateChecklist", () => {
  it("generates maintenance tier base steps without decon", () => {
    const result = generateChecklist(baseInput(), { master: masterFile });
    expect(result.blocked).toBe(false);
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("wash_contact");
    expect(ids).toContain("int_vacuum");
    expect(ids).not.toContain("decon_clay");
    expect(ids).not.toContain("int_air_purge");
  });

  it("generates refresh tier with decon and interior branches", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", upholstery_type: "cloth" }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("decon_iron");
    expect(ids).toContain("decon_clay");
    expect(ids).toContain("int_extract");
    expect(ids).toContain("int_air_purge");
  });

  it("injects leather branch for leather upholstery", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", upholstery_type: "leather" }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("int_leather");
    expect(ids).not.toContain("int_extract");
  });

  it("hard blocks mold with no steps", () => {
    const result = generateChecklist(
      baseInput({ flags: ["mold"] }),
      { master: masterFile },
    );
    expect(result.blocked).toBe(true);
    expect(result.block_reason).toBe("mold");
    expect(result.generated_steps).toHaveLength(0);
  });

  it("warns on odor_1 for maintenance without injecting steps", () => {
    const result = generateChecklist(
      baseInput({ flags: ["odor_1"] }),
      { master: masterFile },
    );
    expect(result.warn_banners.some((b) => b.flag === "odor_1")).toBe(true);
    expect(result.generated_steps.map((s) => s.template_id)).not.toContain(
      "int_odor_light",
    );
  });

  it("injects odor_1 steps on refresh", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", flags: ["odor_1"] }),
      { master: masterFile },
    );
    expect(result.generated_steps.map((s) => s.template_id)).toContain(
      "int_odor_light",
    );
  });

  it("locks ozone steps until addon approved", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", flags: ["odor_3"] }),
      { master: masterFile },
    );
    const ozone = result.generated_steps.filter((s) =>
      s.template_id.startsWith("int_ozone"),
    );
    expect(ozone.length).toBeGreaterThan(0);
    expect(ozone.every((s) => s.status === "locked")).toBe(true);
  });

  it("unlocks ozone when approval present", () => {
    const result = generateChecklist(
      baseInput({
        tier: "refresh",
        flags: ["odor_3"],
        approvals: ["addon_ozone_treatment"],
      }),
      { master: masterFile },
    );
    const ozone = result.generated_steps.filter((s) =>
      s.template_id.startsWith("int_ozone"),
    );
    expect(ozone.some((s) => s.status === "pending")).toBe(true);
  });

  it("injects clay via pre-sold addon on maintenance", () => {
    const result = generateChecklist(
      baseInput({ pre_sold_addons: ["addon_clay"] }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("decon_iron");
    expect(ids).toContain("decon_clay");
  });

  it("includes engine steps for showroom tier", () => {
    const result = generateChecklist(
      baseInput({ tier: "showroom", upholstery_type: "cloth" }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("eng_degrease");
    expect(ids).toContain("ext_trim_restore");
  });

  it("sorts steps by canonical slot order", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", upholstery_type: "cloth" }),
      { master: masterFile },
    );
    const slots = result.generated_steps.map((s) => s.slot);
    for (let i = 1; i < slots.length; i++) {
      expect(slotIndex(slots[i]!)).toBeGreaterThanOrEqual(
        slotIndex(slots[i - 1]!),
      );
    }
  });

  it("excludes reserved disabled ceramic step", () => {
    const result = generateChecklist(
      baseInput({ tier: "showroom" }),
      { master: masterFile },
    );
    expect(result.generated_steps.map((s) => s.template_id)).not.toContain(
      "coat_apply",
    );
  });

  it("library has 55–75 phase-1 executable templates", () => {
    const executable = masterFile.steps.filter(
      (s) => s.enabled && s.phase === 1 && !s.reserved,
    );
    expect(executable.length).toBeGreaterThanOrEqual(55);
    expect(executable.length).toBeLessThanOrEqual(75);
  });

  it("maintenance includes trunk vacuum and jambs-free wash path", () => {
    const result = generateChecklist(baseInput(), { master: masterFile });
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("int_trunk_vacuum");
    expect(ids).toContain("wash_final_rinse");
    expect(ids).not.toContain("wash_jambs");
    expect(ids).not.toContain("glass_windshield_decon");
  });

  it("refresh includes jambs, windshield decon, and trim detail", () => {
    const result = generateChecklist(
      baseInput({ tier: "refresh", upholstery_type: "cloth" }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("wash_jambs");
    expect(ids).toContain("glass_windshield_decon");
    expect(ids).toContain("int_trim_detail");
    expect(ids).toContain("decon_residue_wipe");
  });

  it("showroom includes engine, trim restore, exhaust, and delivery walkthrough", () => {
    const result = generateChecklist(
      baseInput({ tier: "showroom", upholstery_type: "cloth" }),
      { master: masterFile },
    );
    const ids = result.generated_steps.map((s) => s.template_id);
    expect(ids).toContain("eng_agitate");
    expect(ids).toContain("ext_trim_restore");
    expect(ids).toContain("ext_exhaust_tips");
    expect(ids).toContain("del_customer_walkthrough");
    expect(ids).toContain("intake_defect_survey");
  });
});

describe("appendApprovedSteps", () => {
  it("unlocks locked steps when approval added without removing completed", () => {
    const initial = generateChecklist(
      baseInput({ tier: "refresh", flags: ["odor_3"] }),
      { master: masterFile },
    );
    const completed = initial.generated_steps.map((s, i) =>
      i === 0 ? { ...s, status: "completed" as const, completed_at: new Date().toISOString() } : s,
    );
    const updated = appendApprovedSteps(
      completed,
      ["int_ozone_prep", "int_ozone_run"],
      masterFile,
      new Set(),
      new Set(["addon_ozone_treatment"]),
    );
    expect(updated[0]?.status).toBe("completed");
    const ozone = updated.filter((s) => s.template_id.startsWith("int_ozone"));
    expect(ozone.some((s) => s.status === "pending")).toBe(true);
  });
});
