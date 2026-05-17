import { describe, expect, it } from "vitest";
import type { JobRecord } from "../db";
import { findReopenCandidate, findResumableJob } from "./launch";

function job(
  id: string,
  status: JobRecord["status"],
  created_at: string,
  extra: Partial<JobRecord> = {},
): JobRecord {
  return {
    id,
    sop_version: "v",
    status,
    phase: "intake",
    tier: "refresh",
    upholstery_type: "cloth",
    pre_sold_addons: [],
    flags: [],
    approvals: [],
    generated_steps: [],
    warn_banners: [],
    customer_name: id,
    customer_phone: "",
    vehicle_ymmt: "",
    license_plate: "",
    service_address: "",
    technician: "",
    customer_concern: "",
    created_at,
    audit_log: [],
    ...extra,
  };
}

describe("launch", () => {
  it("picks newest in-flight job to resume", () => {
    const jobs = [
      job("old", "draft", "2020-01-01T00:00:00Z"),
      job("new", "active", "2026-01-02T00:00:00Z", { phase: "checklist" }),
    ];
    expect(findResumableJob(jobs)?.id).toBe("new");
  });

  it("does not resume completed jobs", () => {
    const jobs = [
      job("done", "completed", "2026-01-02T00:00:00Z", {
        completed_at: new Date().toISOString(),
        phase: "closed",
      }),
    ];
    expect(findResumableJob(jobs)).toBeNull();
  });

  it("finds reopen candidate within window", () => {
    const jobs = [
      job("done", "completed", "2026-01-02T00:00:00Z", {
        completed_at: new Date().toISOString(),
        phase: "closed",
      }),
    ];
    expect(findReopenCandidate(jobs)?.id).toBe("done");
  });
});
