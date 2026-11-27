#!/usr/bin/env bash
# Weekly price refresh for the fund worker (its Yahoo calls are blocked). Pushes trading-data/fund-latest.tgz.
# Usage: tools/fetch_fund_prices.sh [extra tickers...]   -> prints the commit sha
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d); D="$T/fund-latest"; mkdir -p "$D"
LIST="SPYM VOO IVV SPY ADBE JBL FLEX MU LRCX NVDA ROST AAPL BBY MA LMT MCK THB=X $*"
ok=0; bad=""
for s in $LIST; do
  y=$(echo "$s" | tr '.' '-'); f=$(echo "$s" | tr '=.' '__'); c=000
  for t in 1 2 3; do
    c=$(curl -s -m 30 -A "Mozilla/5.0" -o "$D/$f.json" -w "%{http_code}" "https://query1.finance.yahoo.com/v8/finance/chart/$y?range=1y&interval=1d&events=div,split") || c=000
    [ "$c" = 200 ] && break; sleep $((t*15))
  done
  if [ "$c" = 200 ]; then ok=$((ok+1)); else bad="$bad $s($c)"; rm -f "$D/$f.json"; fi
  sleep 1.2
done
echo "ok=$ok bad=$bad" >&2
tar czf trading-data/fund-latest.tgz -C "$T" fund-latest; rm -rf "$T"
git add trading-data/fund-latest.tgz tools/fetch_fund_prices.sh
git commit -qm "Market data: weekly fund price refresh $(date -u +%F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01C9ca2KN3JSyFyGevdABYip"
for i in 1 2 3 4; do git push -q origin claude/fervent-ramanujan-qp1d26 && break; sleep $((i*2)); done
git rev-parse --short HEAD
