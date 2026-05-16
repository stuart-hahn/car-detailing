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
| Swipe-to-complete, dependency locks, undo, Dexie jobs/photos/settings, New Job, Intake, Checklist screens, QC screens — work_complete → photos → fresh-eyes → delivery QC; rework loop | Export/import, master_steps.json |

Details: [docs/context/BACKLOG.md](docs/context/BACKLOG.md)

## Session end (required)

1. Update [BACKLOG.md](docs/context/BACKLOG.md) (+ topic/CODEMAP if you changed architecture).
2. Run `npm run agent:finish -- -m "your message"` (test + build + sync AGENTS + commit).
3. Read [docs/context/DISCOVERY_MAINTENANCE.md](docs/context/DISCOVERY_MAINTENANCE.md) when unsure what to edit.

**Auto:** pre-commit refreshes this file from BACKLOG + git log; Cursor `stop` hook commits dirty work unless `.cursor/no-auto-commit` exists.

## Handoff block (paste for subagents)

```
Role: Implementer
Goal: <one sentence>
Context: AGENTS.md → PROJECT_CONTEXT.md → docs/INDEX.md topic
Scope in: <paths>
Scope out: PHASE1_SPEC unless spec conflict
Verify: npm test && npm run build
Done means: <verifiable>
Finish: npm run agent:finish -- -m "<message>"
```

## Commits (recent)

- `4cc4f9e` Add agent auto-sync, git hooks, and discovery maintenance docs.
- `9e537c6` Fix QC gate ignoring locked unsold upsell steps.
- `2190ecf` Add two-pass QC screens with rework and fresh-eyes flow.
- `52136ab` docs: progressive discovery for agents
- `4f0831f` Add swipe-to-complete checklist and step undo policy.
- `fb39d4f` Add full intake gates, photos, and refer-out flow.
- `90476a5` Document interview decisions 16–39 in Phase 1 spec.
