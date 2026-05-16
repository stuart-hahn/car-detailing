import type { AppSettings, CustomerRecord, JobRecord } from "../db";

export const EXPORT_VERSION = 1 as const;
export const EXPORT_APP_ID = "detailing-sop";

export interface ExportPhotoEntry {
  id: string;
  job_id: string;
  tag: string;
  created_at: string;
  byte_size: number;
  /** Base64 JPEG when embedded in JSON export */
  data_base64?: string;
  /** Relative path inside a ZIP archive */
  file_path?: string;
}

export interface ExportBundle {
  export_version: typeof EXPORT_VERSION;
  exported_at: string;
  app: typeof EXPORT_APP_ID;
  settings: AppSettings[];
  customers: CustomerRecord[];
  jobs: JobRecord[];
  photos: ExportPhotoEntry[];
}

export interface ImportResult {
  ok: true;
  jobs: number;
  photos: number;
  customers: number;
  settings: number;
}

export interface ImportError {
  ok: false;
  error: string;
}

export type ImportOutcome = ImportResult | ImportError;
