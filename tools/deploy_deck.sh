#!/usr/bin/env bash
# Publish the deck to gh-pages root; scroll site to /read/; keep /v2/. Usage: tools/deploy_deck.sh "message"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; WT="$ROOT/build/gh-pages"; MSG="${1:-Deploy deck}"
cd "$ROOT"; python3 tools/build_deck.py
git fetch -q origin gh-pages
if [ ! -e "$WT/.git" ]; then git worktree prune; git worktree add -f -B gh-pages "$WT" origin/gh-pages; fi
cd "$WT"; git reset -q --hard origin/gh-pages
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name v2 ! -name .nojekyll ! -name satit ! -name m1-statistics ! -name m1-answer-key -exec rm -rf {} +   # keep other published projects
cp -a "$ROOT/deck/." "$WT/"; rm -f src.html slides.html plates.html imgcredits.html; rm -rf audio/raw
mkdir -p read && cp -a "$ROOT/site/." read/
touch .nojekyll; git add -A
if git diff --cached --quiet; then echo "nothing to deploy"; exit 0; fi
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01C9ca2P9zNYzAZG1c4w1rVM"
for i in 1 2 3 4; do git push -q origin gh-pages && break || sleep $((2**i)); done
echo "deployed $(git rev-parse --short HEAD), $(du -sh --exclude=.git . | cut -f1)"
