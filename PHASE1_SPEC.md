# Phase 1 Specification — Mobile Detailing SOP PWA

**Status:** Locked for implementation  
**Success metric:** One solo mobile operator completes **50 real jobs** without SOP breakdown, data loss, or checklist friction.  
**Version:** 2026.05.1 (document); app pins `sop_version` per job.

---

## 1. Business context

| Topic | Decision |
|-------|----------|
| Operating model | Solo mobile detailer (optional helper, max 2 names in settings) |
| Service location | 100% at customer site |
| Job duration | Same-day mobile; no multi-day coating/correction in v1 |
| Scale target | Single operator; franchise/multi-bay deferred |

---

## 2. Product tiers (customer-facing)

Three outcome tiers — **not** four technical shop tiers.

| ID | Name | Role | Target time |
|----|------|------|-------------|
| `maintenance` | Maintenance Wash | Recurring / membership / volume | 1.5–2.5 hr |
| `refresh` | Full Refresh | Default / most bookings | 4–6 hr |
| `showroom` | Showroom Reset | Premium anchor (mobile v1) | Long same-day |

**UI positioning:** `[ Maintenance ]  [ Full Refresh ⭐ ]  [ Showroom ]`

### Tier scope (executable v1)

**Maintenance — must include:** wheels/tires/wells, foam + contact wash, spray sealant, tire dressing, vacuum, hard-surface wipe, glass, trunk vacuum light, UV protectant light, final QC.

**Maintenance — add-on only:** clay, iron, extraction, engine bay, pet hair, odor, leather, seat removal, polish/correction, ceramic, etc.

**Full Refresh — must include:** everything in Maintenance plus compressed-air purge, deeper wheels/wells, iron remover, clay, jambs, extraction branch, leather branch, trim brush work, trunk deep, windshield decon, premium sealant, interior UV, extended QC.

**Showroom (mobile v1) — must include:** Full Refresh plus engine bay detail, trim restoration (slot: `exterior_protection`), exhaust tips, seat tracks, advanced stain remediation, extended defect inspection, delivery photos, maintenance guide.

**Excluded from v1 Showroom execution:** paint correction, panel wipe, ceramic coating, wet sanding, seat removal, mold/bio execution. Reserved IDs: `corr_*`, `coat_*`, `sand_*`.

### Architecture principle

One **master SOP** — no separate checklist per package.

```text
master_steps.json
+ tier flags
+ conditional branches
+ add-on injections
→ generated step instances per job
```

---

## 3. Canonical slot order (14 slots)

Order is authoritative for generator sort. **Engine before wash** (degreaser runoff handled in wash).

| # | Slot |
|---|------|
| 1 | `intake` |
| 2 | `wheels` |
| 3 | `engine` |
| 4 | `wash` |
| 5 | `decon` |
| 6 | `dry` |
| 7 | `interior_dry` |
| 8 | `interior_wet` |
| 9 | `interior_refine` |
| 10 | `glass` |
| 11 | `exterior_protection` |
| 12 | `finalization` |
| 13 | `qc` |
| 14 | `delivery` |

**Sequencing rules:**

- Iron/clay before exterior protection
- Interior protectants (UV) before glass
- Tire dressing in `finalization` only
- Final photos after work-complete QC passes
- Trim restoration → `exterior_protection`

**Supersedes earlier note:** Engine is slot 3 (before wash), not after wash.

---

## 4. Checklist generation pipeline (Option C)

**Input:** `{ tier, upholstery_type, material_zones[], flags[], pre_sold_addons[], approvals[], sop_version }`

```text
1. BASE      — steps where tier ∈ step.tiers, enabled, phase = 1, sop_version compatible
2. BRANCH    — upholstery (cloth / leather / mixed / unknown)
3. BRANCH    — flags via flag_behavior (inject | upsell | warn | block | block_until_approval)
4. ADD-ONS   — pre_sold_addons ∪ approval-unlocked addons → injects_steps[]
5. DEDUPE    — one template per job; zone-scoped duplicates for mixed upholstery
6. EXCLUDE   — mutually_exclusive_with; strip reserved disabled steps
7. BLOCK     — mold/bio/unsafe → refer-out workflow only, no detailing steps
8. SORT      — slot_order → dependencies (topo) → priority
9. INSTANTIATE — ULID step_instance_id per row
```

**Outputs:** `generated_steps[]`, `warn_banners[]` (no steps for `warn`).

