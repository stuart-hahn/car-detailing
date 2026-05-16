#!/usr/bin/env bash
# Cursor stop hook: sync discovery docs and commit session work (opt-out: .cursor/no-auto-commit)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.cursor/no-auto-commit" ]]; then
  exit 0
fi

if git diff --quiet && git diff --cached --quiet; then
  exit 0
fi

MSG="$(node scripts/agent-sync.mjs suggest-message 2>/dev/null || echo "chore: agent session checkpoint")"
node scripts/agent-sync.mjs commit -m "$MSG" 2>/dev/null || {
  node scripts/agent-sync.mjs sync 2>/dev/null || true
  exit 0
}
exit 0
