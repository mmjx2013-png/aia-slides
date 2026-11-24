#!/usr/bin/env bash
# Publish site/ to the gh-pages branch (GitHub Pages). Usage: tools/deploy.sh "message"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT="$ROOT/build/gh-pages"
MSG="${1:-Deploy}"
cd "$ROOT"
git fetch -q origin gh-pages
if [ ! -d "$WT/.git" ] && [ ! -f "$WT/.git" ]; then
  git worktree prune
  git worktree add -f -B gh-pages "$WT" origin/gh-pages
fi
cd "$WT"
git reset -q --hard origin/gh-pages
# keep v2 reachable at /v2/
if [ ! -f v2/index.html ] && [ -f index.html ] && grep -q "Ten slides" index.html; then mkdir -p v2 && cp index.html v2/index.html; fi
rsync -a --delete --exclude '.git' --exclude 'v2' --exclude '.nojekyll' "$ROOT/site/" "$WT/"
touch .nojekyll
git add -A
if git diff --cached --quiet; then echo "nothing to deploy"; exit 0; fi
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "$MSG

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01C9ca2LWJQecMpu4urwi2sH"
for i in 1 2 3 4; do git push -q origin gh-pages && break || sleep $((2**i)); done
echo "deployed $(git rev-parse --short HEAD), $(du -sh --exclude=.git . | cut -f1)"
