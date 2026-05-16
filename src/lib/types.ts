export type TierId = "maintenance" | "refresh" | "showroom";

export type SlotId =
  | "intake"
  | "wheels"
  | "engine"
  | "wash"
  | "decon"
  | "dry"
  | "interior_dry"
  | "interior_wet"
  | "interior_refine"
  | "glass"
  | "exterior_protection"
  | "finalization"
  | "qc"
  | "delivery";

export type UpholsteryType = "cloth" | "leather" | "mixed" | "unknown";

export type MaterialTag =
  | "cloth"
  | "coated_leather"
  | "vinyl"
  | "alcantara"
  | "suede"
  | "perforated";

export type FlagBehavior =
  | "inject"
  | "upsell"
  | "warn"
  | "block"
  | "block_until_approval"
  | "upsell_ozone"
  | "hard_block";

export type JobStatus =
  | "draft"
  | "intake_complete"
  | "active"
  | "awaiting_approval"
  | "blocked_refer_out"
  | "blocked_unsafe"
  | "declined"
  | "completed"
  | "archived";

export type JobPhase =
  | "intake"
  | "checklist"
  | "qc_work"
  | "qc_delivery"
  | "closed";

export type StepInstanceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "locked"
  | "cancelled"
  | "needs_rework";

export interface TimeRange {
  min: number;
  max: number;
}

export interface MaterialZone {
  zone: string;
  material: MaterialTag;
}

export interface StepTemplate {
  id: string;
  slot: SlotId;
  category: string;
  name: string;
  instructions: string;
  tiers: TierId[];
  branches?: string[];
  dependencies?: string[];
  optional?: boolean;
  enabled: boolean;
  phase: number;
  estimated_minutes: TimeRange;
  photo_required?: boolean;
  qc_gate?: boolean;
  priority?: number;
  parallel_hints?: string[];
  injects_from_flags?: string[];
  injects_from_addons?: string[];
  mutually_exclusive_with?: string[];
  reserved?: boolean;
}

export interface MasterStepsFile {
  version: string;
  released_at: string;
  steps: StepTemplate[];
}

export interface AddonDefinition {
  id: string;
  display_name: string;
  group: string;
  enabled: boolean;
  available_on_tiers: TierId[];
  approval_required: boolean;
  injects_steps: string[];
  mutually_exclusive_with?: string[];
  intake_can_add?: boolean;
  reserved?: boolean;
}

export interface AddonsFile {
  addons: AddonDefinition[];
}

export interface FlagBehaviorEntry {
  maintenance: FlagBehavior;
  refresh: FlagBehavior;
  showroom: FlagBehavior;
  adds_time_min?: number;
  injects_steps?: string[];
}

export interface FlagBehaviorFile {
  flags: Record<string, FlagBehaviorEntry>;
}

export interface WarnBanner {
  flag: string;
  severity: "warn";
  message: string;
  display: ("intake_summary" | "checklist_header")[];
  dismissable: boolean;
}

export interface StepInstance {
  instance_id: string;
  template_id: string;
  slot: SlotId;
  status: StepInstanceStatus;
  zone?: string;
  material?: MaterialTag;
  completed_at: string | null;
  photo_taken: boolean;
  tech_note: string | null;
}

export interface JobInput {
  tier: TierId;
  upholstery_type: UpholsteryType;
  material_zones?: MaterialZone[];
  flags: string[];
  pre_sold_addons: string[];
  approvals: string[];
  sop_version: string;
}

export interface GenerateResult {
  generated_steps: StepInstance[];
  warn_banners: WarnBanner[];
  blocked: boolean;
  block_reason?: string;
}

export interface QcReworkMapping {
  fail_code: string;
  label: string;
  reopen_slots: SlotId[];
  reopen_templates?: string[];
}
