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
| 24h job reopen — reason required, delivery reset, immutable after window; history + delivery UI, PR1 — Job shell, 3-tab nav, phase router, launch A+D, one-job gate, kill 7-tab nav, PR2 — CSS vars, field palette, theme wired, Settings + Export/Import, PR3 — Checklist D — up-next focus card, collapsed done, scroll-anchor, hints on focus only, sticky “Go to QC” when `qcReady` | PR4 |

Details: [docs/context/BACKLOG.md](docs/context/BACKLOG.md)

## Session end (required)

1. Update [BACKLOG.md](docs/context/BACKLOG.md) (+ topic/CODEMAP if you changed architecture).
2. Run `npm run agent:finish` (test + build + sync AGENTS + auto-commit). Optional: `-m "override"`.
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
Finish: npm run agent:finish
```

## Commits (recent)

- `917ab2b` chore: sync AGENTS.md
- `c3d00e8` feat: job shell and navigation
- `d87d4dd` docs: update backlog
- `9762f96` chore: sync AGENTS.md
- `638eb08` docs: update progressive discovery
- `40caa07` chore: update AGENTS.md
- `0db9990` chore: sync AGENTS.md
- `535e51c` chore: update AGENTS.md
