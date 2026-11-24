#!/usr/bin/env bash
# Boot script for the rented GPU pod (started by tools/pod_launch.py).
# It serves build/ under a secret path (POD_TOKEN, also written to the pod log), renders the slide
# deck's stills and clips with pod_run.sh (which packs build/slides.tar), then keeps serving until
# the tar has been fetched (plus a few minutes) or SERVE_AFTER seconds have passed, and stops the pod.
# A hard time limit protects the budget: when it is reached the renders are stopped and whatever is
# finished is packed. If the pod is resumed later it only serves; it does not render again.
cd "$(dirname "$0")/.." || exit 1
mkdir -p build
MAX_SECONDS="${MAX_SECONDS:-9000}"      # render time limit, seconds from boot
SERVE_AFTER="${SERVE_AFTER:-3600}"      # how long to keep serving once finished, if nobody fetches
log() { echo "[boot] $(date -u +%H:%M:%S) $*" | tee -a build/pod.log; }
stop_pod() { log "stopping the pod"; runpodctl stop pod "$RUNPOD_POD_ID" >> build/pod.log 2>&1 || true; }

log "pod $RUNPOD_POD_ID token $POD_TOKEN  status: /$POD_TOKEN/status  result: /$POD_TOKEN/slides.tar"
python3 three_d/pod_serve.py 8000 > /dev/null 2>&1 &

if [ ! -f build/FINISHED ]; then
  ( sleep "$MAX_SECONDS"; touch build/STOP; log "time limit reached"; pkill -f three_d/render.py ) &
  for try in 1 2 3; do
    [ -f build/STOP ] && break
    bash three_d/pod_run.sh >> build/pod.log 2>&1 && break
    log "pod_run.sh did not finish (try $try)"; sleep 15
  done
  if [ ! -f build/slides.tar ]; then
    log "packing what exists"
    ( cd build && tar -cf slides.tar $(ls -d out stills clips 2>/dev/null) ) >> build/pod.log 2>&1
  fi
  touch build/FINISHED
  log "finished: slides.tar $(du -h build/slides.tar 2>/dev/null | cut -f1)"
fi
log "serving for up to ${SERVE_AFTER}s"
for ((t = 0; t < SERVE_AFTER; t += 20)); do
  if [ -f build/FETCHED ]; then log "result was fetched; stopping in 5 minutes"; sleep 300; break; fi
  sleep 20
done
stop_pod
