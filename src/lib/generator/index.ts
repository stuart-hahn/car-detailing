import { ulid } from "ulid";
import type {
  FlagBehavior,
  FlagBehaviorFile,
  GenerateResult,
  JobInput,
  MasterStepsFile,
  MaterialZone,
  StepInstance,
  StepTemplate,
  TierId,
  UpholsteryType,
  WarnBanner,
} from "../types";
import { slotIndex } from "../slots";
import addonsFile from "../../data/addons.json";
import flagBehaviorFile from "../../data/flag_behavior.json";
import type { AddonsFile } from "../types";

const HARD_BLOCK_FLAGS = new Set(["mold", "biohazard"]);
const APPROVAL_FLAGS = new Set(["odor_3", "pet_hair_severe", "upsell_ozone"]);

const UPHOLSTERY_BRANCHES: Record<UpholsteryType, string[]> = {
  cloth: ["branch_cloth"],
  leather: ["branch_leather"],
  mixed: ["branch_cloth", "branch_leather"],
  unknown: ["branch_cloth"],
};

const WARN_MESSAGES: Record<string, string> = {
  odor_1: "Light odor noted at intake. Monitor during interior work.",
  unknown_upholstery:
    "Upholstery type unknown — using cloth-safe defaults. Confirm materials.",
};

export interface GenerateOptions {
  master: MasterStepsFile;
  flags?: FlagBehaviorFile;
  addons?: AddonsFile;
}

function stepMatchesTier(step: StepTemplate, tier: TierId): boolean {
  return step.tiers.includes(tier);
}

function stepMatchesBranch(step: StepTemplate, activeBranches: Set<string>): boolean {
  if (!step.branches?.length) return true;
  return step.branches.some((b) => activeBranches.has(b));
}

function collectBaseSteps(
  steps: StepTemplate[],
  tier: TierId,
  activeBranches: Set<string>,
): StepTemplate[] {
  return steps.filter(
    (s) =>
      s.enabled &&
      s.phase === 1 &&
      !s.reserved &&
      stepMatchesTier(s, tier) &&
      stepMatchesBranch(s, activeBranches),
  );
}

function getFlagBehavior(
  flag: string,
  tier: TierId,
  flags: FlagBehaviorFile,
): FlagBehavior | undefined {
  const entry = flags.flags[flag];
  return entry?.[tier];
}

function resolveFlagSteps(
  flag: string,
  behavior: FlagBehavior,
  flags: FlagBehaviorFile,
  preSold: Set<string>,
  approvals: Set<string>,
): { steps: string[]; banner?: WarnBanner; block?: string } {
  const entry = flags.flags[flag];
  if (!entry) return { steps: [] };

  if (behavior === "hard_block" || HARD_BLOCK_FLAGS.has(flag)) {
    return { steps: [], block: flag };
  }

  if (behavior === "warn") {
    return {
      steps: [],
      banner: {
        flag,
        severity: "warn",
        message: WARN_MESSAGES[flag] ?? `Flag active: ${flag}`,
        display: ["intake_summary", "checklist_header"],
        dismissable: true,
      },
    };
  }

  const injectIds = entry.injects_steps ?? [];

  if (behavior === "inject") {
    return { steps: injectIds };
  }

  if (
    behavior === "upsell" ||
    behavior === "upsell_ozone" ||
    behavior === "block_until_approval"
  ) {
    const addonKey =
      behavior === "upsell_ozone" ? "addon_ozone_treatment" : inferAddonForFlag(flag);
    const approved =
      (addonKey && (preSold.has(addonKey) || approvals.has(addonKey))) ||
      approvals.has(flag);
    if (approved) return { steps: injectIds };
    return { steps: injectIds, banner: upsellBanner(flag, behavior) };
  }

  return { steps: [] };
}

function inferAddonForFlag(flag: string): string | null {
  const map: Record<string, string> = {
    pet_hair_severe: "addon_pet_hair_removal",
    odor_3: "addon_ozone_treatment",
    sap: "addon_tar_removal",
    overspray: "addon_tar_removal",
  };
  return map[flag] ?? null;
}

function upsellBanner(flag: string, behavior: FlagBehavior): WarnBanner {
  return {
    flag,
    severity: "warn",
    message:
      behavior === "block_until_approval"
        ? `Approval required for ${flag} before work unlocks.`
        : `Upsell available: ${flag}. Locked steps shown until approved.`,
    display: ["checklist_header"],
    dismissable: true,
  };
}

