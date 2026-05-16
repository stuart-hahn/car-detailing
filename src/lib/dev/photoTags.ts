import { getStepTemplate } from "../checklist/dependencies";
import type { JobRecord } from "../db";
import { getRequiredPhotoRequirements } from "../intake/requirements";
import { stepPhotoTag } from "../photos/storage";
import { getFinalPhotoRequirements } from "../qc/requirements";
import type { MasterStepsFile } from "../types";

/** All photo tags required for the current job state (intake, QC finals, step photos). */
export function collectRequiredPhotoTags(
  job: JobRecord,
  master: MasterStepsFile,
): string[] {
  const tags = new Set<string>();

  for (const req of getRequiredPhotoRequirements(job)) {
    tags.add(req.tag);
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
