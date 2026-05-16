import { create } from "zustand";
import { ulid } from "ulid";
import master from "../data/master_steps.json";
import { generateChecklist } from "../lib/generator";
import type { JobInput, MasterStepsFile, TierId, UpholsteryType } from "../lib/types";
import { db, type JobRecord } from "../lib/db";

const masterFile = master as MasterStepsFile;

export type Screen =
  | "home"
  | "new_job"
  | "intake"
  | "checklist"
  | "qc"
  | "delivery"
  | "history";

interface JobStore {
  screen: Screen;
  activeJobId: string | null;
  activeJob: JobRecord | null;
  loading: boolean;
  setScreen: (screen: Screen) => void;
  loadJob: (id: string) => Promise<void>;
  createJob: (input: {
    tier: TierId;
    upholstery_type: UpholsteryType;
    pre_sold_addons: string[];
    customer_name: string;
    customer_phone: string;
    vehicle_ymmt: string;
    license_plate: string;
    service_address: string;
  }) => Promise<string>;
  regenerateChecklist: (input: Partial<JobInput>) => Promise<void>;
}

export const useJobStore = create<JobStore>((set, get) => ({
  screen: "home",
  activeJobId: null,
  activeJob: null,
  loading: false,

  setScreen: (screen) => set({ screen }),

  loadJob: async (id) => {
    set({ loading: true });
    const job = await db.jobs.get(id);
    set({ activeJobId: id, activeJob: job ?? null, loading: false });
  },

  createJob: async (input) => {
    const settings = await db.settings.get("default");
    const jobInput: JobInput = {
      tier: input.tier,
      upholstery_type: input.upholstery_type,
      flags: [],
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
      upholstery_type: input.upholstery_type,
      pre_sold_addons: input.pre_sold_addons,
      flags: [],
      approvals: [],
      generated_steps: generated.generated_steps,
      warn_banners: generated.warn_banners,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      vehicle_ymmt: input.vehicle_ymmt,
      license_plate: input.license_plate,
      service_address: input.service_address,
      technician: settings?.owner_name ?? "Technician",
      created_at: new Date().toISOString(),
      audit_log: [{ at: new Date().toISOString(), action: "job_created" }],
    };
    if (generated.blocked) {
      job.status = "blocked_refer_out";
    }
    await db.jobs.put(job);
    set({ activeJobId: id, activeJob: job, screen: "intake" });
    return id;
  },

  regenerateChecklist: async (partial) => {
    const job = get().activeJob;
    if (!job) return;
    const jobInput: JobInput = {
      tier: job.tier,
      upholstery_type: partial.upholstery_type ?? job.upholstery_type,
      flags: partial.flags ?? job.flags,
      pre_sold_addons: partial.pre_sold_addons ?? job.pre_sold_addons,
      approvals: partial.approvals ?? job.approvals,
      sop_version: job.sop_version,
      material_zones: partial.material_zones,
    };
    const generated = generateChecklist(jobInput, { master: masterFile });
    const updated: JobRecord = {
      ...job,
      ...partial,
      generated_steps: generated.generated_steps,
      warn_banners: generated.warn_banners,
      status: generated.blocked ? "blocked_refer_out" : job.status,
    };
    await db.jobs.put(updated);
    set({ activeJob: updated });
  },
}));
