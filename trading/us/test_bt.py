"""Synthetic checks of bt.py (costs, next-open fills, no look-ahead). python3 test_bt.py"""
import numpy as np
import pandas as pd

import bt

idx = pd.bdate_range("2024-01-01", periods=6)
O = pd.DataFrame({"A": [100, 100, 110, 120, 130, 140.0]}, index=idx)
C = pd.DataFrame({"A": [100, 105, 115, 125, 135, 145.0]}, index=idx)
ok = 0


def check(name, cond):
    global ok
    ok += bool(cond)
    print(("PASS " if cond else "FAIL ") + name)


W = pd.DataFrame({"A": [0, 1, 1, 0, 0, 0.0]}, index=idx)       # decided on day-1 close -> buy day-2 open
eq, tr, paid = bt.simulate(W, O, C, idx[0], idx[-1])
q = (70 - 70 * bt.COMM / (1 + bt.COMM)) / (110 * (1 + bt.SLIP))
check("buy at the NEXT open (day 2, 110) with costs", abs(eq.iloc[2] - q * 115) < 1e-9)
sell = q * 130 * (1 - bt.SLIP) * (1 - bt.COMM - bt.SEC)
check("sell at the open after the exit signal (day 4, 130)", abs(eq.iloc[4] - sell) < 1e-9 and len(tr) == 1)
check("a signal on the last day never trades", abs(eq.iloc[-1] - eq.iloc[-2]) < 1e-12)
eq0, _, _ = bt.simulate(W, O, C, idx[0], idx[-1], costs=False)
check("costs reduce the result", eq0.iloc[-1] > eq.iloc[-1])
W2 = pd.DataFrame({"A": [1, 1, 1, 1, 1, 1.0]}, index=idx)
eq2, _, _ = bt.simulate(W2, O, C, idx[0], idx[-1])
check("buy and hold trades once (no drift trading)", abs(eq2.iloc[-1] / eq2.iloc[1] - 145 / 105) < 1e-9)
print(f"test_bt: {ok}/5 checks passed")
