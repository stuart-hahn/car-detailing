# Code map

## Entry points

| Path | Role |
|------|------|
| `src/App.tsx` | Screen router (6 screens) |
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
| `src/lib/slots.ts` | `SLOT_ORDER` canonical |
| `src/lib/photos/storage.ts` | Compress, save, step photos |
| `src/lib/types.ts` | Shared TS types |

## Data files

| Path | Role |
|------|------|
| `src/data/master_steps.json` | Step templates (~30; expand to 55–75) |
| `src/data/flag_behavior.json` | Per-tier flag behavior |
| `src/data/addons.json` | Add-on definitions |
| `src/data/products.defaults.json` | Care sheet product seed |
| `src/data/refer_out_template.txt` | Mold/bio notice |

## UI components

| Path | Role |
|------|------|
| `src/components/IntakeScreen.tsx` | Full intake |
| `src/components/ChecklistScreen.tsx` | Swipe checklist |
| `src/components/SwipeStepCard.tsx` | Swipe + undo UI |
| `src/components/PhotoCapture.tsx` | Camera/file capture |
| `src/components/ReferOutScreen.tsx` | Mold/bio close |

## Storage

| Path | Role |
|------|------|
| `src/lib/db.ts` | Dexie schema v2 |

## Tests

| Path | Covers |
|------|--------|
| `src/lib/generator/generator.test.ts` | Generator |
| `src/lib/intake/gates.test.ts` | Intake gate |
| `src/lib/checklist/undo.test.ts` | Undo policy |
| `src/lib/qc/rework.test.ts` | QC rework map |
