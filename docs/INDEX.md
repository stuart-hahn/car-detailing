# Progressive discovery index

Pick **one** L2 doc for your task. Open L3 (`PHASE1_SPEC.md`) only if L2 points you there or rules conflict.

## By task

| Task | Read |
|------|------|
| New feature / bug in checklist | [topics/checklist.md](topics/checklist.md) |
| Intake, flags, photos at intake | [topics/intake.md](topics/intake.md) |
| Generator, tiers, add-ons, branches | [topics/generator.md](topics/generator.md) |
| QC, delivery, rework | [topics/qc.md](topics/qc.md) |
| Dexie, types, job FSM | [topics/data-model.md](topics/data-model.md) |
| Product/tier/pricing decisions | [context/DECISIONS.md](context/DECISIONS.md) |
| File locations | [context/CODEMAP.md](context/CODEMAP.md) |
| What's shipped / TODO | [context/BACKLOG.md](context/BACKLOG.md) |

## Layer sizes (approx)

| File | Lines | Use |
|------|-------|-----|
| AGENTS.md | ~50 | Router |
| PROJECT_CONTEXT.md | ~120 | Default context |
| topics/*.md | ~40–80 each | One subsystem |
| DECISIONS.md | ~60 | Lookup #1–40 |
| CODEMAP.md | ~80 | Paths |
| PHASE1_SPEC.md | ~456 | Full spec — last resort |
