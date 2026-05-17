#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
chmod +x .githooks/pre-commit .cursor/hooks/agent-stop.sh 2>/dev/null || true
git config core.hooksPath .githooks
echo "Installed git hooks → .githooks (core.hooksPath)"
echo "Run: npm run agent:sync  |  npm run agent:finish"
