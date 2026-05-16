import { ulid } from "ulid";
import master from "../../data/master_steps.json";
import { generateChecklist } from "../generator";
import { db, type JobRecord, type QcState } from "../db";
import type { JobInput, MasterStepsFile } from "../types";
import {
  applyCompletedWorkSteps,
  completeAllWorkSteps,
} from "./completeWork";
import { fillRequiredPhotos } from "./fillPhotos";

const masterFile = master as MasterStepsFile;

export type SeedDemoTarget = "intake" | "checklist" | "qc";

export interface SeedDemoOptions {
  /** Where to land after seeding. Default `checklist`. */
  target?: SeedDemoTarget;
}

const DEMO = {
  customer_name: "Dev Test Customer",
  customer_phone: "555-0100",
  vehicle_ymmt: "2024 Test Sedan",
  license_plate: "DEV-001",
  service_address: "123 Dev Lane",
} as const;

function markQcStep(
  steps: JobRecord["generated_steps"],
  templateId: "qc_work" | "qc_delivery",
  completed: boolean,
): JobRecord["generated_steps"] {
  return steps.map((s) => {
    if (s.template_id !== templateId) return s;
    return {
      ...s,
      status: completed ? "completed" : "pending",
      completed_at: completed ? new Date().toISOString() : null,
    };
  });
}

export async function seedDemoMaintenanceJob(
  options: SeedDemoOptions = {},
): Promise<string> {
  const target = options.target ?? "checklist";
  const settings = await db.settings.get("default");
  const upholstery = "cloth" as const;
  const tier = "maintenance" as const;

  const jobInput: JobInput = {
    tier,
    upholstery_type: upholstery,
    flags: [],
    pre_sold_addons: [],
    approvals: [],
    sop_version: masterFile.version,
  };
  const generated = generateChecklist(jobInput, { master: masterFile });
  const id = ulid();
  const now = new Date().toISOString();

  let job: JobRecord = {
    id,
    sop_version: masterFile.version,
    status: "draft",
    phase: "intake",
    tier,
    upholstery_type: upholstery,
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: generated.generated_steps,
    warn_banners: generated.warn_banners,
    customer_name: DEMO.customer_name,
    customer_phone: DEMO.customer_phone,
    vehicle_ymmt: DEMO.vehicle_ymmt,
    license_plate: DEMO.license_plate,
    service_address: DEMO.service_address,
    technician: settings?.owner_name ?? "Technician",
    customer_concern: "Development test job — not a real vehicle.",
    intake: {
      booking_upholstery: upholstery,
      confirmed_upholstery: upholstery,
      material_tags: [],
      material_zones: [],
      damage_tags: [],
      odor_severity: 0,
      pet_hair_severity: 0,
      condition_flag_ids: [],
      primary_goal: "maintenance",
      customer_concern: "Development test job — not a real vehicle.",
      personal_items_ack: true,
      liability_scope_ack: true,
      expectation_ack: false,
      unsafe_environment: false,
    },
    created_at: now,
    audit_log: [{ at: now, action: "dev_job_seeded" }],
  };

  await db.jobs.put(job);
  await fillRequiredPhotos(job, masterFile);

  if (target === "intake") {
    return id;
  }

  job = {
    ...job,
    intake: { ...job.intake!, completed_at: now },
    status: "active",
    phase: "checklist",
    audit_log: [
      ...job.audit_log,
      { at: now, action: "intake_completed" },
      { at: now, action: "work_started" },
    ],
  };
  await db.jobs.put(job);

  if (target === "checklist") {
    return id;
  }

  await completeAllWorkSteps(job);
  const afterWork = (await db.jobs.get(id))!;
  const steps = markQcStep(afterWork.generated_steps, "qc_work", true);
  const qc: QcState = {
    attempts: [
      {
        at: now,
        kind: "work_complete",
        passed: true,
      },
    ],
    work_complete_passed_at: now,
    final_photos_complete_at: now,
    fresh_eyes_skipped_at: now,
    fresh_eyes_skip_reason: "Development shortcut",
  };

  job = {
    ...applyCompletedWorkSteps(afterWork, steps),
    generated_steps: steps,
    phase: "qc_work",
    qc,
    audit_log: [
      ...afterWork.audit_log,
      { at: now, action: "dev_seeded_to_qc" },
    ],
  };
  await db.jobs.put(job);
  await fillRequiredPhotos(job, masterFile);

  return id;
}
