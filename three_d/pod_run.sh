#!/usr/bin/env bash
# pod_run.sh - render the whole hall sequence on a rented GPU machine, start to finish.
#
#   git clone --depth 1 -b <branch> <repo> aia-slides && cd aia-slides && bash three_d/pod_run.sh
#
# For a fresh Ubuntu 22.04 / 24.04 CUDA container, run as root, no Blender installed.
# Safe to re-run after an interruption: every step skips what is already there
# (the venv, the downloaded scans, frames that exist, WebP files that are up to date).
# One render.py process per GPU (nvidia-smi -L), each with its own share of the frame list.
# Renders every frame 0-983 at 1920x1080 into build/frames, then the clay pass of frames 0, 329, 683.
# Ends with the line POD_DONE and leaves build/seq.tar: site/assets/seq (d/, m/, meta.json) plus
# build/stills/f_NNNN.png for frames 0, 329, 419, 491, 683, 773, 983 and build/stills/clay_NNNN.png.
#
# Optional environment: QUALITY (final), DEVICE (OPTIX), SAMPLES (unset = the preset's), BPY_VERSION (5.3.0),
#                       FRAME_ARGS (extra render.py arguments, e.g. "--start 0 --end 419").
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
QUALITY="${QUALITY:-final}"
DEVICE="${DEVICE:-OPTIX}"
STILLS="0 329 419 491 683 773 983"   # full-size PNG stills that go into the tar
CLAY="0,329,683"                     # clay pass (every object a flat random colour)
export DEBIAN_FRONTEND=noninteractive
mkdir -p build/frames build/stills

echo "[pod] 1/7 system libraries"
if ! dpkg -s libxi6 libxkbcommon0 libgl1 libegl1 libsm6 libxrender1 libxfixes3 >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y --no-install-recommends libxi6 libxkbcommon0 libgl1 libegl1 libsm6 libxrender1 \
    libxfixes3 ca-certificates curl
fi
echo "[pod] 2/7 python 3.13 with bpy"
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
if [ ! -x .venv/bin/python ] || ! .venv/bin/python -c "import bpy, numpy, PIL" >/dev/null 2>&1; then
  if ! command -v uv >/dev/null 2>&1; then
    pip install uv 2>/dev/null || pip install --break-system-packages uv 2>/dev/null \
      || pip3 install --break-system-packages uv 2>/dev/null \
      || { command -v curl >/dev/null 2>&1 || { apt-get update -y; apt-get install -y curl ca-certificates; }; \
           curl -LsSf https://astral.sh/uv/install.sh | sh; }
  fi
  uv venv -p 3.13 .venv
  uv pip install -p .venv/bin/python "bpy==${BPY_VERSION:-5.3.0}" numpy pillow
fi
PY="$ROOT/.venv/bin/python"
"$PY" -c "import bpy; print('[pod] bpy', bpy.app.version_string)"

echo "[pod] 3/7 scans (Poly Haven, CC0)"
"$PY" three_d/fetch_assets.py
# draw the textile images once, before several render processes would all try to write them
"$PY" -c "import sys; sys.path.insert(0, 'three_d'); import common; print(common.design_image()); print(common.obi_image())"

echo "[pod] 4/7 render ($QUALITY, $DEVICE)"
NGPU=$(nvidia-smi -L 2>/dev/null | grep -c . || true)
[ "${NGPU:-0}" -ge 1 ] || { echo "[pod] no GPU found by nvidia-smi"; exit 1; }
EXTRA=()
[ -n "${SAMPLES:-}" ] && EXTRA+=(--samples "$SAMPLES")
# shellcheck disable=SC2206
[ -n "${FRAME_ARGS:-}" ] && EXTRA+=(${FRAME_ARGS})
PIDS=()
for ((k = 0; k < NGPU; k++)); do
  CUDA_VISIBLE_DEVICES=$k nohup "$PY" three_d/render.py --quality "$QUALITY" --device "$DEVICE" \
    --priority --only-missing --shard "$k/$NGPU" "${EXTRA[@]}" >>"build/render_gpu$k.log" 2>&1 &
  PIDS+=($!)
  echo "[pod]   GPU $k: pid $! -> build/render_gpu$k.log"
done
FAIL=0
for p in "${PIDS[@]}"; do wait "$p" || FAIL=1; done
if [ "$FAIL" -ne 0 ]; then
  echo "[pod] a render process failed; see build/render_gpu*.log. Re-run this script to continue."
  tail -n 5 build/render_gpu*.log || true
  exit 1
fi
# a share can end early if its process died without an error code: make sure nothing is missing
"$PY" three_d/render.py --quality "$QUALITY" --device "$DEVICE" --priority --only-missing "${EXTRA[@]}" \
  >>build/render_gpu0.log 2>&1
echo "[pod]   $(ls build/frames | grep -c '^f_[0-9]\{4\}\.png$') frames in build/frames"
N_HAVE=$(ls build/frames | grep -c '^f_[0-9]\{4\}\.png$' || true)
if [ -z "${FRAME_ARGS:-}" ] && [ "$N_HAVE" -lt 984 ]; then
  echo "[pod] only $N_HAVE of 984 frames exist; see build/render_gpu*.log. Re-run this script to continue."
  exit 1
fi

echo "[pod] 5/7 stills and the clay pass"
for f in $STILLS; do
  n=$(printf 'f_%04d.png' "$f")
  [ -f "build/frames/$n" ] && cp -f "build/frames/$n" "build/stills/$n"
done
CUDA_VISIBLE_DEVICES=0 "$PY" three_d/render.py --quality "$QUALITY" --device "$DEVICE" --clay --prefix clay_ \
  --frames "$CLAY" --out build/stills --only-missing >>build/render_clay.log 2>&1
ls build/stills

echo "[pod] 6/7 encode + meta"
"$PY" tools/encode_frames.py
"$PY" three_d/export_meta.py

echo "[pod] 7/7 pack"
LIST=(site/assets/seq/d site/assets/seq/m site/assets/seq/meta.json)
for f in $STILLS; do
  n=$(printf 'build/stills/f_%04d.png' "$f")
  [ -f "$n" ] && LIST+=("$n")
done
for f in ${CLAY//,/ }; do
  n=$(printf 'build/stills/clay_%04d.png' "$f")
  [ -f "$n" ] && LIST+=("$n")
done
tar -cf build/seq.tar "${LIST[@]}"
ls -la build/seq.tar
echo "POD_DONE"
