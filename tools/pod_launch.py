#!/usr/bin/env python3
"""Rent ONE Community GPU pod on RunPod, render the slide deck's stills and clips, and fetch them.

  python3 tools/pod_launch.py            create the pod (cheapest in-stock card per frame, under the cap)
  python3 tools/pod_launch.py status     pod state from RunPod, plus the pod's own status page
  python3 tools/pod_launch.py fetch      download build/slides.tar from the pod and unpack it into build/out/
  python3 tools/pod_launch.py terminate  terminate THIS pod (only the one recorded in build/pod_create.json)

Needs: RunPod GraphQL reachable at api.runpod.io with the key injected by the proxy (or RUNPOD_API_KEY
set), and, for status/fetch, the host <podId>-8000.proxy.runpod.net allowed by the network policy.
The pod clones the public branch, runs three_d/pod_boot.sh, serves its results under a random token,
and stops itself when the result has been fetched or after SERVE minutes. It never touches other pods.
Cost per frame = hourly price / Cycles OptiX score (Blender Open Data, rounded)."""
import json, subprocess, pathlib, time, secrets, sys, os

ROOT = pathlib.Path(__file__).resolve().parent.parent
B = ROOT / "build"          # git-ignored: the token and the pod record stay out of the repository
B.mkdir(exist_ok=True)
REC = B / "pod_create.json"
BRANCH = os.environ.get("POD_BRANCH", "claude/fervent-ramanujan-qp1d26")
REPO = "https://github.com/mmjx2013-png/aia-slides.git"
API = "https://api.runpod.io/graphql"
# id, $/h (Community, 24 Nov 2026), Cycles score
CARDS = [("NVIDIA GeForce RTX 4090", 0.34, 12500), ("NVIDIA GeForce RTX 4070 Ti", 0.19, 7300),
         ("NVIDIA GeForce RTX 4080 SUPER", 0.28, 9000), ("NVIDIA GeForce RTX 3080 Ti", 0.18, 5800),
         ("NVIDIA RTX A5000", 0.16, 4900), ("NVIDIA GeForce RTX 5080", 0.39, 11000),
         ("NVIDIA GeForce RTX 3090", 0.22, 6000), ("NVIDIA RTX 4000 Ada Generation", 0.20, 5000),
         ("NVIDIA GeForce RTX 3090 Ti", 0.27, 6500), ("NVIDIA GeForce RTX 5090", 0.69, 15500),
         ("NVIDIA RTX A6000", 0.33, 5600)]
WORK_MID = float(os.environ.get("WORK_MID", 150))   # GPU-minutes on one RTX 4090 (estimate; set from the scene agent's report)
WORK_MAX = float(os.environ.get("WORK_MAX", 190))
SETUP, SERVE = 12.0, 60.0                           # minutes: boot + install; serving after the render if nobody fetches
CAP = float(os.environ.get("CAP", 2.30))            # dollars; the user's hard cap is 2.50


