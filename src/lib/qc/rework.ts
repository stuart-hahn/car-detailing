import type { QcReworkMapping, SlotId, StepInstance } from "../types";

export const QC_REWORK_MAPPINGS: QcReworkMapping[] = [
  {
    fail_code: "streaked_windshield",
    label: "Streaked windshield",
    reopen_slots: ["glass"],
    reopen_templates: ["glass_full"],
  },
  {
    fail_code: "wet_carpet",
    label: "Wet carpet",
    reopen_slots: ["interior_wet"],
    reopen_templates: ["int_extract", "int_extraction_extended"],
  },
  {
    fail_code: "wheel_residue",
    label: "Wheel residue",
    reopen_slots: ["wheels"],
    reopen_templates: ["wheel_clean"],
  },
  {
    fail_code: "tire_sling",
    label: "Tire sling",
    reopen_slots: ["finalization"],
    reopen_templates: ["final_tire_dressing"],
  },
  {
    fail_code: "odor_persists",
    label: "Odor persists",
    reopen_slots: ["interior_refine", "interior_wet"],
  },
];

export function getReworkMapping(failCode: string): QcReworkMapping | undefined {
  return QC_REWORK_MAPPINGS.find((m) => m.fail_code === failCode);
}

export function applyQcRework(
  instances: StepInstance[],
  failCodes: string[],
): StepInstance[] {
  const mappings = failCodes
    .map(getReworkMapping)
    .filter((m): m is QcReworkMapping => Boolean(m));

  const reopenTemplates = new Set<string>();
  const reopenSlots = new Set<SlotId>();

  for (const m of mappings) {
    for (const s of m.reopen_slots) reopenSlots.add(s);
    for (const t of m.reopen_templates ?? []) reopenTemplates.add(t);
  }

  return instances.map((inst) => {
    const matchTemplate = reopenTemplates.has(inst.template_id);
    const matchSlot = reopenSlots.has(inst.slot);
    if (!matchTemplate && !matchSlot) return inst;
    if (inst.status === "locked" || inst.status === "cancelled") return inst;
    return {
      ...inst,
      status: "needs_rework",
      completed_at: null,
      photo_taken: false,
    };
  });
}

export function abbreviatedQcStepIds(
  instances: StepInstance[],
  failCodes: string[],
): string[] {
  const mappings = failCodes
    .map(getReworkMapping)
    .filter((m): m is QcReworkMapping => Boolean(m));

  const ids = new Set<string>();
  for (const inst of instances) {
    if (inst.status !== "needs_rework") continue;
    const matchMapping = mappings.some(
      (m) =>
        m.reopen_slots.includes(inst.slot) ||
        m.reopen_templates?.includes(inst.template_id),
    );
    if (matchMapping) ids.add(inst.template_id);
  }
  return [...ids];
}
