#!/usr/bin/env python3
"""Pace, mix and measure the narration (all in code; nothing here opens a DAW).

For each chapter in audio/timing.json:
  1. decode audio/raw/<id>.mp3 to 48 kHz float
  2. re-pace: lead-in, a minimum breath between cues, a tail (cuts fall in the silences)
  3. write the paced narration stem   build/stems/narration/<id>.wav  (48 kHz, 24-bit)
  4. synthesise the ambience (room tone) and the effects (audio/fx.json) as separate stems:
     build/stems/ambience/<id>.wav and build/stems/effects/<id>.wav
  5. loudness-normalise the web mix to -16 LUFS integrated, true peak <= -1 dBTP (two-pass
     ffmpeg loudnorm), encode site/assets/audio/<id>.mp3, then MEASURE the encoded file
  6. write site/assets/audio/narration.json and <id>.vtt with the re-paced cue times
Usage: tools/mix.py [chapter-id ...]
"""
import json, sys, subprocess, pathlib, re
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import synth
SR = 48000
FX = json.loads((ROOT / 'audio/fx.json').read_text()) if (ROOT / 'audio/fx.json').exists() else {}
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
        # ambience and effects, synthesised in code, as separate stems
        n = len(y); dur_s = n / SR
        amb = synth.room_tone(dur_s + 0.1)[:n]
        fx = np.zeros((n, 2))
        pts = sorted((c["t0"], c["frame"]) for c in new if "frame" in c)
        def t_of_frame(f):
            if not pts: return None
            if f <= pts[0][1]: return pts[0][0]
            for (t0, f0), (t1, f1) in zip(pts, pts[1:]):
                if f0 <= f <= f1: return t0 + (t1 - t0) * (f - f0) / max(1, f1 - f0)
            return pts[-1][0]
        for e in FX.get(cid, []):
            if "frame" in e: t0 = t_of_frame(e["frame"])
            else:
                hit = [c["t0"] for c in new if c.get("photo") == e.get("photo")]
                t0 = (hit[0] - e.get("lead", 2.4)) if hit else None
            if t0 is None: continue
            t0 = max(0.2, t0); g = 10 ** (e.get("gain", 0) / 20)
            if e["kind"] == "unroll": clip = synth.unroll(e["dur"])
            elif e["kind"] == "rustle": clip = synth.cloth_rustle(e["dur"])
            elif e["kind"] == "chalk":
                k = e.get("repeat", 1); clip = np.zeros((int((e["dur"] + e.get("every", 1) * (k - 1) + 0.1) * SR), 2))
                for j in range(k):
                    c1 = synth.chalk(e["dur"]); a = int(j * e.get("every", 1) * SR); clip[a:a + len(c1)] += c1
            elif e["kind"] == "steps": clip = synth.footsteps([j * e.get("every", 0.95) for j in range(e.get("count", 4))], e.get("count", 4) * e.get("every", 0.95) + 0.6, level=-34)
            else: continue
            a = int(t0 * SR); b = min(n, a + len(clip))
            if b > a: fx[a:b] += clip[: b - a] * g
        write_wav24(ROOT / f"build/stems/ambience/{cid}.wav", amb, 2)
        write_wav24(ROOT / f"build/stems/effects/{cid}.wav", fx, 2)
        mixed = ROOT / f"build/mix/{cid}.premix.wav"
        write_wav24(mixed, np.stack([y, y], 1) * 1.0 + amb + fx, 2)
        src = mixed
        dst = ROOT / f"site/assets/audio/{cid}.mp3"
        loudnorm(src, dst, ("-c:a", "libmp3lame", "-b:a", "160k"))
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
