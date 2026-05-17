# Topic: Checklist + swipe + undo

**L1:** [PROJECT_CONTEXT.md](../context/PROJECT_CONTEXT.md) · **UI:** `ChecklistScreen.tsx`, `SwipeStepCard.tsx` · **Store:** `completeStep`, `undoStep`

## Flow

1. Intake complete → Checklist  
2. **Start work** → `status: active`  
3. Swipe right (120px) → `completeStep`  
4. Undo per policy  

## Field UI (PR3)

- **Up next** focus card — full swipe/checkbox + parallel hints (`lib/checklist/focus.ts` → `findUpNextStep`)  
- **Done** — collapsed section; expand for undo  
- **Show full checklist** — scrolls to `#checklist-step-current` in compact list  
- **Go to QC** — sticky footer above bottom nav when `isWorkChecklistComplete`  

## Locks (cannot complete)

- !intake_complete / !work_started  
- `status: locked` (approval pending)  
- Unmet `dependencies[]` from master template  
- `photo_required` without `step_{instance_id}` photo  

## Undo (Q24)

| Window | Action |
|--------|--------|
| ≤5 min | One-tap undo |
| >5 min | Reason required |
| After delivery QC started | Blocked |

Undo: deletes step photo, sets pending, logs `step_undone` in audit_log. Warns if dependents completed (no auto-undo).

## Photos

Tag: `step_{instance_id}` via `stepPhotoTag()` in `photos/storage.ts`.

## Code

- `lib/checklist/dependencies.ts` — dep checks  
- `lib/checklist/undo.ts` — policy  

## Tests

`lib/checklist/undo.test.ts`
