#!/usr/bin/env python3
"""One script drives narration, captions and picture timing.

Reads audio/script.json. For each chapter: synthesises the whole chapter in one request
(Venice API, ElevenLabs Turbo v2.5, voice Alice), gets word timestamps back from a
speech-to-text pass, aligns the cue boundaries to those timestamps, and writes
  audio/raw/<id>.mp3          the untouched synthesis (kept for the Logic stems)
  audio/raw/<id>.words.json   word timings
  site/assets/audio/<id>.vtt  captions (on-screen spelling)
  audio/timing.json           cue times + picture frames, read by the mix and the site build
Usage: tools/narrate.py [chapter-id ...] [--force]
"""
import json, re, sys, subprocess, difflib, pathlib, urllib.request, uuid, os

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://api.venice.ai/api/v1"
KEY = os.environ.get("VENICE_API_KEY", "proxy-injected")


def tts(text, voice, model, out):
    body = json.dumps({"model": model, "voice": voice, "input": text, "response_format": "mp3"}).encode()
    req = urllib.request.Request(API + "/audio/speech", data=body,
                                 headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        out.write_bytes(r.read())


def stt(path):
    # multipart upload via curl (keeps this script dependency-free)
    res = subprocess.run(["curl", "-s", "-m", "180", "-X", "POST", API + "/audio/transcriptions",
                          "-H", "Authorization: Bearer " + KEY, "-F", f"file=@{path}",
                          "-F", "model=elevenlabs/scribe-v2", "-F", "response_format=json",
                          "-F", "timestamps=true", "-F", "language=en"], capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


def norm(w):
    return re.sub(r"[^a-z0-9]+", "", w.lower())


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    script = json.loads((ROOT / "audio/script.json").read_text())
    respell = script.get("respell", {})
    timing_path = ROOT / "audio/timing.json"
    timing = json.loads(timing_path.read_text()) if timing_path.exists() else {}
    for ch in script["chapters"]:
        cid = ch["id"]
        if args and cid not in args:
            continue
        says = []
        for cue in ch["cues"]:
            say = cue.get("say", cue["show"])
            for k, v in respell.items():
                say = re.sub(r"\b" + re.escape(k) + r"\b", v, say, flags=re.I)
            says.append(say)
        text = "\n\n".join(says)
        raw = ROOT / f"audio/raw/{cid}.mp3"
        stamp = ROOT / f"audio/raw/{cid}.txt"
        if force or not raw.exists() or not stamp.exists() or stamp.read_text() != text:
            print(f"[{cid}] synthesising {len(text)} chars")
            tts(text, script["voice"], script["model"], raw)
            stamp.write_text(text)
            words = stt(raw)
            (ROOT / f"audio/raw/{cid}.words.json").write_text(json.dumps(words))
        words = json.loads((ROOT / f"audio/raw/{cid}.words.json").read_text())
        heard = [w for w in words["timestamps"]["word"] if norm(w["word"])]
        hn = [norm(w["word"]) for w in heard]
        # align the said words to the heard words
        said, owner = [], []
        for i, s in enumerate(says):
            for w in s.replace("-", " ").split():
                if norm(w):
                    said.append(norm(w)); owner.append(i)
        sm = difflib.SequenceMatcher(a=said, b=hn, autojunk=False)
        mapping = {}
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                mapping[a + k] = b + k
        dur = duration(raw)
        cues = []
        for i, cue in enumerate(ch["cues"]):
            idx = [j for j, o in enumerate(owner) if o == i]
            hit = [mapping[j] for j in idx if j in mapping]
            if not hit:
                raise SystemExit(f"[{cid}] cue {i} could not be aligned: {cue['show']!r}")
            t0 = heard[min(hit)]["start"]; t1 = heard[max(hit)]["end"]
            cues.append({"t0": round(max(0, t0 - 0.12), 3), "t1": round(t1 + 0.25, 3), "text": cue["show"],
                         **({"frame": cue["frame"]} if "frame" in cue else {}),
                         **({"end_frame": cue["end_frame"]} if "end_frame" in cue else {})})
        for a, b in zip(cues, cues[1:]):
            if a["t1"] > b["t0"]:
                a["t1"] = b["t0"]
        ratio = sm.ratio()
        print(f"[{cid}] {dur:.1f}s, {len(cues)} cues, alignment {ratio:.2f}")
        print("   heard:", words["text"][:400])
        vtt = ["WEBVTT", ""]
        for n, c in enumerate(cues, 1):
            vtt += [str(n), f"{ts(c['t0'])} --> {ts(c['t1'])}", c["text"], ""]
        (ROOT / f"site/assets/audio/{cid}.vtt").write_text("\n".join(vtt))
        timing[cid] = {"stop": ch.get("stop"), "title": ch["title"], "duration": round(dur, 3), "cues": cues}
    timing_path.write_text(json.dumps(timing, indent=1))


if __name__ == "__main__":
    main()
