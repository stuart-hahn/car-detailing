import { describe, expect, it } from "vitest";
import {
  base64ToBlob,
  blobToBase64,
  buildExportBundle,
  photoZipPath,
  validateExportBundle,
} from "./bundle";
import { resolvePhotoBlob } from "./import";
import { EXPORT_APP_ID, EXPORT_VERSION } from "./types";
import type { JobRecord } from "../db";

const sampleJob: JobRecord = {
  id: "01JOB",
  sop_version: "2026.05.0",
  status: "completed",
  phase: "closed",
  tier: "refresh",
  upholstery_type: "cloth",
  pre_sold_addons: [],
  flags: [],
  approvals: [],
  generated_steps: [],
  warn_banners: [],
  customer_name: "Test",
  customer_phone: "555",
  vehicle_ymmt: "2020 Test",
  license_plate: "ABC",
  service_address: "1 Main",
  technician: "Tech",
  customer_concern: "",
  created_at: "2026-05-16T12:00:00.000Z",
  audit_log: [],
};

describe("validateExportBundle", () => {
  it("accepts version 1 bundle", () => {
    const bundle = {
      export_version: EXPORT_VERSION,
      exported_at: "2026-05-16T12:00:00.000Z",
      app: EXPORT_APP_ID,
      settings: [],
      customers: [],
      jobs: [sampleJob],
      photos: [],
    };
    expect(validateExportBundle(bundle)).toEqual(bundle);
  });

  it("rejects wrong version", () => {
    expect(
      validateExportBundle({
        export_version: 2,
        app: EXPORT_APP_ID,
        exported_at: "x",
        jobs: [],
        photos: [],
        settings: [],
        customers: [],
      }),
    ).toBeNull();
  });
});

describe("buildExportBundle", () => {
  it("embeds base64 photos in json mode", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
    const { bundle } = await buildExportBundle({
      jobs: [sampleJob],
      customers: [],
      settings: [],
      photos: [
        {
          id: "01PHOTO",
          job_id: "01JOB",
          tag: "corner_fl",
          created_at: "2026-05-16T12:00:00.000Z",
          byte_size: 3,
          blob,
        },
      ],
      includePhotos: true,
      photoMode: "json",
    });
    expect(bundle.photos[0]?.data_base64).toBeTruthy();
    expect(bundle.photos[0]?.file_path).toBeUndefined();
  });

  it("uses zip paths in zip mode", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
    const { bundle, photoBytes } = await buildExportBundle({
      jobs: [sampleJob],
      customers: [],
      settings: [],
      photos: [
        {
          id: "01PHOTO",
          job_id: "01JOB",
          tag: "corner_fl",
          created_at: "2026-05-16T12:00:00.000Z",
          byte_size: 3,
          blob,
        },
      ],
      includePhotos: true,
      photoMode: "zip",
    });
    expect(bundle.photos[0]?.file_path).toBe(photoZipPath("01PHOTO"));
    expect(photoBytes.get("01PHOTO")).toBeInstanceOf(Uint8Array);
  });
});

describe("resolvePhotoBlob", () => {
  it("round-trips base64", async () => {
    const original = new Blob([new Uint8Array([9, 8, 7])], { type: "image/jpeg" });
    const b64 = await blobToBase64(original);
    const restored = resolvePhotoBlob({
      id: "p1",
      job_id: "j1",
      tag: "t",
      created_at: "x",
      byte_size: 3,
      data_base64: b64,
    });
    expect(restored).not.toBeNull();
    expect(restored!.size).toBe(base64ToBlob(b64).size);
  });
});
