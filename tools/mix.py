#!/usr/bin/env python3
"""Pace, mix and measure the narration (all in code; nothing here opens a DAW).

For each chapter in audio/timing.json:
  1. decode audio/raw/<id>.mp3 to 48 kHz float
  2. re-pace: lead-in, a minimum breath between cues, a tail (cuts fall in the silences)
  3. write the paced narration stem   build/stems/narration/<id>.wav  (48 kHz, 24-bit)
  4. add the ambience bed if audio/beds/<id>.wav exists (written by tools/synth.py)
  5. loudness-normalise the web mix to -16 LUFS integrated, true peak <= -1 dBTP (two-pass
     ffmpeg loudnorm), encode site/assets/audio/<id>.mp3, then MEASURE the encoded file
  6. write site/assets/audio/narration.json and <id>.vtt with the re-paced cue times
Usage: tools/mix.py [chapter-id ...]
"""
import json, sys, subprocess, pathlib, re
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
LEAD, GAP, TAIL = 0.45, 0.62, 0.9


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def write_wav24(path, x, ch=1):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = np.clip(x, -1, 1).astype(np.float32).tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-",
                    "-c:a", "pcm_s24le", str(path)], input=data, check=True)


def fade(x, n=240):
    if len(x) > 2 * n:
        r = np.linspace(0, 1, n)
        x = x.copy(); x[:n] *= r; x[-n:] *= r[::-1]
    return x


def measure(path):
    out = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = out[out.rfind("Summary:"):]
    i = float(re.search(r"I:\s*(-?[\d.]+) LUFS", tail).group(1))
    tp = float(re.search(r"Peak:\s*(-?[\d.]+) dBFS", tail).group(1))
    lra = float(re.search(r"LRA:\s*(-?[\d.]+) LU", tail).group(1))
    return i, tp, lra


def ts(t):
    return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{t % 60:06.3f}"


def loudnorm(src, dst, extra=()):
    f1 = "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json"
    out = subprocess.run(["ffmpeg", "-nostats", "-i", str(src), "-af", f1, "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(out[out.rfind("{"):out.rfind("}") + 1])
    f2 = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f2, "-ar", "48000", *extra, str(dst)], check=True)


def main():
    want = sys.argv[1:]
    timing = json.loads((ROOT / "audio/timing.json").read_text())
    out_json_path = ROOT / "site/assets/audio/narration.json"
    web = json.loads(out_json_path.read_text()) if out_json_path.exists() else {}
    for cid, ch in timing.items():
        if want and cid not in want:
            continue
        x = decode(ROOT / f"audio/raw/{cid}.mp3")
        cues = ch["cues"]
        # cut points: the middle of each silence between cues
        cuts = [0.0] + [(a["t1"] - 0.25 + b["t0"] + 0.12) / 2 for a, b in zip(cues, cues[1:])] + [len(x) / SR]
        parts, new, t = [np.zeros(int(LEAD * SR))], [], LEAD
        for i, c in enumerate(cues):
            a, b = int(cuts[i] * SR), int(cuts[i + 1] * SR)
            seg = fade(x[a:b])
            speech0, speech1 = c["t0"] + 0.12 - cuts[i], c["t1"] - 0.25 - cuts[i]
            natural_gap = (cuts[i + 1] - (c["t1"] - 0.25)) + ((cues[i + 1]["t0"] + 0.12 - cuts[i + 1]) if i + 1 < len(cues) else 0)
            n = dict(c); n["t0"] = round(max(0, t + speech0 - 0.1), 3); n["t1"] = round(t + speech1 + 0.3, 3)
            new.append(n); parts.append(seg); t += len(seg) / SR
            if i + 1 < len(cues):
                pad = max(0.0, GAP - natural_gap)
                parts.append(np.zeros(int(pad * SR))); t += pad
        parts.append(np.zeros(int(TAIL * SR)))
        y = np.concatenate(parts)
        for a, b in zip(new, new[1:]):
            a["t1"] = min(a["t1"], b["t0"])
        stem = ROOT / f"build/stems/narration/{cid}.wav"
        write_wav24(stem, y)
        src = stem
        bed = ROOT / f"audio/beds/{cid}.wav"
        if bed.exists():
            mixed = ROOT / f"build/mix/{cid}.premix.wav"
            mixed.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(stem), "-i", str(bed), "-filter_complex",
                            "[0:a]aformat=channel_layouts=stereo[n];[1:a]aformat=channel_layouts=stereo[b];"
                            "[n][b]amix=inputs=2:duration=first:normalize=0[m]", "-map", "[m]", "-c:a", "pcm_s24le", str(mixed)], check=True)
            src = mixed
        dst = ROOT / f"site/assets/audio/{cid}.mp3"
        loudnorm(src, dst, ("-c:a", "libmp3lame", "-b:a", "128k" if not bed.exists() else "160k"))
        i, tp, lra = measure(dst)
        dur = len(y) / SR
        ok = abs(i + 16) <= 1.0 and tp <= -1.0
        print(f"[{cid}] {dur:5.1f}s  I {i:.1f} LUFS  TP {tp:.1f} dBTP  LRA {lra:.1f}  {'OK' if ok else 'OUT OF SPEC'}")
        web[cid] = {"stop": ch["stop"], "title": ch["title"], "duration": round(dur, 2), "src": f"assets/audio/{cid}.mp3",
                    "lufs": i, "truePeak": tp, "cues": new}
        vtt = ["WEBVTT", ""]
        for n, c in enumerate(new, 1):
            vtt += [str(n), f"{ts(c['t0'])} --> {ts(c['t1'])}", c["text"], ""]
        (ROOT / f"site/assets/audio/{cid}.vtt").write_text("\n".join(vtt))
    out_json_path.write_text(json.dumps(web, indent=1))


if __name__ == "__main__":
    main()
