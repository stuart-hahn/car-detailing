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
| Export/import — JSON/ZIP + post-delivery backup prompt, master_steps.json — 58 phase-1 templates (55 executable), professional names, sop `2026.05.2`, Care sheet generator — tier-gated text, product picklist, copy/share; saved on job at delivery QC, Customer approval UI — dual on-site attest, evidence photo rules, grant/decline unlock via `appendApprovedSteps` | — |

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

- `18a77e3` feat: checklist generator changes
- `c80136f` chore: sync AGENTS.md commit log
- `00a84ef` feat: care sheet generator with tier-gated text and share
- `7270dc2` feat: QC screen updates
- `58b6267` chore: sync AGENTS.md commit log
- `165d893` feat: UI updates
- `aa3e4ef` chore: sync AGENTS.md commit log
- `a65cc50` feat: UI updates
