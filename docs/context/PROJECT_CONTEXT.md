# Project context (L1)

Compressed from design interview + implementation. **Authoritative detail:** topic docs → `PHASE1_SPEC.md`.

## Business

- Solo mobile detailer, 100% customer site, same-day.
- 3 outcome tiers: `maintenance` (1.5–2.5h) \| `refresh` ⭐ default (4–6h) \| `showroom` anchor (mobile v1, no correction/ceramic/multi-day).
- Success: **50 real jobs** w/o SOP break, data loss, checklist friction.

## Architecture (one SOP)

```text
master_steps.json + tier + upholstery + flags + pre_sold_addons + approvals
  → generateChecklist() → generated_steps[] + warn_banners[]
```

- **Slots (order):** intake → wheels → **engine** → wash → decon → dry → interior_dry → interior_wet → interior_refine → glass → exterior_protection → finalization → qc → delivery
- **Generator:** pipeline C — base → upholstery branch → flag branch → addons → dedupe → exclude → block → sort → instantiate
- **`warn` flags:** banner only, no checklist rows
- **Mold/bio:** hard_block → refer-out workflow, no detail steps
- **Ozone:** never auto-inject; `upsell_ozone` + approval

## Data

- **Dexie v2:** `jobs`, `photos`, `settings`, `customers`
- **Job FSM:** draft → intake_complete → active \| awaiting_approval \| blocked_* → completed; `rescheduled` = declined + reason
- **No auth v1** — device-local; export/import JSON & ZIP (`export_version: 1`)

## UI screens

| Screen | Status |
|--------|--------|
| New Job | ✓ |
| Intake | ✓ gates + photos + refer-out |
| Checklist | ✓ swipe complete + undo + deps |
| QC | ✓ |
| Delivery | partial (QC handoff; care sheet backlog) |
| History | partial |

## Key policies (short)

| Area | Rule |
|------|------|
| Add-ons | Pre-sold at New Job locked; intake adds flags/approvals |
| Intake photos | Tier-scaled; odometer at QC only |
| Undo | 5m free → reason; block after delivery QC; clears step photo |
| Approvals v1 | On-site attest; photo if odor_3/ozone or >$150 or >60min |
| SOP version | Pin `sop_version` on job; no auto-migrate v1 |

## Tech

- Vite + React + TS + Tailwind + Zustand + Dexie + vite-plugin-pwa + ULID
- Tests: generator fixtures, intake gates, QC rework map, undo policy
- CI: `.github/workflows/ci.yml`

## Do not (v1)

CRM, cloud sync, auth, AI, correction/ceramic as sold work, fake supervisor QC, auto-migrate SOP on active jobs.

## Phase 2 (after 50 jobs)

Customer approval links, cloud backup, quoting/labor multipliers, CRM.
