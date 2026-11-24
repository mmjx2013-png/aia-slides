#!/usr/bin/env python3
"""Serve build/ over HTTP under a secret path, so the frames can be fetched from the pod.
  POD_TOKEN=<random> python3 three_d/pod_serve.py [port]
  GET /<token>/status         -> last lines of the render logs and what exists
  GET /<token>/seq.tar        -> the packed result (any file under build/ works)
Anything without the token gets 404."""
import http.server, os, sys, pathlib, subprocess, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent / "build"
TOKEN = os.environ.get("POD_TOKEN", "")
if len(TOKEN) < 16:
    sys.exit("POD_TOKEN missing or too short")


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if not path.startswith(f"/{TOKEN}/"):
            self.send_error(404); return
        rel = path[len(TOKEN) + 2:]
        if rel == "status":
            out = []
            n = len(list((ROOT / "frames").glob("f_*.png"))) if (ROOT / "frames").exists() else 0
            out.append(f"frames: {n}  seq.tar: {(ROOT / 'seq.tar').exists()}")
            for name in ("pod.log", "render_gpu0.log", "render_gpu1.log", "render_gpu2.log", "render_gpu3.log", "render_clay.log"):
                p = ROOT / name
                if p.exists():
                    tail = subprocess.run(["tail", "-n", "6", str(p)], capture_output=True, text=True).stdout
                    out.append(f"--- {name}\n{tail}")
            body = "\n".join(out).encode()
            self.send_response(200); self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        self.path = "/" + rel
        return super().do_GET()

    def log_message(self, *a):
        pass


os.chdir(ROOT)
http.server.ThreadingHTTPServer(("0.0.0.0", int(sys.argv[1]) if len(sys.argv) > 1 else 8000), H).serve_forever()
