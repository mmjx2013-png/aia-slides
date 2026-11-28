#!/usr/bin/env python3
"""The edit of the Ayutthaya trailer: voice, shots, camera moves, title cards and music cues.

Run it to freeze the timeline into out/timeline.json (render.py and audio.py read that file).
Times are seconds. Every line of narration is placed so that its first sound lands on its cue;
shots and cards are placed relative to the lines, so a different voice re-times the whole film.

Camera: a = start, b = end, each (cx, cy, z): the centre of the frame as a fraction of the image
width/height, and z = the width of the frame as a fraction of the image width. The frame always has
the 2.39:1 shape of the picture area.
"""
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 24
W, H = 3840, 2160          # delivery frame
PH = 1606                  # picture height inside the 2.39:1 letterbox (3840 / 1606 = 2.391)
VOICE = 'tts-gemini-3-1-flash__Charon__calm'   # voice/<dir>; alternates are kept in voice/
TEMPO = 1.05               # pitch-preserving speed-up of the narration (rubberband); 1.0 = as generated
GAP = 0.55                 # silence between two lines of narration

# Line cues. 'after' = previous line's end + gap (+ extra). Lines are in narration.json.
LINES = [
    dict(id='L1', at=2.15),
    dict(id='L2', extra=0.15),
    dict(id='L3', extra=0.10),
    dict(id='L4', extra=0.15),
    dict(id='L5', extra=0.15),
    dict(id='L6', extra=2.95),    # music swell, cut to black, impact, then the fall
    dict(id='L7', extra=0.45),
    dict(id='L8', extra=0.20),
    dict(id='L9', extra=0.15),
]

# Shots. 'in' / 'out' are (anchor, offset): anchor is 'L3.start', 'L3.end' or 'abs'.
# 'xin' = length of the dissolve (or fade from black) that brings the shot in.
SHOTS = [
    dict(id='01-iudea-1662', start=('abs', 1.55), xin=1.3, fade_from_black=True,
         a=(0.47, 0.56, 0.90), b=(0.47, 0.60, 0.72), grade=dict(exp=0.10, warm=0.02)),
    dict(id='02-valentijn-1726', start=('L2.start', -0.55), xin=1.1,
         a=(0.50, 0.33, 0.80), b=(0.53, 0.37, 0.62), grade=dict(exp=-0.15, sat=0.85)),
    dict(id='03-chaiwatthanaram-drone', start=('L3.start', -0.55), xin=1.1,
         a=(0.50, 0.42, 1.00), b=(0.48, 0.55, 0.80), grade=dict(exp=-0.10)),
    dict(id='04-voc-ships-1635', start=('L4.start', -0.55), xin=1.1,
         a=(0.36, 0.73, 0.62), b=(0.24, 0.73, 0.54), grade=dict(exp=-0.10, sat=0.9)),
    dict(id='05-pasak-river', start=('L4.pause', -0.4), xin=1.1,
         a=(0.36, 0.64, 0.66), b=(0.44, 0.62, 0.58), grade=dict(exp=-0.15, sat=0.85)),
    dict(id='06-sanphet-golden', start=('L5.start', -0.55), xin=1.1,
         a=(0.55, 0.50, 0.96), b=(0.59, 0.48, 0.76), grade=dict(exp=-0.05)),
    dict(id='07-yai-chai-mongkhon', start=('L5.end', -1.9), xin=1.2,
         a=(0.60, 0.68, 0.84), b=(0.58, 0.40, 0.80), grade=dict(exp=0.0)),
    # cut to black on the impact, L6 over black, then:
    dict(id='09-lokayasutharam', start=('L7.start', -0.75), xin=1.2, fade_from_black=True,
         a=(0.36, 0.43, 0.64), b=(0.56, 0.42, 0.62), grade=dict(exp=-0.30, sat=0.8)),
    dict(id='10-buddha-head-roots', start=('L8.start', -0.75), xin=1.3,
         a=(0.47, 0.48, 0.86), b=(0.47, 0.45, 0.56), grade=dict(exp=0.05)),
    dict(id='08-chaiwatthanaram-reflection', start=('L9.start', -0.75), xin=1.2,
         a=(0.44, 0.56, 0.92), b=(0.53, 0.56, 0.84), grade=dict(exp=-0.10, sat=0.9)),
    dict(id='11-sanphet-night', start=('L9.end', -2.3), xin=1.1,
         a=(0.55, 0.50, 0.90), b=(0.56, 0.47, 0.74), grade=dict(exp=0.0)),
    dict(id='12-chaiwatthanaram-dusk', start=('L9.end', 0.75), xin=0.9,
         a=(0.60, 0.46, 0.70), b=(0.58, 0.46, 0.86), grade=dict(exp=0.0)),
]
