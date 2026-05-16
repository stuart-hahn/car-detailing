import Dexie, { type EntityTable } from "dexie";
import type { JobPhase, JobStatus, StepInstance, TierId, UpholsteryType } from "./types";

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
  generated_steps: StepInstance[];
  warn_banners: unknown[];
  customer_id?: string;
  vehicle_id?: string;
  customer_name: string;
  customer_phone: string;
  vehicle_ymmt: string;
  license_plate: string;
  service_address: string;
  technician: string;
  assistant_tech?: string;
  primary_goal?: string;
  created_at: string;
  completed_at?: string;
  reopened_at?: string;
  audit_log: { at: string; action: string; detail?: string }[];
}

const db = new Dexie("DetailingSOP") as Dexie & {
  settings: EntityTable<AppSettings, "id">;
  customers: EntityTable<CustomerRecord, "id">;
  jobs: EntityTable<JobRecord, "id">;
};

db.version(1).stores({
  settings: "id",
  customers: "id, name, phone",
  jobs: "id, status, tier, created_at, customer_id",
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
