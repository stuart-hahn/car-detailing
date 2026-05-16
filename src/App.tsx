import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { DEMO_NEW_JOB, type NewJobFormValues } from "./lib/dev/demoJob";
import { ChecklistScreen } from "./components/ChecklistScreen";
import { IntakeScreen } from "./components/IntakeScreen";
import { QcScreen } from "./components/QcScreen";
import { ReferOutScreen } from "./components/ReferOutScreen";
import { BackupPanel } from "./components/BackupPanel";
import { BackupPrompt } from "./components/BackupPrompt";
import { shouldShowBackupPrompt } from "./lib/backup/prompt";
import { DevToolsPanel } from "./components/DevToolsPanel";
import { getOrCreateSettings } from "./lib/db";
import { useJobStore, type Screen } from "./store/jobStore";
import type { TierId, UpholsteryType } from "./lib/types";

const TIERS: { id: TierId; label: string; default?: boolean }[] = [
  { id: "maintenance", label: "Maintenance Wash" },
  { id: "refresh", label: "Full Refresh", default: true },
  { id: "showroom", label: "Showroom Reset" },
];

const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "new_job", label: "New Job" },
  { id: "intake", label: "Intake" },
  { id: "checklist", label: "Checklist" },
  { id: "qc", label: "QC" },
  { id: "delivery", label: "Delivery" },
  { id: "history", label: "History" },
];

export default function App() {
  const {
    screen,
    setScreen,
    activeJob,
    createJob,
    loadJob,
  } = useJobStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getOrCreateSettings().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-100">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Detailing SOP
            </p>
            <h1 className="text-lg font-semibold">Phase 1</h1>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">
            Offline
          </span>
        </div>
        <nav className="mx-auto mt-3 flex max-w-lg gap-1 overflow-x-auto pb-1">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScreen(s.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                screen === s.id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main
        className={`mx-auto max-w-lg px-4 py-6${import.meta.env.DEV ? " pb-36" : ""}`}
      >
        {screen === "home" && <HomeScreen onNavigate={setScreen} />}
        {screen === "new_job" && (
          <NewJobScreen onCreate={createJob} />
        )}
        {screen === "intake" && activeJob && <IntakeScreen job={activeJob} />}
        {screen === "refer_out" && activeJob && (
          <ReferOutScreen job={activeJob} />
        )}
        {screen === "checklist" && (
          <ChecklistScreen
            job={activeJob}
            onGoIntake={() => setScreen("intake")}
          />
        )}
        {screen === "qc" && (
          <QcScreen
            job={activeJob}
            onGoChecklist={() => setScreen("checklist")}
          />
        )}
        {screen === "delivery" && (
          <PlaceholderScreen title="Delivery" job={activeJob} />
        )}
        {screen === "history" && <HistoryScreen onOpen={loadJob} />}
      </main>
      {import.meta.env.DEV && <DevToolsPanel />}
    </div>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <section className="space-y-4">
      <p className="text-slate-400">
        Offline-first checklist for solo mobile detailing. See{" "}
        <code className="text-slate-300">PHASE1_SPEC.md</code> for locked decisions.
      </p>
      <button
        type="button"
        onClick={() => onNavigate("new_job")}
        className="w-full rounded-xl bg-sky-600 px-4 py-4 text-lg font-medium text-white"
      >
        New Job
      </button>
      <button
        type="button"
        onClick={() => onNavigate("history")}
        className="w-full rounded-xl border border-slate-700 px-4 py-3 text-slate-200"
      >
        Job History
      </button>
    </section>
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


function PlaceholderScreen({
  title,
  job,
}: {
  title: string;
  job: ReturnType<typeof useJobStore.getState>["activeJob"];
}) {
  return (
    <p className="text-slate-400">
      {title} screen — {job ? `job ${job.id.slice(0, 8)}…` : "no active job"}.
      Scaffold placeholder.
    </p>
  );
}

function HistoryScreen({ onOpen }: { onOpen: (id: string) => Promise<void> }) {
  const { backupPromptJobId, clearBackupPrompt } = useJobStore();
  const [jobs, setJobs] = useState<
    {
      id: string;
      customer_name: string;
      tier: string;
      status: string;
      created_at: string;
    }[]
  >([]);

  const reload = () => {
    import("./lib/db").then(({ db }) => {
      db.jobs.orderBy("created_at").reverse().toArray().then(setJobs);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const promptJob = jobs.find((j) => j.id === backupPromptJobId);

  return (
    <section className="space-y-4">
      {promptJob && shouldShowBackupPrompt(promptJob.id) && (
        <BackupPrompt
          jobId={promptJob.id}
          customerName={promptJob.customer_name}
          onDismiss={clearBackupPrompt}
        />
      )}

      <BackupPanel onExported={reload} />

      {!jobs.length ? (
        <p className="text-slate-400">No jobs yet.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id} className="space-y-2">
              <button
                type="button"
                onClick={() => void onOpen(j.id)}
                className="w-full rounded-xl border border-slate-800 px-4 py-3 text-left hover:bg-slate-900"
              >
                <p className="font-medium">{j.customer_name}</p>
                <p className="text-xs text-slate-500">
                  {j.tier} · {j.status} ·{" "}
                  {new Date(j.created_at).toLocaleString()}
                </p>
              </button>
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
