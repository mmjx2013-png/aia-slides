# Kimono audio guide: mix note for Logic Pro

Everything here was made in code; nothing opened a DAW. The stems are for polishing by hand.

## What is in the package

- `narration/NN_<room>_narration.wav`: one mono file per room, 48 kHz, 24-bit. Voice: ElevenLabs
  "Alice" (model Turbo v2.5) through the Venice AI API. The API returns 44.1 kHz MP3 at 128 kbps;
  it was decoded and resampled to 48 kHz, so there is nothing above about 16 kHz. Each room was
  synthesised in one take, then re-paced: a 0.45 s lead-in, at least 0.62 s between sentences
  (cuts fall inside the silences, 5 ms fades), a 0.9 s tail. No EQ, compression or de-essing.
- `effects/NN_<room>_effects.wav`: stereo, same length as the room's narration, so both start at
  bar 1. Synthesised in `tools/synth.py` from shaped noise: a bolt unrolling, tailor's chalk, silk
  moving, soft footsteps. Placement follows `audio/fx.json`, keyed to the narration's picture cues.
- `ambience/room_tone_90s_loop.wav`: stereo room tone (shaped noise, slow movement). Loop it under
  each room. In the web mix it sits about 27 dB below the voice.
- `cues.csv`: every caption with its start and end time in the room's file, and the 3D frame or
  wall picture it is keyed to.

## Levels in the web mix

Voice at unity; ambience about -46 dBFS RMS; effects about -37 dBFS RMS on average, loudest
moment about -30 dBFS (the voice runs about -19 dBFS RMS while speaking). Each room's mix was
then loudness-normalised with ffmpeg `loudnorm` (two-pass, linear) and measured after MP3
encoding: -16.4 LUFS integrated, true peak between -1.9 and -1.6 dBTP, loudness range about 2 LU.
Targets were -16 LUFS and no higher than -1 dBTP.

## Suggestions (not done)

A gentle high-pass at 70 Hz and a de-esser on the voice; 1 to 2 dB of bus compression; a short
room reverb send on the voice so it sits in the hall; music, if wanted, under the entrance and
the last room only.

## To be checked by ear

Nobody has listened to these files: the session that made them cannot hear. Pronunciation was
checked only by transcribing the audio back to text. Japanese terms and authors' names were
respelt for the voice (`content/respell.json`); listen for Becke, Koide, Druet, kitsuke, ohashori.
Venice AI's terms for public use of synthetic speech could not be read from the build machine.
