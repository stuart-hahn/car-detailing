# Phase 1 backlog

## Shipped

- [x] PHASE1_SPEC + scaffold (`9081380`)
- [x] Generator pipeline C + tests
- [x] Intake gates, photos, refer-out (`fb39d4f`)
- [x] Swipe-to-complete, dependency locks, undo (`4f0831f`)
- [x] Dexie jobs/photos/settings
- [x] New Job, Intake, Checklist screens
- [x] QC screens — work_complete → photos → fresh-eyes → delivery QC; rework loop
- [x] Export/import — JSON/ZIP + post-delivery backup prompt
- [x] master_steps.json — 58 phase-1 templates (55 executable), professional names, sop `2026.05.2`
- [x] Care sheet generator — tier-gated text, product picklist, copy/share; saved on job at delivery QC
- [x] Customer approval UI — dual on-site attest, evidence photo rules, grant/decline unlock via `appendApprovedSteps`
- [x] Delivery screen — handoff steps, care sheet, delivery QC; QC routes to delivery after fresh-eyes
- [x] 24h job reopen — reason required, delivery reset, immutable after window; history + delivery UI
- [x] PR1 — Job shell, 3-tab nav, phase router, launch A+D, one-job gate, kill 7-tab nav
- [x] PR2 — CSS vars, field palette, theme wired, Settings + Export/Import
- [x] PR3 — Checklist D — up-next focus card, collapsed done, scroll-anchor, hints on focus only, sticky “Go to QC” when `qcReady`

## Next (priority) — UI/UX: job-centric shell (C) → field usability (A)

Strategy: surface FSM in navigation; field mode for driveway use. Spec polish (repeat customers, storage estimate) deferred until this ships.

1. **PR4** — QC C — stage panel, collapsed prior outcomes, display-only sub-strip, footer CTA per stage, fresh-eyes timer in panel, rework hatch

| PR | Ships | Gate |
|----|--------|------|
| **PR1** | Job shell; bottom nav (Active Job / History / Settings); phase router; header + `☀ Field (light)` pill (wired, palette in PR2); launch A+D; one-job gate; stale-draft banner; kill 7-tab nav; refer-out = full screen, macro stepper Intake in warn/error | App navigable |
| **PR2** | CSS vars; field palette (B); `AppSettings.theme` wired; pill activates light field override; Settings (profile, products, theme, field default, Export/Import) | Foundation for A |
| **PR3** | Checklist D — up-next focus card, collapsed done, “Show full checklist” scroll-anchor to current step, hints on focus only, sticky “Go to QC” when `qcReady` | Primary field screen |
| **PR4** | QC C — stage panel, collapsed prior outcomes, display-only sub-strip, footer CTA per stage, fresh-eyes timer in panel, rework hatch `↩ Return to checklist — {n} step(s) flagged` | Full driveway loop |
| **PR5** | History read-only detail sheet (tab-stay); C+D tap rules; reopen via explicit CTA | Admin path |
| **PR6** | Intake / Delivery / New Job shell fit; remove “Phase 1” dev copy | Consistency |

### Locked rules (implement against these)

- **Navigation:** One contextual screen per phase; macro stepper display-only (Intake → Work → QC → Delivery). QC sub-strip: Photos → Review → Fresh Eyes → Delivery QC → Done (forward-only). Back nav = text escape hatches only (no stepper taps).
- **Launch:** Auto-resume non-terminal jobs to correct phase. Do **not** auto-resume completed jobs; show “Reopen [Customer]?” if `canReopenJob`. One in-flight job; New Job / switch prompts discard (draft-only → silent delete; real work → `declined` + reason).
- **History:** Immutable completed → read-only sheet in History, `activeJobId` untouched. Reopen / in-flight taps → D-gate. Stay on History tab unless job becomes active.
- **Field mode (B):** Pill `☀ Field (light)` in header (44px min). Field on → force light palette (`#F8F9FA` bg, `#111827` text, `#059669` CTA, etc.). Field off → honor theme (system/light/dark).

## Deferred

**UI (after PR6):** Stepper read-only tap (B evolution), expanded checklist preference, product drag-reorder, history filters, storage estimate in history.

**Phase 2+:** Auth, cloud sync, SMS approval links, CRM, quoting AI, repeat-customer UI (Decision #29 — schema exists).

## Verify before PR

```bash
npm test && npm run build
```