### Upholstery

- `cloth` → extraction workflow
- `leather` → leather workflow
- `mixed` → both + `material_zones[]` on instances
- `unknown` → cloth branch + warn banner

**Material tags:** `cloth`, `coated_leather`, `vinyl`, `alcantara`, `suede`, `perforated`

### Flag behavior (per tier)

See `src/data/flag_behavior.json`. Summary:

| Flag | Maintenance | Refresh | Showroom |
|------|-------------|---------|----------|
| pet_hair_light | upsell | inject | inject |
| pet_hair_severe | upsell | upsell | inject |
| odor_1 | warn | inject | inject |
| odor_2 | upsell | inject | inject |
| odor_3 | block_until_approval | upsell_ozone | upsell_ozone |
| mold | hard_block | hard_block | hard_block |
| biohazard | hard_block | hard_block | hard_block |
| sap | upsell | inject | inject |
| overspray | upsell | upsell | inject |
| excessive_soiling | upsell | inject | inject |

- **`warn`:** banner only everywhere in v1 (no optional checklist rows)
- **Ozone:** never auto-inject; always `upsell_ozone` + approval
- **Labor multipliers:** stored on flag config for future quoting (not blocking v1)

### Add-ons (hybrid entry)

- **New Job:** tier + upholstery default + **pre_sold_addons[]** (locked)
- **Intake:** flags, severities, confirmations; may add approvals/upsells; cannot drop pre-sold without owner note
- Canonical add-on IDs: see Decision #15 in interview (9 groups); tier IDs: `maintenance` | `refresh` | `showroom` only

### Mid-job unlock (append only)

- Locked preview rows **visible, grayed-out** before approval
- On approval: delta inject; never reorder/delete completed instances
- Declined approval: locked rows cancelled or stay locked

### primary_goal (B + D-lite)

Stored + header banner. On **Maintenance**, expectation ack required before wheels if goal ∈:

- `gloss_improvement`, `stain_removal`, `odor_removal`, `scratch_removal`

---

## 5. Quality control

### Two-pass QC (no fake supervisor)

```text
qc_work_complete → rework if failed → final photos → fresh-eyes pause → qc_delivery → handoff
```

**Photo profiles:**

| Tier | Count (target) |
|------|----------------|
| maintenance | 4 |
| refresh | ~10 |
| showroom | ~20 |

Odometer photo at **QC/delivery**, not intake.

### Fresh-eyes pause

Soft prompt: 5-min countdown; **Start delivery QC** enabled at 2:00; skip requires reason logged. No timer if work-complete QC failed.

### QC fail → rework (abbreviated second pass)

- Failed items map to slots/templates → `needs_rework`
- Delivery QC + final photos locked until cleared
- Second work-complete QC = **failed categories only**
- Log `qc_attempts[]`

### Step undo (active job)

- 5-min free undo; then reason required until `qc_delivery` starts
- Undo clears required photos; warn dependents, don't auto-undo children

---

## 6. Intake

### Universal required fields (every tier)

Customer name, phone, vehicle Y/M/M, license plate, VIN (optional), tier, timestamp, technician, upholstery_type, material_tags, visible damage tags, personal-items ack, customer concern, intake photos, service address, condition_flags, primary_goal.

### Tier-scaled intake

| Tier | Extra | Time cap |
|------|-------|----------|
| maintenance | 4 corner photos; liability note: no correction/coating | 3–5 min |
| refresh | + 2 interior wide; close-up per flagged damage | — |
| showroom | + 4 panel macros; engine bay wide if applicable | — |

**Gate:** Slot `wheels` locked until intake complete.

### Intake photos (tier-scaled)

- Maintenance: 4 corners
- Refresh: 4 corners + 2 interior wide + close-up per flag/damage
- Showroom: refresh set + 4 panel macros + engine wide if engine work
- Severity ≥ 2 flags: ≥1 close-up each

---

## 7. Approvals & blocks (Phase 1, no portal)

### Customer approval (dual)

- Default: in-person attest (scope, price, timestamp)
- Evidence photo required: `odor_3`, `upsell_ozone`, or approval > **$150** or > **60 min** labor

### Mold / bio

- **hard_block** — no override, no owner waiver
- Refer-out workflow actions only (not detailing steps):
  1. Capture photos
  2. Log zones
  3. Fixed-template customer notice + `referral_note` from settings
  4. Customer attest
  5. Close as `declined`

### unsafe_environment

