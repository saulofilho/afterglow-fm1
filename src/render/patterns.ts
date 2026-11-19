// SPDX-License-Identifier: GPL-3.0-only
// The panels' patterns: f(x, y, s, o) writes o[0] = the lines' displacement (in line spacings) and o[1] = brightness
// 0..1; x and y in 0..1, left to right and top to bottom. A new pattern is one function.

import { BANDS, type Signal, WAVE } from "../signal";

export interface Pattern { id: string; name: string; what: string; pal: string; f: (x: number, y: number, s: Signal, o: Float32Array) => void }

const specAt = (s: Signal, x: number) => { const u = x * (BANDS - 1), i = Math.floor(u); return s.spec[i] + ((s.spec[Math.min(BANDS - 1, i + 1)] - s.spec[i]) * (u - i)); };
const waveAt = (s: Signal, x: number) => s.wave[Math.min(WAVE - 1, Math.floor(x * (WAVE - 1)))];

export const PATTERNS: Pattern[] = [
  { id: "queda", name: "Queda", pal: "matrix", what: "the water falls faster as the sound rises",
    f: (x, y, s, o) => { const yy = y - s.t * (0.25 + 0.5 * s.level), r = Math.sin(x * 7 + Math.sin(yy * 5) * 1.6) + 0.6 * Math.sin(x * 2.3 - yy * 3.1);
      o[0] = r > 0.55 ? 3.5 : r > -0.2 ? 1.6 : 0; o[1] = r > 0.55 ? 0.95 : r > -0.2 ? 0.7 : 0.45; } },
  { id: "degraus", name: "Degraus", pal: "vapor", what: "the spectrum as ridges, low on the left, high on the right",
    f: (x, y, s, o) => { const k = Math.floor((y + specAt(s, x) * 0.45 + x * 0.3 + Math.sin(x * 5 + s.t * 0.6) * 0.06) * 5);
      o[0] = k * 1.7; o[1] = 0.45 + 0.5 * ((k % 3) / 2); } },
  { id: "onda", name: "Onda", pal: "estudio", what: "the waveform is the waterline",
    f: (x, y, s, o) => { const w = 0.5 - waveAt(s, x) * 0.42;
      if (y < w) { o[0] = 0; o[1] = 0.85; } else { o[0] = 2.6 + Math.sin(x * 40 + y * 9) * 0.6; o[1] = 0.5; } } },
  { id: "bumbo", name: "Bumbo", pal: "ambar", what: "each beat opens a ring; the kick lights it",
    f: (x, y, s, o) => { const ph = ((s.beat % 1) + 1) % 1, r = Math.hypot((x - 0.5) * 2.5, y - 1.05), wv = Math.sin((r - ph * 1.8) * 9);
      o[0] = wv > 0.2 ? 2.8 : 0; o[1] = 0.5 + 0.45 * Math.max(0, wv) * (0.4 + 0.6 * Math.max(s.kick, s.level * 0.6)); } },
  { id: "trilhas", name: "Trilhas", pal: "cyberpunk", what: "four bands, one a track; a note bends its own",
    f: (x, y, s, o) => { const k = Math.min(3, Math.floor(y * 4)), e = s.notes[k];
      o[0] = e > 0.05 ? (k % 2) * 1.5 + e * (2.2 + Math.sin(x * 12 + s.t * 5) * 1.2) : (k % 2) * 1.5; o[1] = 0.4 + 0.12 * k + 0.5 * e; } },
  { id: "compasso", name: "Compasso", pal: "win95", what: "sixteen columns; the clock's step lights",
    f: (x, y, s, o) => { const c = Math.min(15, Math.floor(x * 16)), on = c === s.step && (s.running || s.clocked), sl = Math.sin(y * 6 + c * 0.9 - s.beat * 0.8);
      o[0] = on ? 3 : sl > 0 ? 1.4 : 0; o[1] = on ? 1 : 0.45 + (c % 4 === 0 ? 0.2 : 0); } },
];
export const patternById = (id: string) => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
