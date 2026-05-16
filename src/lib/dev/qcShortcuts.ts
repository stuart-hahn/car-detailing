import type { JobRecord, QcState } from "../db";
import { db } from "../db";
import { fillRequiredPhotos } from "./fillPhotos";
import master from "../../data/master_steps.json";
import type { MasterStepsFile } from "../types";

const masterFile = master as MasterStepsFile;

function markQcStep(
  steps: JobRecord["generated_steps"],
  templateId: "qc_work" | "qc_delivery",
  completed: boolean,
): JobRecord["generated_steps"] {
  const at = new Date().toISOString();
  return steps.map((s) => {
    if (s.template_id !== templateId) return s;
    return {
      ...s,
      status: completed ? "completed" : "pending",
      completed_at: completed ? at : null,
    };
  });
}

/** Pass work QC, fill final photos, confirm, and skip fresh-eyes pause. */
export async function advanceQcPastFreshEyes(
  job: JobRecord,
): Promise<JobRecord> {
  const now = new Date().toISOString();
  await fillRequiredPhotos(job, masterFile);

  const qc: QcState = {
    ...(job.qc ?? { attempts: [] }),
    attempts: [
      ...(job.qc?.attempts ?? []),
      {
        at: now,
        kind: "work_complete",
        passed: true,
      },
    ],
    work_complete_passed_at: job.qc?.work_complete_passed_at ?? now,
    final_photos_complete_at: now,
    fresh_eyes_skipped_at: now,
    fresh_eyes_skip_reason: "Development shortcut",
    abbreviated_work_qc: false,
    fail_codes: undefined,
  };

  const updated: JobRecord = {
    ...job,
    generated_steps: markQcStep(job.generated_steps, "qc_work", true),
    phase: "qc_work",
    qc,
    audit_log: [
      ...job.audit_log,
      { at: now, action: "dev_qc_advance_past_fresh_eyes" },
    ],
  };
  await db.jobs.put(updated);
  return updated;
}

/** Skip only the fresh-eyes timer (job must already have final photos confirmed). */
export async function skipFreshEyesPause(job: JobRecord): Promise<JobRecord> {
  const now = new Date().toISOString();
  const updated: JobRecord = {
    ...job,
    qc: {
      ...(job.qc ?? { attempts: [] }),
      fresh_eyes_skipped_at: now,
      fresh_eyes_skip_reason: "Development shortcut",
    },
    audit_log: [
      ...job.audit_log,
      { at: now, action: "dev_fresh_eyes_skipped" },
    ],
  };
  await db.jobs.put(updated);
  return updated;
}
