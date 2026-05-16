import { useCallback, useEffect, useState } from "react";
import type { JobRecord } from "../lib/db";
import {
  approvalEvidencePhotoTag,
  getPendingApprovals,
  requiresEvidencePhoto,
  type PendingApproval,
} from "../lib/approvals";
import { hasJobPhoto } from "../lib/photos/storage";
import { useJobStore } from "../store/jobStore";
import { PhotoCapture } from "./PhotoCapture";

interface ApprovalPanelProps {
  job: JobRecord;
}

export function ApprovalPanel({ job }: ApprovalPanelProps) {
  const { grantApproval, declineApproval } = useJobStore();
  const pending = getPendingApprovals(job);
  const [expandedKey, setExpandedKey] = useState<string | null>(
    pending[0]?.key ?? null,
  );
  const [scopeNotes, setScopeNotes] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [customerAttest, setCustomerAttest] = useState<Record<string, boolean>>(
    {},
  );
  const [techAttest, setTechAttest] = useState<Record<string, boolean>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshEvidence = useCallback(async () => {
    const map: Record<string, boolean> = {};
    await Promise.all(
      pending.map(async (p) => {
        map[p.key] = await hasJobPhoto(
          job.id,
          approvalEvidencePhotoTag(p.key),
        );
      }),
    );
    setEvidenceMap(map);
  }, [job.id, pending]);

  useEffect(() => {
    void refreshEvidence();
  }, [refreshEvidence]);

  useEffect(() => {
    if (pending.length && !pending.some((p) => p.key === expandedKey)) {
      setExpandedKey(pending[0]?.key ?? null);
    }
  }, [pending, expandedKey]);

  if (!pending.length) return null;

  const blocking = pending.some((p) => p.blocking);

  async function handleGrant(item: PendingApproval) {
    setActionError(null);
    setBusy(true);
    const price = Number.parseFloat(prices[item.key] ?? "0");
    const result = await grantApproval({
      key: item.key,
      scope_note: scopeNotes[item.key] ?? item.displayName,
      price_dollars: Number.isFinite(price) ? price : 0,
      customer_attested: Boolean(customerAttest[item.key]),
      tech_attested: Boolean(techAttest[item.key]),
    });
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setExpandedKey(null);
  }

  async function handleDecline(item: PendingApproval) {
    setActionError(null);
    setBusy(true);
    const result = await declineApproval({ key: item.key });
    setBusy(false);
    if (!result.ok) setActionError(result.error);
  }

  return (
    <section className="space-y-3 rounded-xl border border-violet-500/40 bg-violet-500/5 p-4">
      <header>
        <h2 className="text-sm font-semibold text-violet-200">
          Customer approval
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          On-site dual attestation for upsells. Evidence photo when odor/ozone,
          price over $150, or labor over 60 min.
        </p>
        {blocking && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Blocking approval required before related work can proceed.
          </p>
        )}
      </header>

      {actionError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {actionError}
        </p>
      )}

      <ul className="space-y-2">
        {pending.map((item) => {
          const open = expandedKey === item.key;
          const priceVal = Number.parseFloat(prices[item.key] ?? "0");
          const needsPhoto = requiresEvidencePhoto(
            item,
            Number.isFinite(priceVal) ? priceVal : 0,
          );
          const defaultScope = `${item.displayName} — est. ${item.laborMinutes} min add-on`;

          return (
            <li
              key={item.key}
              className="rounded-lg border border-slate-700 bg-slate-900/60"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 px-3 py-3 text-left"
                onClick={() => setExpandedKey(open ? null : item.key)}
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {item.displayName}
                    {item.blocking && (
                      <span className="ml-2 text-xs text-amber-400">
                        Required
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.lockedStepCount} locked step
                    {item.lockedStepCount === 1 ? "" : "s"} · ~
                    {item.laborMinutes} min
                  </p>
                </div>
                <span className="text-xs text-slate-500">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="space-y-3 border-t border-slate-800 px-3 py-3">
                  <p className="text-xs text-slate-400">{item.description}</p>

                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">
                      Scope (read to customer)
                    </span>
                    <textarea
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      rows={2}
                      value={scopeNotes[item.key] ?? defaultScope}
                      onChange={(e) =>
                        setScopeNotes((prev) => ({
                          ...prev,
                          [item.key]: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-slate-500">
                      Agreed price (USD)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="decimal"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      placeholder="0"
                      value={prices[item.key] ?? ""}
                      onChange={(e) =>
                        setPrices((prev) => ({
                          ...prev,
                          [item.key]: e.target.value,
                        }))
                      }
                    />
                  </label>

                  {needsPhoto && (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2">
                      <PhotoCapture
                        jobId={job.id}
                        tag={approvalEvidencePhotoTag(item.key)}
                        label="Evidence photo (signature / written OK)"
                        required
                        onUploaded={() => void refreshEvidence()}
                      />
                      {!evidenceMap[item.key] && (
                        <p className="mt-1 text-xs text-sky-300">
                          Required for this approval level
                        </p>
                      )}
                    </div>
                  )}

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-medium text-slate-400">
                      Dual attestation
                    </legend>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={customerAttest[item.key] ?? false}
                        onChange={(e) =>
                          setCustomerAttest((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        Customer agrees to scope and price (on-site)
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={techAttest[item.key] ?? false}
                        onChange={(e) =>
                          setTechAttest((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                      />
                      <span>
                        I read scope and price aloud and confirmed understanding
                      </span>
                    </label>
                  </fieldset>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleGrant(item)}
                      className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Approve & unlock
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDecline(item)}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
