import { useEffect, useState, type FormEvent } from "react";
import { ChecklistScreen } from "./components/ChecklistScreen";
import { IntakeScreen } from "./components/IntakeScreen";
import { QcScreen } from "./components/QcScreen";
import { ReferOutScreen } from "./components/ReferOutScreen";
import { BackupPanel } from "./components/BackupPanel";
import { BackupPrompt } from "./components/BackupPrompt";
import { shouldShowBackupPrompt } from "./lib/backup/prompt";
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

      <main className="mx-auto max-w-lg px-4 py-6">
        {screen === "home" && <HomeScreen onNavigate={setScreen} />}
        {screen === "new_job" && <NewJobScreen onCreate={createJob} />}
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
  const [tier, setTier] = useState<TierId>("refresh");
  const [upholstery, setUpholstery] = useState<UpholsteryType>("cloth");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    await onCreate({
      tier,
      upholstery_type: upholstery,
      pre_sold_addons: fd.getAll("addons") as string[],
      customer_name: String(fd.get("customer_name") ?? ""),
      customer_phone: String(fd.get("customer_phone") ?? ""),
      vehicle_ymmt: String(fd.get("vehicle_ymmt") ?? ""),
      license_plate: String(fd.get("license_plate") ?? ""),
      service_address: String(fd.get("service_address") ?? ""),
      vin: String(fd.get("vin") ?? "") || undefined,
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">Package</legend>
        <div className="grid gap-2">
          {TIERS.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                tier === t.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-800"
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={t.id}
                checked={tier === t.id}
                onChange={() => setTier(t.id)}
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
          value={upholstery}
          onChange={(e) => setUpholstery(e.target.value as UpholsteryType)}
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
          <input type="checkbox" name="addons" value="addon_clay" />
          Clay + iron
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="addons" value="addon_engine_bay" />
          Engine bay
        </label>
      </fieldset>

      {[
        ["customer_name", "Customer name"],
        ["customer_phone", "Phone"],
        ["vehicle_ymmt", "Year / make / model"],
        ["license_plate", "License plate"],
        ["service_address", "Service address"],
        ["vin", "VIN (optional)"],
      ].map(([name, label]) => (
        <label key={name} className="block space-y-1">
          <span className="text-sm text-slate-400">{label}</span>
          <input
            name={name}
            required={name !== "vin"}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
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
