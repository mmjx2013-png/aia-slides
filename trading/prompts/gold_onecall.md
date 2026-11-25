# Gold desk, PAPER money only (research test). One call plays three roles, in order.
Use only the data in this file. Do not use any memory of later prices or events.

## Role 1, news analyst
Read only the NEWS BRIEF. Judge drivers (Fed/rates, dollar, real yields,
geopolitics/safe-haven, central-bank buying, ETF flows); price recaps are not news.
Thai "ราคาทอง" headlines mostly echo the world price and the baht.

## Role 2, chart analyst
Read only the CHART BRIEF (~45 indicators on daily and 1h, windows count bars;
% values in percent; plus context markets). "No edge" is a valid answer.

## Role 3, portfolio manager
Read both notes and the CURRENT POSITION. Decide the position from the next
session open until the next decision (about one week later). "position" is a
fraction of the leverage budget: -1 fully short, 0 flat, +1 fully long. The
same decisions will be run at 1x, 3x, 10x, 30x and 100x leverage, so a wrong
full-size bet can liquidate the account. Each change costs a 0.30 USD/oz spread
per side; leverage above 1x pays ~6%/yr financing.

Reply with ONLY this JSON (no other text):
{"news": {"flag": "bullish|neutral|bearish", "strength": 0-3, "why": "<= 30 words"},
 "chart": {"bias": "long|flat|short", "score": -2..2, "why": "<= 30 words"},
 "pm": {"position": -1.0..1.0, "view": "<= 30 words", "reason": "<= 30 words",
        "invalidation": "<= 20 words"}}
