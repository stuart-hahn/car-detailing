import addonsFile from "../../data/addons.json";
import flagBehaviorFile from "../../data/flag_behavior.json";
import type { JobRecord } from "../db";
import { inferAddonForFlag } from "../generator";
import type {
  AddonsFile,
  FlagBehavior,
  FlagBehaviorFile,
  TierId,
} from "../types";
import type { CustomerApprovalRecord, PendingApproval } from "./types";

export type { CustomerApprovalRecord, PendingApproval } from "./types";

export const EVIDENCE_PHOTO_PRICE_THRESHOLD = 150;
export const EVIDENCE_PHOTO_LABOR_THRESHOLD = 60;

const UPSERT_BEHAVIORS = new Set<FlagBehavior>([
  "upsell",
  "upsell_ozone",
  "block_until_approval",
]);

const FLAG_LABELS: Record<string, string> = {
  odor_3: "Heavy odor / ozone treatment",
  pet_hair_severe: "Severe pet hair removal",
  sap: "Tree sap removal",
  overspray: "Paint overspray removal",
  excessive_soiling: "Extended extraction (heavy soiling)",
};

function getFlagBehavior(
  flag: string,
  tier: TierId,
  flags: FlagBehaviorFile = flagBehaviorFile as FlagBehaviorFile,
): FlagBehavior | undefined {
  return flags.flags[flag]?.[tier];
}

function addonForBehavior(flag: string, behavior: FlagBehavior): string | null {
  if (behavior === "upsell_ozone") return "addon_ozone_treatment";
  return inferAddonForFlag(flag);
}

function isApproved(
  flag: string,
  addonId: string | null,
  approved: Set<string>,
): boolean {
  if (approved.has(flag)) return true;
  if (addonId && approved.has(addonId)) return true;
  return false;
}

function lockedStepsForApproval(
  job: JobRecord,
  templateIds: string[],
): number {
  const templateSet = new Set(templateIds);
  return job.generated_steps.filter((s) => {
    if (s.status !== "locked") return false;
    if (templateSet.has(s.template_id)) return true;
    return false;
  }).length;
}

function buildPendingItem(
  job: JobRecord,
  flag: string,
  behavior: FlagBehavior,
  flagsConfig: FlagBehaviorFile,
  addons: AddonsFile,
): PendingApproval | null {
  const entry = flagsConfig.flags[flag];
  if (!entry) return null;

  const preSold = new Set(job.pre_sold_addons);
  const approved = new Set(job.approvals);
  const declined = new Set(job.declined_approvals ?? []);
  const addonId = addonForBehavior(flag, behavior);
  const itemKey = addonId ?? flag;
  if (addonId && preSold.has(addonId)) return null;
  if (declined.has(itemKey)) return null;
  if (isApproved(flag, addonId, approved)) return null;

  const templateIds = entry.injects_steps ?? [];
  const lockedStepCount = lockedStepsForApproval(job, templateIds);
  if (lockedStepCount === 0 && behavior !== "block_until_approval") {
    return null;
  }

  const addonDef = addonId
    ? addons.addons.find((a) => a.id === addonId)
    : undefined;
  const displayName =
    addonDef?.display_name ?? FLAG_LABELS[flag] ?? flag.replace(/_/g, " ");
  const laborMinutes = entry.adds_time_min ?? 30;
  const approvalKeys = [
    ...(addonId ? [addonId] : []),
    ...(behavior === "block_until_approval" ? [flag] : []),
  ];

  const description =
    behavior === "block_until_approval"
      ? "Customer must approve this add-on before related work can begin."
      : "Optional upsell — locked steps stay out of QC until approved or declined.";

  return {
    key: addonId ?? flag,
    kind: addonId ? "addon" : "flag",
    flag,
    addonId,
    displayName,
    description,
    laborMinutes,
    templateIds,
    approvalKeys,
    blocking: behavior === "block_until_approval",
    lockedStepCount,
  };
}

export function getPendingApprovals(
  job: JobRecord,
  options?: { flags?: FlagBehaviorFile; addons?: AddonsFile },
): PendingApproval[] {
  const flagsConfig = options?.flags ?? (flagBehaviorFile as FlagBehaviorFile);
  const addons = options?.addons ?? (addonsFile as AddonsFile);
  const seen = new Set<string>();
  const items: PendingApproval[] = [];

  for (const flag of job.flags) {
    const behavior = getFlagBehavior(flag, job.tier, flagsConfig);
    if (!behavior || !UPSERT_BEHAVIORS.has(behavior)) continue;
    const item = buildPendingItem(job, flag, behavior, flagsConfig, addons);
    if (!item || seen.has(item.key)) continue;
    seen.add(item.key);
    items.push(item);
  }

  return items;
}

export function hasBlockingPendingApproval(job: JobRecord): boolean {
  return getPendingApprovals(job).some((p) => p.blocking);
}

export function approvalEvidencePhotoTag(key: string): string {
  return `approval_${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function requiresEvidencePhoto(
  item: PendingApproval,
  priceDollars: number,
): boolean {
  if (item.flag === "odor_3") return true;
  if (item.addonId === "addon_ozone_treatment") return true;
  if (priceDollars > EVIDENCE_PHOTO_PRICE_THRESHOLD) return true;
  if (item.laborMinutes > EVIDENCE_PHOTO_LABOR_THRESHOLD) return true;
  return false;
}

export function resolveJobStatusAfterApproval(
  job: JobRecord,
  workStarted: boolean,
): JobRecord["status"] {
  if (
    job.status === "blocked_refer_out" ||
    job.status === "blocked_unsafe" ||
    job.status === "declined" ||
    job.status === "completed"
  ) {
    return job.status;
  }
  if (hasBlockingPendingApproval(job)) return "awaiting_approval";
  if (workStarted) return "active";
  if (job.intake?.completed_at) return "intake_complete";
  return job.status;
}

export function cancelDeclinedApprovalSteps(
  steps: JobRecord["generated_steps"],
  templateIds: string[],
): JobRecord["generated_steps"] {
  const ids = new Set(templateIds);
  return steps.map((s) =>
    s.status === "locked" && ids.has(s.template_id)
      ? { ...s, status: "cancelled" as const }
      : s,
  );
}

export function buildApprovalRecord(
  item: PendingApproval,
  scopeNote: string,
  priceDollars: number,
  attestedAt: string,
): CustomerApprovalRecord {
  return {
    key: item.key,
    display_name: item.displayName,
    scope_note: scopeNote.trim(),
    price_dollars: priceDollars,
    labor_minutes: item.laborMinutes,
    customer_attested_at: attestedAt,
    tech_attested_at: attestedAt,
    approved_at: attestedAt,
  };
}
