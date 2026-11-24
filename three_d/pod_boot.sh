#!/usr/bin/env bash
# Boot script for the rented GPU pod. It serves build/ under a secret path (POD_TOKEN), renders
# everything with pod_run.sh, packs the result, keeps serving for a while, then stops the pod.
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
  ( sleep "$MAX_SECONDS"; touch build/STOP; log "time limit reached"; pkill -f three_d/render.py ) &
  for try in 1 2 3; do
    [ -f build/STOP ] && break
    SAMPLES="${SAMPLES:-}" bash three_d/pod_run.sh >> build/pod.log 2>&1 && break
    log "pod_run.sh did not finish (try $try)"; sleep 15
  done
  if [ ! -f build/seq.tar ]; then
    log "packing what exists"
    ( .venv/bin/python tools/encode_frames.py && .venv/bin/python three_d/export_meta.py \
      && tar -cf build/seq.tar site/assets/seq $(ls build/stills/*.png 2>/dev/null) ) >> build/pod.log 2>&1
  fi
  touch build/FINISHED
  log "finished: $(ls build/frames 2>/dev/null | grep -c '^f_') frames, seq.tar $(du -h build/seq.tar 2>/dev/null | cut -f1)"
fi
log "serving for ${SERVE_AFTER}s"
sleep "$SERVE_AFTER"
stop_pod
