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
# v4 (photographic pass): renders the deck's scoped shots with three_d/lookdev.py (render.py --vfx:
# light groups, translucent washi, soft sun, haze and beams) as multilayer EXR passes, and grades them
# with tools/comp.py (relight, air, lens, film, grain), all at 1920x1080:
#   build/stills/NAME.exr            the six stills, high samples (kept: re-gradable)
#   build/clips/NAME/f_%04d.exr      the three clips, 270 frames at 30 fps, motion blur; graded while the
#                                    GPU renders (build/clips/NAME_graded/f_%04d.png), each EXR deleted once
#                                    graded (disk); the renderer waits if more than VFX_MAX_PENDING pile up
# then into build/out/ (same names as renders/):
#   stills/NAME.webp (quality 90)
#   clips/NAME.mp4 (H.264, CRF 20, yuv420p, faststart) + NAME.webm (VP9, CRF 32)
# The clay passes are not re-rendered (CLAY empty); set CLAY=hall_wide_morning,kosode_iko for them.
# packs build/slides.tar (tar -cf build/slides.tar -C build/out .) and prints POD_DONE.
# If build/STOP exists (a time limit set by whoever launched this), rendering is skipped or cut
# short and whatever exists is encoded and packed (a clip that is not complete is left out).
#
# Optional environment: QUALITY (final), DEVICE (OPTIX), SAMPLES (stills: 384), THRESHOLD (stills:
#   0.006), CLIP_SAMPLES (48), BPY_VERSION (5.3.0), STILLS / CLIPS (comma lists; default: the deck's
#   scoped shots), CLAY (empty), RES, N_CLIP (270), VFX_MAX_PENDING (24), INCLUDE_EXR (0: 1 puts the
#   still EXRs in the tar too, about 0.5 GB).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
QUALITY="${QUALITY:-final}"
DEVICE="${DEVICE:-OPTIX}"
STILLS="${STILLS:-hall_wide_morning,kosode_iko,mannequin_final,mannequin_obi_back,sleeve_hem_props,hall_dusk}"
CLIPS="${CLIPS:-clip_hall_morning,clip_kosode_iko,clip_hall_dusk}"
CLAY="${CLAY:-}"
SAMPLES="${SAMPLES:-384}"
THRESHOLD="${THRESHOLD:-0.006}"
N_CLIP="${N_CLIP:-270}"
CLIP_SAMPLES="${CLIP_SAMPLES:-48}"
export VFX_MAX_PENDING="${VFX_MAX_PENDING:-24}"
INCLUDE_EXR="${INCLUDE_EXR:-0}"
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
if [ ! -x .venv/bin/python ] || ! .venv/bin/python -c "import bpy, numpy, PIL, scipy, OpenEXR" >/dev/null 2>&1; then
  if ! command -v uv >/dev/null 2>&1; then
    pip install uv 2>/dev/null || pip install --break-system-packages uv 2>/dev/null \
      || pip3 install --break-system-packages uv 2>/dev/null \
      || { command -v curl >/dev/null 2>&1 || { apt-get update -y; apt-get install -y curl ca-certificates; }; \
           curl -LsSf https://astral.sh/uv/install.sh | sh; }
  fi
  uv venv -p 3.13 .venv
  uv pip install -p .venv/bin/python "bpy==${BPY_VERSION:-5.3.0}" numpy pillow scipy OpenEXR
fi
PY="$ROOT/.venv/bin/python"
"$PY" -c "import bpy; print('[pod] bpy', bpy.app.version_string)"

echo "[pod] 3/7 scans (Poly Haven, CC0) and the drawn textiles"
"$PY" three_d/fetch_assets.py
# draw the textile images once, before several render processes would all try to write them
"$PY" -c "import sys; sys.path.insert(0, 'three_d'); import common; print(common.design_image()); print(common.obi_image())"

echo "[pod] 4/7 render stills, clay pass and clips ($QUALITY, $DEVICE, $RES)"
SARGS=(--samples "$SAMPLES" --threshold "$THRESHOLD")
R=("$PY" three_d/render.py --quality "$QUALITY" --device "$DEVICE" --res "$RES" --only-missing --vfx)
NCPU=$(nproc 2>/dev/null || echo 4)
GJOBS=$(( NCPU > 3 ? NCPU - 2 : 1 ))
grade_clips() {   # grade every clip frame that is ready (two stages, flicker guard), deleting graded EXRs
  local d n
  for d in build/clips/*/; do
    n=$(basename "$d"); case "$n" in *_graded) continue ;; esac
    nice -n 10 "$PY" tools/comp.py clip "build/clips/$n" "build/out/clips/$n" --shot "$n" --need "$N_CLIP" \
      --delete-exr --frames-only --jobs "$GJOBS" "$@" || echo "[pod] grading $n failed this pass"
  done
}
retry() {   # every render command resumes (--only-missing): if one dies, run it again, up to four times
  local n=0
  until "$@"; do
    n=$((n + 1))
    if [ "$n" -ge 4 ] || [ -f build/STOP ]; then return 1; fi
    echo "[pod] a render command died (attempt $n); resuming it"
  done
}
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
      retry "${R[@]}" --shot "$STILLS" --shard "$k/$NGPU" "${SARGS[@]}"
      if [ "$k" -eq 0 ] && [ -n "$CLAY" ]; then   # clay stays a plain PNG render, no passes
        retry "${R[@]:0:$((${#R[@]} - 1))}" --shot "$CLAY" --clay --prefix clay_ "${SARGS[@]}"
      fi
      if [ -n "$CLIPS" ] && [ "$CLIPS" != "NONE" ]; then
        retry "${R[@]}" --shot "$CLIPS" --clip --samples "$CLIP_SAMPLES" --shard "$k/$NGPU"
      fi
    ) >>"build/render_gpu$k.log" 2>&1 &
    PIDS+=($!)
    echo "[pod]   GPU $k: pid $! -> build/render_gpu$k.log"
  done
  # the grader runs on the CPU beside the GPU renders, until they are done
  ( while true; do
      alive=0; for p in "${PIDS[@]}"; do kill -0 "$p" 2>/dev/null && alive=1; done
      [ -d build/clips ] && grade_clips
      [ "$alive" -eq 1 ] || break
      sleep 15
    done ) >>build/grade.log 2>&1 &
  GPID=$!
  echo "[pod]   grader: pid $GPID -> build/grade.log"
  FAIL=0
  for p in "${PIDS[@]}"; do wait "$p" || FAIL=1; done
  wait "$GPID" || true
  if [ "$FAIL" -ne 0 ] && [ ! -f build/STOP ]; then
    echo "[pod] a render process failed; see build/render_gpu*.log. Re-run this script to continue."
    tail -n 5 build/render_gpu*.log || true
    exit 1
  fi
  if [ ! -f build/STOP ]; then          # anything a share left undone
    retry "${R[@]}" --shot "$STILLS" "${SARGS[@]}" >>build/render_gpu0.log 2>&1
    if [ -n "$CLIPS" ] && [ "$CLIPS" != "NONE" ]; then
      retry "${R[@]}" --shot "$CLIPS" --clip --samples "$CLIP_SAMPLES" >>build/render_gpu0.log 2>&1
    fi
  fi
fi
echo "[pod] 5/7 stills: $(ls build/stills | grep -c '\.exr$' || true) EXR"
ls build/stills

echo "[pod] 6/7 grade (tools/comp.py) into build/out"
for src in build/stills/*.exr; do
  [ -f "$src" ] || continue
  n=$(basename "$src" .exr); webp="build/out/stills/$n.webp"
  if [ ! -s "$webp" ] || [ "$webp" -ot "$src" ]; then
    "$PY" tools/comp.py still "$src" "$webp" --shot "$n" || echo "[pod]   still $n: grading failed"
  fi
  [ "$INCLUDE_EXR" = "1" ] && cp -f "$src" "build/out/stills/$n.exr"
done
for src in build/stills/clay_*.png; do        # a clay pass, if one was asked for: as before
  [ -f "$src" ] || continue
  "$PY" -c "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], quality=90, method=6)" \
    "$src" "build/out/stills/$(basename "$src" .png).webp"
done
ls build/out/stills
if [ -d build/clips ]; then
  grade_clips                                   # whatever the grader had not reached
  for d in build/clips/*/; do
    n=$(basename "$d"); case "$n" in *_graded) continue ;; esac
    mp4="build/out/clips/$n.mp4"
    if [ -s "$mp4" ] && [ ! "$mp4" -ot "build/clips/${n}_graded" ]; then echo "[pod]   clip $n: encoded"; continue; fi
    if ! command -v ffmpeg >/dev/null 2>&1; then echo "[pod]   $n: no ffmpeg"; continue; fi
    "$PY" tools/comp.py clip "build/clips/$n" "build/out/clips/$n" --shot "$n" --need "$N_CLIP" --jobs "$GJOBS" \
      && echo "[pod]   clip $n: mp4 + webm" || echo "[pod]   clip $n: not complete, not encoded"
  done
fi

echo "[pod] 7/7 pack"
if [ -z "$(find build/out -type f | head -n 1)" ]; then echo "[pod] nothing was rendered"; exit 1; fi
tar -cf build/slides.tar -C build/out .
tar -tf build/slides.tar | sort
ls -la build/slides.tar
echo "POD_DONE"
