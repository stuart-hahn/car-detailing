# Decision log (#1–40)

Interview + implementation locks. If code disagrees, fix code or update this + topic doc.

| # | Topic | Choice |
|---|-------|--------|
| 1 | Operating model | Solo mobile |
| 2 | Location | 100% customer site |
| 3 | Duration | Same-day; no multi-day coating v1 |
| 4–5 | Packaging | 3 tiers; refresh default |
| 6 | Showroom v1 | Mobile showroom — no correction/ceramic |
| 7 | Upholstery | Booking + intake override; mixed + material_tags |
| 8 | Slots | 14 slots; engine **before** wash |
| 9 | QC | 2-pass; tiered photos |
| 10 | Intake | Tier-scaled + universal fields |
| 11 | Flags | inject/upsell/warn/block per tier table |
| 12 | Blocks | mold/bio hard; customer approval for upsells |
| 13–14 | Build scope | PWA + ~55–75 step library target |
| 15 | Add-ons | Hybrid pre-sold at New Job |
| 16 | Generator | Pipeline C; warn = banner |
| 17 | primary_goal | B + D-lite ack on maintenance |
| 18 | Approvals v1 | Attest + evidence photo rules |
| 19 | Mid-job unlock | Append only; locked previews visible |
| 20 | Fresh-eyes | 5min, enable 2min, skip+reason |
| 21 | Stack | Vite/React/TS/Zustand/Dexie/PWA |
| 22 | Backup | Export/import + post-delivery prompt |
| 23 | Reopen job | 24h window |
| 24 | Step undo | 5m free → reason; no undo after delivery QC |
| 25 | Intake photos | Tier-scaled; odometer QC only |
| 26 | QC rework | Auto-reopen + abbreviated pass |
| 27 | Profile | Single local settings |
| 28 | sop_version | Pin on create |
| 29 | Repeat | customers[] + vehicles[] + repeat job |
| 30 | Slot order | See PROJECT_CONTEXT |
| 31 | Parallel hints | Static on active step card |
| 32 | Care sheet | Text; picklist products |
| 33 | Refer-out | Fixed template + attest |
| 34 | Photos | 1920px/0.82; 40MB warn 80MB cap |
| 35 | Tests | Vitest + CI |
| 36 | Theme | System + toggle |
| 37 | Products | Grouped settings defaults |
| 38 | Job FSM | Strict + phase |
| 39 | Helper | assistant_tech optional |
| 40 | Delivery | Spec then scaffold |

**Flag behavior table:** `src/data/flag_behavior.json`  
**Add-ons:** `src/data/addons.json`
