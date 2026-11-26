"""Import path and data dir for the swing desk. Reuses the intraday modules (fetch with
1 request/min pacing, 1m cache, calendar guard, indicator library) with data in swing/data/.
PAPER ONLY."""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("INTRADAY_DATA", str(HERE / "data"))
for p in (HERE.parent / "intraday", HERE.parent):
    if str(p) not in sys.path:
        sys.path.insert(1, str(p))
