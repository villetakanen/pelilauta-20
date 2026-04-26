#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# Check if commit message was provided
if [ -z "$1" ]; then
    echo "❌ Error: Commit message is required."
    echo "Usage: pnpm ship \"your commit message\""
    exit 1
fi

MESSAGE=$1

echo "🔍 Running lints..."
pnpm check

echo "⌨️ Checking types..."
pnpm check:types

echo "🏗 Building apps..."
pnpm build

echo "🧪 Running unit tests..."
pnpm test

echo "🎭 Running E2E tests..."
pnpm test:e2e

echo "🚀 Everything green! Shipping..."
git add .
git commit -m "$MESSAGE"
git push

echo "✅ Shipped successfully!"
