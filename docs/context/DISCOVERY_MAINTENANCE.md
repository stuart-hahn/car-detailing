# Maintaining progressive discovery (agents)

**Read when:** you ship a feature, add a screen/module, or change how agents should navigate docs.

**L0:** [AGENTS.md](../../AGENTS.md) · **Index:** [docs/INDEX.md](../INDEX.md)

## What gets updated automatically

| Trigger | Tool | Files |
|---------|------|--------|
| Every `git commit` | pre-commit hook → `npm run agent:sync` | `AGENTS.md` commits + Done/Next table (from [BACKLOG.md](BACKLOG.md)) |
| Cursor agent session ends | `.cursor/hooks/agent-stop.sh` | sync + commit if dirty (skip: touch `.cursor/no-auto-commit`) |
| Agent end-of-task (recommended) | `npm run agent:finish -- -m "…"` | verify + sync + commit |

`AGENTS.md` **Done vs next** is derived from BACKLOG — edit BACKLOG first, then run sync.

## What you must update manually

| Change | Update |
|--------|--------|
| Feature shipped | [BACKLOG.md](BACKLOG.md) — move item to Shipped `[x]` |
| New screen / major flow | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) UI table, [CODEMAP.md](CODEMAP.md), one [topics/](../topics/) file |
| New `src/lib/*` domain area | [CODEMAP.md](CODEMAP.md), add row to [INDEX.md](../INDEX.md) if new topic |
| Locked product decision | [DECISIONS.md](DECISIONS.md) (lookup only; don’t duplicate in topics) |
| Spec conflict / deep behavior | [PHASE1_SPEC.md](../../PHASE1_SPEC.md) **only** when L2 points to L3 |

## When to add or edit a topic doc (L2)

Add or expand `docs/topics/<name>.md` when:

- A subsystem has its own files, tests, and policies (e.g. `qc`, `intake`)
- An agent repeatedly opens PHASE1_SPEC for the same area — **compress** that section into the topic doc instead

Keep each topic **~40–80 lines**: flow diagram, key paths, done-means, pointer to L3.

## When NOT to bloat discovery

- Don’t mirror PHASE1_SPEC in topics — link to §sections
- Don’t log every commit in BACKLOG (hash optional on major milestones only)
- Don’t auto-edit CODEMAP from scripts — paths drift; update when you touch that layer

## Agent session checklist

1. Read AGENTS.md → PROJECT_CONTEXT.md → one INDEX topic
2. Implement + `npm test && npm run build`
3. Update BACKLOG (+ topic / CODEMAP / PROJECT_CONTEXT if needed)
4. `npm run agent:finish -- -m "feat: …"` (or let stop-hook commit for small sessions)
5. Confirm `npm run agent:check` passes (INDEX links valid)

## Commands

```bash
npm run hooks:install   # once per clone — enables pre-commit sync
npm run agent:sync      # refresh AGENTS.md only
npm run agent:check     # validate INDEX.md links
npm run agent:commit -- -m "message"
npm run agent:finish -- -m "message"   # test + build + commit
```

## Opt out of auto-commit on agent stop

```bash
touch .cursor/no-auto-commit
```

Use when iterating locally; still run `agent:finish` before handing off.
