import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { DEMO_NEW_JOB, type NewJobFormValues } from "./lib/dev/demoJob";
import { BackupPanel } from "./components/BackupPanel";
import { BackupPrompt } from "./components/BackupPrompt";
import { shouldShowBackupPrompt } from "./lib/backup/prompt";
import {
  canReopenJob,
  formatReopenTimeLeft,
  isJobImmutable,
  msUntilReopenCloses,
} from "./lib/jobs/reopen";
import { isInFlightJob } from "./lib/navigation/jobPhase";
import { DevToolsPanel } from "./components/DevToolsPanel";
import { SettingsScreen } from "./components/SettingsScreen";
import { ActiveJobHub, ActiveJobView } from "./components/shell/ActiveJobView";
import { AppHeader } from "./components/shell/AppHeader";
import { BottomNav } from "./components/shell/BottomNav";
import { DiscardJobModal } from "./components/shell/DiscardJobModal";
import { db, type JobRecord } from "./lib/db";
import { useAppTheme } from "./hooks/useAppTheme";
import { isDraftOnly } from "./lib/navigation/jobPhase";
import { useJobStore } from "./store/jobStore";
import { useUiStore } from "./store/uiStore";
import type { TierId, UpholsteryType } from "./lib/types";

const TIERS: { id: TierId; label: string; default?: boolean }[] = [
  { id: "maintenance", label: "Maintenance Wash" },
  { id: "refresh", label: "Full Refresh", default: true },
  { id: "showroom", label: "Showroom Reset" },
];

export default function App() {
  const {
    activeJob,
    createJob,
    bootstrapLaunch,
    launchComplete,
    discardPrompt,
    confirmDiscard,
    cancelDiscard,
    historyListKey,
    requestSwitchJob,
  } = useJobStore();
  const { appTab, showNewJob } = useUiStore();
  const { ready } = useAppTheme();

  useEffect(() => {
    if (!ready) return;
    void bootstrapLaunch();
  }, [ready, bootstrapLaunch]);

  if (!ready || !launchComplete) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-100">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader activeJob={activeJob} />

      <main
        className={`mx-auto max-w-lg px-4 py-6 pb-24${import.meta.env.DEV ? " pb-36" : ""}`}
      >
        {appTab === "active" && (
          <ActiveJobView
            showNewJob={showNewJob}
            newJobForm={<NewJobScreen onCreate={createJob} />}
            activeHub={<ActiveJobHub />}
          />
        )}
        {appTab === "history" && (
          <HistoryScreen
            key={historyListKey}
            onOpen={(id) => void requestSwitchJob(id)}
          />
        )}
        {appTab === "settings" && <SettingsScreen />}
      </main>

      <BottomNav />

      {discardPrompt && (
        <DiscardJobModal
          customerName={discardPrompt.job.customer_name}
          needsReason={!isDraftOnly(discardPrompt.job)}
          onConfirm={(reason) => void confirmDiscard(reason)}
          onCancel={cancelDiscard}
        />
      )}

      {import.meta.env.DEV && <DevToolsPanel />}
    </div>
  );
}

const EMPTY_NEW_JOB: NewJobFormValues = {
  tier: "refresh",
  upholstery_type: "cloth",
  pre_sold_addons: [],
  customer_name: "",
  customer_phone: "",
  vehicle_ymmt: "",
  license_plate: "",
  service_address: "",
  vin: "",
};

