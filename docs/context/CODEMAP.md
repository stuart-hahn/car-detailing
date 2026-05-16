# Code map

## Entry points

| Path | Role |
|------|------|
| `src/App.tsx` | Screen router |
| `src/store/jobStore.ts` | Job lifecycle, intake, complete/undo step |
| `src/main.tsx` | React mount |

## Domain logic (pure / testable)

| Path | Role |
|------|------|
| `src/lib/generator/index.ts` | Checklist pipeline C |
| `src/lib/intake/gates.ts` | Intake validation gate |
| `src/lib/intake/requirements.ts` | Photo reqs, field validation |
| `src/lib/intake/flags.ts` | Intake → generator flags |
| `src/lib/checklist/undo.ts` | Undo policy |
| `src/lib/checklist/dependencies.ts` | Dep lock, dependents warn |
| `src/lib/qc/rework.ts` | QC fail → reopen slots |
| `src/lib/qc/flow.ts` | QC readiness, actionable steps |
| `src/lib/qc/requirements.ts` | Final photo tier gates |
| `src/lib/qc/freshEyes.ts` | Fresh-eyes pause timing |
| `src/lib/slots.ts` | `SLOT_ORDER` canonical |
| `src/lib/photos/storage.ts` | Compress, save, step photos |
| `src/lib/backup/` | Export/import JSON & ZIP, backup prompt |
| `src/lib/jobs/reopen.ts` | 24h reopen window, immutability |
| `src/lib/types.ts` | Shared TS types |

## Data files

| Path | Role |
|------|------|
| `src/data/master_steps.json` | Step templates (58 phase-1; sop `2026.05.2`) |
| `src/data/flag_behavior.json` | Per-tier flag behavior |
| `src/data/addons.json` | Add-on definitions |
| `src/data/products.defaults.json` | Care sheet product seed |
| `src/data/refer_out_template.txt` | Mold/bio notice |

## UI components

| Path | Role |
|------|------|
| `src/components/IntakeScreen.tsx` | Full intake |
| `src/components/ChecklistScreen.tsx` | Swipe checklist |
| `src/components/QcScreen.tsx` | Two-pass QC flow |
| `src/components/DeliveryScreen.tsx` | Customer handoff + delivery QC |
| `src/lib/delivery/handoff.ts` | Delivery walkthrough step helpers |
| `src/components/SwipeStepCard.tsx` | Swipe + undo UI |
| `src/components/PhotoCapture.tsx` | Camera/file capture |
| `src/components/ReferOutScreen.tsx` | Mold/bio close |
| `src/components/BackupPanel.tsx` | Export/import UI |
| `src/components/BackupPrompt.tsx` | Post-delivery backup nudge |

## Storage

| Path | Role |
|------|------|
| `src/lib/db.ts` | Dexie schema v2 |

## Agent tooling

| Path | Role |
|------|------|
| `scripts/agent-sync.mjs` | Sync AGENTS.md from BACKLOG + git; commit/finish helpers |
| `.githooks/pre-commit` | Runs `agent:sync` before each commit |
| `.cursor/hooks/agent-stop.sh` | Auto-commit on Cursor agent stop (opt-out file available) |
| `docs/context/DISCOVERY_MAINTENANCE.md` | When/how to update discovery docs |

## Tests

| Path | Covers |
|------|--------|
| `src/lib/generator/generator.test.ts` | Generator |
| `src/lib/intake/gates.test.ts` | Intake gate |
| `src/lib/checklist/undo.test.ts` | Undo policy |
| `src/lib/qc/rework.test.ts` | QC rework map |
| `scripts/agent-sync.test.mjs` | Discovery sync helpers |
