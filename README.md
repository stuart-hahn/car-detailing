# car-detailing

Offline-first mobile detailing SOP checklist (Phase 1 PWA).

## Documentation

- **[PHASE1_SPEC.md](./PHASE1_SPEC.md)** — Locked product and architecture decisions from design interview.

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
npm test         # generator + QC tests
npm run build    # production build
```

## Phase 1 status

- [x] Spec document
- [x] Checklist generator (pipeline C)
- [x] Master steps skeleton (~30 templates; expand toward 55–75)
- [x] Dexie schema + job store scaffold
- [x] Six-screen UI shell
- [ ] Full intake gates, QC, photos, export/import
- [ ] Complete step library content

## Success metric

50 real jobs completed without SOP breakdown, data loss, or checklist friction.