function collectAddonSteps(
  addonIds: string[],
  addons: AddonsFile,
  tier: TierId,
): string[] {
  const ids: string[] = [];
  for (const addonId of addonIds) {
    const addon = addons.addons.find((a) => a.id === addonId);
    if (!addon?.enabled) continue;
    if (!addon.available_on_tiers.includes(tier)) continue;
    ids.push(...addon.injects_steps);
  }
  return ids;
}

function templatesForIds(
  allSteps: StepTemplate[],
  templateIds: Set<string>,
): StepTemplate[] {
  return allSteps.filter((s) => templateIds.has(s.id));
}

function applyMutualExclusion(steps: StepTemplate[]): StepTemplate[] {
  const kept = new Map<string, StepTemplate>();
  for (const step of steps) {
    const existing = kept.get(step.id);
    if (!existing) {
      kept.set(step.id, step);
      continue;
    }
    const prio = (s: StepTemplate) => s.priority ?? 100;
    if (prio(step) < prio(existing)) kept.set(step.id, step);
  }

  const result = [...kept.values()];
  const drop = new Set<string>();
  for (const step of result) {
    for (const ex of step.mutually_exclusive_with ?? []) {
      const other = result.find((s) => s.id === ex);
      if (other && (other.priority ?? 100) > (step.priority ?? 100)) {
        drop.add(other.id);
      }
    }
  }
  return result.filter((s) => !drop.has(s.id));
}

function topoSortWithinSlot(steps: StepTemplate[]): StepTemplate[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const out: StepTemplate[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const step = byId.get(id);
    if (!step) return;
    for (const dep of step.dependencies ?? []) {
      if (byId.has(dep)) visit(dep);
    }
    out.push(step);
  }

  const sorted = [...steps].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );
  for (const s of sorted) visit(s.id);
  return out;
}

function sortSteps(steps: StepTemplate[]): StepTemplate[] {
  const bySlot = new Map<string, StepTemplate[]>();
  for (const s of steps) {
    const list = bySlot.get(s.slot) ?? [];
    list.push(s);
    bySlot.set(s.slot, list);
  }

  const ordered: StepTemplate[] = [];
  for (const slot of [...bySlot.keys()].sort(
    (a, b) => slotIndex(a as StepTemplate["slot"]) - slotIndex(b as StepTemplate["slot"]),
  )) {
    ordered.push(...topoSortWithinSlot(bySlot.get(slot)!));
  }
  return ordered;
}

function instantiate(
  templates: StepTemplate[],
  zones: MaterialZone[],
  upholstery: UpholsteryType,
  preSold: Set<string>,
  approvals: Set<string>,
): StepInstance[] {
  const instances: StepInstance[] = [];

  for (const t of templates) {
    const needsZoneSplit =
      upholstery === "mixed" &&
      t.branches?.some((b) => b === "branch_leather" || b === "branch_cloth");

    if (needsZoneSplit && zones.length > 0 && t.branches?.includes("branch_leather")) {
      const leatherZones = zones.filter((z) =>
        ["coated_leather", "vinyl", "alcantara", "suede"].includes(z.material),
      );
      for (const z of leatherZones) {
        instances.push(createInstance(t, z, preSold, approvals));
      }
      continue;
    }

    instances.push(createInstance(t, undefined, preSold, approvals));
  }

  return instances;
}

function createInstance(
  t: StepTemplate,
  zone: MaterialZone | undefined,
  preSold: Set<string>,
  approvals: Set<string>,
): StepInstance {
  const locked = isLockedTemplate(t, preSold, approvals);
  return {
    instance_id: ulid(),
    template_id: t.id,
    slot: t.slot,
    status: locked ? "locked" : "pending",
    zone: zone?.zone,
    material: zone?.material,
    completed_at: null,
    photo_taken: false,
    tech_note: null,
  };
}

function isLockedTemplate(
  t: StepTemplate,
  preSold: Set<string>,
  approvals: Set<string>,
): boolean {
  if (t.injects_from_addons?.length) {
    const needs = t.injects_from_addons;
    const has = needs.some((id) => preSold.has(id) || approvals.has(id));
    if (!has) return true;
  }
  return false;
}

