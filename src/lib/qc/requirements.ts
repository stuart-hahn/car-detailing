import type { TierId } from "../types";

export const ODOMETER_PHOTO_TAG = "qc_odometer";
export const FINAL_PHOTO_PREFIX = "qc_final_";

export const FINAL_PHOTO_TARGETS: Record<TierId, number> = {
  maintenance: 4,
  refresh: 10,
  showroom: 20,
};

export interface QcPhotoRequirement {
  tag: string;
  label: string;
  required: boolean;
}

export function finalPhotoTag(index: number): string {
  return `${FINAL_PHOTO_PREFIX}${String(index).padStart(2, "0")}`;
}

export function getFinalPhotoRequirements(tier: TierId): QcPhotoRequirement[] {
  const count = FINAL_PHOTO_TARGETS[tier];
  const reqs: QcPhotoRequirement[] = [];
  for (let i = 1; i <= count; i++) {
    reqs.push({
      tag: finalPhotoTag(i),
      label: `Final photo ${i}`,
      required: true,
    });
  }
  reqs.push({
    tag: ODOMETER_PHOTO_TAG,
    label: "Odometer",
    required: true,
  });
  return reqs;
}

export function countFinalPhotos(tags: string[]): number {
  return tags.filter((t) => t.startsWith(FINAL_PHOTO_PREFIX)).length;
}

export function hasOdometerPhoto(tags: string[]): boolean {
  return tags.includes(ODOMETER_PHOTO_TAG);
}

export function evaluateFinalPhotoGate(
  tags: string[],
  tier: TierId,
): {
  met: boolean;
  required: number;
  have: number;
  missingOdometer: boolean;
} {
  const required = FINAL_PHOTO_TARGETS[tier];
  const have = countFinalPhotos(tags);
  const missingOdometer = !hasOdometerPhoto(tags);
  return {
    met: have >= required && !missingOdometer,
    required,
    have,
    missingOdometer,
  };
}
