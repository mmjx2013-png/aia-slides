"""Helper: save an agent's JSON answer for (run, date), log its tokens, and
build the next date's input. Usage: save_dec.py RUN DATE TOKENS NEXT_DATE|- < json"""
import json, sys
from pathlib import Path
import subprocess
run, date, tok, nxt = sys.argv[1:5]
D = Path(__file__).parent / "data" / "desk" / "gold1b"
txt = sys.stdin.read()
json.loads(txt[txt.find("{"):txt.rfind("}") + 1])        # must be valid JSON
(D / date / f"{run}.json").write_text(txt)
t = json.loads((D / "tokens.json").read_text())
t.setdefault(run, {})[date] = int(tok)
(D / "tokens.json").write_text(json.dumps(t, indent=1))
if nxt != "-":
    subprocess.run([sys.executable, str(Path(__file__).parent / "gold_desk.py"), "state", "--run", run, "--date", nxt])
