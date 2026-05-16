import { create } from "zustand";
import { ulid } from "ulid";
import master from "../data/master_steps.json";
import {
  approvalEvidencePhotoTag,
  buildApprovalRecord,
  cancelDeclinedApprovalSteps,
  getPendingApprovals,
  refreshWarnBanners,
  requiresEvidencePhoto,
  resolveJobStatusAfterApproval,
} from "../lib/approvals";
import { appendApprovedSteps, generateChecklist } from "../lib/generator";
import { deriveGeneratorFlags, hasHardBlockFlag } from "../lib/intake/flags";
import { evaluateIntakeGate } from "../lib/intake/gates";
import {
  areDependenciesMet,
  getStepTemplate,
} from "../lib/checklist/dependencies";
import { evaluateUndoPolicy } from "../lib/checklist/undo";
import { isWorkChecklistComplete } from "../lib/qc/flow";
import { getFreshEyesProgress } from "../lib/qc/freshEyes";
import { evaluateFinalPhotoGate } from "../lib/qc/requirements";
import { applyQcRework } from "../lib/qc/rework";
import { careSheetFromJob } from "../lib/careSheet/generate";
import { shouldShowBackupPrompt } from "../lib/backup/prompt";
import {
  deleteJobPhoto,
  hasJobPhoto,
  listJobPhotoTags,
  stepPhotoTag,
} from "../lib/photos/storage";
import type { NewJobFormValues } from "../lib/dev/demoJob";
import type {
  JobInput,
  JobIntake,
  MasterStepsFile,
  TierId,
  UpholsteryType,
} from "../lib/types";
import {
  db,
  getOrCreateSettings,
  type JobRecord,
  type QcAttempt,
  type QcState,
  type ReferOutRecord,
} from "../lib/db";

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
  backupPromptJobId: string | null;
  /** Bumped after dev clear so History remounts and reloads. */
  historyListKey: number;
  /** Dev: pending values for the New Job form (consumed on mount). */
  newJobPrefill: NewJobFormValues | null;
  setScreen: (screen: Screen) => void;
  prefillNewJobForm: (values: NewJobFormValues) => void;
  clearNewJobPrefill: () => void;
  /** Dev: reset UI state after clearing IndexedDB job data. */
  resetAfterHistoryClear: () => void;
  clearBackupPrompt: () => void;
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
  enterQc: () => Promise<{ ok: true } | { ok: false; error: string }>;
  submitWorkQc: (
    passed: boolean,
    failCodes?: string[],
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  confirmFinalPhotos: () => Promise<{ ok: true } | { ok: false; error: string }>;
  startFreshEyes: () => Promise<{ ok: true } | { ok: false; error: string }>;
  skipFreshEyes: (
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  completeFreshEyes: () => Promise<{ ok: true } | { ok: false; error: string }>;
  startDeliveryQc: () => Promise<{ ok: true } | { ok: false; error: string }>;
  completeDeliveryQc: () => Promise<{ ok: true } | { ok: false; error: string }>;
  grantApproval: (input: {
    key: string;
    scope_note: string;
    price_dollars: number;
    customer_attested: boolean;
    tech_attested: boolean;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  declineApproval: (input: {
    key: string;
    reason?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function workStartedStatuses(status: JobRecord["status"]): boolean {
  return status === "active" || status === "awaiting_approval";
}

function withApprovalStatus(job: JobRecord): JobRecord {
  const workStarted = workStartedStatuses(job.status);
  const status = resolveJobStatusAfterApproval(job, workStarted);
  if (status === job.status) return job;
  return { ...job, status };
}

function emptyQcState(): QcState {
  return { attempts: [] };
}

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

export const useJobStore = create<JobStore>((set, get) => ({
  screen: "home",
  activeJobId: null,
  activeJob: null,
  intakePhotoTags: [],
  loading: false,
  backupPromptJobId: null,
  historyListKey: 0,
  newJobPrefill: null,

  setScreen: (screen) => set({ screen }),

  prefillNewJobForm: (values) =>
    set({
      newJobPrefill: values,
      screen: "new_job",
      activeJobId: null,
      activeJob: null,
    }),

  clearNewJobPrefill: () => set({ newJobPrefill: null }),

  resetAfterHistoryClear: () =>
    set((state) => ({
      activeJobId: null,
      activeJob: null,
      intakePhotoTags: [],
      backupPromptJobId: null,
      newJobPrefill: null,
      historyListKey: state.historyListKey + 1,
      screen: "history",
    })),

  clearBackupPrompt: () => set({ backupPromptJobId: null }),

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
      } else if (job.phase === "qc_work" || job.phase === "qc_delivery") {
        screen = "qc";
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

    let updated: JobRecord = {
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
    const synced = withApprovalStatus(fresh ?? updated);
    await db.jobs.put(synced);
    set({ activeJob: synced, screen: "checklist" });
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
    set({ activeJob: withApprovalStatus(updated) });
  },

  grantApproval: async ({
    key,
    scope_note,
    price_dollars,
    customer_attested,
    tech_attested,
  }) => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };

    const pending = getPendingApprovals(job);
    const item = pending.find((p) => p.key === key);
    if (!item) return { ok: false, error: "No pending approval for this item" };
    if (!scope_note.trim()) {
      return { ok: false, error: "Scope note required" };
    }
    if (!customer_attested || !tech_attested) {
      return { ok: false, error: "Customer and technician attestation required" };
    }
    if (Number.isNaN(price_dollars) || price_dollars < 0) {
      return { ok: false, error: "Enter a valid price" };
    }
    if (requiresEvidencePhoto(item, price_dollars)) {
      const hasPhoto = await hasJobPhoto(
        job.id,
        approvalEvidencePhotoTag(key),
      );
      if (!hasPhoto) {
        return { ok: false, error: "Evidence photo required for this approval" };
      }
    }

    const at = new Date().toISOString();
    const newApprovals = [
      ...new Set([...job.approvals, ...item.approvalKeys]),
    ];
    const steps = appendApprovedSteps(
      job.generated_steps,
      item.templateIds,
      masterFile,
      new Set(job.pre_sold_addons),
      new Set(newApprovals),
    );
    const record = buildApprovalRecord(
      item,
      scope_note,
      price_dollars,
      at,
    );
    const nextJob: JobRecord = {
      ...job,
      approvals: newApprovals,
      approval_records: [...(job.approval_records ?? []), record],
      generated_steps: steps,
      warn_banners: refreshWarnBanners({
        ...job,
        approvals: newApprovals,
      }),
      audit_log: [
        ...job.audit_log,
        {
          at,
          action: "approval_granted",
          detail: `${item.key}:${price_dollars}`,
        },
      ],
    };
    const updated = withApprovalStatus(nextJob);
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  declineApproval: async ({ key, reason }) => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };

    const pending = getPendingApprovals(job);
    const item = pending.find((p) => p.key === key);
    if (!item) return { ok: false, error: "No pending approval for this item" };

    const at = new Date().toISOString();
    const steps = cancelDeclinedApprovalSteps(
      job.generated_steps,
      item.templateIds,
    );
    const declined_approvals = [
      ...new Set([...(job.declined_approvals ?? []), item.key]),
    ];
    const nextJob: JobRecord = {
      ...job,
      generated_steps: steps,
      declined_approvals,
      warn_banners: refreshWarnBanners({
        ...job,
        declined_approvals,
      }),
      audit_log: [
        ...job.audit_log,
        {
          at,
          action: "approval_declined",
          detail: `${item.key}${reason ? `: ${reason.trim()}` : ""}`,
        },
      ],
    };
    const updated = withApprovalStatus(nextJob);
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
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

  enterQc: async () => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };
    if (!isWorkChecklistComplete(job.generated_steps)) {
      return { ok: false, error: "Complete all work steps before QC" };
    }

    const updated: JobRecord = {
      ...job,
      phase: "qc_work",
      qc: job.qc ?? emptyQcState(),
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "qc_entered" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated, screen: "qc" });
    return { ok: true };
  },

  submitWorkQc: async (passed, failCodes = []) => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };

    const abbreviated = Boolean(job.qc?.abbreviated_work_qc);
    const attempt: QcAttempt = {
      at: new Date().toISOString(),
      kind: "work_complete",
      passed,
      fail_codes: passed ? undefined : failCodes,
      abbreviated,
    };

    if (!passed) {
      if (!failCodes.length) {
        return { ok: false, error: "Select at least one issue" };
      }
      let steps = applyQcRework(job.generated_steps, failCodes);
      steps = markQcStep(steps, "qc_work", false);
      const qc: QcState = {
        ...(job.qc ?? emptyQcState()),
        attempts: [...(job.qc?.attempts ?? []), attempt],
        fail_codes: failCodes,
        abbreviated_work_qc: true,
        work_complete_passed_at: undefined,
        final_photos_complete_at: undefined,
        fresh_eyes_started_at: undefined,
        fresh_eyes_complete_at: undefined,
        fresh_eyes_skipped_at: undefined,
        fresh_eyes_skip_reason: undefined,
      };
      const updated: JobRecord = {
        ...job,
        generated_steps: steps,
        qc,
        phase: "checklist",
        status: "active",
        audit_log: [
          ...job.audit_log,
          {
            at: new Date().toISOString(),
            action: "qc_work_failed",
            detail: failCodes.join(","),
          },
        ],
      };
      await db.jobs.put(updated);
      set({ activeJob: updated, screen: "checklist" });
      return { ok: true };
    }

    const steps = markQcStep(job.generated_steps, "qc_work", true);
    const qc: QcState = {
      ...(job.qc ?? emptyQcState()),
      attempts: [...(job.qc?.attempts ?? []), attempt],
      work_complete_passed_at: new Date().toISOString(),
      abbreviated_work_qc: false,
      fail_codes: undefined,
    };
    const updated: JobRecord = {
      ...job,
      generated_steps: steps,
      qc,
      phase: "qc_work",
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "qc_work_passed" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  confirmFinalPhotos: async () => {
    const job = get().activeJob;
    if (!job?.qc?.work_complete_passed_at) {
      return { ok: false, error: "Pass work-complete QC first" };
    }

    const tags = await listJobPhotoTags(job.id);
    const gate = evaluateFinalPhotoGate(tags, job.tier);
    if (!gate.met) {
      const parts = [
        `Need ${gate.required} final photos (have ${gate.have})`,
        gate.missingOdometer ? "odometer photo required" : null,
      ].filter(Boolean);
      return { ok: false, error: parts.join("; ") };
    }

    const qc: QcState = {
      ...(job.qc ?? emptyQcState()),
      final_photos_complete_at: new Date().toISOString(),
    };
    const updated: JobRecord = {
      ...job,
      qc,
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "qc_final_photos_confirmed" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  startFreshEyes: async () => {
    const job = get().activeJob;
    if (!job?.qc?.final_photos_complete_at) {
      return { ok: false, error: "Confirm final photos first" };
    }
    if (job.qc.fresh_eyes_started_at) return { ok: true };

    const qc: QcState = {
      ...job.qc,
      fresh_eyes_started_at: new Date().toISOString(),
    };
    const updated: JobRecord = {
      ...job,
      qc,
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "fresh_eyes_started" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  skipFreshEyes: async (reason) => {
    const job = get().activeJob;
    if (!job?.qc?.final_photos_complete_at) {
      return { ok: false, error: "Confirm final photos first" };
    }
    if (!reason.trim()) {
      return { ok: false, error: "Reason required to skip fresh-eyes pause" };
    }

    const qc: QcState = {
      ...job.qc!,
      fresh_eyes_skipped_at: new Date().toISOString(),
      fresh_eyes_skip_reason: reason.trim(),
    };
    const updated: JobRecord = {
      ...job,
      qc,
      audit_log: [
        ...job.audit_log,
        {
          at: new Date().toISOString(),
          action: "fresh_eyes_skipped",
          detail: reason.trim(),
        },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  completeFreshEyes: async () => {
    const job = get().activeJob;
    if (!job?.qc?.fresh_eyes_started_at) {
      return { ok: false, error: "Start the fresh-eyes pause first" };
    }

    const progress = getFreshEyesProgress(job.qc.fresh_eyes_started_at);
    if (!progress.canStartDelivery) {
      return {
        ok: false,
        error: "Delivery QC unlocks after 2 minutes",
      };
    }

    const qc: QcState = {
      ...job.qc,
      fresh_eyes_complete_at: new Date().toISOString(),
    };
    const updated: JobRecord = {
      ...job,
      qc,
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "fresh_eyes_complete" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  startDeliveryQc: async () => {
    const job = get().activeJob;
    if (!job?.qc) return { ok: false, error: "QC not started" };

    const freshDone =
      job.qc.fresh_eyes_complete_at || job.qc.fresh_eyes_skipped_at;
    if (!freshDone) {
      return { ok: false, error: "Complete or skip fresh-eyes pause first" };
    }

    const updated: JobRecord = {
      ...job,
      phase: "qc_delivery",
      audit_log: [
        ...job.audit_log,
        { at: new Date().toISOString(), action: "qc_delivery_started" },
      ],
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
    return { ok: true };
  },

  completeDeliveryQc: async () => {
    const job = get().activeJob;
    if (!job) return { ok: false, error: "No active job" };
    if (job.phase !== "qc_delivery") {
      return { ok: false, error: "Start delivery QC first" };
    }

    const attempt: QcAttempt = {
      at: new Date().toISOString(),
      kind: "delivery",
      passed: true,
    };
    const steps = markQcStep(job.generated_steps, "qc_delivery", true);
    const qc: QcState = {
      ...(job.qc ?? emptyQcState()),
      attempts: [...(job.qc?.attempts ?? []), attempt],
      delivery_passed_at: new Date().toISOString(),
    };
    const now = new Date().toISOString();
    const settings = await getOrCreateSettings();
    const care_sheet_content = careSheetFromJob(job, settings);
    const updated: JobRecord = {
      ...job,
      generated_steps: steps,
      qc,
      status: "completed",
      phase: "closed",
      completed_at: now,
      care_sheet_content,
      care_sheet_generated_at: now,
      audit_log: [
        ...job.audit_log,
        { at: now, action: "job_completed" },
        { at: now, action: "care_sheet_generated" },
      ],
    };
    await db.jobs.put(updated);
    set({
      activeJob: updated,
      backupPromptJobId: shouldShowBackupPrompt(job.id) ? job.id : null,
    });
    return { ok: true };
  },
}));