`block_until_resolved` — examples: aggressive animal, infestation, unsafe driveway, severe weather, no water/power.

---

## 8. Job status machine (FSM + phase)

**Statuses:** `draft` → `intake_complete` → `active` → `awaiting_approval` → `completed` | `declined`  
Also: `blocked_refer_out`, `blocked_unsafe`

**Phase (UI):** `intake` | `checklist` | `qc_work` | `qc_delivery` | `closed` — independent of status where needed.

**Rescheduled:** `declined` + `decline_reason: rescheduled`

### Completed job mutability

- 24h reopen window with `reopened_at`, `reopen_reason`, `audit_log[]`
- Immutable after 24h

---

## 9. Operator profile & helpers

**Settings (Dexie):** business name, owner/tech name, phone, optional `referral_note`, `helpers[]` (max 2), products picklist (grouped), theme override.

- Text-only outputs in v1
- Per job: optional `assistant_tech` override

---

## 10. Customers & repeat jobs

- Local `customers[]` with `vehicles[]` (duplicate vehicles allowed)
- **Repeat service:** clone tier, addons, vehicle/customer fields; **fresh intake always**
- Optional `visit_count`

---

## 11. Parallel hints (v1)

Static `parallel_hints[]` on steps — collapsible panel on **active step card** only. No timers.

---

## 12. Customer handoff documents

- **Maintenance:** optional short snippet
- **Refresh / Showroom:** auto-generated text care sheet from `care_templates.json` + tier + addons + product picklist
- Picklist: `products.defaults.json` → editable grouped settings; generic placeholders in repo
- Store on job: `care_sheet_generated_at`, content
- Share: copy / OS share sheet

---

## 13. Backup & export

- Manual export job / export all: JSON + optional ZIP (photos), `export_version: 1`
- Non-blocking post-delivery backup prompt
- **Import** supported in Phase 1

---

## 14. Photo storage

- Resize long edge **1920px**, JPEG **0.82**, EXIF stripped
- Thumbnails **256px**
- Warn **40MB**/job; hard cap **80MB**/job
- Storage estimate in Job History

---

## 15. Step library

- Single `master_steps.json` (~55–75 executable steps target)
- `sop_version` pinned on job at create (`YYYY.MM.patch`); no auto-migration in v1
- Template vs instance: `template_id` + `step_instance_id` (ULID)
- Step metadata minimum: `id`, `slot`, `category`, `name`, `instructions`, `tiers[]`, `branches[]`, `dependencies[]`, `optional`, `enabled`, `phase`, `estimated_minutes` (min/max), `photo_required`, `qc_gate`, `parallel_hints[]`
- Refer-out: job-level workflow, not steps
- Reserved namespaces: `corr_`, `coat_`, `sand_` (disabled in v1)

---

## 16. Tech stack

| Layer | Choice |
|-------|--------|
| Build | Vite + React + TypeScript |
| UI | Tailwind |
| State | Zustand |
| Storage | Dexie (IndexedDB) |
| IDs | ULID |
| PWA | vite-plugin-pwa, offline-first |
| Tests | Vitest — generator fixtures + QC rework mapping (~15–25 fixtures) |
| CI | GitHub Actions on push |
| Deploy | Static (Netlify / Cloudflare Pages) |
| Auth / backend | None in Phase 1 |

### Screens (Phase 1 only)

1. New Job  
2. Intake  
3. Active Checklist  
4. QC  
5. Delivery  
6. Job History  

### Theme

System preference + manual override in Settings. High-contrast deferred to v1.1.

### QC color coding

| Color | Meaning |
|-------|---------|
| Green | Complete |
| Yellow | In progress |
| Red | Failed QA |
| Blue | Optional upsell |
| Gray | Locked dependency |

---

## 17. Explicitly deferred

- CRM, booking integrations, cloud sync, customer portals
- Auth, multi-tenant, franchise metrics
- AI / computer vision
- Correction, ceramic, wet sand (as sold work)
- Supervisor role, dedicated bays, parallel Tech A/B
- PTG, battery, weather gates (standard intake)
- High-contrast mode (v1.1)
- Active dwell timer engine (v1.1+)
- Ozone auto-inject

### Phase 2 (ordered after 50-job metric)

1. SOP engine hardening (in progress)  
2. Checklist UX  
3. Offline reliability  
4. QC / photo logic  
5. Customer approval links  
6. Cloud sync  
7. CRM / quoting / labor prediction  

