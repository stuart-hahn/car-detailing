import type { JobRecord } from "../db";
import { listJobPhotoTags, saveJobPhoto } from "../photos/storage";
import type { MasterStepsFile } from "../types";
import { collectRequiredPhotoTags } from "./photoTags";
import { createPlaceholderImageFile } from "./placeholder";

export interface FillPhotosResult {
  filled: number;
  skipped: number;
  total: number;
}

export async function fillRequiredPhotos(
  job: JobRecord,
  master: MasterStepsFile,
): Promise<FillPhotosResult> {
  const required = collectRequiredPhotoTags(job, master);
  const existing = new Set(await listJobPhotoTags(job.id));
  const file = createPlaceholderImageFile();
  let filled = 0;
  let skipped = 0;

  for (const tag of required) {
    if (existing.has(tag)) {
      skipped++;
      continue;
    }
    const result = await saveJobPhoto(job.id, tag, file);
    if (!result.error) filled++;
  }

  return { filled, skipped, total: required.length };
}
