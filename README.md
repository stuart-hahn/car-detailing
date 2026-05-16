# car-detailing

Offline-first mobile detailing SOP checklist (Phase 1 PWA).

## For AI agents

**Start here:** [AGENTS.md](./AGENTS.md) → [docs/INDEX.md](./docs/INDEX.md) (progressive discovery; avoids loading full spec).

## Documentation

| Doc | Purpose |
|-----|---------|
| [AGENTS.md](./AGENTS.md) | Router — read first |
| [docs/context/PROJECT_CONTEXT.md](./docs/context/PROJECT_CONTEXT.md) | Compressed L1 context |
| [docs/INDEX.md](./docs/INDEX.md) | Task → topic file map |
| [PHASE1_SPEC.md](./PHASE1_SPEC.md) | Full spec (L3 — use sparingly) |

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Zustand + Dexie (IndexedDB)
- vite-plugin-pwa
- Vitest

## Commands

```bash
npm install
npm run dev      # local dev server
npm test         # generator + intake + undo + QC rework tests
npm run build    # production build
```

## Phase 1 status

See [docs/context/BACKLOG.md](./docs/context/BACKLOG.md).

## Success metric

50 real jobs completed without SOP breakdown, data loss, or checklist friction.