---

## 18. Decision log (interview)

| # | Topic | Choice |
|---|-------|--------|
| 1 | Operating model | Solo mobile |
| 2 | Service location | 100% customer site |
| 3 | Initial tier scope | Evolved to 3-tier product (see §2) |
| 4–5 | Packaging | 3 outcome tiers; Full Refresh default |
| 6 | Showroom v1 | Mobile Showroom (no correction/ceramic) |
| 7 | Upholstery | Booking + intake override; mixed branch; material_tags |
| 8 | Workflow | Universal slot template (engine → slot 3) |
| 9 | QC | Two-pass; tiered photos |
| 10 | Intake | Tier-scaled + universal fields |
| 11 | Condition flags | Per-tier inject/upsell/warn/block table |
| 12 | Blocks/approvals | Mold/bio hard; customer approval for upsells |
| 13–14 | Software / library | Phase 1 PWA; ~55–75 steps; single JSON |
| 15 | Add-ons | Hybrid pre-sold at New Job |
| 16 | Generator | Pipeline C; warn = banner only |
| 17 | primary_goal | B + D-lite expectation ack |
| 18 | Phase 1 approvals | Dual attest + evidence photo rules |
| 19 | Mid-job unlock | Append only; locked previews visible |
| 20 | Fresh-eyes | Soft 5min / enable at 2min |
| 21 | Tech stack | Vite/React/TS/Zustand/Dexie/PWA |
| 22 | Backup | Export/import + post-delivery prompt |
| 23 | Completed jobs | 24h reopen |
| 24 | Step undo | D (5min + reason) |
| 25 | Intake photos | Tier-scaled B |
| 26 | QC rework | Auto-reopen + abbreviated pass |
| 27 | Operator profile | Single local profile, text-only |
| 28 | SOP versioning | Pin on create |
| 29 | Repeat jobs | Customers + vehicles + repeat |
| 30 | Slot order | 14 slots; engine before wash |
| 31 | Parallel hints | Static on active step |
| 32 | Care sheets | D + B, picklist |
| 33 | Refer-out | C, fixed template |
| 34 | Photo storage | D compression + caps |
| 35 | Tests | Vitest + CI |
| 36 | Theme | System + toggle |
| 37 | Products | Grouped settings picklist |
| 38 | Job FSM | Strict + phase |
| 39 | Helper | Optional assistant_tech |
| 16 | Generator pipeline | C — additive merge; `warn` = banner only |
| 17 | primary_goal | B + D-lite; Maintenance expectation ack for 4 goals |
| 18 | Phase 1 approvals | D — attest + evidence photo thresholds |
| 19 | Mid-job unlock | C — append only; locked previews visible |
| 20 | Fresh-eyes pause | B — 5 min, enable at 2 min, skip + reason |
| 21 | Tech stack | Vite/React/TS/Zustand/Dexie/PWA |
| 22 | Backup | B + C — export/import + post-delivery prompt |
| 23 | Completed jobs | 24h reopen window |
| 24 | Step undo | D — 5 min free, then reason |
| 25 | Intake photos | Tier-scaled B; odometer at QC only |
| 26 | QC rework | Auto-reopen + abbreviated second pass |
| 27 | Operator profile | Single local profile, text-only |
| 28 | SOP versioning | Pin `sop_version` on job create |
| 29 | Repeat jobs | Saved customers + vehicles + repeat |
| 30 | Slot order | 14 slots; **engine slot 3 (before wash)** |
| 31 | Parallel hints | Static on active step card |
| 32 | Care sheets | D + B; product picklist |
| 33 | Mold/bio refer-out | Fixed template + customer attest |
| 34 | Photo storage | 1920px / 0.82 / 40MB warn / 80MB cap |
| 35 | Tests | Vitest + GitHub Actions CI |
| 36 | UI theme | System + manual toggle |
| 37 | Product picklist | Grouped settings, seeded defaults |
| 38 | Job FSM | Strict + phase; rescheduled = declined + reason |
| 39 | Helper | Optional assistant_tech; max 2 helpers |
| 40 | Delivery | Spec committed; scaffold in repo |

---

## 19. Original plan mapping

The seed audit (missing steps, unsafe practices, terminology, franchise/AI) informed this spec. Adopted: slot workflow, branch logic, QC rigor, professional naming. Reshaped: 4-tier shop model → 3-tier mobile product; shop/franchise/supervisor removed from v1.
