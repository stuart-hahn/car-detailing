import { ulid } from "ulid";
import { db, type JobPhotoBlob } from "../db";
import {
  getJobPhotoBytes,
  HARD_CAP_BYTES,
} from "../photos/storage";
import { createPlaceholderBlob } from "./placeholder";

/** Save a dev placeholder directly to Dexie (skips File → bitmap compress). */
export async function saveDevPlaceholderPhoto(
  jobId: string,
  tag: string,
): Promise<{ id: string; error?: string }> {
  const total = await getJobPhotoBytes(jobId);
  if (total >= HARD_CAP_BYTES) {
    return {
      id: "",
      error: "Job photo limit reached (80MB). Export and archive this job.",
    };
  }

  const blob = await createPlaceholderBlob();
  const existing = await db.photos.where({ job_id: jobId, tag }).first();

  const record: JobPhotoBlob = {
    id: existing?.id ?? ulid(),
    job_id: jobId,
    tag,
    created_at: new Date().toISOString(),
    byte_size: blob.size,
    blob,
  };

  await db.photos.put(record);
  return { id: record.id };
}
