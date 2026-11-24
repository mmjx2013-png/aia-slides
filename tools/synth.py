#!/usr/bin/env python3
"""Sound, synthesised in code (no samples, no AI audio). 48 kHz float, written as 24-bit WAV.

  room_tone(seconds)   a quiet gallery: air handling (shaped brown/pink noise), a faint 50 Hz-free
                       low hum band, very slow movement; stereo decorrelated
  cloth_rustle(...)    silk moving: band-passed noise bursts with fast random grain, soft envelope
  unroll(seconds)      a bolt unrolling on a dais: a soft continuous slide with a slow tick of the roll
  footsteps(times)     soft steps on a satin floor (low thump + a little scuff)
  chalk(seconds)       tailor's chalk drawn along cloth (thin, dry, high band)

Usage as a module, or `tools/synth.py beds` to write audio/beds/<chapter>.wav for every chapter
in site/assets/audio/narration.json (room tone at the chapter's length).
"""
import sys, json, pathlib, subprocess
import numpy as np

SR = 48000
ROOT = pathlib.Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)


def db(x):
    return 10 ** (x / 20)


def fft_filter(x, lo=None, hi=None, tilt=0.0):
    """Zero-phase band shaping in the frequency domain (smooth edges). tilt in dB/octave around 1 kHz."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if tilt:
        g *= (np.maximum(f, 20) / 1000) ** (tilt / 6.02)
    return np.fft.irfft(X * g, n)


def norm_rms(x, dbfs):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12
    return x * db(dbfs) / r


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr:
        e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e


def room_tone(seconds, level=-46):
    n = int(seconds * SR)
    out = []
    for ch in range(2):
        w = rng.standard_normal(n)
        air = fft_filter(w, lo=35, hi=900, tilt=-4.5)               # air handling, dark
        hiss = fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * 0.06
        slow = 1 + 0.18 * np.sin(2 * np.pi * (0.031 + 0.007 * ch) * np.arange(n) / SR + ch)   # slow breathing of the duct
        x = air * slow + hiss
        out.append(norm_rms(x, level))
    y = np.stack(out, 1)
    return y * env_adsr(n, 1.5, 2.0)[:, None]


def cloth_rustle(seconds, level=-30, bright=3500):
    n = int(seconds * SR)
    w = rng.standard_normal(n)
    grain = np.abs(fft_filter(rng.standard_normal(n), hi=40)) ** 1.6       # slow random swells
    grain /= grain.max() + 1e-9
    x = fft_filter(w, lo=600, hi=bright, tilt=-1.5) * (0.25 + grain)
    x = norm_rms(x, level) * env_adsr(n, 0.25, 0.6)
    pan = 0.5 + 0.25 * np.sin(np.linspace(0, 2.2, n))
    return np.stack([x * np.sqrt(1 - pan), x * np.sqrt(pan)], 1)


def unroll(seconds, level=-32, turns=9):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    slide = fft_filter(rng.standard_normal(n), lo=180, hi=2200, tilt=-3) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.21 * t) ** 2)
    ticks = np.zeros(n)
    # the roll turns faster as it gets thinner
    ph = np.cumsum(np.linspace(turns / seconds * 0.7, turns / seconds * 1.4, n)) / SR
    idx = np.nonzero(np.diff(np.floor(ph)))[0]
    k = int(0.03 * SR); click = fft_filter(rng.standard_normal(k), lo=200, hi=1600) * np.exp(-np.linspace(0, 7, k))
    for i in idx:
        ticks[i:i + k] += click[: max(0, min(k, n - i))]
    x = norm_rms(slide, level) + norm_rms(ticks, level - 6)
    x *= env_adsr(n, 0.6, 1.2)
    return np.stack([x * 0.95, x], 1)


def chalk(seconds, level=-36):
    n = int(seconds * SR)
    x = fft_filter(rng.standard_normal(n), lo=2200, hi=7500)
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 7.3 * np.arange(n) / SR))
    x = norm_rms(x * am, level) * env_adsr(n, 0.05, 0.12)
    return np.stack([x, x * 0.9], 1)


def footsteps(times, total, level=-31):
    n = int(total * SR)
    y = np.zeros((n, 2))
    for j, t0 in enumerate(times):
        i = int(t0 * SR)
        k = int(0.32 * SR)
        thump = fft_filter(rng.standard_normal(k), lo=60, hi=420) * np.exp(-np.linspace(0, 9, k))
        scuff = fft_filter(rng.standard_normal(k), lo=1200, hi=5000) * np.exp(-np.linspace(0, 16, k)) * 0.35
        s = norm_rms(thump + scuff, level)
        pan = 0.42 if j % 2 else 0.58
        e = min(k, n - i)
        if e > 0:
            y[i:i + e, 0] += s[:e] * np.sqrt(1 - pan)
            y[i:i + e, 1] += s[:e] * np.sqrt(pan)
    return y


def write(path, y):
    path = pathlib.Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    y = np.asarray(y, dtype=np.float32)
    ch = 1 if y.ndim == 1 else y.shape[1]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-",
                    "-c:a", "pcm_s24le", str(path)], input=np.clip(y, -1, 1).tobytes(), check=True)


def beds():
    nar = json.loads((ROOT / "site/assets/audio/narration.json").read_text())
    for cid, d in nar.items():
        y = room_tone(d["duration"] + 0.5)
        write(ROOT / f"audio/beds/{cid}.wav", y)
        print(cid, round(d["duration"], 1))


if __name__ == "__main__":
    if sys.argv[1:] == ["beds"]:
        beds()
    else:
        print(__doc__)
