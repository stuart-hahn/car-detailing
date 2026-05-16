import { db } from "../db";
import { logDevToolStart } from "./log";

export interface ClearHistoryResult {
  jobs: number;
  photos: number;
  customers: number;
}

/** Wipe all jobs, photos, and customers. Settings are preserved. */
export async function clearAllJobHistory(): Promise<ClearHistoryResult> {
  logDevToolStart("clearAllJobHistory");

  const [jobs, photos, customers] = await db.transaction(
    "rw",
    [db.jobs, db.photos, db.customers],
    async () => {
      const jobCount = await db.jobs.count();
      const photoCount = await db.photos.count();
      const customerCount = await db.customers.count();
      await db.photos.clear();
      await db.jobs.clear();
      await db.customers.clear();
      return [jobCount, photoCount, customerCount] as const;
    },
  );

  return { jobs, photos, customers };
}
