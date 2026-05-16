import type { MaterialTag, PrimaryGoalId, TierId, UpholsteryType } from "../types";

export const CONDITION_FLAGS = [
  { id: "sap", label: "Tree sap / resin" },
  { id: "overspray", label: "Overspray / paint mist" },
  { id: "excessive_soiling", label: "Excessive soiling" },
  { id: "mold", label: "Mold (refer out)", block: true },
  { id: "biohazard", label: "Biohazard (refer out)", block: true },
] as const;

export const PRIMARY_GOALS: { id: PrimaryGoalId; label: string }[] = [
  { id: "maintenance", label: "Routine maintenance" },
  { id: "feels_new_again", label: "Feels new again" },
  { id: "stain_removal", label: "Stain removal" },
  { id: "odor_removal", label: "Odor removal" },
  { id: "gloss_improvement", label: "Gloss / swirl improvement" },
  { id: "scratch_removal", label: "Scratch removal" },
  { id: "sale_prep", label: "Sale prep" },
  { id: "general_cleaning", label: "General cleaning" },
];

export const MAINTENANCE_EXPECTATION_GOALS: PrimaryGoalId[] = [
  "gloss_improvement",
  "stain_removal",
  "odor_removal",
  "scratch_removal",
];

export const DAMAGE_TAG_OPTIONS = [
  "scratch",
  "dent",
  "chip",
  "crack_glass",
  "stain",
  "burn",
  "tear",
  "fade",
  "other",
] as const;

export const MATERIAL_TAG_OPTIONS: MaterialTag[] = [
  "cloth",
  "coated_leather",
  "vinyl",
  "alcantara",
  "suede",
  "perforated",
];

export const MIXED_ZONE_PRESETS = [
  { zone: "front_seat_bottom", label: "Front seat bottom" },
  { zone: "front_seat_back", label: "Front seat back" },
  { zone: "rear_seat_bottom", label: "Rear seat bottom" },
  { zone: "rear_seat_back", label: "Rear seat back" },
  { zone: "door_panel", label: "Door panel" },
  { zone: "center_console", label: "Center console" },
] as const;

export const CORNER_PHOTOS = [
  { tag: "corner_fl", label: "Front left" },
  { tag: "corner_fr", label: "Front right" },
  { tag: "corner_rl", label: "Rear left" },
  { tag: "corner_rr", label: "Rear right" },
] as const;

export const INTERIOR_WIDE_PHOTOS = [
  { tag: "interior_wide_front", label: "Interior wide (front)" },
  { tag: "interior_wide_rear", label: "Interior wide (rear)" },
] as const;

export const PANEL_MACRO_PHOTOS = [
  { tag: "panel_hood", label: "Hood / front clip" },
  { tag: "panel_driver_door", label: "Driver door panel" },
  { tag: "panel_windshield", label: "Windshield / glass" },
  { tag: "panel_rear", label: "Rear clip" },
] as const;

export const UPHOLSTERY_OPTIONS: { id: UpholsteryType; label: string }[] = [
  { id: "cloth", label: "Cloth" },
  { id: "leather", label: "Leather" },
  { id: "mixed", label: "Mixed" },
  { id: "unknown", label: "Unknown" },
];

export const TIER_LIABILITY_NOTE: Record<TierId, string> = {
  maintenance:
    "No paint correction, coating, or defect removal is included in Maintenance Wash.",
  refresh: "Full Refresh restores appearance within package scope; correction is not included unless sold.",
  showroom:
    "Showroom Reset is the highest mobile package; rock chips and deep defects may remain unless noted.",
};
