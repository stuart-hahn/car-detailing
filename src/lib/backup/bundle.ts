import type { JobPhotoBlob } from "../db";
import type { AppSettings, CustomerRecord, JobRecord } from "../db";
import {
  EXPORT_APP_ID,
  EXPORT_VERSION,
  type ExportBundle,
  type ExportPhotoEntry,
} from "./types";

export function photoZipPath(photoId: string): string {
  return `photos/${photoId}.jpg`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, type = "image/jpeg"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export function photoToExportEntry(
  photo: JobPhotoBlob,
  mode: "json" | "zip",
  dataBase64?: string,
): ExportPhotoEntry {
  const entry: ExportPhotoEntry = {
    id: photo.id,
    job_id: photo.job_id,
    tag: photo.tag,
    created_at: photo.created_at,
    byte_size: photo.byte_size,
  };
  if (mode === "json" && dataBase64) {
    entry.data_base64 = dataBase64;
  }
  if (mode === "zip") {
    entry.file_path = photoZipPath(photo.id);
  }
  return entry;
}

export async function buildExportBundle(input: {
  jobs: JobRecord[];
  customers: CustomerRecord[];
  settings: AppSettings[];
  photos: JobPhotoBlob[];
  includePhotos: boolean;
  photoMode: "json" | "zip";
}): Promise<{ bundle: ExportBundle; photoBytes: Map<string, Uint8Array> }> {
  const photoBytes = new Map<string, Uint8Array>();
  const photos: ExportPhotoEntry[] = [];

  for (const photo of input.photos) {
    if (!input.includePhotos) {
      photos.push({
        id: photo.id,
        job_id: photo.job_id,
        tag: photo.tag,
        created_at: photo.created_at,
        byte_size: photo.byte_size,
      });
      continue;
    }
    const bytes = new Uint8Array(await photo.blob.arrayBuffer());
    if (input.photoMode === "zip") {
      photoBytes.set(photo.id, bytes);
      photos.push(photoToExportEntry(photo, "zip"));
    } else {
      const data_base64 = await blobToBase64(photo.blob);
      photos.push(photoToExportEntry(photo, "json", data_base64));
    }
  }

  const bundle: ExportBundle = {
    export_version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    app: EXPORT_APP_ID,
    settings: input.settings,
    customers: input.customers,
    jobs: input.jobs,
    photos,
  };

  return { bundle, photoBytes };
}

export function validateExportBundle(data: unknown): ExportBundle | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.export_version !== EXPORT_VERSION) return null;
  if (o.app !== EXPORT_APP_ID) return null;
  if (typeof o.exported_at !== "string") return null;
  if (!Array.isArray(o.jobs) || !Array.isArray(o.photos)) return null;
  if (!Array.isArray(o.settings) || !Array.isArray(o.customers)) return null;
  return data as ExportBundle;
}

export function exportFilename(
  kind: "job" | "all",
  jobId?: string,
  ext: "json" | "zip" = "json",
): string {
  const stamp = new Date().toISOString().slice(0, 10);
  if (kind === "job" && jobId) {
    return `detailing-job-${jobId.slice(0, 8)}-${stamp}.${ext}`;
  }
  return `detailing-export-${stamp}.${ext}`;
}
