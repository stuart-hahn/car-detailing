# Phase 1 backlog

## Shipped

- [x] PHASE1_SPEC + scaffold (`9081380`)
- [x] Generator pipeline C + tests
- [x] Intake gates, photos, refer-out (`fb39d4f`)
- [x] Swipe-to-complete, dependency locks, undo (`4f0831f`)
- [x] Dexie jobs/photos/settings
- [x] New Job, Intake, Checklist screens
- [x] QC screens — work_complete → photos → fresh-eyes → delivery QC; rework loop

## Next (priority)

1. **Export/import** — JSON/ZIP + post-delivery backup prompt
3. **master_steps.json** — expand to 55–75 steps, professional names
4. **Care sheet generator** — tier-gated text + share
5. **Customer approval UI** — on-site attest flows for upsells (partial in store)

## Deferred (Phase 2+)

Auth, cloud sync, SMS approval links, CRM, quoting AI, correction/ceramic sold work.

## Verify before PR

```bash
npm test && npm run build
```