def gql(query, variables=None):
    cmd = ["curl", "-s", "-m", "90", "-X", "POST", API, "-H", "Content-Type: application/json"]
    if os.environ.get("RUNPOD_API_KEY"):
        cmd += ["-H", "Authorization: Bearer " + os.environ["RUNPOD_API_KEY"]]
    r = subprocess.run(cmd + ["-d", json.dumps({"query": query, "variables": variables or {}})], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {"errors": [{"message": r.stdout[:200] or r.stderr[:200]}]}


def create():
    if REC.exists():
        sys.exit(f"{REC} exists: a pod was already created. Use status / fetch / terminate, or delete the file.")
    token = secrets.token_hex(20)
    boot = ("bash -c \"cd /workspace && (test -d aia-slides || git clone --depth 1 -b %s %s) "
            "&& bash aia-slides/three_d/pod_boot.sh\"" % (BRANCH, REPO))
    q = "mutation D($input: PodFindAndDeployOnDemandInput!) { podFindAndDeployOnDemand(input: $input) { id name costPerHr machineId desiredStatus gpuCount } }"
    opts = []
    for gid, price, score in sorted(CARDS, key=lambda c: c[1] / c[2]):
        for n in (2, 1):
            mid = WORK_MID * 12500 / score / n; worst = WORK_MAX * 12500 / score / n
            cost_mid = price * n * (mid + SETUP + 15) / 60
            limit_min = min(worst * 1.1 + SETUP, (CAP / (price * n)) * 60 - 30)     # leave 30 minutes of serving inside the cap
            if cost_mid > CAP - 0.3 or limit_min < mid + SETUP:
                continue
            opts.append((gid, n, price, round(mid), round(cost_mid, 2), int(limit_min * 60)))
    for gid, n, price, mid, cost, mx in opts:
        serve_s = int(max(900, min(SERVE * 60, (CAP / (price * n)) * 3600 - mx)))
        inp = {"cloudType": "COMMUNITY", "gpuCount": n, "gpuTypeId": gid, "name": "kimono-render",
               "imageName": "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04", "dockerArgs": boot,
               "containerDiskInGb": 20, "volumeInGb": 20, "volumeMountPath": "/workspace", "ports": "8000/http",
               "minVcpuCount": 4, "minMemoryInGb": 15, "startJupyter": False, "startSsh": False,
               "env": [{"key": "POD_TOKEN", "value": token}, {"key": "MAX_SECONDS", "value": str(mx)},
                       {"key": "SERVE_AFTER", "value": str(serve_s)}, {"key": "NVIDIA_DRIVER_CAPABILITIES", "value": "all"}]}
        d = gql(q, {"input": inp})
        pod = (d.get("data") or {}).get("podFindAndDeployOnDemand")
        msg = "CREATED" if pod else ((d.get("errors") or [{}])[0].get("message", "?"))[:70]
        print(f"{gid} x{n}  ${price * n:.2f}/h  est {mid} min, ${cost}  -> {msg}")
        if pod:
            rec = {"pod": pod, "token": token, "gpu": gid, "gpus": n, "rate": price * n, "est_min": mid, "est_cost": cost,
                   "max_seconds": mx, "serve_after": serve_s, "created": time.time(),
                   "base": f"https://{pod['id']}-8000.proxy.runpod.net/{token}"}
            REC.write_text(json.dumps(rec, indent=1))
            print(f"pod {pod['id']}  rate ${price * n:.2f}/h  render limit {mx // 60} min  worst case ${price * n * (mx + serve_s) / 3600:.2f}")
            print(f"allow host: {pod['id']}-8000.proxy.runpod.net")
            print(f"status: {rec['base']}/status\nresult: {rec['base']}/slides.tar")
            return
        time.sleep(1.5)
    sys.exit("NO POD CREATED: nothing in stock inside the cap. Try again later.")


def rec():
    if not REC.exists():
        sys.exit("no build/pod_create.json: no pod was created from this checkout")
    return json.loads(REC.read_text())


def status():
    r = rec()
    d = gql("query P($id: String!) { pod(input: {podId: $id}) { id desiredStatus costPerHr runtime { uptimeInSeconds } } }", {"id": r["pod"]["id"]})
    p = (d.get("data") or {}).get("pod")
    print("RunPod:", p or d.get("errors"))
    if p and p.get("runtime"):
        up = p["runtime"]["uptimeInSeconds"]
        print(f"uptime {up // 60} min, spent about ${r['rate'] * up / 3600:.2f}")
    out = subprocess.run(["curl", "-s", "-m", "30", r["base"] + "/status"], capture_output=True, text=True).stdout
    print(out[:3000] or "(pod status page not reachable: not booted yet, or the proxy host is not allowed here)")


def fetch():
    r = rec()
    dst = B / "slides.tar"
    c = subprocess.run(["curl", "-f", "-s", "-S", "-m", "1800", "--retry", "3", "-o", str(dst), r["base"] + "/slides.tar"])
    if c.returncode != 0 or not dst.exists():
        sys.exit("fetch failed (is the render finished? is the proxy host allowed?)")
    (B / "out").mkdir(exist_ok=True)
    subprocess.run(["tar", "-xf", str(dst), "-C", str(B / "out")], check=True)
    print("unpacked into build/out/:", sorted(p.name for p in (B / "out").rglob("*") if p.is_file())[:60])


def terminate():
    r = rec()
    d = gql("mutation T($id: String!) { podTerminate(input: {podId: $id}) }", {"id": r["pod"]["id"]})
    print("terminate:", d)
    if "errors" not in d:
        up = time.time() - r["created"]
        print(f"upper bound on spend: ${r['rate'] * up / 3600:.2f} ({up / 60:.0f} min at ${r['rate']:.2f}/h)")
        REC.rename(B / "pod_done.json")


if __name__ == "__main__":
    {"status": status, "fetch": fetch, "terminate": terminate}.get(sys.argv[1] if len(sys.argv) > 1 else "", create)()
