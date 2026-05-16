import { useEffect, useState } from "react";
import template from "../data/refer_out_template.txt?raw";
import { getOrCreateSettings } from "../lib/db";
import type { JobRecord } from "../lib/db";
import { listJobPhotoTags } from "../lib/photos/storage";
import { useJobStore } from "../store/jobStore";

interface ReferOutScreenProps {
  job: JobRecord;
}

export function ReferOutScreen({ job }: ReferOutScreenProps) {
  const { saveReferOut } = useJobStore();
  const [zones, setZones] = useState(job.refer_out?.zones ?? "");
  const [notes, setNotes] = useState(job.refer_out?.internal_notes ?? "");
  const [ack, setAck] = useState(job.refer_out?.customer_acknowledged ?? false);
  const [notice, setNotice] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    void listJobPhotoTags(job.id).then((t) => setPhotoCount(t.length));
    void getOrCreateSettings().then((s) => {
      const reason =
        job.flags.includes("mold")
          ? "Mold was observed during intake."
          : job.flags.includes("biohazard")
            ? "Biohazard conditions were observed during intake."
            : "Conditions require specialist remediation.";
      setNotice(
        template
          .replace("{{zones}}", zones || reason)
          .replace("{{referral_note}}", s.referral_note ?? "See a qualified remediation provider.")
          .replace("{{business_name}}", s.business_name)
          .replace("{{phone}}", s.phone || "(add phone in Settings)"),
      );
    });
  }, [job.id, job.flags, zones]);

  async function handleClose() {
    if (!zones.trim() || !ack) return;
    await saveReferOut({
      zones,
      internal_notes: notes,
      customer_acknowledged: ack,
    });
  }

  return (
    <section className="space-y-5 pb-12">
      <header>
        <h2 className="text-xl font-semibold text-red-300">Service limitation</h2>
        <p className="mt-1 text-sm text-slate-400">
          {job.customer_name} · {job.vehicle_ymmt}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          This job cannot proceed under mobile detailing scope. Document and close.
        </p>
      </header>

      <p className="text-xs text-slate-500">
        Intake photos on file: {photoCount} (capture mold/bio evidence on intake screen
        before closing if needed)
      </p>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Affected zones / observation *</span>
        <textarea
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          rows={3}
          value={zones}
          onChange={(e) => setZones(e.target.value)}
          placeholder="e.g. rear carpet, trunk — visible mold spotting"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Internal notes</span>
        <textarea
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
        <p className="text-xs font-medium uppercase text-slate-500">Customer notice</p>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{notice}</pre>
        <button
          type="button"
          className="mt-3 text-sm text-sky-400"
          onClick={() => navigator.clipboard.writeText(notice)}
        >
          Copy to clipboard
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>Customer acknowledged limitation notice (on-site attest)</span>
      </label>

      <button
        type="button"
        disabled={!zones.trim() || !ack}
        onClick={() => void handleClose()}
        className="w-full rounded-xl bg-red-600 py-3 font-medium text-white disabled:opacity-50"
      >
        Close job (declined)
      </button>
    </section>
  );
}
