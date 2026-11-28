#!/bin/bash
# Build the Ayutthaya trailer from scratch, in order. Each step can also be run on its own.
#   ./build.sh          everything (about 20 minutes on 4 CPUs)
#   ./build.sh audio    only re-time + re-mix the sound and re-mux (picture untouched)
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}:/opt/node22/lib/node_modules"

[ -f img/meta.json ] || python3 fetch_images.py          # Commons images + credits.md
# voices: python3 tts.py --style calm --takes 2 tts-gemini-3-1-flash Charon   (already in voice/)
python3 edit.py                                            # timeline -> out/timeline.json
if [ "${1:-all}" = audio ]; then
  python3 audio.py && python3 finish.py && python3 qa.py; exit
fi
node cards.js                                              # title cards -> out/work/cards/*.png
python3 audio.py                                           # sound -> out/work/audio/{mix,bed}.wav
python3 render.py                                          # picture -> out/work/video_4k.mp4
python3 finish.py                                          # the MP4s and the poster
python3 qa.py                                              # out/qa/report.txt, contact sheet, smoothness clip
python3 fetch_images.py --credits                         # credits.md with on-screen times
