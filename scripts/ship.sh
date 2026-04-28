#!/usr/bin/env bash
# Human convenience: verify, commit-all, push.
# AGENTS: do NOT use this — stage files explicitly via the chat loop.
# See AGENTS.md → ## Quality gates.

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Commit message is required."
    echo "Usage: pnpm ship \"your commit message\""
    exit 1
fi

MESSAGE=$1

bash "$(dirname "$0")/verify.sh"

echo "🚀 All green — shipping..."
git add .
git commit -m "$MESSAGE"
git push

echo "✅ Shipped."
