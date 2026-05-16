import { useRef, useState, type ChangeEvent, type TouchEvent } from "react";
import type { ChecklistCompleteMode } from "../hooks/useChecklistCompleteMode";
import {
  formatRemainingMs,
  remainingFreeUndoMs,
  type UndoPolicyResult,
} from "../lib/checklist/undo";
import type { StepInstance, StepTemplate } from "../lib/types";

const SWIPE_THRESHOLD = 120;

interface SwipeStepCardProps {
  step: StepInstance;
  index: number;
  template?: StepTemplate;
  locked: boolean;
  lockReason?: string;
  undoPolicy: UndoPolicyResult | null;
  dependentWarning?: string;
  parallelHints?: string[];
  photoRequired?: boolean;
  hasPhoto?: boolean;
  completeMode?: ChecklistCompleteMode;
  onComplete: () => void;
  onUndo: (reason?: string) => void;
  onCapturePhoto?: () => void;
}

export function SwipeStepCard({
  step,
  index,
  template,
  locked,
  lockReason,
  undoPolicy,
  dependentWarning,
  parallelHints = [],
  photoRequired,
  hasPhoto,
  completeMode = "swipe",
  onComplete,
  onUndo,
  onCapturePhoto,
}: SwipeStepCardProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [undoReason, setUndoReason] = useState("");
  const [showUndoForm, setShowUndoForm] = useState(false);
  const startX = useRef(0);

  const isCompleted = step.status === "completed";
  const isRework = step.status === "needs_rework";
  const freeUndoMs = isCompleted ? remainingFreeUndoMs(step) : null;
  const useSwipe = completeMode === "swipe";
  const photoBlocksComplete = Boolean(photoRequired && !hasPhoto);

  function onTouchStart(e: TouchEvent) {
    if (locked || isCompleted) return;
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  }

  function onTouchMove(e: TouchEvent) {
    if (!swiping || locked || isCompleted) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffset(Math.max(0, Math.min(dx, 200)));
  }

  function onTouchEnd() {
    if (!swiping) return;
    setSwiping(false);
    if (offset >= SWIPE_THRESHOLD) {
      setOffset(0);
      onComplete();
    } else {
      setOffset(0);
    }
  }

  function handleUndoClick() {
    if (!undoPolicy?.allowed) return;
    if (undoPolicy.needsReason) {
      setShowUndoForm(true);
      return;
    }
    onUndo();
  }

  function submitUndoReason() {
    if (!undoReason.trim()) return;
    onUndo(undoReason.trim());
    setUndoReason("");
    setShowUndoForm(false);
  }

  return (
    <li
      className={`overflow-hidden rounded-xl border ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isRework
            ? "border-amber-500/40 bg-amber-500/10"
            : locked
              ? "border-slate-800 bg-slate-900/30 opacity-60"
              : "border-slate-700 bg-slate-900/50"
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xs tabular-nums text-slate-500">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">
              {template?.name ?? step.template_id}
            </p>
            {template?.instructions && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {template.instructions}
              </p>
            )}
            <p className="mt-1 text-xs capitalize text-slate-500">
              {step.slot}
              {step.zone ? ` · ${step.zone}` : ""}
              {lockReason ? ` · ${lockReason}` : ""}
            </p>
            {step.status === "locked" && (
              <p className="mt-1 text-xs text-slate-500">
                Not sold on this job — does not block QC
              </p>
            )}
          </div>
          {isCompleted && <span className="text-sm text-emerald-400">✓</span>}
        </div>

        {parallelHints.length > 0 && !locked && !isCompleted && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setHintsOpen((o) => !o)}
              className="text-xs text-sky-400"
            >
              {hintsOpen ? "Hide" : "Show"} wait-time tips
            </button>
            {hintsOpen && (
              <ul className="mt-1 list-inside list-disc text-xs text-slate-400">
                {parallelHints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {photoRequired && !isCompleted && !locked && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onCapturePhoto}
              className={`text-xs ${hasPhoto ? "text-emerald-400" : "text-amber-400"}`}
            >
              {hasPhoto ? "Photo captured ✓" : "Photo required — tap to capture"}
            </button>
          </div>
        )}

        {dependentWarning && (
          <p className="mt-2 text-xs text-amber-300">{dependentWarning}</p>
        )}

        {!locked && !isCompleted && useSwipe && (
          <div
            className="relative mt-3 h-11 overflow-hidden rounded-lg bg-slate-800"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="absolute inset-y-0 left-0 bg-emerald-600/30 transition-[width]"
              style={{ width: `${Math.min(offset, 200)}px` }}
            />
            <div
              className="absolute inset-y-0 left-0 flex w-11 touch-none items-center justify-center bg-emerald-600 text-white transition-transform"
              style={{ transform: `translateX(${offset}px)` }}
            >
              →
            </div>
            <p className="flex h-full items-center justify-center text-xs text-slate-400">
              Swipe right to complete
            </p>
          </div>
        )}

        {!locked && !isCompleted && !useSwipe && (
          <label
            className={`mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5 ${
              photoBlocksComplete ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              className="size-5 shrink-0 rounded border-slate-600 accent-emerald-500"
              disabled={photoBlocksComplete}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) onComplete();
              }}
            />
            <span className="text-sm text-slate-300">
              {photoBlocksComplete
                ? "Capture photo first"
                : "Mark step complete"}
            </span>
          </label>
        )}

        {isCompleted && undoPolicy && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {freeUndoMs != null && (
              <span className="text-xs text-slate-500">
                Free undo: {formatRemainingMs(freeUndoMs)}
              </span>
            )}
            <button
              type="button"
              disabled={!undoPolicy.allowed}
              onClick={handleUndoClick}
              className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300 disabled:opacity-40"
            >
              Undo
            </button>
          </div>
        )}

        {showUndoForm && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-700 p-2">
            <p className="text-xs text-slate-400">Reason for undo (required)</p>
            <input
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm"
              value={undoReason}
              onChange={(e) => setUndoReason(e.target.value)}
              placeholder="e.g. marked wrong step"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded bg-slate-700 py-1 text-xs"
                onClick={() => setShowUndoForm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded bg-amber-600 py-1 text-xs text-white"
                onClick={submitUndoReason}
              >
                Confirm undo
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
