"""Create ONE Community render pod: the cheapest card per frame that is in stock, inside the $2.50 cap.
Cost per frame = hourly price / Cycles OptiX score (Blender Open Data, rounded). Writes pod_create.json."""
import json, subprocess, pathlib, time, secrets

S = pathlib.Path(__file__).resolve().parent.parent / 'build'   # git-ignored: the token and the pod record stay out of the repo
S.mkdir(exist_ok=True)
tokf = S / 'pod_token.txt'
token = tokf.read_text().strip() if tokf.exists() else secrets.token_hex(20)
tokf.write_text(token)
BRANCH = "claude/fervent-ramanujan-qp1d26"
boot = ("bash -c \"cd /workspace && (test -d aia-slides || git clone --depth 1 -b %s "
        "https://github.com/mmjx2013-png/aia-slides.git) && bash aia-slides/three_d/pod_boot.sh\"" % BRANCH)
Q = '''mutation Deploy($input: PodFindAndDeployOnDemandInput!) { podFindAndDeployOnDemand(input: $input) { id name imageName costPerHr machineId desiredStatus gpuCount } }'''
# id, $/h, score, VRAM
CARDS = [("NVIDIA GeForce RTX 4090", 0.34, 12500), ("NVIDIA GeForce RTX 4070 Ti", 0.19, 7300),
         ("NVIDIA GeForce RTX 4080 SUPER", 0.28, 9000), ("NVIDIA GeForce RTX 3080 Ti", 0.18, 5800),
         ("NVIDIA RTX A5000", 0.16, 4900), ("NVIDIA GeForce RTX 5080", 0.39, 11000),
         ("NVIDIA GeForce RTX 3090", 0.22, 6000), ("NVIDIA RTX 4000 Ada Generation", 0.20, 5000),
         ("NVIDIA GeForce RTX 3090 Ti", 0.27, 6500), ("NVIDIA GeForce RTX 5090", 0.69, 15500),
         ("NVIDIA RTX A6000", 0.33, 5600)]
WORK_MID, WORK_MAX = 122.0, 145.0        # GPU-minutes on one 4090 (the scene agent's estimate, unmeasured)
SETUP, SERVE = 12.0, 40.0                # minutes: boot + install, and serving after the render
CAP = 2.30                               # leave margin under the $2.50 cap
opts = []
for gid, price, score in sorted(CARDS, key=lambda c: c[1] / c[2]):
    for n in (2, 1):
        mid = WORK_MID * 12500 / score / n; worst = WORK_MAX * 12500 / score / n
        cost_mid = price * n * (mid + SETUP + SERVE) / 60
        limit_min = min(worst * 1.15 + SETUP, (CAP / (price * n)) * 60 - SERVE)   # render time limit incl. setup
        if cost_mid > 2.0 or limit_min < mid + SETUP:
            continue
        opts.append((gid, n, price, round(mid), round(cost_mid, 2), int(limit_min * 60)))
for gid, n, price, mid, cost, mx in opts:
    inp = {"cloudType": "COMMUNITY", "gpuCount": n, "gpuTypeId": gid, "name": "kimono-render",
           "imageName": "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04", "dockerArgs": boot,
           "containerDiskInGb": 20, "volumeInGb": 20, "volumeMountPath": "/workspace", "ports": "8000/http",
           "minVcpuCount": 4, "minMemoryInGb": 15, "startJupyter": False, "startSsh": False,
           "env": [{"key": "POD_TOKEN", "value": token}, {"key": "MAX_SECONDS", "value": str(mx)},
                   {"key": "SERVE_AFTER", "value": str(int(SERVE * 60))}, {"key": "NVIDIA_DRIVER_CAPABILITIES", "value": "all"}]}
    r = subprocess.run(["curl", "-s", "-m", "90", "-X", "POST", "https://api.runpod.io/graphql", "-H", "Content-Type: application/json",
                        "-d", json.dumps({"query": Q, "variables": {"input": inp}})], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except Exception:
        d = {}
    pod = (d.get("data") or {}).get("podFindAndDeployOnDemand")
    msg = "OK" if pod else ((d.get("errors") or [{}])[0].get("message", r.stdout[:80]))[:70]
    print(f"{gid} x{n}  ${price * n:.2f}/h  est {mid} min  est ${cost}  -> {msg}")
    if pod:
        (S / 'pod_create.json').write_text(json.dumps({"pod": pod, "gpu": gid, "gpus": n, "rate": price * n, "est_min": mid, "est_cost": cost,
                                                       "max_seconds": mx, "serve_after": int(SERVE * 60), "created": time.time()}))
        print(json.dumps(pod))
        break
    time.sleep(1.5)
else:
    print("NO POD CREATED")
