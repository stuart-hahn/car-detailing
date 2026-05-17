import type { JobRecord } from "../../lib/db";
import { FieldModePill } from "./FieldModePill";

interface AppHeaderProps {
  activeJob: JobRecord | null;
}

export function AppHeader({ activeJob }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Detailing SOP
          </p>
          <h1 className="truncate text-lg font-semibold">
            {activeJob ? activeJob.customer_name : "Active Job"}
          </h1>
          {activeJob && (
            <p className="truncate text-xs text-slate-500">
              {activeJob.vehicle_ymmt} · {activeJob.tier}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FieldModePill />
          <span className="hidden rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400 sm:inline">
            Offline
          </span>
        </div>
      </div>
    </header>
  );
}
