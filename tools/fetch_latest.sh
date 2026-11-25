#!/usr/bin/env bash
# Fetch recent market data for the paper-trading worker (its IP gets Yahoo 429) and push it.
# Usage: tools/fetch_latest.sh   -> prints the commit sha
set -euo pipefail
cd "$(dirname "$0")/.."
D=trading-data/latest; mkdir -p "$D"
get() { # symbol range interval file
  local q; q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1")
  for try in 1 2 3; do
    c=$(curl -s -m 30 -A "Mozilla/5.0" -o "$D/$4.json" -w "%{http_code}" "https://query1.finance.yahoo.com/v8/finance/chart/$q?range=$2&interval=$3") || c=000
    [ "$c" = "200" ] && { echo "$1 $3 ok"; sleep 2; return 0; }; sleep $((try*15))
  done; echo "$1 $3 FAILED ($c)"; rm -f "$D/$4.json"; return 1
}
get GC=F 60d 1h GC_F_1h; get GC=F 1y 1d GC_F_daily
get DX-Y.NYB 1y 1d DXY_daily; get ^TNX 1y 1d TNX_daily; get THB=X 1y 1d USDTHB_daily
get SI=F 1y 1d SI_F_daily; get ^GSPC 1y 1d SP500_daily; get GLD 1y 1d GLD_daily
git add "$D" tools/fetch_latest.sh
git commit -qm "Market data: latest gold snapshot $(date -u +%F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01C9ca2KN3JSyFyGevdABYip"
for i in 1 2 3 4; do git push -q origin claude/fervent-ramanujan-qp1d26 && break; sleep $((i*2)); done
git rev-parse --short HEAD
