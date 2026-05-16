import {
  approvalEvidencePhotoTag,
  getPendingApprovals,
} from "../approvals";
import { getStepTemplate } from "../checklist/dependencies";
import type { JobRecord } from "../db";
import { getRequiredPhotoRequirements } from "../intake/requirements";
import { stepPhotoTag } from "../photos/storage";
import { getFinalPhotoRequirements } from "../qc/requirements";
import type { MasterStepsFile } from "../types";

/** Intake close-ups for severity flags (mirrors `getRequiredPhotoRequirements`). */
const SEVERITY_FLAG_PHOTO_IDS = new Set(["odor_2", "odor_3", "pet_hair_severe"]);

/** All photo tags required for the current job state (intake, QC finals, step photos). */
export function collectRequiredPhotoTags(
  job: JobRecord,
  master: MasterStepsFile,
): string[] {
  const tags = new Set<string>();

  for (const req of getRequiredPhotoRequirements(job)) {
    tags.add(req.tag);
  }

  for (const flag of job.flags) {
    if (SEVERITY_FLAG_PHOTO_IDS.has(flag)) {
      tags.add(`flag_${flag}`);
    }
  }

  for (const pending of getPendingApprovals(job)) {
    tags.add(approvalEvidencePhotoTag(pending.key));
  }

  for (const req of getFinalPhotoRequirements(job.tier)) {
    tags.add(req.tag);
  }

  for (const step of job.generated_steps) {
    const template = getStepTemplate(master, step.template_id);
    if (template?.photo_required) {
      tags.add(stepPhotoTag(step.instance_id));
    }
  }

  return [...tags];
}
