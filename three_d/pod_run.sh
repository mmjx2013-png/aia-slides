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
# Renders the final shot list of three_d/shots.py, all at 1920x1080:
#   build/stills/NAME.png            the nine stills, high samples
#   build/stills/clay_NAME.png       the clay pass of hall_wide_morning and kosode_iko
#   build/clips/NAME/f_%04d.png      the three clips, 270 frames at 30 fps, 64 samples, motion blur
# then encodes into build/out/:
#   stills/NAME.png + NAME.webp (quality 90), the clay stills likewise as clay_NAME
#   clips/NAME.mp4 (H.264, CRF 20, yuv420p, faststart) + NAME.webm (VP9, CRF 32)
# packs build/slides.tar (tar -cf build/slides.tar -C build/out .) and prints POD_DONE.
# If build/STOP exists (a time limit set by whoever launched this), rendering is skipped or cut
# short and whatever exists is encoded and packed (a clip that is not complete is left out).
#
# Optional environment: QUALITY (final), DEVICE (OPTIX), SAMPLES (stills: 384), THRESHOLD (stills:
#   0.006), CLIP_SAMPLES (64), BPY_VERSION (5.3.0), STILLS / CLIPS (comma lists; default ALL),
#   CLAY (hall_wide_morning,kosode_iko), RES, N_CLIP (270).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
QUALITY="${QUALITY:-final}"
DEVICE="${DEVICE:-OPTIX}"
STILLS="${STILLS:-ALL}"
CLIPS="${CLIPS:-ALL}"
CLAY="${CLAY:-hall_wide_morning,kosode_iko}"
SAMPLES="${SAMPLES:-384}"
THRESHOLD="${THRESHOLD:-0.006}"
N_CLIP="${N_CLIP:-270}"
CLIP_SAMPLES="${CLIP_SAMPLES:-64}"
RES="${RES:-1920x1080}"
ROBE="site/assets/photos/met-76731-cut-1068.webp"
export DEBIAN_FRONTEND=noninteractive
mkdir -p build/stills build/clips build/out/stills build/out/clips

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
    || echo "[pod] ffmpeg could not be installed; clips cannot be encoded"
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
SARGS=(--samples "$SAMPLES" --threshold "$THRESHOLD")
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

echo "[pod] 6/7 encode into build/out"
"$PY" - <<'PYEOF'
import glob, os
from PIL import Image
for src in sorted(glob.glob("build/stills/*.png")):
    name = os.path.basename(src)[:-4]
    png, webp = "build/out/stills/%s.png" % name, "build/out/stills/%s.webp" % name
    if not os.path.exists(webp) or os.path.getmtime(webp) < os.path.getmtime(src):
        im = Image.open(src).convert("RGB")
        im.save(png + ".tmp.png", optimize=True)
        os.replace(png + ".tmp.png", png)
        im.save(webp + ".tmp.webp", quality=90, method=6)
        os.replace(webp + ".tmp.webp", webp)
    print("[pod]   still %s" % name)
PYEOF
LAST=$(printf 'f_%04d.png' $((N_CLIP - 1)))
for d in build/clips/*/; do
  [ -d "$d" ] || continue
  n=$(basename "$d")
  count=$(ls "$d" | grep -c '^f_[0-9]\{4\}\.png$' || true)
  mp4="build/out/clips/$n.mp4"; webm="build/out/clips/$n.webm"
  if [ "$count" -lt "$N_CLIP" ]; then echo "[pod]   $n: $count of $N_CLIP frames, not encoded"; continue; fi
  if ! command -v ffmpeg >/dev/null 2>&1; then echo "[pod]   $n: no ffmpeg"; continue; fi
  if [ ! -s "$mp4" ] || [ "$mp4" -ot "$d$LAST" ]; then
    ffmpeg -y -loglevel error -framerate 30 -i "${d}f_%04d.png" -c:v libx264 -preset slow -crf 20 \
      -pix_fmt yuv420p -movflags +faststart "build/out/clips/$n.tmp.mp4" && mv -f "build/out/clips/$n.tmp.mp4" "$mp4"
  fi
  if [ ! -s "$webm" ] || [ "$webm" -ot "$d$LAST" ]; then
    ffmpeg -y -loglevel error -framerate 30 -i "${d}f_%04d.png" -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 \
      -pix_fmt yuv420p -an "build/out/clips/$n.tmp.webm" && mv -f "build/out/clips/$n.tmp.webm" "$webm"
  fi
  echo "[pod]   clip $n: $count frames$([ -s "$mp4" ] && echo ', mp4') $([ -s "$webm" ] && echo 'webm')"
done

echo "[pod] 7/7 pack"
if [ -z "$(find build/out -type f | head -n 1)" ]; then echo "[pod] nothing was rendered"; exit 1; fi
tar -cf build/slides.tar -C build/out .
tar -tf build/slides.tar | sort
ls -la build/slides.tar
echo "POD_DONE"
