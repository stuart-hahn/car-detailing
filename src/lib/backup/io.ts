import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { db } from "../db";
import {
  buildExportBundle,
  exportFilename,
  validateExportBundle,
} from "./bundle";
import { importBundle } from "./import";
import type { ExportBundle, ImportOutcome } from "./types";

const MANIFEST = "export.json";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadExportData(jobIds?: string[]) {
  const allJobs = await db.jobs.toArray();
  const jobs = jobIds?.length
    ? allJobs.filter((j) => jobIds.includes(j.id))
    : allJobs;

  const jobIdSet = new Set(jobs.map((j) => j.id));
  const photos = await db.photos
    .filter((p) => jobIdSet.has(p.job_id))
    .toArray();

  const customerIds = new Set(
    jobs.map((j) => j.customer_id).filter((id): id is string => Boolean(id)),
  );
  const customers = customerIds.size
    ? await db.customers
        .filter((c) => customerIds.has(c.id))
        .toArray()
    : await db.customers.toArray();

  const settings = await db.settings.toArray();
  return { jobs, photos, customers, settings };
}

export async function exportJobsJson(
  jobIds?: string[],
  includePhotos = false,
): Promise<void> {
  const { jobs, photos, customers, settings } = await loadExportData(jobIds);
  const { bundle } = await buildExportBundle({
    jobs,
    customers,
    settings,
    photos,
    includePhotos,
    photoMode: "json",
  });
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const name = exportFilename(jobIds?.length === 1 ? "job" : "all", jobIds?.[0], "json");
  downloadBlob(blob, name);
}

export async function exportJobsZip(jobIds?: string[]): Promise<void> {
  const { jobs, photos, customers, settings } = await loadExportData(jobIds);
  const { bundle, photoBytes } = await buildExportBundle({
    jobs,
    customers,
    settings,
    photos,
    includePhotos: true,
    photoMode: "zip",
  });

  const files: Record<string, Uint8Array> = {
    [MANIFEST]: strToU8(JSON.stringify(bundle, null, 2)),
  };
  for (const [id, bytes] of photoBytes) {
    files[`photos/${id}.jpg`] = bytes;
  }

  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped], { type: "application/zip" });
  const name = exportFilename(
    jobIds?.length === 1 ? "job" : "all",
    jobIds?.[0],
    "zip",
  );
  downloadBlob(blob, name);
}

function readZipManifest(data: Uint8Array): {
  bundle: ExportBundle;
  files: Map<string, Uint8Array>;
} | null {
  const unzipped = unzipSync(data);
  const manifestBytes = unzipped[MANIFEST];
  if (!manifestBytes) return null;

  const parsed = validateExportBundle(
    JSON.parse(strFromU8(manifestBytes)) as unknown,
  );
  if (!parsed) return null;

  const files = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(unzipped)) {
    if (path !== MANIFEST) files.set(path, bytes);
  }
  return { bundle: parsed, files };
}

export async function importFromFile(file: File): Promise<ImportOutcome> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".zip")) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const zip = readZipManifest(buffer);
    if (!zip) {
      return { ok: false, error: "Invalid ZIP backup (missing export.json)" };
    }
    return importBundle(zip.bundle, zip.files);
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "File is not valid JSON" };
  }
  return importBundle(parsed);
}
