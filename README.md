# Afterglow

**A live visualizer for any M-VAVE FM-1.** Its sound, notes, clock and knobs, drawn as wide panels of diagonal lines that
fall down the screen like water. For the studio, the stage and the stream.

**Open it:** <https://saulofilho.github.io/afterglow-fm1/> (Chrome or Edge) · **No FM-1?** <https://saulofilho.github.io/afterglow-fm1/?demo>

Unofficial, not made or endorsed by M-VAVE.

## What it reads

Every firmware sends something different over USB. Afterglow takes what it finds:

| Level | What | From |
|---|---|---|
| 1 · Sound | spectrum, waveform, level, the kick / snare / hat onsets | any audio input: the FM-1's own USB audio on the Felucca-based firmwares (GR!MM, SLOOP, COQUÍ), or its headphone out into an interface |
| 2 · MIDI | notes (a track a channel), the clock (tempo, step), CCs as knobs | any firmware that sends MIDI |
| 3 · Adapter | the selected track's knobs and the effects, by name | the GR!MM family (GR!MM, COQUÍ), over their editor's SysEx, a few times a second |

Tested on a real FM-1 with COQUÍ (its SysEx answers at ~3 ms). The other firmwares' rows come from their code and are
still to be checked on the device.

## Using it

- **Connect FM-1** asks for MIDI (with SysEx) and the sound; **Sound** picks another input; **Demo** plays a simulated FM-1.
- **Guide:** the first screen explains how it works and shows each pattern, palette and view, live on the demo. **Guide** (or key 0) brings it back.
- **Views:** *cascata* (the six panels stacked), *estúdio* (one big panel, the tracks, the step and the knobs), *palco*
  (one panel, full screen), *overlay* (a band at the foot, transparent, for OBS as a browser source). Keys 1-4 switch them,
  F for full screen.
- **Palettes:** Estúdio, Cyberpunk, Matrix, Windows 95, Âmbar CRT, Vaporwave, or *mixed* (each panel its own).
- **Patterns:** Queda, Degraus, Onda, Bumbo, Trilhas, Compasso. **Lines** sets their spacing, **Gain** the sound's.
- Every choice lives in the link, e.g. `#view=palco&pal=cyberpunk&pat=queda`: save it, share it.

## Building

```
npm install
npm run dev        # http://localhost:5173
npm test           # the protocol, the MIDI and clock, the presets, the patterns
npm run build      # dist/
```

`src/signal.ts` is the one shape every source writes and every panel reads; a source is a file in `src/sources/`, a
pattern is one function in `src/render/patterns.ts`.

## Licence

GPL-3.0-only (see [LICENSE](LICENSE)). The GR!MM-family adapter follows GR!MM's editor protocol and COQUÍ's
`editor_core.js` (GPL-3.0). The look is after Nicolas Sassoon's *WTRFLLS*, as a reference only: the patterns are its own,
moved by the FM-1's signal.
