import type { JobRecord } from "../db";
import type { JobIntake, TierId } from "../types";
import {
  CORNER_PHOTOS,
  INTERIOR_WIDE_PHOTOS,
  MAINTENANCE_EXPECTATION_GOALS,
  PANEL_MACRO_PHOTOS,
} from "./constants";

export interface PhotoRequirement {
  tag: string;
  label: string;
  required: boolean;
}

export interface IntakeFieldError {
  field: string;
  message: string;
}

export function needsExpectationAck(
  tier: TierId,
  primaryGoal: JobIntake["primary_goal"],
): boolean {
  return (
    tier === "maintenance" &&
    MAINTENANCE_EXPECTATION_GOALS.includes(primaryGoal)
  );
}

export function needsEngineBayPhoto(
  tier: TierId,
  preSoldAddons: string[],
): boolean {
  return tier === "showroom" || preSoldAddons.includes("addon_engine_bay");
}

export function getRequiredPhotoRequirements(
  job: Pick<JobRecord, "tier" | "pre_sold_addons"> & {
    intake?: JobIntake;
  },
): PhotoRequirement[] {
  const intake = job.intake;
  const reqs: PhotoRequirement[] = [];

  for (const p of CORNER_PHOTOS) {
    reqs.push({ tag: p.tag, label: p.label, required: true });
  }

  if (job.tier === "refresh" || job.tier === "showroom") {
    for (const p of INTERIOR_WIDE_PHOTOS) {
      reqs.push({ tag: p.tag, label: p.label, required: true });
    }
  }

  if (job.tier === "showroom") {
    for (const p of PANEL_MACRO_PHOTOS) {
      reqs.push({ tag: p.tag, label: p.label, required: true });
    }
    if (needsEngineBayPhoto(job.tier, job.pre_sold_addons)) {
      reqs.push({
        tag: "engine_bay_wide",
        label: "Engine bay (wide)",
        required: true,
      });
    }
  }

  if (intake) {
    for (const tag of intake.damage_tags) {
      const photoTag = `damage_${tag}`;
      reqs.push({
        tag: photoTag,
        label: `Damage: ${tag.replace(/_/g, " ")}`,
        required: true,
      });
    }

    const severityFlags: string[] = [];
    if (intake.pet_hair_severity >= 2) severityFlags.push("pet_hair_severe");
    if (intake.pet_hair_severity === 1) severityFlags.push("pet_hair_light");
    if (intake.odor_severity >= 2) severityFlags.push(`odor_${intake.odor_severity}`);

    for (const flag of severityFlags) {
      const photoTag = `flag_${flag}`;
      reqs.push({
        tag: photoTag,
        label: `Condition: ${flag.replace(/_/g, " ")}`,
        required: true,
      });
    }
  }

  return reqs;
}

export function getMissingPhotos(
  requirements: PhotoRequirement[],
  uploadedTags: string[],
): PhotoRequirement[] {
  const have = new Set(uploadedTags);
  return requirements.filter((r) => r.required && !have.has(r.tag));
}

export function validateIntakeFields(
  job: Pick<JobRecord, "tier" | "intake" | "customer_concern">,
): IntakeFieldError[] {
  const errors: IntakeFieldError[] = [];
  const intake = job.intake;

  if (!intake) {
    errors.push({ field: "intake", message: "Intake data missing" });
    return errors;
  }

  if (!intake.customer_concern?.trim() && !job.customer_concern?.trim()) {
    errors.push({
      field: "customer_concern",
      message: "Customer concern is required",
    });
  }

  if (!intake.personal_items_ack) {
    errors.push({
      field: "personal_items_ack",
      message: "Confirm personal items / valuables acknowledgment",
    });
  }

  if (!intake.liability_scope_ack) {
    errors.push({
      field: "liability_scope_ack",
      message: "Confirm service scope / liability acknowledgment",
    });
  }

  if (
    intake.booking_upholstery !== intake.confirmed_upholstery &&
    !intake.upholstery_override_reason?.trim()
  ) {
    errors.push({
      field: "upholstery_override_reason",
      message: "Reason required when changing upholstery type from booking",
    });
  }

  if (
    intake.confirmed_upholstery === "mixed" &&
    intake.material_zones.length === 0
  ) {
    errors.push({
      field: "material_zones",
      message: "Add at least one zone for mixed upholstery",
    });
  }

  if (needsExpectationAck(job.tier, intake.primary_goal) && !intake.expectation_ack) {
    errors.push({
      field: "expectation_ack",
      message: "Customer expectation acknowledgment required for this goal on Maintenance",
    });
  }

  if (intake.unsafe_environment && !intake.unsafe_environment_note?.trim()) {
    errors.push({
      field: "unsafe_environment_note",
      message: "Describe the unsafe environment",
    });
  }

  return errors;
}

export function isIntakeComplete(
  job: JobRecord,
  uploadedPhotoTags: string[],
): { complete: boolean; errors: IntakeFieldError[]; missingPhotos: PhotoRequirement[] } {
  const fieldErrors = validateIntakeFields(job);
  const photoReqs = getRequiredPhotoRequirements(job);
  const missingPhotos = getMissingPhotos(photoReqs, uploadedPhotoTags);

  if (!job.intake?.completed_at) {
    fieldErrors.push({
      field: "completed_at",
      message: "Intake not finalized",
    });
  }

  return {
    complete:
      fieldErrors.length === 0 &&
      missingPhotos.length === 0 &&
      Boolean(job.intake?.completed_at),
    errors: fieldErrors,
    missingPhotos,
  };
}

export function canUnlockWheels(job: JobRecord): boolean {
  return (
    job.status === "intake_complete" ||
    job.status === "active" ||
    job.status === "awaiting_approval"
  );
}
