# Topic: Intake gates

**L1:** [PROJECT_CONTEXT.md](../context/PROJECT_CONTEXT.md) · **UI:** `IntakeScreen.tsx` · **Logic:** `lib/intake/*`

## Gate rule

`SLOT_02 wheels` locked until `evaluateIntakeGate()` passes → `intake_complete`.

## Universal fields

Customer, phone, Y/M/M, plate, VIN?, tier, tech, upholstery, material_tags, damage_tags, personal-items ack, concern, intake photos, address, condition_flags, primary_goal.

## Photos (tier-scaled)

| Tier | Required |
|------|----------|
| maintenance | 4 corners |
| refresh | + 2 interior wide + close-up per damage + severity≥2 flags |
| showroom | + 4 panel macros + engine bay wide if showroom/engine addon |

Odometer **not** intake — QC only.

## Flags → generator

`deriveGeneratorFlags(intake)` — odor_1/2/3, pet_hair_light/severe + `condition_flag_ids`.

## Blocks

- mold/bio → `blocked_refer_out` → `ReferOutScreen` (no detail steps)  
- unsafe_environment → `blocked_unsafe`  

## Maintenance expectation ack

If tier=maintenance AND goal ∈ gloss/stain/odor/scratch removal → checkbox required.

## Store

`jobStore.updateIntake`, `completeIntake` — regenerates checklist after success.

## Tests

`lib/intake/gates.test.ts`
