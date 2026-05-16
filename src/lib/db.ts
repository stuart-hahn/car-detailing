import Dexie, { type EntityTable } from "dexie";
import type {
  JobIntake,
  JobPhase,
  JobStatus,
  PrimaryGoalId,
  StepInstance,
  TierId,
  UpholsteryType,
} from "./types";

export interface AppSettings {
  id: "default";
  business_name: string;
  owner_name: string;
  phone: string;
  referral_note?: string;
  helpers: string[];
  products: {
    exterior: string[];
    interior: string[];
    wheels: string[];
    engine: string[];
  };
  theme: "system" | "light" | "dark";
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  vehicles: {
    id: string;
    year: string;
    make: string;
    model: string;
    plate: string;
    upholstery_type: UpholsteryType;
  }[];
  visit_count?: number;
}

export interface JobPhotoBlob {
  id: string;
  job_id: string;
  tag: string;
  created_at: string;
  byte_size: number;
  blob: Blob;
}

export interface CustomerApprovalRecord {
  key: string;
  display_name: string;
  scope_note: string;
  price_dollars: number;
  labor_minutes: number;
  customer_attested_at: string;
  tech_attested_at: string;
  approved_at: string;
}

export interface ReferOutRecord {
  zones: string;
  internal_notes: string;
  customer_acknowledged: boolean;
  acknowledged_at?: string;
}

export interface QcAttempt {
  at: string;
  kind: "work_complete" | "delivery";
  passed: boolean;
  fail_codes?: string[];
  abbreviated?: boolean;
}

export interface QcState {
  work_complete_passed_at?: string;
  abbreviated_work_qc?: boolean;
  fail_codes?: string[];
  final_photos_complete_at?: string;
  fresh_eyes_started_at?: string;
  fresh_eyes_complete_at?: string;
  fresh_eyes_skipped_at?: string;
  fresh_eyes_skip_reason?: string;
  delivery_passed_at?: string;
  attempts: QcAttempt[];
}

export interface JobRecord {
  id: string;
  sop_version: string;
  status: JobStatus;
  phase: JobPhase;
  tier: TierId;
  upholstery_type: UpholsteryType;
  pre_sold_addons: string[];
  flags: string[];
  approvals: string[];
  declined_approvals?: string[];
  approval_records?: CustomerApprovalRecord[];
  generated_steps: StepInstance[];
  warn_banners: unknown[];
  customer_id?: string;
  vehicle_id?: string;
  customer_name: string;
  customer_phone: string;
  vehicle_ymmt: string;
  license_plate: string;
  vin?: string;
  service_address: string;
  technician: string;
  assistant_tech?: string;
  customer_concern: string;
  primary_goal?: PrimaryGoalId;
  intake?: JobIntake;
  refer_out?: ReferOutRecord;
  qc?: QcState;
  care_sheet_content?: string;
  care_sheet_generated_at?: string;
  created_at: string;
  completed_at?: string;
  reopened_at?: string;
  audit_log: { at: string; action: string; detail?: string }[];
}

const db = new Dexie("DetailingSOP") as Dexie & {
  settings: EntityTable<AppSettings, "id">;
  customers: EntityTable<CustomerRecord, "id">;
  jobs: EntityTable<JobRecord, "id">;
  photos: EntityTable<JobPhotoBlob, "id">;
};

db.version(1).stores({
  settings: "id",
  customers: "id, name, phone",
  jobs: "id, status, tier, created_at, customer_id",
});

db.version(2).stores({
  settings: "id",
  customers: "id, name, phone",
  jobs: "id, status, tier, created_at, customer_id",
  photos: "id, job_id, tag, [job_id+tag]",
});

export async function getOrCreateSettings(): Promise<AppSettings> {
  const existing = await db.settings.get("default");
  if (existing) return existing;
  const defaults: AppSettings = {
    id: "default",
    business_name: "Your Detailing Business",
    owner_name: "Technician",
    phone: "",
    helpers: [],
    products: {
      exterior: ["Synthetic sealant", "Iron remover", "Clay lubricant"],
      interior: ["Interior cleaner", "Fabric extractor", "Leather conditioner"],
      wheels: ["Wheel cleaner", "Wheel sealant"],
      engine: ["Engine degreaser"],
    },
    theme: "system",
  };
  await db.settings.put(defaults);
  return defaults;
}

export { db };
