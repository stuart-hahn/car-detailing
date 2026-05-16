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

## Next (priority)

1. _(pick from deferred or polish)_

## Deferred (Phase 2+)

Auth, cloud sync, SMS approval links, CRM, quoting AI, correction/ceramic sold work.

## Verify before PR

```bash
npm test && npm run build
```
