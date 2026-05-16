import type { JobRecord } from "../db";
import { listJobPhotoTags } from "../photos/storage";
import type { MasterStepsFile } from "../types";
import { logDevToolError, logDevToolStart } from "./log";
import { collectRequiredPhotoTags } from "./photoTags";
import { saveDevPlaceholderPhoto } from "./savePlaceholderPhoto";

export interface FillPhotosResult {
  filled: number;
  skipped: number;
  failed: number;
  total: number;
  errors: { tag: string; message: string }[];
}

export async function fillRequiredPhotos(
  job: JobRecord,
  master: MasterStepsFile,
): Promise<FillPhotosResult> {
  const required = collectRequiredPhotoTags(job, master);
  const existing = new Set(await listJobPhotoTags(job.id));
  let filled = 0;
  let skipped = 0;
  const errors: FillPhotosResult["errors"] = [];

  logDevToolStart("fillRequiredPhotos", {
    jobId: job.id,
    tier: job.tier,
    tags: required.length,
  });

  for (const tag of required) {
    if (existing.has(tag)) {
      skipped++;
      continue;
    }
    try {
      const result = await saveDevPlaceholderPhoto(job.id, tag);
      if (result.error) {
        errors.push({ tag, message: result.error });
        logDevToolError("fillRequiredPhotos:tag", new Error(result.error), {
          jobId: job.id,
          tag,
        });
      } else {
        filled++;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown save error";
      errors.push({ tag, message });
      logDevToolError("fillRequiredPhotos:tag", error, { jobId: job.id, tag });
    }
  }

  if (errors.length > 0) {
    logDevToolError(
      "fillRequiredPhotos:summary",
      new Error(`${errors.length} photo(s) failed`),
      { jobId: job.id, errors },
    );
  }

  return {
    filled,
    skipped,
    failed: errors.length,
    total: required.length,
    errors,
  };
}
