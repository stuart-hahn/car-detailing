# Topic: Data model + Dexie

**L1:** [PROJECT_CONTEXT.md](../context/PROJECT_CONTEXT.md) · **Schema:** `src/lib/db.ts` · **Types:** `src/lib/types.ts`

## Tables (v2)

| Store | Key | Notes |
|-------|-----|-------|
| jobs | id | JobRecord |
| photos | id | job_id + tag index |
| settings | default | Business profile, products |
| customers | id | vehicles[] for repeat |

## JobRecord highlights

- `intake: JobIntake` — full intake state  
- `generated_steps: StepInstance[]` — instances not templates  
- `flags`, `pre_sold_addons`, `approvals`  
- `sop_version` pinned at create  
- `audit_log[]`  
- `refer_out?` for mold/bio  

## Job status + phase

**Status:** draft \| intake_complete \| active \| awaiting_approval \| blocked_refer_out \| blocked_unsafe \| declined \| completed  

**Phase:** intake \| checklist \| qc_work \| qc_delivery \| closed  

## StepInstance

`instance_id`, `template_id`, `slot`, `status` (pending\|completed\|locked\|needs_rework\|…), `completed_at`, `photo_taken`, `zone?`, `material?`

## Photo tags

- Intake: `corner_fl`, `damage_*`, `flag_*`, etc.  
- Step: `step_{instance_id}`  

## Export

`export_version: 1` — `src/lib/backup/` — JSON (metadata) or ZIP (`export.json` + `photos/*.jpg`). Import upserts Dexie by ID. Post-delivery backup prompt on History + QC complete (`src/lib/backup/prompt.ts`).
