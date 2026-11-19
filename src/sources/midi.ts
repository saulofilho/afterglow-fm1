// SPDX-License-Identifier: GPL-3.0-only
// Level 2: plain MIDI, from any firmware. Notes on a channel are a track's (the track = channel - base, 0..3), the clock
// is the tempo and the step, a control change is a knob (the last eight touched, by number).

import { Clock, type Param, type Signal, TRACKS } from "../signal";

const NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const noteName = (n: number) => NOTE[n % 12] + (Math.floor(n / 12) - 1);

export class MidiIn {
  base = 0;                                                 // the first track's channel, 0..15
  private cc = new Map<number, { v: number; at: number }>();

  constructor(private sig: Signal, private clock: Clock) {}

  /** one message (not SysEx); now in ms */
  handle(d: ArrayLike<number>, now: number) {
    const st = d[0];
    if (st === 0xf8) return this.clock.tick(now);
    if (st === 0xfa) return this.clock.start();
    if (st === 0xfb) return this.clock.resume();
    if (st === 0xfc) return this.clock.stop();
    if (st < 0x80 || st >= 0xf0) return;
    const ty = st & 0xf0, t = ((st & 15) - this.base + 16) % 16;
    if (ty === 0xb0) {
      this.cc.set(d[1], { v: d[2], at: now });
      return;
    }
    if (t >= TRACKS) return;
    if (ty === 0x90 && d[2] > 0) {
      this.sig.notes[t] = Math.max(this.sig.notes[t], 0.4 + 0.6 * (d[2] / 127));
      this.sig.last[t] = d[1];
    }
  }

  /** the CCs as knobs, the most recently touched first */
  ccParams(): Param[] {
    return [...this.cc.entries()]
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, 8)
      .map(([n, { v }]) => ({ name: `CC ${n}`, value: v, max: 127, text: String(v) }));
  }
  get hasCC() { return this.cc.size > 0; }
}
