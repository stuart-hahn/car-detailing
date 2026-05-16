import master from "../../data/master_steps.json";
import {
  areDependenciesMet,
  getStepTemplate,
} from "../checklist/dependencies";
import { db, type JobRecord } from "../db";
import {
  getActionableWorkSteps,
  getIncompleteActionableSteps,
} from "../qc/flow";
import { hasJobPhoto, saveJobPhoto, stepPhotoTag } from "../photos/storage";
import type { MasterStepsFile } from "../types";
import { fillRequiredPhotos } from "./fillPhotos";
import { createPlaceholderImageFile } from "./placeholder";

const masterFile = master as MasterStepsFile;

export interface CompleteWorkResult {
  completed: number;
  remaining: number;
}

async function completeStepsOnJob(job: JobRecord): Promise<{
  steps: JobRecord["generated_steps"];
  completed: number;
}> {
  await fillRequiredPhotos(job, masterFile);

  const steps = [...job.generated_steps];
  const file = createPlaceholderImageFile();
  let completed = 0;

  for (;;) {
    const pending = getIncompleteActionableSteps(steps);
    if (pending.length === 0) break;

    let progressed = false;
    for (const step of pending) {
      if (!areDependenciesMet(step, steps, masterFile)) continue;

      const template = getStepTemplate(masterFile, step.template_id);
      if (template?.photo_required) {
        const tag = stepPhotoTag(step.instance_id);
        if (!(await hasJobPhoto(job.id, tag))) {
          await saveJobPhoto(job.id, tag, file);
        }
      }

      const idx = steps.findIndex((s) => s.instance_id === step.instance_id);
      if (idx === -1) continue;

      steps[idx] = {
        ...steps[idx]!,
        status: "completed",
        completed_at: new Date().toISOString(),
        photo_taken: template?.photo_required ?? steps[idx]!.photo_taken,
      };
      completed++;
      progressed = true;
    }

    if (!progressed) break;
  }

  return { steps, completed };
}

/** Mark all actionable checklist steps complete (fills step photos as needed). */
export async function completeAllWorkSteps(
  job: JobRecord,
): Promise<CompleteWorkResult> {
  const { steps, completed } = await completeStepsOnJob(job);
  const updated = applyCompletedWorkSteps(job, steps);
  await db.jobs.put(updated);

  const remaining = getIncompleteActionableSteps(steps).length;
  return { completed, remaining };
}

export function applyCompletedWorkSteps(
  job: JobRecord,
  steps: JobRecord["generated_steps"],
): JobRecord {
  const now = new Date().toISOString();
  return {
    ...job,
    generated_steps: steps,
    status:
      job.status === "intake_complete" || job.status === "draft"
        ? "active"
        : job.status,
    phase: "checklist",
    audit_log: [
      ...job.audit_log,
      {
        at: now,
        action: "dev_complete_all_work",
        detail: String(getActionableWorkSteps(steps).filter((s) => s.status === "completed").length),
      },
    ],
  };
}
