#!/usr/bin/env python3
"""Serve build/ over HTTP under a secret path, so the results can be fetched from the pod.
  POD_TOKEN=<random> python3 three_d/pod_serve.py [port]
  GET /<token>/status         -> what exists and the last lines of the logs
  GET /<token>/slides.tar     -> the packed result (any file under build/ works; Range requests are not needed)
Anything without the token gets 404. A complete download of slides.tar writes build/FETCHED."""
import http.server, os, sys, pathlib, subprocess, urllib.parse, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent / "build"
TOKEN = os.environ.get("POD_TOKEN", "")
if len(TOKEN) < 16:
    sys.exit("POD_TOKEN missing or too short")


class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if not path.startswith(f"/{TOKEN}/"):
            self.send_error(404); return
        rel = path[len(TOKEN) + 2:]
        if rel == "status":
            out = [f"slides.tar: {(ROOT / 'slides.tar').exists()}  finished: {(ROOT / 'FINISHED').exists()}  fetched: {(ROOT / 'FETCHED').exists()}"]
            for d in ("stills", "out/stills", "out/clips"):
                p = ROOT / d
                if p.exists():
                    out.append(f"{d}: {len(list(p.iterdir()))} files")
            for d in sorted((ROOT / "clips").glob("*")) if (ROOT / "clips").exists() else []:
                if d.is_dir():
                    out.append(f"clips/{d.name}: {len(list(d.glob('f_*.png')))} frames")
            for p in [ROOT / "pod.log"] + sorted(ROOT.glob("render_*.log")):
                if p.exists():
                    tail = subprocess.run(["tail", "-n", "6", str(p)], capture_output=True, text=True).stdout
                    out.append(f"--- {p.name}\n{tail}")
            body = "\n".join(out).encode()
            self.send_response(200); self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        f = (ROOT / rel).resolve()
        if ROOT.resolve() not in f.parents or not f.is_file():
            self.send_error(404); return
        self.send_response(200); self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(f.stat().st_size)); self.end_headers()
        with open(f, "rb") as fh:
            shutil.copyfileobj(fh, self.wfile, 1 << 20)
        if f.name == "slides.tar":
            (ROOT / "FETCHED").write_text("ok")

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1]) if len(sys.argv) > 1 else 8000), H).serve_forever()
