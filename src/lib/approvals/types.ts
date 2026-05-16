export interface PendingApproval {
  /** Stable id for UI and photo tags (addon id or flag id). */
  key: string;
  kind: "addon" | "flag";
  flag: string;
  addonId: string | null;
  displayName: string;
  description: string;
  laborMinutes: number;
  templateIds: string[];
  /** Values written to `job.approvals` on grant. */
  approvalKeys: string[];
  blocking: boolean;
  lockedStepCount: number;
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
