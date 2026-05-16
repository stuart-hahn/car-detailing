import type { JobRecord } from "../db";
import { hasHardBlockFlag } from "./flags";
import {
  getMissingPhotos,
  getRequiredPhotoRequirements,
  validateIntakeFields,
  type IntakeFieldError,
  type PhotoRequirement,
} from "./requirements";

export interface IntakeGateResult {
  canComplete: boolean;
  canStartWork: boolean;
  fieldErrors: IntakeFieldError[];
  missingPhotos: PhotoRequirement[];
  blocked: boolean;
  blockReason?: "mold" | "biohazard" | "unsafe_environment";
}

export function evaluateIntakeGate(
  job: JobRecord,
  uploadedPhotoTags: string[],
): IntakeGateResult {
  const fieldErrors = validateIntakeFields(job);
  const photoReqs = getRequiredPhotoRequirements(job);
  const missingPhotos = getMissingPhotos(photoReqs, uploadedPhotoTags);

  const flags = job.flags ?? [];
  let blockReason: IntakeGateResult["blockReason"];

  if (job.intake?.unsafe_environment) {
    blockReason = "unsafe_environment";
  } else if (flags.includes("mold")) {
    blockReason = "mold";
  } else if (flags.includes("biohazard")) {
    blockReason = "biohazard";
  } else if (hasHardBlockFlag(flags)) {
    blockReason = "mold";
  }

  const canComplete =
    fieldErrors.length === 0 &&
    missingPhotos.length === 0 &&
    !blockReason;

  return {
    canComplete,
    canStartWork: Boolean(job.intake?.completed_at) && !blockReason,
    fieldErrors,
    missingPhotos,
    blocked: Boolean(blockReason),
    blockReason,
  };
}
