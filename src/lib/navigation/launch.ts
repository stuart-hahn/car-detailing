import type { JobRecord } from "../db";
import { canReopenJob } from "../jobs/reopen";
import { isInFlightJob } from "./jobPhase";

export function sortJobsNewestFirst(jobs: JobRecord[]): JobRecord[] {
  return [...jobs].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function findResumableJob(jobs: JobRecord[]): JobRecord | null {
  const inFlight = sortJobsNewestFirst(jobs).filter(isInFlightJob);
  return inFlight[0] ?? null;
}

export function findReopenCandidate(jobs: JobRecord[]): JobRecord | null {
  const reopenable = sortJobsNewestFirst(jobs).filter(
    (j) => j.status === "completed" && canReopenJob(j),
  );
  return reopenable[0] ?? null;
}
