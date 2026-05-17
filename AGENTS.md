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
| Customer approval UI — dual on-site attest, evidence photo rules, grant/decline unlock via `appendApprovedSteps`, Delivery screen — handoff steps, care sheet, delivery QC; QC routes to delivery after fresh-eyes, 24h job reopen — reason required, delivery reset, immutable after window; history + delivery UI, PR1 — Job shell, 3-tab nav, phase router, launch A+D, one-job gate, kill 7-tab nav | PR2 |

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

- `9fba2b0` feat: job shell — 3-tab nav, phase router, one-job gate (PR1)
- `bc3f990` feat: QC screen updates
- `30e4062` chore: sync AGENTS.md commit log
- `2bc4c5c` docs: UI/UX shell backlog (PR1–PR6)
- `e62705e` docs: update progressive discovery
- `2d83cf9` chore: update AGENTS.md
- `9518322` chore: update AGENTS.md
- `548f9b8` chore: update AGENTS.md