export function generateChecklist(
  input: JobInput,
  options: GenerateOptions,
): GenerateResult {
  const { master } = options;
  const flagsConfig = options.flags ?? (flagBehaviorFile as FlagBehaviorFile);
  const addons = options.addons ?? (addonsFile as AddonsFile);

  const preSold = new Set(input.pre_sold_addons);
  const approvals = new Set(input.approvals);
  const activeBranches = new Set(UPHOLSTERY_BRANCHES[input.upholstery_type]);

  if (input.tier === "showroom" || preSold.has("addon_engine_bay")) {
    activeBranches.add("branch_engine");
  }

  const warnBanners: WarnBanner[] = [];
  let blockReason: string | undefined;

  for (const flag of input.flags) {
    if (HARD_BLOCK_FLAGS.has(flag)) {
      return {
        generated_steps: [],
        warn_banners: [],
        blocked: true,
        block_reason: flag,
      };
    }
    const behavior = getFlagBehavior(flag, input.tier, flagsConfig);
    if (!behavior) continue;
    const result = resolveFlagSteps(
      flag,
      behavior,
      flagsConfig,
      preSold,
      approvals,
    );
    if (result.block) blockReason = result.block;
    if (result.banner) warnBanners.push(result.banner);
  }

  if (input.upholstery_type === "unknown") {
    warnBanners.push({
      flag: "unknown_upholstery",
      severity: "warn",
      message: WARN_MESSAGES.unknown_upholstery!,
      display: ["intake_summary", "checklist_header"],
      dismissable: true,
    });
  }

  if (blockReason) {
    return {
      generated_steps: [],
      warn_banners: warnBanners,
      blocked: true,
      block_reason: blockReason,
    };
  }

  const extraTemplateIds = new Set<string>();

  for (const flag of input.flags) {
    const behavior = getFlagBehavior(flag, input.tier, flagsConfig);
    if (!behavior) continue;
    const result = resolveFlagSteps(
      flag,
      behavior,
      flagsConfig,
      preSold,
      approvals,
    );
    for (const id of result.steps) extraTemplateIds.add(id);
  }

  const addonIds = [
    ...input.pre_sold_addons,
    ...input.approvals.filter((a) => a.startsWith("addon_")),
  ];
  for (const id of collectAddonSteps(addonIds, addons, input.tier)) {
    extraTemplateIds.add(id);
  }

  let steps = collectBaseSteps(master.steps, input.tier, activeBranches);
  const extraTemplates = templatesForIds(master.steps, extraTemplateIds);
  steps = applyMutualExclusion([...steps, ...extraTemplates]);
  steps = sortSteps(steps);

  const generated_steps = instantiate(
    steps,
    input.material_zones ?? [],
    input.upholstery_type,
    preSold,
    approvals,
  );

  for (const flag of input.flags) {
    if (APPROVAL_FLAGS.has(flag)) {
      const behavior = getFlagBehavior(flag, input.tier, flagsConfig);
      if (
        behavior === "block_until_approval" ||
        behavior === "upsell" ||
        behavior === "upsell_ozone"
      ) {
        const addon = inferAddonForFlag(flag);
        if (addon && !preSold.has(addon) && !approvals.has(addon) && !approvals.has(flag)) {
          warnBanners.push(upsellBanner(flag, behavior));
        }
      }
    }
  }

  return {
    generated_steps,
    warn_banners: dedupeBanners(warnBanners),
    blocked: false,
  };
}

function dedupeBanners(banners: WarnBanner[]): WarnBanner[] {
  const seen = new Set<string>();
  return banners.filter((b) => {
    if (seen.has(b.flag)) return false;
    seen.add(b.flag);
    return true;
  });
}

/** Delta inject after mid-job approval — append only, preserve completed. */
export function appendApprovedSteps(
  existing: StepInstance[],
  templateIds: string[],
  master: MasterStepsFile,
  preSold: Set<string>,
  approvals: Set<string>,
): StepInstance[] {
  const existingTemplates = new Set(existing.map((s) => s.template_id));
  const toAdd = templateIds.filter((id) => !existingTemplates.has(id));
  const templates = master.steps.filter((s) => toAdd.includes(s.id));

  const unlocked = existing.map((inst) => {
    const t = master.steps.find((s) => s.id === inst.template_id);
    if (inst.status !== "locked" || !t) return inst;
    if (!isLockedTemplate(t, preSold, approvals)) {
      return { ...inst, status: "pending" as const };
    }
    return inst;
  });

  const newInstances = instantiate(templates, [], "cloth", preSold, approvals);
  return [...unlocked, ...newInstances];
}
