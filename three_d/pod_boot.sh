#!/usr/bin/env bash
# Boot script for the rented GPU pod. It serves build/ under a secret path (POD_TOKEN), renders
# the slide deck's stills and clips with pod_run.sh (which packs build/slides.tar), keeps serving for a
# while, then stops the pod.
# A hard time limit protects the budget: when it is reached the renders are stopped and whatever
# exists is packed. If the pod is resumed later it only serves; it does not render again.
cd "$(dirname "$0")/.." || exit 1
mkdir -p build
MAX_SECONDS="${MAX_SECONDS:-9000}"      # render time limit
SERVE_AFTER="${SERVE_AFTER:-2700}"      # how long to keep serving once finished
log() { echo "[boot] $(date -u +%H:%M:%S) $*" >> build/pod.log; }
stop_pod() { log "stopping the pod"; runpodctl stop pod "$RUNPOD_POD_ID" >> build/pod.log 2>&1 || true; }

python3 three_d/pod_serve.py 8000 > /dev/null 2>&1 &

if [ ! -f build/FINISHED ]; then
  # at the time limit: build/STOP tells pod_run.sh to stop rendering and pack what exists
  ( sleep "$MAX_SECONDS"; touch build/STOP; log "time limit reached"
    pkill -f three_d/render.py; sleep 5; pkill -f three_d/render.py ) &
  for try in 1 2 3; do
    SAMPLES="${SAMPLES:-}" bash three_d/pod_run.sh >> build/pod.log 2>&1 && break
    log "pod_run.sh did not finish (try $try)"; sleep 15
  done
  if [ ! -f build/slides.tar ]; then
    log "packing what exists"
    # shellcheck disable=SC2046
    tar -cf build/slides.tar $(ls build/stills/*.png build/clips/*.mp4 2>/dev/null) \
      $(for d in build/clips/*/; do [ -d "$d" ] && [ ! -s "${d%/}.mp4" ] && echo "${d%/}"; done) >> build/pod.log 2>&1
  fi
  touch build/FINISHED
  log "finished: $(ls build/stills 2>/dev/null | grep -c '\.png$') stills, $(ls build/clips/*/f_*.png 2>/dev/null | wc -l) clip frames, $(ls build/clips/*.mp4 2>/dev/null | wc -l) mp4, slides.tar $(du -h build/slides.tar 2>/dev/null | cut -f1)"
fi
log "serving for ${SERVE_AFTER}s"
sleep "$SERVE_AFTER"
stop_pod
