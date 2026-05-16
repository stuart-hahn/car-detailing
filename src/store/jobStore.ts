import { create } from "zustand";
import { ulid } from "ulid";
import master from "../data/master_steps.json";
import { generateChecklist } from "../lib/generator";
import { deriveGeneratorFlags, hasHardBlockFlag } from "../lib/intake/flags";
import { evaluateIntakeGate } from "../lib/intake/gates";
import {
  areDependenciesMet,
  getStepTemplate,
} from "../lib/checklist/dependencies";
import { evaluateUndoPolicy } from "../lib/checklist/undo";
import {
  deleteJobPhoto,
  hasJobPhoto,
  listJobPhotoTags,
  stepPhotoTag,
} from "../lib/photos/storage";
import type {
  JobInput,
  JobIntake,
  MasterStepsFile,
  TierId,
  UpholsteryType,
} from "../lib/types";
import { db, type JobRecord, type ReferOutRecord } from "../lib/db";

const masterFile = master as MasterStepsFile;

export type Screen =
  | "home"
  | "new_job"
  | "intake"
  | "refer_out"
  | "checklist"
  | "qc"
  | "delivery"
  | "history";

function defaultPrimaryGoal(tier: TierId): JobIntake["primary_goal"] {
  if (tier === "maintenance") return "maintenance";
  return "feels_new_again";
}

function defaultIntake(
  upholstery: UpholsteryType,
  tier: TierId,
): JobIntake {
  return {
    booking_upholstery: upholstery,
    confirmed_upholstery: upholstery,
    material_tags: [],
    material_zones: [],
    damage_tags: [],
    odor_severity: 0,
    pet_hair_severity: 0,
    condition_flag_ids: [],
    primary_goal: defaultPrimaryGoal(tier),
    customer_concern: "",
    personal_items_ack: false,
    liability_scope_ack: false,
    expectation_ack: false,
    unsafe_environment: false,
  };
}