function NewJobScreen({
  onCreate,
}: {
  onCreate: (input: {
    tier: TierId;
    upholstery_type: UpholsteryType;
    pre_sold_addons: string[];
    customer_name: string;
    customer_phone: string;
    vehicle_ymmt: string;
    license_plate: string;
    service_address: string;
    vin?: string;
  }) => Promise<string>;
}) {
  const { newJobPrefill, clearNewJobPrefill } = useJobStore();
  const { closeNewJob } = useUiStore();
  const [form, setForm] = useState<NewJobFormValues>(EMPTY_NEW_JOB);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!newJobPrefill) return;
    setForm(newJobPrefill);
    clearNewJobPrefill();
  }, [newJobPrefill, clearNewJobPrefill]);

  function applyDemoValues(values: NewJobFormValues = DEMO_NEW_JOB) {
    setForm(values);
  }

  function toggleAddon(addonId: string) {
    setForm((prev) => {
      const has = prev.pre_sold_addons.includes(addonId);
      return {
        ...prev,
        pre_sold_addons: has
          ? prev.pre_sold_addons.filter((id) => id !== addonId)
          : [...prev.pre_sold_addons, addonId],
      };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    await onCreate({
      ...form,
      vin: form.vin.trim() || undefined,
    });
    closeNewJob();
    setSubmitting(false);
  }

  const field = (key: keyof Omit<NewJobFormValues, "tier" | "upholstery_type" | "pre_sold_addons">) =>
    ({
      value: form[key],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    }) as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">New Job</h2>
        <button
          type="button"
          onClick={closeNewJob}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => applyDemoValues()}
          className="w-full rounded-lg border border-amber-700/50 bg-amber-950/50 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/40"
        >
          Fill demo values
        </button>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">Package</legend>
        <div className="grid gap-2">
          {TIERS.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                form.tier === t.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-800"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={t.id}
                checked={form.tier === t.id}
                onChange={() =>
                  setForm((prev) => ({ ...prev, tier: t.id }))
                }
              />
              <span>
                {t.label}
                {t.default && (
                  <span className="ml-2 text-xs text-amber-400">Default</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Upholstery (booking default)</span>
        <select
          value={form.upholstery_type}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              upholstery_type: e.target.value as UpholsteryType,
            }))
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="cloth">Cloth</option>
          <option value="leather">Leather</option>
          <option value="mixed">Mixed</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">
          Pre-sold add-ons
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.pre_sold_addons.includes("addon_clay")}
            onChange={() => toggleAddon("addon_clay")}
          />
          Clay + iron
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.pre_sold_addons.includes("addon_engine_bay")}
            onChange={() => toggleAddon("addon_engine_bay")}
          />
          Engine bay
        </label>
      </fieldset>

      {(
        [
          ["customer_name", "Customer name", true],
          ["customer_phone", "Phone", true],
          ["vehicle_ymmt", "Year / make / model", true],
          ["license_plate", "License plate", true],
          ["service_address", "Service address", true],
          ["vin", "VIN (optional)", false],
        ] as const
      ).map(([name, label, required]) => (
        <label key={name} className="block space-y-1">
          <span className="text-sm text-slate-400">{label}</span>
          <input
            name={name}
            required={required}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
            {...field(name)}
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create job → Intake"}
      </button>
    </form>
  );
}

function HistoryScreen({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const { backupPromptJobId, clearBackupPrompt } = useJobStore();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [viewJob, setViewJob] = useState<JobRecord | null>(null);

  const reload = () => {
    void db.jobs.orderBy("created_at").reverse().toArray().then(setJobs);
  };

  useEffect(() => {
    reload();
  }, []);

  const promptJob = jobs.find((j) => j.id === backupPromptJobId);

  function handleJobTap(job: JobRecord) {
    if (job.status === "completed" && isJobImmutable(job)) {
      setViewJob(viewJob?.id === job.id ? null : job);
      return;
    }
    if (isInFlightJob(job) || canReopenJob(job)) {
      void onOpen(job.id);
      setViewJob(null);
      return;
    }
    setViewJob(viewJob?.id === job.id ? null : job);
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">History</h2>
        <p className="mt-1 text-sm text-slate-400">
          Completed jobs are read-only after 24 hours. In-progress jobs open on Active Job.
        </p>
      </header>

      {promptJob && shouldShowBackupPrompt(promptJob.id) && (
        <BackupPrompt
          jobId={promptJob.id}
          customerName={promptJob.customer_name}
          onDismiss={clearBackupPrompt}
        />
      )}

      {!jobs.length ? (
        <p className="text-slate-400">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="space-y-2">
              <button
                type="button"
                onClick={() => handleJobTap(j)}
                className="w-full rounded-xl border border-slate-800 px-4 py-3 text-left hover:bg-slate-900"
              >
                <p className="font-medium">{j.customer_name}</p>
                <p className="text-xs text-slate-500">
                  {j.tier} · {j.status} ·{" "}
                  {new Date(j.created_at).toLocaleString()}
                </p>
                {j.status === "completed" && (
                  <p className="mt-1 text-xs text-slate-500">
                    {canReopenJob(j)
                      ? `Editable ${formatReopenTimeLeft(msUntilReopenCloses(j) ?? 0)}`
                      : isJobImmutable(j)
                        ? "Locked — tap for summary"
                        : null}
                  </p>
                )}
                {isInFlightJob(j) && (
                  <p className="mt-1 text-xs text-emerald-500/80">
                    In progress — tap to continue
                  </p>
                )}
              </button>
              {viewJob?.id === j.id && (
                <HistoryJobSummary job={j} />
              )}
              {j.status === "completed" && (
                <BackupPanel jobId={j.id} compact onExported={reload} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryJobSummary({ job }: { job: JobRecord }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
      <p>{job.vehicle_ymmt}</p>
      <p className="mt-1 text-slate-500">{job.service_address}</p>
      {job.care_sheet_content && (
        <p className="mt-2 text-xs text-slate-500">Care sheet saved on job</p>
      )}
    </div>
  );
}
