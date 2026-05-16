# Topic: Checklist generator

**L1:** [PROJECT_CONTEXT.md](../context/PROJECT_CONTEXT.md) · **Code:** `src/lib/generator/index.ts`

## Input → output

```ts
{ tier, upholstery_type, material_zones?, flags[], pre_sold_addons[], approvals[], sop_version }
→ { generated_steps[], warn_banners[], blocked?, block_reason? }
```

## Pipeline (order matters)

1. BASE — tier + enabled + phase 1  
2. BRANCH upholstery — cloth/leather/mixed/unknown (unknown → cloth + warn)  
3. BRANCH flags — see `flag_behavior.json`  
4. ADDONS — `pre_sold_addons ∪ approvals`  
5. DEDUPE — one template; zone dupes for mixed  
6. EXCLUDE — mutual exclusive; drop reserved disabled  
7. BLOCK — mold/bio → empty steps + blocked  
8. SORT — slot_order → deps topo → priority  
9. INSTANTIATE — ULID per instance  

## Mid-job approval

`appendApprovedSteps()` — delta inject only; never reorder/delete completed.

## Showroom engine

`branch_engine` when `tier === showroom` OR `addon_engine_bay` presold.

## Tests

`src/lib/generator/generator.test.ts` — extend fixtures when changing rules.

## L3

PHASE1_SPEC §4 if behavior disputed.