interface JobStore {
  screen: Screen;
  activeJobId: string | null;
  activeJob: JobRecord | null;
  intakePhotoTags: string[];
  loading: boolean;
  setScreen: (screen: Screen) => void;
  loadJob: (id: string) => Promise<void>;
  refreshPhotoTags: () => Promise<void>;
  createJob: (input: {
    tier: TierId;
    upholstery_type: UpholsteryType;
    pre_sold_addons: string[];
    customer_name: string;
    customer_phone: string;
    vehicle_ymmt: string;
    license_plate: string;
    service_address: string;
    vin?: string;
  }) => Promise<string>;
  updateIntake: (patch: Partial<JobIntake> & { vin?: string }) => Promise<void>;
  regenerateChecklist: (input?: Partial<JobInput>) => Promise<void>;
  completeIntake: () => Promise<
    | { ok: true }
    | { ok: false; errors: string[] }
    | { ok: false; blocked: true; reason: string }
  >;
  saveReferOut: (data: ReferOutRecord) => Promise<void>;
  startWork: () => Promise<void>;
  completeStep: (instanceId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  undoStep: (
    instanceId: string,
    reason?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export const useJobStore = create<JobStore>((set, get) => ({
  screen: "home",
  activeJobId: null,
  activeJob: null,
  intakePhotoTags: [],
  loading: false,

  setScreen: (screen) => set({ screen }),

  refreshPhotoTags: async () => {
    const id = get().activeJobId;
    if (!id) return;
    const tags = await listJobPhotoTags(id);
    set({ intakePhotoTags: tags });
  },

  loadJob: async (id) => {
    set({ loading: true });
    const job = await db.jobs.get(id);
    const tags = job ? await listJobPhotoTags(id) : [];
    let screen = get().screen;
    if (job) {
      if (job.status === "blocked_refer_out" || job.status === "declined") {
        screen = "refer_out";
      } else if (
        job.status === "draft" ||
        (job.phase === "intake" && !job.intake?.completed_at)
      ) {
        screen = "intake";
      }
    }
    set({
      activeJobId: id,
      activeJob: job ?? null,
      intakePhotoTags: tags,
      loading: false,
      screen,
    });
  },

  createJob: async (input) => {
    const settings = await db.settings.get("default");
    const upholstery = input.upholstery_type;
    const intake = defaultIntake(upholstery, input.tier);
    const flags: string[] = [];

    const jobInput: JobInput = {
      tier: input.tier,
      upholstery_type: upholstery,
      flags,
      pre_sold_addons: input.pre_sold_addons,
      approvals: [],
      sop_version: masterFile.version,
    };
    const generated = generateChecklist(jobInput, { master: masterFile });
    const id = ulid();
    const job: JobRecord = {
      id,
      sop_version: masterFile.version,
      status: "draft",
      phase: "intake",
      tier: input.tier,
      upholstery_type: upholstery,
      pre_sold_addons: input.pre_sold_addons,
      flags,
      approvals: [],
      generated_steps: generated.generated_steps,
      warn_banners: generated.warn_banners,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      vehicle_ymmt: input.vehicle_ymmt,
      license_plate: input.license_plate,
      vin: input.vin,
      service_address: input.service_address,
      technician: settings?.owner_name ?? "Technician",
      customer_concern: "",
      intake,
      created_at: new Date().toISOString(),
      audit_log: [{ at: new Date().toISOString(), action: "job_created" }],
    };
    await db.jobs.put(job);
    set({
      activeJobId: id,
      activeJob: job,
      intakePhotoTags: [],
      screen: "intake",
    });
    return id;
  },

  updateIntake: async (patch) => {
    const job = get().activeJob;
    if (!job?.intake) return;

    const intake: JobIntake = { ...job.intake, ...patch };
    const flags = deriveGeneratorFlags(intake);

    const updated: JobRecord = {
      ...job,
      intake,
      vin: patch.vin ?? job.vin,
      upholstery_type: intake.confirmed_upholstery,
      customer_concern: intake.customer_concern,
      primary_goal: intake.primary_goal,
      flags,
    };

    await db.jobs.put(updated);
    set({ activeJob: updated });
  },

  regenerateChecklist: async (partial) => {
    const job = get().activeJob;
    if (!job) return;

    const intake = job.intake;
    const flags =
      partial?.flags ??
      deriveGeneratorFlags(
        intake ?? defaultIntake(job.upholstery_type, job.tier),
      );

    const jobInput: JobInput = {
      tier: job.tier,
      upholstery_type: partial?.upholstery_type ?? job.upholstery_type,
      flags,
      pre_sold_addons: partial?.pre_sold_addons ?? job.pre_sold_addons,
      approvals: partial?.approvals ?? job.approvals,
      sop_version: job.sop_version,
      material_zones: partial?.material_zones ?? intake?.material_zones,
    };

    const generated = generateChecklist(jobInput, { master: masterFile });
    const updated: JobRecord = {
      ...job,
      flags,
      upholstery_type: jobInput.upholstery_type,
      generated_steps: generated.generated_steps,
      warn_banners: generated.warn_banners,
    };

    if (hasHardBlockFlag(flags)) {
      updated.status = "blocked_refer_out";
    }

    await db.jobs.put(updated);
    set({ activeJob: updated });
  },

  completeIntake: async () => {
    const job = get().activeJob;
    if (!job?.intake) return { ok: false, errors: ["No active job"] };

    const photoTags = await listJobPhotoTags(job.id);
    set({ intakePhotoTags: photoTags });

    const flags = deriveGeneratorFlags(job.intake);
    const jobForEval: JobRecord = {
      ...job,
      flags,
      customer_concern: job.intake.customer_concern,
    };

    const gate = evaluateIntakeGate(jobForEval, photoTags);

    if (gate.blocked) {
      const updated: JobRecord = {
        ...job,
        flags,
        status:
          gate.blockReason === "unsafe_environment"
            ? "blocked_unsafe"
            : "blocked_refer_out",
        phase: "intake",
        audit_log: [
          ...job.audit_log,
          {
            at: new Date().toISOString(),
            action: "intake_blocked",
            detail: gate.blockReason,
          },
        ],
      };
      await db.jobs.put(updated);
      await get().regenerateChecklist({ flags });
      set({ activeJob: updated, screen: "refer_out" });
      return { ok: false, blocked: true, reason: gate.blockReason ?? "blocked" };
    }

    if (!gate.canComplete) {
      const errors = [
        ...gate.fieldErrors.map((e) => e.message),
        ...gate.missingPhotos.map((p) => `Photo required: ${p.label}`),
      ];
      return { ok: false, errors };
    }

    const completedIntake: JobIntake = {
      ...job.intake,
      completed_at: new Date().toISOString(),
    };

    const updated: JobRecord = {
      ...job,
      intake: completedIntake,
      flags,
      status: "intake_complete",
      phase: "checklist",
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "intake_completed" },
      ],
    };

    set({ activeJob: updated });
    await db.jobs.put(updated);
    await get().regenerateChecklist({ flags });
    const fresh = await db.jobs.get(job.id);
    set({ activeJob: fresh ?? updated, screen: "checklist" });
    return { ok: true };
  },

  saveReferOut: async (data) => {
    const job = get().activeJob;
    if (!job) return;

    const updated: JobRecord = {
      ...job,
      refer_out: {
        ...data,
        acknowledged_at: data.customer_acknowledged
          ? new Date().toISOString()
          : undefined,
      },
      status: "declined",
      phase: "closed",
      audit_log: [
        ...job.audit_log,
        {
          at: new Date().toISOString(),
          action: "refer_out_closed",
          detail: job.flags.join(","),
        },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated, screen: "history" });
  },

  startWork: async () => {
    const job = get().activeJob;
    if (!job || !job.intake?.completed_at) return;

    const updated: JobRecord = {
      ...job,
      status: "active",
      phase: "checklist",
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "work_started" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
  },

  completeStep: async (instanceId) => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };
    if (job.status !== "active" && job.status !== "awaiting_approval") {
      return { ok: false, error: "Start work before completing steps" };
    }

    const stepIndex = job.generated_steps.findIndex(
      (s) => s.instance_id === instanceId,
    );
    if (stepIndex === -1) return { ok: false, error: "Step not found" };

    const step = job.generated_steps[stepIndex]!;
    if (step.status === "locked") {
      return { ok: false, error: "Step is locked" };
    }
    if (step.status === "completed") {
      return { ok: false, error: "Step already completed" };
    }

    if (!areDependenciesMet(step, job.generated_steps, masterFile)) {
      return { ok: false, error: "Complete prerequisite steps first" };
    }

    const template = getStepTemplate(masterFile, step.template_id);
    if (template?.photo_required) {
      const hasPhoto = await hasJobPhoto(job.id, stepPhotoTag(instanceId));
      if (!hasPhoto) {
        return { ok: false, error: "Photo required before completing this step" };
      }
    }

    const updatedSteps = [...job.generated_steps];
    updatedSteps[stepIndex] = {
      ...step,
      status: "completed",
      completed_at: new Date().toISOString(),
      photo_taken: template?.photo_required ?? step.photo_taken,
    };

    const updated: JobRecord = {
      ...job,
      generated_steps: updatedSteps,
      audit_log: [
        ...job.audit_log,
        {
          at: new Date().toISOString(),
          action: "step_completed",
          detail: step.template_id,
        },
      ],
    };

    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  undoStep: async (instanceId, reason) => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };

    const stepIndex = job.generated_steps.findIndex(
      (s) => s.instance_id === instanceId,
    );
    if (stepIndex === -1) return { ok: false, error: "Step not found" };

    const step = job.generated_steps[stepIndex]!;
    const policy = evaluateUndoPolicy(job, step);
    if (!policy.allowed) {
      return { ok: false, error: policy.blockMessage ?? "Undo not allowed" };
    }
    if (policy.needsReason && !reason?.trim()) {
      return { ok: false, error: "Reason required for undo" };
    }

    await deleteJobPhoto(job.id, stepPhotoTag(instanceId));

    const updatedSteps = [...job.generated_steps];
    updatedSteps[stepIndex] = {
      ...step,
      status: "pending",
      completed_at: null,
      photo_taken: false,
      tech_note: reason?.trim() ?? step.tech_note,
    };

    const updated: JobRecord = {
      ...job,
      generated_steps: updatedSteps,
      audit_log: [
        ...job.audit_log,
        {
          at: new Date().toISOString(),
          action: "step_undone",
          detail: `${step.template_id}${reason ? `: ${reason}` : ""}`,
        },
      ],
    };

    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },
}));
