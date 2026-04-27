#!/usr/bin/env bash
# Run the full quality-gate chain. Exits non-zero on the first failure.
# See AGENTS.md → ## Quality gates.

set -e

echo "🔍 Lint & format..."
pnpm check

echo "⌨️  Type check..."
pnpm check:types

echo "🏗  Build..."
pnpm build

echo "🧪 Unit tests..."
pnpm test

echo "🎭 E2E tests..."
pnpm test:e2e

echo "✅ All gates green."
