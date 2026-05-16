import { useEffect, useMemo, useState } from "react";
import { PhotoCapture } from "./PhotoCapture";
import {
  CONDITION_FLAGS,
  DAMAGE_TAG_OPTIONS,
  MATERIAL_TAG_OPTIONS,
  MIXED_ZONE_PRESETS,
  PRIMARY_GOALS,
  TIER_LIABILITY_NOTE,
  UPHOLSTERY_OPTIONS,
} from "../lib/intake/constants";
import { evaluateIntakeGate } from "../lib/intake/gates";
import { needsExpectationAck } from "../lib/intake/requirements";
import { getRequiredPhotoRequirements } from "../lib/intake/requirements";
import type { JobRecord } from "../lib/db";
import { hasHardBlockFlag } from "../lib/intake/flags";
import type { MaterialTag, MaterialZone } from "../lib/types";
import { useJobStore } from "../store/jobStore";

interface IntakeScreenProps {
  job: JobRecord;
}

export function IntakeScreen({ job }: IntakeScreenProps) {
  const {
    intakePhotoTags,
    refreshPhotoTags,
    updateIntake,
    completeIntake,
    setScreen,
  } = useJobStore();
  const intake = job.intake!;
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void refreshPhotoTags();
  }, [job.id, refreshPhotoTags]);

  const photoReqs = useMemo(
    () => getRequiredPhotoRequirements(job),
    [job],
  );

  const gate = useMemo(
    () => evaluateIntakeGate({ ...job, flags: job.flags }, intakePhotoTags),
    [job, intakePhotoTags],
  );

  const showExpectation = needsExpectationAck(job.tier, intake.primary_goal);

  async function patch(partial: Parameters<typeof updateIntake>[0]) {
    await updateIntake(partial);
    setErrors([]);
  }

  async function toggleConditionFlag(id: string, checked: boolean) {
    const next = checked
      ? [...new Set([...intake.condition_flag_ids, id])]
      : intake.condition_flag_ids.filter((f) => f !== id);
    await patch({ condition_flag_ids: next });
  }

  async function toggleDamage(tag: string) {
    const next = intake.damage_tags.includes(tag)
      ? intake.damage_tags.filter((t) => t !== tag)
      : [...intake.damage_tags, tag];
    await patch({ damage_tags: next });
  }

  async function handleComplete() {
    setSubmitting(true);
    const result = await completeIntake();
    setSubmitting(false);
    if (result.ok) return;
    if ("blocked" in result && result.blocked) return;
    if ("errors" in result) setErrors(result.errors);
  }

  return (
    <section className="space-y-6 pb-24">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Intake</h2>
        <p className="text-sm text-slate-400">
          {job.customer_name} · {job.vehicle_ymmt} ·{" "}
          <span className="capitalize">{job.tier.replace("_", " ")}</span>
        </p>
        <p className="text-xs text-slate-500">
          Wheels stay locked until intake is complete.
        </p>
      </header>

      {hasHardBlockFlag(job.flags) && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          Mold or biohazard flagged — completing intake will open the refer-out flow.
          No detailing checklist will run.
        </p>
      )}

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {!gate.canComplete && gate.missingPhotos.length > 0 && (
        <p className="text-xs text-amber-400">
          {gate.missingPhotos.length} required photo(s) remaining
        </p>
      )}

      {/* Upholstery */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-300">
          Upholstery (confirm)
        </legend>
        <p className="text-xs text-slate-500">
          Booked as: <span className="capitalize">{intake.booking_upholstery}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {UPHOLSTERY_OPTIONS.map((o) => (
            <label
              key={o.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                intake.confirmed_upholstery === o.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-800"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                checked={intake.confirmed_upholstery === o.id}
                onChange={() => void patch({ confirmed_upholstery: o.id })}
              />
              {o.label}
            </label>
          ))}
        </div>
        {intake.booking_upholstery !== intake.confirmed_upholstery && (
          <label className="block space-y-1">
            <span className="text-xs text-amber-400">Override reason *</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={intake.upholstery_override_reason ?? ""}
              onChange={(e) =>
                void patch({ upholstery_override_reason: e.target.value })
              }
              placeholder="e.g. rear cloth inserts detected"
            />
          </label>
        )}
      </fieldset>

      {/* Mixed zones */}
      {intake.confirmed_upholstery === "mixed" && (
        <MixedZonesEditor
          zones={intake.material_zones}
          onChange={(material_zones) => void patch({ material_zones })}
        />
      )}

      {/* Primary goal */}
      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Primary goal</span>
        <select
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          value={intake.primary_goal}
          onChange={(e) =>
            void patch({
              primary_goal: e.target.value as typeof intake.primary_goal,
            })
          }
        >
          {PRIMARY_GOALS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Customer concern *</span>
        <textarea
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          rows={3}
          value={intake.customer_concern}
          onChange={(e) => void patch({ customer_concern: e.target.value })}
          placeholder="What does the customer want addressed?"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">VIN (optional)</span>
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={job.vin ?? ""}
          onChange={(e) => void patch({ vin: e.target.value })}
        />
      </label>

      {/* Odor / pet hair severity */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-300">Condition severity</legend>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">Pet hair</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={intake.pet_hair_severity}
            onChange={(e) =>
              void patch({
                pet_hair_severity: Number(e.target.value) as 0 | 1 | 2,
              })
            }
          >
            <option value={0}>None</option>
            <option value={1}>Light</option>
            <option value={2}>Severe</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-slate-500">Odor</span>
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            value={intake.odor_severity}
            onChange={(e) =>
              void patch({
                odor_severity: Number(e.target.value) as 0 | 1 | 2 | 3,
              })
            }
          >
            <option value={0}>None</option>
            <option value={1}>Light transient</option>
            <option value={2}>Persistent</option>
            <option value={3}>Heavy (approval required)</option>
          </select>
        </label>
      </fieldset>

      {/* Condition flags */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">Condition flags</legend>
        {CONDITION_FLAGS.map((f) => (
          <label key={f.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={intake.condition_flag_ids.includes(f.id)}
              onChange={(e) => void toggleConditionFlag(f.id, e.target.checked)}
            />
            <span
              className={
                "block" in f && f.block ? "text-red-300" : ""
              }
            >
              {f.label}
            </span>
          </label>
        ))}
      </fieldset>

      {/* Damage tags */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-300">
          Visible damage (photo each)
        </legend>
        <div className="flex flex-wrap gap-2">
          {DAMAGE_TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => void toggleDamage(tag)}
              className={`rounded-full px-3 py-1 text-xs ${
                intake.damage_tags.includes(tag)
                  ? "bg-sky-600 text-white"
                  : "border border-slate-700 text-slate-400"
              }`}
            >
              {tag.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Photos */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-300">Intake photos</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {photoReqs.map((req) => (
            <PhotoCapture
              key={req.tag}
              jobId={job.id}
              tag={req.tag}
              label={req.label}
              required={req.required}
              photoReady={intakePhotoTags.includes(req.tag)}
              onUploaded={() => void refreshPhotoTags()}
            />
          ))}
        </div>
      </fieldset>

      {/* Acknowledgments */}
      <fieldset className="space-y-3 rounded-xl border border-slate-800 p-4">
        <legend className="text-sm font-medium text-slate-300">Acknowledgments</legend>
        <p className="text-xs text-slate-500">{TIER_LIABILITY_NOTE[job.tier]}</p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={intake.liability_scope_ack}
            onChange={(e) => void patch({ liability_scope_ack: e.target.checked })}
          />
          <span>Customer understands included service scope (liability)</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={intake.personal_items_ack}
            onChange={(e) => void patch({ personal_items_ack: e.target.checked })}
          />
          <span>Personal items / valuables reviewed with customer</span>
        </label>
        {showExpectation && (
          <label className="flex items-start gap-2 text-sm text-amber-200">
            <input
              type="checkbox"
              checked={intake.expectation_ack}
              onChange={(e) => void patch({ expectation_ack: e.target.checked })}
            />
            <span>
              Customer acknowledges Maintenance does not include correction /
              heavy stain / odor remediation for this goal
            </span>
          </label>
        )}
      </fieldset>

      {/* Unsafe environment */}
      <fieldset className="space-y-2 rounded-xl border border-amber-500/30 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={intake.unsafe_environment}
            onChange={(e) => void patch({ unsafe_environment: e.target.checked })}
          />
          <span>Unsafe work environment — cannot proceed</span>
        </label>
        {intake.unsafe_environment && (
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            rows={2}
            placeholder="Describe condition (animal, weather, no water/power…)"
            value={intake.unsafe_environment_note ?? ""}
            onChange={(e) =>
              void patch({ unsafe_environment_note: e.target.value })
            }
          />
        )}
      </fieldset>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 p-4">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            onClick={() => setScreen("home")}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleComplete()}
            className="flex-1 rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Validating…" : "Complete intake"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MixedZonesEditor({
  zones,
  onChange,
}: {
  zones: MaterialZone[];
  onChange: (zones: MaterialZone[]) => void;
}) {
  const [zone, setZone] = useState<string>(MIXED_ZONE_PRESETS[0].zone);
  const [material, setMaterial] = useState<MaterialTag>("cloth");

  function add() {
    onChange([...zones.filter((z) => z.zone !== zone), { zone, material }]);
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-800 p-3">
      <legend className="text-sm font-medium text-slate-300">Mixed material zones</legend>
      <div className="flex flex-wrap gap-1">
        {zones.map((z) => (
          <span
            key={z.zone}
            className="rounded-full bg-slate-800 px-2 py-1 text-xs"
          >
            {z.zone}: {z.material}
            <button
              type="button"
              className="ml-1 text-slate-500"
              onClick={() => onChange(zones.filter((x) => x.zone !== z.zone))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {MIXED_ZONE_PRESETS.map((p) => (
            <option key={p.zone} value={p.zone}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
          value={material}
          onChange={(e) => setMaterial(e.target.value as MaterialTag)}
        >
          {MATERIAL_TAG_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-slate-800 px-3 text-sm"
        >
          Add
        </button>
      </div>
    </fieldset>
  );
}
