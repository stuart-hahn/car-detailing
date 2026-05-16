import { db, type JobPhotoBlob } from "../db";
import { base64ToBlob, photoZipPath, validateExportBundle } from "./bundle";
import type { ExportBundle, ImportOutcome } from "./types";

export function resolvePhotoBlob(
  entry: ExportBundle["photos"][number],
  zipFiles?: Map<string, Uint8Array>,
): Blob | null {
  if (entry.data_base64) {
    return base64ToBlob(entry.data_base64);
  }
  const path = entry.file_path ?? photoZipPath(entry.id);
  const bytes = zipFiles?.get(path);
  if (!bytes) return null;
  return new Blob([bytes], { type: "image/jpeg" });
}

export async function applyImportBundle(
  bundle: ExportBundle,
  zipFiles?: Map<string, Uint8Array>,
): Promise<ImportOutcome> {
  const missingPhotos: string[] = [];

  await db.transaction(
    "rw",
    [db.settings, db.customers, db.jobs, db.photos],
    async () => {
      for (const settings of bundle.settings) {
        await db.settings.put(settings);
      }
      for (const customer of bundle.customers) {
        await db.customers.put(customer);
      }
      for (const job of bundle.jobs) {
        await db.jobs.put(job);
      }
      for (const entry of bundle.photos) {
        const blob = resolvePhotoBlob(entry, zipFiles);
        if (!blob) {
          if (entry.data_base64 || entry.file_path) {
            missingPhotos.push(entry.id);
          }
          continue;
        }
        const record: JobPhotoBlob = {
          id: entry.id,
          job_id: entry.job_id,
          tag: entry.tag,
          created_at: entry.created_at,
          byte_size: entry.byte_size || blob.size,
          blob,
        };
        await db.photos.put(record);
      }
    },
  );

  if (missingPhotos.length > 0 && bundle.photos.length > 0) {
    return {
      ok: false,
      error: `Import incomplete: ${missingPhotos.length} photo(s) missing from archive`,
    };
  }

  return {
    ok: true,
    jobs: bundle.jobs.length,
    photos: bundle.photos.length - missingPhotos.length,
    customers: bundle.customers.length,
    settings: bundle.settings.length,
  };
}

export async function importBundle(
  bundle: unknown,
  zipFiles?: Map<string, Uint8Array>,
): Promise<ImportOutcome> {
  const validated = validateExportBundle(bundle);
  if (!validated) {
    return { ok: false, error: "Unrecognized export file (export_version must be 1)" };
  }
  return applyImportBundle(validated, zipFiles);
}
