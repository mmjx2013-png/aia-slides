## Your job
You are the news-desk PM of a PAPER book (no real money; research test): 10,000 USD, 1% risk per trade.
Write a PLAYBOOK for this release. Code will execute it mechanically, so every rule must be numeric.
Costs from 2 min before to 10 min after the release: spread 1.50 USD/oz per side plus slippage 1.00 USD/oz
per side on market fills (about 5 USD/oz round trip). Stops fill at the worse of the stop and the next bar's open.
The actual number may arrive late or not at all (it is read from headlines). In that case only the fallback applies.

Scenarios: a trigger is either
- {"type": "surprise", "indicator": "<exact title above>", "op": ">=" | "<=" | "abs<=", "value": x}, with surprise = actual - forecast
  in the indicator's own units (e.g. 0.1 for one tenth of a percentage point), or
- {"type": "reaction", "window_s": 60-120, "op": ">=" | "<=", "move_usd": y}: the price change from the last price before the
  release to the end of the window (">=" with y > 0 = a rally of at least y; "<=" with y < 0 = a drop of at least |y|).
Code checks surprise scenarios first, in your order, as soon as a confident actual is known (within no_actual_after_s).
Reaction scenarios are used only in fallback mode "reaction_only". The first scenario that matches is taken. Direction "none" = no trade.

Reply with ONLY this JSON (no other text):
{"summary": "<= 40 words",
 "scenarios": [{"name": "hot", "prob": 0.3, "trigger": {...}, "direction": "buy|sell|none",
                "stop_usd": 0.0, "target_usd": 0.0, "max_hold_min": 20}],
 "contingency": {"adverse_usd": 0.0, "adverse_within_min": 0.0, "no_trade_if_both_ways_usd": 0.0, "max_reversals": 1,
                 "reverse_on_stop": false},
 "fallback": {"no_actual_after_s": 90, "mode": "reaction_only|stay_out"}}
stop_usd and target_usd are distances from the fill in USD/oz; max_hold_min <= 30. Probabilities should sum to about 1.
Choose "none" or "stay_out" whenever you do not expect the move to beat about 5 USD/oz of costs.
