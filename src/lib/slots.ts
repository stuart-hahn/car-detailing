import type { SlotId } from "./types";

/** Canonical slot order — authoritative for generator sort (PHASE1_SPEC §3). */
export const SLOT_ORDER: SlotId[] = [
  "intake",
  "wheels",
  "engine",
  "wash",
  "decon",
  "dry",
  "interior_dry",
  "interior_wet",
  "interior_refine",
  "glass",
  "exterior_protection",
  "finalization",
  "qc",
  "delivery",
];

export function slotIndex(slot: SlotId): number {
  const idx = SLOT_ORDER.indexOf(slot);
  return idx === -1 ? 999 : idx;
}
