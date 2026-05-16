# Topic: QC + delivery

**L1:** [PROJECT_CONTEXT.md](../context/PROJECT_CONTEXT.md) · **Logic stub:** `lib/qc/rework.ts`

## Spec flow (implement next)

```text
qc_work_complete → fail? rework (abbreviated pass) → pass
→ final photos (tier profile counts)
→ fresh-eyes 5min (enable delivery at 2min, skip+reason)
→ qc_delivery → handoff + care sheet
```

## Photo profiles

| Tier | Count |
|------|-------|
| maintenance | 4 |
| refresh | ~10 |
| showroom | ~20 |

## Rework mapping (exists)

`QC_REWORK_MAPPINGS` — fail_code → reopen slots/templates.  
`applyQcRework()` sets `needs_rework`, blocks delivery until cleared.

## Fresh-eyes

Soft prompt only (B) — not hard gate entire 5 min.

## L3

PHASE1_SPEC §5–6 for full QC + escalation rules.

## Done means

- QC screen(s) wired to job phase `qc_work`; delivery handoff on **Delivery** screen  
- Failed work QC reopens steps + blocks delivery photos  
- Tests for rework + photo gate counts

**Delivery screen:** `DeliveryScreen.tsx` — walkthrough steps, care sheet, `startDeliveryQc` / `completeDeliveryQc`.
