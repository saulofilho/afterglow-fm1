// SPDX-License-Identifier: GPL-3.0-only
// No FM-1 at hand: a simulated one plays a dembow at 95 BPM, so every panel moves as it would.

import { BANDS, type Signal, WAVE } from "../signal";

export const DEMO_BPM = 95;
const KICK = [0, 3, 8, 11], SNARE = [4, 7, 12, 15];

export function demoFill(s: Signal, t: number) {
  const beat = (t * DEMO_BPM) / 60, step = Math.floor(beat * 4) % 16, ph = (beat * 4) % 1;
  const kick = KICK.includes(step) ? Math.exp(-ph * 3.2) : 0;
  const snare = SNARE.includes(step) ? Math.exp(-ph * 4) : 0;
  const hat = Math.exp(-ph * 9) * 0.5;
  for (let i = 0; i < BANDS; i++)
    s.spec[i] = Math.min(1, 0.08 + (i < 6 ? kick * (1 - i / 7) : 0) + (i > 8 && i < 20 ? snare * 0.75 : 0) +
      (i > 22 ? hat * 0.8 : 0) + 0.22 * Math.abs(Math.sin(t * (0.9 + i * 0.31) + i)));
  for (let i = 0; i < WAVE; i++)
    s.wave[i] = Math.sin(i * 0.12 + t * 2) * (0.25 + 0.45 * kick) + 0.2 * Math.sin(i * 0.53) * snare + 0.05 * Math.sin(i * 2.1) * hat;
  s.kick = kick, s.snare = snare, s.hat = hat;
  s.level = Math.min(1, 0.25 + 0.6 * kick + 0.3 * snare);
  s.bpm = DEMO_BPM, s.beat = beat, s.step = step, s.running = true, s.clocked = true;
  const on = [kick > 0.6, [2, 6, 10, 14].includes(step) && ph < 0.5, step % 8 === 0 && ph < 0.3, [1, 5, 9, 13].includes(step) && ph < 0.4];
  on.forEach((o, k) => { if (o) s.notes[k] = 1; });
  s.last = [53, 33, 57, 69];
  s.title = "DEMO · DEMBOW";
  const cut = 0.62 + 0.2 * Math.sin(t * 0.7), res = 0.35, dec = 0.8 - 0.25 * kick, mix = 0.48 + 0.3 * Math.sin(t * 0.4);
  s.params = [["CUTOFF", cut], ["RESONANCE", res], ["DECAY", dec], ["MIX", mix]].map(([n, v]) => ({
    name: n as string, value: Math.round((v as number) * 127), max: 127, text: String(Math.round((v as number) * 127)) }));
  s.fx = [];
}
