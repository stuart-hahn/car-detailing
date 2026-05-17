import { useMemo, useState } from "react";
import { ChecklistScreen } from "../ChecklistScreen";
import { DeliveryScreen } from "../DeliveryScreen";
import { IntakeScreen } from "../IntakeScreen";
import { QcScreen } from "../QcScreen";
import { ReferOutScreen } from "../ReferOutScreen";
import { evaluateIntakeGate } from "../../lib/intake/gates";
import { hasHardBlockFlag } from "../../lib/intake/flags";
import { canReopenJob } from "../../lib/jobs/reopen";
import type { JobRecord } from "../../lib/db";
import { useJobStore } from "../../store/jobStore";
import { useUiStore } from "../../store/uiStore";
import { MacroStepper, type IntakeStepperTone } from "./MacroStepper";
import { StaleDraftBanner } from "./StaleDraftBanner";

interface ActiveJobViewProps {
  showNewJob: boolean;
  newJobForm: React.ReactNode;
  activeHub: React.ReactNode;
}

export function ActiveJobView({
  showNewJob,
  newJobForm,
  activeHub,
}: ActiveJobViewProps) {
  const {
    activeJob,
    jobPhaseScreen,
    intakePhotoTags,
    setJobPhaseScreen,
    discardDraftJob,
  } = useJobStore();

  if (showNewJob) return <>{newJobForm}</>;

  if (!activeJob) return <>{activeHub}</>;

  const showStepper = jobPhaseScreen !== "refer_out";

  const intakeTone = useIntakeStepperTone(activeJob, intakePhotoTags);

  return (
    <div className="space-y-4">
      {activeJob && (
        <StaleDraftBanner
          job={activeJob}
          onResume={() => setJobPhaseScreen("intake")}
          onDiscard={() => void discardDraftJob(activeJob.id)}
        />
      )}

      {showStepper && (
        <MacroStepper job={activeJob} intakeTone={intakeTone} />
      )}

      <PhaseBody
        job={activeJob}
        phase={jobPhaseScreen}
        onGoIntake={() => setJobPhaseScreen("intake")}
        onGoChecklist={() => setJobPhaseScreen("checklist")}
        onGoQc={() => setJobPhaseScreen("qc")}
      />
    </div>
  );
}

function useIntakeStepperTone(
  job: JobRecord,
  photoTags: string[],
): IntakeStepperTone {
  return useMemo(() => {
    if (hasHardBlockFlag(job.flags)) return "error";
    const gate = evaluateIntakeGate(job, photoTags);
    if ((job.warn_banners?.length ?? 0) > 0) return "warn";
    if (!gate.canComplete && (gate.fieldErrors.length > 0 || gate.missingPhotos.length > 0)) {
      return "error";
    }
    return "default";
  }, [job, photoTags]);
}

function PhaseBody({
  job,
  phase,
  onGoIntake,
  onGoChecklist,
  onGoQc,
}: {
  job: JobRecord;
  phase: ReturnType<typeof useJobStore.getState>["jobPhaseScreen"];
  onGoIntake: () => void;
  onGoChecklist: () => void;
  onGoQc: () => void;
}) {
  if (phase === "refer_out") {
    return <ReferOutScreen job={job} />;
  }
  if (phase === "intake") {
    return <IntakeScreen job={job} />;
  }
  if (phase === "checklist") {
    return (
      <ChecklistScreen job={job} onGoIntake={onGoIntake} />
    );
  }
  if (phase === "qc") {
    return (
      <QcScreen job={job} onGoChecklist={onGoChecklist} />
    );
  }
  return (
    <DeliveryScreen
      job={job}
      onGoQc={onGoQc}
    />
  );
}

export function ActiveJobHub() {
  const { reopenCandidate, requestNewJob, loadJob } = useJobStore();
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);

  async function handleReopen() {
    if (!reopenCandidate) return;
    setReopening(true);
    setReopenError(null);
    await loadJob(reopenCandidate.id);
    const result = await useJobStore.getState().reopenJob(reopenReason);
    setReopening(false);
    if (!result.ok) {
      setReopenError(result.error ?? "Could not reopen");
      return;
    }
    useUiStore.getState().closeNewJob();
  }

  return (
    <section className="space-y-4">
      <p className="text-slate-400">
        Start a new job or pick up where you left off.
      </p>
      <button
        type="button"
        onClick={() => void requestNewJob()}
        className="w-full rounded-xl bg-sky-600 px-4 py-4 text-lg font-medium text-white"
      >
        New Job
      </button>

      {reopenCandidate && canReopenJob(reopenCandidate) && (
        <div className="rounded-xl border border-slate-700 p-4 space-y-3">
          <p className="font-medium">
            Reopen {reopenCandidate.customer_name}?
          </p>
          <p className="text-sm text-slate-400">
            Delivery QC was completed within the last 24 hours.
          </p>
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Reason</span>
            <input
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="Customer requested touch-up"
            />
          </label>
          {reopenError && (
            <p className="text-sm text-red-400">{reopenError}</p>
          )}
          <button
            type="button"
            disabled={!reopenReason.trim() || reopening}
            onClick={() => void handleReopen()}
            className="w-full min-h-11 rounded-xl border border-emerald-600/50 bg-emerald-500/10 py-2 text-sm font-medium text-emerald-300 disabled:opacity-50"
          >
            {reopening ? "Reopening…" : `Reopen ${reopenCandidate.customer_name}`}
          </button>
        </div>
      )}
    </section>
  );
}
