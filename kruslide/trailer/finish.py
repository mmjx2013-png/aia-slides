#!/usr/bin/env python3
"""Make the deliverables from out/work/video_4k.mp4 (render.py) and out/work/audio/*.wav (audio.py).

  out/ayutthaya-4k.mp4          3840x2160 24 fps H.264 High, narration + music, AAC 48 kHz
  out/ayutthaya-4k-novoice.mp4  same picture, music bed only
  out/ayutthaya-1080.mp4        1920x1080 web version, two-pass, sized to stay under ~24 MB
  out/poster.jpg                3840x2160 still of the title
"""
import json, os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
WORK = os.path.join(OUT, 'work')
TL = json.load(open(os.path.join(OUT, 'timeline.json'), encoding='utf-8'))
WEB_MB = 24.0

def ff(*a):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)

def mux(audio, dst, title):
    ff('-i', os.path.join(WORK, 'video_4k.mp4'), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
       '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-metadata', f'title={title}',
       '-metadata', 'copyright=© KruSlide', '-movflags', '+faststart', dst)

def web():
    dur = TL['frames'] / TL['fps']
    abr = 160_000
    vbr = int((WEB_MB * 8e6 - abr * dur) / dur * 0.97)
    src = os.path.join(OUT, 'ayutthaya-4k.mp4')
    dst = os.path.join(OUT, 'ayutthaya-1080.mp4')
    log = os.path.join(WORK, 'x264_1080')
    common = ['-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'film',
              '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-b:v', str(vbr),
              '-maxrate', str(int(vbr * 2.2)), '-bufsize', str(int(vbr * 4)), '-x264-params', f'keyint={TL["fps"] * 2}',
              '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-passlogfile', log]
    ff('-i', src, *common, '-pass', '1', '-an', '-f', 'mp4', os.devnull)
    ff('-i', src, *common, '-pass', '2', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
       '-metadata', 'title=Ayutthaya (อยุธยา) - KruSlide sample trailer', '-movflags', '+faststart', dst)
    for f in os.listdir(WORK):
        if f.startswith('x264_1080'):
            os.remove(os.path.join(WORK, f))

def poster():
    t = TL['anchors']['TITLE'] + 1.9
    subprocess.run(['python3', os.path.join(HERE, 'render.py'), '--stills', f'{t:.2f}'], check=True)
    src = os.path.join(WORK, 'stills', f'still_{t:06.2f}.jpg')
    shutil.copy(src, os.path.join(OUT, 'poster.jpg'))

if __name__ == '__main__':
    mux(os.path.join(WORK, 'audio', 'mix.wav'), os.path.join(OUT, 'ayutthaya-4k.mp4'), 'Ayutthaya (อยุธยา) - KruSlide sample trailer')
    mux(os.path.join(WORK, 'audio', 'bed.wav'), os.path.join(OUT, 'ayutthaya-4k-novoice.mp4'), 'Ayutthaya (อยุธยา) - music only')
    web()
    poster()
    for f in ('ayutthaya-4k.mp4', 'ayutthaya-4k-novoice.mp4', 'ayutthaya-1080.mp4', 'poster.jpg'):
        p = os.path.join(OUT, f)
        print(f'{f:28} {os.path.getsize(p) / 1e6:7.1f} MB')
