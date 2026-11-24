#!/usr/bin/env bash
# pod_run.sh - render the slide deck's stills and clips on a rented GPU machine, start to finish.
#
#   git clone --depth 1 -b <branch> <repo> aia-slides && cd aia-slides && bash three_d/pod_run.sh
#
# For a fresh Ubuntu 22.04 / 24.04 CUDA container, run as root, no Blender installed.
# Safe to re-run after an interruption: every step skips what is already there
# (the venv, the downloaded scans, images that exist, clips already encoded).
# One render chain per GPU (nvidia-smi -L), each with its own share of the work.
#
# Renders, all at 1920x1080 (the shot list is three_d/shots.py), in this order:
#   build/stills/NAME.png            every still
#   build/stills/clay_NAME.png       the clay pass of hall_wide and form_final
#   build/clips/NAME/f_%04d.png      every clip, 150 frames at 30 fps  ->  build/clips/NAME.mp4
# then packs build/slides.tar (stills, clay stills, the mp4 clips; PNG frames instead for a clip
# whose mp4 could not be made) and prints POD_DONE.
# If build/STOP exists (a time limit set by whoever launched this), rendering is skipped or cut
# short and whatever exists is encoded and packed.
#
# Optional environment: QUALITY (final), DEVICE (OPTIX), SAMPLES (stills; unset = the preset's 160),
#   CLIP_SAMPLES (64), BPY_VERSION (5.3.0), STILLS / CLIPS (comma lists; default ALL), CLAY, RES.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
QUALITY="${QUALITY:-final}"
DEVICE="${DEVICE:-OPTIX}"
STILLS="${STILLS:-ALL}"
CLIPS="${CLIPS:-ALL}"
CLAY="${CLAY:-hall_wide,form_final}"
CLIP_SAMPLES="${CLIP_SAMPLES:-64}"
RES="${RES:-1920x1080}"
ROBE="site/assets/photos/met-76731-cut-1068.webp"
export DEBIAN_FRONTEND=noninteractive
mkdir -p build/stills build/clips

[ -f "$ROBE" ] || { echo "[pod] $ROBE is not in this checkout: the robe on the iko needs it"; exit 1; }

echo "[pod] 1/7 system libraries"
LIBS="libxi6 libxkbcommon0 libgl1 libegl1 libsm6 libice6 libx11-6 libxext6 libxrender1 libxfixes3 libxxf86vm1 libgomp1"
# shellcheck disable=SC2086
if ! dpkg -s $LIBS >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y --no-install-recommends $LIBS ca-certificates curl
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  (apt-get update -y && apt-get install -y --no-install-recommends ffmpeg) \
    || echo "[pod] ffmpeg could not be installed; clips will stay as PNG frames"
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

echo "[pod] 3/7 scans (Poly Haven, CC0) and the drawn textiles"
"$PY" three_d/fetch_assets.py
# draw the textile images once, before several render processes would all try to write them
"$PY" -c "import sys; sys.path.insert(0, 'three_d'); import common; print(common.design_image()); print(common.obi_image())"

echo "[pod] 4/7 render stills, clay pass and clips ($QUALITY, $DEVICE, $RES)"
SARGS=()
[ -n "${SAMPLES:-}" ] && SARGS+=(--samples "$SAMPLES")
R=("$PY" three_d/render.py --quality "$QUALITY" --device "$DEVICE" --res "$RES" --only-missing)
if [ -f build/STOP ]; then
  echo "[pod]   build/STOP exists: not rendering, packing what exists"
else
  NGPU=$(nvidia-smi -L 2>/dev/null | grep -c . || true)
  if [ "$DEVICE" = "CPU" ]; then NGPU=1; fi
  [ "${NGPU:-0}" -ge 1 ] || { echo "[pod] no GPU found by nvidia-smi"; exit 1; }
  PIDS=()
  for ((k = 0; k < NGPU; k++)); do
    (
      export CUDA_VISIBLE_DEVICES=$k
      "${R[@]}" --shot "$STILLS" --shard "$k/$NGPU" "${SARGS[@]}"
      if [ "$k" -eq 0 ] && [ -n "$CLAY" ]; then
        "${R[@]}" --shot "$CLAY" --clay --prefix clay_ "${SARGS[@]}"
      fi
      if [ -n "$CLIPS" ] && [ "$CLIPS" != "NONE" ]; then
        "${R[@]}" --shot "$CLIPS" --clip --samples "$CLIP_SAMPLES" --shard "$k/$NGPU"
      fi
    ) >>"build/render_gpu$k.log" 2>&1 &
    PIDS+=($!)
    echo "[pod]   GPU $k: pid $! -> build/render_gpu$k.log"
  done
  FAIL=0
  for p in "${PIDS[@]}"; do wait "$p" || FAIL=1; done
  if [ "$FAIL" -ne 0 ] && [ ! -f build/STOP ]; then
    echo "[pod] a render process failed; see build/render_gpu*.log. Re-run this script to continue."
    tail -n 5 build/render_gpu*.log || true
    exit 1
  fi
  if [ ! -f build/STOP ]; then          # anything a share left undone
    "${R[@]}" --shot "$STILLS" "${SARGS[@]}" >>build/render_gpu0.log 2>&1
    if [ -n "$CLIPS" ] && [ "$CLIPS" != "NONE" ]; then
      "${R[@]}" --shot "$CLIPS" --clip --samples "$CLIP_SAMPLES" >>build/render_gpu0.log 2>&1
    fi
  fi
fi
echo "[pod] 5/7 stills: $(ls build/stills | grep -c '\.png$' || true)"
ls build/stills

echo "[pod] 6/7 encode the clips"
LIST=()
for f in build/stills/*.png; do
  if [ -f "$f" ]; then LIST+=("$f"); fi
done
for d in build/clips/*/; do
  [ -d "$d" ] || continue
  n=$(basename "$d")
  count=$(ls "$d" | grep -c '^f_[0-9]\{4\}\.png$' || true)
  mp4="build/clips/$n.mp4"
  if command -v ffmpeg >/dev/null 2>&1 && [ "$count" -ge 150 ]; then
    if [ ! -s "$mp4" ] || [ "$mp4" -ot "${d}f_0149.png" ]; then
      if ffmpeg -y -loglevel error -framerate 30 -i "${d}f_%04d.png" -c:v libx264 -crf 16 -pix_fmt yuv420p \
        -movflags +faststart "build/clips/$n.tmp.mp4"; then mv -f "build/clips/$n.tmp.mp4" "$mp4"; fi
    fi
  fi
  if [ -s "$mp4" ]; then
    LIST+=("$mp4"); echo "[pod]   $n: $count frames, mp4 ok"
  elif [ "$count" -gt 0 ]; then
    LIST+=("${d%/}"); echo "[pod]   $n: $count frames, no mp4 (frames packed)"
  fi
done

echo "[pod] 7/7 pack"
if [ "${#LIST[@]}" -eq 0 ]; then echo "[pod] nothing was rendered"; exit 1; fi
tar -cf build/slides.tar "${LIST[@]}"
ls -la build/slides.tar
echo "POD_DONE"
