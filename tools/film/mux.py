#!/usr/bin/env python3
"""Lay each narration clip at the moment the deck started it, normalise to -16 LUFS, and encode the web film (H.264 + AAC, faststart, under ~90 MB)."""
import json, subprocess, sys, os
F = os.path.dirname(os.path.abspath(__file__))
AUD = "/home/user/aia-slides/deck/audio"
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(F, "kimono-film.mp4")
log = json.load(open(os.path.join(F, "raw.json")))
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(F, "raw.mp4")],
                           capture_output=True, text=True).stdout)
seen, plays = set(), []
for p in log["plays"]:                      # one entry per slide; a replay of the same clip is ignored
    if p["src"] not in seen:
        seen.add(p["src"]); plays.append(p)
cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(F, "raw.mp4")]
flt = []
for k, p in enumerate(plays):
    cmd += ["-i", os.path.join(AUD, p["src"])]
    ms = max(0, int(round((p["t"] - log["t0"]) / log.get("S", 1) * 1000)))
    flt.append(f"[{k + 1}:a]aresample=48000,adelay={ms}|{ms}[a{k}]")
flt.append("".join(f"[a{k}]" for k in range(len(plays))) + f"amix=inputs={len(plays)}:normalize=0:duration=longest,"
           f"apad,atrim=0:{dur:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]")
kbps = int(min(2600, (88 * 8 * 1024) / dur - 160))   # stay under ~88 MB (GitHub's file limit is 100 MB)
cmd += ["-filter_complex", ";".join(flt), "-map", "0:v", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.6)}k", "-bufsize", f"{kbps * 3}k",
        "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", OUT]
print(f"{len(plays)} narration clips, {dur:.1f} s, video {kbps} kbps")
subprocess.run(cmd, check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "8", "-i", OUT, "-frames:v", "1", "-q:v", "3",
                os.path.join(os.path.dirname(OUT), "poster.jpg")], check=True)
print("wrote", OUT, os.path.getsize(OUT) // 1048576, "MB")
