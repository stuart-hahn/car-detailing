import type { JobRecord } from "../../lib/db";
import { resolveMacroStep, type MacroStepId } from "../../lib/navigation/jobPhase";

const STEPS: { id: MacroStepId; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "work", label: "Work" },
  { id: "qc", label: "QC" },
  { id: "delivery", label: "Delivery" },
];

export type IntakeStepperTone = "default" | "warn" | "error";

interface MacroStepperProps {
  job: JobRecord;
  intakeTone?: IntakeStepperTone;
}

export function MacroStepper({ job, intakeTone = "default" }: MacroStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === resolveMacroStep(job));

  return (
    <nav
      aria-label="Job progress"
      className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 px-2 py-2"
    >
      {STEPS.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        const tone = step.id === "intake" ? intakeTone : "default";

        let pillClass =
          "shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium ";
        if (tone === "warn") {
          pillClass += "bg-amber-500/20 text-amber-300";
        } else if (tone === "error") {
          pillClass += "bg-red-500/20 text-red-300";
        } else if (isCurrent) {
          pillClass += "bg-slate-700 text-white";
        } else if (isPast) {
          pillClass += "text-slate-400";
        } else {
          pillClass += "text-slate-600";
        }

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            <span className={pillClass} aria-current={isCurrent ? "step" : undefined}>
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-slate-700" aria-hidden />
            )}
          </div>
        );
      })}
    </nav>
  );
}
