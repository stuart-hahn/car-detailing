import { ulid } from "ulid";
import { db, type JobPhotoBlob } from "../db";

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;
const WARN_BYTES = 40 * 1024 * 1024;
const HARD_CAP_BYTES = 80 * 1024 * 1024;

export async function compressImageFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compress failed"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function getJobPhotoBytes(jobId: string): Promise<number> {
  const photos = await db.photos.where("job_id").equals(jobId).toArray();
  return photos.reduce((sum, p) => sum + p.byte_size, 0);
}

export async function saveJobPhoto(
  jobId: string,
  tag: string,
  file: File,
): Promise<{ id: string; warning?: string; error?: string }> {
  const total = await getJobPhotoBytes(jobId);
  if (total >= HARD_CAP_BYTES) {
    return {
      id: "",
      error: "Job photo limit reached (80MB). Export and archive this job.",
    };
  }

  const blob = await compressImageFile(file);
  const existing = await db.photos
    .where({ job_id: jobId, tag })
    .first();

  const record: JobPhotoBlob = {
    id: existing?.id ?? ulid(),
    job_id: jobId,
    tag,
    created_at: new Date().toISOString(),
    byte_size: blob.size,
    blob,
  };

  await db.photos.put(record);

  const newTotal = total - (existing?.byte_size ?? 0) + blob.size;
  return {
    id: record.id,
    warning:
      newTotal >= WARN_BYTES
        ? `Job photos ~${Math.round(newTotal / 1024 / 1024)}MB (warn at 40MB)`
        : undefined,
  };
}

export async function listJobPhotoTags(jobId: string): Promise<string[]> {
  const photos = await db.photos.where("job_id").equals(jobId).toArray();
  return photos.map((p) => p.tag);
}

export async function getJobPhotoUrl(
  jobId: string,
  tag: string,
): Promise<string | null> {
  const photo = await db.photos.where({ job_id: jobId, tag }).first();
  if (!photo) return null;
  return URL.createObjectURL(photo.blob);
}

export function revokePhotoUrl(url: string) {
  URL.revokeObjectURL(url);
}

export { WARN_BYTES, HARD_CAP_BYTES };
