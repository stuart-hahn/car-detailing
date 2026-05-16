# Agent entry — car-detailing

**Do not load the full design interview or `PHASE1_SPEC.md` unless the task requires it.**

## Read order (progressive)

| Level | When | File |
|-------|------|------|
| **L0** | Always | This file (you are here) |
| **L1** | Any task | [docs/context/PROJECT_CONTEXT.md](docs/context/PROJECT_CONTEXT.md) |
| **L2** | Task-specific | One file from [docs/INDEX.md](docs/INDEX.md) |
| **L3** | Deep spec / disputes | [PHASE1_SPEC.md](PHASE1_SPEC.md) (456 lines — avoid by default) |

## Quick facts

- **Product:** Offline-first PWA — mobile detailing SOP checklist (solo operator, customer site).
- **Packages:** `maintenance` \| `refresh` (default) \| `showroom` (mobile v1, no correction/ceramic).
- **Stack:** Vite, React, TS, Zustand, Dexie, vitest, PWA.
- **Verify:** `npm test && npm run build`

## Done vs next

| Done | Next |
|------|------|
| Generator pipeline C, intake gates, swipe+undo, QC screens | export/import, step library expansion |

Details: [docs/context/BACKLOG.md](docs/context/BACKLOG.md)

## Handoff block (paste for subagents)

```
Role: Implementer
Goal: <one sentence>
Context: AGENTS.md → PROJECT_CONTEXT.md → docs/INDEX.md topic
Scope in: <paths>
Scope out: PHASE1_SPEC unless spec conflict
Verify: npm test && npm run build
Done means: <verifiable>
```

## Commits (recent)

- `9e537c6` fix locked upsell not blocking QC
- `2190ecf` QC screens (two-pass, rework, fresh-eyes)
- `4f0831f` swipe-to-complete + undo
- `fb39d4f` intake gates + refer-out
- `9081380` scaffold + PHASE1_SPEC
